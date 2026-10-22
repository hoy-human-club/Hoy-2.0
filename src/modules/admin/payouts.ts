/**
 * ============================================================================
 * INTEGRATION SEAM — Wompi payouts (teacher payroll, Colombia)
 * ============================================================================
 * Everything the admin knows about paying teachers goes through this file, the way everything the
 * customer app knows about charging goes through src/modules/customer/payments.ts.
 *
 * `wompiPayout()` is a simulator today: it waits, then resolves with an accepted (or, on request,
 * rejected) dispersion and a fake reference. When Wompi's payout/dispersion API is wired, replace
 * its body with the real call and resolve from the webhook. Nothing else changes: the run row, the
 * lines, the statement and the audit entry are already the real shape.
 *
 * Transfer and cash never touch Wompi: finance marks the run paid and the reference is the bank's.
 *
 * Why a payout is not a `payments` row: `payments` is money IN from members (M-09's revenue, C-11's
 * history, M-01's KPIs all sum it). A payout is money OUT, so it lives on `payroll_runs`
 * (status / paid_at / method / provider_ref) with an `audit_log` entry per action. Mixing the two
 * would make every revenue number in the product wrong.
 */
import { useCallback, useMemo } from 'react';
import { useTable } from '../../data/DataContext';
import type { PayrollLineRow, PayrollRunRow, TeacherRow } from '../../data/schema';
import { byTeacher, isWholeMonth, monthPeriod, periodsFor, runTotal, type PayrollCadence, type Period } from '../../data/payrollCalc';
import type { Bi } from '../../specs/types';
import { formatDate, fromDateKey, studioParts, studioDate } from '../../i18n/format';
import { fakeRef } from '../customer/payments';
import { type Lang } from '../../i18n/types';

export type PayoutMethod = PayrollRunRow['method'];

export interface WompiPayoutResult { status: 'accepted' | 'rejected'; ref: string; reason?: Bi }

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const PAYOUT_REJECTIONS: Record<string, Bi> = {
  insufficient_balance: { es: 'Saldo insuficiente en la cuenta de dispersión.', en: 'Insufficient balance in the dispersion account.' },
  account_mismatch: { es: 'Una cuenta destino no coincide con el titular.', en: 'A destination account does not match its holder.' },
};

/** Simulated Wompi dispersion. `simulate: 'rejected'` exercises the failure path. */
export async function wompiPayout(input: { amount: number; recipients: number; simulate?: 'accepted' | 'rejected' }): Promise<WompiPayoutResult> {
  await wait(1100);
  const ref = fakeRef('wpo');
  if (input.simulate === 'rejected' || input.amount <= 0 || input.recipients === 0) {
    return { status: 'rejected', ref, reason: PAYOUT_REJECTIONS.insufficient_balance };
  }
  return { status: 'accepted', ref };
}

export const monthPeriodFor = (offset: number): Period => monthPeriod(studioDate(studioParts(new Date()).year, studioParts(new Date()).month - offset, 15));

/** The pay periods of the month `offset` months ago, under the M-08c cadence (one or two). 0018. */
export const periodsForMonth = (cadence: PayrollCadence, offset: number): Period[] =>
  periodsFor(cadence, studioDate(studioParts(new Date()).year, studioParts(new Date()).month - offset, 15));

/**
 * How a run's period is printed: “septiembre 2026” for a whole month, “1 – 15 sept 2026” for a
 * quincena. M-09a, M-09b and S-03 share it so the two cadences read the same everywhere.
 */
export function periodLabel(p: Period, lang: Lang): string {
  if (isWholeMonth(p)) return formatDate(p.start, lang, { month: 'long', year: 'numeric' });
  const a = fromDateKey(p.start), b = fromDateKey(p.end);
  return `${studioParts(a).day} – ${studioParts(b).day} ${formatDate(b, lang, { month: 'short', year: 'numeric' })}`;
}

/** Runs, lines and the teachers they name — the join every payout screen needs. */
export function usePayroll() {
  const { rows: runs, loading } = useTable<PayrollRunRow>('payroll_runs', { orderBy: { column: 'period_start', dir: 'desc' } });
  const { rows: lines } = useTable<PayrollLineRow>('payroll_lines');
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  const teacherName = useMemo(() => new Map(teachers.map((t) => [t.id, t.display_name])), [teachers]);
  const linesOf = useCallback((runId: string) => lines.filter((l) => l.run_id === runId), [lines]);
  return { runs, lines, teachers, teacherName, linesOf, loading };
}

export { usePayrollDraftAction as useGenerateDraft } from './usePayrollDraft';

/**
 * Per-teacher statement of a run: lines grouped, subtotal, class count and the settlement state,
 * because a run is paid teacher by teacher (one transfer bounces, the rest went out).
 */
export function statementOf(lines: PayrollLineRow[]) {
  return byTeacher(lines).map((g) => {
    const paid = g.lines.filter((l) => !!l.paid_at);
    return {
      ...g,
      classes: g.lines.filter((l) => l.kind === 'class').length,
      manual: g.lines.filter((l) => l.kind === 'manual').length,
      attendees: g.lines.reduce((a, l) => a + (l.attendees ?? 0), 0),
      extras: g.lines.filter((l) => l.kind !== 'class'),
      paidCount: paid.length,
      paidAt: paid[0]?.paid_at ?? null,
      paidMethod: paid[0]?.paid_method ?? null,
      settled: paid.length === g.lines.length && g.lines.length > 0,
    };
  });
}

export type TeacherStatement = ReturnType<typeof statementOf>[number];

/** Client-side CSV of a run, one row per line — what finance hands the accountant. */
export function payrollCsv(run: PayrollRunRow, lines: PayrollLineRow[], teacherName: Map<string, string>): string {
  const head = ['period_start', 'period_end', 'run_status', 'teacher', 'kind', 'class_session_id', 'special_charge_id', 'attendees', 'rate_cop', 'amount_cop', 'paid_at', 'paid_method', 'note'];
  const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = lines.map((l) => [run.period_start, run.period_end, run.status, teacherName.get(l.teacher_id) ?? l.teacher_id, l.kind, l.class_session_id ?? '', l.special_charge_id ?? '', l.attendees ?? '', l.rate, l.amount, l.paid_at ?? '', l.paid_method ?? '', l.note ?? '']);
  rows.push(['', '', '', 'TOTAL', '', '', '', '', '', String(run.total), '', '', '']);
  return [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

export function downloadCsv(name: string, csv: string) {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { monthPeriod, runTotal };
export type { Period };
