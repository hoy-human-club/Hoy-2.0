import {useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {useI18n} from '../../../i18n/I18nProvider';
import {useData} from '../../../data/DataContext';
import {formatCOP} from '../../../i18n/format';
import {checkSaleQuote} from '../../../data/operationalQuotes';
import {useOperationalCatalog,useReviewedQuote} from '../../../modules/quotes/hooks';
import {advanceGift,createGiftDraft,giftStatus,type GiftDraft} from '../../../modules/voucher-gifts/model';
import {Card} from '../../molecule/Card/Card';
import {QuoteNotice} from '../../molecule/QuoteNotice/QuoteNotice';
import {Notice} from '../../molecule/Notice/Notice';
import {Field} from '../../molecule/Field/Field';
import {Input} from '../../atom/Input/Input';
import {Button} from '../../atom/Button/Button';

/** Deliberately component memory only: no provider mutations and no delivery methods. */
export function VoucherGiftDemo({initialGift=null,initialError=""}:{initialGift?:GiftDraft|null;initialError?:string}){
 const {t,lang}=useI18n(),data=useData(),[params,setParams]=useSearchParams();
 const [item,setItem]=useState('gift_single'),[email,setEmail]=useState(''),[recipient,setRecipient]=useState('');
 const [gift,setGift]=useState<GiftDraft|null>(initialGift),[error,setError]=useState(initialError),[busy,setBusy]=useState(false);
 const lock=useRef(false),catalog=useOperationalCatalog(),review=useReviewedQuote(catalog,item,1,null);
 const token=params.get('gift'),status=gift?giftStatus(gift):null;
 async function prepare(){
  if(lock.current||!review.available||!review.quote)return;
  lock.current=true;setBusy(true);setError('');
  try{
   const quote=await checkSaleQuote(data,review.quote);
   const next=createGiftDraft({id:`DEMO-${crypto.randomUUID()}`,email,classes:quote.classes,amount:quote.chargedAmount});
   setGift(next);setRecipient('');
  }catch{setError('giftDemo.invalid');}finally{lock.current=false;setBusy(false);}
 }
 function advance(action:'confirm'|'redeem'){
  if(!gift)return;
  try{setGift(advanceGift(gift,action,recipient));setError('');}
  catch(e){setError(e instanceof Error&&e.message==='recipient'?'giftDemo.recipientError':`giftDemo.${giftStatus(gift)}`);}
 }
 function reset(){setGift(null);setEmail('');setRecipient('');setError('');setParams({});}
 if(token&&(!gift||token!==gift.id))return <Notice tone="warn" action={<Button onClick={reset}>{t('giftDemo.new')}</Button>}>{t('giftDemo.missing')}</Notice>;
 return <div className="stack">
  {error&&<Notice tone="danger">{t(error)}</Notice>}
  {!gift&&<Card><form className="stack" onSubmit={e=>{e.preventDefault();void prepare();}} noValidate>
   <QuoteNotice catalog={catalog} review={review}/>
   <Notice>{t('giftDemo.empty')}</Notice>
   <Field label={t('giftDemo.product')}>{id=><select id={id} className="input" value={item} onChange={e=>setItem(e.target.value)}>{['gift_single','gift_pack12'].map(id=>{const q=catalog.quote(id);return <option key={id} value={id} disabled={!q}>{q?t('giftDemo.classes',{n:q.classes,amount:formatCOP(q.amount,lang)}):t('quotes.unavailable')}</option>;})}</select>}</Field>
   <Field label={t('giftDemo.email')} required>{id=><Input id={id} type="email" maxLength={160} value={email} onChange={e=>setEmail(e.target.value)}/>}</Field>
   {review.quote&&<p>{t('giftDemo.classes',{n:review.quote.classes,amount:formatCOP(review.quote.chargedAmount,lang)})}</p>}
   <p className="small muted">{t('giftDemo.terms')}</p>
   <Button type="submit" disabled={!review.available} loading={busy}>{t('giftDemo.prepare')}</Button>
  </form></Card>}
  {gift&&<Card><div className="stack">
   <h2>{t(status==='redeemed'?'giftDemo.redeemedTitle':`giftDemo.${status}`)}</h2>{status==='redeemed'&&<Notice tone="success">{t('giftDemo.redeemed',{classes:gift.balance})}</Notice>}
   <p>{t('giftDemo.classes',{n:gift.classes,amount:formatCOP(gift.amount,lang)})}</p>
   {status==='pending'&&<><p>{t('giftDemo.transfer',{id:gift.id})}</p><Button onClick={()=>advance('confirm')}>{t('giftDemo.confirm')}</Button></>}
   {status==='ready'&&<>
    <Link to={`?gift=${encodeURIComponent(gift.id)}`}>{t('giftDemo.open')}</Link>
    {token===gift.id&&<form className="stack" onSubmit={e=>{e.preventDefault();advance('redeem');}} noValidate><Field label={t('giftDemo.recipient')} required>{id=><Input id={id} type="email" maxLength={160} value={recipient} onChange={e=>setRecipient(e.target.value)}/>}</Field><Button type="submit">{t('giftDemo.redeem')}</Button></form>}
   </>}
   {!!gift.previews.length&&<section className="stack-sm" aria-label={t('giftDemo.preview')}><h3>{t('giftDemo.preview')}</h3>{gift.previews.map(kind=><Notice key={kind}>{t(`giftDemo.${kind}Body`,{email:gift.email,classes:gift.classes})}</Notice>)}</section>}
   <Button variant="secondary" onClick={reset}>{t('giftDemo.new')}</Button>
  </div></Card>}
 </div>;
}
