import {createElement as h} from 'react';
import {defineMeta} from '../../../design/meta';
import {priceItem} from '../../../tenant/pricing';
import {createGiftDraft,advanceGift} from '../../../modules/voucher-gifts/model';
import {VoucherGiftDemo} from './VoucherGiftDemo';
const draft=createGiftDraft({id:'DEMO-library',email:'recipient@demo.test',classes:priceItem('gift_single')!.classes!,amount:priceItem('gift_single')!.price!});
const ready=advanceGift(draft,'confirm');
export default defineMeta({tier:'organism',name:'VoucherGiftDemo',description:{es:'Ensayo de regalo de clases en memoria, sin efectos en pagos o cuentas.',en:'Memory-only class gift rehearsal without payment or account effects.'},props:[{name:'initialGift / initialError',type:'GiftDraft | null / string',description:{es:'Fixtures opcionales de presentación; nunca datos operativos.',en:'Optional presentation fixtures; never operational data.'}}],states:['empty','invalid email','loading/unavailable/stale quote (QuoteNotice)','pending transfer','confirmed simulation','recipient mismatch','single redemption','expired','unknown link'],usages:[
 {title:{es:'Vacío · ensayo interactivo',en:'Empty · interactive rehearsal'},render:()=>h(VoucherGiftDemo)},
 {title:{es:'Email inválido',en:'Invalid email'},render:()=>h(VoucherGiftDemo,{initialError:'giftDemo.invalid'})},
 {title:{es:'Transferencia pendiente',en:'Transfer pending'},render:()=>h(VoucherGiftDemo,{initialGift:draft})},
 {title:{es:'Confirmación simulada',en:'Simulated confirmation'},render:()=>h(VoucherGiftDemo,{initialGift:ready})},
 {title:{es:'Destinatario incorrecto',en:'Recipient mismatch'},render:()=>h(VoucherGiftDemo,{initialGift:ready,initialError:'giftDemo.recipientError'})},
 {title:{es:'Canje único',en:'Single redemption'},render:()=>h(VoucherGiftDemo,{initialGift:advanceGift(ready,'redeem',ready.email)})},
 {title:{es:'Vencido',en:'Expired'},render:()=>h(VoucherGiftDemo,{initialGift:{...ready,expiresAt:'2000-01-01T00:00:00Z'}})},
],a11y:[{es:'Campos etiquetados, formularios de teclado y avisos de estado.',en:'Labeled fields, keyboard forms and status notices.'}],usedBy:['C-37']});
