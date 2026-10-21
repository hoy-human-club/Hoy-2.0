import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const scratch = await mkdtemp(join(tmpdir(), 'hoy-seed-samples-'));
const NativeDate = Date;
const previousTZ = process.env.TZ;
try {
  const outfile = join(scratch, 'seed.mjs');
  await build({ stdin: { contents: "export {buildSeed} from './src/data/seed/index.ts'; export {pickSampleIds} from './src/hub/sampleIds.ts';", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent' });
  for (const tz of ['UTC', 'America/Bogota']) for (const when of ['2026-10-14T12:00:00Z', '2026-10-14T23:59:00Z', '2026-10-18T12:00:00Z', '2026-10-18T23:59:00Z']) {
    process.env.TZ = tz;
    const now = NativeDate.parse(when);
    globalThis.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return now; }
    };
    const { buildSeed, pickSampleIds } = await import(`${pathToFileURL(outfile)}?case=${encodeURIComponent(tz+when)}`);
    const db = buildSeed(), picks = pickSampleIds(db);
    for (const pick of ['session', 'fullSession', 'booking', 'attendedSession', 'payrollRun']) assert(picks[pick], `${tz} ${when}: missing ${pick}`);
    const full = db.class_sessions.find(s => s.id === picks.fullSession);
    assert(full.booked_count >= full.capacity);
    assert(new Date(full.starts_at).getTime() > now);
    assert.equal(db.bookings.filter(b => b.session_id === full.id && b.status === 'booked').length, full.booked_count);
  }
  console.log('Seed samples pass at midday, after closing and Sunday in UTC and America/Bogota');
} finally {
  globalThis.Date = NativeDate;
  if (previousTZ === undefined) delete process.env.TZ; else process.env.TZ = previousTZ;
  await rm(scratch, { recursive: true, force: true });
}
