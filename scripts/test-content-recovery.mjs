import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-content-recovery-')),storage=new Map();let quota=false;
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(quota)throw Error('fictional_quota');storage.set(k,v);}};
let checks=0;
try {
 const file=join(dir,'test.mjs');await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';export {writeContent} from './src/modules/admin/contentRecovery';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:file});
 const {MockProvider,writeContent}=await import(pathToFileURL(file));const actor={id:'usr_super',role:'super_admin'},fresh=()=>{storage.clear();return new MockProvider();},snap=async d=>JSON.stringify(Object.fromEntries(await Promise.all(['class_templates','teachers','modalities','rooms','faq_entries','audit_log'].map(async t=>[t,await d.list(t)]))));
 const write=(d,i,key='qa',opts={})=>writeContent(d,actor,i,key,{currentActor:()=>actor,...opts});
 for(const table of ['class_templates','teachers','modalities','rooms','faq_entries']){
  let d=fresh(),row=(await d.list(table))[0],field={class_templates:'title',teachers:'display_name',modalities:'name_es',rooms:'name',faq_entries:'question'}[table],value=table==='faq_entries'?{es:'<script>window.qaExecuted=1</script>',en:'FICTIONAL EN & symbols'}:'<script>window.qaExecuted=1</script>',intent={kind:'update',table,before:row,patch:{[field]:value}},before=await snap(d);let events=0;d.subscribe('*',()=>events++);
  for(const failAfterWrites of [1,2]){await assert.rejects(write(d,intent,'failed',{failAfterWrites}));assert.equal(await snap(d),before);assert.equal(events,0);checks++;}
  quota=true;await assert.rejects(write(d,intent));quota=false;assert.equal(await snap(d),before);assert.equal(events,0);checks++;
  await Promise.all([write(d,intent),write(d,intent)]);assert.deepEqual((await d.get(table,row.id))[field],value);const committed=await snap(d);await write(d,intent);assert.equal(await snap(d),committed);assert.equal((await d.list('audit_log')).filter(a=>a.id==='content_action_qa').length,1);assert(!JSON.stringify((await d.list('audit_log')).filter(a=>a.id.includes('content_v1_'))).includes('<script>'));checks++;
  await assert.rejects(write(d,{...intent,patch:{[field]:table==='faq_entries'?{es:'OTHER'}:'OTHER'}},'qa'),/mismatch/);assert.equal(await snap(d),committed);checks++;
  await assert.rejects(write(d,intent,'stale'),/conflict/);assert.equal(await snap(d),committed);checks++;
  const current=await d.get(table,row.id);await assert.rejects(write(d,{kind:'delete',table,before:current},'delete',{failAfterWrites:2}));assert.equal(await snap(d),committed);checks++;
 }
 let d=fresh(),entries=(await d.list('faq_entries')).filter(e=>e.group_key===(d.peek('faq_entries')[0]).group_key),intent={kind:'reorder',table:'faq_entries',entries,id:entries[0].id,dir:1},before=await snap(d);assert(entries.length>=2);
 for(const failAfterWrites of [1,2,entries.length+1]){await assert.rejects(write(d,intent,'reorder',{failAfterWrites}));assert.equal(await snap(d),before);checks++;}
 // Lost acknowledgement after persistence: retry cannot move the same entry a second time.
 const atomic=d.atomic.bind(d);let lost=true;d.atomic=async(...args)=>{const result=await atomic(...args);if(lost){lost=false;throw Error('fictional_lost_ack');}return result;};await assert.rejects(write(d,intent,'lost'));const committed=await snap(d);await write(d,intent,'lost');assert.equal(await snap(d),committed);const ordered=(await d.list('faq_entries')).filter(e=>e.group_key===entries[0].group_key).sort((a,b)=>a.sort-b.sort);assert.equal(ordered[1].id,entries[0].id);checks++;
 d=fresh();entries=(await d.list('faq_entries')).filter(e=>e.group_key===d.peek('faq_entries')[0].group_key);const r=entries[0],patch={question:{es:'FICTIONAL QUESTION',en:'Q'},group_title:{es:'FICTIONAL SECTION',en:'SECTION'},group_lead:{es:'LEAD',en:''},page:2};before=await snap(d);for(const failAfterWrites of [1,2,entries.length+1]){await assert.rejects(write(d,{kind:'update',table:'faq_entries',before:r,patch},'section',{failAfterWrites}));assert.equal(await snap(d),before);checks++;}await write(d,{kind:'update',table:'faq_entries',before:r,patch},'section');assert((await d.list('faq_entries')).filter(e=>e.group_key===r.group_key).every(e=>e.page===2&&e.group_title.es==='FICTIONAL SECTION'));checks++;
 d=fresh();const draft={kind:'create',table:'rooms',patch:{name:'',capacity:12,heated:false,notes:null}};before=await snap(d);await assert.rejects(write(d,draft,'create',{failAfterWrites:2}));assert.equal(await snap(d),before);await Promise.all([write(d,draft,'create'),write(d,draft,'create')]);assert.equal((await d.list('rooms')).length,JSON.parse(before).rooms.length+1);checks++;
 for(const [table,patch] of [['class_templates',{title:'',active:false,duration_min:50,capacity:12}],['teachers',{display_name:'',active:false,rate_per_class:0}],['modalities',{name_es:'',active:false,duration_min:50}],['faq_entries',{group_key:'qa_section',group_title:{es:'FICTIONAL'},group_lead:{es:''},page:1,question:{es:''},answer:{es:''},sort:1,published:false}]]){
  d=fresh();const intent={kind:'create',table,patch},atomic=d.atomic.bind(d);let lost=true;d.atomic=async(...args)=>{const result=await atomic(...args);if(lost){lost=false;throw Error('fictional_lost_ack');}return result;};await assert.rejects(write(d,intent,'newlost'));const committed=await snap(d);await write(d,intent,'newlost');assert.equal(await snap(d),committed);assert.equal(d.peek('audit_log').filter(r=>r.action==='content.create').length,1);checks++;
 }
 for(const table of ['teachers','modalities','faq_entries']){
  d=fresh();const row=d.peek(table)[0],flag=table==='faq_entries'?'published':'active',intent={kind:'update',table,before:row,patch:{[flag]:!row[flag]}},before=await snap(d);await assert.rejects(write(d,intent,'pub',{failAfterWrites:2}));assert.equal(await snap(d),before);await write(d,intent,'pub');const committed=await snap(d);await write(d,intent,'pub');assert.equal(await snap(d),committed);checks++;
 }
 for(const role of ['front_desk','customer','developer','finance']){d=fresh();await assert.rejects(writeContent(d,{id:'usr_super',role},draft,'denied',{currentActor:()=>({id:'usr_super',role})}),/denied/);checks++;}
 d=fresh();let room=d.peek('rooms')[0];await assert.rejects(write(d,{kind:'update',table:'rooms',before:{...room,tenant_id:'foreign'},patch:{name:'X'}},'foreign'),/conflict/);await assert.rejects(write(d,{kind:'update',table:'rooms',before:room,patch:{name:'x'.repeat(501)}},'length'),/invalid/);checks+=2;
 // Tied legacy positions get a deterministic, atomic order.
 d=fresh();entries=d.peek('faq_entries').filter(e=>e.group_key===d.peek('faq_entries')[0].group_key);for(const e of entries)await d.update('faq_entries',e.id,{sort:1});entries=(await d.list('faq_entries')).filter(e=>e.group_key===entries[0].group_key).sort((a,b)=>a.id.localeCompare(b.id));await write(d,{kind:'reorder',table:'faq_entries',entries,id:entries[0].id,dir:1},'ties');assert.equal((await d.list('faq_entries',{orderBy:{column:'sort'}})).filter(e=>e.group_key===entries[0].group_key)[1].id,entries[0].id);checks++;
 console.log(`PASS ${checks} content recovery groups: rollback/no events, exact retry, lost acknowledgement, role/tenant/conflict, section saves, tied FAQ order, literal text and bounds.`);
} finally {await rm(dir,{recursive:true,force:true});}
