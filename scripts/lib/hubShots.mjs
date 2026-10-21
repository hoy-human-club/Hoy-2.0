// Which captures the hub map publishes, and where. Shared by scripts/gen-hub-map.mjs (which writes the
// URLs into public/hub-map.json) and scripts/copy-shots.mjs (which copies exactly those files into dist/).
import { existsSync, statSync } from 'node:fs';

export const THUMB_KEYS = ['es-phone', 'en-phone', 'es-desktop', 'en-desktop', 'es-phone-dark', 'en-phone-dark', 'es-desktop-dark', 'en-desktop-dark'];
export const SHOT_KEYS = ['es-390', 'en-390', 'es-1280', 'en-1280', 'es-390-full', 'en-390-full'];
/** Above this the full captures are kept only for the experience and tool entry pages (thumbs stay for every code). */
export const SHOTS_BUDGET_BYTES = 80 * 1024 * 1024;
/** Published folder for the captures, relative to the base URL (= HUB_SHOTS_DIR in src/hub/hubMap.data.ts). */
export const SHOTS_DIR = 'hub-map/shots';
// Protected scheduling/pay QA evidence is kept locally, outside the public release.
export const PRIVATE_CAPTURE_CODES = new Set(['M-14', 'M-14a']);

/** A page code as its screenshot folder name (`C-02/b` → `C-02_b`), like thumbFolder() in src/app/thumbnails.ts. */
export const folderOf = (code) => code.replace(/\//g, '_');

/**
 * The publishing plan: per code, the thumbs / full captures that exist under docs/screenshots/<folder>/,
 * as URLs relative to the base URL; the full captures are dropped for non-entry codes if the total would
 * exceed SHOTS_BUDGET_BYTES. Deterministic: keys in contract order, codes in the order given.
 */
export function planShots(rootUrl, codes, entryCodes) {
  const shotsDir = new URL('docs/screenshots/', rootUrl);
  const found = new Map();
  let thumbBytes = 0, fullBytes = 0, entryFullBytes = 0;
  for (const code of codes) {
    if (PRIVATE_CAPTURE_CODES.has(code)) { found.set(code, { thumbs: {}, full: {} }); continue; }
    const dir = folderOf(code);
    const thumbs = {}, full = {};
    for (const k of THUMB_KEYS) {
      const f = new URL(`${dir}/thumb-${k}.jpg`, shotsDir);
      if (existsSync(f)) { thumbs[k] = `${SHOTS_DIR}/${dir}/thumb-${k}.jpg`; thumbBytes += statSync(f).size; }
    }
    for (const k of SHOT_KEYS) {
      const f = new URL(`${dir}/${k}.jpg`, shotsDir);
      if (existsSync(f)) {
        full[k] = `${SHOTS_DIR}/${dir}/${k}.jpg`;
        const n = statSync(f).size;
        fullBytes += n;
        if (entryCodes.has(code)) entryFullBytes += n;
      }
    }
    found.set(code, { thumbs, full });
  }
  const trimmed = thumbBytes + fullBytes > SHOTS_BUDGET_BYTES;
  if (trimmed) for (const [code, s] of found) if (!entryCodes.has(code)) s.full = {};
  const bytes = thumbBytes + (trimmed ? entryFullBytes : fullBytes);
  return { byCode: found, bytes, trimmed, untrimmedBytes: thumbBytes + fullBytes };
}

/** Every shot URL a map references, in document order, de-duplicated. */
export function shotUrls(map) {
  const out = new Set();
  const add = (s) => { for (const v of Object.values(s.thumbs)) out.add(v); for (const v of Object.values(s.full)) out.add(v); };
  for (const e of map.experiences) add(e.shots);
  for (const p of map.pages) add(p.shots);
  for (const t of map.tools) add(t.shots);
  return [...out];
}
