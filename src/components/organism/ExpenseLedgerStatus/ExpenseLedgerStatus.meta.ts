import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { useI18n } from '../../../i18n/I18nProvider';
import { ExpenseLedgerStatus, type ExpenseLedgerStatusProps } from './ExpenseLedgerStatus';
function Examples(){
 const {lang}=useI18n(),label=(es:string,en:string)=>lang==='es'?es:en;
 const base:ExpenseLedgerStatusProps={boundary:label('Libro ficticio en este navegador · integraciones reales desconectadas','Fictional browser ledger · real integrations disconnected'),readError:false,error:'',notice:'',busy:false,blocked:false,retryable:false,readText:label('No se pudieron leer los registros propios. Cambios bloqueados.','Owned records could not be read. Changes blocked.'),errorText:label('No se pudo confirmar el cambio. Reintentar verifica la misma intención.','Change could not be acknowledged. Retry verifies the same intent.'),noticeText:label('Dejaste de esperar; los registros ya guardados no se deshacen.','Stopped waiting; already committed rows are not undone.'),retryText:label('Reintentar','Retry'),cancelText:label('Dejar de esperar','Stop waiting'),onRead:()=>{},onRetry:()=>{},onCancel:()=>{}};
 return h('div',{className:'stack'},
 h(ExpenseLedgerStatus,{...base}),
 h(ExpenseLedgerStatus,{...base,notice:'saved',noticeText:label('Resultado ficticio local leído de nuevo; no se envió ningún pago.','Local fictional result read back; no payment sent.'),summary:label('Creados: 1 · Omitidos: 0','Created: 1 · Skipped: 0')}),
 h(ExpenseLedgerStatus,{...base,notice:'stopped'}),
 h(ExpenseLedgerStatus,{...base,error:'conflict',errorText:label('El registro cambió. Recarga antes de otro borrador.','Current record changed. Reload before another draft.')}),
 h(ExpenseLedgerStatus,{...base,busy:true,blocked:true}),
 h(ExpenseLedgerStatus,{...base,error:'failed',retryable:true}),
 h(ExpenseLedgerStatus,{...base,readError:true}));
}
export default defineMeta({tier:'organism',name:'ExpenseLedgerStatus',description:{es:'Estados contenidos del libro ficticio: lectura, error, reintento, espera cancelable y confirmación.',en:'Contained fictional ledger read, failure, retry, cancellable waiting and acknowledgement states.'},props:[{name:'readError / error / notice / busy',type:'boolean / string',description:{es:'Estado ya validado por el ciclo del comando.',en:'State validated by the command lifecycle.'}}],states:['default disconnected boundary','owned read failure, one Retry','pending, Stop waiting','retry retained immutable intent','paid delete/stale conflict','acknowledged browser-only result','postcommit cancellation does not undo'],usages:[{title:{es:'Espera y reintento ficticios',en:'Fictional waiting and retry'},render:()=>h(Examples)}],a11y:[{es:'Notice usa alert para errores; los controles tienen nombres visibles y teclado.',en:'Notice uses alerts for errors; controls have visible names and keyboard access.'}],usedBy:['M-09c']});
