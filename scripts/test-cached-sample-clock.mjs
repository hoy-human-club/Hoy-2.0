/**
 * HOY same-day cached sample regression. Generated bundles stay in the system temp directory.
 * Usage: node scripts/test-cached-sample-clock.mjs [--repo /path/to/hoy]
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const repoIndex = args.indexOf('--repo');
const repo = resolve(repoIndex >= 0 ? args[repoIndex + 1] : process.cwd());
const expectFixed = true;
const { build } = createRequire(join(repo, 'package.json'))('esbuild');
const scratch = await mkdtemp(join(tmpdir(), 'hoy-cached-sample-regression-'));
const oldTZ = process.env.TZ;
const KEY = 'hoyos.db.v1';
const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
  clear: () => storage.clear(),
};
const modules = new Map();
const active = b => b.status === 'booked' || b.status === 'checked_in';
const clone = value => structuredClone(value);
let failures = 0;
let checks = 0;

async function check(name, fn) {
  checks++;
  try { await fn(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
async function moduleAt(tz, stamp) {
  process.env.TZ = tz;
  const now = new Date(stamp).getTime();
  const key = `${tz}-${now}`;
  if (!modules.has(key)) {
    const outfile = join(scratch, `${tz.replaceAll('/', '-')}-${now}.mjs`);
    await build({
      stdin: {
        contents: "export { buildSeed } from './src/data/seed'; export { MockProvider, SEED_VERSION } from './src/data/MockProvider'; export { tableNames } from './src/data/schema'; export { pickSampleIds, resolveSampleRoute } from './src/hub/sampleIds'; export { usesMats } from './src/data/mats'; export { tenant } from './src/tenant/tenant';",
        resolveDir: repo, loader: 'ts',
      },
      bundle: true, platform: 'node', format: 'esm', outfile,
      define: { Date: 'TestDate', 'import.meta.env.BASE_URL': '"/"' },
      banner: { js: `class TestDate extends Date { constructor(...args) { super(...(args.length ? args : [${now}])); } static now() { return ${now}; } }` },
      logLevel: 'silent',
    });
    modules.set(key, await import(pathToFileURL(outfile)));
  }
  return { api: modules.get(key), now };
}
function dbFrom(provider, api) {
  return Object.fromEntries(api.tableNames.map(table => [table, provider.peek(table)]));
}
function readStored() { return JSON.parse(storage.get(KEY)); }
function seedCache(db, now, version = 10) {
  storage.set(KEY, JSON.stringify({ seededOn: new Date(now).toDateString(), version, db }));
}
function assertFull(api, db, now, name) {
  const pick = api.pickSampleIds(db, 'usr_cust', now).fullSession;
  assert(pick, `${name}: missing fullSession`);
  const s = db.class_sessions.find(row => row.id === pick);
  assert(s.status === 'scheduled' && new Date(s.starts_at).getTime() > now, `${name}: not future scheduled`);
  assert(s.booked_count >= s.capacity && s.capacity > 0, `${name}: not full`);
  assert(!db.bookings.some(b => b.user_id === 'usr_cust' && b.session_id === s.id && active(b)), `${name}: customer already booked/checked_in`);
  assert.equal(api.resolveSampleRoute('/app/waitlist/sample', db, 'usr_cust', now), `/app/waitlist/${s.id}`);
  return s;
}
function assertPreserved(before, after) {
  const byId = new Map(after.bookings.map(b => [b.id, b]));
  for (const b of before.bookings) assert.deepEqual(byId.get(b.id), b, `existing booking changed/dropped: ${b.id}`);
  assert.deepEqual(after.content_articles, before.content_articles, 'CMS article edits lost');
  assert.deepEqual(after.profiles, before.profiles, 'profile edits lost');
}
function assertUniqueAndScoped(before, after) {
  assert.equal(new Set(after.bookings.map(b => b.id)).size, after.bookings.length, 'duplicate booking IDs');
  const oldIds = new Set(before.bookings.map(b => b.id));
  const added = after.bookings.filter(b => !oldIds.has(b.id));
  assert(added.length > 0, 'no filler bookings added');
  for (const b of added) assert(b.id.includes(b.session_id), `new filler ID is not session-scoped: ${b.id}`);
  const seen = new Set();
  for (const b of after.bookings.filter(active)) {
    const key = `${b.session_id}:${b.user_id}`;
    assert(!seen.has(key), `duplicate active booking for session/user ${key}`);
    seen.add(key);
  }
}
function markEdits(db) {
  // Synthetic non-sensitive edits used only in this in-memory fixture.
  db.content_articles[0].qa_cache_marker = 'retain CMS edits';
  db.profiles[0].notes = 'Retain this synthetic profile edit';
}
function addBooking(db, api, session, userId, status, id, now) {
  assert(!db.bookings.some(b => b.session_id === session.id && b.user_id === userId && active(b)));
  const row = {
    id, tenant_id: session.tenant_id, created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString(),
    user_id: userId, session_id: session.id, status, paid_with: 'single', ledger_id: null,
    checked_in_at: status === 'checked_in' ? new Date(now).toISOString() : null,
    cancelled_at: null, rated: false,
  };
  if (api.usesMats(db.modalities.find(m => m.id === session.modality_id))) {
    const taken = new Set(db.bookings.filter(b => b.session_id === session.id && active(b)).map(b => b.mat_number));
    row.mat_number = Array.from({ length: session.capacity }, (_, i) => i + 1).find(n => !taken.has(n));
    assert(row.mat_number, 'test fixture needs a free mat');
  }
  db.bookings.push(row); session.booked_count++;
}

try {
  for (const tz of ['UTC', 'America/Bogota']) {
    const early = await moduleAt(tz, '2026-10-15T00:00:00');
    storage.clear();
    const morningProvider = new early.api.MockProvider();
    const morning = dbFrom(morningProvider, early.api);
    // Preserve pre-fix v10 filler identities as well as newer session-scoped IDs.
    morning.bookings.filter(b => b.id.startsWith('bk_full_')).forEach((b, i) => { b.id = `bk_full_${12 + i}`; });
    markEdits(morning);
    const originalFull = assertFull(early.api, morning, early.now, `${tz} morning`);
    console.log(JSON.stringify({ tz, morningFull: originalFull.id, starts: originalFull.starts_at, originalFillerIDs: morning.bookings.filter(b => b.id.startsWith('bk_full_')).map(b => b.id) }));

    // Existing pure fresh-seed test passes, but a real same-day v10 cache fails.
    for (const stamp of ['2026-10-15T19:15:00', '2026-10-15T23:59:00']) {
      const late = await moduleAt(tz, stamp);
      await check(`${tz} ${stamp}: fresh seed is valid`, () => assertFull(late.api, late.api.buildSeed(), late.now, 'fresh'));
      seedCache(clone(morning), late.now, 10);
      const cachedProvider = new late.api.MockProvider();
      const cached = dbFrom(cachedProvider, late.api);
      const picks = late.api.pickSampleIds(cached, 'usr_cust', late.now);
      console.log(JSON.stringify({ tz, stamp, storedVersion: readStored().version, cachedFull: picks.fullSession ?? null, cachedWaitlist: late.api.resolveSampleRoute('/app/waitlist/sample', cached, 'usr_cust', late.now), freshFull: late.api.pickSampleIds(late.api.buildSeed()).fullSession }));
      await check(`${tz} ${stamp}: existing booking/CMS/profile edits preserved`, () => assertPreserved(morning, cached));
      if (expectFixed) {
        await check(`${tz} ${stamp}: cached full-session route resolves`, () => assertFull(late.api, cached, late.now, 'cache'));
        await check(`${tz} ${stamp}: newly filled IDs are unique and session-scoped`, () => assertUniqueAndScoped(morning, cached));
        // A second constructor loads what the first persisted. It must add nothing.
        const twice = dbFrom(new late.api.MockProvider(), late.api);
        await check(`${tz} ${stamp}: cached reload is idempotent`, () => {
          assert.deepEqual(twice.bookings, cached.bookings);
          assert.deepEqual(twice.class_sessions, cached.class_sessions);
          assert.deepEqual(twice.waitlist, cached.waitlist);
        });
      } else {
        await check(`${tz} ${stamp}: reproduce missing cached full pick`, () => {
          assert.equal(picks.fullSession, undefined);
          assert.equal(late.api.resolveSampleRoute('/app/waitlist/sample', cached, 'usr_cust', late.now), null);
        });
      }
    }

    // Check the strict >now boundary: the former sample is invalid from its start.
    const boundaryStamp = new Date(originalFull.starts_at).toISOString();
    const boundary = await moduleAt(tz, boundaryStamp);
    seedCache(clone(morning), boundary.now, 10);
    const boundaryDb = dbFrom(new boundary.api.MockProvider(), boundary.api);
    await check(`${tz}: exact start boundary ${boundaryStamp}`, () => {
      const pick = boundary.api.pickSampleIds(boundaryDb, 'usr_cust', boundary.now).fullSession;
      if (expectFixed) { assert(pick && pick !== originalFull.id); assertFull(boundary.api, boundaryDb, boundary.now, 'boundary'); }
      else assert.equal(pick, undefined);
    });

    if (expectFixed) {
      const late = await moduleAt(tz, '2026-10-15T19:15:00');
      const exclusionDb = clone(morning);
      const mine = new Set(exclusionDb.bookings.filter(b => b.user_id === 'usr_cust' && active(b)).map(b => b.session_id));
      const candidates = exclusionDb.class_sessions.filter(s => s.status === 'scheduled' && new Date(s.starts_at).getTime() > late.now && !mine.has(s.id) && s.booked_count < s.capacity).sort((a,b) => a.starts_at.localeCompare(b.starts_at));
      const [checked, booked, target] = candidates;
      assert(target, 'fixture needs at least three candidates');
      addBooking(exclusionDb, late.api, checked, 'usr_cust', 'checked_in', `qa_checked_${checked.id}`, late.now);
      addBooking(exclusionDb, late.api, booked, 'usr_cust', 'booked', `qa_booked_${booked.id}`, late.now);
      const filler = exclusionDb.users.find(u => /^usr_c\d+$/.test(u.id) && !exclusionDb.bookings.some(b => b.session_id === target.id && b.user_id === u.id && active(b)));
      assert(filler, 'fixture needs an unbooked filler');
      addBooking(exclusionDb, late.api, target, filler.id, 'checked_in', `qa_filler_checked_${target.id}`, late.now);
      seedCache(exclusionDb, late.now, 10);
      const exclusionResult = dbFrom(new late.api.MockProvider(), late.api);
      await check(`${tz}: booked and checked_in customer exclusions`, () => {
        const sample = assertFull(late.api, exclusionResult, late.now, 'exclusions');
        assert(![checked.id, booked.id].includes(sample.id));
        assert.equal(exclusionResult.class_sessions.find(s => s.id === checked.id).booked_count, checked.booked_count, 'checked-in customer session was filled');
        assert.equal(exclusionResult.class_sessions.find(s => s.id === booked.id).booked_count, booked.booked_count, 'booked customer session was filled');
        assertPreserved(exclusionDb, exclusionResult);
        assertUniqueAndScoped(exclusionDb, exclusionResult);
      });

      await check(`${tz}: over-capacity mat fixture is skipped without changing the edited session`, () => {
        const edited = clone(morning);
        const mine = new Set(edited.bookings.filter(b => b.user_id === 'usr_cust' && active(b)).map(b => b.session_id));
        const target = edited.class_sessions.find(s => s.status === 'scheduled' && new Date(s.starts_at).getTime() > late.now && !mine.has(s.id) && late.api.usesMats(edited.modalities.find(m => m.id === s.modality_id)));
        assert(target, 'fixture needs a future yoga class');
        const oversized = late.api.tenant.studio.mats + 1;
        target.capacity = oversized;
        const originalBookings = clone(edited.bookings.filter(b => b.session_id === target.id));
        seedCache(edited, late.now, 10);
        const result = dbFrom(new late.api.MockProvider(), late.api);
        assert.equal(result.class_sessions.find(s => s.id === target.id).capacity, oversized, 'local capacity edit overwritten');
        assert.deepEqual(result.bookings.filter(b => b.session_id === target.id), originalBookings, 'invalid mat fixture was filled');
        assert.notEqual(assertFull(late.api, result, late.now, 'mat cap').id, target.id);
        assertPreserved(edited, result);
      });

      await check(`${tz}: cancelled filler decisions and voucher allocations remain untouched`, () => {
        const cancelled = clone(morning);
        const mine = new Set(cancelled.bookings.filter(b => b.user_id === 'usr_cust' && active(b)).map(b => b.session_id));
        const candidate = cancelled.class_sessions.filter(s => s.status === 'scheduled' && new Date(s.starts_at).getTime() > late.now && !mine.has(s.id)).sort((a,b) => a.starts_at.localeCompare(b.starts_at))[0];
        assert(candidate);
        const filler = cancelled.users.find(u => /^usr_c\d{2}$/.test(u.id) && !cancelled.bookings.some(b => b.session_id === candidate.id && b.user_id === u.id));
        assert(filler);
        const cancelledBooking = {...cancelled.bookings[0], id:'qa_cancelled_filler', session_id:candidate.id, user_id:filler.id, status:'cancelled', mat_number:null, cancelled_at:new Date(late.now).toISOString()};
        cancelled.bookings.push(cancelledBooking);
        seedCache(cancelled, late.now, 10);
        const cancelResult = dbFrom(new late.api.MockProvider(), late.api);
        assert.deepEqual(cancelResult.bookings.find(b => b.id === cancelledBooking.id), cancelledBooking);
        assert(!cancelResult.bookings.some(b => b.session_id === candidate.id && b.user_id === filler.id && active(b)), 'cancelled filler silently rebooked');
        assertFull(late.api, cancelResult, late.now, 'cancellation');
        for (const session of cancelResult.class_sessions.filter(s => late.api.usesMats(cancelResult.modalities.find(m => m.id === s.modality_id)))) {
          const seats = cancelResult.bookings.filter(b => b.session_id === session.id && active(b));
          assert(seats.every(b => Number.isInteger(b.mat_number) && b.mat_number >= 1 && b.mat_number <= Math.min(session.capacity, late.api.tenant.studio.mats)), 'new mat allocation outside range');
          assert.equal(new Set(seats.map(b => b.mat_number)).size, seats.length, 'duplicate allocated mat');
        }
        const voucherDb = clone(morning);
        const voucherSession = voucherDb.class_sessions.find(s => s.id === candidate.id);
        const beforeBookings = clone(voucherDb.bookings.filter(b => b.session_id === voucherSession.id));
        const stamp = new Date(late.now).toISOString();
        const voucherBooking = {id:'qa_voucher_booking',tenant_id:voucherSession.tenant_id,created_at:stamp,updated_at:stamp,voucherId:'qa_voucher',sessionId:voucherSession.id,participants:[{name:'Demo guest'}],cost:1,status:'booked',restored:false,mats:[]};
        voucherDb.voucher_bookings.push(voucherBooking);voucherSession.booked_count++;
        seedCache(voucherDb, late.now, 10);
        const voucherResult = dbFrom(new late.api.MockProvider(), late.api);
        assert.deepEqual(voucherResult.voucher_bookings, voucherDb.voucher_bookings);
        assert.deepEqual(voucherResult.bookings.filter(b => b.session_id === voucherSession.id), beforeBookings, 'voucher-occupied session was filled');
        assert.notEqual(assertFull(late.api, voucherResult, late.now, 'voucher skip').id, voucherSession.id);
      });

      // Weekend cached-morning to after-last-class cases, with fresh modules.
      for (const day of ['2026-10-17', '2026-10-18']) {
        storage.clear();
        const am = await moduleAt(tz, `${day}T00:00:00`);
        const amDb = dbFrom(new am.api.MockProvider(), am.api);
        markEdits(amDb);
        const pm = await moduleAt(tz, `${day}T23:59:00`);
        seedCache(amDb, pm.now, 10);
        const pmDb = dbFrom(new pm.api.MockProvider(), pm.api);
        await check(`${tz} ${day}: weekend cache survives after last class`, () => {
          assertFull(pm.api, pmDb, pm.now, 'weekend');
          assertPreserved(amDb, pmDb);
          assert.equal(new Set(pmDb.bookings.map(b => b.id)).size, pmDb.bookings.length);
        });
      }
    }
  }

  // An already-open browser must repair fixtures before resolving a later sample route too.
  process.env.TZ = 'UTC';
  const liveFile = join(scratch, 'live-clock.mjs');
  const morningTime = new Date('2026-10-15T00:00:00Z').getTime();
  await build({ stdin: { contents: "export { MockProvider, SEED_VERSION } from './src/data/MockProvider'; export { tableNames } from './src/data/schema'; export { pickSampleIds, resolveSampleRoute } from './src/hub/sampleIds'; export const setNow = n => { virtualNow = n; };", resolveDir: repo, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: liveFile, define: { Date: 'TestDate', 'import.meta.env.BASE_URL': '"/"' }, banner: { js: `let virtualNow = ${morningTime}; class TestDate extends Date { constructor(...args) { super(...(args.length ? args : [virtualNow])); } static now() { return virtualNow; } }` }, logLevel: 'silent' });
  const liveApi = await import(pathToFileURL(liveFile));
  storage.clear();
  const liveProvider = new liveApi.MockProvider();
  const liveBefore = dbFrom(liveProvider, liveApi);
  const eveningTime = new Date('2026-10-15T19:15:00Z').getTime();
  liveApi.setNow(eveningTime);
  liveProvider.prepareDemoSamples();
  const liveAfter = dbFrom(liveProvider, liveApi);
  await check('Already-open demo repairs full sample before route resolution', () => {
    assertFull(liveApi, liveAfter, eveningTime, 'live clock');
    assertPreserved(liveBefore, liveAfter);
    assertUniqueAndScoped(liveBefore, liveAfter);
    liveProvider.prepareDemoSamples();
    assert.deepEqual(dbFrom(liveProvider, liveApi).bookings, liveAfter.bookings);
  });

  // Workflow dependency audit: changes to clock inputs must trigger Photography QA.
  const workflow = await readFile(join(repo, '.github/workflows/photography-qa.yml'), 'utf8');
  const pathSection = workflow.slice(workflow.indexOf('    paths:'), workflow.indexOf('permissions:'));
  const globs = [...pathSection.matchAll(/- '([^']+)'/g)].map(m => m[1]);
  const matches = (path, glob) => new RegExp('^' + glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('**', '\0').replaceAll('*', '[^/]*').replaceAll('\0', '.*') + '$').test(path);
  for (const path of ['scripts/test-sample-clock.mjs', 'src/data/seed/index.ts', 'src/data/MockProvider.ts', 'src/hub/sampleIds.ts']) {
    await check(`Photography QA path coverage: ${path}`, () => {
      // An absent paths filter means all changes trigger the workflow.
      const triggers = !workflow.includes('    paths:') || globs.some(glob => matches(path, glob));
      assert.equal(triggers, expectFixed, `${path} trigger coverage is ${triggers}`);
    });
  }
  console.log(`${expectFixed ? 'Regression' : 'Reproduction'}: ${checks - failures}/${checks} checks passed`);
  if (failures) process.exitCode = 1;
} finally {
  if (oldTZ === undefined) delete process.env.TZ; else process.env.TZ = oldTZ;
  await rm(scratch, { recursive: true, force: true });
}
