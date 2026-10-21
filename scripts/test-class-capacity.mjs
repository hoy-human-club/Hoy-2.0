import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// These are single-provider demo checks, not a cross-tab or server concurrency guarantee.
const scratch = await mkdtemp(join(tmpdir(), 'hoy-class-capacity-'));
try {
  const file = join(scratch, 'provider.mjs');
  await build({ entryPoints: ['src/data/MockProvider.ts'], bundle: true, platform: 'node', format: 'esm', outfile: file, define: { 'import.meta.env.BASE_URL': '"/"' } });
  const stored = new Map();
  globalThis.localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) };
  const { MockProvider } = await import(pathToFileURL(file));
  let db = new MockProvider();
  const base = (await db.list('class_templates'))[0];
  const rooms = await db.list('rooms');
  const main = rooms.find(room => room.id === 'room_main');
  const small = rooms.find(room => room.id !== 'room_main');
  assert(main.capacity > 3 && small.capacity > 1);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const cases = [
    ['lower-main', main.id, 3, 3],
    ['above-main', main.id, main.capacity + 10, main.capacity],
    ['lower-small', small.id, 1, 1],
    ['above-small', small.id, small.capacity + 10, small.capacity],
  ];
  for (const [id, room_id, capacity] of cases) await db.insert('class_templates', {
    ...base, id: `capacity-${id}`, room_id, capacity, weekday: tomorrow.getDay(), start_time: '12:00', active: true,
  });
  db = new MockProvider(); // Expands templates into new occurrences.
  const sessions = await db.list('class_sessions');
  for (const [id, , , expected] of cases) {
    const occurrences = sessions.filter(session => session.template_id === `capacity-${id}`);
    assert(occurrences.length > 0);
    assert(occurrences.every(session => session.capacity === expected), `${id} inherits template/room limit`);
  }
  const session = sessions.find(row => row.template_id === 'capacity-lower-main');
  const regular = user_id => ({ user_id, session_id: session.id, status: 'booked', paid_with: 'package', mat_number: null });
  const a = await db.insert('bookings', regular('capacity-regular-a'));
  const b = await db.insert('bookings', regular('capacity-regular-b'));
  const c = await db.insert('bookings', regular('capacity-regular-c'));
  await assert.rejects(db.insert('bookings', regular('capacity-overflow')), /session_full/);
  assert.equal((await db.get('class_sessions', session.id)).booked_count, 3);
  await db.update('bookings', b.id, { status: 'cancelled' });
  await db.update('bookings', c.id, { status: 'late_cancel' });
  assert.equal((await db.get('class_sessions', session.id)).booked_count, 1);

  let request = 0;
  const command = (type, fields, actorId = 'usr_admin', role = 'admin') => db.voucher({ type, requestId: `capacity-request-${++request}`, actorId, role, ...fields });
  const user = await db.get('users', 'usr_cust');
  assert(user, 'fixture has a customer');
  const issued = await command('issue', { title: 'Capacity regression', benefitKind: 'classes', benefitTotal: 20, participantCap: 4, capScope: 'per_booking', creditUnit: 'per_person', expiresAt: null, cancellationPolicy: 'restore' });
  const voucherId = issued.voucher.id;
  await command('claim', { voucherId, userId: user.id }, user.id, 'customer');
  const group = count => Array.from({ length: count }, (_, index) => ({ name: `Capacity guest ${index}` }));
  const book = count => command('book', { voucherId, sessionId: session.id, participants: group(count), contactConsent: true });
  const before = JSON.parse(stored.get('hoyos.db.v1'));
  await assert.rejects(book(3), /session_full/);
  assert.deepEqual(JSON.parse(stored.get('hoyos.db.v1')), before, 'rejected group leaves balances, seats and history intact');
  const booked = await book(2);
  assert.equal((await db.get('class_sessions', session.id)).booked_count, 3, 'each voucher participant consumes a seat');
  await assert.rejects(db.insert('bookings', regular('capacity-mixed-overflow')), /session_full/);
  await assert.rejects(book(1), /session_full/);
  await command('cancel', { bookingId: booked.booking.id });
  assert.equal((await db.get('class_sessions', session.id)).booked_count, 1);
  const replacement = await db.insert('bookings', regular('capacity-after-voucher-cancel'));
  assert(replacement.mat_number !== a.mat_number, 'released voucher mat is available');
  const oneSeat = await book(1);
  assert.equal((await db.get('class_sessions', session.id)).booked_count, 3, 'regular and group cancellations release seats for either booking path');

  const existing = await db.get('class_sessions', session.id);
  await assert.rejects(db.update('class_templates', session.template_id, { capacity: 1 }), /content_booked/, 'editor rejects shrinking below occupied seats');
  // A pre-upgrade stored template can have a smaller prospective limit than an existing booking.
  const legacy = JSON.parse(stored.get('hoyos.db.v1'));
  legacy.db.class_templates.find(row => row.id === session.template_id).capacity = 1;
  stored.set('hoyos.db.v1', JSON.stringify(legacy));
  db = new MockProvider();
  assert.deepEqual(await db.get('class_sessions', session.id), existing, 'template edit and expansion do not resize booked session');
  assert.equal((await db.get('bookings', a.id)).status, 'booked');
  assert.equal((await db.get('voucher_bookings', oneSeat.booking.id)).status, 'booked');
  // Force one unbooked occurrence to be generated again, proving the new limit applies prospectively.
  const future = (await db.list('class_sessions')).find(row => row.template_id === session.template_id && row.id !== session.id);
  await db.remove('class_sessions', future.id);
  db = new MockProvider();
  assert.equal((await db.get('class_sessions', future.id)).capacity, 1);
  assert.equal((await db.get('class_sessions', session.id)).capacity, 3);

  // Main-room inventory remains an upper bound even when its editable room row is raised.
  await db.update('rooms', main.id, { capacity: main.capacity + 20 });
  const oversized = (await db.list('class_sessions')).filter(row => row.template_id === 'capacity-above-main');
  for (const row of oversized) await db.remove('class_sessions', row.id);
  db = new MockProvider();
  assert((await db.list('class_sessions')).filter(row => row.template_id === 'capacity-above-main').every(row => row.capacity === main.capacity));
  console.log('PASS: template/room/mat capacity inheritance, regular and voucher group limits, atomic rejection, cancellation seat release, and preservation of booked occurrences. Demo single-provider scope only.');
} finally {
  await rm(scratch, { recursive: true, force: true });
}
