import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-schedule-support-'));
try {
 const file=join(dir,'test.mjs');await build({stdin:{contents:"export * from './src/modules/customer/bookingPaymentStatus';export * from './src/data/sessionAvailability';export * from './src/i18n/format';export * from './src/modules/customer/directions';export {tenant} from './src/tenant/tenant';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:file,logLevel:'silent'});
 const {bookingPaymentStatus:status,sessionUnavailableReason:reason,dateKey,studioParts,customerDirections,tenant}=await import(pathToFileURL(file));
 const booking={id:'b',tenant_id:'t',user_id:'u',ledger_id:'d',status:'booked'},debit={id:'d',tenant_id:'t',user_id:'u',payment_id:'p',delta:-1},payment={id:'p',tenant_id:'t',user_id:'u'};
 for(const [raw,result] of [['pending','pending'],['approved','confirmed'],['released','released'],['declined','unknown'],['refunded','unknown']])assert.equal(status(booking,[debit],[{...payment,status:raw}]),result);
 for(const ledger of [[],[{...debit,delta:1}],[{...debit,user_id:'other'}],[{...debit,tenant_id:'other'}]])assert.equal(status(booking,ledger,[{...payment,status:'approved'}]),'unknown');
 for(const p of [{...payment,user_id:'other'},{...payment,tenant_id:'other'},{...payment,id:'unrelated'}])assert.equal(status(booking,[debit],[{...p,status:'approved'}]),'unknown');
 assert.equal(status({...booking,status:'cancelled'},[],[{...payment,status:'approved'}]),'unknown');
 assert.equal(status({...booking,status:'cancelled'},[debit],[{...payment,status:'approved'}]),'confirmed','cancellation does not invent refund/release');
 const now=Date.parse('2026-10-23T15:00:00Z'),s={status:'scheduled',starts_at:new Date(now+1).toISOString(),ends_at:new Date(now+1000).toISOString()};
 assert.equal(reason({session:s},now),null);assert.equal(reason({session:s},now+1),'started');assert.equal(reason({session:s},now+1000),'ended');assert.equal(reason({session:s,templateActive:false},now),'unpublished');assert.equal(reason({session:s,modality:{active:false}},now),'unpublished');assert.equal(reason({session:{...s,starts_at:'invalid'}},now),'unavailable');
 assert.equal(dateKey(new Date('2026-10-24T00:30Z')),'2026-10-23');assert.equal(studioParts(new Date('2026-10-24T00:30Z')).hour,19);assert.equal(dateKey(new Date('2026-10-24T05:00Z')),'2026-10-24');
 const contact={address:'Fictional updated street',city:'Fictional city',location:{link:tenant.location.link}};assert.match(customerDirections(contact),/Fictional%20updated%20street/);assert.equal(customerDirections({...contact,location:{link:'https://www.google.com/maps/custom-fixture'}}),'https://www.google.com/maps/custom-fixture');
 console.log('PASS exact owned payment links, unknown legacy links, cancellation ≠ refund/release, start/end/inactive boundaries, Bogota UTC day boundary');
} finally {await rm(dir,{recursive:true,force:true});}
