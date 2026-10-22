/**
 * ============================================================================
 * INTEGRATION SEAM — Wompi (payments, Colombia)
 * ============================================================================
 * Everything the customer app knows about charging money goes through this file.
 * Today it is a simulator: `wompiCheckout` resolves after a short delay with an
 * approved (or, on request, declined) result and a fake reference. When Wompi is
 * wired, replace the body of `wompiCheckout` with the Wompi Widget/Checkout call
 * (`https://checkout.wompi.co/p/?public-key=…&currency=COP&amount-in-cents=…&reference=…`)
 * and resolve from the redirect / webhook. Pages and the `payments` table do not change.
 *
 * 0051 — the verified methods: online, card on the website, a Wompi QR code or PSE (all through Wompi); at the front
 * desk, cash and the desk's other methods. No Nequi, no Daviplata. Cash never touches Wompi: it creates a `payments`
 * row with provider 'manual' and status 'pending' that the front desk settles (S-04).
 */
import { assertTrialAvailable } from '../../data/trialEligibility';
export { assertTrialAvailable } from '../../data/trialEligibility';
import { checkSaleQuote, readPaymentQuote, type FrozenSaleQuote } from '../../data/operationalQuotes';
import type { DataProvider } from '../../data/types';
import type { ClassLedgerRow, PaymentRow } from '../../data/schema';
import { splitIva } from '../../data/tax';
import { tenant } from '../../tenant/tenant';
import type { IconName } from '../../components/atom/Icon/Icon';

export type ElectronicMethod = 'card' | 'pse' | 'qr';
export type ManualMethod = 'transfer' | 'cash';
export type PayMethod = ElectronicMethod | ManualMethod;
/** A QR code is scanned each time; only a card or a PSE bank can be saved (C-05). */
export type SavableMethod = 'card' | 'pse';

export interface WompiResult { status: 'approved' | 'declined'; ref: string; reason?: { es: string; en: string } }

export interface PaymentMethodOption {
  id: PayMethod;
  provider: 'wompi' | 'manual';
  label: { es: string; en: string };
  hint: { es: string; en: string };
  glyph: IconName;
}

/** The methods a member sees (C-04, C-05), in display order: the three online ones, then cash at the front desk. */
export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'card', provider: 'wompi', label: { es: 'Tarjeta', en: 'Card' }, hint: { es: 'Crédito o débito · vía Wompi', en: 'Credit or debit · via Wompi' }, glyph: 'credit-card' },
  { id: 'pse', provider: 'wompi', label: { es: 'PSE', en: 'PSE' }, hint: { es: 'Débito desde tu banco · vía Wompi', en: 'Bank debit · via Wompi' }, glyph: 'bank' },
  { id: 'qr', provider: 'wompi', label: { es: 'Código QR', en: 'QR code' }, hint: { es: 'Escanea el QR de Wompi con la app de tu banco', en: 'Scan the Wompi QR with your bank app' }, glyph: 'qr' },
  { id: 'cash', provider: 'manual', label: { es: 'En recepción', en: 'At the front desk' }, hint: { es: 'Solicitud demo · requiere confirmación; sin cupo retenido', en: 'Demo request · confirmation required; no spot held' }, glyph: 'cash' },
];

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** A fake provider reference (`wmp_3F9KQ2`) for the simulated Wompi flows; MockProvider ids are a different thing. */
export const fakeRef = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const ref = () => fakeRef('wmp');

export const DECLINE_REASONS: Record<string, { es: string; en: string }> = {
  insufficient_funds: { es: 'El banco respondió: fondos insuficientes.', en: 'The bank replied: insufficient funds.' },
  do_not_honor: { es: 'El banco no autorizó la transacción.', en: 'The bank did not authorise the transaction.' },
};

/** Simulated Wompi checkout. `simulate: 'declined'` forces the E-02 path for testing. */
export async function wompiCheckout(input: { amount: number; method: ElectronicMethod; simulate?: 'approved' | 'declined' }): Promise<WompiResult> {
  await wait(900);
  if (input.simulate === 'declined') return { status: 'declined', ref: ref(), reason: DECLINE_REASONS.insufficient_funds };
  return { status: 'approved', ref: ref() };
}

/** Writes the payment (+ invoice on approval) the way the seed does, so history and admin agree. */
export async function recordPayment(data: DataProvider, input: { userId: string; planId: string | null; amount: number; method: PayMethod; result?: WompiResult; takenBy?: string | null; ivaRate: number; quote?: FrozenSaleQuote }): Promise<PaymentRow> {
  if(input.quote){await checkSaleQuote(data,input.quote);if(input.quote.planId!==input.planId||input.quote.chargedAmount!==input.amount)throw Error('quote_scope');}
  const manual = input.method === 'transfer' || input.method === 'cash';
  const status = manual ? 'pending' : input.result?.status === 'approved' ? 'approved' : 'declined';
  if(input.planId==='plan_trial'&&status!=='declined')await assertTrialAvailable(data,input.userId);
  const now = new Date().toISOString();
  const payment = await data.insert<PaymentRow>('payments', {
    ...(input.quote?{frontend_quote:structuredClone(input.quote)}:{}), user_id: input.userId, plan_id: input.planId, amount: input.amount, amount_paid: status === 'approved' ? input.amount : null, note: null, currency: 'COP', method: input.method,
    provider: manual ? 'manual' : 'wompi', provider_ref: input.result?.ref ?? null, status, paid_at: status === 'approved' ? now : null, taken_by: input.takenBy ?? null,
  } as Partial<PaymentRow>);
  if (status === 'approved') {
    const { subtotal, tax } = splitIva(input.amount, input.ivaRate);
    await data.insert('invoices', { payment_id: payment.id, number: `${tenant.invoicePrefix}-${Date.now().toString().slice(-6)}`, subtotal, tax, total: input.amount, issued_at: now, pdf_url: null, dian_cufe: null });
  }
  if (data.name === 'mock') await data.insert('audit_log', { actor_id: input.takenBy ?? input.userId, action: `payment.mock.${status}`, entity: 'payments', entity_id: payment.id, ip: null,
    diff: { source: 'fictional-payment-checkout', simulated: true, method: input.method, status } });
  return payment;
}

/**
 * INTEGRATION SEAM — Wompi tokenisation (C-05 "save this method").
 * Today it fabricates a demo reference so `payment_methods.token_ref` is never a real token.
 * With Wompi live, the widget returns `tokenized_card.token` (or the PSE mandate) and this
 * function resolves with it; the row shape and every page stay the same.
 */
export async function wompiTokenise(input: { kind: SavableMethod }): Promise<{ tokenRef: string; brand: string; last4: string | null; expires: string | null }> {
  await wait(700);
  const n = Math.random().toString().slice(2, 6);
  if (input.kind === 'card') return { tokenRef: `tok_demo_${n}${n}`, brand: Math.random() < 0.5 ? 'Visa' : 'Mastercard', last4: n, expires: '12/29' };
  return { tokenRef: `tok_demo_pse_${n}`, brand: 'Bancolombia', last4: null, expires: null };
}

/** Activate a confirmed package exactly once. Call inside data.atomic with the payment/booking writes.
 * Existing purchase rows retain their stored quantity and expiry when this command is replayed.
 */
export async function activatePaidPackage(data: DataProvider, input: { paymentId: string; userId: string; planId: string; classes: number; expiresAt: string|null }): Promise<ClassLedgerRow | null> {
  const payment = await data.get<PaymentRow>('payments', input.paymentId);
  if (!payment || payment.user_id !== input.userId || payment.plan_id !== input.planId) throw new Error('payment_scope_invalid');
  if (payment.status !== 'approved') return null;
  const existing = (await data.list<ClassLedgerRow>('class_ledger', { where: { payment_id: payment.id, reason: 'purchase' } }))[0];
  if (existing) return existing;
  const frozen=readPaymentQuote(payment);
  if(payment.frontend_quote&&!frozen)throw Error('quote_scope');
  if(frozen&&(frozen.kind!=='class'||frozen.quantity!==1))throw Error('quote_scope');
  const classes=frozen?.classes??input.classes,expiresAt=frozen?frozen.entitlementExpiresAt:input.expiresAt;
  if (!Number.isInteger(classes) || classes < 1) throw new Error('package_quantity_invalid');
  return data.insert<ClassLedgerRow>('class_ledger', { user_id: input.userId, plan_id: input.planId, payment_id: payment.id, ...(frozen?{frontend_quote:structuredClone(frozen)}:{}), delta: classes, reason: 'purchase', expires_at: expiresAt, frozen_from: null, frozen_until: null });
}
