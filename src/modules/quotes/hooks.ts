import {useEffect,useMemo,useState} from 'react';
import {useData} from '../../data/DataContext';
import type {CatalogPlan} from '../../data/productCatalog';
import {freezeSaleQuote,quotePurchaseDate,resolveOperationalQuote,type FrozenSaleQuote} from '../../data/operationalQuotes';
export function useOperationalCatalog(){
 const data=useData();const [rows,setRows]=useState<CatalogPlan[]>(()=>data.peek?.<CatalogPlan>('plans')??[]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[version,setVersion]=useState(0),[day,setDay]=useState(quotePurchaseDate);
 useEffect(()=>{const timer=setInterval(()=>setDay(quotePurchaseDate()),30000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{let alive=true;const load=()=>{setLoading(true);return data.list<CatalogPlan>('plans').then(value=>{if(alive){setRows(value);setFailed(false);setLoading(false);}}).catch(()=>{if(alive){setFailed(true);setLoading(false);}});};void load();const off=data.subscribe('plans',()=>void load());return()=>{alive=false;off();};},[data,version]);
 return useMemo(()=>({rows,loading,failed,day,retry:()=>setVersion(v=>v+1),quote:(id:string)=>{if(loading||failed||data.name!=='mock')return null;try{return resolveOperationalQuote(rows,id,day);}catch{return null;}}}),[rows,loading,failed,day,data]);
}
export function useReviewedQuote(catalog:ReturnType<typeof useOperationalCatalog>,itemId:string|null,quantity=1,fallbackValidityDays:number|null=90){
 const candidate=itemId?catalog.quote(itemId):null;
 const [reviewed,setReviewed]=useState<FrozenSaleQuote|null>(null);
 useEffect(()=>{
  if(!itemId){setReviewed(null);return;}
  if(!reviewed||reviewed.itemId!==itemId){setReviewed(candidate?freezeSaleQuote(candidate,quantity,fallbackValidityDays):null);return;}
 },[itemId,candidate?.sourceKey,quantity,fallbackValidityDays]);
 const quote=reviewed?.itemId===itemId?freezeSaleQuote(reviewed,quantity,fallbackValidityDays):null;
 const stale=!!quote&&(!candidate||quote.sourceKey!==candidate.sourceKey);
 return {quote,stale,available:!!quote&&!!candidate&&!stale&&!catalog.loading&&!catalog.failed,review:()=>setReviewed(candidate?freezeSaleQuote(candidate,quantity,fallbackValidityDays):null)};
}
