// Proves the date-key helpers are local-time safe: at 20:00 in America/Bogota (UTC−5) the ISO string
// already says tomorrow, but dateKey() must still name today, and fromDateKey() must round-trip.
// Run: npm run test:dates (existing esbuild resolves the tenant configuration imports).
process.env.TZ = 'America/Bogota';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const scratch = await mkdtemp(join(tmpdir(), 'hoy-date-keys-'));
let helpers;
try {
  const outfile = join(scratch, 'format.mjs');
  await build({ entryPoints: ['src/i18n/format.ts'], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent' });
  helpers = await import(pathToFileURL(outfile));
} finally { await rm(scratch, { recursive: true, force: true }); }
const { dateKey, fromDateKey, addDays, addDaysKey, addMonths, MS } = helpers;

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); if (!ok) failed++; };

const eveningLocal = new Date(2026, 8, 17, 20, 0, 0); // 17 Sep 2026, 20:00 Bogotá = 18 Sep 01:00 UTC
check('TZ is America/Bogota', new Date(2026, 0, 1).getTimezoneOffset() === 300, `offset ${new Date(2026, 0, 1).getTimezoneOffset()} min`);
check('toISOString().slice(0,10) at 20:00 local names tomorrow (the bug this replaces)', eveningLocal.toISOString().slice(0, 10) === '2026-09-18', eveningLocal.toISOString());
check('dateKey() at 20:00 local still names today', dateKey(eveningLocal) === '2026-09-17', dateKey(eveningLocal));
check('dateKey() just after local midnight names the new day', dateKey(new Date(2026, 8, 18, 0, 5)) === '2026-09-18');
check('fromDateKey() lands at local noon of that day', fromDateKey('2026-09-17').getHours() === 12 && fromDateKey('2026-09-17').getDate() === 17);
check('dateKey(fromDateKey(k)) round-trips', dateKey(fromDateKey('2026-02-28')) === '2026-02-28');
check('addDaysKey() crosses a month end', addDaysKey('2026-02-28', 1) === '2026-03-01', addDaysKey('2026-02-28', 1));
check('addDays() keeps the wall-clock time', addDays(eveningLocal, 3).getHours() === 20 && addDays(eveningLocal, 3).getDate() === 20);
check('addMonths() from Jan 31 clamps into March (JS semantics, documented)', dateKey(addMonths(new Date(2026, 0, 31, 12), 1)) === '2026-03-03', dateKey(addMonths(new Date(2026, 0, 31, 12), 1)));
check('MS constants', MS.min === 60000 && MS.hour === 3600000 && MS.day === 86400000);

console.log(failed ? `\n${failed} check(s) failed` : '\nall date-key checks pass');
process.exit(failed ? 1 : 0);
