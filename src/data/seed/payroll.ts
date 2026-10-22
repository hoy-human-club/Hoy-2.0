/**
 * M-09a / S-03 — three months of teacher payroll, seeded so the screens open with history.
 *
 * The current month is a **draft** computed from the completed `class_sessions` in the seed window
 * (exactly what "Generate draft for period" does in M-09a). The two months before it are older than
 * that window, so their class lines are reconstructed from the weekly timetable
 * (`class_templates`): one line per occurrence of the template's weekday inside the period, with
 * `class_session_id = null` and a note saying so. That keeps the totals honest instead of inventing
 * sessions that never existed.
 */
import type { BaseRow, BookingRow, ClassSessionRow, PayrollLineRow, PayrollRunRow, SpaceBookingRow, SpecialChargeRow, TeacherRow } from '../schema';
import { draftLinesFor, monthPeriod, rateFor, runTotal, type DraftLine, type Period, type RateCard } from '../payrollCalc';
import { base, iso, NOW } from './catalog';
import { fromDateKey, dateKey, studioParts, addDays, atStudioTime, studioDate } from '../../i18n/format';

interface TemplateRow extends BaseRow { teacher_id: string; modality_id?: string; weekday: number; active: boolean }

/** Every date inside the period that falls on `weekday`, never in the future. */
function occurrences(period: Period, weekday: number): string[] {
  const out: string[] = [];
  const end = fromDateKey(period.end);
  const today = atStudioTime(NOW, 12);
  for (let d = fromDateKey(period.start); d <= end && d <= today; d = addDays(d, 1)) {
    if (studioParts(d).weekday === weekday) out.push(dateKey(d));
  }
  return out;
}

/** Historical class lines from the timetable, for months older than the session window. */
function historicLines(period: Period, templates: TemplateRow[], teachers: TeacherRow[], card: RateCard): DraftLine[] {
  const known = new Set(teachers.map((t) => t.id));
  const out: DraftLine[] = [];
  for (const tpl of templates) {
    if (!tpl.active || !known.has(tpl.teacher_id)) continue;
    const rate = rateFor(tpl.teacher_id, tpl.modality_id ?? null, teachers, card);
    for (const day of occurrences(period, tpl.weekday)) {
      out.push({ teacher_id: tpl.teacher_id, class_session_id: null, special_charge_id: null, kind: 'class', rate, amount: rate, attendees: null, note: `${day} · reconstruido del horario semanal` });
    }
  }
  return out;
}

export function buildPayroll(input: { sessions: ClassSessionRow[]; bookings: BookingRow[]; templates: TemplateRow[]; teachers: TeacherRow[]; specials: SpecialChargeRow[]; spaceBookings: SpaceBookingRow[]; rateCard: RateCard }): { runs: PayrollRunRow[]; lines: PayrollLineRow[] } {
  const runs: PayrollRunRow[] = [];
  const lines: PayrollLineRow[] = [];
  const sessionMonths = new Set(input.sessions.map((s) => s.starts_at.slice(0, 7)));

  for (const offset of [2, 1, 0]) {
    const anchor = studioDate(studioParts(NOW).year, studioParts(NOW).month - offset, 15);
    const period = monthPeriod(anchor);
    const id = `pyr_${period.start.slice(0, 7)}`;
    const status: PayrollRunRow['status'] = offset === 2 ? 'paid' : offset === 1 ? 'approved' : 'draft';
    const fromSessions = sessionMonths.has(period.start.slice(0, 7));
    // The draft month is exactly what M-09a "generate draft" computes: class lines + the manual payouts of Especiales.
    const draft = fromSessions
      ? draftLinesFor(period, { sessions: input.sessions, bookings: input.bookings, teachers: input.teachers, specials: input.specials, spaceBookings: input.spaceBookings, rateCard: input.rateCard })
      : historicLines(period, input.templates, input.teachers, input.rateCard);

    // Finance's own lines: a full-month bonus on the settled run and one correction on the approved run.
    if (offset === 2 && draft.length) {
      const top = [...new Set(draft.map((l) => l.teacher_id))][0];
      draft.push({ teacher_id: top, class_session_id: null, special_charge_id: null, kind: 'bonus', rate: 0, amount: 150000, attendees: null, note: 'Bono por cubrir dos reemplazos' });
    }
    if (offset === 1 && draft.length) {
      const someone = [...new Set(draft.map((l) => l.teacher_id))].slice(-1)[0];
      draft.push({ teacher_id: someone, class_session_id: null, special_charge_id: null, kind: 'adjustment', rate: 0, amount: -80000, attendees: null, note: 'Ajuste: clase cobrada dos veces en la corrida anterior' });
    }

    const closes = addDays(fromDateKey(period.end), 5);
    runs.push({
      ...base(id, (offset + 1) * 30),
      period_start: period.start,
      period_end: period.end,
      status,
      total: runTotal(draft),
      method: offset === 2 ? 'transfer' : 'wompi',
      approved_by: status === 'draft' ? null : 'usr_fin',
      approved_at: status === 'draft' ? null : iso(closes),
      paid_at: status === 'paid' ? iso(closes) : null,
      provider_ref: null,
      notes: status === 'paid' ? 'Pagada por transferencia desde la cuenta del estudio.' : status === 'approved' ? 'Aprobada; pendiente de dispersar.' : 'Borrador generado automáticamente de las clases cerradas.',
    } as PayrollRunRow);

    draft.forEach((l, i) => lines.push({
      ...base(`pyl_${id}_${i}`, (offset + 1) * 30),
      run_id: id,
      teacher_id: l.teacher_id,
      class_session_id: l.class_session_id,
      special_charge_id: l.special_charge_id,
      kind: l.kind,
      rate: l.rate,
      amount: l.amount,
      attendees: l.attendees,
      // A paid run is paid teacher by teacher, so every line of it carries the settlement stamp.
      paid_at: status === 'paid' ? iso(closes) : null,
      paid_method: status === 'paid' ? (offset === 2 ? 'transfer' : 'wompi') : null,
      note: l.note,
    } as PayrollLineRow));
  }
  return { runs, lines };
}
