import type { DataProvider } from './types';
import type { PaymentRow } from './schema';
import { readPaymentQuote } from './operationalQuotes';
import { tenant } from '../tenant/tenant';
import type { Bi } from '../specs/types';

export interface LaunchReceipt {
  version: 1;
  kind: 'fictional-payment-receipt';
  reference: string;
  source: 'checkout' | 'transfer-review' | 'desk-sale' | 'desk-settlement';
  facts: ReturnType<typeof receiptFacts>;
  item: Bi | null;
  recordedTax: { subtotal: number; tax: number; total: number } | null;
  previewChannels: ('email' | 'whatsapp')[];
  delivery: 'preview-only';
}
const sources = ['checkout', 'transfer-review', 'desk-sale', 'desk-settlement'];
const methods = ['card', 'pse', 'qr', 'cash', 'transfer'];
const money = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) >= 0;
export const receiptReference = (id: string) => `DEMO-RECEIPT-${id}`;
function receiptFacts(p: PaymentRow) {
  return { paymentId: p.id, tenantId: p.tenant_id, customerId: p.user_id, planId: p.plan_id,
    amountCharged: p.amount, amountReceived: p.amount_paid, currency: p.currency, method: p.method,
    provider: p.provider, confirmedAt: p.paid_at, recordedBy: p.taken_by ?? null, quote: readPaymentQuote(p) };
}
/** Missing legacy snapshots stay missing; never synthesize a receipt from today's catalog or an invoice. */
export function readLaunchReceipt(payment: PaymentRow): LaunchReceipt | null {
  const r = payment.frontend_receipt;
  if (!r || r.version !== 1 || r.kind !== 'fictional-payment-receipt' || !sources.includes(r.source)
    || r.reference !== receiptReference(payment.id) || r.delivery !== 'preview-only'
    || payment.status !== 'approved' || payment.tenant_id !== tenant.id || payment.currency !== 'COP'
    || !methods.includes(payment.method) || !['manual', 'wompi'].includes(payment.provider)
    || !money(payment.amount) || !money(payment.amount_paid) || !payment.paid_at || !Number.isFinite(Date.parse(payment.paid_at))
    || payment.frontend_quote && !readPaymentQuote(payment)
    || JSON.stringify(r.facts) !== JSON.stringify(receiptFacts(payment))
    || !Array.isArray(r.previewChannels) || r.previewChannels.some(c => !['email', 'whatsapp'].includes(c))
    || r.item !== null && (!r.item || typeof r.item.es !== 'string' || typeof r.item.en !== 'string')
    || r.recordedTax !== null && (!r.recordedTax || !money(r.recordedTax.subtotal) || !money(r.recordedTax.tax) || r.recordedTax.total !== payment.amount || r.recordedTax.subtotal + r.recordedTax.tax !== r.recordedTax.total)) return null;
  return structuredClone(r);
}
/** Call only with the staged provider of the existing purchase/review transaction. No invoice or outbox. */
export async function captureLaunchReceipt(data: DataProvider, payment: PaymentRow, options: {
  source: LaunchReceipt['source']; item?: Bi; recordedTax?: LaunchReceipt['recordedTax']; previewChannels?: LaunchReceipt['previewChannels'];
}): Promise<PaymentRow> {
  if (data.name !== 'mock') throw Error('receipt_disconnected');
  const current = await data.get<PaymentRow>('payments', payment.id);
  if (!current || current.id !== payment.id || current.tenant_id !== tenant.id || current.status !== 'approved') throw Error('receipt_payment_scope');
  if (current.frontend_receipt) {
    const saved = readLaunchReceipt(current);
    if (!saved || saved.source !== options.source || options.item && JSON.stringify(saved.item) !== JSON.stringify(options.item) || options.recordedTax && JSON.stringify(saved.recordedTax) !== JSON.stringify(options.recordedTax) || options.previewChannels && JSON.stringify([...saved.previewChannels].sort()) !== JSON.stringify([...new Set(options.previewChannels)].sort())) throw Error('receipt_conflict');
    return current;
  }
  const quote = readPaymentQuote(current);
  const receipt: LaunchReceipt = {
    version: 1, kind: 'fictional-payment-receipt', reference: receiptReference(current.id), source: options.source,
    facts: receiptFacts(current), item: structuredClone(options.item ?? quote?.name ?? null),
    recordedTax: structuredClone(options.recordedTax ?? quote?.taxTotals ?? null),
    previewChannels: [...new Set(options.previewChannels ?? ['email' as const])], delivery: 'preview-only',
  };
  if (!readLaunchReceipt({ ...current, frontend_receipt: receipt })) throw Error('receipt_facts');
  return data.update<PaymentRow>('payments', current.id, { frontend_receipt: receipt });
}
