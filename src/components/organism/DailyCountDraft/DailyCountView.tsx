import {useI18n} from '../../../i18n/I18nProvider';
import {formatCOP} from '../../../i18n/format';
import {Button} from '../../atom/Button/Button';
import {Input} from '../../atom/Input/Input';
import {Notice} from '../../molecule/Notice/Notice';
import {Card} from '../../molecule/Card/Card';
import type {CountDocument,CountReferences,Counts,ReferenceDay} from '../../../modules/staff/cashCountDraft';
export type CountViewMode='closed'|'loading'|'readError'|'ready'|'preview'|'busy'|'saveError'|'saved'|'discard';
export interface CountViewProps {mode:CountViewMode;day:string;raw:Record<keyof Counts,string>;references:CountReferences|null;document:CountDocument|null;invalid?:boolean;intent?:'save'|'discard';onOpen?:()=>void;onClose?:()=>void;onDay?:(s:string)=>void;onInput?:(k:keyof Counts,s:string)=>void;onRetry?:()=>void;onPreview?:()=>void;onSave?:()=>void;onCancel?:()=>void;onDiscard?:()=>void;onConfirmDiscard?:()=>void}
/** Pure local-draft presentation. Library examples do not read or write provider/storage. */
export function DailyCountView(p:CountViewProps){
 const {t,lang}=useI18n(),busy=p.mode==='busy',preview=['preview','busy','saveError'].includes(p.mode);
 const display=(n:number|null,currency:string)=>n===null?t('staff.count.unknown'):currency==='COP'?formatCOP(n,lang):`${n} ${currency||t('staff.count.unknown')}`;
 function reference(label:string,day:ReferenceDay){return <Card data-count-reference={label.endsWith('recorded')?'recorded':'confirmed'} title={t(label)}><div className="stack-sm">
  <p className="small muted">{t('staff.count.unassigned',{missing:day.missingDate,invalid:day.invalidDate})}</p>
  {!day.groups.length?<p>{t('staff.count.empty')}</p>:day.groups.map((g,index)=><div key={index} className="stack-sm" style={{borderTop:'1px solid var(--border)',paddingTop:'var(--sp-md)',overflowWrap:'anywhere'}}>
   <strong className="small">{g.method||t('staff.count.unknown')} / {g.provider||t('staff.count.unknown')} · {g.status||t('staff.count.unknown')} · {g.currency||t('staff.count.unknown')}</strong>
   <span className="small">{t('staff.count.rows',{n:g.rows})}</span>
   <span className="small">{t('staff.count.amount')}: {display(g.amount,g.currency)}</span>
   <span className="small">{t('staff.count.amountPaid')}: {display(g.amountPaid,g.currency)}</span>
   {(g.missingAmount>0||g.missingPaid>0)&&<p className="xs muted">{t('staff.count.missingAmounts',{amount:g.missingAmount,paid:g.missingPaid})}</p>}
  </div>)}
 </div></Card>;}
 return <section className="stack" data-cash-count={p.mode} style={{minWidth:0,overflowWrap:'anywhere'}}>
  <div className="row-between wrap"><h2>{t('staff.count.title')}</h2>{p.mode==='closed'?<Button variant="outline" disabled={!p.onOpen} onClick={p.onOpen}>{t('staff.count.open')}</Button>:<Button variant="ghost" disabled={!p.onClose} onClick={p.onClose}>{t('staff.count.close')}</Button>}</div>
  {p.mode!=='closed'&&<>
   <Notice tone="info">{t('staff.count.boundary')}</Notice>
   <label className="stack-sm"><span>{t('staff.count.day')}</span><Input type="date" value={p.day} disabled={busy||!p.onDay} onChange={e=>p.onDay?.(e.target.value)}/></label>
   <div aria-live="polite">{p.mode==='loading'?<p role="status">{t('staff.count.loading')}</p>:p.mode==='readError'?<><Notice tone="warn">{t('staff.count.readError')}</Notice><Button disabled={!p.onRetry} onClick={p.onRetry}>{t('staff.count.retry')}</Button></>:<>
    <p className="small">{t('staff.count.attribution')}</p><Notice tone="warn">{t('staff.count.conflicts')}</Notice>
    {p.references&&<div className="stack">{reference('staff.count.recorded',p.references.recorded)}{reference('staff.count.confirmed',p.references.confirmed)}</div>}
    <Notice tone="info">{t('staff.count.withheld')}</Notice>
    <Card data-count-inputs title={t('staff.count.inputs')}><div className="stack">
     <p className="small muted">{t('staff.count.blank')}</p>
     {(['cash','cardManual','transferManual'] as const).map(key=><label className="stack-sm" key={key}><span>{t(`staff.count.${key}`)}</span><Input inputMode="numeric" value={p.raw[key]} invalid={p.invalid} disabled={preview||p.mode==='discard'||!p.onInput} onChange={e=>p.onInput?.(key,e.target.value)}/></label>)}
     {p.invalid&&<Notice tone="warn">{t('staff.count.invalid')}</Notice>}
     {p.mode==='saved'&&<Notice tone="info">{t('staff.count.saved')}</Notice>}
     {p.mode==='saveError'&&<Notice tone="warn">{t('staff.count.saveError')}</Notice>}
     {preview?<><p>{t('staff.count.previewBody')}</p><Button loading={busy} disabled={!p.onSave} onClick={p.onSave}>{t(p.mode==='saveError'?'staff.count.retry':p.intent==='discard'?'staff.count.confirmDiscard':'staff.count.save')}</Button><Button variant="ghost" disabled={!p.onCancel} onClick={p.onCancel}>{t('staff.count.cancel')}</Button></>:p.mode==='discard'?<><Notice tone="warn">{t('staff.count.discardBody')}</Notice><Button variant="danger" disabled={!p.onConfirmDiscard} onClick={p.onConfirmDiscard}>{t('staff.count.confirmDiscard')}</Button><Button variant="ghost" disabled={!p.onCancel} onClick={p.onCancel}>{t('staff.count.cancel')}</Button></>:<><Button disabled={p.invalid||!p.onPreview} onClick={p.onPreview}>{t('staff.count.preview')}</Button>{p.document?.counts&&<Button variant="ghost" disabled={!p.onDiscard} onClick={p.onDiscard}>{t('staff.count.discard')}</Button>}</>}
    </div></Card>
   </>}</div>
  </>}
 </section>;
}
