import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTable } from '../../data/DataContext';
import { useI18n } from '../../i18n/I18nProvider';
import { dateKey, formatCOP } from '../../i18n/format';
import { quotePublishedProduct } from '../../data/catalogPublication';
import type { CatalogPlan, ProductQuote } from '../../data/productCatalog';
import { Card } from '../../components/molecule/Card/Card';
import { Field } from '../../components/molecule/Field/Field';
import { Input } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import './products.css';

/** Isolated website-price preview. Only explicitly published local snapshots are read. */
export function ProductPreviewPage() {
 const {t,bi,lang}=useI18n();
 const {rows,loading}=useTable<CatalogPlan>('plans');
 const [day,setDay]=useState(dateKey()), [quotes,setQuotes]=useState<ProductQuote[]>([]);
 const published=rows.filter(p=>p.frontend_publication && !p.frontend_publication.withdrawnAt);
 return <div className="stack products-page">
  <div className="page-head"><h1>{t('products.previewTitle')}</h1><Link className="btn btn-secondary" to="/admin/products">{t('products.title')}</Link></div>
  <Card tone="highlight"><p>{t('products.previewNotice')}</p></Card>
  <Field label={t('products.quoteDate')}>{id=><Input id={id} name="preview_date" type="date" value={day} onChange={e=>setDay(e.target.value)}/>}</Field>
  {loading?<p role="status">{t('core.common.loading')}</p>:published.length===0?<Card><p>{t('products.noPublication')}</p></Card>:<div className="grid grid-2">{published.map(plan=>{
   let quote:ProductQuote|null=null,error='';try{quote=quotePublishedProduct(plan,day);}catch(e){error=`products.error.${e instanceof Error?e.message:'invalid'}`;}
   return <Card key={plan.id} title={bi(plan.frontend_publication!.snapshot.definition.name)}>
    <div className="stack-sm"><span>{plan.frontend_publication!.snapshot.definition.code} · #{plan.frontend_publication!.revision}</span>
    {quote?<><strong data-testid={`published-price-${plan.id}`}>{formatCOP(quote.amount,lang)}</strong><span>{quote.classes} {t('products.classes')} · {quote.validityDays} {t('products.validity')}</span><Button onClick={()=>setQuotes(xs=>xs.some(q=>q.productId===quote!.productId&&q.purchaseDate===quote!.purchaseDate&&q.catalogRevision===quote!.catalogRevision)?xs:[...xs,structuredClone(quote!)])}>{t('products.keepLocalQuote')}</Button></>:<p role="status">{t(error)}</p>}
    <Button disabled>{t('products.purchaseDisconnected')}</Button></div>
   </Card>;
  })}</div>}
  {quotes.length>0&&<Card title={t('products.localQuotes')}><p>{t('products.localQuoteNotice')}</p>{quotes.map((q,i)=><p key={i} data-testid="published-quote-snapshot">{q.code} · {q.purchaseDate} · {formatCOP(q.amount,lang)} · #{q.catalogRevision} · {q.classes} {t('products.classes')} · {q.validityDays} {t('products.validity')}</p>)}<Button variant="secondary" onClick={()=>setQuotes([])}>{t('products.clearQuotes')}</Button></Card>}
 </div>;
}
