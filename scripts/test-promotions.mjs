import { build } from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const scratch = await mkdtemp(join(tmpdir(), 'hoy-promotions-'));
try {
  const bundle = async name => { const file = join(scratch, `${name}.mjs`); await build({ entryPoints: [`src/data/${name}.ts`], bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent' }); return import(pathToFileURL(file)); };
  const { executePromotionCommand: run, parsePromotionCode, promotionShareUrl, publicPromotionPreview, ensureDemoPromotions } = await bundle('promotions');
  const { executeVoucherCommand: runVoucher } = await bundle('vouchers');
  const base = { tenant_id: 'tenant', created_at: '2026-10-14T12:00:00Z', updated_at: '2026-10-14T12:00:00Z' };
  let n = 0, request = 0;
  const context = { tenantId: 'tenant', now: '2026-10-14T12:00:00Z', id: () => `row-${++n}`, code: () => `AUTO-${++n}-CODE` };
  const newDb = () => {
    const db = { users: ['teacher', 'teacher2', 'admin', 'member', 'member2', 'member3', 'desk'].map(id => ({ ...base, id })), vouchers: [], voucher_bookings: [], voucher_events: [], bookings: [], class_sessions: [{ ...base, id: 'session', starts_at: '2026-10-15T12:00:00Z', ends_at: '2026-10-15T13:00:00Z', status: 'scheduled', capacity: 20, booked_count: 0 }] };
    ensureDemoPromotions(db, 'tenant', context.now); return db;
  };
  let db = newDb();
  const exec = command => { const result = run(db, { requestId: `request-${++request}`, actorId: 'teacher', role: 'teacher', ...command }, context); db = result.db; return result.result; };
  const voucher = command => { const result = runVoucher(db, { requestId: `voucher-${++request}`, actorId: 'desk', role: 'front_desk', ...command }, { ...context, usesMats: () => true }); db = result.db; return result.result; };
  const reject = (command, code, action = exec) => { const before = JSON.stringify(db); assert.throws(() => action(command), new RegExp(code)); assert.equal(JSON.stringify(db), before, `failure atomic: ${code}`); };
  const create = { type: 'create_share', campaignId: 'promo_demo_first' };
  for (const role of ['public', 'customer', 'front_desk', 'coordinator', 'finance', 'marketing', 'maintenance', 'developer']) reject({ ...create, role }, 'promotion_forbidden');
  reject({ ...create, actorId: 'missing' }, 'promotion_identity_required');
  reject({ ...create, customCode: '' }, 'promotion_code_invalid');
  reject({ ...create, customCode: 'invité' }, 'promotion_code_invalid');
  reject({ ...create, recipientLabel: 'x'.repeat(121) }, 'promotion_text_too_long');
  const share = exec({ ...create, requestId: 'create-once', customCode: 'Mixed-Code', recipientLabel: 'Fictional private recipient', privateContext: 'Fictional private context', message: 'Welcome to practice', benefitTotal: 999 }).share;
  assert.equal(share.code, 'MIXED-CODE');
  assert.equal(exec({ ...create, requestId: 'create-once', customCode: 'Mixed-Code', recipientLabel: 'Fictional private recipient', privateContext: 'Fictional private context', message: 'Welcome to practice', benefitTotal: 999 }).share.id, share.id);
  assert.equal(db.promotion_shares.length, 1);
  reject({ ...create, customCode: 'mixed-code' }, 'promotion_code_exists');
  reject({ ...create, requestId: 'create-once', actorId: 'teacher2' }, 'promotion_request_conflict');
  const other = exec({ ...create, actorId: 'teacher2' }).share;
  reject({ type: 'handoff', shareId: share.id, actorId: 'teacher2', channel: 'email' }, 'promotion_forbidden');
  for (const channel of ['copy', 'native', 'whatsapp', 'email']) {
    const event = exec({ type: 'handoff', shareId: share.id, channel }).event;
    assert.equal(event.payload.deliveryVerified, false); assert.equal(event.payload.deliveryStatus, channel === 'copy' ? 'copied' : 'handoff');
  }
  reject({ type: 'handoff', shareId: share.id, channel: 'sms' }, 'promotion_channel_invalid');
  const preview = publicPromotionPreview(db.promotion_campaigns[0], share);
  assert.equal(preview.message, 'Welcome to practice');
  assert.throws(() => publicPromotionPreview({ ...db.promotion_campaigns[0], published: false }, share), /promotion_not_found/);
  assert.throws(() => publicPromotionPreview({ ...db.promotion_campaigns[0], status: 'draft' }, share), /promotion_not_found/);
  assert.equal(publicPromotionPreview({ ...db.promotion_campaigns[0], status: 'paused' }, share).status, 'paused');
  assert.equal(preview.benefitTotal, 1);
  for (const privateKey of ['privateContext', 'recipientLabel', 'createdBy', 'approvedBy', 'claimedBy', 'recipientContact', 'referrerId', 'balance']) assert.equal(privateKey in preview, false, `${privateKey} omitted from public projection`);
  assert.equal(JSON.stringify(preview).includes('Fictional private'), false);
  const url = promotionShareUrl(share.code, 'https://studio.example/hoy/?private=secret#/old');
  assert.equal(url, 'https://studio.example/hoy/#/promotions/MIXED-CODE');
  assert.equal(parsePromotionCode(url, 'https://studio.example'), share.code);
  assert.equal(parsePromotionCode('  mixed-code  '), share.code);
  assert.equal(parsePromotionCode('https://studio.example/hoy/#/promotions/%4dIXED-CODE', 'https://studio.example'), share.code);
  for (const input of ['', 'A', 'A'.repeat(41), 'has spaces', '/promotions/MIXED-CODE', '#/promotions/MIXED-CODE', 'https://foreign.example/#/promotions/MIXED-CODE', 'https://studio.example/#/vouchers/MIXED-CODE', 'https://studio.example/#/promotions/MIXED-CODE?private=yes', 'https://studio.example/?secret=yes#/promotions/MIXED-CODE', 'https://user:pass@studio.example/#/promotions/MIXED-CODE', 'https://studio.example/#/promotions/FOO%2FBAR', 'https://studio.example/#/promotions/%254dIXED-CODE', 'https://studio.example/#/promotions/%', 'https://studio.example/#/promotions/%20CODE%20', 'https://studio.example/#/promotions/MIXED-CODE/extra']) assert.throws(() => parsePromotionCode(input, 'https://studio.example'), /promotion_code_invalid/, input);
  const claim = { type: 'claim_share', shareId: share.id, userId: 'member', actorId: 'member', role: 'customer' };
  reject({ ...claim, actorId: 'desk', role: 'front_desk' }, 'promotion_identity_required');
  reject({ ...claim, actorId: 'member2' }, 'promotion_identity_required');
  reject({ ...claim, actorId: 'teacher', role: 'teacher' }, 'promotion_identity_required');
  const claimed = exec({ ...claim, requestId: 'claim-once' });
  assert.equal(claimed.voucher.balance, 1); assert.equal(claimed.voucher.source, 'promotion_claim'); assert.equal(claimed.voucher.claimedBy, 'member');
  assert.equal(claimed.share, undefined, 'claim result never reveals sender private context');
  assert.equal(claimed.voucher.recipientName, ''); assert.equal(claimed.voucher.recipientContact, '');
  assert.equal(claimed.voucher.referrerId, 'teacher');
  const originalBenefit = db.promotion_campaigns[0].benefitTotal; db.promotion_campaigns[0].benefitTotal = 999;
  assert.equal(exec(claim).voucher.benefitTotal, originalBenefit, 'claimed benefit snapshot stays frozen'); db.promotion_campaigns[0].benefitTotal = originalBenefit;
  exec({ ...claim, requestId: 'claim-once' });
  const duplicate = exec({ ...claim, shareId: other.id });
  assert.equal(duplicate.voucher.id, claimed.voucher.id); assert.equal(duplicate.claim.shareId, share.id); assert.equal(duplicate.claim.referrerId, 'teacher');
  assert.equal(db.vouchers.length, 1); assert.equal(db.promotion_claims.length, 1); assert.equal(db.voucher_events.length, 1);
  const member2 = exec({ ...claim, userId: 'member2', actorId: 'member2' });
  assert.notEqual(member2.voucher.id, claimed.voucher.id); assert.notEqual(member2.voucher.code, claimed.voucher.code);
  // Shared code does not imply shared spendable balance.
  const book = { type: 'book', voucherId: claimed.voucher.id, sessionId: 'session', participants: [{ name: 'Fictional member', userId: 'member' }], contactConsent: true, verificationConfirmed: true };
  db.users.push({ ...base, id: 'foreign-desk', tenant_id: 'foreign' });
  for (const actorId of ['nonexistent', 'foreign-desk']) reject({ ...book, actorId }, 'voucher_identity_required', voucher);
  reject({ ...book, verificationConfirmed: false }, 'voucher_verification_required', voucher);
  reject({ ...book, verificationConfirmed: 'yes' }, 'voucher_verification_required', voucher);
  reject({ ...book, role: 'teacher' }, 'voucher_forbidden', voucher);
  const booked = voucher(book).booking;
  assert.equal(db.vouchers.find(v => v.id === claimed.voucher.id).balance, 0);
  assert.equal(db.vouchers.find(v => v.id === member2.voucher.id).balance, 1);
  assert.equal(booked.status, 'booked'); assert.equal(booked.confirmedAt, null);
  reject({ type: 'attendance', bookingId: booked.id }, 'voucher_confirmation_required', voucher);
  for (const actorId of ['nonexistent', 'foreign-desk']) {
    reject({ type: 'confirm_booking', bookingId: booked.id, verificationConfirmed: true, actorId }, 'voucher_identity_required', voucher);
    reject({ type: 'attendance', bookingId: booked.id, actorId }, 'voucher_identity_required', voucher);
  }
  reject({ type: 'confirm_booking', bookingId: booked.id, verificationConfirmed: false }, 'voucher_verification_required', voucher);
  reject({ type: 'confirm_booking', bookingId: booked.id, verificationConfirmed: true, actorId: 'member', role: 'customer' }, 'voucher_forbidden', voucher);
  const confirmation = voucher({ type: 'confirm_booking', bookingId: booked.id, verificationConfirmed: true, requestId: 'confirm-once' });
  assert.equal(confirmation.booking.status, 'booked'); assert.equal(confirmation.booking.confirmedBy, 'desk'); assert.equal(confirmation.voucher.balance, 0);
  voucher({ type: 'confirm_booking', bookingId: booked.id, verificationConfirmed: true, requestId: 'confirm-once' });
  voucher({ type: 'confirm_booking', bookingId: booked.id, verificationConfirmed: true, actorId: 'admin', role: 'admin' });
  assert.equal(db.voucher_bookings[0].confirmedBy, 'desk', 'original confirming staff is immutable');
  const beforeAttendance = db.vouchers.find(v => v.id === claimed.voucher.id).balance;
  voucher({ type: 'attendance', bookingId: booked.id, requestId: 'checkin-once' });
  voucher({ type: 'attendance', bookingId: booked.id, requestId: 'checkin-once' });
  assert.equal(db.vouchers.find(v => v.id === claimed.voucher.id).balance, beforeAttendance, 'attendance never debits again');
  reject({ type: 'attendance', bookingId: booked.id }, 'voucher_booking_final', voucher);
  reject({ type: 'cancel', bookingId: booked.id }, 'voucher_booking_final', voucher);
  const secondBooking = voucher({ ...book, voucherId: member2.voucher.id, participants: [{ name: 'Fictional member', userId: 'member2' }] }).booking;
  voucher({ type: 'cancel', bookingId: secondBooking.id, requestId: 'cancel-once' });
  voucher({ type: 'cancel', bookingId: secondBooking.id, requestId: 'cancel-once' });
  assert.equal(db.vouchers.find(v => v.id === member2.voucher.id).balance, 1);
  const lateBooking = voucher({ ...book, voucherId: member2.voucher.id, participants: [{ name: 'Fictional member', userId: 'member2' }] }).booking;
  voucher({ type: 'confirm_booking', bookingId: lateBooking.id, verificationConfirmed: true });
  db.class_sessions[0].starts_at = context.now;
  reject({ type: 'cancel', bookingId: lateBooking.id }, 'voucher_cancel_too_late', voucher);
  db.vouchers.find(v => v.id === member2.voucher.id).expiresAt = '2026-10-13T12:00:00Z';
  voucher({ type: 'attendance', bookingId: lateBooking.id }); // Existing booked attendance survives expiry and zero balance.
  reject({ ...book, voucherId: member2.voucher.id, participants: [{ name: 'Fictional member', userId: 'member2' }] }, 'voucher_unavailable', voucher);
  // Pausing affects new issuance, not existing claim access or attribution.
  reject({ type: 'set_campaign_status', campaignId: create.campaignId, status: 'paused' }, 'promotion_forbidden');
  exec({ type: 'set_campaign_status', campaignId: create.campaignId, status: 'paused', actorId: 'admin', role: 'admin' });
  reject(create, 'promotion_unavailable'); reject({ ...claim, actorId: 'member3', userId: 'member3' }, 'promotion_unavailable');
  assert.equal(exec(claim).voucher.id, claimed.voucher.id);
  exec({ type: 'set_campaign_status', campaignId: create.campaignId, status: 'approved', actorId: 'admin', role: 'admin' });
  db.promotion_campaigns[0].maxClaims = 2;
  reject({ ...claim, actorId: 'member3', userId: 'member3' }, 'promotion_claim_limit');
  assert.equal(exec(claim).voucher.id, claimed.voucher.id, 'claim limit never blocks existing claim access');
  for (const patch of [{ status: 'draft' }, { published: false }, { approvedBy: null }, { startsAt: '2027-01-01' }, { expiresAt: '2026-10-13' }, { expiresAt: 'invalid' }]) {
    const original = structuredClone(db.promotion_campaigns[0]); Object.assign(db.promotion_campaigns[0], patch); reject(create, 'promotion_unavailable'); db.promotion_campaigns[0] = original;
  }
  db.promotion_campaigns[0].status = 'draft';
  reject({ type: 'set_campaign_status', campaignId: create.campaignId, status: 'approved', actorId: 'admin', role: 'admin' }, 'promotion_unavailable');
  db.promotion_campaigns[0].status = 'approved';
  const foreign = { ...share, id: 'foreign-share', tenant_id: 'foreign' }; db.promotion_shares.push(foreign);
  reject({ ...claim, shareId: foreign.id }, 'promotion_not_found');
  db.users.push({ ...base, id: 'foreign-member', tenant_id: 'foreign' });
  reject({ ...claim, userId: 'foreign-member', actorId: 'foreign-member' }, 'promotion_identity_required');
  assert.throws(() => publicPromotionPreview(db.promotion_campaigns[0], foreign), /promotion_not_found/);
  // Collision injection must fail atomically, never fall back to a fixed inviter code.
  const collisionBefore = JSON.stringify(db);
  assert.throws(() => run(db, { ...create, requestId: 'collision', actorId: 'teacher', role: 'teacher' }, { ...context, code: () => share.code }), /promotion_code_exists/);
  assert.equal(JSON.stringify(db), collisionBefore);
  // Default generation uses secure randomness and does not repeat a fixed inviter code.
  const fresh = newDb();
  const secure1 = run(fresh, { ...create, requestId: 'secure1', actorId: 'teacher', role: 'teacher' }, { tenantId: 'tenant', now: context.now });
  const secure2 = run(secure1.db, { ...create, requestId: 'secure2', actorId: 'teacher', role: 'teacher' }, { tenantId: 'tenant', now: context.now });
  assert.match(secure1.result.share.code, /^DEMO-[A-F0-9]{20}$/); assert.notEqual(secure1.result.share.code, secure2.result.share.code);
  // Reception has one code input: shares and both voucher sources share its tenant-scoped namespace.
  const issue = { type: 'issue', requestId: 'namespace-issue', actorId: 'admin', role: 'admin', title: 'Namespace fixture', benefitKind: 'classes', benefitTotal: 1, participantCap: 1, capScope: 'per_booking', creditUnit: 'per_person', expiresAt: null, cancellationPolicy: 'restore' };
  const issued = runVoucher(newDb(), issue, context);
  const assertAtomicCollision = (state, action, code) => {
    const before = JSON.stringify(state); assert.throws(action, new RegExp(code)); assert.equal(JSON.stringify(state), before, 'code collision leaves no partial claim, voucher or audit');
  };
  assertAtomicCollision(issued.db, () => run(issued.db, { ...create, requestId: 'namespace-share', actorId: 'teacher', role: 'teacher', customCode: issued.result.voucher.code.toLowerCase() }, context), 'promotion_code_exists');
  const namespaceShare = run(issued.db, { ...create, requestId: 'namespace-share-ok', actorId: 'teacher', role: 'teacher', customCode: 'DEMO-COLLISIO' }, context);
  assert.equal(runVoucher(namespaceShare.db, issue, { ...context, id: () => 'collision-id' }).result.voucher.id, issued.result.voucher.id, 'replaying issuance does not attempt to reserve a second code');
  assertAtomicCollision(namespaceShare.db, () => runVoucher(namespaceShare.db, { ...issue, requestId: 'namespace-collision' }, { ...context, id: () => 'collision-id' }), 'voucher_code_exists');
  for (const table of ['vouchers', 'promotion_shares']) {
    const state = structuredClone(namespaceShare.db);
    const fixture = table === 'vouchers' ? issued.result.voucher : namespaceShare.result.share;
    state[table].push({ ...fixture, id: `reserved-${table}`, code: 'voucher-claimcollision' });
    assertAtomicCollision(state, () => run(state, { ...claim, shareId: namespaceShare.result.share.id, requestId: `namespace-claim-${table}` }, { ...context, id: () => 'claim-collision' }), 'voucher_code_exists');
  }
  const duplicateVoucher = structuredClone(issued.db);
  duplicateVoucher.vouchers[0].code = 'demo-collisio';
  assertAtomicCollision(duplicateVoucher, () => runVoucher(duplicateVoucher, { ...issue, requestId: 'namespace-voucher-duplicate' }, { ...context, id: () => 'collision-id' }), 'voucher_code_exists');
  const foreignNamespace = newDb();
  foreignNamespace.promotion_shares.push({ ...namespaceShare.result.share, tenant_id: 'foreign' });
  const tenantVoucher = runVoucher(foreignNamespace, issue, { ...context, id: () => 'collision-id' });
  assert.equal(tenantVoucher.result.voucher.code, 'DEMO-COLLISIO', 'another tenant cannot reserve this tenant’s code');
  const foreignVoucher = newDb(); foreignVoucher.vouchers.push({ ...issued.result.voucher, tenant_id: 'foreign' });
  assert.equal(run(foreignVoucher, { ...create, requestId: 'namespace-foreign-voucher', actorId: 'teacher', role: 'teacher', customCode: issued.result.voucher.code }, context).result.share.code, issued.result.voucher.code);
  // Separate scenario: foreign tenant rows cannot consume capacity or participant allowance.
  const savedState = db; db = newDb();
  const groupShare = exec({ type: 'create_share', campaignId: 'promo_demo_friends' }).share;
  const groupClaim = exec({ ...claim, shareId: groupShare.id });
  db.class_sessions[0].capacity = 2;
  db.bookings.push({ ...base, tenant_id: 'other', id: 'other-regular', session_id: 'session', user_id: 'member', status: 'booked', mat_number: 1 });
  db.voucher_bookings.push({ ...base, tenant_id: 'other', id: 'other-voucher-booking', voucherId: groupClaim.voucher.id, sessionId: 'session', participants: [{ name: 'Member', userId: 'member' }], status: 'booked', mats: [2], cost: 1, restored: false });
  const groupBooking = voucher({ ...book, voucherId: groupClaim.voucher.id, role: 'coordinator', participants: [{ name: 'Same name', userId: 'member' }, { name: 'Same name' }] });
  assert.deepEqual(groupBooking.booking.mats, [1, 2]); assert.equal(groupBooking.voucher.balance, 0);
  reject({ type: 'cancel', bookingId: groupBooking.booking.id, actorId: 'member2', role: 'customer' }, 'voucher_forbidden', voucher);
  reject({ type: 'attendance', bookingId: 'other-voucher-booking' }, 'voucher_booking_not_found', voucher);
  voucher({ type: 'cancel', bookingId: groupBooking.booking.id, role: 'coordinator' });
  assert.equal(db.class_sessions[0].booked_count, 0); assert.equal(db.vouchers[0].balance, 2);
  const owned = db.vouchers[0];
  for (const expiresAt of [context.now, 'invalid']) { const previous = owned.expiresAt; owned.expiresAt = expiresAt; reject({ ...book, voucherId: owned.id }, 'voucher_unavailable', voucher); owned.expiresAt = previous; }
  owned.expiresAt = db.class_sessions[0].starts_at;
  reject({ ...book, voucherId: owned.id }, 'session_unavailable', voucher);
  owned.expiresAt = null;
  const unclaimed = { ...owned, id: 'unclaimed', claimedBy: null, status: 'issued' }; db.vouchers.push(unclaimed);
  reject({ ...book, voucherId: unclaimed.id }, 'voucher_claim_required', voucher);
  reject({ type: 'claim', voucherId: unclaimed.id, userId: 'member' }, 'voucher_identity_required', voucher);
  voucher({ type: 'revoke', voucherId: owned.id, role: 'admin', actorId: 'admin' });
  reject({ ...book, voucherId: owned.id }, 'voucher_unavailable', voucher);
  const revokedClaim = exec({ ...claim, shareId: groupShare.id });
  assert.equal(revokedClaim.voucher.id, owned.id); assert.equal(revokedClaim.voucher.status, 'revoked'); assert.equal(db.promotion_claims.length, 1);
  db = savedState;
  // In-place seed upgrade preserves records and edits, including a paused campaign.
  const saved = JSON.stringify(db.vouchers); const paused = db.promotion_campaigns[0]; paused.status = 'paused';
  ensureDemoPromotions(db, 'tenant', context.now); assert.equal(JSON.stringify(db.vouchers), saved); assert.equal(db.promotion_campaigns.length, 2); assert.equal(db.promotion_campaigns[0].status, 'paused');
  const { MockProvider } = await bundle('MockProvider');
  const storage = new Map(); globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const provider = new MockProvider();
  const stored = JSON.parse(storage.get('hoyos.db.v1'));
  const sentinel = { ...base, tenant_id: stored.db.tenants[0].id, id: 'preserved-voucher', balance: 7 };
  stored.db.vouchers.push(sentinel);
  stored.db.teachers[0].photo_url = 'data:image/webp;base64,AA==';
  stored.db.class_templates[0].title = 'Preserved current Content edit';
  const paySentinel = { ...base, id: 'preserved-pay-rule', tenant_id: stored.db.tenants[0].id, template_id: stored.db.class_templates[0].id, session_id: null, basis: 'flat', flat_cop: 12345 };
  stored.db.class_pay_rules.push(paySentinel);
  for (const table of ['promotion_campaigns', 'promotion_shares', 'promotion_claims', 'promotion_events']) delete stored.db[table];
  storage.set('hoyos.db.v1', JSON.stringify(stored));
  const migrated = new MockProvider();
  assert.equal((await migrated.get('vouchers', sentinel.id)).balance, 7, 'same-day migration retains voucher balance');
  assert.equal((await migrated.list('promotion_campaigns')).length, 2);
  assert.equal((await migrated.list('teachers'))[0].photo_url, 'data:image/webp;base64,AA==');
  assert.equal((await migrated.list('class_templates'))[0].title, 'Preserved current Content edit');
  assert.equal((await migrated.get('class_pay_rules', paySentinel.id)).flat_cop, 12345);
  const beforeShares = await provider.list('promotion_shares'), beforeEvents = await provider.list('promotion_events');
  const previousSet = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => { throw new Error('quota'); };
  try { await assert.rejects(provider.promotion({ type: 'create_share', campaignId: 'promo_demo_first', actorId: 'usr_teach', role: 'teacher', requestId: 'quota-rejected' }), /quota/); } finally { globalThis.localStorage.setItem = previousSet; }
  assert.deepEqual(await provider.list('promotion_shares'), beforeShares, 'failed persistence rolls back share');
  assert.deepEqual(await provider.list('promotion_events'), beforeEvents, 'failed persistence rolls back audit');
  for (const table of ['promotion_campaigns', 'promotion_shares', 'promotion_claims', 'promotion_events']) {
    await assert.rejects(provider.insert(table, {}), /promotion_atomic_command_required/);
    await assert.rejects(provider.update(table, 'any', {}), /promotion_atomic_command_required/);
    await assert.rejects(provider.remove(table, 'any'), /promotion_atomic_command_required/);
  }
  const sql = await readFile('supabase/schema.sql', 'utf8');
  for (const table of ['promotion_campaigns', 'promotion_shares', 'promotion_claims', 'promotion_events']) assert.equal(sql.includes(`create policy "${table}:`), false, 'production tables default deny');
  assert.match(sql, /promotion_claim_user_campaign_unique/); assert.match(sql, /promotion_share_code_unique/);
  console.log('Promotion contract passed: approved offers, role/tenant/actor guards, shared code namespace, unique secure codes, URL validation, private preview, accurate handoff, explicit per-user claims, frozen attribution, limits, replay, pause/expiry, staff verification, confirmation before attendance, no double debit, cancellation cutoff, migration preservation and protected tables');
} finally { await rm(scratch, { recursive: true, force: true }); }
