import type {BookingRow,ClassLedgerRow,PaymentRow,UserRow} from './schema';
import type {DataProvider} from './types';
import {approvedPackageRows,packageLots} from './packages';
import {dateKey} from '../i18n/format';
import {tenant} from '../tenant/tenant';

export type TrialStatus='eligible'|'trial_used'|'trial_active_package'|'trial_clarification'|'trial_checking'|'trial_check_failed';
export interface TrialAssessment{status:TrialStatus;reasons:string[]}
/** Fixture safeguard only. This does not approve a production frozen/historical-package rule. */
export const TRIAL_FIXTURE_SAFEGUARD={unresolved:'pause-fictional-testing'} as const;
const validDay=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
/** Preserve lot terms. Current-day confirmed active packages are clear; ambiguous relevant lots pause the mock. */
export function assessTrial(input:{userId:string;tenantId:string;ledger:ClassLedgerRow[];payments:PaymentRow[];bookings:BookingRow[];now?:Date;excludePaymentId?:string}):TrialAssessment{
 const {userId,tenantId}=input,now=input.now??new Date();
 if(!Number.isFinite(now.getTime()))return {status:'trial_clarification',reasons:['invalid_time']};
 const today=dateKey(now);
 const payments=input.payments.filter(p=>p.user_id===userId&&p.tenant_id===tenantId);
 const bookings=input.bookings.filter(b=>b.user_id===userId&&b.tenant_id===tenantId);
 const rows=input.ledger.filter(r=>r.user_id===userId&&r.tenant_id===tenantId);
 if(payments.some(p=>p.id!==input.excludePaymentId&&p.plan_id==='plan_trial'&&p.status==='approved')||bookings.some(b=>b.paid_with==='trial'))return {status:'trial_used',reasons:['prior_trial']};
 // Malformed allocation data cannot safely establish a remaining active purchase.
 if(rows.some(r=>!Number.isInteger(r.delta)||(r.reason==='purchase'&&r.delta<=0)||!Number.isFinite(Date.parse(r.created_at))||(r.expires_at!=null&&!validDay(r.expires_at))))return {status:'trial_clarification',reasons:['invalid_history']};
 const uncertain:string[]=[];
 // Historical provenance/future allocation is unresolved even if reconstruction appears exhausted.
 // Pausing the fictional test is not a production eligibility classification.
 if(rows.some(r=>Date.parse(r.created_at)>now.getTime()))uncertain.push('future_history');
 for(const r of rows.filter(r=>r.delta>0&&!r.purchase_ledger_id)){
  if(r.reason!=='purchase'){uncertain.push('unclassified_grant');continue;}
  if(!r.payment_id){uncertain.push('unlinked_history');continue;}
  const payment=payments.find(v=>v.id===r.payment_id);
  if(!payment||payment.plan_id!==r.plan_id||!['approved','pending','declined'].includes(payment.status))uncertain.push('unverified_payment_link');
 }
 for(const r of rows){
  const references=r.purchase_ledger_id?rows.filter(p=>p.id===r.purchase_ledger_id&&p.delta>0&&!p.purchase_ledger_id):r.delta<0&&r.payment_id?rows.filter(p=>p.payment_id===r.payment_id&&p.delta>0&&!p.purchase_ledger_id):[];
  if(r.purchase_ledger_id&&references.length!==1)uncertain.push('dangling_allocation');
  else if(r.delta<0&&references.length!==1)uncertain.push('legacy_allocation');
  if(references.length===1){
   const parent=references[0],payment=payments.find(p=>p.id===parent.payment_id);
   if(Date.parse(r.created_at)<Date.parse(parent.created_at)||r.payment_id&&r.payment_id!==parent.payment_id||r.plan_id&&r.plan_id!==parent.plan_id)uncertain.push('inconsistent_allocation');
   if(r.delta<0&&(!payment||payment.status!=='approved'||payment.plan_id!==parent.plan_id))uncertain.push('unverified_allocation');
  }
 }
 const lots=packageLots(approvedPackageRows(rows,payments));
 let active=false;
 for(const {purchase:p,left} of lots){
  if(left<=0||p.expires_at&&p.expires_at<today)continue;
  if(Date.parse(p.created_at)>now.getTime()){uncertain.push('future_dated');continue;}
  // A linked prepaid single is not a multi-class package. Unclassified gifts/adjustments stay unresolved.
  if(p.reason!=='purchase'){uncertain.push('unclassified_grant');continue;}
  if(!p.payment_id){uncertain.push('unlinked_history');continue;}
  const payment=payments.find(v=>v.id===p.payment_id);
  if(!payment||payment.plan_id!==p.plan_id){uncertain.push('unverified_payment_link');continue;}
  if((p.frozen_from&&!validDay(p.frozen_from))||(p.frozen_until&&!validDay(p.frozen_until))||!!p.frozen_from!==!!p.frozen_until||p.frozen_from&&p.frozen_until&&p.frozen_from>p.frozen_until){uncertain.push('invalid_freeze');continue;}
  if(p.frozen_from&&p.frozen_until&&p.frozen_from<=today&&today<=p.frozen_until){uncertain.push('frozen');continue;}
  if(p.delta===1)continue;
  if(!p.expires_at){uncertain.push('missing_expiry');continue;}
  active=true;
 }
 if(uncertain.length)return {status:'trial_clarification',reasons:[...new Set(uncertain)]};
 if(active)return {status:'trial_active_package',reasons:['confirmed_remaining_package']};
 return {status:'eligible',reasons:[]};
}
/** Fresh scoped reads, reused inside staged commands. No browser assessment authorizes a real purchase. */
export async function readTrialAssessment(data:DataProvider,userId:string,excludePaymentId?:string):Promise<TrialAssessment>{
 if(data.name!=='mock')throw Error('trial_disconnected');
 const [user,ledger,payments,bookings]=await Promise.all([
  data.get<UserRow>('users',userId),data.list<ClassLedgerRow>('class_ledger',{where:{tenant_id:tenant.id,user_id:userId}}),
  data.list<PaymentRow>('payments',{where:{tenant_id:tenant.id,user_id:userId}}),data.list<BookingRow>('bookings',{where:{tenant_id:tenant.id,user_id:userId}}),
 ]);
 if(!user||user.id!==userId||user.tenant_id!==tenant.id)throw Error('trial_scope');
 return assessTrial({userId,tenantId:tenant.id,ledger,payments,bookings,excludePaymentId});
}
export async function assertTrialAvailable(data:DataProvider,userId:string,excludePaymentId?:string):Promise<void>{
 const result=await readTrialAssessment(data,userId,excludePaymentId);
 if(result.status!=='eligible')throw Error(result.status);
}
export function trialErrorKey(error:unknown):string|null{
 const message=error instanceof Error?error.message:'';
 return ['trial_used','trial_active_package','trial_clarification'].includes(message)?`customer.trialGuard.${message}`:null;
}
