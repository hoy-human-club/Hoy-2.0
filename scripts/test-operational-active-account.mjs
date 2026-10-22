// Actual mock/helper regression. Fictional rows only; never prints document bodies or contacts.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const bundle=await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';export * from './src/modules/admin/emailEdit';export * from './src/modules/admin/expenseLedger';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const dir=await mkdtemp(join(tmpdir(),'hoy-operational-active-')),file=join(dir,'fixture.mjs');await writeFile(file,bundle.outputFiles[0].text);
const {MockProvider,readEmailEdit,writeEmailVersion,readExpenseWorkspace,runExpenseCommand}=await import(pathToFileURL(file));await rm(dir,{recursive:true,force:true});
const stored=new Map();globalThis.localStorage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v)};
const reproduce=process.env.QA_REPRO_INACTIVE==='1',checks=[];
const fresh=()=>{stored.clear();return new MockProvider();};
for(const scope of ['email','expense']){
 const setup=async()=>{const data=fresh();const row=(await data.list('email_templates'))[0];
  const intent={kind:'edit',basis:row,patch:{...Object.fromEntries(['name','audience','priority','trigger','subject','body_mjml','active'].map(k=>[k,row[k]])),name:'FICTIONAL ACTIVE ACCOUNT REGRESSION',active:false}};
  const command={actorId:'usr_admin',role:'admin',type:'create',id:'qa_active_expense',requestId:'qa_active_request',draft:{kind:'variable',category:'supplies',concept:'FICTIONAL ACTIVE ACCOUNT',amount:100,incurred_on:'2026-10-22',paid_on:null,method:'transfer',vendor:null,note:null}};
  return {data,read:()=>scope==='email'?readEmailEdit(data,{id:'usr_admin',role:'admin'},row.id):readExpenseWorkspace(data,{actorId:'usr_admin',role:'admin'}),write:()=>scope==='email'?writeEmailVersion(data,{id:'usr_admin',role:'admin'},intent,'qa_active_request'):runExpenseCommand(data,command),effect:()=>scope==='email'?data.peek('email_templates').find(r=>r.id===row.id).version>row.version:data.peek('expenses').some(r=>r.id===command.id)};};
 let fixture=await setup();await fixture.data.update('users','usr_admin',{status:'inactive'});
 if(reproduce){await fixture.read();await fixture.write();assert(fixture.effect());checks.push(scope+': inactive account read and write proceeded with unchanged role');continue;}
 let before=stored.get('hoyos.db.v1');await assert.rejects(fixture.read(),/missing|scope/);await assert.rejects(fixture.write(),/missing|scope/);assert.equal(stored.get('hoyos.db.v1'),before);assert(!fixture.effect());checks.push(scope+': inactive read/write reject without effects');
 fixture=await setup();const originalList=fixture.data.list.bind(fixture.data);let injected=false;
 fixture.data.list=async(table,q)=>{const rows=await originalList(table,q);if(!injected&&table===(scope==='email'?'email_templates':'expense_templates')){injected=true;await fixture.data.update('users','usr_admin',{status:'inactive'});}return rows;};
 await assert.rejects(fixture.read(),/missing|scope/);assert(injected);assert(!fixture.effect());checks.push(scope+': end of required read rejects newly inactive actor');
 fixture=await setup();let atomic=fixture.data.atomic.bind(fixture.data);fixture.data.atomic=async(...args)=>{await fixture.data.update('users','usr_admin',{status:'inactive'});return atomic(...args);};await assert.rejects(fixture.write(),/missing|scope/);assert(!fixture.effect());checks.push(scope+': fresh staged account rejects before business write');
 fixture=await setup();atomic=fixture.data.atomic.bind(fixture.data);fixture.data.atomic=async(...args)=>{const result=await atomic(...args);await fixture.data.update('users','usr_admin',{status:'inactive'});return result;};await assert.rejects(fixture.write(),/missing|scope/);assert(fixture.effect(),'postcommit loss retains fact');fixture.data.atomic=atomic;await fixture.data.update('users','usr_admin',{status:'active'});before=stored.get('hoyos.db.v1');await fixture.write();assert.equal(stored.get('hoyos.db.v1'),before,'restored exact retry must not duplicate');checks.push(scope+': postcommit inactive withholds acknowledgement; restored same intent replays without writes');
}
await writeFile('docs/frontend-completion/evidence/operational-active-account-'+(reproduce?'repro':'regression')+'.json',JSON.stringify({checks,mode:reproduce?'actual pre-fix counterexample':'actual repaired helper regression',limits:'Only scoped fictional command boundary. No auth/session/role policy or production changes.'},null,2)+'\n');
console.log('PASS operational active-account '+(reproduce?'counterexample':'regression')+': '+checks.length+' checks');
