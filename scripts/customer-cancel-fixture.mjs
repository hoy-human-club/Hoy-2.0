// Fictional Map-only data shared by the domain and later rendered cancellation checks.
export const customerActor={actorId:'qa_customer_cancel_user',role:'customer'};
export const customerNow=Date.parse('2026-10-22T15:00:00Z');
export function installCustomerMemory(){const memory=new Map();let quota=false;globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>{if(quota)throw Error('FICTIONAL storage quota');memory.set(key,value);}};return{memory,setQuota:value=>{quota=value;}};}
export async function seedCustomerCancellation(data,{paidWith='package',start=customerNow+2*86400000,expiry='2030-01-31',freeze=false,waiter=true}={}){
 const original=data.peek('class_sessions').find(row=>row.status==='scheduled');
 if(!original)throw Error('FICTIONAL seed occurrence required');
 await data.insert('users',{id:customerActor.actorId,email:'qa-cancel@example.invalid',phone:null,status:'active',locale:'en'});
 // Book a future occurrence through the real provider, then advance that existing occurrence.
 // This never bypasses the provider's ban on creating a NEW booking after its start.
 const bookableStart=Math.max(start,Date.now()+86400000);
 let session=await data.insert('class_sessions',{...original,id:'qa_customer_cancel_session',title:'QA FICTIONAL customer cancellation',starts_at:new Date(bookableStart).toISOString(),ends_at:new Date(bookableStart+3000000).toISOString(),capacity:16,booked_count:0,status:'scheduled',cancel_reason:null});
 await data.insert('class_ledger',{id:'qa_customer_cancel_grant',user_id:customerActor.actorId,delta:2,reason:'purchase',purchase_ledger_id:null,plan_id:null,payment_id:null,expires_at:expiry,frozen_from:freeze?'2026-10-01':null,frozen_until:freeze?'2030-01-31':null,created_at:'2026-10-01T12:00:00Z'});
 await data.insert('class_ledger',{id:'qa_customer_cancel_debit',user_id:customerActor.actorId,delta:-1,reason:'booking',purchase_ledger_id:'qa_customer_cancel_grant',plan_id:null,payment_id:null,expires_at:null,frozen_from:null,frozen_until:null,created_at:'2026-10-02T12:00:00Z'});
 const booking=await data.insert('bookings',{id:'qa_customer_cancel_booking',user_id:customerActor.actorId,session_id:session.id,status:'booked',paid_with:paidWith,ledger_id:paidWith==='package'?'qa_customer_cancel_debit':null,checked_in_at:null,cancelled_at:null,rated:false});
 session=await data.update('class_sessions',session.id,{starts_at:new Date(start).toISOString(),ends_at:new Date(start+3000000).toISOString()});
 if(waiter)await data.insert('waitlist',{id:'qa_customer_cancel_waiter',user_id:'qa_customer_cancel_other',session_id:session.id,status:'waiting',position:1,offered_at:null,claim_until:null});
 return{booking,session};
}
export function wrapCustomerProvider(data,hooks={}){
 // Independent facade: detached Mock transaction methods are read-only own descriptors.
 // Do not inherit those descriptors and then try to assign replacement hooks.
 const wrapper=new Proxy({},{get:(_,key)=>typeof data[key]==='function'?data[key].bind(data):data[key]});
 const methods={};
 for(const method of ['list','get','insert','update','remove'])methods[method]=async(...args)=>hooks[method]?hooks[method](data,...args):data[method](...args);
 methods.atomic=async(fn,options)=>{const result=await data.atomic(tx=>fn(wrapCustomerProvider(tx,hooks)),options);if(hooks.after)await hooks.after(data);return result;};return new Proxy(methods,{get:(target,key)=>key in target?target[key]:wrapper[key]});
}
export const customerSnapshot=data=>JSON.stringify(['users','tenants','bookings','class_sessions','class_ledger','payments','waitlist','audit_log'].map(table=>data.peek(table)));
