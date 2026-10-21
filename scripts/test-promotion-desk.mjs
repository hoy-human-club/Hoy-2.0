import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const scratch = await mkdtemp(join(tmpdir(), 'hoy-promotion-desk-'));
try {
  const file = join(scratch, 'desk-availability.mjs');
  await build({ entryPoints: ['src/modules/vouchers/deskAvailability.ts'], bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent' });
  const { availableWalkupSessions: available, remainingVoucherParticipants: remaining } = await import(pathToFileURL(file));
  const now = Date.parse('2026-10-14T12:00:00Z');
  const voucher = { id: 'voucher', tenant_id: 'tenant', claimedBy: 'holder', participantCap: 3, capScope: 'per_booking', expiresAt: '2026-10-17T12:00:00Z' };
  const session = (id, patch = {}) => ({ id, tenant_id: 'tenant', status: 'scheduled', starts_at: '2026-10-15T12:00:00Z', capacity: 2, booked_count: 0, ...patch });
  const regular = (sessionId, userId = 'other', patch = {}) => ({ tenant_id: 'tenant', session_id: sessionId, user_id: userId, status: 'booked', ...patch });
  const promotional = (sessionId, participants, patch = {}) => ({ tenant_id: 'tenant', voucherId: 'other-voucher', sessionId, participants, status: 'booked', ...patch });
  const ids = (sessions, regularBookings = [], voucherBookings = [], partySize = 1, v = voucher) => available(v, sessions, regularBookings, voucherBookings, partySize, now).map(row => row.id);

  assert.deepEqual(ids([session('open')]), ['open']);
  assert.deepEqual(available(undefined, [session('open')], [], [], 1, now), []);
  assert.deepEqual(ids([session('open')], [], [], 1, { ...voucher, claimedBy: null }), []);
  assert.deepEqual(ids([session('past', { starts_at: '2026-10-14T11:00:00Z' }), session('invalid', { starts_at: 'invalid' }), session('cancelled', { status: 'cancelled' }), session('expired', { starts_at: voucher.expiresAt }), session('foreign', { tenant_id: 'other' })]), []);
  assert.deepEqual(ids([session('full')], [regular('full'), regular('full', 'third')]), []);
  assert.deepEqual(ids([session('full')], [], [promotional('full', [{ name: 'One' }, { name: 'Two' }])]), []);
  assert.deepEqual(ids([session('one-seat')], [regular('one-seat')]), ['one-seat']);
  assert.deepEqual(ids([session('one-seat')], [regular('one-seat')], [], 2), [], 'increasing the party invalidates a previously selectable class');
  assert.deepEqual(ids([session('held')], [regular('held', 'holder')]), [], 'holder regular booking cannot be duplicated');
  assert.deepEqual(ids([session('held')], [], [promotional('held', [{ name: 'Holder', userId: 'holder' }])]), [], 'holder voucher booking cannot be duplicated');
  assert.deepEqual(ids([session('open')], [regular('open', 'holder', { status: 'cancelled' }), regular('open', 'holder', { status: 'late_cancel' }), regular('open', 'holder', { tenant_id: 'other' })], [promotional('open', [{ name: 'Holder', userId: 'holder' }], { status: 'cancelled' }), promotional('open', [{ name: 'Holder', userId: 'holder' }], { tenant_id: 'other' })]), ['open'], 'cancelled and foreign-tenant bookings do not block a class');
  const used = [promotional('previous', [{ name: 'One' }, { name: 'Two' }], { voucherId: 'voucher', status: 'attended' })];
  assert.equal(remaining(voucher, used), 3, 'per-booking caps do not consume a lifetime allowance');
  const lifetime = { ...voucher, capScope: 'lifetime' };
  assert.equal(remaining(lifetime, used), 1);
  assert.deepEqual(ids([session('open')], [], used, 2, lifetime), [], 'remaining lifetime allowance limits the current party');
  assert.equal(remaining(lifetime, [...used, promotional('cancelled', [{ name: 'Three' }], { voucherId: 'voucher', status: 'cancelled' })]), 1, 'cancelled bookings release participant allowance');
  assert.equal(remaining(lifetime, [...used, promotional('another', [{ name: 'Three' }], { voucherId: 'voucher' })]), 0);
  assert.deepEqual(ids([session('later', { starts_at: '2026-10-16T12:00:00Z' }), session('earlier')]), ['earlier', 'later']);
  console.log('PASS promotion desk picker: capacity, party-size changes, regular/voucher holder duplicates, cancellation, tenant scope, lifetime caps, dates and ordering');
} finally {
  await rm(scratch, { recursive: true, force: true });
}
