// Every markdown file and image under docs/ at build time. Adding a doc needs no code change.
// Metadata (title, header lines, headings…) is computed at build time by scripts/lib/docmeta.mjs
// (`?docmeta`); the bodies are separate `?raw` chunks fetched only when a page opens one.
import { useEffect, useState } from 'react';

/** What scripts/lib/docmeta.mjs extracts from one markdown file. */
export interface DocMeta {
  title: string;
  meta: Record<string, string>;
  words: number;
  figures: number;
  headings: string[];
  decisions: { section: string; text: string }[];
  placeholders: string[];
  /** `> EN HOYOS:` screen boxes in a manual chapter (0031); absent for other docs before 0031. */
  screenBoxes?: number;
}

const metaFiles = import.meta.glob<DocMeta>('../../../docs/**/*.md', { query: '?docmeta', import: 'default', eager: true });
const rawFiles = import.meta.glob<string>('../../../docs/**/*.md', { query: '?raw', import: 'default' });
const assets = import.meta.glob<string>(['../../../docs/**/*.{png,jpg,jpeg,gif,svg,webp}', '!../../../docs/screenshots/M-14/**', '!../../../docs/screenshots/M-14a/**'], { query: '?url', import: 'default', eager: true });

const strip = (k: string) => k.replace(/^(\.\.\/)+/, ''); // → 'docs/…'

export interface DocEntry { path: string; title: string; dir: string; meta: Record<string, string>; info: DocMeta }

export const docs: DocEntry[] = Object.entries(metaFiles).map(([k, info]) => {
  const path = strip(k);
  return { path, title: info.title, dir: path.split('/').slice(1, -1).join('/'), meta: info.meta, info };
}).sort((a, b) => a.path.localeCompare(b.path));

const loaders = new Map(Object.entries(rawFiles).map(([k, load]) => [strip(k), load]));
const cache = new Map<string, string>();

/** The full markdown of a doc, fetched once and cached. Rejects for a path that is not under docs/. */
export async function loadDoc(path: string): Promise<string> {
  const hit = cache.get(path);
  if (hit !== undefined) return hit;
  const load = loaders.get(path);
  if (!load) throw new Error(`no such doc: ${path}`);
  const source = await load();
  cache.set(path, source);
  return source;
}

/** Sources of several docs at once (lists that read every entry's body). */
export const loadDocs = (paths: string[]) => Promise.all(paths.map(loadDoc));

/** The body of one doc for a component: `undefined` while it loads or when `path` is empty. */
export function useDocSource(path: string | undefined): string | undefined {
  const [source, setSource] = useState<string | undefined>(() => (path ? cache.get(path) : undefined));
  useEffect(() => {
    if (!path) { setSource(undefined); return; }
    const hit = cache.get(path);
    if (hit !== undefined) { setSource(hit); return; }
    let alive = true;
    setSource(undefined);
    loadDoc(path).then((s) => { if (alive) setSource(s); }).catch(() => { if (alive) setSource(''); });
    return () => { alive = false; };
  }, [path]);
  return source;
}

/** The bodies of many docs, keyed by path; only the paths already loaded are present until the rest arrive. */
export function useDocSources(paths: string[]): Record<string, string> {
  const key = paths.join('\n');
  const [sources, setSources] = useState<Record<string, string>>(() => Object.fromEntries(paths.flatMap((p) => (cache.has(p) ? [[p, cache.get(p)!]] : []))));
  useEffect(() => {
    let alive = true;
    const list = key ? key.split('\n') : [];
    loadDocs(list).then((all) => { if (alive) setSources(Object.fromEntries(list.map((p, i) => [p, all[i]]))); }).catch(() => undefined);
    return () => { alive = false; };
  }, [key]);
  return sources;
}

export const assetUrl = (path: string): string | undefined => {
  const hit = Object.entries(assets).find(([k]) => strip(k) === path);
  return hit?.[1];
};

/** Every image under docs/screenshots grouped by page-code folder. */
export function screenshotGroups(): { code: string; files: { path: string; name: string; url: string }[] }[] {
  const out = new Map<string, { path: string; name: string; url: string }[]>();
  for (const [k, url] of Object.entries(assets)) {
    const path = strip(k);
    const m = path.match(/^docs\/screenshots\/([^/]+)\/([^/]+)$/);
    if (!m) continue;
    if (!out.has(m[1])) out.set(m[1], []);
    out.get(m[1])!.push({ path, name: m[2], url });
  }
  return [...out.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([code, files]) => ({ code, files: files.sort((a, b) => a.name.localeCompare(b.name)) }));
}

export const docByPath = (path: string) => docs.find((d) => d.path === path);

/** Route for a docs path: 'docs/rules/documentation.md' → '/docs/rules/documentation'. Manual chapters go to their own viewer. */
export function docsRoute(path: string): string | undefined {
  const manual = path.match(/^docs\/ops-manual\/(?:es|en)\/([^/]+)\.md$/);
  if (manual) return `/manual/${manual[1]}`;
  if (path === 'docs/ops-manual/README.md') return '/manual';
  if (path.startsWith('docs/')) return `/docs/${path.slice(5).replace(/\.md$/, '')}`;
  return undefined;
}

export interface DocGroup { key: string; label: { es: string; en: string }; items: { title: string; to: string; path?: string }[] }

const numbered = (prefix: string) => docs.filter((d) => d.path.startsWith(prefix) && /\/\d{4}-/.test(d.path)).sort((a, b) => b.path.localeCompare(a.path));

/** Sidebar tree for /docs, grouped by purpose (not by folder). */
export function docGroups(): DocGroup[] {
  const one = (path: string, title?: string) => { const d = docByPath(path); return d ? [{ title: title ?? d.title, to: docsRoute(path)!, path }] : []; };
  const arch = ['docs/architecture.md', 'docs/roles.md', 'docs/i18n.md', 'docs/design-system.md'].flatMap((p) => one(p));
  const pages = docs.filter((d) => d.path.startsWith('docs/pages/') && !/README|_TEMPLATE/.test(d.path)).map((d) => ({ title: d.title, to: docsRoute(d.path)!, path: d.path }));
  const pagesMeta = docs.filter((d) => d.path.startsWith('docs/pages/') && /README|_TEMPLATE/.test(d.path)).map((d) => ({ title: d.title, to: docsRoute(d.path)!, path: d.path }));
  const known = new Set(['docs/README.md', 'docs/kanban.md', 'docs/flow-map.md', 'docs/data-model.md', ...arch.map((a) => a.path!)]);
  const other = docs.filter((d) => !known.has(d.path) && !/^docs\/(rules|prompts|changelog|pages|screenshots|ops-manual)\//.test(d.path)).map((d) => ({ title: d.title, to: docsRoute(d.path)!, path: d.path }));
  return [
    { key: 'overview', label: { es: 'Inicio', en: 'Overview' }, items: one('docs/README.md') },
    { key: 'rules', label: { es: 'Reglas', en: 'Rules' }, items: docs.filter((d) => d.path.startsWith('docs/rules/')).map((d) => ({ title: d.title, to: docsRoute(d.path)!, path: d.path })) },
    { key: 'architecture', label: { es: 'Arquitectura', en: 'Architecture' }, items: [...arch, ...other] },
    { key: 'data', label: { es: 'Modelo de datos', en: 'Data model' }, items: one('docs/data-model.md') },
    { key: 'flow', label: { es: 'Mapa de flujo', en: 'Flow map' }, items: one('docs/flow-map.md') },
    { key: 'kanban', label: { es: 'Kanban', en: 'Kanban' }, items: one('docs/kanban.md') },
    { key: 'changelog', label: { es: 'Changelog', en: 'Changelog' }, items: [{ title: `${numbered('docs/changelog/').length} ·`, to: '/docs/changelog' }, ...numbered('docs/changelog/').map((d) => ({ title: d.title, to: docsRoute(d.path)!, path: d.path }))] },
    { key: 'prompts', label: { es: 'Prompts', en: 'Prompts' }, items: [{ title: `${numbered('docs/prompts/').length} ·`, to: '/docs/prompts' }, ...numbered('docs/prompts/').map((d) => ({ title: d.title, to: docsRoute(d.path)!, path: d.path }))] },
    { key: 'pages', label: { es: 'Páginas', en: 'Pages' }, items: [...pagesMeta, ...pages] },
    { key: 'screenshots', label: { es: 'Capturas', en: 'Screenshots' }, items: [{ title: `${screenshotGroups().length} ·`, to: '/docs/screenshots' }] },
    { key: 'manual', label: { es: 'Manual de operaciones', en: 'Operations manual' }, items: [{ title: '→ /manual', to: '/manual' }] },
  ].filter((g) => g.items.length);
}
