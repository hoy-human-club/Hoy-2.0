// Opens every hub-map sample route (pages[].sampleRoute in public/hub-map.json) the way a host does:
// inside an iframe, with the embed query `?as=<role>&dev=0&live=0`, against `vite preview` of dist/.
// Each page must end on a concrete route (a `sample` segment resolved to today's seed id), show more than
// 20 words, carry no ⟨missing-key⟩ marker and show no unexpected not-found state. C-29 explicitly
// demonstrates its unavailable-code state without fabricating an invitation. Not part of the build; run after `npm run build`.
// Usage: npm run hub-map:check   (Chromium from /opt/pw-browsers or CHROMIUM_PATH; never `playwright install`)
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const ROOT = new URL('../', import.meta.url);
const PORT = 4187;
const SIZE = { phone: [390, 844], tablet: [768, 1024], desktop: [1280, 800], page: [390, 844], sheet: [1280, 800] };

function findChromium() {
  const root = '/opt/pw-browsers';
  try {
    const dir = readdirSync(root).find((d) => /^chromium-\d+/.test(d));
    if (dir) return `${root}/${dir}/chrome-linux/chrome`;
  } catch { /* fall through */ }
  return process.env.CHROMIUM_PATH;
}

if (!existsSync(new URL('dist/index.html', ROOT))) { console.error('hub-map:check: no dist/ — run npm run build first'); process.exit(1); }
const map = JSON.parse(readFileSync(new URL('public/hub-map.json', ROOT), 'utf8'));
const expRole = new Map(map.experiences.map((e) => [e.id, e.roleId]));
const samples = map.pages.filter((p) => p.sampleRoute);
const templates = map.pages.filter((p) => p.route.includes(':'));
const problems = [];
for (const p of templates) if (!p.sampleRoute) problems.push(`${p.code} ${p.route}: no sampleRoute`);

const server = spawn(process.execPath, [new URL('node_modules/vite/bin/vite.js', ROOT).pathname, 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT.pathname, stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
try {
  for (const p of samples) {
    const want = expRole.get(p.experienceId);
    const role = p.roles.includes(want) || p.roles.includes('public') ? want : p.roles[0];
    const [w, h] = SIZE[p.device] ?? SIZE.desktop;
    const src = `http://localhost:${PORT}/#${p.sampleRoute}?as=${role}&dev=0&live=0`;
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    // A same-origin host page (as on imagine-os.github.io): an opaque parent would deny the frame localStorage.
    const host = `http://localhost:${PORT}/__host.html`;
    await page.route(host, (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><body style="margin:0"><iframe name="host" src="${src}" style="border:0;width:${w}px;height:${h}px"></iframe></body>` }));
    await page.goto(host);
    const frame = () => page.frames().find((f) => f.name() === 'host');
    let text = '', hash = '';
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(250);
      const f = frame(); if (!f) continue;
      try {
        hash = await f.evaluate(() => location.hash);
        text = await f.evaluate(() => document.body.innerText);
      } catch { continue; }
      const resolved = !hash.split('?')[0].split('/').includes('sample');
      if (resolved && i >= 8 && text.split(/\s+/).filter(Boolean).length > 20) break;
    }
    const words = text.split(/\s+/).filter(Boolean).length;
    const route = hash.slice(1).split('?')[0];
    const bad = [];
    if (route.split('/').includes('sample')) bad.push('sample segment never resolved');
    if (words <= 20) bad.push(`only ${words} words`);
    const missingPromotionExample = p.code === 'C-29' && p.sampleRoute === '/promotions/DEMO-PROMOTION';
    if (missingPromotionExample) {
      if (!/Este código no está disponible en este navegador|This code is not available in this browser/.test(text)) bad.push('expected unavailable-code example');
    } else if (/no encontrad|not found|no existe/i.test(text)) bad.push('not-found state');
    if (text.includes('⟨')) bad.push(`missing-key marker ${text.match(/⟨[^⟩]*⟩/)?.[0]}`);
    console.log(`${bad.length ? 'FAIL' : 'ok  '} ${p.code.padEnd(6)} ${p.sampleRoute.padEnd(32)} as=${role.padEnd(8)} → ${route} · ${words} words${bad.length ? ` · ${bad.join('; ')}` : ''}`);
    if (bad.length) problems.push(`${p.code} ${p.sampleRoute}: ${bad.join('; ')}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
if (problems.length) { console.error(`hub-map:check: ${problems.length} problem(s):\n  ${problems.join('\n  ')}`); process.exit(1); }
console.log(`hub-map:check: ${samples.length} sample routes open real pages`);
