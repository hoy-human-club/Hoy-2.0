// Writes public/actions.json — the actions vocabulary (schema hoy.actions/1, contract
// src/actions/manifest.types.ts, docs/reference/surfaces.md §4): every action any routed page declares,
// the same list `window.__hoyos.actions` gives inside the running page, readable without opening it.
//
// Source, no browser: the live route registry (src/app/registry.ts → getRoutes()), loaded through Vite's
// SSR module loader exactly like scripts/gen-hub-map.mjs, plus ROLE_PERMISSIONS from src/auth/permissions.ts.
// Deterministic (generatedAt is the date of the latest changelog entry). Validated before it is written:
// a duplicate id whose label / intent / params / permission differ between pages, a missing es or en,
// a permission that permissions.ts does not define, or zero actions exits 1 and fails the build.
// Usage: npm run actions   (also a step of npm run build, right after npm run hub-map)
/** @typedef {import('../src/actions/manifest.types').ActionsManifest} ActionsManifest */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('public/actions.json', ROOT);
const pkg = JSON.parse(readFileSync(new URL('package.json', ROOT), 'utf8'));

/** Date of the highest-numbered changelog entry, as an ISO timestamp — stable across runs (same rule as gen-hub-map). */
function generatedAt() {
  const dir = new URL('docs/changelog/', ROOT);
  const last = readdirSync(dir).filter((f) => /^\d{4}-.*\.md$/.test(f)).sort().pop();
  const date = last && readFileSync(new URL(last, dir), 'utf8').match(/^date:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
  if (!date) throw new Error(`no date: line in docs/changelog/${last}`);
  return `${date}T00:00:00.000Z`;
}

const server = await createServer({
  root: fileURLToPath(ROOT), logLevel: 'error', appType: 'custom', configFile: fileURLToPath(new URL('vite.config.ts', ROOT)),
  server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] },
});
/** @type {ActionsManifest} */
let manifest;
const problems = [];
try {
  const { getRoutes } = await server.ssrLoadModule('/src/app/registry.ts');
  const { ROLE_PERMISSIONS } = await server.ssrLoadModule('/src/auth/permissions.ts');
  const data = await server.ssrLoadModule('/src/hub/hubMap.data.ts');

  const holders = new Map(); // permission → roles, in ROLE_PERMISSIONS order
  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) for (const p of perms) (holders.get(p) ?? holders.set(p, []).get(p)).push(role);

  const byId = new Map();
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const bi = (x, where) => { if (!x || typeof x.es !== 'string' || !x.es.trim() || typeof x.en !== 'string' || !x.en.trim()) problems.push(`${where}: missing es or en`); };
  for (const r of getRoutes()) {
    for (const a of r.spec.actions ?? []) {
      const where = `${a.id} (${r.spec.code} ${r.path})`;
      const hit = byId.get(a.id);
      if (!hit) {
        bi(a.label, `${where} label`); bi(a.intent, `${where} intent`);
        if (a.permission !== undefined && !holders.has(a.permission)) problems.push(`${where}: permission ${a.permission} is not in src/auth/permissions.ts`);
        byId.set(a.id, {
          id: a.id, label: { es: a.label?.es, en: a.label?.en }, intent: { es: a.intent?.es, en: a.intent?.en },
          ...(a.params && Object.keys(a.params).length ? { params: { ...a.params } } : {}),
          ...(a.permission !== undefined ? { permission: a.permission } : {}),
          roles: [...r.roles], pages: [{ code: r.spec.code, route: r.path }],
        });
        continue;
      }
      for (const k of ['label', 'intent', 'params', 'permission']) {
        const mine = k === 'params' && a.params && !Object.keys(a.params).length ? undefined : a[k];
        if (!same(hit[k], mine)) problems.push(`${where}: ${k} differs from ${hit.pages[0].code} ${hit.pages[0].route}`);
      }
      for (const role of r.roles) if (!hit.roles.includes(role)) hit.roles.push(role);
      if (!hit.pages.some((p) => p.code === r.spec.code && p.route === r.path)) hit.pages.push({ code: r.spec.code, route: r.path });
    }
  }
  const actions = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (!actions.length) problems.push('zero actions declared');
  const used = [...holders.keys()].filter((p) => actions.some((a) => a.permission === p));

  manifest = {
    schema: 'hoy.actions/1',
    product: { id: data.HOY_PRODUCT.id, name: data.HOY_PRODUCT.name, version: pkg.version, baseUrl: data.HOY_BASE_URL },
    generatedAt: generatedAt(),
    run: { how: 'window.__hoyos.run(id, params)', note: 'in-page only; no MCP server yet' },
    permissions: used.map((id) => ({ id, roles: holders.get(id) })),
    actions,
  };
} finally {
  await server.close();
}

if (problems.length) {
  console.error(`actions: ${problems.length} problem(s), public/actions.json not written:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
const json = `${JSON.stringify(manifest, null, 2)}\n`;
writeFileSync(OUT, json);
const pages = new Set(manifest.actions.flatMap((a) => a.pages.map((p) => p.code)));
console.log(`wrote public/actions.json · ${manifest.schema} v${manifest.product.version} · ${manifest.actions.length} actions, ${manifest.permissions.length} permissions, ${pages.size} declaring pages · ${(json.length / 1024).toFixed(0)} kB`);
