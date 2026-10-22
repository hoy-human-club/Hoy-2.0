/**
 * Teacher payroll arithmetic, with no React and no provider — so the seed (historical runs), the
 * admin payouts page (M-09a "generate draft") and the teacher statement (S-03) all compute the same
 * number from the same rule.
 *
 * The rule: a teacher is paid per class actually taught. One completed `class_sessions` row whose
 * `teacher_id` is theirs = one `payroll_lines` row of kind 'class' at `teachers.rate_per_class`.
 * Bonuses and adjustments are extra lines finance adds by hand; they are never derived.
 *
 * The second rule (0017, Especiales): a teacher booked by hand on an Especial — a private class, a
 * birthday session, a teacher sold alongside a rental — is paid what the desk agreed on the
 * `special_charges` row (`teacher_payout`). One such row whose service falls in the period = one
 * `payroll_lines` row of kind 'manual', sourced by `special_charge_id`, so regenerating a draft
 * replaces it instead of adding it twice.
 *
 * The third rule (0018, decisions as settings): the **rate** is no longer only `teachers.rate_per_class`.
 * M-08c holds a rate card — a COP amount per modality and an optional per-teacher override — and
 * `rateFor()` resolves them in that order (teacher override → modality rate → the teacher's profile
 * rate → 0). The **cadence** is a switch too: `periodsFor()` returns one period per month or two
 * (1–15, 16–end), and everything that names a period (M-09a, S-03, the seed) asks it instead of
 * assuming a month.
 */
import type { BookingRow, ClassSessionRow, PayrollLineRow, SpaceBookingRow, SpecialChargeRow, TeacherRow } from './schema';
import { fromDateKey, dateKey, studioParts, studioDate } from '../i18n/format';

export interface Period { start: string; end: string }

/** How often teachers are paid — the M-08c switch. Both are programmed; the owner picks. */
export type PayrollCadence = 'monthly' | 'biweekly';

/** The M-08c rate card: COP per class by modality id, and an optional override by teacher id. */
export interface RateCard { byModality: Record<string, number>; byTeacher: Record<string, number> }
export const EMPTY_RATE_CARD: RateCard = { byModality: {}, byTeacher: {} };

/**
 * The rate one class pays: the teacher's override on the card, else the modality's rate on the card,
 * else the teacher's profile rate (`teachers.rate_per_class`, the pre-0018 rule), else 0.
 */
export function rateFor(teacherId: string, modalityId: string | null, teachers: Pick<TeacherRow, 'id' | 'rate_per_class'>[], card: RateCard = EMPTY_RATE_CARD): number {
  const own = card.byTeacher[teacherId];
  if (own !== undefined && own > 0) return own;
  const mod = modalityId ? card.byModality[modalityId] : undefined;
  if (mod !== undefined && mod > 0) return mod;
  return teachers.find((t) => t.id === teacherId)?.rate_per_class ?? 0;
}

/** Calendar month containing `d`, as date-only strings (end is inclusive). */
export function monthPeriod(d: Date): Period {
  const start = studioDate(studioParts(d).year, studioParts(d).month, 1);
  const end = studioDate(studioParts(d).year, studioParts(d).month + 1, 0);
  return { start: dateKey(start), end: dateKey(end) };
}

/** The pay periods of the month containing `d`: one (monthly) or two — the 1st–15th and the 16th–end (biweekly). */
export function periodsFor(cadence: PayrollCadence, d: Date): Period[] {
  const m = monthPeriod(d);
  if (cadence === 'monthly') return [m];
  const mid = `${m.start.slice(0, 8)}15`;
  const sixteenth = `${m.start.slice(0, 8)}16`;
  return [{ start: m.start, end: mid }, { start: sixteenth, end: m.end }];
}

/**
 * The period `offset` steps away from the one containing `ref` (0 = current, −1 = the previous one).
 * Under biweekly a step is half a month, so −1 in the second half is the first half of the same month.
 */
export function periodAt(cadence: PayrollCadence, ref: Date, offset: number): Period {
  if (cadence === 'monthly') return monthPeriod(studioDate(studioParts(ref).year, studioParts(ref).month + offset, 15));
  const half = studioParts(ref).day >= 16 ? 1 : 0;
  const idx = studioParts(ref).year * 24 + studioParts(ref).month * 2 + half + offset;
  const y = Math.floor(idx / 24), rest = idx - y * 24, month = Math.floor(rest / 2), h = rest % 2;
  return periodsFor('biweekly', studioDate(y, month, 15))[h];
}

/** True when the period is a whole calendar month (the label can then say “septiembre 2026”). */
export const isWholeMonth = (p: Period) => p.start.endsWith('-01') && p.end === monthPeriod(fromDateKey(p.start)).end;

/** Two periods overlap when neither ends before the other starts. */
export const periodsOverlap = (a: Period, b: Period) => a.start <= b.end && b.start <= a.end;

const inPeriod = (isoDate: string, p: Period) => {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : dateKey(new Date(isoDate));
  return day >= p.start && day <= p.end;
};

export interface DraftLine {
  teacher_id: string;
  class_session_id: string | null;
  /** The Especial a manual line comes from; null on every other kind. */
  special_charge_id: string | null;
  kind: PayrollLineRow['kind'];
  rate: number;
  amount: number;
  attendees: number | null;
  note: string | null;
}

/**
 * The class lines of a period: every completed session in it, at the teacher's current rate.
 * Deterministic and idempotent — the same inputs always produce the same lines, so regenerating a
 * draft replaces it without drift.
 */
export function classLinesFor(period: Period, sessions: ClassSessionRow[], bookings: BookingRow[], teachers: TeacherRow[], card: RateCard = EMPTY_RATE_CARD): DraftLine[] {
  const known = new Set(teachers.map((t) => t.id));
  const attendees = new Map<string, number>();
  for (const b of bookings) if (b.status === 'checked_in') attendees.set(b.session_id, (attendees.get(b.session_id) ?? 0) + 1);
  return sessions
    .filter((s) => s.status === 'completed' && known.has(s.teacher_id) && inPeriod(s.starts_at, period))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((s) => {
      const rate = rateFor(s.teacher_id, s.modality_id, teachers, card);
      return {
        teacher_id: s.teacher_id,
        class_session_id: s.id,
        special_charge_id: null,
        kind: 'class' as const,
        rate,
        amount: rate,
        attendees: attendees.get(s.id) ?? 0,
        note: null,
      };
    });
}

/** The day an Especial was delivered: its room window when it has one, else the day it was sold. */
export const specialServiceDate = (sc: SpecialChargeRow, bookings: SpaceBookingRow[]): string =>
  (sc.space_booking_id && bookings.find((b) => b.id === sc.space_booking_id)?.starts_at) || sc.created_at;

/** The label every statement prints for a manual line — M-09b, S-03 and the CSV all read it from `note`. */
export const manualLineNote = (concept: string) => `Especial: ${concept}`;

/**
 * The manual lines of a period: every Especial with a teacher and a payout whose service date falls
 * in it. A cancelled room booking drops the line — the teacher did not work. Deterministic, like
 * `classLinesFor`, so the generator can replace a draft without drift.
 */
function manualLinesFor(period: Period, specials: SpecialChargeRow[], bookings: SpaceBookingRow[], teachers: TeacherRow[]): DraftLine[] {
  const known = new Set(teachers.map((t) => t.id));
  return specials
    .filter((sc) => !!sc.teacher_id && known.has(sc.teacher_id) && (sc.teacher_payout ?? 0) > 0)
    .filter((sc) => !sc.space_booking_id || bookings.find((b) => b.id === sc.space_booking_id)?.status !== 'cancelled')
    .map((sc) => ({ sc, when: specialServiceDate(sc, bookings) }))
    .filter(({ when }) => inPeriod(when, period))
    .sort((a, b) => a.when.localeCompare(b.when))
    .map(({ sc }) => ({
      teacher_id: sc.teacher_id as string,
      class_session_id: null,
      special_charge_id: sc.id,
      kind: 'manual' as const,
      rate: 0,
      amount: sc.teacher_payout ?? 0,
      attendees: null,
      note: manualLineNote(sc.concept),
    }));
}

export interface DraftInputs { sessions: ClassSessionRow[]; bookings: BookingRow[]; teachers: TeacherRow[]; specials: SpecialChargeRow[]; spaceBookings: SpaceBookingRow[]; rateCard?: RateCard }

/** Everything a period's draft contains: class lines, then manual lines. The one call M-09a and the seed make. */
export const draftLinesFor = (period: Period, i: DraftInputs): DraftLine[] => [
  ...classLinesFor(period, i.sessions, i.bookings, i.teachers, i.rateCard ?? EMPTY_RATE_CARD),
  ...manualLinesFor(period, i.specials, i.spaceBookings, i.teachers),
];

export const runTotal = (lines: { amount: number }[]) => lines.reduce((a, l) => a + l.amount, 0);

/** Lines grouped by teacher, each with its subtotal — the shape both statements render. */
export function byTeacher<T extends { teacher_id: string; amount: number }>(lines: T[]): { teacherId: string; lines: T[]; subtotal: number }[] {
  const map = new Map<string, T[]>();
  for (const l of lines) map.set(l.teacher_id, [...(map.get(l.teacher_id) ?? []), l]);
  return [...map.entries()]
    .map(([teacherId, ls]) => ({ teacherId, lines: ls, subtotal: runTotal(ls) }))
    .sort((a, b) => b.subtotal - a.subtotal);
}
