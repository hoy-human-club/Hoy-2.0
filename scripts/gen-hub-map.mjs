// Writes public/hub-map.json — the hub map (schema hoy.hub-map/1, contract src/hub/hubMap.types.ts,
// docs/reference/hub-map.md) other hosts read to draw the hoy hub through their own lens.
//
// Sources, no browser: the hand-written half is src/hub/hubMap.data.ts (the same module HUB-01
// renders from); the route half is the live route registry (src/app/registry.ts → routeManifest()),
// loaded through Vite's SSR module loader so import.meta.glob, TS and JSX resolve exactly as in the
// app. Captures come from docs/screenshots/<code>/ (scripts/lib/hubShots.mjs decides which ones).
// The output is deterministic (no clock: generatedAt is the date of the latest changelog entry) and is
// validated against the contract before it is written; any problem exits 1 and fails the build.
// Usage: npm run hub-map   (also the first step of npm run build)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { planShots, SHOTS_DIR, PRIVATE_CAPTURE_CODES } from './lib/hubShots.mjs';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('public/hub-map.json', ROOT);
const pkg = JSON.parse(readFileSync(new URL('package.json', ROOT), 'utf8'));

/** Date of the highest-numbered changelog entry, as an ISO timestamp — stable across runs. */
function generatedAt() {
  const dir = new URL('docs/changelog/', ROOT);
  const last = readdirSync(dir).filter((f) => /^\d{4}-.*\.md$/.test(f)).sort().pop();
  const date = last && readFileSync(new URL(last, dir), 'utf8').match(/^date:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
  if (!date) throw new Error(`no date: line in docs/changelog/${last}`);
  return `${date}T00:00:00.000Z`;
}

/** Which experience a route belongs to: by surface, then by route prefix. */
function experienceOf(path, surface) {
  const under = (p) => path === p || path.startsWith(`${p}/`);
  switch (surface) {
    case 'customer': return 'app';
    case 'teacher': return 'teacher';
    case 'staff': return under('/staff/inbox') ? 'inbox' : under('/staff/register') ? 'pos' : 'desk';
    case 'admin':
      if (under('/admin/emails') || under('/admin/whatsapp')) return 'messages'; // 0048: M-04 + M-05, one card
      return under('/admin/crm') ? 'crm' : under('/admin/finance') ? 'finance' : 'admin';
    case 'dev': return under('/dev/knowledgebase') ? 'kb' : 'dev';
    case 'docs': return under('/manual') ? 'manual' : under('/docs/source') ? 'sources' : 'docs';
    case 'public':
      if (under('/hub/promotions') || under('/promotions')) return 'promotions';
      if (path === '/' || under('/coming-soon')) return 'coming-soon';
      if (under('/site')) return 'site';
      if (path === '/hub') return 'dev'; // the testing hub itself sits with the dev tools
      return 'app'; // /no-access (E-05): the edge state a signed-in member meets
    default: return null;
  }
}

/** React Router style match: static segments, :params, a trailing *. */
function matches(pattern, path) {
  const re = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\/\*$/, '(?:/.*)?').replace(/:\w+/g, '[^/]+')}$`);
  return re.test(path);
}

const server = await createServer({
  root: ROOT.pathname, logLevel: 'error', appType: 'custom', configFile: new URL('vite.config.ts', ROOT).pathname,
  server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] },
});
let map, problems = [], plan;
try {
  const { getRoutes } = await server.ssrLoadModule('/src/app/registry.ts');
  const { routeManifest } = await server.ssrLoadModule('/src/app/manifest.ts');
  const data = await server.ssrLoadModule('/src/hub/hubMap.data.ts');
  const { checkHubMapData } = await server.ssrLoadModule('/src/hub/hubMap.check.ts');
  problems.push(...checkHubMapData());

  const routes = getRoutes();
  const manifest = routeManifest(routes);
  const base = data.HOY_BASE_URL;
  const url = (route) => `${base}#${route}`;
  const expById = new Map(data.HUB_EXPERIENCES.map((e) => [e.id, e]));
  const roleIds = new Set(data.HUB_ROLES.map((r) => r.id));

  // One page per code: first route in registry order, roles unioned over every route of the code.
  const pagesByCode = new Map();
  manifest.forEach((m, i) => {
    const nav = routes[i].nav;
    const hit = pagesByCode.get(m.code);
    if (hit) { for (const r of m.roles) if (!hit.roles.includes(r)) hit.roles.push(r); if (nav && (hit.navOrder === undefined || nav.order < hit.navOrder)) hit.navOrder = nav.order; return; }
    pagesByCode.set(m.code, { m, index: i, roles: [...m.roles], navOrder: nav?.order });
  });
  const codes = [...pagesByCode.keys()];
  const entryCodes = new Set([...data.HUB_EXPERIENCES.map((e) => e.code), ...data.HUB_TOOL_LIST.map((t) => t.code)]);
  plan = planShots(ROOT, codes, entryCodes);
  const shotsOf = (code) => plan.byCode.get(code) ?? { thumbs: {}, full: {} };

  const pages = [...pagesByCode.values()].map(({ m, roles }) => {
    const experienceId = experienceOf(m.path, m.surface);
    const e = expById.get(experienceId);
    if (!e) problems.push(`page ${m.code} ${m.path}: no experience for surface ${m.surface}`);
    const group = data.hubGroupOf(m.path);
    if (!group) problems.push(`page ${m.code} ${m.path}: no group rule in HUB_GROUP_RULES (src/hub/hubMap.data.ts)`);
    const sample = m.path.includes(':') ? data.HUB_SAMPLE_ROUTES[m.path] : undefined;
    if (m.path.includes(':') && !sample) problems.push(`page ${m.code} ${m.path}: template route without a sample in HUB_SAMPLE_ROUTES (src/hub/hubMap.data.ts)`);
    if (sample && (sample.route.includes(':') || !matches(m.path, sample.route))) problems.push(`page ${m.code}: sample ${sample.route} does not fit ${m.path}`);
    return {
      code: m.code, route: m.path, name: m.spec.name, purpose: m.spec.purpose, surface: m.surface, roles,
      experienceId: experienceId ?? '', device: e?.device ?? 'desktop', status: m.status,
      actions: (m.spec.actions ?? []).map((a) => a.id), shots: shotsOf(m.code),
      ...(group ? { group: { id: group.id, label: group.label, order: group.order } } : {}),
      ...(sample ? { sampleRoute: sample.route } : {}),
    };
  });

  const navRank = (code) => { const p = pagesByCode.get(code); return [p.navOrder ?? Number.POSITIVE_INFINITY, p.index]; };
  const experiences = data.HUB_EXPERIENCES.map((e) => {
    const entry = manifest.find((m) => m.path === e.route);
    if (!entry) problems.push(`experience ${e.id}: route ${e.route} is not registered`);
    else if (entry.code !== e.code) problems.push(`experience ${e.id}: route ${e.route} is ${entry.code}, data says ${e.code}`);
    const pageCodes = pages.filter((p) => p.experienceId === e.id).map((p) => p.code)
      .sort((a, b) => { const [na, ia] = navRank(a), [nb, ib] = navRank(b); return na - nb || ia - ib; });
    return {
      id: e.id, code: e.code, label: e.label, purpose: e.purpose, roleId: e.roleId, roles: entry ? [...entry.roles] : [],
      band: e.band, device: e.device, route: e.route, url: url(e.route),
      ...(e.featured ? { featured: true } : {}),
      ...(e.secondary ? { secondary: { label: e.secondary.label, route: e.secondary.route } } : {}),
      ...(e.comingSoon ? { comingSoon: true } : {}),
      // A coming-soon card (0031) owns no pages yet: its route is where the role works today.
      pageCodes: e.comingSoon ? [] : pageCodes, shots: shotsOf(e.code),
    };
  });

  const tools = data.HUB_TOOL_LIST.map((t) => {
    const hit = manifest.find((m) => m.path === t.route) ?? manifest.find((m) => matches(m.path, t.route));
    if (!hit) problems.push(`tool ${t.id}: route ${t.route} matches no registered route`);
    else if (hit.code !== t.code) problems.push(`tool ${t.id}: route ${t.route} is ${hit.code}, data says ${t.code}`);
    return { id: t.id, code: t.code, label: t.label, purpose: t.purpose, route: t.route, url: url(t.route), device: 'desktop', shots: shotsOf(t.code) };
  });

  map = {
    schema: data.HUB_MAP_SCHEMA,
    generatedAt: generatedAt(),
    product: {
      id: data.HOY_PRODUCT.id, name: data.HOY_PRODUCT.name, tagline: data.HOY_PRODUCT.tagline, version: pkg.version,
      baseUrl: base, hubRoute: data.HUB_ROUTE, brand: { accent: data.HOY_PRODUCT.accent, wordmark: data.HOY_PRODUCT.wordmark },
    },
    embed: { pattern: data.EMBED_PATTERN, note: data.EMBED_NOTE },
    roles: data.HUB_ROLES.map((r) => ({
      id: r.id, label: r.label, description: r.description, band: r.band, home: r.home, device: r.device,
      ...(r.demoUser ? { demoUser: { id: r.demoUser.id, firstName: r.demoUser.firstName } } : {}),
      look: r.look, props: [r.props[0], r.props[1]],
    })),
    experiences, pages, tools,
    lenses: Object.fromEntries(['aluzina', 'between-gigs', 'standalone'].map((id) => {
      const l = data.HUB_LENSES[id];
      return [id, { title: l.title, framing: l.framing, groupBy: l.groupBy, showTools: l.showTools, entry: l.entry }];
    })),
  };

  // Contract checks beyond the types.
  if (data.HUB_SHOTS_DIR !== SHOTS_DIR) problems.push(`HUB_SHOTS_DIR ${data.HUB_SHOTS_DIR} ≠ scripts/lib/hubShots.mjs ${SHOTS_DIR}`);
  const DEVICES = new Set(['phone', 'tablet', 'desktop', 'page', 'sheet']);
  const PROPS = new Set('laptop phone clipboard tape contract calculator plans ruler sketchbook pencils samples swatches board stamp hardhat tablet book keys mug rating'.split(' '));
  const pageCodes = new Set(pages.map((p) => p.code));
  const hasShots = (s) => Object.keys(s.thumbs).length + Object.keys(s.full).length > 0;
  const bi = (x, where) => { if (!x || typeof x.es !== 'string' || !x.es || typeof x.en !== 'string' || !x.en) problems.push(`${where}: missing es/en text`); };
  for (const r of map.roles) {
    bi(r.label, `role ${r.id} label`); bi(r.description, `role ${r.id} description`);
    if (!DEVICES.has(r.device)) problems.push(`role ${r.id}: bad device ${r.device}`);
    for (const p of r.props) if (!PROPS.has(p)) problems.push(`role ${r.id}: prop ${p} is not in the vocabulary`);
  }
  for (const e of experiences) {
    bi(e.label, `experience ${e.id} label`); bi(e.purpose, `experience ${e.id} purpose`);
    if (!roleIds.has(e.roleId)) problems.push(`experience ${e.id}: roleId ${e.roleId} is not a role`);
    for (const r of e.roles) if (!roleIds.has(r)) problems.push(`experience ${e.id}: role ${r} is not a role`);
    if (!DEVICES.has(e.device)) problems.push(`experience ${e.id}: bad device ${e.device}`);
    if (e.comingSoon) { if (e.pageCodes.length) problems.push(`experience ${e.id}: coming soon but owns pages`); }
    else {
      if (!e.pageCodes.length) problems.push(`experience ${e.id}: no pages`);
      if (!e.pageCodes.includes(e.code)) problems.push(`experience ${e.id}: entry code ${e.code} is not among its pageCodes`);
    }
    for (const c of e.pageCodes) if (!pageCodes.has(c)) problems.push(`experience ${e.id}: pageCode ${c} does not exist`);
    if (!hasShots(e.shots)) problems.push(`experience ${e.id}: no shots for ${e.code}`);
  }
  for (const p of pages) {
    bi(p.name, `page ${p.code} name`); bi(p.purpose, `page ${p.code} purpose`);
    for (const r of p.roles) if (!roleIds.has(r)) problems.push(`page ${p.code}: role ${r} is not a role`);
    if (p.group) bi(p.group.label, `page ${p.code} group ${p.group.id} label`);
    if (!PRIVATE_CAPTURE_CODES.has(p.code) && !hasShots(p.shots)) problems.push(`page ${p.code}: no shots in docs/screenshots/${p.code}/`);
  }
  for (const t of tools) {
    if (!pageCodes.has(t.code)) problems.push(`tool ${t.id}: code ${t.code} does not exist`);
    if (!hasShots(t.shots)) problems.push(`tool ${t.id}: no shots for ${t.code}`);
  }
  const templates = new Set(pages.map((p) => p.route));
  for (const pattern of Object.keys(data.HUB_SAMPLE_ROUTES)) if (!templates.has(pattern)) problems.push(`HUB_SAMPLE_ROUTES ${pattern}: no page has this route`);
  const inExperience = new Set(experiences.flatMap((e) => e.pageCodes));
  for (const c of pageCodes) if (!inExperience.has(c)) problems.push(`page ${c} belongs to no experience`);
} finally {
  await server.close();
}

if (problems.length) {
  console.error(`hub-map: ${problems.length} problem(s), public/hub-map.json not written:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
const json = `${JSON.stringify(map, null, 2)}\n`;
writeFileSync(OUT, json);
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
console.log(`wrote public/hub-map.json · ${map.schema} v${map.product.version} · ${map.roles.length} roles, ${map.experiences.length} experiences, ${map.pages.length} pages, ${map.tools.length} tools · ${(json.length / 1024).toFixed(0)} kB · shots ${mb(plan.bytes)}${plan.trimmed ? ` (trimmed from ${mb(plan.untrimmedBytes)}: full captures only for experience and tool entry pages)` : ''}`);
