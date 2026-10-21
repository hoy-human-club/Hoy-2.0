import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-provider-'));
try {
 const out=join(dir,'provider.mjs');await build({entryPoints:['src/data/MockProvider.ts'],bundle:true,platform:'node',format:'esm',outfile:out,define:{'import.meta.env.BASE_URL':'"/"'}});
 const stored=new Map();let fail=false;
 globalThis.localStorage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>{if(fail)throw new Error('quota');stored.set(k,v);}};
 const {MockProvider}=await import(pathToFileURL(out));const data=new MockProvider();
 const old=await data.list('class_templates');assert.equal((await data.list('class_pay_rules')).length,0,'no retrospective pay defaults');
 const created=await data.insert('class_templates',{...old[0],id:'new-default-class',active:false,generation_mode:'manual'});
 const rules=await data.list('class_pay_rules');assert.equal(rules.length,1);assert.equal(rules[0].flat_amount,100000);assert.equal(rules[0].template_id,created.id);
 for(const action of [()=>data.insert('class_pay_rules',{}),()=>data.update('class_pay_rules',rules[0].id,{flat_amount:1}),()=>data.remove('class_pay_rules',rules[0].id)])await assert.rejects(action,/atomic_command/);
 fail=true;
 await assert.rejects(()=>data.update('class_templates',created.id,{title:'Not saved'}),/quota/);
 assert.equal((await data.get('class_templates',created.id)).title,created.title,'failed update rolls memory back');
 await assert.rejects(()=>data.insert('class_templates',{...created,id:'quota-class'}),/quota/);
 assert.equal(await data.get('class_templates','quota-class'),null);assert.equal((await data.list('class_pay_rules')).length,1,'default pay insert rolls back with class');
 const before=await data.get('class_templates',created.id);
 await assert.rejects(()=>data.contentBatch({table:'class_templates',changes:[{id:created.id,before,patch:{active:true}}],role:'admin',actorId:'usr_admin'}),/quota/);
 assert.equal((await data.get('class_templates',created.id)).active,false);
 fail=false;
 const raw=JSON.parse(stored.get('hoyos.db.v1'));delete raw.db.class_pay_rules;raw.db.class_templates[0].title='Preserved local edit';stored.set('hoyos.db.v1',JSON.stringify(raw));
 const migrated=new MockProvider();assert.equal((await migrated.list('class_templates'))[0].title,'Preserved local edit');assert.equal((await migrated.list('class_pay_rules')).length,0);
 console.log('Provider: new-only flat default, append-only guard, storage failure rollback, atomic default rollback and non-destructive migration passed');
} finally {await rm(dir,{recursive:true,force:true});}
