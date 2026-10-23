import{useSession}from'../../auth/SessionProvider';
import{useTeacherReview}from'../profile-review/useTeacherReview';
import{Notice}from'../../components/molecule/Notice/Notice';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { TeacherRow } from '../../data/schema';
import{teacherRevision}from'../profile-review/contracts';
import{teacherIdentity}from'./classOwnership';
import { formatCOP } from '../../i18n/format';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Chip } from '../../components/atom/Chip/Chip';
import { Avatar } from '../../components/atom/Avatar/Avatar';
import { Badge } from '../../components/atom/Badge/Badge';
import { TeacherCard } from '../../components/organism/TeacherCard/TeacherCard';
import './teacher.css';

/** /teach/profile — photo, bilingual bio and specialties. Saves go through the coordinator (audit). */
export function TeacherProfilePage() {
  const { t, lang, bi } = useI18n();
  const {role,user}=useSession();
  const review=useTeacherReview();
  const [pick]=useState(()=>{try{return localStorage.getItem('hoyos.teach.as');}catch{return null;}});
  const me=teacherIdentity(review.value?.teachers??[],{userId:user.id,role,name:user.name},pick);
  const modalities=(review.value?.modalities??[]).filter(m=>m.active);
  const captured=useRef(''),snapshot=useRef(''),baseline=useRef(''),epoch=useRef(0);
  const [revisionReady,setRevisionReady]=useState(false);
  const [draft, setDraft] = useState({ display_name: '', bioEs: '', bioEn: '', specialties: [] as string[] });
  const pending=review.value?.proposals.find(p=>p.teacher_id===me?.id&&p.status==='pending');
  const latest=review.value?.proposals.find(p=>p.teacher_id===me?.id);
  const resetDraft=(row:TeacherRow)=>{const version=++epoch.current;captured.current=user.id+':'+row.id;baseline.current=JSON.stringify([row.display_name,row.bio?.es??'',row.bio?.en??'',row.specialties??[]]);setRevisionReady(false);setDraft({display_name:row.display_name,bioEs:row.bio?.es??'',bioEn:row.bio?.en??'',specialties:row.specialties??[]});void teacherRevision(row).then(value=>{if(version===epoch.current){snapshot.current=value;setRevisionReady(true);}});};
  // Refresh a clean editor or the just-published proposal, while preserving unrelated unsaved edits.
  useEffect(()=>{
    if(!me)return;
    const published=JSON.stringify([me.display_name,me.bio?.es??'',me.bio?.en??'',me.specialties??[]]);
    const edited=JSON.stringify([draft.display_name,draft.bioEs,draft.bioEn,draft.specialties]);
    const submitted=JSON.stringify([draft.display_name.trim(),draft.bioEs.trim(),draft.bioEn.trim()||draft.bioEs.trim(),draft.specialties]);
    if(captured.current!==user.id+':'+me.id||published!==baseline.current&&(edited===baseline.current||submitted===published))resetDraft(me);
  },[me,user.id,draft]);
  useEffect(()=>()=>{epoch.current++;},[]);
  const retry=()=>{if(me)resetDraft(me);review.retry();};
  if(!me)return <div className="container page stack teach"><Notice tone={review.status==='error'?'warn':'info'} action={<Button onClick={retry}>{t('review.retry')}</Button>}>{t(review.status==='error'?'review.readError':review.status==='loading'?'review.loading':'teacher.home.notLinked')}</Notice></div>;

  const dirty = draft.display_name !== me.display_name || draft.bioEs !== (me.bio?.es ?? '') || draft.bioEn !== (me.bio?.en ?? '') || draft.specialties.join() !== (me.specialties ?? []).join();
  const save=()=>void review.submit(me.id,{display_name:draft.display_name,bio:{es:draft.bioEs,en:draft.bioEn},specialties:draft.specialties},snapshot.current);
  const toggle = (id: string) => setDraft({ ...draft, specialties: draft.specialties.includes(id) ? draft.specialties.filter((x) => x !== id) : [...draft.specialties, id] });

  return (
    <div className="container page stack teach">
      <h1 className="teach-h1">{t('teacher.profile.title')}</h1>
      <Notice tone="info">{t('teacherReview.boundary')}</Notice>
      {review.status==='loading'&&<p role="status">{t('review.loading')}</p>}
      {review.status==='error'&&<Notice tone="warn" action={<Button onClick={retry}>{t('review.retry')}</Button>}>{t('review.readError')}</Notice>}
      {review.error&&<Notice tone="warn" action={<Button onClick={retry}>{t('review.retry')}</Button>}>{t(review.error)}</Notice>}
      {latest&&<Notice tone={latest.status==='rejected'?'warn':'info'} title={t(`teacherReview.${latest.status}`)}>{latest.reason??t(latest.status==='approved'?'teacherReview.approvedBody':latest.status==='cancelled'?'teacherReview.cancelledBody':'teacherReview.submitted')}</Notice>}
      {pending&&<p className="small">{pending.proposed.display_name} · {bi(pending.proposed.bio)}</p>}
      <Card>
        <div className="row">
          <Avatar name={me.display_name} src={me.photo_url} size={64} />
          <div className="grow"><Field label={t('teacher.profile.name')}>{(id) => <Input id={id} value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />}</Field></div>
        </div>
        <p className="xs muted" style={{ marginTop: 'var(--sp-sm)' }}>{t('teacher.profile.photo')}</p>
      </Card>
      <Card title={t('teacher.profile.bio')}>
        <div className="stack-sm">
          <Field label="ES" required>{(id) => <textarea id={id} className="input" rows={3} value={draft.bioEs} onChange={(e) => setDraft({ ...draft, bioEs: e.target.value })} />}</Field>
          <Field label="EN" hint={t('teacher.profile.bio.en.hint')}>{(id) => <textarea id={id} className="input" rows={3} value={draft.bioEn} onChange={(e) => setDraft({ ...draft, bioEn: e.target.value })} />}</Field>
        </div>
      </Card>
      <Card title={t('teacher.profile.specialties')}>
        <div className="row wrap">{modalities.map((m) => <Chip key={m.id} tone={m.tone} dot selected={draft.specialties.includes(m.id)} onClick={() => toggle(m.id)}>{bi({ es: m.name_es, en: m.name_en })}</Chip>)}</div>
      </Card>
      <Card tone="muted" padding="sm" className="row-between wrap">
        <span className="small">{t('teacher.profile.rate')}</span>
        <span className="row"><strong>{formatCOP(me.rate_per_class ?? 0, lang)}</strong><Badge>{t('teacher.profile.rate.readonly')}</Badge></span>
      </Card>
      <div className="stack-sm">
        <div className="eyebrow">{t('teacher.profile.preview')}</div>
        <TeacherCard name={draft.display_name || me.display_name} bio={{ es: draft.bioEs, en: draft.bioEn || draft.bioEs }} photo={me.photo_url} rating={me.rating_avg} specialties={draft.specialties.map((id) => modalities.find((m) => m.id === id)).filter(Boolean).map((m) => ({ label: bi({ es: m!.name_es, en: m!.name_en }), tone: m!.tone }))} />
      </div>
      <div className="row-between wrap">
        <span className="xs muted">{review.saved ? t('teacherReview.submitted') : t('teacher.profile.review')}</span>
        <Button disabled={role!=='teacher'||!revisionReady||review.status!=='ready'||review.busy||!!pending||!dirty || !draft.bioEs.trim() || !draft.display_name.trim()} onClick={save} icon="send">{t('teacherReview.submit')}</Button>
      </div>
      {pending&&role==='teacher'&&<Button disabled={review.busy} variant="secondary" onClick={()=>void review.command({kind:'cancel',proposalId:pending.id})}>{t('teacherReview.withdraw')}</Button>}
      {review.busy&&<Button onClick={review.cancelRequest}>{t('core.common.cancel')}</Button>}
    </div>
  );
}
