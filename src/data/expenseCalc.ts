/**
 * Studio expense arithmetic, with no React and no provider — so the seed (three months of fixed
 * costs) and M-09c "Generar gastos fijos del periodo" produce the same rows from the same rule, the
 * way `payrollCalc.ts` does for teacher pay.
 *
 * The rule: a recurring template falls due on `anchor_day` of every month; a `biweekly` template
 * also falls due 15 days later (the Colombian quincena). One due date inside the period = one
 * `expenses` row of kind 'fixed' pointing back at the template. A due date that already has a row
 * (same template, same day) is never generated twice, and a paid row is never touched.
 */
import type { ExpenseRow, ExpenseTemplateRow } from './schema';
import type { Period } from './payrollCalc';
import { fromDateKey, dateKey } from '../i18n/format';

export type { Period };

/** Every day a template falls due inside the period (date-only strings, sorted). */
export function dueDatesFor(t: Pick<ExpenseTemplateRow, 'cadence' | 'anchor_day'>, period: Period): string[] {
  const out: string[] = [];
  const first = fromDateKey(period.start);
  const end = fromDateKey(period.end);
  const day = Math.min(31, Math.max(1, t.anchor_day || 1));
  // Walk month by month from the month before the period (a biweekly second due date can cross in).
  for (let m = new Date(first.getFullYear(), first.getMonth() - 1, 1); m <= end; m.setMonth(m.getMonth() + 1)) {
    const lastDay = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const candidates = [new Date(m.getFullYear(), m.getMonth(), Math.min(day, lastDay))];
    if (t.cadence === 'biweekly') {
      const second = new Date(m.getFullYear(), m.getMonth(), day + 15);
      const lastOfMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      candidates.push(second > lastOfMonth ? lastOfMonth : second);
    }
    for (const c of candidates) {
      const d = dateKey(c);
      if (d >= period.start && d <= period.end && !out.includes(d)) out.push(d);
    }
  }
  return out.sort();
}

export interface FixedDraft {
  template_id: string;
  kind: 'fixed';
  category: ExpenseRow['category'];
  concept: string;
  amount: number;
  incurred_on: string;
  vendor: string | null;
}

/** The key that makes generation idempotent: one row per template per due day. */
const fixedKey = (templateId: string, incurredOn: string) => `${templateId}|${incurredOn}`;

/**
 * The fixed expenses a period owes, minus the ones that already exist. Deterministic: the same
 * templates and the same existing rows always give the same result, so pressing "generate" twice
 * adds nothing the second time.
 */
export function fixedExpensesFor(period: Period, templates: Pick<ExpenseTemplateRow, 'id' | 'active' | 'cadence' | 'anchor_day' | 'amount' | 'category' | 'concept' | 'vendor'>[], existing: Pick<ExpenseRow, 'template_id' | 'incurred_on'>[]): { drafts: FixedDraft[]; skipped: number } {
  const have = new Set(existing.filter((e) => e.template_id).map((e) => fixedKey(e.template_id as string, e.incurred_on)));
  const drafts: FixedDraft[] = [];
  let skipped = 0;
  for (const t of templates.filter((x) => x.active)) {
    for (const day of dueDatesFor(t, period)) {
      if (have.has(fixedKey(t.id, day))) { skipped++; continue; }
      have.add(fixedKey(t.id, day));
      drafts.push({ template_id: t.id, kind: 'fixed', category: t.category, concept: t.concept, amount: t.amount, incurred_on: day, vendor: t.vendor });
    }
  }
  drafts.sort((a, b) => a.incurred_on.localeCompare(b.incurred_on) || a.concept.localeCompare(b.concept));
  return { drafts, skipped };
}


/** What a template costs per calendar month — the number the templates table shows next to the cadence. */
export const monthlyCost = (t: Pick<ExpenseTemplateRow, 'cadence' | 'amount'>) => t.cadence === 'biweekly' ? t.amount * 2 : t.amount;
