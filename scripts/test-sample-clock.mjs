import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const scratch = await mkdtemp(join(tmpdir(), 'hoy-sample-clock-'));
try {
  for (const tz of ['UTC', 'America/Bogota']) {
    process.env.TZ = tz;
    for (const stamp of ['2026-10-15T00:00:00', '2026-10-15T07:00:00', '2026-10-15T14:00:00', '2026-10-15T19:15:00', '2026-10-15T23:59:00', '2026-10-17T23:59:00', '2026-10-18T23:59:00']) {
      const now = new Date(stamp).getTime();
      const outfile = join(scratch, `${tz.replaceAll('/', '-')}-${now}.mjs`);
      await build({ stdin: { contents: "export { buildSeed } from './src/data/seed'; export { pickSampleIds } from './src/hub/sampleIds';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile, define: { Date: 'TestDate', 'import.meta.env.BASE_URL': '"/"' }, banner: { js: `class TestDate extends Date { constructor(...args) { super(...(args.length ? args : [${now}])); } static now() { return ${now}; } }` }, logLevel: 'silent' });
      const { buildSeed, pickSampleIds } = await import(pathToFileURL(outfile));
      const db = buildSeed(); const picks = pickSampleIds(db);
      for (const key of ['session', 'fullSession', 'booking', 'attendedSession', 'payrollRun']) assert(picks[key], `${tz} ${stamp}: missing ${key}`);
      const full = db.class_sessions.find(s => s.id === picks.fullSession);
      assert(full.status === 'scheduled' && new Date(full.starts_at).getTime() > now && full.booked_count >= full.capacity);
    }
  }
  console.log('Sample clock: all five hub picks resolve across 14 weekday/weekend/late-night UTC and Bogota fixtures');
} finally { await rm(scratch, { recursive: true, force: true }); }
