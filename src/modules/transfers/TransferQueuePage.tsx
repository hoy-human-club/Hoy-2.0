import {useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useData} from '../../data/DataContext';
import type {PaymentRow,TransferReceiptRow} from '../../data/schema';
import {useSession} from '../../auth/SessionProvider';
import {useI18n} from '../../i18n/I18nProvider';
import {useLayout} from '../../layout/useLayout';
import {Button} from '../../components/atom/Button/Button';
import {Input,Select} from '../../components/atom/Input/Input';
import {Badge} from '../../components/atom/Badge/Badge';
import {Card} from '../../components/molecule/Card/Card';
import {Notice} from '../../components/molecule/Notice/Notice';
import {Drawer} from '../../components/organism/Drawer/Drawer';
import {formatCOP,formatDateTime} from '../../i18n/format';
import {transferSpec} from './specs';
import {reviewTransfer} from './receipts';
import {tenant} from '../../tenant/tenant';
import {emptyQueue,readQueue,projectQueue,entryMatches,queueTables,validAmount,type QueueEntry} from './pendingQueue';
export function TransferQueuePage(){
 const data=useData(),{user,role}=useSession(),{t,bi,lang}=useI18n(),{sections,isVisible}=useLayout(transferSpec);const [params,setParams]=useSearchParams();
 const [snapshot,setSnapshot]=useState(emptyQueue),[loading,setLoading]=useState(true),[readError,setReadError]=useState(false),[revision,setRevision]=useState(0);
 const {receipts:rows,payments}=snapshot;
 const [filter,setFilter]=useState('pending'),[amount,setAmount]=useState(''),[reason,setReason]=useState(''),[compared,setCompared]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 useEffect(()=>{let active=true;setLoading(true);setReadError(false);readQueue(data,tenant.id).then(value=>{if(active)setSnapshot(value);}).catch(()=>{if(active)setReadError(true);}).finally(()=>{if(active)setLoading(false);});const unsub=queueTables.map(table=>data.subscribe(table,()=>setRevision(n=>n+1)));return()=>{active=false;unsub.forEach(stop=>stop());};},[data,revision]);
 const entries=projectQueue(snapshot,tenant.id),ready=!loading&&!readError;
 const selected=ready?rows.find(r=>r.id===params.get('receipt')):undefined,payment=payments.find(p=>p.id===selected?.payment_id&&p.user_id===selected?.user_id);
 const detail=ready?entries.find(e=>e.payment?.id===params.get('payment')):undefined;
 function money(pay:PaymentRow|null){const value=validAmount(pay);return value===null?t('transfers.unknownAmount'):pay?.currency==='COP'?formatCOP(value,lang):`${value.toLocaleString(lang)} ${pay?.currency?.trim()||t('transfers.unknownCurrency')}`;}
 function date(value:string|undefined){return value&&Number.isFinite(Date.parse(value))?formatDateTime(value,lang):t('transfers.unknownDate');}
 function product(entry:QueueEntry){return entry.receipts[0]?.product_name?bi(entry.receipts[0].product_name):entry.plan?`${lang==='es'?entry.plan.name_es:entry.plan.name_en} · ${t('transfers.catalogFallback')}`:t('transfers.unknownProduct');}
 function method(pay:PaymentRow|null){const known=['cash','transfer','card','pse','qr','gift_card'];return pay&&known.includes(pay.method)?t(`transfers.payMethod.${pay.method}`):t('transfers.unknownMethod');}
 function provider(pay:PaymentRow|null){return pay?.provider==='manual'?t('transfers.manualProvider'):pay?.provider==='wompi'?'Wompi':t('transfers.unknownProvider');}
 function facts(entry:QueueEntry){return <div className="stack-sm" style={{overflowWrap:'anywhere'}}><strong>{entry.customer??t('transfers.unknownCustomer')}</strong><p>{product(entry)} · {money(entry.payment)}</p><p>{t('transfers.paymentMethod')}: {method(entry.payment)} · {provider(entry.payment)}</p><p>{t('transfers.when')} · {date(entry.payment?.created_at??entry.receipts[0]?.created_at)}</p><p>{t(entry.receipts.some(r=>r.image_data_url?.startsWith('data:image/'))?'transfers.receiptAvailable':'transfers.receiptMissing')}</p></div>;}
 function open(r:TransferReceiptRow){setParams({receipt:r.id});setAmount('');setReason('');setCompared(false);setError(null);}
 async function decide(decision:'approved'|'rejected'){if(!selected||!ready)return;setBusy(true);setError(null);try{await reviewTransfer(data,{id:selected.id,actorId:user.id,role,decision,amount:amount.trim()===''?NaN:Number(amount),reason,compared});setParams({});setRevision(n=>n+1);}catch(e){setError(e instanceof Error&&e.message==='trial_used'?'transfers.trialUsed':'transfers.reviewError');}finally{setBusy(false);}}
 const boundary=<div className="stack-sm"><Notice tone="warn">{t('transfers.boundary')}</Notice><Notice>{t('transfers.queueTiming')}</Notice></div>;
 const content=<section className="stack"><label className="stack-sm"><span>{t('transfers.filter')}</span><Select value={filter} onChange={e=>setFilter(e.target.value)}>{['pending','approved','rejected','all'].map(s=><option key={s} value={s}>{t(`transfers.${s}`)}</option>)}</Select></label>
  {loading?<p role="status">{t('core.common.loading')}</p>:readError?<Notice tone="danger" action={<Button onClick={()=>setRevision(n=>n+1)}>{t('transfers.retry')}</Button>}>{t('transfers.readError')}</Notice>:<>
  {entries.filter(e=>entryMatches(e,filter)).length===0&&<p>{t('transfers.empty')}</p>}
  {(params.has('receipt')&&!selected||params.has('payment')&&!detail)&&<Notice tone="warn" action={<Button onClick={()=>setParams({})}>{t('transfers.close')}</Button>}>{t('transfers.unavailable')}</Notice>}
  {entries.filter(e=>entryMatches(e,filter)).map(entry=>{const receipt=entry.receipts.find(r=>filter==='all'||r.status===filter)??entry.receipts[0];const status=entry.payment?.status==='pending'?'pending':receipt?.status;return <Card key={entry.id}><div className="stack-sm">{facts(entry)}<Badge tone={status==='approved'?'success':status==='rejected'?'danger':'warn'}>{t(`transfers.${status}`)}</Badge><p className="xs muted">{t('transfers.queueTiming')}</p>{receipt?<Button variant="secondary" onClick={()=>open(receipt)}>{t('transfers.open')}</Button>:<Button variant="secondary" onClick={()=>setParams({payment:entry.payment!.id})}>{t('transfers.paymentDetail')}</Button>}</div></Card>;})}</>}

 </section>;
 const review=<Drawer open={!!selected} onClose={()=>{if(!busy)setParams({});}} title={t('transfers.open')} side="right">{selected&&<div className="stack"><Notice tone="warn">{t('transfers.boundary')}</Notice>{selected.image_data_url?.startsWith('data:image/')?<img src={selected.image_data_url} alt={t('transfers.preview')} style={{width:'100%',height:'auto'}}/>:<Notice>{t('transfers.receiptMissing')}</Notice>}<p>{bi(selected.product_name)} · {money(payment??null)}</p><Notice>{t('transfers.bank')} · {money(payment??null)}</Notice>
 {selected.status==='pending'?<><label className="stack-sm"><span>{t('transfers.amount')}</span><Input type="number" min="0" step="1" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label className="stack-sm"><span>{t('transfers.reason')}</span><Input value={reason} maxLength={500} onChange={e=>setReason(e.target.value)}/></label><label className="row"><input type="checkbox" checked={compared} onChange={e=>setCompared(e.target.checked)}/><span>{t('transfers.compared')}</span></label>{error&&<Notice tone="danger">{t(error)}</Notice>}<div className="stack-sm"><Button disabled={busy||!payment||validAmount(payment)===null||!compared||!reason.trim()||amount.trim()===''||Number(amount)!==payment?.amount} loading={busy} onClick={()=>void decide('approved')}>{t('transfers.approve')}</Button><Button variant="secondary" disabled={busy||!payment||validAmount(payment)===null||!compared||!reason.trim()||amount.trim()===''||Number(amount)<0} onClick={()=>void decide('rejected')}>{t('transfers.reject')}</Button><Button variant="ghost" disabled={busy} onClick={()=>setParams({})}>{t('transfers.cancel')}</Button></div></>:<><Badge>{t(`transfers.${selected.status}`)}</Badge><p>{selected.review_reason}</p><p>{selected.amount_received===null?t('transfers.unknownAmount'):formatCOP(selected.amount_received,lang)}</p></>}
 </div>}</Drawer>;
 const paymentDetail=<Drawer open={!!detail} onClose={()=>setParams({})} title={t('transfers.paymentDetail')} side="right">{detail&&<div className="stack"><Notice>{t('transfers.readOnly')}</Notice>{facts(detail)}<Notice>{t('transfers.queueTiming')}</Notice><Button onClick={()=>setParams({})}>{t('transfers.close')}</Button></div>}</Drawer>;
 const parts:Record<string,React.ReactNode>={Boundary:boundary,Queue:content,Review:<>{review}{paymentDetail}</>};
 return <div className="stack"><div className="page-head"><h1>{t('transfers.title')}</h1></div>{sections.filter(isVisible).map(name=><div key={name}>{parts[name]}</div>)}</div>;
}
