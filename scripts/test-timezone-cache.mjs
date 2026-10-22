import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-timezone-cache-'));
const values=new Map(), writes=[];
globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);writes.push(JSON.parse(v));}};
try {
 const outfile=join(dir,'cache.mjs');
 await build({stdin:{contents:"export {MockProvider,SEED_VERSION} from './src/data/MockProvider'; export const setNow = n => virtualNow = n;",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile,define:{Date:'TestDate','import.meta.env.BASE_URL':'"/"'},banner:{js:`let virtualNow=Date.parse('2026-10-23T04:30:00Z'); class TestDate extends Date { constructor(...args){super(...(args.length?args:[virtualNow]));} static now(){return virtualNow;} }`},logLevel:'silent'});
 const {MockProvider,setNow}=await import(pathToFileURL(outfile));
 const stamp=Date.parse('2026-10-23T04:30:00Z');
 for(const tz of ['America/Bogota','UTC','Asia/Tokyo','America/Los_Angeles']) {
  process.env.TZ=tz;setNow(stamp);values.clear();new MockProvider();
  const baseline=JSON.parse(values.get('hoyos.db.v1'));
  baseline.db.class_ledger.push({id:'qa_preserved_terms',tenant_id:'ten_hoy',created_at:'2001-01-01T00:00:00Z',updated_at:'2001-01-01T00:00:00Z',user_id:'usr_cust',reason:'purchase',delta:9,expires_at:'2027-01-31',note:'FICTIONAL sentinel'});
  baseline.db.content_articles[0].title_es='FICTICIO preserved content';
  const purchase=structuredClone(baseline.db.class_ledger),articles=structuredClone(baseline.db.content_articles),bookings=structuredClone(baseline.db.bookings),sessions=structuredClone(baseline.db.class_sessions);
  for(const legacyDay of [new Date(stamp).toDateString(),'Thu Oct 22 2026']) {
   const legacy={...structuredClone(baseline),seededOn:legacyDay};delete legacy.timezone;values.set('hoyos.db.v1',JSON.stringify(legacy));writes.length=0;
   const loaded=new MockProvider();
   assert.deepEqual(writes[0].db,legacy.db,`${tz}: migration changes metadata only`);
   assert.equal(writes[0].timezone,'America/Bogota');assert.equal(writes[0].seededOn,'2026-10-22');
   assert.deepEqual(loaded.peek('class_ledger'),purchase);assert.deepEqual(loaded.peek('content_articles'),articles);
   for(const b of bookings)assert.deepEqual(loaded.peek('bookings').find(r=>r.id===b.id),b);
   for(const s of sessions)assert.deepEqual(loaded.peek('class_sessions').find(r=>r.id===s.id),s,'existing session timestamp unchanged');
   const incoming=structuredClone(legacy);incoming.db.content_articles[0].title_es='FICTICIO old tab';writes.length=0;
   loaded.onStorage({key:'hoyos.db.v1',newValue:JSON.stringify(incoming)});
   assert.deepEqual(loaded.peek('class_ledger'),purchase);assert.deepEqual(loaded.peek('bookings'),bookings);assert.deepEqual(loaded.peek('class_sessions'),sessions);assert.deepEqual(writes[0].db,incoming.db,'old-tab migration changes metadata only');
  }
  // Once marked, normal daily reseeding is based on studio day across device zones.
  values.set('hoyos.db.v1',JSON.stringify(baseline));setNow(Date.parse('2026-10-23T05:01Z'));
  const nextDay=new MockProvider();assert(!nextDay.peek('class_ledger').some(r=>r.id==='qa_preserved_terms'));assert.equal(JSON.parse(values.get('hoyos.db.v1')).seededOn,'2026-10-23');
  console.log(`PASS timezone cache preservation/load/storage/daily boundary: ${tz}`);
 }
} finally {await rm(dir,{recursive:true,force:true});}
