/**
 * The React face of `analytics.ts`: pages never compute a streak, a fill rate or a milestone themselves.
 * They call these hooks, which read the raw tables through `useTable()` and memoise the pure functions.
 * Writes (a goal, the events record) go through `useData()` so the same code runs on Supabase.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useData, useTable } from './DataContext';
import { useSession } from '../auth/SessionProvider';
import { dateKey, fromDateKey } from '../i18n/format';
import type { ActivityEventRow, BookingRow, ClassSessionRow, ClassLedgerRow, GoalSource, MembershipRow, ModalityRow, PracticeGoalRow, ProfileRow, ReviewRow, TeacherRow, UserRow } from './schema';
import { activeGoalOf, practiceStats, studioStats, teacherStats, type PracticeStats, type StudioStats, type TeacherStats } from './analytics';

/** The one active goal of a person (the latest by starts_on, then created_at, when the data ever holds two). */
const activeGoal = (rows: PracticeGoalRow[]): PracticeGoalRow | null => activeGoalOf(rows);

/** Practice stats for a member — the signed-in user by default (C-01, C-27), or any id (M-06). */
export function usePracticeStats(userId?: string): { stats: PracticeStats; goal: PracticeGoalRow | null; loading: boolean } {
  const { user } = useSession();
  const id = userId ?? user.id;
  const { rows: bookings, loading: l1 } = useTable<BookingRow>('bookings', { where: { user_id: id } });
  const { rows: sessions, loading: l2 } = useTable<ClassSessionRow>('class_sessions');
  // Every goal row, ended ones included: past weeks are graded by the goal they were lived under (analytics.ts rule 8).
  const { rows: goals, loading: l3 } = useTable<PracticeGoalRow>('practice_goals', { where: { user_id: id } });
  const { rows: memberships } = useTable<MembershipRow>('memberships', { where: { user_id: id } });
  const goal = useMemo(() => activeGoal(goals), [goals]);
  const stats = useMemo(() => practiceStats({ userId: id, bookings, sessions, goals, memberships }), [id, bookings, sessions, goals, memberships]);
  return { stats, goal, loading: l1 || l2 || l3 };
}

/** M-06: the same numbers for a member the team is looking at. */
export const useMemberPractice = (userId: string) => usePracticeStats(userId);

/**
 * Reading and changing the signed-in member's weekly goal. `setGoal` ends the active row (history survives),
 * inserts the new one starting today and records a `goal.set` event. `clearGoal` = target 0 ("sin meta").
 */
export function usePracticeGoal(): { goal: PracticeGoalRow | null; setGoal: (target: number, source: GoalSource, note?: string) => Promise<void>; clearGoal: () => Promise<void> } {
  const data = useData();
  const { user } = useSession();
  const { rows } = useTable<PracticeGoalRow>('practice_goals', { where: { user_id: user.id, active: true } });
  const goal = useMemo(() => activeGoal(rows), [rows]);

  const setGoal = useCallback(async (target: number, source: GoalSource, note?: string) => {
    const now = new Date();
    const clean = Math.max(0, Math.min(7, Math.round(target)));
    // Read the live rows, not the render's snapshot: two quick taps must still leave exactly one active goal.
    const active = await data.list<PracticeGoalRow>('practice_goals', { where: { user_id: user.id, active: true } });
    for (const g of active) await data.update<PracticeGoalRow>('practice_goals', g.id, { active: false });
    const row = await data.insert<PracticeGoalRow>('practice_goals', { user_id: user.id, cadence: 'week', target: clean, source, starts_on: dateKey(now), active: true, note: note?.trim() || null });
    await data.insert<ActivityEventRow>('activity_events', { user_id: user.id, kind: 'goal.set', occurred_at: now.toISOString(), ref_table: 'practice_goals', ref_id: row.id, payload: { target: clean, source } });
  }, [data, user.id]);

  const clearGoal = useCallback(() => setGoal(0, 'member'), [setGoal]);
  return { goal, setGoal, clearGoal };
}

/**
 * Writes the member-facing record as the derived numbers move: one `milestone` event per milestone reached
 * (payload { count }, dated at the visit that reached it) and one `streak.saved` per rest week in the current
 * run (payload { week }). Idempotent: existing events are read first, and a ref guards the in-flight inserts.
 * Quiet on purpose — the page decides whether to celebrate.
 */
export function useMilestoneRecorder(stats: PracticeStats): void {
  const data = useData();
  const { user } = useSession();
  const { rows: events, loading } = useTable<ActivityEventRow>('activity_events', { where: { user_id: user.id } });
  const inFlight = useRef(new Set<string>());
  const { milestoneDates, streak } = stats;
  useEffect(() => {
    if (loading) return;
    const have = new Set<string>();
    for (const e of events) {
      if (e.kind === 'milestone') have.add(`m:${String(e.payload?.count)}`);
      if (e.kind === 'streak.saved') have.add(`s:${String(e.payload?.week)}`);
    }
    const jobs: Promise<unknown>[] = [];
    for (const m of milestoneDates) {
      const key = `m:${m.at}`;
      if (have.has(key) || inFlight.current.has(key)) continue;
      inFlight.current.add(key);
      jobs.push(data.insert<ActivityEventRow>('activity_events', { user_id: user.id, kind: 'milestone', occurred_at: fromDateKey(m.on).toISOString(), ref_table: 'bookings', ref_id: null, payload: { count: m.at } }));
    }
    for (const week of streak.savedWeeks) {
      const key = `s:${week}`;
      if (have.has(key) || inFlight.current.has(key)) continue;
      inFlight.current.add(key);
      jobs.push(data.insert<ActivityEventRow>('activity_events', { user_id: user.id, kind: 'streak.saved', occurred_at: fromDateKey(week).toISOString(), ref_table: null, ref_id: null, payload: { week } }));
    }
    if (jobs.length) void Promise.all(jobs).catch(() => { /* a failed insert is retried on the next change */ });
  }, [data, user.id, events, loading, milestoneDates, streak.savedWeeks]);
}

/** Everything `studioStats` needs, read once and shared by M-12 and the teacher hook. */
function useStudioInput(rangeDays: number) {
  const { rows: bookings } = useTable<BookingRow>('bookings');
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions');
  const { rows: memberships } = useTable<MembershipRow>('memberships');
  const { rows: profiles } = useTable<ProfileRow>('profiles');
  const { rows: users } = useTable<UserRow>('users');
  const { rows: ledger } = useTable<ClassLedgerRow>('class_ledger');
  const { rows: goals } = useTable<PracticeGoalRow>('practice_goals', { where: { active: true } });
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  return useMemo(() => ({ bookings, sessions, memberships, profiles, users, ledger, goals, teachers, modalities, rangeDays }), [bookings, sessions, memberships, profiles, users, ledger, goals, teachers, modalities, rangeDays]);
}

/** M-12: the studio over the last 7 / 30 / 90 days. */
export function useStudioStats(rangeDays: number): StudioStats {
  const input = useStudioInput(rangeDays);
  return useMemo(() => studioStats(input), [input]);
}

/** S-03 / M-12 per teacher: classes, fill, new faces, regulars, first-timer return and ratings over the range. */
export function useTeacherStats(teacherId: string, rangeDays: number): TeacherStats {
  const input = useStudioInput(rangeDays);
  const { rows: reviews } = useTable<ReviewRow>('reviews', { where: { teacher_id: teacherId } });
  return useMemo(() => teacherStats(teacherId, { ...input, reviews }), [teacherId, input, reviews]);
}
