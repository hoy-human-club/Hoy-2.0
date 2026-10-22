import { useEffect,useRef,useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData } from '../../data/DataContext';
import { formatDate, formatTime, MS } from '../../i18n/format';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { CapacityMeter } from '../../components/molecule/CapacityMeter/CapacityMeter';
import { RosterRow } from '../../components/molecule/RosterRow/RosterRow';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { Timeline } from '../../components/organism/Timeline/Timeline';
import { RatingSummary } from '../../components/molecule/RatingSummary/RatingSummary';
import { maskPhone } from '../staff/people';
import { useSettings } from '../admin/settings';
import {readTeacherClassAccess,readTeacherClassDetails,teacherClassCommand,type TeacherActor} from './classOwnership';
import {Notice} from '../../components/molecule/Notice/Notice';
import './teacher.css';
import { Icon } from '../../components/atom/Icon/Icon';

/**
 * /teach/class/:id — the roster (read-only), reviews and class notes. 0051: check-in happens only at the front desk
 * (S-02), so the teacher sees who arrived but marks nobody; the old in-window attendance buttons are gone.
 */
export function TeacherClassPage() {
 const {id}=useParams(),data=useData(),{user,role}=useSession(),{t}=useI18n();
 const actor={userId:user.id,role,name:user.name},key=`${user.id}|${role}|${id??''}`;
 const [reload,setReload]=useState(0),[gate,setGate]=useState<{key:string;state:'loading'|'allowed'|'denied'|'error'}>({key:'',state:'loading'});
 useEffect(()=>{
  let active=true,version=0;
  const load=async()=>{const run=++version;setGate({key,state:'loading'});try{if(!id)throw Error('teacher_class_unavailable');await readTeacherClassAccess(data,actor,id);if(active&&run===version)setGate({key,state:'allowed'});}catch(e){if(active&&run===version)setGate({key,state:e instanceof Error&&e.message==='teacher_class_unavailable'?'denied':'error'});}};
  void load();const off=data.subscribe('*',event=>{if(event.table==='teachers'||event.table==='class_sessions'&&(!(event.id??event.row?.id)||(event.id??event.row?.id)===id))void load();});
  return()=>{active=false;off();};
 },[data,key,reload]);
 const state=gate.key===key?gate.state:'loading';
 if(state!=='allowed')return <div className="container page stack teach"><EmptyState tone={state==='loading'?'loading':'error'} title={t(state==='loading'?'core.common.loading':state==='error'?'teacher.access.readError':'teacher.access.unavailable')} body={state==='denied'?t('teacher.access.body'):undefined} action={state==='error'?<Button onClick={()=>setReload(n=>n+1)}>{t('teacher.access.retry')}</Button>:<Link to="/teach"><Button>{t('core.nav.back')}</Button></Link>}/></div>;
 return <OwnedTeacherClass key={key} id={id!} actor={actor}/>;
}
function OwnedTeacherClass({id,actor}:{id:string;actor:TeacherActor}){
 const data=useData(),{t,lang}=useI18n(),{settings}=useSettings();
 type Details=Awaited<ReturnType<typeof readTeacherClassDetails>>;
 const savingRef=useRef(false);
 const [view,setView]=useState<{state:'loading'|'ready'|'error';details?:Details}>({state:'loading'}),[reload,setReload]=useState(0),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[saveError,setSaveError]=useState(false);
 useEffect(()=>{
  let active=true,version=0;
  const load=async()=>{const run=++version;setView({state:'loading'});try{const details=await readTeacherClassDetails(data,actor,id);if(active&&run===version)setView({state:'ready',details});}catch{if(active&&run===version)setView({state:'error'});}};
  void load();const off=data.subscribe('*',e=>{if(['bookings','reviews','audit_log','users','profiles','modalities','rooms'].includes(e.table))void load();});return()=>{active=false;off();};
 },[data,id,actor.userId,actor.role,reload]);
 if(view.state!=='ready'||!view.details)return <div className="container page stack teach"><EmptyState tone={view.state==='loading'?'loading':'error'} title={t(view.state==='loading'?'core.common.loading':'teacher.access.readError')} action={view.state==='error'?<Button onClick={()=>setReload(n=>n+1)}>{t('teacher.access.retry')}</Button>:undefined}/></div>;
 const {session,modality,room,bookings,notes,reviews:reviewRows,isMine,users,profiles}=view.details;
 const byId=new Map(users.map(u=>{const p=profiles.find(p=>p.user_id===u.id);return [u.id,{name:p?.full_name??u.email,initials:p?.initials??undefined,phone:u.phone,notes:typeof p?.notes==='string'?p.notes:undefined}];}));
 const tags=new Map<string,number>();for(const r of reviewRows)for(const tag of r.tags??[])tags.set(tag,(tags.get(tag)??0)+1);
 const reviews={count:reviewRows.length,average:reviewRows.length?Math.round(reviewRows.reduce((n,r)=>n+r.rating,0)/reviewRows.length*10)/10:null,tags:[...tags].map(([tag,n])=>({tag,n})).sort((a,b)=>b.n-a.n)};
 const loading=false;
  const now = Date.now();
  const start = new Date(session.starts_at).getTime();
  const override = ['admin','coordinator','super_admin'].includes(actor.role);
  const canComplete = (isMine || override) && session.status === 'scheduled' && now >= start;
  const active = bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'late_cancel');
  const present = active.filter((b) => b.status === 'checked_in').length;
  const graceMs = settings.policies.lateGraceMin * MS.min;

  const command=async(kind:'note'|'complete')=>{
   if(savingRef.current)return;savingRef.current=true;setSaving(true);setSaveError(false);
   try{await teacherClassCommand(data,{actor,id,kind,note});setNote('');}catch{setSaveError(true);}finally{savingRef.current=false;setSaving(false);}
  };
  const complete=()=>command('complete'),addNote=()=>command('note');

  return (
    <div className="container page stack teach">
      {saveError&&<Notice tone="danger">{t('teacher.access.saveError')}</Notice>}
      <Link to="/teach" className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-xs)' }}><Icon name="arrow-left" size="sm" /> {t('core.nav.back')}</Link>
      <Card tone="primary" className="teach-head">
        <div className="row wrap"><Chip tone={modality?.tone ?? 'river'} dot>{session.title}</Chip>{session.status !== 'scheduled' && <Badge tone={session.status === 'completed' ? 'primary' : 'danger'}>{session.status}</Badge>}</div>
        <div className="teach-head-time">{formatDate(session.starts_at, lang, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(session.starts_at, lang)}–{formatTime(session.ends_at, lang)}</div>
        <div className="row wrap small"><span>{room?.name ?? '—'}</span><span>·</span><span>{t('teacher.class.present', { n: present, total: active.length })}</span></div>
        <CapacityMeter booked={session.booked_count} capacity={session.capacity} />
      </Card>

      <Card tone="muted" padding="sm" className="row-between wrap">
        <div className="small">
          <strong>{t('teacher.class.checkin.title')}</strong>
          <div className="xs muted">{t('teacher.class.checkin.body')}</div>
        </div>
        {canComplete && <Button size="sm" disabled={saving} onClick={complete} icon="circle-check">{t('teacher.class.complete')}</Button>}
      </Card>

      <section className="stack-sm">
        <div className="row-between"><div className="eyebrow">{t('teacher.class.roster')}</div><span className="xs muted mono">{active.length}</span></div>
        {loading && active.length === 0 && <EmptyState compact tone="loading" title={t('core.common.loading')} />}
        {!loading && active.length === 0 && <EmptyState compact title={t('teacher.class.emptyRoster')} />}
        {active.length > 0 && (
          <Card padding="none">
            {active.map((b) => {
              const p = byId.get(b.user_id);
              const late = !!b.checked_in_at && new Date(b.checked_in_at).getTime() > start + graceMs;
              return <RosterRow key={b.id} name={p?.name ?? b.user_id} initials={p?.initials} phone={isMine ? undefined : maskPhone(p?.phone)} plan={b.paid_with ? t(`customer.paidWith.${b.paid_with}`) : undefined} status={b.status as 'booked' | 'checked_in' | 'no_show'} late={late} flag={p?.notes ?? undefined} time={b.checked_in_at ? formatTime(b.checked_in_at, lang) : undefined} />;
            })}
          </Card>
        )}
      </section>

      {reviews.count > 0 && (
        <section className="stack-sm">
          <div className="eyebrow">{t('teacher.class.reviews')}</div>
          <Card>
            <RatingSummary average={reviews.average} count={reviews.count} tags={reviews.tags} tagLabel={(k) => t(`customer.rate.tag.${k}`)}
              caption={t('teacher.class.reviews.count', { n: reviews.count })} emptyText={t('teacher.class.reviews.none')} />
            <p className="xs muted">{t('teacher.class.reviews.note')}</p>
          </Card>
        </section>
      )}

      <section className="stack-sm">
        <div className="eyebrow">{t('teacher.class.notes')}</div>
        <Card>
          <div className="stack-sm">
            <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('teacher.class.notes.ph')} aria-label={t('teacher.class.notes')} />
            <div className="row-between wrap"><span className="xs muted">{t('teacher.class.notes.hint')}</span><Button size="sm" disabled={saving||!note.trim()} onClick={addNote} icon="notes">{t('teacher.class.notes.add')}</Button></div>
            <Timeline items={notes.map((n) => ({ id: n.id, at: n.created_at, kind: 'note' as const, title: String(n.diff?.author ?? ''), body: String(n.diff?.note ?? '') }))} emptyText={t('teacher.class.notes.empty')} />
          </div>
        </Card>
      </section>
    </div>
  );
}
