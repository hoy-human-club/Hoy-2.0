// Fictional-only regression gates for approved no-refund and :00–:50 defaults.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const scratch=await mkdtemp(join(tmpdir(),'hoy-audit-policy-')),results=[];
async function check(name,run){try{await run();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
try{
 const file=join(scratch,'policy.mjs');await build({stdin:{contents:"export {roleCan} from './src/auth/permissions'; export {ROLES} from './src/auth/roles'; export {buildSeed} from './src/data/seed'; export {MockProvider} from './src/data/MockProvider'; export {generateRecurrence} from './src/data/classRecurrence';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:file,logLevel:'silent'});
 const {roleCan,ROLES,buildSeed,MockProvider,generateRecurrence}=await import(pathToFileURL(file));
 await check('no role can request a new refund',()=>{for(const role of ROLES)assert.equal(roleCan(role,'payments.refund'),false,role);});
 await check('new fictional timetable uses :00–:50',()=>{const d=buildSeed();assert.equal(d.class_templates.filter(t=>t.active).length,30);for(const t of d.class_templates.filter(t=>t.active)){assert.match(t.start_time,/:00$/);assert.equal(t.duration_min,50);}for(const s of d.class_sessions){assert.equal(Date.parse(s.ends_at)-Date.parse(s.starts_at),50*60000);assert.equal(new Date(s.starts_at).getUTCMinutes(),0);assert.equal(new Date(s.ends_at).getUTCMinutes(),50);}});
 await check('content preview fallback uses the approved duration default',async()=>{const s=await readFile('src/modules/admin/ContentPage.tsx','utf8');assert(!s.includes('d.duration_min ?? 60'));assert(s.includes('duration_min: tenant.classDefaults.durationMin'));assert(s.includes("start_time: '07:00'"));});
 await check('existing same-day historical, booked and staff-edited schedule rows retain their bytes',async()=>{const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};let p=new MockProvider();const stored=JSON.parse(values.get('hoyos.db.v1'));const t=stored.db.class_templates[0];t.start_time='07:10';t.duration_min=60;t.title='FICTIONAL staff-edited historical timetable';for(const s of stored.db.class_sessions.filter(s=>s.template_id===t.id)){s.starts_at=new Date(Date.parse(s.starts_at)+10*60000).toISOString();s.ends_at=new Date(Date.parse(s.starts_at)+60*60000).toISOString();}const before=JSON.stringify({template:t,sessions:stored.db.class_sessions.filter(s=>s.template_id===t.id),bookings:stored.db.bookings,payments:stored.db.payments,ledger:stored.db.class_ledger});values.set('hoyos.db.v1',JSON.stringify(stored));p=new MockProvider();const after=JSON.stringify({template:p.peek('class_templates').find(x=>x.id===t.id),sessions:p.peek('class_sessions').filter(s=>s.template_id===t.id&&stored.db.class_sessions.some(o=>o.id===s.id)),bookings:p.peek('bookings'),payments:p.peek('payments'),ledger:p.peek('class_ledger')});assert.equal(after,before);});
 console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
}finally{await rm(scratch,{recursive:true,force:true});}
