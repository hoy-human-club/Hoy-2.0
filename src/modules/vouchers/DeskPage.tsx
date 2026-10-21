import { Fragment, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { formatCOP } from '../../i18n/format';
import { useTable } from '../../data/DataContext';
import type { VoucherRow, VoucherBookingRow } from '../../data/vouchers';
import { parsePromotionCode, type PromotionShareRow, type PromotionClaimRow, type PromotionCampaignRow } from '../../data/promotions';
import type { BookingRow, ClassSessionRow } from '../../data/schema';
import { demoUserById } from '../../auth/demoUsers';
import { useLayout } from '../../layout/useLayout';
import { priceItem } from '../../tenant/pricing';
import { Card } from '../../components/molecule/Card/Card';
import { Notice } from '../../components/molecule/Notice/Notice';
import { Field } from '../../components/molecule/Field/Field';
import { Input } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import { CheckboxField } from '../../components/molecule/CheckboxField/CheckboxField';
import '../promotions/promotions.css';
import { Badge } from '../../components/atom/Badge/Badge';
import { useVoucherActions } from './actions';
import { availableWalkupSessions, remainingVoucherParticipants } from './deskAvailability';
import { deskSpec } from './specs';
import './vouchers.css';

/** The front desk never claims a shared promotion on a customer's behalf. */
export function VoucherDeskPage(){
 const {t,lang}=useI18n();const {sections,isVisible}=useLayout(deskSpec);const {run,busy,error}=useVoucherActions();
 const {rows:vouchers}=useTable<VoucherRow>('vouchers');const {rows:bookings}=useTable<VoucherBookingRow>('voucher_bookings');const {rows:sessions}=useTable<ClassSessionRow>('class_sessions');
 const {rows:regularBookings}=useTable<BookingRow>('bookings');
 const {rows:shares}=useTable<PromotionShareRow>('promotion_shares');const {rows:claims}=useTable<PromotionClaimRow>('promotion_claims');const {rows:campaigns}=useTable<PromotionCampaignRow>('promotion_campaigns');
 const [input,setInput]=useState(''),[searched,setSearched]=useState(false),[voucherId,setVoucherId]=useState(''),[shareId,setShareId]=useState('');
 const [verified,setVerified]=useState(false),[sessionId,setSessionId]=useState(''),[names,setNames]=useState(['']),[consent,setConsent]=useState(false),[cancelId,setCancelId]=useState('');
 const v=vouchers.find(v=>v.id===voucherId);const share=shares.find(s=>s.id===shareId);const campaign=campaigns.find(c=>c.id===share?.campaignId);const shareClaims=claims.filter(c=>c.shareId===shareId);
 const choose=(id:string)=>{setVoucherId(id);setVerified(false);setConsent(false);setSessionId('');setNames(['']);setCancelId('');};
 const lookup=()=>{
   setSearched(true);choose('');setShareId('');let value=input.trim();
   if(/^https?:/i.test(value)){try{const url=new URL(value);if(url.origin!==window.location.origin||url.username||url.password||url.search)return;const match=url.hash.match(/^#\/app\/vouchers\/([A-Za-z0-9_-]+)$/);if(match)value=match[1];else value=parsePromotionCode(value,window.location.origin)||'';}catch{return;}}
   const direct=vouchers.find(v=>v.code.toUpperCase()===value.toUpperCase()||v.id===value);if(direct){choose(direct.id);return;}
   try{const code=parsePromotionCode(value,window.location.origin);const s=shares.find(s=>s.code.toUpperCase()===code);if(s)setShareId(s.id);}catch{ /* Invalid codes produce the visible not-found state. */ }
 };
 const cost=priceItem('single')?.price??0;const total=v?.benefitKind==='cop'?cost*names.length:v?.creditUnit==='per_booking'?1:names.length;
 const participantLimit=v?remainingVoucherParticipants(v,bookings):0;
 const available=availableWalkupSessions(v,sessions,regularBookings,bookings,names.length);
 const selectedSession=available.find(s=>s.id===sessionId);
 const usable=!!v&&v.status==='claimed'&&!!v.claimedBy&&(!v.expiresAt||Date.parse(v.expiresAt)>Date.now())&&v.balance>=total&&names.length<=participantLimit;
 const blocks:Record<string,ReactNode>={
  notice:<Notice tone="warn" title={t('vouchers.demo')}>{t('vouchers.demoBody')}</Notice>,
  lookup:<Card title={t('desk.lookup')}><form className="stack" onSubmit={e=>{e.preventDefault();lookup();}}><Field label={t('desk.code')} hint={t('desk.codeHint')}>{id=><Input id={id} value={input} onChange={e=>setInput(e.target.value)} maxLength={500} autoCapitalize="characters" autoComplete="off"/>}</Field><Button type="submit">{t('desk.find')}</Button></form></Card>,
  result:<div className="stack">{searched&&!v&&!share&&<Notice tone="warn">{t('desk.missing')}</Notice>}{share&&<Card title={campaign?.name[lang]||share.code}><div className="stack"><strong>{share.code}</strong><p>{t('desk.sharedCode')}</p><Link to={`/promotions/${encodeURIComponent(share.code)}`}>{t('promotions.preview')}</Link>{!shareClaims.length?<Notice>{t('desk.claimFirst')}</Notice>:<Field label={t('desk.selectCustomer')}>{id=><select id={id} className="input" value={voucherId} onChange={e=>choose(e.target.value)}><option value="">{t('vouchers.select')}</option>{shareClaims.map(c=><option key={c.id} value={c.voucherId}>{demoUserById(c.userId)?.name??c.userId} · {vouchers.find(v=>v.id===c.voucherId)?.code}</option>)}</select>}</Field>}</div></Card>}{v&&<Card title={v.recipientName||demoUserById(v.claimedBy??'')?.name||v.title} actions={<Badge>{t(`vouchers.${v.status}`)}</Badge>}><div className="stack"><strong className="promotion-code">{v.code}</strong><div className="promotion-summary"><span><strong>{v.benefitKind==='cop'?formatCOP(v.balance,lang):v.balance}</strong>{t('vouchers.balance')}</span><span><strong>{v.participantCap}</strong>{t('vouchers.cap')} · {t(`vouchers.${v.capScope}`)}</span></div><p>{t('vouchers.unit')}: {t(v.creditUnit==='per_person'?'vouchers.per_person':'vouchers.group')}</p><p>{t('desk.expiry')}: {v.expiresAt?new Date(v.expiresAt).toLocaleDateString(lang):t('vouchers.noExpiry')}</p><p>{t('desk.owner')}: {v.claimedBy?(demoUserById(v.claimedBy)?.name??v.claimedBy):t('desk.notClaimed')}</p><p>{t('vouchers.cancelPolicy')}: {t(`vouchers.${v.cancellationPolicy}`)}</p><Notice>{t('desk.verifyHint')}</Notice><CheckboxField checked={verified} onChange={setVerified}>{t('desk.verified')}</CheckboxField></div></Card>}</div>,
  bookings:v?<div className="stack"><h2>{t('desk.existing')}</h2><Notice>{t('desk.noDoubleDebit')}</Notice>{!bookings.some(b=>b.voucherId===v.id)&&<p>{t('desk.noBooking')}</p>}{bookings.filter(b=>b.voucherId===v.id).map(b=>{const s=sessions.find(s=>s.id===b.sessionId);const canCancel=b.status==='booked'&&!!s&&Date.parse(s.starts_at)>Date.now();return <Card key={b.id} title={s?.title||t('vouchers.booking')} actions={<Badge>{t(`vouchers.${b.status}`)}</Badge>}><div className="stack"><p>{s&&new Date(s.starts_at).toLocaleString(lang)}</p><p>{b.participants.map(p=>p.name).join(' · ')}</p><p>{t('desk.debited',{n:b.cost})}</p>{b.confirmedAt&&<Notice tone="success">{t('desk.confirmed')}</Notice>}{b.status==='booked'&&<div className="row wrap"><Button disabled={busy||!verified||!!b.confirmedAt} onClick={()=>run({type:'confirm_booking',bookingId:b.id,verificationConfirmed:true})}>{t('desk.confirmBooking')}</Button><Button disabled={busy||!verified||!b.confirmedAt} variant="secondary" onClick={()=>run({type:'attendance',bookingId:b.id})}>{t('desk.checkin')}</Button>{canCancel&&<Button disabled={busy||!verified} variant="ghost" onClick={()=>setCancelId(b.id)}>{t('vouchers.cancel')}</Button>}</div>}{cancelId===b.id&&canCancel&&<Notice tone="warn" title={t('desk.cancelReview')}><div className="stack"><p>{t(`vouchers.${v.cancellationPolicy}`)} · {t('desk.cancelLimit')}</p><div className="row wrap"><Button disabled={busy||!verified} variant="danger" onClick={async()=>{if(await run({type:'cancel',bookingId:b.id}))setCancelId('');}}>{t('desk.confirmCancel')}</Button><Button variant="secondary" onClick={()=>setCancelId('')}>{t('desk.keepBooking')}</Button></div></div></Notice>}</div></Card>;})}</div>:null,
  walkup:v?<Card title={t('desk.walkup')}><div className="stack"><p>{t('desk.walkupHint')}</p>{!usable&&<Notice tone="warn">{t('desk.notEligible')}</Notice>}<Field label={t('vouchers.session')}>{id=><select id={id} className="input" value={selectedSession?sessionId:''} onChange={e=>setSessionId(e.target.value)}><option value="">{t('vouchers.select')}</option>{available.map(s=><option key={s.id} value={s.id}>{s.title} · {new Date(s.starts_at).toLocaleString(lang)}</option>)}</select>}</Field>{!available.length&&<Notice>{t('vouchers.noSessions')}</Notice>}{names.map((name,i)=><Field key={i} label={t('vouchers.participant',{n:i+1})} required>{id=><Input id={id} value={name} maxLength={120} onChange={e=>setNames(ns=>ns.map((n,j)=>i===j?e.target.value:n))}/>}</Field>)}<div className="row wrap"><Button variant="secondary" disabled={names.length>=participantLimit} onClick={()=>setNames(n=>[...n,''])}>{t('vouchers.add')}</Button><Button variant="ghost" disabled={names.length===1} onClick={()=>setNames(n=>n.slice(0,-1))}>{t('vouchers.remove')}</Button></div><p>{t('vouchers.total',{total:v.benefitKind==='cop'?formatCOP(total,lang):total,balance:v.benefitKind==='cop'?formatCOP(v.balance,lang):v.balance})}</p><CheckboxField checked={consent} onChange={setConsent}>{t('vouchers.consent')}</CheckboxField><Button loading={busy} disabled={!usable||!verified||!consent||!selectedSession||names.some(n=>!n.trim())} onClick={async()=>{if(!selectedSession)return;const r=await run({type:'book',voucherId:v.id,sessionId,participants:names.map((name,i)=>({name:name.trim(),...(i===0?{userId:v.claimedBy}:{})})),contactConsent:true,verificationConfirmed:true,costPerPerson:cost});if(r){setSessionId('');setNames(['']);setConsent(false);}}}>{t('desk.book')}</Button><p className="small muted">{t('desk.cancelLimit')}</p></div></Card>:null,
 };
 return <div className="container page"><div className="page-head"><h1>{t('desk.title')}</h1><p>{t('desk.sub')}</p><Link to="/hub/promotions">{t('promotions.hub')}</Link></div><div className="stack">{blocks.notice}{error&&<Notice tone="danger">{t('vouchers.error')}</Notice>}{sections.filter(s=>s!=='notice'&&isVisible(s)).map(s=><Fragment key={s}>{blocks[s]}</Fragment>)}</div></div>;
}
