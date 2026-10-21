import {useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useData,useTable} from '../../data/DataContext';
import type {PaymentRow,ProfileRow,TransferReceiptRow} from '../../data/schema';
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
export function TransferQueuePage(){
 const data=useData(),{user,role}=useSession(),{t,bi,lang}=useI18n(),{sections,isVisible}=useLayout(transferSpec);const [params,setParams]=useSearchParams();
 const {rows:payments}=useTable<PaymentRow>('payments'),{rows:profiles}=useTable<ProfileRow>('profiles');
 const [rows,setRows]=useState<TransferReceiptRow[]>([]),[loading,setLoading]=useState(true),[readError,setReadError]=useState(false),[revision,setRevision]=useState(0);
 const [filter,setFilter]=useState('pending'),[amount,setAmount]=useState(''),[reason,setReason]=useState(''),[compared,setCompared]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 useEffect(()=>{let active=true;setLoading(true);setReadError(false);data.list<TransferReceiptRow>('transfer_receipts',{orderBy:{column:'created_at',dir:'desc'}}).then(r=>{if(active)setRows(r);}).catch(()=>{if(active)setReadError(true);}).finally(()=>{if(active)setLoading(false);});const unsub=data.subscribe('transfer_receipts',()=>setRevision(n=>n+1));return()=>{active=false;unsub();};},[data,revision]);
 const selected=rows.find(r=>r.id===params.get('receipt')),payment=payments.find(p=>p.id===selected?.payment_id);
 function open(r:TransferReceiptRow){setParams({receipt:r.id});setAmount('');setReason('');setCompared(false);setError(null);}
 async function decide(decision:'approved'|'rejected'){if(!selected)return;setBusy(true);setError(null);try{await reviewTransfer(data,{id:selected.id,actorId:user.id,role,decision,amount:amount.trim()===''?NaN:Number(amount),reason,compared});setParams({});setRevision(n=>n+1);}catch(e){setError(e instanceof Error&&e.message==='trial_used'?'transfers.trialUsed':'transfers.reviewError');}finally{setBusy(false);}}
 const boundary=<div className="stack-sm"><Notice tone="warn">{t('transfers.boundary')}</Notice><Notice>{t('transfers.timing')}</Notice></div>;
 const content=<section className="stack"><label className="stack-sm"><span>{t('transfers.filter')}</span><Select value={filter} onChange={e=>setFilter(e.target.value)}>{['pending','approved','rejected','all'].map(s=><option key={s} value={s}>{t(`transfers.${s}`)}</option>)}</Select></label>
  {loading?<p role="status">{t('core.common.loading')}</p>:readError?<Notice tone="danger" action={<Button onClick={()=>setRevision(n=>n+1)}>{t('transfers.retry')}</Button>}>{t('transfers.readError')}</Notice>:<>
  {rows.filter(r=>filter==='all'||r.status===filter).length===0&&<p>{t('transfers.empty')}</p>}
  {rows.filter(r=>filter==='all'||r.status===filter).map(r=>{const pay=payments.find(p=>p.id===r.payment_id);return <Card key={r.id}><div className="stack-sm"><div className="row-between wrap"><strong>{profiles.find(p=>p.user_id===r.user_id)?.full_name??t('transfers.member')}</strong><Badge tone={r.status==='approved'?'success':r.status==='rejected'?'danger':'warn'}>{t(`transfers.${r.status}`)}</Badge></div><p>{bi(r.product_name)} · {formatCOP(pay?.amount??0,lang)}</p><p className="small muted">{t('transfers.when')} · {formatDateTime(r.created_at,lang)}</p><p className="xs muted">{t('transfers.timing')}</p><Button variant="secondary" onClick={()=>open(r)}>{t('transfers.open')}</Button></div></Card>;})}</>}
 </section>;
 const review=<Drawer open={!!selected} onClose={()=>{if(!busy)setParams({});}} title={t('transfers.open')} side="right">{selected&&<div className="stack"><Notice tone="warn">{t('transfers.boundary')}</Notice><img src={selected.image_data_url} alt={t('transfers.preview')} style={{width:'100%',height:'auto'}}/><p>{bi(selected.product_name)} · {formatCOP(payment?.amount??0,lang)}</p><Notice>{t('transfers.bank')} · {formatCOP(payment?.amount??0,lang)}</Notice>
 {selected.status==='pending'?<><label className="stack-sm"><span>{t('transfers.amount')}</span><Input type="number" min="0" step="1" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label className="stack-sm"><span>{t('transfers.reason')}</span><Input value={reason} maxLength={500} onChange={e=>setReason(e.target.value)}/></label><label className="row"><input type="checkbox" checked={compared} onChange={e=>setCompared(e.target.checked)}/><span>{t('transfers.compared')}</span></label>{error&&<Notice tone="danger">{t(error)}</Notice>}<div className="stack-sm"><Button disabled={busy||!compared||!reason.trim()||amount.trim()===''||Number(amount)!==payment?.amount} loading={busy} onClick={()=>void decide('approved')}>{t('transfers.approve')}</Button><Button variant="secondary" disabled={busy||!compared||!reason.trim()||amount.trim()===''||Number(amount)<0} onClick={()=>void decide('rejected')}>{t('transfers.reject')}</Button><Button variant="ghost" disabled={busy} onClick={()=>setParams({})}>{t('transfers.cancel')}</Button></div></>:<><Badge>{t(`transfers.${selected.status}`)}</Badge><p>{selected.review_reason}</p><p>{formatCOP(selected.amount_received??0,lang)}</p></>}
 </div>}</Drawer>;
 const parts:Record<string,React.ReactNode>={Boundary:boundary,Queue:content,Review:review};
 return <div className="stack"><div className="page-head"><h1>{t('transfers.title')}</h1></div>{sections.filter(isVisible).map(name=><div key={name}>{parts[name]}</div>)}</div>;
}
