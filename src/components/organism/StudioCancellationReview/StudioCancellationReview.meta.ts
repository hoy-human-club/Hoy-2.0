import {createElement as h} from 'react';
import {defineMeta} from '../../../design/meta';
import {useI18n} from '../../../i18n/I18nProvider';
import {StudioCancellationReview,type StudioReviewPresentation} from './StudioCancellationReview';
type Example='empty'|'verified'|'mixed'|'warning'|'preview';
/** Provider-free fixtures for the real presentation widget; no fabricated ledger/session objects. */
function ExampleReview({kind}:{kind:Example}){
 const {bi}=useI18n(),email={subject:bi({es:'QA · Vista previa ficticia de cancelación',en:'QA · Fictional cancellation preview'}),body:bi({es:'Esta es una vista previa ficticia. No se envió ningún correo.\n\nConfirmar la acción de demostración vincularía la unidad verificada con su paquete original, bajo sus términos originales.',en:'This is a fictional preview. No email was sent.\n\nConfirming the demonstration action would link the verified unit to its original package, under its original terms.'}),warnings:kind==='warning'?['preference']:[]};
 const review:StudioReviewPresentation={activeCount:kind==='empty'?0:kind==='verified'||kind==='mixed'?2:1,verifiedCount:kind==='empty'?0:kind==='verified'?2:1,voucherSeats:kind==='mixed'?1:0,waitlistCount:kind==='empty'?0:2,cannotVerify:kind==='mixed',emails:kind==='preview'||kind==='warning'?[email]:[]};
 return h(StudioCancellationReview,{review});
}
export default defineMeta({tier:'organism',name:'StudioCancellationReview',description:{es:'Revisión ficticia de inscripciones y correos; no envía mensajes.',en:'Fictional sign-up and email review; sends no messages.'},props:[{name:'review',type:'StudioReviewPresentation',description:{es:'Solo conteos, límites de verificación y texto de vista previa; sin proveedor ni filas de negocio.',en:'Counts, verification limits and preview text only; no provider or business rows.'}}],states:['empty roster','verified lineage','unverified mixed lineage','email coverage warning','preview only'],usages:[
 {title:{es:'Sin inscripciones · ejemplo ficticio',en:'Empty roster · fictional example'},render:()=>h(ExampleReview,{kind:'empty'})},
 {title:{es:'Unidades verificadas · ejemplo ficticio',en:'Verified lineage · fictional example'},render:()=>h(ExampleReview,{kind:'verified'})},
 {title:{es:'Linaje mixto sin verificar · ejemplo ficticio',en:'Unverified mixed lineage · fictional example'},render:()=>h(ExampleReview,{kind:'mixed'})},
 {title:{es:'Cobertura de correo sin confirmar · ejemplo ficticio',en:'Email coverage warning · fictional example'},render:()=>h(ExampleReview,{kind:'warning'})},
 {title:{es:'Solo vista previa · ejemplo ficticio',en:'Preview only · fictional example'},render:()=>h(ExampleReview,{kind:'preview'})},
],a11y:[{es:'Advertencias con estado de alerta y vistas previas sin navegación ni envío. Todos los estados son ejemplos de presentación sin controles de escritura.',en:'Alert warnings and previews without navigation or sending. Every state is a presentation example without write controls.'}],usedBy:['M-14']});
