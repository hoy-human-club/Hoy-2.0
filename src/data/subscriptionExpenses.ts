import { fixedExpensesFor, type Period } from './expenseCalc';
import type { ExpenseRow } from './schema';
import type { Directory } from '../shared/subscriptions/model';
/** Adapter seam for future explicit ledger import. Pure preview; never writes or fabricates actual charges.
 * Non-COP, unknown amounts and every-14-day/yearly subscriptions cannot map to HOY's quincena templates.
 */
export function subscriptionExpensePreview(directory: Directory, period: Period, existing: Pick<ExpenseRow,'template_id'|'incurred_on'>[]) {
  const eligible = directory.subscriptions.filter(s=>s.status==='active' && s.currency==='COP' && s.interval==='monthly' && s.expectedAmount!==null && s.nextChargeDate);
  const templates = eligible.map(s=>({id:`subscription:${s.id}`,active:true,cadence:'monthly' as const,anchor_day:s.anchorDay,amount:s.expectedAmount!,category:'software' as const,concept:directory.dependencies.find(a=>a.id===s.dependencyId)?.product ?? s.id,vendor:directory.dependencies.find(a=>a.id===s.dependencyId)?.provider ?? null}));
  const result=fixedExpensesFor(period,templates,existing);
  return {...result,drafts:result.drafts.filter(d=>d.incurred_on >= eligible.find(s=>`subscription:${s.id}`===d.template_id)!.nextChargeDate!)};
}
