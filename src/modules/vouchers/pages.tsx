import {useVoucherActions} from './actions';
import { Fragment, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { formatCOP } from '../../i18n/format';
import { useTable } from '../../data/DataContext';
import type { VoucherRow, VoucherBookingRow, VoucherEventRow } from '../../data/vouchers';
import type { ClassSessionRow } from '../../data/schema';
import { useSession } from '../../auth/SessionProvider';
import { useLayout } from '../../layout/useLayout';
import { tenant } from '../../tenant/tenant';
import { INVITATION_PRESETS, priceItem } from '../../tenant/pricing';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Field } from '../../components/molecule/Field/Field';
import { Input } from '../../components/atom/Input/Input';
import { Notice } from '../../components/molecule/Notice/Notice';
import { Badge } from '../../components/atom/Badge/Badge';
import { Wordmark } from '../../components/atom/Wordmark/Wordmark';
import { adminSpec, claimSpec } from './specs';
import './vouchers.css';


export function VoucherAdminPage() {
  const { t, lang } = useI18n(); const { sections, isVisible } = useLayout(adminSpec);
  const { rows: vouchers } = useTable<VoucherRow>('vouchers');
  const { rows: bookings } = useTable<VoucherBookingRow>('voucher_bookings');
  const { rows: events } = useTable<VoucherEventRow>('voucher_events');
  const { run, busy, error } = useVoucherActions();
  const [kind, setKind] = useState<'classes'|'cop'>('classes'); const [amount, setAmount] = useState(2); const [cap, setCap] = useState(2);
  const [scope, setScope] = useState('per_booking'); const [unit, setUnit] = useState('per_person'); const [cancel, setCancel] = useState('restore');
  const [expires, setExpires] = useState(''); const [name, setName] = useState(''); const [contact, setContact] = useState(''); const [message, setMessage] = useState('');
  const [reviewed, setReviewed] = useState(false); const [preview, setPreview] = useState<string|null>(null);
  const benefit = (v: Pick<VoucherRow, 'benefitKind'|'balance'>) => v.benefitKind === 'cop' ? formatCOP(v.balance, lang) : `${v.balance} · ${t('vouchers.classes')}`;
  const blocks: Record<string, ReactNode> = {
    notice: <Notice tone="warn" title={t('vouchers.demo')}>{t('vouchers.demoBody')}</Notice>,
    create: <Card title={t('vouchers.create')}><div className="voucher-grid">
      <div className="stack">
        <Field label={t('vouchers.presets')}>{() => <div className="row wrap">{INVITATION_PRESETS.map(p => <Button key={p.id} variant="secondary" size="sm" onClick={() => { setKind(p.benefitKind); setAmount(p.benefitTotal); setCap(p.participantCap); setReviewed(false); }}>{p.benefitKind === 'cop' ? formatCOP(p.benefitTotal,lang) : t('vouchers.classes')} · {t('vouchers.people',{n:p.participantCap})}</Button>)}</div>}</Field>
        <Field label={t('vouchers.kind')}>{id => <select id={id} className="input" value={kind} onChange={e => {setKind(e.target.value as 'classes'|'cop'); setReviewed(false);}}><option value="classes">{t('vouchers.classes')}</option><option value="cop">{t('vouchers.cop')}</option></select>}</Field>
        <Field label={t('vouchers.amount')}>{id => <Input id={id} type="number" min={1} step={1} value={amount} onChange={e=>{setAmount(Number(e.target.value)); setReviewed(false);}} />}</Field>
        <Field label={t('vouchers.cap')}>{id => <select id={id} className="input" value={cap} onChange={e=>{setCap(Number(e.target.value)); setReviewed(false);}}>{[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</select>}</Field>
        <Field label={t('vouchers.capScope')}>{id => <select id={id} className="input" value={scope} onChange={e=>{setScope(e.target.value); setReviewed(false);}}><option value="per_booking">{t('vouchers.per_booking')}</option><option value="lifetime">{t('vouchers.lifetime')}</option></select>}</Field>
        {kind === 'classes' && <Field label={t('vouchers.unit')}>{id => <select id={id} className="input" value={unit} onChange={e=>{setUnit(e.target.value); setReviewed(false);}}><option value="per_person">{t('vouchers.per_person')}</option><option value="per_booking">{t('vouchers.group')}</option></select>}</Field>}
        <Field label={t('vouchers.cancelPolicy')}>{id => <select id={id} className="input" value={cancel} onChange={e=>{setCancel(e.target.value); setReviewed(false);}}><option value="restore">{t('vouchers.restore')}</option><option value="forfeit">{t('vouchers.forfeit')}</option></select>}</Field>
        <Field label={t('vouchers.expires')} hint={t('vouchers.noExpiry')}>{id => <Input id={id} type="date" value={expires} onChange={e=>{setExpires(e.target.value); setReviewed(false);}} />}</Field>
      </div>
      <div className="stack">
        <div className="cust-giftcard cust-giftcard-cream voucher-art"><Wordmark variant="blue" height={28}/><span className="eyebrow">{t('vouchers.free')}</span><strong>{kind==='cop'?formatCOP(amount,lang):`${amount} · ${t('vouchers.classes')}`}</strong><span>{t('vouchers.people',{n:cap})}</span><span>{name}</span>{message && <em>{message}</em>}</div>
        <Field label={t('vouchers.name')} required>{id => <Input id={id} value={name} onChange={e=>setName(e.target.value)} maxLength={120}/>}</Field>
        <Field label={t('vouchers.contact')}>{id => <Input id={id} value={contact} onChange={e=>setContact(e.target.value)} maxLength={160}/>}</Field>
        <Field label={t('vouchers.message')}>{id => <textarea className="input" id={id} value={message} onChange={e=>setMessage(e.target.value)} maxLength={300} rows={3}/>}</Field>
        <Notice>{t('vouchers.policyReview')}</Notice>
        <label className="row"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>{t('vouchers.reviewed')}</label>
        <Button loading={busy} disabled={!reviewed||!name.trim()||!Number.isSafeInteger(amount)||amount<1} onClick={async()=>{ const r=await run({type:'issue',title:t('vouchers.title'),benefitKind:kind,benefitTotal:amount,participantCap:cap,capScope:scope,creditUnit:unit,cancellationPolicy:cancel,expiresAt:expires?new Date(`${expires}T23:59:59-05:00`).toISOString():null,recipientName:name.trim(),recipientContact:contact.trim(),message}); if(r){setName('');setContact('');setMessage('');setReviewed(false);} }}>{t('vouchers.issue')}</Button>
      </div>
    </div></Card>,
    history: <div className="stack"><h2>{t('vouchers.history')}</h2>{!vouchers.length&&<Notice>{t('vouchers.empty')}</Notice>}{vouchers.slice().reverse().map(v=><Card key={v.id} title={v.recipientName||v.title} actions={<Badge>{t(`vouchers.${v.status}`)}</Badge>}><div className="stack">
      <div className="row wrap"><strong>{benefit(v)}</strong><span>{t('vouchers.people',{n:v.participantCap})} · {t(`vouchers.${v.capScope}`)}</span><span>{v.code}</span></div>
      <p className="small muted">{t('vouchers.free')} · {v.expiresAt?new Date(v.expiresAt).toLocaleDateString(lang):t('vouchers.noExpiry')}</p>
      <div className="row wrap"><Link to={`/app/vouchers/${v.id}`}>{t('vouchers.open')}</Link>{(['email','whatsapp'] as const).map(channel=><Button key={channel} variant="secondary" size="sm" loading={busy} onClick={async()=>{if(await run({type:'preview_delivery',voucherId:v.id,channel}))setPreview(`${v.id}:${channel}`);}}>{t('vouchers.preview')} · {t(`vouchers.${channel}`)}</Button>)}<Button variant="ghost" size="sm" disabled={v.status==='revoked'||busy} onClick={()=>run({type:'revoke',voucherId:v.id})}>{t('vouchers.revoke')}</Button></div>
      {preview?.startsWith(`${v.id}:`)&&<Notice title={t('vouchers.previewOnly')}><p>{t('vouchers.channelBody',{name:v.recipientName||'',studio:tenant.name,benefit:benefit(v)})}</p><p>{v.message}</p><Link to={`/app/vouchers/${v.id}`}>{t('vouchers.open')}</Link></Notice>}
      {bookings.filter(b=>b.voucherId===v.id).map(b=><div key={b.id} className="stack-sm"><strong>{t('vouchers.booking')} · {t(`vouchers.${b.status}`)}</strong><span>{b.participants.map(p=>p.name).join(' · ')}</span><div className="row wrap">{b.status==='booked'&&<>{v.source==='promotion_claim'&&!b.confirmedAt?<Link className="btn btn-secondary btn-sm" to="/staff/vouchers">{t('desk.verifyBeforeAttendance')}</Link>:<Button size="sm" disabled={busy} onClick={()=>run({type:'attendance',bookingId:b.id})}>{t('vouchers.attend')}</Button>}<Button size="sm" variant="secondary" disabled={busy} onClick={()=>run({type:'cancel',bookingId:b.id})}>{t('vouchers.cancel')}</Button></>}</div></div>)}
      <ol className="voucher-events">{events.filter(e=>e.voucherId===v.id).map(e=><li key={e.id}><span>{t(`vouchers.${eventLabel(e.kind)}`)}</span> <time>{new Date(e.created_at).toLocaleString(lang)}</time></li>)}</ol>
    </div></Card>)}</div>,
  };
  return <div className="container page"><div className="page-head"><h1>{t('vouchers.title')}</h1><p className="muted">{t('vouchers.sub')}</p></div><div className="stack">{error&&<Notice tone="danger">{t('vouchers.error')}</Notice>}{sections.filter(isVisible).map(s=><Fragment key={s}>{blocks[s]}</Fragment>)}</div></div>;
}

const eventLabel=(kind:string)=>({issue:'issueEvent',issued:'issueEvent',book:'bookEvent',booked:'bookEvent',cancel:'cancelEvent',cancelled:'cancelEvent',revoke:'revokeEvent',revoked:'revokeEvent'}[kind]||kind);

export function VoucherClaimPage() {
  const { id }=useParams(); const {t,lang}=useI18n(); const {user,role,switchUser}=useSession(); const {sections,isVisible}=useLayout(claimSpec);
  const {rows:vouchers}=useTable<VoucherRow>('vouchers'); const {rows:bookings}=useTable<VoucherBookingRow>('voucher_bookings');
  const {rows:sessions}=useTable<ClassSessionRow>('class_sessions'); const {rows:events}=useTable<VoucherEventRow>('voucher_events');
  const found=vouchers.find(x=>x.id===id); const allowed=!found?.claimedBy||found.claimedBy===user.id||role==='admin'||role==='super_admin'; const v=allowed?found:undefined; const {run,busy,error}=useVoucherActions();
  const [session,setSession]=useState(''); const [names,setNames]=useState(['']); const [consent,setConsent]=useState(false);
  const cost=priceItem('single')?.price??0; const total=v?.benefitKind==='cop'?cost*names.length:v?.creditUnit==='per_booking'?1:names.length; const insufficient=!!v&&total>v.balance; const available=sessions.filter(s=>s.status==='scheduled'&&new Date(s.starts_at).getTime()>Date.now()).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
  const blocks:Record<string,ReactNode>={
    notice:<Notice tone="warn" title={t('vouchers.demo')}>{t('vouchers.demoBody')}</Notice>,
    benefit:!v?<Card title={t('vouchers.mine')}><p>{t('vouchers.missing')}</p><div className="stack">{vouchers.filter(x=>x.claimedBy===user.id).map(x=><Link key={x.id} to={`/app/vouchers/${x.id}`}>{x.recipientName} · {x.code}</Link>)}</div></Card>:<Card><div className="stack"><div className="cust-giftcard cust-giftcard-cream voucher-art"><Wordmark variant="blue" height={28}/><span>{t('vouchers.free')}</span><strong>{v.benefitKind==='cop'?formatCOP(v.balance,lang):`${v.balance} · ${t('vouchers.classes')}`}</strong><span>{v.recipientName}</span><span>{t('vouchers.people',{n:v.participantCap})} · {t(`vouchers.${v.capScope}`)}</span>{v.message&&<em>{v.message}</em>}</div><Badge>{t(`vouchers.${v.status}`)}</Badge><p>{v.expiresAt?new Date(v.expiresAt).toLocaleDateString(lang):t('vouchers.noExpiry')} · {t(`vouchers.${v.cancellationPolicy}`)}</p>{v.benefitKind==='classes'&&<p>{t('vouchers.unit')}: {t(v.creditUnit==='per_person'?'vouchers.per_person':'vouchers.group')}</p>}{!v.claimedBy&&v.status!=='revoked'&&role!=='customer'&&<Button variant="secondary" onClick={()=>switchUser('customer')}>{t('vouchers.testCustomer')}</Button>}{!v.claimedBy&&v.status!=='revoked'&&role==='customer'&&<Button loading={busy} onClick={()=>run({type:'claim',voucherId:v.id,userId:user.id})}>{t('vouchers.activate')}</Button>}{v.claimedBy&&<p>{t('vouchers.owner')}: {v.claimedBy===user.id?user.name:t('vouchers.claimedOther')}</p>}</div></Card>,
    booking:v&&v.claimedBy===user.id&&v.status!=='revoked'?<Card title={t('vouchers.book')}><div className="stack"><Field label={t('vouchers.session')}>{fieldId=><select id={fieldId} className="input" value={session} onChange={e=>setSession(e.target.value)}><option value="">{t('vouchers.select')}</option>{available.map(s=><option key={s.id} value={s.id}>{s.title} · {new Date(s.starts_at).toLocaleString(lang)}</option>)}</select>}</Field>{!available.length&&<Notice>{t('vouchers.noSessions')}</Notice>}{v.benefitKind==='cop'&&<p>{t('vouchers.quote',{amount:formatCOP(cost,lang)})}</p>}<p>{t('vouchers.total',{total:v.benefitKind==='cop'?formatCOP(total,lang):total,balance:v.benefitKind==='cop'?formatCOP(v.balance,lang):v.balance})}</p>{insufficient&&<Notice tone="warn">{t('vouchers.insufficient')}</Notice>}<h3>{t('vouchers.participants')}</h3>{names.map((name,i)=><Field key={i} label={t('vouchers.participant',{n:i+1})} required>{fieldId=><Input id={fieldId} value={name} maxLength={120} onChange={e=>setNames(ns=>ns.map((n,j)=>j===i?e.target.value:n))}/>}</Field>)}<div className="row wrap"><Button variant="secondary" disabled={names.length>=v.participantCap} onClick={()=>setNames(n=>[...n,''])}>{t('vouchers.add')}</Button><Button variant="ghost" disabled={names.length===1} onClick={()=>setNames(n=>n.slice(0,-1))}>{t('vouchers.remove')}</Button></div><label className="row"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{t('vouchers.consent')}</label><Button loading={busy} disabled={insufficient||!consent||!session||names.some(n=>!n.trim())} onClick={async()=>{const r=await run({type:'book',voucherId:v.id,sessionId:session,participants:names.map((name,i)=>({name:name.trim(),...(i===0?{userId:user.id}:{})})),costPerPerson:cost,contactConsent:true}); if(r){setSession('');setNames(['']);setConsent(false);}}}>{t('vouchers.confirm')}</Button></div></Card>:null,
    history:v?<div className="stack"><h2>{t('vouchers.history')}</h2>{bookings.filter(b=>b.voucherId===v.id).map(b=><Card key={b.id} title={sessions.find(s=>s.id===b.sessionId)?.title||t('vouchers.booking')}><div className="stack-sm"><Badge>{t(`vouchers.${b.status}`)}</Badge><p>{b.participants.map(p=>p.name).join(' · ')}</p>{b.status==='booked'&&(v.claimedBy===user.id||role==='admin'||role==='super_admin')&&<Button variant="secondary" disabled={busy} onClick={()=>run({type:'cancel',bookingId:b.id})}>{t('vouchers.cancel')}</Button>}</div></Card>)}<ol className="voucher-events">{events.filter(e=>e.voucherId===v.id).map(e=><li key={e.id}>{t(`vouchers.${eventLabel(e.kind)}`)} · {new Date(e.created_at).toLocaleString(lang)}</li>)}</ol></div>:null,
  };
  return <div className="container page cust-page"><h1>{t('vouchers.title')}</h1><div className="stack">{error&&<Notice tone="danger">{t('vouchers.error')}</Notice>}{sections.filter(isVisible).map(s=><Fragment key={s}>{blocks[s]}</Fragment>)}</div></div>;
}
