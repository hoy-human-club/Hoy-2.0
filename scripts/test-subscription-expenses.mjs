import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=await mkdtemp(join(tmpdir(),'subscription-expenses-'));
try {
 await build({entryPoints:['src/data/subscriptionExpenses.ts','src/data/expenseCalc.ts'],bundle:true,platform:'node',format:'esm',outdir:dir,outExtension:{'.js':'.mjs'}});
 const {subscriptionExpensePreview}=await import(join(dir,'subscriptionExpenses.mjs'));
 const {dueDatesFor,fixedExpensesFor}=await import(join(dir,'expenseCalc.mjs'));
 const period={start:'2024-02-01',end:'2024-02-29'};
 assert.deepEqual(dueDatesFor({cadence:'monthly',anchor_day:31},period),['2024-02-29']);
 assert.deepEqual(dueDatesFor({cadence:'biweekly',anchor_day:1},period),['2024-02-01','2024-02-16']);
 const template={id:'a',active:true,cadence:'monthly',anchor_day:31,amount:10,category:'software',concept:'Test',vendor:null};
 assert.equal(fixedExpensesFor(period,[template,template],[]).drafts.length,1);
 const d={dependencies:[{id:'a',product:'QA',provider:'QA'}],subscriptions:[{id:'s',dependencyId:'a',status:'active',currency:'COP',interval:'monthly',expectedAmount:10,nextChargeDate:'2024-01-31',anchorDay:31}]};
 const first=subscriptionExpensePreview(d,period,[]);assert.equal(first.drafts.length,1);assert.equal(first.drafts[0].amount,10);
 assert.equal(subscriptionExpensePreview(d,period,first.drafts).drafts.length,0);
 for(const patch of [{currency:'USD'},{expectedAmount:null},{interval:'biweekly'},{interval:'yearly'},{status:'cancelled'},{nextChargeDate:'2024-03-31'}])assert.equal(subscriptionExpensePreview({...d,subscriptions:[{...d.subscriptions[0],...patch}]},period,[]).drafts.length,0);
 console.log('PASS: existing expense generator reused, quincena preserved, month-end clamped, duplicate templates and repeated previews idempotent, incompatible subscriptions excluded.');
} finally {await rm(dir,{recursive:true,force:true});}
