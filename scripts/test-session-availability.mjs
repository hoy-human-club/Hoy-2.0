import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const scratch = await mkdtemp(join(tmpdir(), 'hoy-availability-'));
try {
  const file = join(scratch, 'availability.mjs');
  await build({ entryPoints: ['src/data/sessionAvailability.ts'], bundle: true, platform: 'node', format: 'esm', outfile: file });
  const { sessionUnavailableReason: reason } = await import(pathToFileURL(file));
  const now = Date.parse('2026-10-15T15:00:00Z');
  const session = { status: 'scheduled', starts_at: '2026-10-15T16:00:00Z', ends_at: '2026-10-15T17:00:00Z', capacity: 4, booked_count: 4 };
  const row = { session, modality: { active: true }, templateActive: true };
  assert.equal(reason(row, now), null, 'full active future class keeps waitlist navigation');
  assert.equal(reason({ ...row, session: { ...session, status: 'cancelled' } }, now), 'cancelled');
  assert.equal(reason({ ...row, session: { ...session, status: 'completed' } }, now), 'completed');
  assert.equal(reason(row, Date.parse(session.starts_at)), 'started', 'booking closes at exact start');
  assert.equal(reason(row, Date.parse(session.ends_at)), 'ended', 'past scheduled data is still inactive');
  assert.equal(reason({ ...row, templateActive: false }, now), 'unpublished');
  assert.equal(reason({ ...row, modality: { active: false } }, now), 'unpublished');
  assert.equal(reason({ session }, now), null, 'one-off sessions need no template');
  assert.equal(reason({ session: { ...session, starts_at: 'invalid' } }, now), 'unavailable');
  console.log('PASS: future/full, cancelled, completed, exact start/end, unpublished template/type, one-off and invalid date states');
} finally { await rm(scratch, { recursive: true, force: true }); }
