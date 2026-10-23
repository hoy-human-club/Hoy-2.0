import './TeacherReviewPanel.css';
import{useState}from'react';import{useI18n}from'../../../i18n/I18nProvider';
import type{TeacherProposal}from'../../../modules/profile-review/contracts';import type{TeacherRow,BaseRow}from'../../../data/schema';
import{Card}from'../../molecule/Card/Card';import{Notice}from'../../molecule/Notice/Notice';import{Button}from'../../atom/Button/Button';import{Field}from'../../molecule/Field/Field';import{Input}from'../../atom/Input/Input';
export interface TeacherReviewPanelProps{status:'loading'|'ready'|'error';proposals:TeacherProposal[];teachers:TeacherRow[];modalities:BaseRow[];busy:boolean;error:string|null;saved:boolean;retry:()=>void;onDecision:(id:string,kind:'approve'|'reject',reason?:string)=>void;onCancelRequest:()=>void}
export function TeacherReviewPanel(p:TeacherReviewPanelProps){const{t,bi}=useI18n();const[reasons,setReasons]=useState<Record<string,string>>({}),[invalid,setInvalid]=useState<string|null>(null);return <Card padding="lg" className="stack teacher-review-panel" title={t('teacherReview.title')}>
 <Notice tone="info">{t('teacherReview.boundary')}</Notice>
 {p.status==='loading'&&<p role="status">{t('review.loading')}</p>}
 {p.status==='error'&&<Notice tone="warn" action={<Button onClick={p.retry}>{t('review.retry')}</Button>}>{t('review.readError')}</Notice>}
 {p.error&&<Notice tone="warn" action={<Button onClick={p.retry}>{t('review.retry')}</Button>}>{t(p.error)}</Notice>}
 {p.saved&&<Notice tone="success">{t('teacherReview.saved')}</Notice>}
 {p.status==='ready'&&p.proposals.length===0&&<p>{t('teacherReview.empty')}</p>}
 {p.status==='ready'&&p.proposals.map(proposal=><section key={proposal.id} className="stack" data-proposal={proposal.id}>
  <h3>{p.teachers.find(t=>t.id===proposal.teacher_id)?.display_name??proposal.teacher_id}</h3><p className="eyebrow">{t(`teacherReview.${proposal.status}`)}</p>
  <strong>{t('teacherReview.proposed')}: {proposal.proposed.display_name}</strong><p className="small">{bi(proposal.proposed.bio)}</p><p className="small">{proposal.proposed.specialties.map(id=>{const m=p.modalities.find(m=>m.id===id);return m?bi({es:String(m.name_es),en:String(m.name_en)}):id;}).join(', ')}</p>
  {proposal.reason&&<Notice tone="warn">{proposal.reason}</Notice>}
  {proposal.status==='pending'&&<>
   <Field label={t('teacherReview.reason')} error={invalid===proposal.id?t('teacherReview.reasonRequired'):undefined}>{id=><Input id={id} disabled={p.busy} value={reasons[proposal.id]??''} onChange={e=>setReasons(r=>({...r,[proposal.id]:e.target.value}))}/>}</Field>
   <Button disabled={p.busy} onClick={()=>p.onDecision(proposal.id,'approve')}>{t('teacherReview.approve')}</Button>
   <Button variant="secondary" disabled={p.busy} onClick={()=>{if(!reasons[proposal.id]?.trim()){setInvalid(proposal.id);return;}setInvalid(null);p.onDecision(proposal.id,'reject',reasons[proposal.id]);}}>{t('teacherReview.reject')}</Button>
  </>}
 </section>)}
 {p.busy&&<Button variant="secondary" onClick={p.onCancelRequest}>{t('core.common.cancel')}</Button>}
 </Card>;}
