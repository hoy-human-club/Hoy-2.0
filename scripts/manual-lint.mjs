// Mechanical check of the operations manual against docs/ops-manual/STYLE.md (0038).
// Reads docs/ops-manual/{es,en}/*.md and reports, per chapter and language, the rules a script can decide:
//   code       a page code (S-02, M-08…) in prose, outside EN HOYOS / IN HOYOS boxes, tables, live blocks,
//              figure titles and [screenshot:] placeholders (STYLE §3.1)
//   src        `src/…`, a .ts/.tsx file name, a backticked table name, or a K-01 / D-01-style ref in prose (STYLE §3.2, §3.4)
//   route      a route (/staff/checkin) in prose (STYLE §3.1)
//   jargon     engineering words in prose: idempotent, RLS, la costura, "el sistema lee de", entitlement… (STYLE §2.5, §3.3)
//   decision   the same > DECISIÓN PENDIENTE line in two chapters, or ES/EN with different counts (STYLE §8)
//   screenbox  more than one EN HOYOS box under one `##` section (STYLE §4)
//   editable   more than one {{editable}} under one `##` section (STYLE §6)
//   for        {{for}} without {{/for}} (or the reverse) (STYLE §7)
//   studio     {{studio:key}} whose key is not in src/data/seed/studioPolicies.ts
//   source     {{source:id}} whose id is not in docs/source/index.json
//   figure     an image whose file does not exist
//   parity     ES and EN differ in `##` headings, directives, figures or screen boxes
//   frontmatter version or updated missing
//   legacy     the retired "¿Cómo quieres sentirte hoy?" question or an A-05 reference
// Chapters 25 (datos) and 26 (integraciones) may be technical (STYLE §3): they skip `code` and `src`.
// Usage: npm run lint:manual                 exit 1 on any violation not in docs/ops-manual/lint-baseline.json
//        node scripts/manual-lint.mjs --report   print only, exit 0 (npm run build uses this)
//        node scripts/manual-lint.mjs --update-baseline   write today's violations as the accepted baseline
//        node scripts/manual-lint.mjs --json     machine-readable rows (used by docs/qa/manual-*.md)
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const REPORT = args.includes('--report');
const JSON_OUT = args.includes('--json');
const UPDATE = args.includes('--update-baseline');
const BASELINE = `${ROOT}docs/ops-manual/lint-baseline.json`;
export const RULES = ['code', 'src', 'route', 'jargon', 'decision', 'screenbox', 'editable', 'for', 'studio', 'source', 'figure', 'parity', 'frontmatter', 'legacy'];
const TECHNICAL = new Set(['25', '26']);

const studioKeys = new Set([...readFileSync(`${ROOT}src/data/seed/studioPolicies.ts`, 'utf8').matchAll(/key:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]));
const sourceIds = new Set(JSON.parse(readFileSync(`${ROOT}docs/source/index.json`, 'utf8')).map((s) => s.id));
const tableNames = new Set([...readFileSync(`${ROOT}src/data/schema.ts`, 'utf8').matchAll(/^\s*\{ name: '([a-z_]+)', group:/gm)].map((m) => m[1]));

const CODE = /\b[A-Z]{1,3}-\d{2}[a-z]?\b/g;
const SCREEN_BOX = /^>\s*(EN HOYOS|IN HOYOS)\b/i;
const DIRECTIVE = /\{\{\s*(\/?[a-z]+)/gi;

/** Lines that are prose: not front matter, fences, tables, live-block lines, figures, screenshot placeholders or screen-box quotes. */
function proseLines(lines, start) {
  const out = [];
  let fenced = false, box = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    if (SCREEN_BOX.test(line)) { box = true; continue; }
    if (box) { if (/^>/.test(line)) continue; box = false; }
    if (/^\s*\|/.test(line) || /^\s*\{\{.*\}\}\s*$/.test(line) || /^\s*!\[/.test(line) || /^\s*\[screenshot:/i.test(line)) continue;
    out.push({ line, n: i + 1 });
  }
  return out;
}

/** Strip link targets (`(07-sala.md)`) and inline code fences of directives so only readable text is matched. */
const readable = (s) => s.replace(/\]\([^)]*\)/g, ']').replace(/\{\{[^}]*\}\}/g, '');

function lintChapter(lang, file) {
  const num = file.slice(0, 2);
  const text = readFileSync(`${ROOT}docs/ops-manual/${lang}/${file}`, 'utf8');
  const lines = text.split('\n');
  const found = [];
  const add = (rule, n, msg) => found.push({ lang, file, rule, line: n, msg });

  // front matter
  let bodyStart = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    const fm = Object.fromEntries(lines.slice(1, end).map((l) => [l.split(':')[0], l.slice(l.indexOf(':') + 1).trim()]));
    bodyStart = end + 1;
    if (!fm.version) add('frontmatter', 1, 'version missing');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.updated ?? '')) add('frontmatter', 1, 'updated missing or not YYYY-MM-DD');
  } else add('frontmatter', 1, 'no front matter');

  // prose rules
  if (!TECHNICAL.has(num)) {
    for (const { line, n } of proseLines(lines, bodyStart)) {
      const r = readable(line);
      for (const m of r.matchAll(CODE)) add('code', n, `page code ${m[0]} in prose: "${line.trim().slice(0, 80)}"`);
      if (/\bsrc\//.test(r) || /\b[\w-]+\.tsx?\b/.test(r)) add('src', n, `file reference in prose: "${line.trim().slice(0, 80)}"`);
      for (const m of r.matchAll(/(?<![\w.])\/(staff|admin|app|teach|dev|docs|manual|site|auth|hub)\/[\w:-]+/g)) add('route', n, `route ${m[0]} in prose`);
      for (const m of r.matchAll(/\b(idempotent[ea]?s?|RLS|entitlements?|la costura|the seam|el sistema lee de|the system reads from|registro de la tabla|table row|payload|endpoint)\b/gi)) add('jargon', n, `engineering wording "${m[0]}"`);
      for (const m of r.matchAll(/`([a-z][a-z_]+)`/g)) if (tableNames.has(m[1])) add('src', n, `table name \`${m[1]}\` in prose`);
    }
  }
  // legacy (whole file, prose or not)
  lines.forEach((line, i) => {
    if (i < bodyStart) return;
    if (/¿Cómo quieres sentirte hoy\?|How do you want to feel today\??/i.test(line)) add('legacy', i + 1, 'the retired feeling question');
    if (/\bA-05\b/.test(line)) add('legacy', i + 1, 'A-05 reference (screen retired in 0030)');
  });

  // sections
  let sec = { h: '(intro)', boxes: 0, editable: 0, line: bodyStart + 1 };
  const close = () => {
    if (sec.boxes > 1) add('screenbox', sec.line, `${sec.boxes} screen boxes under "${sec.h}"`);
    if (sec.editable > 1) add('editable', sec.line, `${sec.editable} {{editable}} under "${sec.h}"`);
  };
  let fenced = false, forDepth = 0, forOpen = 0, forClose = 0;
  lines.forEach((line, i) => {
    if (i < bodyStart) return;
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) return;
    if (/^\{\{\s*for\s*:/i.test(line)) { forDepth++; forOpen++; }
    else if (/^\{\{\s*\/\s*for\s*\}\}/i.test(line)) { forDepth--; forClose++; }
    const h = forDepth === 0 && line.match(/^##\s+(.+?)\s*$/);
    if (h) { close(); sec = { h: h[1], boxes: 0, editable: 0, line: i + 1 }; return; }
    if (SCREEN_BOX.test(line)) sec.boxes++;
    if (/^\{\{\s*editable\s*:/i.test(line)) sec.editable++;
    for (const m of line.matchAll(/\{\{\s*studio\s*:\s*([\w-]+)\s*\}\}/gi)) if (!studioKeys.has(m[1])) add('studio', i + 1, `unknown studio key ${m[1]}`);
    for (const m of line.matchAll(/\{\{\s*source\s*:\s*([\w-]+)\s*\}\}/gi)) if (!sourceIds.has(m[1])) add('source', i + 1, `unknown source id ${m[1]}`);
    for (const m of line.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) {
      const p = resolve(dirname(`${ROOT}docs/ops-manual/${lang}/${file}`), m[1]);
      if (!/^https?:/.test(m[1]) && !existsSync(p)) add('figure', i + 1, `missing image ${m[1]}`);
    }
  });
  close();
  if (forOpen !== forClose || forDepth !== 0) add('for', 1, `${forOpen} {{for}} opened, ${forClose} closed`);
  return found;
}

/** What ES and EN must share: headings, directive names, figures, screen boxes. */
function shape(lang, file) {
  const lines = readFileSync(`${ROOT}docs/ops-manual/${lang}/${file}`, 'utf8').split('\n');
  let fenced = false;
  const s = { headings: 0, figures: 0, boxes: 0, decisions: 0, directives: {} };
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    if (/^##\s/.test(line)) s.headings++;
    if (/^\s*!\[/.test(line)) s.figures++;
    if (SCREEN_BOX.test(line)) s.boxes++;
    if (/^>\s*(DECISIÓN PENDIENTE|DECISION NEEDED)\b/i.test(line)) s.decisions++;
    if (/^\s*\{\{.*\}\}\s*$/.test(line)) for (const m of line.matchAll(DIRECTIVE)) s.directives[m[1].toLowerCase()] = (s.directives[m[1].toLowerCase()] ?? 0) + 1;
  }
  return s;
}

const files = readdirSync(`${ROOT}docs/ops-manual/es`).filter((f) => /^\d\d-.*\.md$/.test(f)).sort();
const rows = [];
for (const file of files) {
  if (!existsSync(`${ROOT}docs/ops-manual/en/${file}`)) { rows.push({ lang: 'en', file, rule: 'parity', line: 0, msg: 'missing English mirror' }); continue; }
  for (const lang of ['es', 'en']) rows.push(...lintChapter(lang, file));
  const a = shape('es', file), b = shape('en', file);
  for (const k of ['headings', 'figures', 'boxes', 'decisions']) if (a[k] !== b[k]) rows.push({ lang: 'en', file, rule: 'parity', line: 0, msg: `${k}: es ${a[k]} / en ${b[k]}` });
  for (const d of new Set([...Object.keys(a.directives), ...Object.keys(b.directives)])) if ((a.directives[d] ?? 0) !== (b.directives[d] ?? 0)) rows.push({ lang: 'en', file, rule: 'parity', line: 0, msg: `{{${d}}}: es ${a.directives[d] ?? 0} / en ${b.directives[d] ?? 0}` });
}
for (const f of readdirSync(`${ROOT}docs/ops-manual/en`).filter((f) => /^\d\d-.*\.md$/.test(f))) if (!files.includes(f)) rows.push({ lang: 'es', file: f, rule: 'parity', line: 0, msg: 'missing Spanish source' });

const seenDecision = new Map();
for (const file of files) readFileSync(`${ROOT}docs/ops-manual/es/${file}`, 'utf8').split('\n').forEach((line, i) => {
  const m = line.match(/^>\s*DECISIÓN PENDIENTE:\s*(.+)$/i);
  if (!m) return;
  const k = m[1].trim().toLowerCase();
  if (seenDecision.has(k)) rows.push({ lang: 'es', file, rule: 'decision', line: i + 1, msg: `same decision as ${seenDecision.get(k)}` });
  else seenDecision.set(k, file);
});

const key = (r) => `${r.lang}/${r.file}|${r.rule}|${r.msg}`;
if (UPDATE) { writeFileSync(BASELINE, `${JSON.stringify([...new Set(rows.map(key))].sort(), null, 1)}\n`); console.log(`manual-lint: baseline written (${rows.length} accepted)`); process.exit(0); }
const baseline = new Set(existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : []);
const fresh = rows.filter((r) => !baseline.has(key(r)));

if (JSON_OUT) { console.log(JSON.stringify({ files, rows, fresh: fresh.length }, null, 1)); process.exit(0); }
for (const r of rows) console.log(`${baseline.has(key(r)) ? 'baseline' : 'FAIL    '} ${r.lang}/${r.file}:${r.line} [${r.rule}] ${r.msg}`);
console.log(`manual-lint: ${files.length} chapters × 2 languages, ${rows.length} violations (${rows.length - fresh.length} in baseline, ${fresh.length} new)`);
process.exit(REPORT || !fresh.length ? 0 : 1);
