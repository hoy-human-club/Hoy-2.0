import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { saveLocalProduct } from '../../data/catalogRevision';
import { changeLocalPublication } from '../../data/catalogPublication';
import { tenant } from '../../tenant/tenant';
import { useData } from '../../data/DataContext';
import { useSession } from '../../auth/SessionProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { dateKey, formatCOP } from '../../i18n/format';
import { Card } from '../../components/molecule/Card/Card';
import { Field } from '../../components/molecule/Field/Field';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { Input, Select } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Badge } from '../../components/atom/Badge/Badge';
import { quoteProduct, validateProduct, type CatalogPlan, type ProductDefinition, type ProductQuote } from '../../data/productCatalog';
import './products.css';

const blank = (): ProductDefinition => ({code:'',name:{es:'',en:''},type:'paquetes',classes:1,validityDays:30,active:false,prices:[{id:'price_1',amount:0,startsOn:dateKey(),endsOn:null}]});

/** Draft-only catalog: no legacy/public price fields are changed by saving this screen. */
export function ProductsPage() {
 const data = useData(), {user,role} = useSession(), {t,bi,lang} = useI18n();
 const [rows,setRows] = useState<CatalogPlan[]>([]), [loading,setLoading] = useState(true), [readError,setReadError] = useState(false), [refresh,setRefresh] = useState(0);
 const [selected,setSelected] = useState<CatalogPlan | null>(null), [draft,setDraft] = useState<ProductDefinition | null>(null), [saving,setSaving] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('');
 const [publicationReview,setPublicationReview] = useState<{plan:CatalogPlan;action:'publish'|'withdraw'} | null>(null);
 const [quoteDate,setQuoteDate] = useState(dateKey()), [examples,setExamples] = useState<ProductQuote[]>([]);
 useEffect(()=>{
  let alive=true; setLoading(true); setReadError(false);
  const load=()=>data.list<CatalogPlan>('plans').then(r=>{if(alive){setRows(r);setLoading(false);}}).catch(()=>{if(alive){setReadError(true);setLoading(false);}});
  void load(); const off=data.subscribe('plans',()=>void load()); return ()=>{alive=false;off();};
 },[data,refresh]);
 const edit = (plan:CatalogPlan | null) => {
  setSelected(plan);setError('');setNotice('');
  setDraft(plan?.frontend_catalog ? structuredClone(plan.frontend_catalog.definition) : plan ? {...blank(),code:plan.slug.toUpperCase().replace(/[^A-Z0-9_-]/g,'_').slice(0,32),name:{es:plan.name_es,en:plan.name_en},type:plan.family,classes:plan.classes ?? 1,validityDays:plan.validity_days ?? 30,active:false,prices:[{id:'price_1',amount:plan.price,startsOn:dateKey(),endsOn:null}]} : blank());
 };
 const patch=(change:Partial<ProductDefinition>)=>setDraft(d=>d?{...d,...change}:null);
 const save=async()=>{
  if(!draft)return;
  const problem=validateProduct(draft,rows.filter(r=>r.id!==selected?.id).flatMap(r=>r.frontend_catalog?[r.frontend_catalog.definition]:[]));
  if(problem){setError(`products.error.${problem}`);return;}
  setSaving(true);setError('');setNotice('');
  try {
   await saveLocalProduct(data,{id:selected?.id??null,before:selected?.frontend_catalog??null,definition:draft,actorId:user.id,role});
   setDraft(null);setSelected(null);setNotice('products.saved');setRefresh(n=>n+1);
  } catch(e) {setError(e instanceof Error && e.message==='conflict'?'products.conflict':'products.saveError');}
  finally {setSaving(false);}
 };
 const publish=async()=>{
  if(!publicationReview)return;
  setSaving(true);setError('');setNotice('');
  try {
   const {plan,action}=publicationReview;
   await changeLocalPublication(data,{planId:plan.id,action,expectedRevision:action==='publish'?plan.frontend_catalog!.history.length:plan.frontend_publication!.revision,actorId:user.id,expectedTenant:tenant.id});
   setPublicationReview(null);setNotice(action==='publish'?'products.published':'products.withdrawn');setRefresh(n=>n+1);
  }catch(e){setError(e instanceof Error&&e.message==='conflict'?'products.conflict':'products.publicationError');}
  finally{setSaving(false);}
 };
 const definitions=rows.filter(r=>r.frontend_catalog);
 const quotePlan=rows.find(r=>r.id===selected?.id);
 let quote:ProductQuote | null=null, quoteError='products.error.invalid';
 try {if(quotePlan){quote=quoteProduct(quotePlan,quoteDate);quoteError='';}}catch(e){quoteError=`products.error.${e instanceof Error?e.message:'invalid'}`;}
 return <div className="stack products-page">
  <div className="page-head"><h1>{t('products.title')}</h1><Button onClick={()=>edit(null)} disabled={saving}>{t('products.add')}</Button></div>
  <Card tone="highlight"><p>{t('products.notice')}</p></Card>
  <Link className="btn btn-secondary" to="/admin/products/preview">{t('products.openPreview')}</Link>
  {error&&!draft&&<p role="alert">{t(error)}</p>}
  {notice && <p role="status">{t(notice)}</p>}
  {loading ? <EmptyState tone="loading" title={t('core.common.loading')}/> : readError ? <EmptyState tone="error" title={t('products.readError')} action={<Button onClick={()=>setRefresh(n=>n+1)}>{t('products.retry')}</Button>}/> : rows.length===0 ? <EmptyState title={t('products.empty')}/> :
   <div className="grid grid-2">{rows.map(plan=><Card key={plan.id} title={plan.frontend_catalog?bi(plan.frontend_catalog.definition.name):bi({es:plan.name_es,en:plan.name_en})} actions={<Button variant="secondary" onClick={()=>edit(plan)} disabled={saving}>{t(plan.frontend_catalog?'products.edit':'products.import')}</Button>}>
    {plan.frontend_catalog ? <div className="stack-sm"><strong>{plan.frontend_catalog.definition.code}</strong><span>{t(`products.type.${plan.frontend_catalog.definition.type}`)} · {plan.frontend_catalog.definition.classes} {t('products.classes')} · {plan.frontend_catalog.definition.validityDays} {t('products.validity')}</span><Badge tone={plan.frontend_catalog.definition.active?'success':'neutral'}>{t(plan.frontend_catalog.definition.active?'products.active':'products.inactive')}</Badge>{plan.frontend_catalog.definition.prices.map(price=><div key={price.id} className="small">{formatCOP(price.amount,lang)} · {price.startsOn} – {price.endsOn ?? '∞'}</div>)}<div className="row wrap"><Button variant="secondary" disabled={saving||!plan.frontend_catalog.definition.active} onClick={()=>{setError('');setPublicationReview({plan:structuredClone(plan),action:'publish'});}}>{t('products.reviewPublication')}</Button>{plan.frontend_publication&&!plan.frontend_publication.withdrawnAt&&<Button variant="ghost" disabled={saving} onClick={()=>{setError('');setPublicationReview({plan:structuredClone(plan),action:'withdraw'});}}>{t('products.reviewWithdrawal')}</Button>}</div><span className="small">{t(plan.frontend_publication&&!plan.frontend_publication.withdrawnAt?'products.publicationActive':'products.unpublished')}</span></div> : <p className="muted small">{t('products.pending')}</p>}
   </Card>)}</div>}
  {publicationReview&&<Card title={t(publicationReview.action==='publish'?'products.reviewPublication':'products.reviewWithdrawal')}><div className="stack" role="region" aria-label={t('products.publicationReview')}>
   <p>{t('products.publicationReviewNotice')}</p><strong>{bi(publicationReview.plan.frontend_catalog!.definition.name)} · #{publicationReview.action==='publish'?publicationReview.plan.frontend_catalog!.history.length:publicationReview.plan.frontend_publication!.revision}</strong>
   {publicationReview.plan.frontend_catalog!.definition.prices.map(price=><p key={price.id}>{formatCOP(price.amount,lang)} · {price.startsOn} – {price.endsOn??'∞'}</p>)}
   <div className="row wrap"><Button disabled={saving} onClick={()=>void publish()}>{t(publicationReview.action==='publish'?'products.confirmPublication':'products.confirmWithdrawal')}</Button><Button variant="ghost" disabled={saving} onClick={()=>{setPublicationReview(null);setError('');}}>{t('products.cancelPublication')}</Button></div>
  </div></Card>}
  {draft && <Card title={t(selected?'products.edit':'products.add')}>
   <form className="stack" onSubmit={e=>{e.preventDefault();void save();}} noValidate><fieldset className="stack products-fields" disabled={saving}>
    <div className="grid grid-2">
     <Field label={t('products.code')} required>{id=><Input id={id} name="code" maxLength={32} value={draft.code} onChange={e=>patch({code:e.target.value.toUpperCase()})}/>}</Field>
     <Field label={t('products.type')} required>{id=><Select id={id} name="type" value={draft.type} onChange={e=>patch({type:e.target.value as ProductDefinition['type']})}>{(['bienvenida','paquetes','privadas','regalos'] as const).map(type=><option key={type} value={type}>{t(`products.type.${type}`)}</option>)}</Select>}</Field>
     {(['es','en'] as const).map(l=><Field key={l} label={t(`products.name.${l}`)} required>{id=><Input id={id} name={`name_${l}`} maxLength={100} value={draft.name[l]} onChange={e=>patch({name:{...draft.name,[l]:e.target.value}})}/>}</Field>)}
     <Field label={t('products.classes')} required>{id=><Input id={id} name="classes" type="number" min={1} max={1000} step={1} value={draft.classes} onChange={e=>patch({classes:Number(e.target.value)})}/>}</Field>
     <Field label={t('products.validity')} required>{id=><Input id={id} name="validity" type="number" min={1} max={3650} step={1} value={draft.validityDays} onChange={e=>patch({validityDays:Number(e.target.value)})}/>}</Field>
    </div>
    <Toggle label={t('products.active')} checked={draft.active} onChange={active=>patch({active})} disabled={saving}/>
    {draft.prices.map((price,index)=><Card key={price.id} padding="sm"><div className="grid grid-3">
     <Field label={t('products.amount')} required>{id=><Input id={id} name={`amount_${index}`} type="number" min={0} step={1} value={price.amount} onChange={e=>patch({prices:draft.prices.map((p,i)=>i===index?{...p,amount:Number(e.target.value)}:p)})}/>}</Field>
     <Field label={t('products.starts')} required>{id=><Input id={id} name={`starts_${index}`} type="date" value={price.startsOn} onChange={e=>patch({prices:draft.prices.map((p,i)=>i===index?{...p,startsOn:e.target.value}:p)})}/>}</Field>
     <Field label={t('products.ends')}>{id=><Input id={id} name={`ends_${index}`} type="date" value={price.endsOn ?? ''} onChange={e=>patch({prices:draft.prices.map((p,i)=>i===index?{...p,endsOn:e.target.value||null}:p)})}/>}</Field>
    </div><Button type="button" variant="ghost" onClick={()=>patch({prices:draft.prices.filter((_,i)=>i!==index)})}>{t('products.removePrice')}</Button></Card>)}
    <div className="row wrap"><Button type="button" variant="secondary" onClick={()=>patch({prices:[...draft.prices,{id:`price_${Date.now()}`,amount:0,startsOn:dateKey(),endsOn:null}]})}>{t('products.addPrice')}</Button><Button type="submit" disabled={saving}>{t('products.save')}</Button><Button type="button" variant="ghost" disabled={saving} onClick={()=>{setDraft(null);setError('');}}>{t('products.cancel')}</Button></div>
    {error && <p role="alert">{t(error)}</p>}
   </fieldset></form>
   {selected?.frontend_catalog && <div className="stack products-quote"><h2>{t('products.quote')}</h2><Field label={t('products.quoteDate')}>{id=><Input id={id} name="quote_date" type="date" value={quoteDate} onChange={e=>setQuoteDate(e.target.value)}/>}</Field>{quote ? <div className="row wrap"><strong data-testid="quote-amount">{formatCOP(quote.amount,lang)}</strong><Button onClick={()=>setExamples(xs=>[...xs,structuredClone(quote!)])}>{t('products.snapshot')}</Button></div> : <p role="status">{t(quoteError)}</p>}
    <h3>{t('products.history')}</h3>{selected.frontend_catalog.history.map(revision=><p className="small" key={revision.revision}>#{revision.revision} · {revision.at} · {revision.actorId} · {revision.definition.code} · {revision.definition.prices.map(p=>`${p.amount} COP (${p.startsOn} – ${p.endsOn??'∞'})`).join('; ')}</p>)}
   </div>}
  </Card>}
  {examples.length>0 && <Card title={t('products.examples')}><p className="small muted">{t('products.snapshotNote')}</p>{examples.map((q,i)=><p key={i} data-testid="quote-snapshot">{q.code} · {q.purchaseDate} · {formatCOP(q.amount,lang)} · #{q.catalogRevision}</p>)}</Card>}
  {!draft && definitions.length>0 && <p className="small muted">{t('products.snapshotNote')}</p>}
 </div>;
}
