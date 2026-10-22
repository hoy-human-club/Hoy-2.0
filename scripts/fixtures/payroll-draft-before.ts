// Historical regression fixture copied from6628c0a useGenerateDraft. Never imported by production.
import {useCallback} from 'react';
import {useData,useTable} from '../../data/DataContext';
import type {BookingRow,ClassSessionRow,PayrollLineRow,PayrollRunRow,SpaceBookingRow,SpecialChargeRow,TeacherRow} from '../../data/schema';
import {draftLinesFor,periodsOverlap,runTotal,type RateCard,type Period} from '../../data/payrollCalc';
import {useSettings} from './settings';
import type {PayoutMethod} from './payouts';
export function useGenerateDraft() {
  const data = useData();
  const { settings } = useSettings();
  const rateCard: RateCard = settings.payroll.rateCard;
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions');
  const { rows: bookings } = useTable<BookingRow>('bookings');
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  const { rows: runs } = useTable<PayrollRunRow>('payroll_runs');
  const { rows: lines } = useTable<PayrollLineRow>('payroll_lines');
  const { rows: specials } = useTable<SpecialChargeRow>('special_charges');
  const { rows: spaceBookings } = useTable<SpaceBookingRow>('space_bookings');

  return useCallback(async (period: Period, method: PayoutMethod = 'wompi'): Promise<{ run: PayrollRunRow; created: number; replaced: boolean; replacedOverlap: boolean } | { blocked: PayrollRunRow }> => {
    const existing = runs.find((r) => r.period_start === period.start && r.period_end === period.end);
    if (existing && existing.status !== 'draft') return { blocked: existing };
    // 0018: a run of the OTHER cadence covering these days (a monthly draft when the switch is now biweekly, or the
    // reverse) would pay the same classes twice. A draft is replaced; an approved or paid one blocks the generation.
    const overlapping = runs.filter((r) => r.id !== existing?.id && periodsOverlap({ start: r.period_start, end: r.period_end }, period));
    const hard = overlapping.find((r) => r.status !== 'draft');
    if (hard) return { blocked: hard };
    for (const r of overlapping) {
      for (const l of lines.filter((l) => l.run_id === r.id)) await data.remove('payroll_lines', l.id);
      await data.remove('payroll_runs', r.id);
    }

    const draft = draftLinesFor(period, { sessions, bookings, teachers, specials, spaceBookings, rateCard });
    const total = runTotal(draft);
    let run: PayrollRunRow;
    if (existing) {
      for (const l of lines.filter((l) => l.run_id === existing.id)) await data.remove('payroll_lines', l.id);
      run = await data.update<PayrollRunRow>('payroll_runs', existing.id, { total, method });
    } else {
      run = await data.insert<PayrollRunRow>('payroll_runs', {
        period_start: period.start, period_end: period.end, status: 'draft', total, method,
        approved_by: null, approved_at: null, paid_at: null, provider_ref: null, notes: null,
      } as Partial<PayrollRunRow>);
    }
    for (const l of draft) await data.insert('payroll_lines', { ...l, run_id: run.id });
    return { run, created: draft.length, replaced: !!existing, replacedOverlap: overlapping.length > 0 };
  }, [data, runs, lines, sessions, bookings, teachers, specials, spaceBookings, rateCard]);
}

