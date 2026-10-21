// OT-03 local UI drafts only; no report service or external dispatch.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const scratch=await mkdtemp(join(tmpdir(),'hoy-problem-draft-'));
try {
 const out=join(scratch,'draft.mjs');await build({entryPoints:['src/components/organism/ProblemReport/problemDraft.ts'],bundle:true,platform:'node',format:'esm',outfile:out,logLevel:'silent'});
 const {problemDraftErrors,problemDraftKey,readProblemDraft,saveProblemDraft}=await import(pathToFileURL(out));
 const context={tenantId:'qa_tenant',actorId:'qa_actor',actorName:'QA Fictional Reporter',role:'customer',route:'#/hub'};
 let writes=0,fail=false,readFailure=false;const values=new Map(),storage={getItem:key=>{if(readFailure)throw Error('qa_read_unavailable');return values.get(key)??null;},setItem:(key,value)=>{if(fail)throw Error('qa_quota');writes++;values.set(key,value);}};
 assert.equal(readProblemDraft(storage,context),null);
 for(const [title,description] of [['',''],['ab','too short'],['x'.repeat(121),'valid fictional description'],['valid','x'.repeat(2001)]]) {
  const errors=problemDraftErrors(title,description);assert(errors.title||errors.description);
  assert.throws(()=>saveProblemDraft(storage,context,{id:'qa_draft',title,description}),/validation/);
 }
 assert.equal(writes,0,'validation/cancel before save does not persist');
 const input={id:'qa_draft',title:'  QA demo issue  ',description:'  Fictional reproduction steps and expected result.  '};
 fail=true;assert.throws(()=>saveProblemDraft(storage,context,input),/qa_quota/);assert.equal(readProblemDraft(storage,context),null);
 fail=false;const first=saveProblemDraft(storage,context,input,'2026-10-21T23:00:00Z');
 assert.equal(first.title,'QA demo issue');assert.equal(first.description,'Fictional reproduction steps and expected result.');
 assert.equal(first.actorId,context.actorId);assert.equal(first.route,'#/hub');assert.equal(first.role,'customer');
 assert.deepEqual(saveProblemDraft(storage,context,input,'2026-10-22T00:00:00Z'),first);assert.equal(writes,1,'same draft retry does not rewrite or duplicate');
 assert.deepEqual(readProblemDraft(storage,context),first);
 readFailure=true;assert.throws(()=>readProblemDraft(storage,context),/qa_read_unavailable/);assert.throws(()=>saveProblemDraft(storage,context,input),/qa_read_unavailable/);readFailure=false;assert.deepEqual(readProblemDraft(storage,context),first);
 for(const other of [{...context,actorId:'qa_other'},{...context,role:'finance'},{...context,tenantId:'qa_other'}])assert.equal(readProblemDraft(storage,other),null,'scope separated');
 const prior=values.get(problemDraftKey(context));fail=true;assert.throws(()=>saveProblemDraft(storage,context,{...input,title:'QA edited issue'}),/quota/);assert.equal(values.get(problemDraftKey(context)),prior,'failed edit preserves saved copy');
 fail=false;values.set(problemDraftKey(context),'invalid');assert.throws(()=>readProblemDraft(storage,context));
 values.set(problemDraftKey(context),JSON.stringify({...first,actorId:'qa_other'}));assert.throws(()=>readProblemDraft(storage,context),/invalid/);
 console.log('PASS OT-03 local draft validation, no-save cancellation, scoped context, persistence failure, retry/idempotency, unchanged prior draft, invalid storage; no report dispatch.');
} finally {await rm(scratch,{recursive:true,force:true});}
