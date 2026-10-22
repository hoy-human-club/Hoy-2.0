/**
 * M-09c — the studio's expenses ledger, and the third leg of the M-09 balance
 * (Ingresos − Nómina − Gastos).
 *
 * Money out that is not teacher pay lives here: `expense_templates` are the recurring fixed costs
 * (rent, utilities, cleaning by the quincena…), `expenses` are the rows — fixed ones generated from
 * a template through `src/data/expenseCalc.ts`, variable ones typed by finance. Neither is a
 * `payments` row, for the same reason a payout is not one: `payments` is money in.
 */
import { useMemo } from 'react';
import { useTable } from '../../data/DataContext';
import type { ExpenseRow, ExpenseTemplateRow, PayrollRunRow } from '../../data/schema';
import { dateKey, addDays } from '../../i18n/format';

/** The same five ranges M-09 uses, so the two pages always describe the same window. */
export type FinanceRange = '7d' | '15d' | '30d' | '90d' | 'all';
export const FINANCE_RANGES: FinanceRange[] = ['7d', '15d', '30d', '90d', 'all'];

/** Date-only lower bound of a range (inclusive); '' for all time. */
export function sinceDay(range: FinanceRange, now = new Date()): string {
  if (range === 'all') return '';
  const d = addDays(now, -Number(range.replace('d', '')));
  return dateKey(d);
}

export const inRange = (day: string, since: string) => !since || day >= since;

/** Templates and rows, newest first — the join both M-09 and M-09c need. */
export function useExpenses() {
  const { rows: templates, loading: tLoading } = useTable<ExpenseTemplateRow>('expense_templates', { orderBy: { column: 'anchor_day', dir: 'asc' } });
  const { rows: expenses, loading } = useTable<ExpenseRow>('expenses', { orderBy: { column: 'incurred_on', dir: 'desc' } });
  const templateById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);
  return { templates, expenses, templateById, loading: loading || tLoading };
}

/** Totals of a set of expense rows, the four tiles of M-09c and the "Gastos" tile of the balance. */
export function expenseTotals(rows: ExpenseRow[]) {
  const sum = (xs: ExpenseRow[]) => xs.reduce((a, r) => a + r.amount, 0);
  const fixed = rows.filter((r) => r.kind === 'fixed');
  const variable = rows.filter((r) => r.kind === 'variable');
  const paid = rows.filter((r) => !!r.paid_on);
  const unpaid = rows.filter((r) => !r.paid_on);
  return { total: sum(rows), fixed: sum(fixed), variable: sum(variable), paid: sum(paid), unpaid: sum(unpaid), counts: { all: rows.length, fixed: fixed.length, variable: variable.length, paid: paid.length, unpaid: unpaid.length } };
}

/**
 * Payroll cost of a range for the balance: every run whose period overlaps the window, at its
 * current total (a draft is a committed cost — the classes were taught). Runs are monthly, so a
 * 7-day range still shows the month it sits in rather than a misleading zero.
 */
export function payrollInRange(runs: PayrollRunRow[], since: string, today = dateKey(new Date())) {
  return runs.filter((r) => r.period_start <= today && (!since || r.period_end >= since));
}
