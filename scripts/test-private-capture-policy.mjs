import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { planShots } from './lib/hubShots.mjs';
const root = await mkdtemp(join(tmpdir(), 'hoy-capture-policy-'));
try {
  for (const code of ['M-14', 'M-14a', 'W-04']) {
    await mkdir(join(root, 'docs/screenshots', code), { recursive: true });
    for (const name of ['es-390.jpg', 'thumb-en-desktop.jpg']) await writeFile(join(root, 'docs/screenshots', code, name), 'synthetic test file');
  }
  const plan = planShots(pathToFileURL(`${root}/`), ['M-14', 'M-14a', 'W-04'], new Set());
  for (const code of ['M-14', 'M-14a']) assert.deepEqual(plan.byCode.get(code), { thumbs: {}, full: {} }, 'protected files never enter the publication plan');
  assert.equal(Object.keys(plan.byCode.get('W-04').full).length, 1, 'public captures remain available');
  console.log('PASS: protected scheduling/pay captures excluded even when present; public capture plan retained');
} finally { await rm(root, { recursive: true, force: true }); }
