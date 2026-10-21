import { Fragment, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { demoUserById } from '../../auth/demoUsers';
import { useData, useTable } from '../../data/DataContext';
import { parsePromotionCode, promotionShareUrl, publicPromotionPreview, type PromotionCampaignRow, type PromotionShareRow, type PromotionClaimRow, type PromotionEventRow, type PromotionCommand } from '../../data/promotions';
import type { VoucherBookingRow } from '../../data/vouchers';
import { useLayout } from '../../layout/useLayout';
import { formatCOP } from '../../i18n/format';
import { copyText } from '../../app/clipboard';
import { tenant } from '../../tenant/tenant';
import { Card } from '../../components/molecule/Card/Card';
import { Notice } from '../../components/molecule/Notice/Notice';
import { Field } from '../../components/molecule/Field/Field';
import { Input } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Wordmark } from '../../components/atom/Wordmark/Wordmark';
import { promoteSpec, offerSpec, performanceSpec } from './specs';
import './promotions.css';

function usePromotionActions() {
  const data=useData(); const {user,role}=useSession(); const lock=useRef(false);
  const [busy,setBusy]=useState(false), [error,setError]=useState(false);
  async function run(command:Record<string,unknown>) {
    if(lock.current)return null; lock.current=true;setBusy(true);setError(false);
    try {if(!data.promotion)throw new Error('unavailable');return await data.promotion({...command,requestId:crypto.randomUUID(),actorId:user.id,role} as PromotionCommand);}
    catch {setError(true);return null;}finally{lock.current=false;setBusy(false);}
  }
  return {run,busy,error};
}
const eligible=(c:Pick<PromotionCampaignRow,'status'|'published'|'startsAt'|'expiresAt'>)=>c.status==='approved'&&c.published&&(!c.startsAt||Date.parse(c.startsAt)<=Date.now())&&(!c.expiresAt||Date.parse(c.expiresAt)>Date.now());

export function PromotePage() {
  const {t,lang}=useI18n();const {user}=useSession();const {sections,isVisible}=useLayout(promoteSpec);
  const {rows:campaigns}=useTable<PromotionCampaignRow>('promotion_campaigns');
  const {rows:shares}=useTable<PromotionShareRow>('promotion_shares',{where:{createdBy:user.id}});
  const {rows:claims}=useTable<PromotionClaimRow>('promotion_claims',{where:{referrerId:user.id}});
  const {rows:events}=useTable<PromotionEventRow>('promotion_events',{where:{actorId:user.id}});
  const {rows:bookings}=useTable<VoucherBookingRow>('voucher_bookings');
  const {run,busy,error}=usePromotionActions();
  const [campaignId,setCampaignId]=useState(''),[recipientLabel,setRecipient]=useState(''),[privateContext,setContext]=useState(''),[customCode,setCode]=useState('');
  const [message,setMessage]=useState(t('promotions.defaultMessage',{studio:tenant.name}));const [flash,setFlash]=useState('');
  const campaign=campaigns.find(c=>c.id===campaignId);const options=campaigns.filter(eligible);
  const linkFor=(s:PromotionShareRow)=>promotionShareUrl(s.code,window.location.href);
  const share=async(s:PromotionShareRow,mode:'copy'|'native')=>{
    const current=campaigns.find(c=>c.id===s.campaignId);if(!current||!eligible(current)){setFlash(t('promotions.unavailable'));return;}
    const url=linkFor(s), text=s.message;
    if(mode==='native'&&typeof navigator.share==='function'){
      try{await navigator.share({title:tenant.name,text,url});await run({type:'handoff',shareId:s.id,channel:'native'});setFlash(t('promotions.handoff'));}
      catch(e){setFlash(t(e instanceof DOMException&&e.name==='AbortError'?'promotions.cancelledShare':'promotions.copyFailed'));}
    }else if(await copyText(`${text}\n${url}`)){await run({type:'handoff',shareId:s.id,channel:'copy'});setFlash(t('promotions.copied'));}else setFlash(t('promotions.copyFailed'));
  };
  const blocks:Record<string,ReactNode>={
    notice:<Notice tone="warn" title={t('vouchers.demo')}>{t('vouchers.demoBody')}</Notice>,
    create:<Card title={t('promotions.campaign')}><div className="promotion-grid"><div className="stack">
      <Field label={t('promotions.campaign')}>{id=><select id={id} className="input" value={campaignId} onChange={e=>setCampaignId(e.target.value)}><option value="">{t('promotions.select')}</option>{options.map(c=><option key={c.id} value={c.id}>{c.name[lang]}</option>)}</select>}</Field>
      {!options.length&&<Notice>{t('promotions.noCampaign')}</Notice>}
      <Field label={t('promotions.recipient')}>{id=><Input id={id} value={recipientLabel} onChange={e=>setRecipient(e.target.value)} maxLength={120}/>}</Field>
      <Field label={t('promotions.context')} hint={t('promotions.privateHint')}>{id=><textarea id={id} className="input" rows={2} value={privateContext} onChange={e=>setContext(e.target.value)} maxLength={300}/>}</Field>
      <Field label={t('promotions.customCode')} hint={t('promotions.codeHint')}>{id=><Input id={id} value={customCode} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={32} autoCapitalize="characters"/>}</Field>
      <Field label={t('promotions.message')} hint={t('promotions.messageHint')}>{id=><textarea id={id} className="input" rows={4} value={message} onChange={e=>setMessage(e.target.value)} maxLength={600}/>}</Field>
      <Button loading={busy} disabled={!campaign||!message.trim()} onClick={async()=>{const r=await run({type:'create_share',campaignId,recipientLabel,privateContext,customCode:customCode.trim()||undefined,message});if(r){setRecipient('');setContext('');setCode('');setFlash('');}}}>{t('promotions.create')}</Button>
    </div><div className="stack"><span className="eyebrow">{t('promotions.preview')}</span><Card tone="highlight"><div className="stack"><Wordmark variant="blue" height={28}/><h2>{campaign?.name[lang]||t('promotions.select')}</h2>{campaign&&<><strong>{campaign.benefitKind==='cop'?formatCOP(campaign.benefitTotal,lang):`${campaign.benefitTotal} · ${t('vouchers.classes')}`}</strong><p>{campaign.publicDescription[lang]}</p><p>{t('vouchers.people',{n:campaign.participantCap})}</p><p>{campaign.expiresAt?new Date(campaign.expiresAt).toLocaleDateString(lang):t('vouchers.noExpiry')}</p></>}<p>{message}</p></div></Card><Notice>{t('promotions.nativeHint')}</Notice></div></div></Card>,
    history:<div className="stack"><h2>{t('promotions.history')}</h2>{!shares.length&&<Notice>{t('promotions.empty')}</Notice>}{shares.slice().reverse().map(s=>{
      const c=campaigns.find(c=>c.id===s.campaignId);const ownClaims=claims.filter(x=>x.shareId===s.id);const bs=bookings.filter(b=>ownClaims.some(x=>x.voucherId===b.voucherId));
      return <Card key={s.id} title={c?.name[lang]} actions={<Badge>{t('vouchers.demo')}</Badge>}><div className="stack"><strong className="promotion-code">{s.code}</strong>{s.recipientLabel&&<p>{t('promotions.recipient')}: {s.recipientLabel}</p>}{s.privateContext&&<p className="small muted">{t('promotions.context')}: {s.privateContext}</p>}<p>{s.message}</p><a className="promotion-link" href={linkFor(s)}>{linkFor(s)}</a><div className="row wrap"><Button disabled={busy||!c||!eligible(c)} onClick={()=>share(s,'native')} icon="share">{t('promotions.share')}</Button><Button disabled={busy||!c||!eligible(c)} variant="secondary" onClick={()=>share(s,'copy')} icon="link">{t('promotions.copy')}</Button></div><div className="promotion-summary"><span><strong>{ownClaims.length}</strong>{t('promotions.claims')}</span><span><strong>{bs.filter(b=>b.status!=='cancelled').length}</strong>{t('promotions.bookings')}</span><span><strong>{bs.filter(b=>b.status==='attended').reduce((n,b)=>n+b.participants.length,0)}</strong>{t('promotions.attendance')}</span><span><strong>{events.filter(e=>e.shareId===s.id&&e.kind==='handoff').length}</strong>{t('promotions.copies')}</span></div></div></Card>;
    })}</div>,
  };
  return <div className="container page"><div className="page-head"><h1>{t('promotions.title')}</h1><p>{t('promotions.subtitle')}</p><Link to="/hub/promotions">{t('promotions.hub')}</Link></div><div className="stack">{blocks.notice}{error&&<Notice tone="danger">{t('promotions.error')}</Notice>}{flash&&<Notice>{flash}</Notice>}{sections.filter(s=>s!=='notice'&&isVisible(s)).map(s=><Fragment key={s}>{blocks[s]}</Fragment>)}</div></div>;
}

export function PromotionOfferPage(){
  const {code}=useParams();const navigate=useNavigate();const {t,lang}=useI18n();const {user,role,switchUser}=useSession();const {sections,isVisible}=useLayout(offerSpec);
  const {rows:shares}=useTable<PromotionShareRow>('promotion_shares');const {rows:campaigns}=useTable<PromotionCampaignRow>('promotion_campaigns');const {rows:claims}=useTable<PromotionClaimRow>('promotion_claims',{where:{userId:user.id}});
  const [input,setInput]=useState(code??'');const [invalid,setInvalid]=useState(false);const {run,busy,error}=usePromotionActions();
  const rawShare=shares.find(s=>s.code.toUpperCase()===(code??'').toUpperCase());const rawCampaign=campaigns.find(c=>c.id===rawShare?.campaignId);const preview=(()=>{try{return rawShare&&rawCampaign?publicPromotionPreview(rawCampaign,rawShare):null;}catch{return null;}})();const share=preview?{id:preview.shareId,code:preview.code,message:preview.message}:undefined;const campaign=preview?{...preview,id:preview.campaignId}:undefined;const claim=claims.find(c=>c.campaignId===campaign?.id);
  const blocks:Record<string,ReactNode>={
    notice:<Notice tone="warn" title={t('vouchers.demo')}>{t('vouchers.demoBody')}</Notice>,
    offer:<div className="stack"><Card title={t('promotions.enterCode')}><form className="stack" onSubmit={e=>{e.preventDefault();try{const c=parsePromotionCode(input,window.location.origin);setInvalid(false);navigate(`/promotions/${encodeURIComponent(c)}`);}catch{setInvalid(true);}}}><Field label={t('promotions.enterCode')}>{id=><Input id={id} value={input} onChange={e=>setInput(e.target.value)} maxLength={500}/>}</Field><Button type="submit">{t('promotions.find')}</Button></form></Card>{invalid||!share||!campaign?<Notice>{t('promotions.missing')}</Notice>:<Card tone="highlight"><div className="stack"><Wordmark variant="blue" height={28}/><h2>{campaign.name[lang]}</h2><p>{campaign.publicDescription[lang]}</p><strong className="promotion-code">{share.code}</strong><h3>{campaign.benefitKind==='cop'?formatCOP(campaign.benefitTotal,lang):`${campaign.benefitTotal} · ${t('vouchers.classes')}`}</h3><p>{t('vouchers.people',{n:campaign.participantCap})} · {t(`vouchers.${campaign.capScope}`)}</p><p>{t('vouchers.unit')}: {t(campaign.creditUnit==='per_person'?'vouchers.per_person':'vouchers.group')}</p><p>{campaign.expiresAt?new Date(campaign.expiresAt).toLocaleDateString(lang):t('vouchers.noExpiry')} · {t(`vouchers.${campaign.cancellationPolicy}`)}</p><p>{share.message}</p><Notice title={t('promotions.eligibility')}>{t('promotions.eligibilityBody')}</Notice>{claim?<><Notice tone="success">{t('promotions.claimDone')}</Notice><Link to={`/app/vouchers/${claim.voucherId}`}>{t('promotions.openVoucher')}</Link></>:!eligible(campaign)?<Notice tone="warn">{t('promotions.unavailable')}</Notice>:role==='customer'?<Button loading={busy} onClick={async()=>{const r=await run({type:'claim_share',shareId:share.id,userId:user.id});if(r?.voucher)navigate(`/app/vouchers/${r.voucher.id}`);}}>{t('promotions.claim')}</Button>:<><Notice>{t('promotions.testSwitch')}</Notice><Button variant="secondary" onClick={()=>switchUser('customer')}>{t('promotions.testCustomer')}</Button></>}</div></Card>}<Link to="/hub/promotions">{t('promotions.hub')}</Link></div>,
  };
  return <div className="container page promotion-offer-page"><div className="page-head"><h1>{t('promotions.offerTitle')}</h1></div><div className="stack">{blocks.notice}{error&&<Notice tone="danger">{t('promotions.error')}</Notice>}{sections.filter(s=>s!=='notice'&&isVisible(s)).map(s=><Fragment key={s}>{blocks[s]}</Fragment>)}</div></div>;
}

export function PromotionPerformancePage(){
  const {t,lang}=useI18n();const {role}=useSession();const {sections,isVisible}=useLayout(performanceSpec);const {run,busy,error}=usePromotionActions();
  const {rows:campaigns}=useTable<PromotionCampaignRow>('promotion_campaigns');const {rows:shares}=useTable<PromotionShareRow>('promotion_shares');const {rows:claims}=useTable<PromotionClaimRow>('promotion_claims');const {rows:bookings}=useTable<VoucherBookingRow>('voucher_bookings');
  const promoters=[...new Set(shares.map(s=>s.createdBy))];const blocks:Record<string,ReactNode>={
    notice:<Notice tone="warn" title={t('vouchers.demo')}>{t('vouchers.demoBody')}</Notice>,
    campaigns:<div className="stack"><h2>{t('promotions.campaigns')}</h2><Notice>{t('promotions.manage')}</Notice><div className="promotion-grid">{campaigns.map(c=><Card key={c.id} title={c.name[lang]} actions={<Badge>{t(`promotions.${c.status}`)}</Badge>}><div className="stack"><p>{c.publicDescription[lang]}</p><strong>{c.benefitTotal} · {t(c.benefitKind==='cop'?'vouchers.cop':'vouchers.classes')}</strong><p>{t('promotions.claimLimit',{n:c.maxClaims??'∞'})}</p><p>{c.expiresAt?new Date(c.expiresAt).toLocaleDateString(lang):t('vouchers.noExpiry')}</p>{['admin','super_admin'].includes(role)&&c.status!=='draft'&&<Button disabled={busy} variant="secondary" onClick={()=>run({type:'set_campaign_status',campaignId:c.id,status:c.status==='paused'?'approved':'paused'})}>{t(c.status==='paused'?'promotions.resume':'promotions.pause')}</Button>}</div></Card>)}</div></div>,
    results:<div className="stack"><h2>{t('promotions.resultsTitle')}</h2><p>{t('promotions.metricsHint')}</p>{!promoters.length&&<Notice>{t('promotions.empty')}</Notice>}{promoters.map(id=>{const own=claims.filter(c=>c.referrerId===id);const bs=bookings.filter(b=>own.some(c=>c.voucherId===b.voucherId));return <Card key={id} title={demoUserById(id)?.name??id}><div className="promotion-summary"><span><strong>{shares.filter(s=>s.createdBy===id).length}</strong>{t('promotions.link')}</span><span><strong>{own.length}</strong>{t('promotions.claims')}</span><span><strong>{bs.filter(b=>b.status!=='cancelled').length}</strong>{t('promotions.bookings')}</span><span><strong>{bs.filter(b=>b.status==='attended').reduce((n,b)=>n+b.participants.length,0)}</strong>{t('promotions.attendance')}</span></div></Card>;})}<div className="row wrap">{role!=='coordinator'&&<Link to="/teach/promote">{t('promotions.promote')}</Link>}<Link to="/staff/vouchers">{t('desk.title')}</Link>{['admin','super_admin'].includes(role)&&<Link to="/admin/vouchers">{t('promotions.adminVouchers')}</Link>}</div></div>,
  };
  return <div className="container page"><div className="page-head"><h1>{t('promotions.resultsTitle')}</h1><Link to="/hub/promotions">{t('promotions.hub')}</Link></div><div className="stack">{blocks.notice}{error&&<Notice tone="danger">{t('promotions.error')}</Notice>}{sections.filter(s=>s!=='notice'&&isVisible(s)).map(s=><Fragment key={s}>{blocks[s]}</Fragment>)}</div></div>;
}
