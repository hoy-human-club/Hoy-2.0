/**
 * Practice analytics — one place where "how is this member doing" and "how is the studio doing" are
 * computed, with no React and no provider, so C-01 (home), C-27 (practice), M-06 (member file), M-12
 * (studio analytics) and S-03 (teacher) all read the same number from the same rule.
 *
 * Everything derives from the raw tables: `bookings` × `class_sessions` (a visit = a `checked_in` booking,
 * dated by the SESSION's start, never by the booking's created_at), `memberships` (pauses, at-risk),
 * `class_ledger` (the classes left in each package, 0051), `practice_goals` (the target). `activity_events` is a record the app
 * writes for the member's timeline; this module never reads it.
 *
 * Streak rules ("semanas de práctica", research §5 — implemented exactly):
 *  1. Weeks run Monday–Sunday in local time (the app runs in America/Bogota). Day keys come from local
 *     Date parts (`dateKey()` in format.ts), never from UTC slicing.
 *  2. A week is MET when attended (checked_in, counted by session start date) ≥ target. With target 0
 *     (no goal) no streak is computed: state 'none', count 0; weeks still carry their attended counts.
 *  3. The current week is in progress: it never breaks the streak; it counts toward it once met.
 *     State 'at_risk' = current week not met, ≤ 2 days left in it (Saturday or Sunday), count > 0.
 *  4. Rest week: one missed week per rolling 4 weeks is forgiven ("saved") provided the member attended
 *     at least once in the 4 weeks before it and the run is alive (count > 0). A saved week keeps the
 *     streak but does not add to it. `graceAvailable` = no saved week in the current 4-week window
 *     (this week and the 3 before it).
 *  5. A week where the membership was paused — a `memberships` row with status 'paused' whose
 *     `paused_until` covers the whole week and whose pause began (updated_at) before it — is skipped:
 *     it neither counts nor breaks.
 *  6. Two consecutive missed weeks, or a missed week with no grace → the run resets. State 'broken' when
 *     the break happened within the last 4 weeks and the run before it was ≥ 2; 'building' when count is
 *     0 but this week already has ≥ 1 attendance; 'alive' otherwise when count ≥ 1; else 'none'.
 *  7. `best` is the longest run in the whole history under the same rules. `count` counts met weeks in
 *     the current run (saved weeks excluded, the current week included once met).
 *  8. Changing the goal never rewrites the past (0040). A week is graded by the goal in force when it closed: the
 *     latest `practice_goals` row (by starts_on, then created_at; ended rows included) whose starts_on ≤ that week's
 *     Sunday. Weeks before the earliest goal use the earliest goal's target; with no goal rows at all every week has
 *     target 0. So a goal set mid-week governs the week it was set in and every later one, and the weeks already
 *     lived keep the target they were lived under (`PracticeWeek.target`). A past week whose target was 0 ("sin meta")
 *     resets the run without counting as a break. `target`, `hasGoal` and `thisWeek` are the current active goal.
 */
import type { Bi } from '../specs/types';
import type { BookingRow, ClassSessionRow, ClassLedgerRow, MembershipRow, ModalityRow, PracticeGoalRow, ProfileRow, ReviewRow, TeacherRow, UserRow } from './schema';
import { addDays, addDaysKey, dateKey, fromDateKey, MS, startOfDay, studioParts } from '../i18n/format';

export type GoalCadence = 'week';
export const MILESTONES = [1, 5, 10, 25, 50, 100, 250] as const;
/** Evidence: two visits a week is the habit that predicts retention (research §5); the picker preselects it. */
export const DEFAULT_TARGET = 2;
/** Days since the last visit at which a member enters each at-risk band. */
export const AT_RISK_BANDS = [14, 30, 60, 90] as const;
export type AtRiskBand = (typeof AT_RISK_BANDS)[number];

// ---------------------------------------------------------------------------------------------
// Shared helpers

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const toDate = (v: Date | string): Date => (typeof v === 'string' ? (DATE_KEY.test(v) ? fromDateKey(v) : new Date(v)) : v);
/** Index of the weekday with Monday = 0 … Sunday = 6. */
const mondayIndex = (d: Date) => (studioParts(d).weekday + 6) % 7;
/** Whole days between two instants, by local calendar day. */
const daysBetween = (from: Date | string, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(toDate(from)).getTime()) / MS.day);
export const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Monday of the week containing `d`, as a local date key. */
export function weekStartKey(d: Date | string): string {
  const date = toDate(d);
  return dateKey(addDays(startOfDay(date), -mondayIndex(date)));
}
/** `YYYY-MM` of a local date. */
const monthKey = (d: Date | string) => dateKey(toDate(d)).slice(0, 7);

/** A booking joined to its session: the unit every metric counts. Cancelled sessions carry no visits. */
interface Visit { booking: BookingRow; session: ClassSessionRow; day: string; week: string }

function joinVisits(bookings: BookingRow[], sessions: ClassSessionRow[]): { rows: Visit[]; bySession: Map<string, ClassSessionRow> } {
  const bySession = new Map(sessions.map((s) => [s.id, s]));
  const rows: Visit[] = [];
  for (const booking of bookings) {
    const session = bySession.get(booking.session_id);
    if (!session || session.status === 'cancelled') continue;
    const day = dateKey(new Date(session.starts_at));
    rows.push({ booking, session, day, week: weekStartKey(day) });
  }
  rows.sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at));
  return { rows, bySession };
}

const attended = (v: Visit) => v.booking.status === 'checked_in';
/** A seat that was taken when the class ran: booked (still), checked in or a no-show. Late cancels and cancels do not count. */
const seatTaken = (b: Pick<BookingRow, 'status'>) => b.status === 'booked' || b.status === 'checked_in' || b.status === 'no_show';

/** True when a membership pause covers the whole week starting `week`. */
function isPausedWeek(week: string, memberships: MembershipRow[]): boolean {
  const end = addDaysKey(week, 6);
  return memberships.some((m) => m.status === 'paused' && !!m.paused_until && m.paused_until >= end && dateKey(new Date(m.updated_at)) <= week);
}

// ---------------------------------------------------------------------------------------------
// Member practice

export interface PracticeInput {
  userId: string; bookings: BookingRow[]; sessions: ClassSessionRow[];
  /** The member's full goal history, active and ended (rule 8). When absent, `goal` alone is used for every week. */
  goals?: PracticeGoalRow[];
  /** The active goal (backward compatibility; ignored when `goals` is given). */
  goal?: PracticeGoalRow | null;
  memberships?: MembershipRow[]; now?: Date;
}
export interface PracticeDay { date: string; attended: boolean; booked: boolean; isToday: boolean; isFuture: boolean }
export interface PracticeWeek { start: string; end: string; attended: number; booked: number; target: number; met: boolean; saved: boolean; isCurrent: boolean; paused: boolean }
export type StreakState = 'none' | 'building' | 'alive' | 'at_risk' | 'broken';
export interface PracticeStats {
  /** The active goal's target, or 0 when there is no goal. Past weeks carry their own (`weeks[].target`, rule 8). */
  target: number;
  hasGoal: boolean;
  /** checked_in bookings whose SESSION starts in the current calendar month (local). */
  attendedThisMonth: number;
  /** status booked, session in the future. */
  bookedUpcoming: number;
  lateCancelsThisMonth: number;
  noShowsThisMonth: number;
  attendedAllTime: number;
  firstVisit: string | null;
  lastVisit: string | null;
  daysSinceLastVisit: number | null;
  /** Sum of session ends_at − starts_at over this month's visits. */
  minutesThisMonth: number;
  thisWeek: { attended: number; booked: number; target: number; days: PracticeDay[]; remaining: number };
  streak: { count: number; best: number; state: StreakState; savedWeeks: string[]; graceAvailable: boolean };
  /** Last 12 weeks, oldest first, current week last. */
  weeks: PracticeWeek[];
  milestonesReached: number[];
  /** When each reached milestone happened (the session date of the n-th visit), for the timeline and the event record. */
  milestoneDates: { at: number; on: string }[];
  nextMilestone: { at: number; remaining: number } | null;
  favouriteModalityId: string | null;
  favouriteTeacherId: string | null;
  distinctModalities: number;
  /** Median attended per full week over the last 8 weeks, clamped 1–4; DEFAULT_TARGET when < 2 weeks of history. */
  suggestedTarget: number;
}

/** The weeks from the member's first visit up to (not including) the current one, each with its attendance. */
function fullWeeksSince(firstWeek: string | null, currentWeek: string, attendedByWeek: Map<string, number>): { week: string; attended: number }[] {
  if (!firstWeek) return [];
  const out: { week: string; attended: number }[] = [];
  for (let w = firstWeek; w < currentWeek; w = addDaysKey(w, 7)) out.push({ week: w, attended: attendedByWeek.get(w) ?? 0 });
  return out;
}

function suggestFrom(history: { attended: number }[]): { target: number; basis: 'history' | 'default' } {
  const last8 = history.slice(-8);
  if (last8.length < 2) return { target: DEFAULT_TARGET, basis: 'default' };
  return { target: clamp(median(last8.map((w) => w.attended)), 1, 4), basis: 'history' };
}

/** What weekly target the member's own history suggests (the picker's "recomendado" and the M-12 adoption nudge). */
export function suggestGoal(bookings: BookingRow[], sessions: ClassSessionRow[], now: Date = new Date()): { target: number; basis: 'history' | 'default' } {
  const { rows } = joinVisits(bookings, sessions);
  const visits = rows.filter(attended).filter((v) => new Date(v.session.starts_at) <= now);
  const byWeek = new Map<string, number>();
  for (const v of visits) byWeek.set(v.week, (byWeek.get(v.week) ?? 0) + 1);
  return suggestFrom(fullWeeksSince(visits[0]?.week ?? null, weekStartKey(now), byWeek));
}

/** Goal rows oldest first: by starts_on, then created_at (two rows on the same day → the later one wins). */
const sortGoals = (goals: PracticeGoalRow[]) => [...goals].sort((a, b) => a.starts_on.localeCompare(b.starts_on) || a.created_at.localeCompare(b.created_at));

/** The goal currently in force: the latest active row (rule 8 ordering), or null. */
export function activeGoalOf(goals: PracticeGoalRow[]): PracticeGoalRow | null {
  const active = sortGoals(goals.filter((g) => g.active !== false));
  return active[active.length - 1] ?? null;
}

/**
 * Rule 8: `targetOf(weekMonday)` = target of the latest goal whose starts_on ≤ that week's Sunday; before the earliest
 * goal, the earliest goal's target; 0 with no goals. Negative targets read as 0.
 */
export function weekTargetResolver(goals: PracticeGoalRow[]): (week: string) => number {
  const sorted = sortGoals(goals);
  if (!sorted.length) return () => 0;
  return (week) => {
    const end = addDaysKey(week, 6);
    let row = sorted[0];
    for (const g of sorted) { if (g.starts_on <= end) row = g; else break; }
    return Math.max(0, row.target);
  };
}

interface StreakWalk { count: number; best: number; savedWeeks: string[]; allSaved: Set<string>; lastSaved: string | null; lastBreak: { week: string; countBefore: number } | null }

/**
 * Walks the full weeks (first visit → the week before the current one) applying rules 2, 4, 5, 6 and 8, each week
 * against its own target. Returns the state of the run at the start of the current week.
 */
function walkStreak(targetOf: (week: string) => number, firstWeek: string | null, currentWeek: string, attendedByWeek: Map<string, number>, memberships: MembershipRow[]): StreakWalk {
  const walk: StreakWalk = { count: 0, best: 0, savedWeeks: [], allSaved: new Set(), lastSaved: null, lastBreak: null };
  if (!firstWeek) return walk;
  for (let w = firstWeek; w < currentWeek; w = addDaysKey(w, 7)) {
    if (isPausedWeek(w, memberships)) continue;
    const target = targetOf(w);
    // Rule 8: a week lived without a goal has nothing to meet; the run restarts after it, quietly (no break).
    if (target <= 0) { walk.count = 0; walk.savedWeeks = []; continue; }
    const got = attendedByWeek.get(w) ?? 0;
    if (got >= target) { walk.count++; walk.best = Math.max(walk.best, walk.count); continue; }
    // Missed. Rule 4: forgiven once per rolling 4 weeks, when the run is alive and there was practice in the 4 weeks before.
    let priorAttendance = false;
    for (let k = 1; k <= 4 && !priorAttendance; k++) priorAttendance = (attendedByWeek.get(addDaysKey(w, -7 * k)) ?? 0) > 0;
    const recentSave = !!walk.lastSaved && walk.lastSaved >= addDaysKey(w, -21);
    if (walk.count > 0 && priorAttendance && !recentSave) { walk.savedWeeks.push(w); walk.allSaved.add(w); walk.lastSaved = w; continue; }
    // Rule 6: the run resets.
    if (walk.count > 0) walk.lastBreak = { week: w, countBefore: walk.count };
    walk.count = 0; walk.savedWeeks = [];
  }
  return walk;
}

export function practiceStats(input: PracticeInput): PracticeStats {
  const now = input.now ?? new Date();
  const today = dateKey(now);
  const currentWeek = weekStartKey(now);
  const thisMonth = monthKey(now);
  const goals = input.goals ?? (input.goal ? [input.goal] : []);
  const active = activeGoalOf(goals);
  const target = active ? Math.max(0, active.target) : 0;
  const targetOf = weekTargetResolver(goals);
  const memberships = input.memberships ?? [];
  const { rows } = joinVisits(input.bookings.filter((b) => b.user_id === input.userId), input.sessions);

  const visits = rows.filter(attended).filter((v) => new Date(v.session.starts_at) <= now);
  const attendedByWeek = new Map<string, number>();
  const bookedByWeek = new Map<string, number>();
  for (const v of visits) attendedByWeek.set(v.week, (attendedByWeek.get(v.week) ?? 0) + 1);
  for (const v of rows) if (v.booking.status === 'booked') bookedByWeek.set(v.week, (bookedByWeek.get(v.week) ?? 0) + 1);

  const firstWeek = visits[0]?.week ?? null;
  const lastVisit = visits.length ? visits[visits.length - 1].day : null;

  // Month and upcoming counters (rule: by session date).
  const inMonth = rows.filter((v) => monthKey(v.session.starts_at) === thisMonth);
  const attendedMonth = inMonth.filter(attended);
  const minutesThisMonth = Math.round(attendedMonth.reduce((a, v) => a + (new Date(v.session.ends_at).getTime() - new Date(v.session.starts_at).getTime()) / MS.min, 0));

  // This week, Monday → Sunday.
  const days: PracticeDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDaysKey(currentWeek, i);
    days.push({ date, attended: visits.some((v) => v.day === date), booked: rows.some((v) => v.day === date && v.booking.status === 'booked'), isToday: date === today, isFuture: date > today });
  }
  const attendedThisWeek = attendedByWeek.get(currentWeek) ?? 0;

  // Streak. With no active goal the history is still walked (weeks[] keeps its met / saved flags) but no run is reported (rule 2).
  const walk = walkStreak(targetOf, firstWeek, currentWeek, attendedByWeek, memberships);
  const metNow = target > 0 && attendedThisWeek >= target;
  const count = target > 0 ? (metNow ? walk.count + 1 : walk.count) : 0;
  const best = Math.max(walk.best, count);
  const daysLeft = 7 - mondayIndex(now); // Monday 7 … Saturday 2, Sunday 1
  let state: StreakState = 'none';
  if (target > 0) {
    if (count > 0) state = !metNow && daysLeft <= 2 ? 'at_risk' : 'alive';
    else if (attendedThisWeek > 0) state = 'building';
    else if (walk.lastBreak && walk.lastBreak.countBefore >= 2 && walk.lastBreak.week >= addDaysKey(currentWeek, -28)) state = 'broken';
  }
  const graceAvailable = target > 0 && !(walk.lastSaved && walk.lastSaved >= addDaysKey(currentWeek, -21));

  // Last 12 weeks, each against the target it was lived under (rule 8).
  const weeks: PracticeWeek[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = addDaysKey(currentWeek, -7 * i);
    const got = attendedByWeek.get(start) ?? 0;
    const weekTarget = start === currentWeek ? target : targetOf(start);
    weeks.push({ start, end: addDaysKey(start, 6), attended: got, booked: bookedByWeek.get(start) ?? 0, target: weekTarget, met: weekTarget > 0 && got >= weekTarget, saved: walk.allSaved.has(start), isCurrent: start === currentWeek, paused: isPausedWeek(start, memberships) });
  }

  // Milestones.
  const milestonesReached = MILESTONES.filter((m) => visits.length >= m);
  const milestoneDates = milestonesReached.map((m) => ({ at: m, on: visits[m - 1].day }));
  const next = MILESTONES.find((m) => m > visits.length);

  // Favourites over the last 90 days.
  const since = addDays(now, -90);
  const recent = visits.filter((v) => new Date(v.session.starts_at) >= since);
  const top = (key: (v: Visit) => string): string | null => {
    const tally = new Map<string, number>();
    for (const v of recent) tally.set(key(v), (tally.get(key(v)) ?? 0) + 1);
    return [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
  };

  return {
    target,
    hasGoal: target > 0,
    attendedThisMonth: attendedMonth.length,
    bookedUpcoming: rows.filter((v) => v.booking.status === 'booked' && new Date(v.session.starts_at) > now).length,
    lateCancelsThisMonth: inMonth.filter((v) => v.booking.status === 'late_cancel').length,
    noShowsThisMonth: inMonth.filter((v) => v.booking.status === 'no_show').length,
    attendedAllTime: visits.length,
    firstVisit: visits[0]?.day ?? null,
    lastVisit,
    daysSinceLastVisit: lastVisit ? daysBetween(lastVisit, now) : null,
    minutesThisMonth,
    thisWeek: { attended: attendedThisWeek, booked: bookedByWeek.get(currentWeek) ?? 0, target, days, remaining: Math.max(0, target - attendedThisWeek) },
    streak: { count, best, state, savedWeeks: target > 0 ? walk.savedWeeks : [], graceAvailable },
    weeks,
    milestonesReached,
    milestoneDates,
    nextMilestone: next ? { at: next, remaining: next - visits.length } : null,
    favouriteModalityId: top((v) => v.session.modality_id),
    favouriteTeacherId: top((v) => v.session.teacher_id),
    distinctModalities: new Set(recent.map((v) => v.session.modality_id)).size,
    suggestedTarget: suggestFrom(fullWeeksSince(firstWeek, currentWeek, attendedByWeek)).target,
  };
}

// ---------------------------------------------------------------------------------------------
// Studio and teacher

export interface StudioInput {
  bookings: BookingRow[]; sessions: ClassSessionRow[]; memberships: MembershipRow[]; profiles: ProfileRow[]; users?: UserRow[];
  ledger: ClassLedgerRow[]; goals: PracticeGoalRow[]; teachers: TeacherRow[]; modalities: ModalityRow[]; now?: Date;
  /** 7 | 30 | 90 */
  rangeDays: number;
}
export interface AtRiskMember { userId: string; name: string; lastVisit: string; daysSince: number; band: AtRiskBand; hadGoal: boolean }
export interface StudioStats {
  classesHeld: number; seatsOffered: number; seatsBooked: number; seatsAttended: number;
  /** booked / capacity, 0–100 */
  fillRate: number;
  /** attended / booked, 0–100 */
  attendanceRate: number;
  /** no-shows / booked, 0–100 */
  noShowRate: number;
  /** late cancels / (booked + late cancels), 0–100 */
  lateCancelRate: number;
  /** distinct users with ≥ 1 check-in in range */
  activeMembers: number;
  /** first ever check-in inside the range */
  newMembers: number;
  returningMembers: number;
  /** Members whose first visit was 30–60 days before now: did they attend a second class within 30 days? */
  secondVisitConversion: { firstTimers: number; cameBack: number; rate: number };
  visitsPerActiveMemberPerWeek: number;
  /** People with classes left in a live package (or a dormant active membership) whose last check-in is ≥ 14 days ago, sorted by daysSince desc. */
  atRisk: AtRiskMember[];
  /** weekday 1..6 Mon..Sat, 0 Sun (JS getDay); fill 0–100 */
  heatmap: { weekday: number; hour: number; classes: number; fill: number }[];
  byModality: { id: string; name: Bi; classes: number; attended: number; fill: number }[];
  byTeacher: { id: string; name: string; classes: number; attended: number; fill: number; noShowRate: number; newFaces: number; regulars: number }[];
  goals: { withGoal: number; onTrackThisWeek: number; avgTarget: number };
  /** Members with a live credit balance whose next expiry falls within 14 / 7 days. */
  /** People whose package classes run out within 14 / 7 days (0051, was creditsExpiring*). */
  packagesExpiring14d: number; packagesExpiring7d: number;
  milestonesThisRange: { userId: string; name: string; count: number; at: string }[];
}

/** The band a member falls in: the largest threshold ≤ daysSince, or null under the first one. */
export function atRiskBand(daysSince: number): AtRiskBand | null {
  let band: AtRiskBand | null = null;
  for (const b of AT_RISK_BANDS) if (daysSince >= b) band = b;
  return band;
}

/** Per-user chronological visits (checked_in, by session start), the index most studio metrics need. */
function visitsByUser(rows: Visit[]): Map<string, Visit[]> {
  const out = new Map<string, Visit[]>();
  for (const v of rows) if (attended(v)) out.set(v.booking.user_id, [...(out.get(v.booking.user_id) ?? []), v]);
  return out;
}

const nameOf = (userId: string, profiles: ProfileRow[], users?: UserRow[]) => profiles.find((p) => p.user_id === userId)?.full_name ?? users?.find((u) => u.id === userId)?.email ?? userId;

interface Range { from: Date; to: Date }
const inRange = (iso: string, r: Range) => { const t = new Date(iso).getTime(); return t >= r.from.getTime() && t <= r.to.getTime(); };
const rangeOf = (now: Date, days: number): Range => ({ from: new Date(now.getTime() - days * MS.day), to: now });

/** The classes that ran inside the range and the seats on them. */
function heldClasses(sessions: ClassSessionRow[], rows: Visit[], r: Range, teacherId?: string) {
  const held = sessions.filter((s) => s.status === 'completed' && inRange(s.starts_at, r) && (!teacherId || s.teacher_id === teacherId));
  const ids = new Set(held.map((s) => s.id));
  const seats = rows.filter((v) => ids.has(v.session.id));
  const booked = seats.filter((v) => seatTaken(v.booking));
  return {
    held, seats, booked,
    capacity: held.reduce((a, s) => a + s.capacity, 0),
    attended: booked.filter(attended),
    noShows: booked.filter((v) => v.booking.status === 'no_show'),
    lateCancels: seats.filter((v) => v.booking.status === 'late_cancel'),
  };
}

/** Members with ≥ 3 check-ins with a teacher in range, and members whose first check-in with that teacher falls in range. */
function facesFor(teacherId: string, rows: Visit[], r: Range): { newFaces: number; regulars: number } {
  const withTeacher = new Map<string, Visit[]>();
  for (const v of rows) if (attended(v) && v.session.teacher_id === teacherId) withTeacher.set(v.booking.user_id, [...(withTeacher.get(v.booking.user_id) ?? []), v]);
  let newFaces = 0, regulars = 0;
  for (const vs of withTeacher.values()) {
    if (inRange(vs[0].session.starts_at, r)) newFaces++;
    if (vs.filter((v) => inRange(v.session.starts_at, r)).length >= 3) regulars++;
  }
  return { newFaces, regulars };
}

export function studioStats(input: StudioInput): StudioStats {
  const now = input.now ?? new Date();
  const r = rangeOf(now, input.rangeDays);
  const today = dateKey(now);
  const { rows } = joinVisits(input.bookings, input.sessions);
  const past = rows.filter((v) => new Date(v.session.starts_at) <= now);
  const perUser = visitsByUser(past);
  const h = heldClasses(input.sessions, rows, r);

  // Members.
  const activeIds = new Set(h.attended.map((v) => v.booking.user_id));
  let newMembers = 0;
  for (const id of activeIds) if (inRange(perUser.get(id)![0].session.starts_at, r)) newMembers++;

  // Second-visit conversion: first-timers of 30–60 days ago.
  let firstTimers = 0, cameBack = 0;
  for (const vs of perUser.values()) {
    const first = new Date(vs[0].session.starts_at);
    const age = daysBetween(first, now);
    if (age < 30 || age > 60) continue;
    firstTimers++;
    if (vs.some((v, i) => i > 0 && new Date(v.session.starts_at).getTime() <= first.getTime() + 30 * MS.day)) cameBack++;
  }

  // At risk: classes left in a live package (or a dormant active membership), last visit ≥ 14 days ago.
  const activeGoal = new Set(input.goals.filter((g) => g.active && g.target > 0).map((g) => g.user_id));
  const balance = new Map<string, number>();
  const nextExpiry = new Map<string, string>();
  for (const c of input.ledger) {
    if (c.delta > 0 && c.expires_at && c.expires_at < today) continue; // expired purchase
    balance.set(c.user_id, (balance.get(c.user_id) ?? 0) + c.delta);
    if (c.delta > 0 && c.expires_at && c.expires_at >= today && (!nextExpiry.has(c.user_id) || c.expires_at < nextExpiry.get(c.user_id)!)) nextExpiry.set(c.user_id, c.expires_at);
  }
  const entitled = new Set<string>();
  for (const m of input.memberships) if (m.status === 'active') entitled.add(m.user_id);
  for (const [id, bal] of balance) if (bal > 0) entitled.add(id);
  const atRisk: AtRiskMember[] = [];
  for (const id of entitled) {
    const vs = perUser.get(id);
    if (!vs) continue;
    const last = vs[vs.length - 1].day;
    const daysSince = daysBetween(last, now);
    const band = atRiskBand(daysSince);
    if (band) atRisk.push({ userId: id, name: nameOf(id, input.profiles, input.users), lastVisit: last, daysSince, band, hadGoal: activeGoal.has(id) });
  }
  atRisk.sort((a, b) => b.daysSince - a.daysSince || a.name.localeCompare(b.name));

  // Heatmap by weekday × hour.
  const cells = new Map<string, { weekday: number; hour: number; classes: number; fillSum: number }>();
  for (const s of h.held) {
    const d = new Date(s.starts_at);
    const key = `${studioParts(d).weekday}-${studioParts(d).hour}`;
    const cell = cells.get(key) ?? { weekday: studioParts(d).weekday, hour: studioParts(d).hour, classes: 0, fillSum: 0 };
    cell.classes++;
    cell.fillSum += s.capacity > 0 ? h.booked.filter((v) => v.session.id === s.id).length / s.capacity : 0;
    cells.set(key, cell);
  }
  const heatmap = [...cells.values()].map((c) => ({ weekday: c.weekday, hour: c.hour, classes: c.classes, fill: Math.round((c.fillSum / c.classes) * 100) })).sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);

  // By modality / teacher.
  const byModality = input.modalities.map((m) => {
    const classes = h.held.filter((s) => s.modality_id === m.id);
    const ids = new Set(classes.map((s) => s.id));
    return { id: m.id, name: { es: m.name_es, en: m.name_en }, classes: classes.length, attended: h.attended.filter((v) => ids.has(v.session.id)).length, fill: pct(h.booked.filter((v) => ids.has(v.session.id)).length, classes.reduce((a, s) => a + s.capacity, 0)) };
  }).filter((m) => m.classes > 0).sort((a, b) => b.attended - a.attended);
  const byTeacher = input.teachers.map((t) => {
    const classes = h.held.filter((s) => s.teacher_id === t.id);
    const ids = new Set(classes.map((s) => s.id));
    const booked = h.booked.filter((v) => ids.has(v.session.id));
    const faces = facesFor(t.id, past, r);
    return { id: t.id, name: t.display_name, classes: classes.length, attended: booked.filter(attended).length, fill: pct(booked.length, classes.reduce((a, s) => a + s.capacity, 0)), noShowRate: pct(booked.filter((v) => v.booking.status === 'no_show').length, booked.length), ...faces };
  }).filter((t) => t.classes > 0).sort((a, b) => b.attended - a.attended);

  // Goals.
  const currentWeek = weekStartKey(now);
  const goals = input.goals.filter((g) => g.active && g.target > 0);
  const onTrack = goals.filter((g) => (perUser.get(g.user_id) ?? []).filter((v) => v.week === currentWeek).length >= g.target).length;

  // Credits expiring.
  const expiring = (days: number) => { const limit = addDaysKey(today, days); let n = 0; for (const [id, exp] of nextExpiry) if ((balance.get(id) ?? 0) > 0 && exp <= limit) n++; return n; };

  // Milestones reached inside the range.
  const milestonesThisRange: StudioStats['milestonesThisRange'] = [];
  for (const [id, vs] of perUser) for (const m of MILESTONES) if (vs.length >= m && inRange(vs[m - 1].session.starts_at, r)) milestonesThisRange.push({ userId: id, name: nameOf(id, input.profiles, input.users), count: m, at: vs[m - 1].day });
  milestonesThisRange.sort((a, b) => b.at.localeCompare(a.at) || b.count - a.count);

  return {
    classesHeld: h.held.length,
    seatsOffered: h.capacity,
    seatsBooked: h.booked.length,
    seatsAttended: h.attended.length,
    fillRate: pct(h.booked.length, h.capacity),
    attendanceRate: pct(h.attended.length, h.booked.length),
    noShowRate: pct(h.noShows.length, h.booked.length),
    lateCancelRate: pct(h.lateCancels.length, h.booked.length + h.lateCancels.length),
    activeMembers: activeIds.size,
    newMembers,
    returningMembers: activeIds.size - newMembers,
    secondVisitConversion: { firstTimers, cameBack, rate: pct(cameBack, firstTimers) },
    visitsPerActiveMemberPerWeek: activeIds.size ? round1(h.attended.length / activeIds.size / (input.rangeDays / 7)) : 0,
    atRisk,
    heatmap,
    byModality,
    byTeacher,
    goals: { withGoal: goals.length, onTrackThisWeek: onTrack, avgTarget: goals.length ? round1(goals.reduce((a, g) => a + g.target, 0) / goals.length) : 0 },
    packagesExpiring14d: expiring(14),
    packagesExpiring7d: expiring(7),
    milestonesThisRange,
  };
}

export interface TeacherStats {
  classesTaught: number;
  /** Scheduled classes in the next `rangeDays`. */
  scheduled: number;
  avgAttendance: number; fillRate: number; noShowRate: number;
  /** Members whose first check-in with this teacher falls in range. */
  newFaces: number;
  /** Members with ≥ 3 check-ins with this teacher in range. */
  regulars: number;
  /** People whose FIRST EVER class was with this teacher in range, and whether they attended any class within 30 days after. */
  firstTimerReturn: { n: number; returned: number; rate: number };
  ratingAvg: number | null; ratingCount: number;
}

export function teacherStats(teacherId: string, input: StudioInput & { reviews?: ReviewRow[] }): TeacherStats {
  const now = input.now ?? new Date();
  const r = rangeOf(now, input.rangeDays);
  const { rows } = joinVisits(input.bookings, input.sessions);
  const past = rows.filter((v) => new Date(v.session.starts_at) <= now);
  const h = heldClasses(input.sessions, rows, r, teacherId);
  const faces = facesFor(teacherId, past, r);

  let n = 0, returned = 0;
  for (const vs of visitsByUser(past).values()) {
    const first = vs[0];
    if (first.session.teacher_id !== teacherId || !inRange(first.session.starts_at, r)) continue;
    n++;
    const firstAt = new Date(first.session.starts_at).getTime();
    if (vs.some((v, i) => i > 0 && new Date(v.session.starts_at).getTime() <= firstAt + 30 * MS.day)) returned++;
  }

  const reviews = (input.reviews ?? []).filter((x) => x.teacher_id === teacherId && inRange(x.created_at, r));
  const horizon = new Date(now.getTime() + input.rangeDays * MS.day);
  return {
    classesTaught: h.held.length,
    scheduled: input.sessions.filter((s) => s.teacher_id === teacherId && s.status === 'scheduled' && new Date(s.starts_at) > now && new Date(s.starts_at) <= horizon).length,
    avgAttendance: h.held.length ? round1(h.attended.length / h.held.length) : 0,
    fillRate: pct(h.booked.length, h.capacity),
    noShowRate: pct(h.noShows.length, h.booked.length),
    ...faces,
    firstTimerReturn: { n, returned, rate: pct(returned, n) },
    ratingAvg: reviews.length ? round1(reviews.reduce((a, x) => a + x.rating, 0) / reviews.length) : null,
    ratingCount: reviews.length,
  };
}
