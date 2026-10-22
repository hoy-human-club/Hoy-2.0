import { dateKey, fromDateKey } from '../i18n/format';
import type { PaymentRow } from './schema';
import { reportCsv } from './reportCsv';
export interface PaymentReportRow { id: string; paidAt: string; day: string; method: string; productId: string; product: string; amount: number; amountReceived: number | null; confirmerId: string; confirmer: string }
export interface PaymentReport { error: 'invalid' | 'inverted' | null; rows: PaymentReportRow[]; skipped: number; total: number | null; csv: string }
export const PAYMENT_REPORT_COLUMNS = ['payment_id','paid_at','studio_date','method','product_id','product','amount_cop','amount_received_cop','confirmed_by_id','confirmed_by'];
export function validReportDay(day: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(day) && dateKey(fromDateKey(day)) === day; }
/** Read-only frontend projection. No settlement, date inference or currency conversion. */
export function confirmedPaymentReport(payments: PaymentRow[], options: { tenantId: string; from: string; to: string; productName: (id: string) => string; personName: (id: string) => string }): PaymentReport {
  const error = !validReportDay(options.from) || !validReportDay(options.to) ? 'invalid' : options.from > options.to ? 'inverted' : null;
  const rows: PaymentReportRow[] = []; let skipped = 0;
  if (!error) for (const p of payments) {
    if (p.tenant_id !== options.tenantId || p.status !== 'approved') continue;
    if (typeof p.paid_at !== 'string' || !validReportDay(p.paid_at.slice(0,10)) || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(p.paid_at) || !Number.isFinite(Date.parse(p.paid_at)) || p.currency !== 'COP' || !Number.isSafeInteger(p.amount) || p.amount < 0 || p.amount_paid != null && (!Number.isSafeInteger(p.amount_paid) || p.amount_paid < 0)) { skipped++; continue; }
    const day = dateKey(new Date(p.paid_at)); if (day < options.from || day > options.to) continue;
    const productId = p.plan_id ?? '', confirmerId = typeof p.taken_by === 'string' ? p.taken_by : '';
    rows.push({ id: p.id, paidAt: p.paid_at, day, method: p.method, productId, product: productId ? options.productName(productId) : '', amount: p.amount, amountReceived: p.amount_paid ?? null, confirmerId, confirmer: confirmerId ? options.personName(confirmerId) : '' });
  }
  rows.sort((a,b) => Date.parse(a.paidAt)-Date.parse(b.paidAt) || a.id.localeCompare(b.id));
  const total = rows.reduce((sum,r) => sum+r.amount,0);
  return { error, rows, skipped, total: Number.isSafeInteger(total) ? total : null, csv: reportCsv(PAYMENT_REPORT_COLUMNS, rows.map(r => [r.id,r.paidAt,r.day,r.method,r.productId,r.product,r.amount,r.amountReceived,r.confirmerId,r.confirmer])) };
}
