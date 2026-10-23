import type { DataProvider } from '../../data/types';
import type { BaseRow, ClassLedgerRow, PaymentRow, UserRow } from '../../data/schema';
import { readPaymentQuote } from '../../data/operationalQuotes';
import { assertTrialAvailable } from '../../data/trialEligibility';
import { dateKey } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';

export const DESK_METHODS = ['cash', 'card', 'transfer'] as const;
export type DeskMethod = typeof DESK_METHODS[number];
export interface DeskSettlement { paymentId: string; actorId: string; role: string; method: DeskMethod; amount: number; note: string }
const roles = ['super_admin', 'admin', 'front_desk'];

/** Only receipt-free pending desk requests with retained, supported terms can be fulfilled here. */
export function canSettleAtDesk(payment: PaymentRow | null): boolean {
  const quote = payment && readPaymentQuote(payment);
  return !!payment && payment.tenant_id === tenant.id && payment.status === 'pending' && payment.provider === 'manual'
    && payment.method === 'cash' && !!payment.user_id && !!quote && quote.kind === 'class' && quote.quantity === 1 && quote.entitlementExpiresAt !== null;
}

/** Browser-only command. Never authorizes a bank transfer, sends email, invoices, or invents a booking. */
export async function settleAtDesk(data: DataProvider, command: DeskSettlement, cancelled: () => boolean = () => false): Promise<PaymentRow> {
  const input = { ...command, note: command.note.trim() };
  const check = () => { if (cancelled()) throw Error('cancelled'); };
  check();
  if (data.name !== 'mock' || !data.atomic) throw Error('disconnected');
  if (!roles.includes(input.role) || !input.actorId) throw Error('forbidden');
  if (!DESK_METHODS.includes(input.method) || !Number.isSafeInteger(input.amount) || input.amount < 1 || !input.note || input.note.length > 500) throw Error('invalid');
  const fingerprint = JSON.stringify([input.paymentId, input.actorId, input.role, input.method, input.amount, input.note]), auditId = `desk-settlement:${input.paymentId}`;
  return data.atomic(async tx => {
    check();
    const [payment, actor] = await Promise.all([
      tx.get<PaymentRow>('payments', input.paymentId), tx.get<UserRow>('users', input.actorId),
    ]);
    check();
    if (!actor || actor.tenant_id !== tenant.id || actor.status !== 'active') throw Error('actor_scope');
    if (!payment || payment.tenant_id !== tenant.id) throw Error('payment_scope');
    const previous = await tx.get<BaseRow>('audit_log', auditId); check();
    // Reconcile a committed but unacknowledged operation before assessing current eligibility or dates.
    if (previous) {
      const diff = previous.diff as { fingerprint?: string } | null;
      if (previous.tenant_id !== tenant.id || previous.entity !== 'payments' || previous.entity_id !== payment.id || previous.actor_id !== input.actorId
        || previous.action !== 'payment.desk.approved' || diff?.fingerprint !== fingerprint || payment.status !== 'approved' || payment.provider !== 'manual'
        || payment.taken_by !== input.actorId || payment.amount !== input.amount || payment.amount_paid !== input.amount || payment.method !== input.method || payment.note !== input.note) throw Error('settlement_conflict');
      return payment;
    }
    if (!canSettleAtDesk(payment) || input.amount !== payment.amount) throw Error('payment_state');
    const quote = readPaymentQuote(payment)!;
    // Preserve purchased validity; do not revive expired packages or infer new terms from today's catalog.
    if (quote.entitlementExpiresAt && quote.entitlementExpiresAt < dateKey(new Date())) throw Error('terms_expired');
    const [customer, receipts, grants] = await Promise.all([
      tx.get<UserRow>('users', payment.user_id!),
      tx.list('transfer_receipts', { where: { tenant_id: tenant.id, payment_id: payment.id } }),
      tx.list<ClassLedgerRow>('class_ledger', { where: { tenant_id: tenant.id, payment_id: payment.id } }),
    ]); check();
    if (!customer || customer.tenant_id !== tenant.id || customer.status !== 'active' || receipts.length || grants.length) throw Error('fulfillment_scope');
    if (quote.itemId === 'trial') { await assertTrialAvailable(tx, payment.user_id!, payment.id); check(); }
    const approved = await tx.update<PaymentRow>('payments', payment.id, {
      status: 'approved', amount_paid: input.amount, method: input.method, taken_by: input.actorId,
      note: input.note, paid_at: new Date().toISOString(),
    }); check();
    await tx.insert<ClassLedgerRow>('class_ledger', {
      user_id: payment.user_id!, plan_id: payment.plan_id, payment_id: payment.id, frontend_quote: structuredClone(quote),
      delta: quote.classes, reason: 'purchase', expires_at: quote.entitlementExpiresAt, frozen_from: null, frozen_until: null,
    }); check();
    await tx.insert('audit_log', {
      id: auditId, actor_id: input.actorId, action: 'payment.desk.approved', entity: 'payments', entity_id: payment.id, ip: null,
      diff: { source: 'fictional-desk-settlement', role: input.role, fingerprint, receiptDelivery: 'disconnected', booking: 'no-retained-booking-intent' },
    }); check();
    return approved;
  });
}
