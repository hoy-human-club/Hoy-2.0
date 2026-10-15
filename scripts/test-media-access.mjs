import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const temp = await mkdtemp(join(tmpdir(), 'hoy-media-access-'));
try {
 const outfile = join(temp, 'model.mjs');
 await build({ stdin: { contents: "export { matchesMediaQuery } from './src/data/mediaLibrary'; export { placementTarget } from './src/components/organism/MediaLibrary/placementTarget'; export { strings } from './src/modules/media/strings';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent' });
 const { matchesMediaQuery, placementTarget, strings } = await import(pathToFileURL(outfile));
 const asset = { name: 'Studio red', tags: ['studio'], usages: [{ label: 'Home', path: '/site' }, { label: 'Coming soon', path: '/' }] };
 for (const query of ['Inicio', 'Home', 'Próximamente', 'proximamente', 'COMING SOON', ' studio ']) assert(matchesMediaQuery(asset, query, strings), query);
 assert(!matchesMediaQuery(asset, 'no-matching-placement', strings));
 const routes = [
  { path: '/app/teachers/:id', roles: ['customer','teacher'], spec: {code:'C-18'} },
  { path: '/app/events/:id', roles: ['customer','teacher'], spec: {code:'C-23'} },
  { path: '/app/rules', roles: ['customer','teacher'], spec: {code:'C-13'} },
  { path: '/app/schedule', roles: ['customer','teacher'], spec: {code:'C-02'} },
  { path: '/site', roles: ['public'], spec: {code:'W-01'} },
  { path: '/dev/components', roles: ['developer','super_admin'], spec: {code:'D-02'} },
  { path: '/docs/*', roles: ['public'], spec: {code:'K-02'} },
 ];
 const allowed = role => roles => roles.includes('public') || roles.includes(role) || role === 'super_admin';
 for (const role of ['admin','coordinator','marketing']) {
  for (const [path,code] of [['/app/teachers/tea_leandro','C-18'],['/app/events/event_test','C-23'],['/app/rules','C-13'],['/app/schedule','C-02'],['/dev/components','D-02']]) assert.deepEqual(placementTarget(path,routes,allowed(role)),{to:`/docs/pages/${code}`,documented:true});
  assert.deepEqual(placementTarget('/site?version=photos',routes,allowed(role)),{to:'/site?version=photos',documented:false});
 }
 for (const role of ['customer','teacher','super_admin']) assert.deepEqual(placementTarget('/app/teachers/tea_leandro',routes,allowed(role)),{to:'/app/teachers/tea_leandro',documented:false});
 assert.equal(placementTarget('/not-a-route',routes,allowed('admin')),null);
 assert.equal(placementTarget('/app/rules',routes,()=>false),null);
 console.log('Media access: Spanish/English and accent-free search, three content roles, all four customer placement types, developer placements, authorized direct links and missing destinations passed');
} finally { await rm(temp,{recursive:true,force:true}); }
