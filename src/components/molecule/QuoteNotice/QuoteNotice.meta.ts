import {createElement as h} from 'react';
import {defineMeta} from '../../../design/meta';
import {QuoteNotice} from './QuoteNotice';
import {freezeSaleQuote,type FrozenSaleQuote,type OperationalQuote} from '../../../data/operationalQuotes';
import {priceItem} from '../../../tenant/pricing';
import {tenant} from '../../../tenant/tenant';
import type {useOperationalCatalog,useReviewedQuote} from '../../../modules/quotes/hooks';
const item=priceItem('pack12')!;
/** Component-inventory fixture only; no publication or purchase command uses this snapshot. */
const unit:OperationalQuote={snapshotVersion:1,tenantId:tenant.id,itemId:item.id,productId:`plan_${item.id}`,planId:`plan_${item.id}`,code:'LIBRARY_DEMO',name:{es:'Paquete ficticio de biblioteca',en:'Fictional library package'},amount:item.price!,currency:'COP',purchaseDate:'2026-10-22',classes:item.classes!,validityDays:item.validityDays??null,catalogRevision:0,priceId:'library_fixture',source:'legacy_demo',kind:'class',sourceKey:'component-library-only'};
const quote:FrozenSaleQuote=freezeSaleQuote(unit,1,90);
const catalog:ReturnType<typeof useOperationalCatalog>={rows:[],loading:false,failed:false,day:quote.purchaseDate,retry:()=>{},quote:id=>id===quote.itemId?quote:null};
const review=(value:Partial<ReturnType<typeof useReviewedQuote>>={}):ReturnType<typeof useReviewedQuote>=>({quote,stale:false,available:true,review:()=>{},...value});
export default defineMeta({tier:'molecule',name:'QuoteNotice',description:{es:'Cotización ficticia congelada y revisión explícita cuando cambia precio, revisión o día del estudio.',en:'Frozen fictional quote with explicit review when price, revision or studio day changes.'},props:[{name:'catalog / review',type:'operational quote state',description:{es:'Lectura disponible/error y copia mostrada. Revisar no compra ni activa clases.',en:'Read availability/error and the displayed snapshot. Reviewing does not buy or activate classes.'}}],states:['ready','loading/unavailable','stale with explicit review','read failure with retry'],usages:[
 {title:{es:'Cotización ficticia lista',en:'Ready fictional quote'},render:()=>h(QuoteNotice,{catalog,review:review()})},
 {title:{es:'Cargando catálogo',en:'Loading catalog'},render:()=>h(QuoteNotice,{catalog:{...catalog,loading:true},review:review({quote:null,available:false})})},
 {title:{es:'Sin cotización',en:'No quotation'},render:()=>h(QuoteNotice,{catalog,review:review({quote:null,available:false})})},
 {title:{es:'Revisión de copia congelada',en:'Frozen snapshot needs review'},render:()=>h(QuoteNotice,{catalog,review:review({stale:true,available:false})})},
 {title:{es:'Error de lectura',en:'Read failure'},render:()=>h(QuoteNotice,{catalog:{...catalog,failed:true},review:review({available:false})})}
],a11y:[{es:'El aviso explica el bloqueo y ofrece revisión/reintento; no depende solo del color.',en:'The notice explains the block and offers review/retry; it does not rely on colour alone.'}],usedBy:['C-04','C-06','C-07b','C-17','S-04']});
