import {readPaymentQuote,type FrozenSaleQuote} from '../../data/operationalQuotes';
import type {DataProvider} from '../../data/types';
import type {PaymentRow,ProfileRow,PlanRow,TransferReceiptRow} from '../../data/schema';
export const queueTables=['transfer_receipts','payments','profiles','plans'] as const;
export type QueueSnapshot={receipts:TransferReceiptRow[];payments:PaymentRow[];profiles:ProfileRow[];plans:PlanRow[]};
export const emptyQueue:QueueSnapshot={receipts:[],payments:[],profiles:[],plans:[]};
/** Contained reads: a partial result must never appear as an empty/successful queue. */
export async function readQueue(data:DataProvider,tenantId:string):Promise<QueueSnapshot>{
 const result=await Promise.all(queueTables.map(table=>data.list(table,{where:{tenant_id:tenantId}})));
 const scoped=result.map(rows=>rows.filter(row=>row.tenant_id===tenantId));
 return {receipts:scoped[0] as TransferReceiptRow[],payments:scoped[1] as PaymentRow[],profiles:scoped[2] as ProfileRow[],plans:scoped[3] as PlanRow[]};
}
export type QueueEntry={id:string;payment:PaymentRow|null;receipts:TransferReceiptRow[];customer:string|null;plan:PlanRow|null;quote:FrozenSaleQuote|null};
/** Pure projection, also defending against providers that ignore scope. No commands or inferred status. */
export function projectQueue(snapshot:QueueSnapshot,tenantId:string):QueueEntry[]{
 const receipts=snapshot.receipts.filter(r=>r.tenant_id===tenantId),payments=snapshot.payments.filter(p=>p.tenant_id===tenantId);
 const entries:QueueEntry[]=[];const linked=new Set<string>();
 for(const payment of payments){
  const matches=receipts.filter(r=>r.payment_id===payment.id&&r.user_id===payment.user_id).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  if(payment.status!=='pending'&&!matches.length)continue;
  matches.forEach(r=>linked.add(r.id));
  // Optional immutable browser metadata only; never infer approval or reprice from today's plan.
  const frozen=readPaymentQuote(payment);
  const quote=frozen?.name.es.trim()&&frozen.name.en.trim()?frozen:null;
  entries.push({id:`payment:${payment.id}`,payment,quote,receipts:matches,customer:snapshot.profiles.find(p=>p.tenant_id===tenantId&&p.user_id===payment.user_id)?.full_name?.trim()||null,plan:snapshot.plans.find(p=>p.tenant_id===tenantId&&p.id===payment.plan_id)??null});
 }
 for(const receipt of receipts.filter(r=>!linked.has(r.id)))entries.push({id:`receipt:${receipt.id}`,payment:null,quote:null,receipts:[receipt],customer:snapshot.profiles.find(p=>p.tenant_id===tenantId&&p.user_id===receipt.user_id)?.full_name?.trim()||null,plan:null});
 return entries.sort((a,b)=>(b.payment?.created_at??b.receipts[0]?.created_at??'').localeCompare(a.payment?.created_at??a.receipts[0]?.created_at??''));
}
export function entryMatches(entry:QueueEntry,filter:string){return filter==='all'||filter==='pending'&&entry.payment?.status==='pending'||entry.receipts.some(r=>r.status===filter);}
export function validAmount(payment:PaymentRow|null):number|null{return payment&&typeof payment.amount==='number'&&Number.isFinite(payment.amount)&&payment.amount>=0?payment.amount:null;}
