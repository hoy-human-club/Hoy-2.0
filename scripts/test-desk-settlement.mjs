// PG-07/09: isolated fictional MockProvider; no bank, account permissions or messages.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'hoy-desk-settlement-')), values = new Map();
let failStorage = false;
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => { if (failStorage) throw Error('quota'); values.set(k, v); } };
try {
  const out = join(dir, 'test.mjs');
  await build({ stdin: { contents: "export {MockProvider} from './src/data/MockProvider';export * from './src/modules/transfers/deskSettlement';export * from './src/modules/transfers/paymentWindows';export {freezeSaleQuote,resolveOperationalQuote} from './src/data/operationalQuotes';", resolveDir: process.cwd() }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' });
  const { MockProvider, settleAtDesk, canSettleAtDesk, resolveOperationalQuote, freezeSaleQuote, paymentWindow } = await import(pathToFileURL(out));
  const start = '2026-10-23T12:00:00Z', stamp = Date.parse(start), proposed = { transferMinutes: 15, frontDeskMinutes: 60 };
  // Hypothetical test values only; neither duration is an approved app default.
  assert.equal(paymentWindow(start, 'transfer').state, 'unresolved'); assert.equal(paymentWindow(start, 'frontDesk').state, 'unresolved');
  for (const [method, minutes] of [['transfer', 15], ['frontDesk', 60]]) {
    assert.equal(paymentWindow(start, method, proposed, stamp + minutes * 60_000 - 1).remainingMs, 1);
    assert.equal(paymentWindow(start, method, proposed, stamp + minutes * 60_000).state, 'elapsed');
    assert.equal(paymentWindow(start, method, proposed, stamp + minutes * 60_000 + 1).remainingMs, 0);
  }
  assert.equal(paymentWindow(start, 'transfer', { transferMinutes: 20, frontDeskMinutes: null }, stamp).remainingMs, 20 * 60_000);
  assert.equal(paymentWindow('invalid', 'transfer', proposed, stamp).state, 'invalid');
  for (const value of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) assert.equal(paymentWindow(start, 'transfer', { ...proposed, transferMinutes: value }, stamp).state, 'invalid');
  const data = new MockProvider(), atomic = data.atomic.bind(data);
  const customer = await data.insert('users', { id: 'qa_desk_customer', email: 'fictional@example.invalid', status: 'active' });
  const quote = freezeSaleQuote(resolveOperationalQuote(data.peek('plans'), 'pack12'));
  async function request(id, patch = {}) {
    return data.insert('payments', { id, user_id: customer.id, plan_id: quote.planId, amount: quote.chargedAmount, amount_paid: null, currency: 'COP', method: 'cash', provider: 'manual', status: 'pending', paid_at: null, note: null, frontend_quote: quote, ...patch });
  }
  const cmd = id => ({ paymentId: id, actorId: 'usr_desk', role: 'front_desk', method: 'cash', amount: quote.chargedAmount, note: 'FICTIONAL collection' });
  const snapshot = () => JSON.stringify(['payments', 'class_ledger', 'bookings', 'invoices', 'audit_log'].map(table => data.peek(table)));
  await request('qa_pending');
  assert(canSettleAtDesk(await data.get('payments', 'qa_pending')));
  for (const patch of [{ role: 'finance' }, { role: 'customer' }, { amount: quote.chargedAmount - 1 }, { amount: quote.chargedAmount + 1 }, { amount: NaN }, { amount: 1.5 }, { amount: 0 }, { method: 'wompi' }, { note: ' ' }, { note: 'x'.repeat(501) }, { actorId: 'missing' }]) {
    const before = snapshot(); await assert.rejects(settleAtDesk(data, { ...cmd('qa_pending'), ...patch })); assert.equal(snapshot(), before);
  }
  await assert.rejects(settleAtDesk({ ...data, name: 'supabase' }, cmd('qa_pending')), /disconnected/);
  for (const failAfterWrites of [1, 2, 3]) {
    data.atomic = (action, options) => atomic(action, { ...options, failAfterWrites });
    const before = snapshot(); await assert.rejects(settleAtDesk(data, cmd('qa_pending')), /mock_injected/); assert.equal(snapshot(), before);
  }
  data.atomic = atomic;
  const beforeQuota = snapshot(); failStorage = true;
  await assert.rejects(settleAtDesk(data, cmd('qa_pending')), /quota/); failStorage = false; assert.equal(snapshot(), beforeQuota);
  const cancelledBefore = snapshot(); let calls = 0;
  await assert.rejects(settleAtDesk(data, cmd('qa_pending'), () => ++calls > 5), /cancelled/); assert.equal(snapshot(), cancelledBefore);
  const beforeBooking = JSON.stringify(data.peek('bookings')), beforeInvoice = JSON.stringify(data.peek('invoices'));
  // Repricing the live catalog must not change retained fulfillment terms.
  await data.update('plans', quote.planId, { price: 1, classes: 2, validity_days: 1 });
  const [a, b] = await Promise.all([settleAtDesk(data, cmd('qa_pending')), settleAtDesk(data, cmd('qa_pending'))]);
  assert.equal(a.id, b.id); assert.equal(a.status, 'approved'); assert.equal(a.taken_by, 'usr_desk'); assert.equal(a.amount_paid, quote.chargedAmount);
  assert.equal(data.peek('class_ledger').filter(r => r.payment_id === a.id).length, 1);
  const grant = data.peek('class_ledger').find(r => r.payment_id === a.id);
  assert.equal(grant.delta, quote.classes); assert.equal(grant.expires_at, quote.entitlementExpiresAt); assert.deepEqual(grant.frontend_quote, quote);
  assert.equal(data.peek('audit_log').filter(r => r.id === `desk-settlement:${a.id}`).length, 1);
  assert.equal(JSON.stringify(data.peek('bookings')), beforeBooking); assert.equal(JSON.stringify(data.peek('invoices')), beforeInvoice);
  const committed = snapshot(); await settleAtDesk(data, cmd('qa_pending')); assert.equal(snapshot(), committed);
  await assert.rejects(settleAtDesk(data, { ...cmd('qa_pending'), method: 'card' }), /settlement_conflict/); assert.equal(snapshot(), committed);
  // A lost acknowledgement replays the stored operation without a second grant/audit.
  await request('qa_uncertain'); data.atomic = async action => { await atomic(action); throw Error('lost_ack'); };
  await assert.rejects(settleAtDesk(data, cmd('qa_uncertain')), /lost_ack/); data.atomic = atomic;
  const uncertain = snapshot(); await settleAtDesk(data, cmd('qa_uncertain')); assert.equal(snapshot(), uncertain);
  for (const method of ['card', 'transfer']) {
    await request(`qa_${method}`); const result = await settleAtDesk(data, { ...cmd(`qa_${method}`), method, actorId: method === 'card' ? 'usr_admin' : 'usr_super', role: method === 'card' ? 'admin' : 'super_admin' }); assert.equal(result.method, method); assert.equal(result.provider, 'manual');
  }
  for (const [id, patch] of [['foreign', { tenant_id: 'other' }], ['no_quote', { frontend_quote: undefined }], ['online', { provider: 'wompi' }], ['receipt_method', { method: 'transfer' }], ['expired', { frontend_quote: { ...quote, entitlementExpiresAt: '2000-01-01' } }], ['no_expiry', { frontend_quote: { ...quote, entitlementExpiresAt: null } }], ['declined', { status: 'declined' }], ['no_customer', { user_id: null }]]) {
    await request(`qa_${id}`, patch); const before = snapshot(); await assert.rejects(settleAtDesk(data, cmd(`qa_${id}`))); assert.equal(snapshot(), before);
  }
  await request('qa_linked'); await data.insert('transfer_receipts', { id: 'qa_receipt', payment_id: 'qa_linked' });
  const linked = snapshot(); await assert.rejects(settleAtDesk(data, cmd('qa_linked')), /fulfillment_scope/); assert.equal(snapshot(), linked);
  const trialQuote = freezeSaleQuote(resolveOperationalQuote(data.peek('plans'), 'trial'));
  await request('qa_trial', { plan_id: 'plan_trial', amount: trialQuote.chargedAmount, frontend_quote: trialQuote });
  const trialBefore = snapshot(); await assert.rejects(settleAtDesk(data, { ...cmd('qa_trial'), amount: trialQuote.chargedAmount }), /trial_active_package/); assert.equal(snapshot(), trialBefore);
  const giftQuote = freezeSaleQuote(resolveOperationalQuote(data.peek('plans'), 'gift_pack12'));
  await request('qa_gift', { plan_id: giftQuote.planId, amount: giftQuote.chargedAmount, frontend_quote: giftQuote });
  const giftBefore = snapshot(); await assert.rejects(settleAtDesk(data, { ...cmd('qa_gift'), amount: giftQuote.chargedAmount }), /payment_state/); assert.equal(snapshot(), giftBefore, 'voucher-owned gift fulfillment stays separate');
  await request('qa_granted'); await data.insert('class_ledger', { id: 'qa_existing_grant', user_id: customer.id, payment_id: 'qa_granted', delta: quote.classes, reason: 'purchase', expires_at: quote.entitlementExpiresAt });
  const granted = snapshot(); await assert.rejects(settleAtDesk(data, cmd('qa_granted')), /fulfillment_scope/); assert.equal(snapshot(), granted);
  console.log('PASS desk settlement: cash/card-terminal/transfer, exact amount and note validation, denied roles/provider/tenant/customer/missing terms/expired terms/linked receipts, 3 write rollback points, quota rollback, cancellation, retained terms after repricing, concurrent replay, lost acknowledgement reconciliation, trial guard; no booking/invoice/message effects');
} finally { await rm(dir, { recursive: true, force: true }); }
