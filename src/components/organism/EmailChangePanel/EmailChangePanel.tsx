import './EmailChangePanel.css';
import{useI18n}from'../../../i18n/I18nProvider';
import type{EmailPreview}from'../../../modules/profile-review/contracts';
import{Card}from'../../molecule/Card/Card';import{Field}from'../../molecule/Field/Field';import{Input}from'../../atom/Input/Input';import{Button}from'../../atom/Button/Button';import{Notice}from'../../molecule/Notice/Notice';
export interface EmailChangePanelProps{status:'loading'|'ready'|'error';email:string;preview:EmailPreview|null;target:string;setTarget:(s:string)=>void;mode:'edit'|'review'|'saving'|'complete';confirmed:boolean;setConfirmed:(b:boolean)=>void;error:string|null;previous:string;next:string;retry:()=>void;start:()=>void;save:()=>void;cancel:()=>void}
export function EmailChangePanel(p:EmailChangePanelProps){const{t}=useI18n(),busy=p.mode==='saving';return <Card padding="lg" className="stack email-change-panel" title={t('emailChange.title')}>
 <Notice tone="info">{t('review.boundary')}</Notice>
 {p.status==='loading'&&<p role="status">{t('review.loading')}</p>}
 {p.status==='error'&&<Notice tone="warn" action={<Button onClick={p.retry}>{t('review.retry')}</Button>}>{t('review.readError')}</Notice>}
 {p.error&&<Notice tone="warn">{t(p.error)}</Notice>}
 {p.status==='ready'&&<>
  <p className="small">{t('emailChange.current')}: <strong>{p.email}</strong></p>
  {p.mode==='edit'||p.mode==='complete'?<><Field label={t('emailChange.next')} hint={t('emailChange.hint')}>{id=><Input id={id} type="email" autoComplete="off" value={p.target} onChange={e=>p.setTarget(e.target.value)}/>}</Field><Button onClick={p.start}>{t('emailChange.review')}</Button></>:<>
   <p className="small">{p.previous} → {p.next}</p>
   <label className="row" style={{minHeight:'var(--h-ctl)'}}><input type="checkbox" checked={p.confirmed} disabled={busy} onChange={e=>p.setConfirmed(e.target.checked)}/><span className="small">{t('emailChange.confirm')}</span></label>
   {busy&&<p role="status">{t('emailChange.saving')}</p>}
   <Button disabled={!p.confirmed||busy} onClick={p.save}>{t('emailChange.save')}</Button><Button variant="secondary" onClick={p.cancel}>{t('core.common.cancel')}</Button>
  </>}
  {p.mode==='complete'&&<Notice tone="success">{t('emailChange.saved')}</Notice>}
  {p.preview&&<Notice tone="info" title={t('emailChange.notice')}>{t('emailChange.noticeBody',{previous:p.preview.previous_email,next:p.preview.next_email})}</Notice>}
 </>}
 </Card>;}
