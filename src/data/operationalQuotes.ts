import type { DataProvider } from './types';
import type { PaymentRow } from './schema';
import { quotePublishedProduct } from './catalogPublication';
import {validProductDate,type CatalogPlan} from './productCatalog';
import { priceItem, type PriceItem } from '../tenant/pricing';
import { tenant } from '../tenant/tenant';
import { addDaysKey } from '../i18n/format';

export const QUOTED_CLASS_ITEMS = ['trial','single','pack12','pack12_smtc'] as const;
export const QUOTED_GIFT_ITEMS = ['gift_single','gift_pack12'] as const;
export interface OperationalQuote {
 snapshotVersion: 1; tenantId:string; itemId:string; productId:string; planId:string; code:string;
 name:{es:string;en:string}; amount:number; currency:'COP'; purchaseDate:string; classes:number;
 validityDays:number|null; catalogRevision:number; priceId:string; source:'legacy_demo'|'local_publication';
 kind:'class'|'gift'; sourceKey:string;
}
export interface FrozenSaleQuote extends OperationalQuote {quantity:number;chargedAmount:number;fallbackValidityDays:number|null;entitlementExpiresAt:string|null;taxTotals?:{subtotal:number;tax:number;total:number}}
/** Purchase dates are studio dates, independent of the viewer's timezone. */
export function quotePurchaseDate(now:Date=new Date()):string {
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:tenant.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const value=(kind:string)=>parts.find(part=>part.type===kind)!.value;
 return `${value('year')}-${value('month')}-${value('day')}`;
}
export const isQuotedClassPlan=(planId:string)=>QUOTED_CLASS_ITEMS.some(id=>`plan_${id}`===planId);
export function localCatalogMode(rows:CatalogPlan[]):boolean{return rows.some(p=>p.tenant_id===tenant.id&&p.frontend_publication);}

/** Only known class/gift kinds have an existing fulfillment contract. Arbitrary/private products remain draft. */
export function resolveOperationalQuote(rows:CatalogPlan[],itemId:string,purchaseDate=quotePurchaseDate()):OperationalQuote {
 if(!validProductDate(purchaseDate))throw Error('quote_unavailable');
 const legacy=priceItem(itemId),kind=(QUOTED_CLASS_ITEMS as readonly string[]).includes(itemId)?'class':(QUOTED_GIFT_ITEMS as readonly string[]).includes(itemId)?'gift':null;
 if(!legacy||!kind)throw Error('quote_unsupported');
 const plan=rows.find(p=>p.id===`plan_${itemId}`&&p.tenant_id===tenant.id);
 if(!plan)throw Error('quote_unavailable');
 const published=localCatalogMode(rows);
 let priceId=`legacy_${itemId}`,amount=legacy.price??0,name={...legacy.name},classes=legacy.classes??1,validityDays=legacy.validityDays??null,catalogRevision=0,code=itemId.toUpperCase(),publicationAt='';
 if(published){
  if(!plan.frontend_publication||plan.frontend_publication.withdrawnAt)throw Error('quote_unavailable');
  const value=quotePublishedProduct(plan,purchaseDate);
  if(plan.frontend_publication.snapshot.definition.type!==legacy.family)throw Error('quote_unsupported');
  ({priceId,amount,name,classes,validityDays,catalogRevision,code}=value);publicationAt=plan.frontend_publication.at;
 }else if(!plan.active)throw Error('quote_unavailable');
 if(!Number.isSafeInteger(amount)||amount<1)throw Error('quote_unsupported'); // Free-product activation has no approved contract.
 if(kind==='class'&&(['trial','single'].includes(itemId)?classes!==1:classes<2))throw Error('quote_unsupported');
 const value:Omit<OperationalQuote,'sourceKey'>={snapshotVersion:1 as const,tenantId:tenant.id,itemId,productId:plan.id,planId:plan.id,code,name:{...name},amount,currency:'COP' as const,purchaseDate,classes,validityDays,catalogRevision,priceId,source:published?'local_publication' as const:'legacy_demo' as const,kind};
 const quote={...value,sourceKey:JSON.stringify({...value,publicationAt})};
 if(kind==='gift'){
  const baseId=legacy.giftOf;
  if(!baseId)throw Error('quote_gift_contract');
  const base=resolveOperationalQuote(rows,baseId,purchaseDate);
  if(base.amount!==quote.amount||base.classes!==quote.classes||base.validityDays!==quote.validityDays)throw Error('quote_gift_contract');
  quote.sourceKey=JSON.stringify({gift:quote.sourceKey,base:base.sourceKey});
 }
 return quote;
}
/** Preserve each existing legacy purchase path's fallback; published terms are explicit. No old row is changed. */
export function freezeSaleQuote(quote:OperationalQuote,quantity=1,fallbackValidityDays:number|null=90):FrozenSaleQuote {
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>10||quote.kind==='class'&&quantity!==1)throw Error('quote_quantity');
 const days=quote.validityDays??fallbackValidityDays;
 return {...structuredClone(quote),quantity,chargedAmount:quote.amount*quantity,fallbackValidityDays,
  entitlementExpiresAt:quote.kind==='class'&&days!=null?addDaysKey(quote.purchaseDate,days):null};
}
export function quotedItem(quote:OperationalQuote):PriceItem {
 const legacy=priceItem(quote.itemId)!;
 return {...legacy,name:{...quote.name},price:quote.amount,classes:quote.classes,validityDays:quote.validityDays??legacy.validityDays,
  description:quote.source==='local_publication'?{es:`${quote.classes} clases · ${quote.validityDays} días · cotización ficticia`,en:`${quote.classes} classes · ${quote.validityDays} days · fictional quote`}:{...legacy.description}};
}
export function withQuoteTotals(quote:FrozenSaleQuote,totals:{subtotal:number;tax:number;total:number}):FrozenSaleQuote {
 const base=quote.amount*quote.quantity;
 if(![totals.subtotal,totals.tax,totals.total].every(n=>Number.isSafeInteger(n)&&n>=0)||totals.subtotal+totals.tax!==totals.total||(totals.total!==base&&totals.subtotal!==base))throw Error('quote_tax');
 return {...structuredClone(quote),chargedAmount:totals.total,taxTotals:{...totals}};
}
export async function checkSaleQuote(data:DataProvider,expected:FrozenSaleQuote):Promise<FrozenSaleQuote>{
 if(data.name!=='mock')throw Error('quote_disconnected');
 const rows=await data.list<CatalogPlan>('plans');
 let current:OperationalQuote;try{current=resolveOperationalQuote(rows,expected.itemId,quotePurchaseDate());}catch{throw Error('quote_changed');}
 if(current.sourceKey!==expected.sourceKey)throw Error('quote_changed');
 let frozen=freezeSaleQuote(current,expected.quantity,expected.fallbackValidityDays);
 if(expected.taxTotals)frozen=withQuoteTotals(frozen,expected.taxTotals);
 if(JSON.stringify(frozen)!==JSON.stringify(expected))throw Error('quote_changed');
 return structuredClone(frozen);
}
/** Safe optional mock metadata reader; missing historical snapshots remain missing rather than backfilled. */
export function readPaymentQuote(payment:PaymentRow):FrozenSaleQuote|null{
 const q=payment.frontend_quote as FrozenSaleQuote|undefined;
 const tax=q?.taxTotals;
 const validTax=tax===undefined||!!tax&&typeof tax==='object'&&[tax.subtotal,tax.tax,tax.total].every(n=>Number.isSafeInteger(n)&&n>=0);
 if(!q||!validTax||q.currency!==payment.currency||!Number.isSafeInteger(q.chargedAmount)||q.chargedAmount<1||q.kind==='class'&&!(QUOTED_CLASS_ITEMS as readonly string[]).includes(q.itemId)||q.kind==='gift'&&!(QUOTED_GIFT_ITEMS as readonly string[]).includes(q.itemId)||!['class','gift'].includes(q.kind)||!['legacy_demo','local_publication'].includes(q.source)||q.currency!=='COP'||!Number.isSafeInteger(q.amount)||q.amount<1||!Number.isSafeInteger(q.catalogRevision)||q.catalogRevision<0||!validProductDate(q.purchaseDate)||!(q.entitlementExpiresAt===null||validProductDate(q.entitlementExpiresAt))||!(q.validityDays===null||Number.isSafeInteger(q.validityDays)&&q.validityDays>0)||!(q.fallbackValidityDays===null||Number.isSafeInteger(q.fallbackValidityDays)&&q.fallbackValidityDays>0)||q.planId!==`plan_${q.itemId}`||q.kind==='class'&&q.quantity!==1||q.snapshotVersion!==1||q.tenantId!==payment.tenant_id||q.planId!==payment.plan_id||q.productId!==payment.plan_id||q.chargedAmount!==payment.amount||!q.name||typeof q.name.es!=='string'||typeof q.name.en!=='string'||!Number.isSafeInteger(q.classes)||q.classes<1||q.classes>1000||!Number.isSafeInteger(q.quantity)||q.quantity<1||q.quantity>10||(q.taxTotals?(q.taxTotals.total!==q.chargedAmount||q.taxTotals.subtotal+q.taxTotals.tax!==q.chargedAmount||(q.taxTotals.total!==q.amount*q.quantity&&q.taxTotals.subtotal!==q.amount*q.quantity)):q.amount*q.quantity!==q.chargedAmount)||typeof q.sourceKey!=='string')return null;
 return structuredClone(q);
}
