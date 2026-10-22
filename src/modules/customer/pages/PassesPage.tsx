import {useRef} from 'react';
import {useOperationalCatalog,useReviewedQuote} from '../../quotes/hooks';
import {QuoteNotice} from '../../../components/molecule/QuoteNotice/QuoteNotice';
import {checkSaleQuote,quotedItem,readPaymentQuote} from '../../../data/operationalQuotes';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import { formatCOP, formatDate, addDaysKey, dateKey, fromDateKey, MS } from '../../../i18n/format';
import { type PriceItem } from '../../../tenant/pricing';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { StatTile } from '../../../components/molecule/StatTile/StatTile';
import { PriceRow } from '../../../components/molecule/PriceRow/PriceRow';
import { OrderSummary } from '../../../components/molecule/OrderSummary/OrderSummary';
import { Field } from '../../../components/molecule/Field/Field';
import { Select } from '../../../components/atom/Input/Input';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { PACKAGE_IDS, PASS_IDS, priceOf, useEntitlements, usePackageActions } from '../hooks';
import { activatePaidPackage, recordPayment, wompiCheckout } from '../payments';
import { policy } from '../policy';
import { PageHead } from '../ui';

const PENDING_PASS_KEY = 'hoyos.customer.pendingPass';

/** C-07 — the trial class and the individual class: pay one class at a time (0051). */
export function PassesPage() {
  const { t, bi, lang } = useI18n();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const ent = useEntitlements();
  const catalog=useOperationalCatalog();
  const session = params.get('session');

  const pick = (id: string) => {
    if (session) { nav(`/app/checkout/${session}?pass=${id}`); return; }
    try { sessionStorage.setItem(PENDING_PASS_KEY, id); } catch { /* ignore */ }
    nav('/app/schedule');
  };

  return (
    <div className="container page cust-page">
      <PageHead back="/app/plans" title={t('customer.passes.title')} sub={t('customer.passes.sub')} />
      <div className="stack">
        {ent.classBalance > 0 && <Notice tone="info" title={t('customer.passes.package', { n: ent.classBalance })} action={<Link to="/app/classes"><Button size="sm" variant="secondary">{t('customer.classes.title')}</Button></Link>}>{t('customer.passes.package.body')}</Notice>}
        <div><div className="eyebrow">{t('customer.passes.eyebrow')}</div><p className="small muted">{t('customer.passes.intro')}</p></div>
        <div className="stack-sm">
          {PASS_IDS.map((id) => {
            const q=catalog.quote(id),p=q?quotedItem(q):priceOf(id);
            if(!q)return <Card key={id} tone="muted"><p>{t('quotes.unavailable')}</p></Card>;
            if (id === 'trial' && ent.trial.status!=='eligible') return <Notice key={id} tone="warn" action={ent.trial.status==='trial_check_failed'?<Button onClick={ent.trial.retry}>{t('core.common.retry')}</Button>:undefined}>{t(`customer.trialGuard.${ent.trial.status}`)}</Notice>;
            return (
              <Card key={id} className="cust-pass" padding="md">
                <div className="row-between wrap">
                  <div className="grow"><strong>{bi(p.name)}</strong><div className="small muted">{bi(p.description)}</div></div>
                  <strong className="cust-pass-price">{formatCOP(p.price ?? 0, lang)}</strong>
                </div>
                <Button block onClick={() => pick(id)}>{session ? t('customer.passes.bookWith') : t('customer.passes.cta')}</Button>
              </Card>
            );
          })}
        </div>
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.passes.footer')} <Link to="/app/plans">{t('customer.passes.footer.link')} →</Link> · <Link to="/app/classes">{t('customer.classes.title')} →</Link></p>
      </div>
    </div>
  );
}

/**
 * C-07b — Mis clases (0051; was "Créditos"): the package in use, the classes left, when they run out, the freeze
 * (once per package, up to the M-08 freezeMaxDays, the expiry moves by the same days) and every movement.
 */
export function ClassesPage() {
  const { t, bi, lang } = useI18n();
  const data = useData();
  const { user } = useSession();
  const ent = useEntitlements();
  const { freeze, resume } = usePackageActions();
  const [buying, setBuying] = useState<PriceItem | null>(null);
  const catalog=useOperationalCatalog(),review=useReviewedQuote(catalog,buying?.id??null,1,30);
  const purchaseKey=useRef(crypto.randomUUID()),purchaseBusy=useRef(false);
  const [purchaseError,setPurchaseError]=useState(false);
  const shownBuying=review.quote?quotedItem(review.quote):buying;
  const [sheet, setSheet] = useState(false);
  const [days, setDays] = useState(() => Math.min(14, policy.freezeMaxDays));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const { pkg } = ent;
  const packs = [...PACKAGE_IDS, 'single'].flatMap(id=>{const q=catalog.quote(id);return q?[quotedItem(q)]:[];});
  const ledger = [...ent.ledger].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const today = dateKey();
  const soon = !pkg.frozen && pkg.expiresAt && (fromDateKey(pkg.expiresAt).getTime() - Date.now()) < 7 * MS.day;
  const purchase = pkg.purchase;
  const purchasedPayment=ent.payments.find(p=>p.id===purchase?.payment_id),purchasedQuote=purchasedPayment?readPaymentQuote(purchasedPayment):null;
  const planName = purchasedQuote?bi(purchasedQuote.name):ent.plan ? bi({ es: ent.plan.name_es, en: ent.plan.name_en }) : t('customer.classes.package');
  const options = [7, 14, 21, 30].filter((d) => d <= policy.freezeMaxDays);

  const buy = async () => {
    if(!buying||!review.quote||!review.available||purchaseBusy.current)return;
    purchaseBusy.current=true;setBusy(true);setPurchaseError(false);const frozen=review.quote;
    try{
      await checkSaleQuote(data,frozen);
      const result=await wompiCheckout({amount:frozen.chargedAmount,method:'card'});
      if(!data.atomic)throw Error('atomic_unavailable');
      await data.atomic(async tx=>{
        const payment=await recordPayment(tx,{userId:user.id,planId:frozen.planId,amount:frozen.chargedAmount,method:'card',result,ivaRate:policy.ivaRate,quote:frozen});
        if(result.status!=='approved')return;
        await activatePaidPackage(tx,{paymentId:payment.id,userId:user.id,planId:frozen.planId,classes:frozen.classes,expiresAt:frozen.entitlementExpiresAt!});
      },{idempotencyKey:`classes:${user.id}:${purchaseKey.current}`});
      if(result.status==='approved')setDone(true);else{purchaseKey.current=crypto.randomUUID();setPurchaseError(true);}
    }catch{setPurchaseError(true);}finally{setBusy(false);purchaseBusy.current=false;}
  };
  const doFreeze = async () => {
    if (!purchase) return;
    setBusy(true);
    try { await freeze(purchase, days); setFlash(t('customer.classes.freeze.ok', { date: formatDate(addDaysKey(today, days - 1), lang) })); setSheet(false); }
    finally { setBusy(false); }
  };

  const packGrid = (
    <section className="stack-sm">
      <h2 className="cust-h2">{t('customer.classes.topUp')}</h2>
      <Card padding="none">{packs.map((p) => <PriceRow key={p.id} item={p} onSelect={p=>{purchaseKey.current=crypto.randomUUID();setDone(false);setPurchaseError(false);setBuying(p);}} />)}</Card>
      <p className="xs muted">{t('customer.classes.topUp.note')}</p>
    </section>
  );

  return (
    <div className="container page cust-page">
      <PageHead back="/app/more" title={t('customer.classes.title')} sub={t('customer.classes.sub')} />
      <div className="stack">
        {flash && <Notice tone="success">{flash}</Notice>}
        {pkg.frozen && purchase && <Notice tone="info" title={t('customer.classes.frozen.title')} action={<Button size="sm" variant="secondary" onClick={() => { void resume(purchase).then(() => setFlash(t('customer.classes.resumed'))); }}>{t('customer.classes.resume')}</Button>}>{t('customer.classes.frozen.body', { date: formatDate(pkg.frozenUntil!, lang) })}</Notice>}
        <div className="grid grid-2">
          <StatTile label={t('customer.classes.balance')} value={pkg.left} hint={purchase ? planName : undefined} />
          <StatTile label={t('customer.classes.expires')} value={pkg.expiresAt ? formatDate(pkg.expiresAt, lang) : '—'} hint={soon ? t('customer.classes.expiringSoon') : undefined} />
        </div>
        {soon && <Notice tone="warn">{t('customer.classes.expiringSoon.body', { date: formatDate(pkg.expiresAt!, lang) })}</Notice>}
        {purchase && (
          <ListGroup>
            <ListRow icon="pause" title={t('customer.classes.freeze')}
              subtitle={pkg.freezeUsed ? t('customer.classes.freeze.used') : t('customer.classes.freeze.sub', { days: policy.freezeMaxDays })}
              onClick={() => setSheet(true)} disabled={pkg.freezeUsed || pkg.left === 0} />
          </ListGroup>
        )}
        {!purchase && pkg.left === 0 && <Card padding="sm"><EmptyState compact title={t('customer.classes.package.none')} body={t('customer.classes.package.none.body', { months: Math.round((priceOf('pack12').validityDays ?? 90) / 30) })} action={<Link to="/app/plans"><Button>{t('customer.home.membership.cta')}</Button></Link>} /></Card>}
        {pkg.left === 0 && packGrid}
        <section className="stack-sm">
          <h2 className="cust-h2">{t('customer.classes.ledger')}</h2>
          <Card padding="sm">
            {ledger.length === 0 && <EmptyState compact title={t('customer.classes.ledger.empty')} />}
            {ledger.map((c) => (
              <div key={c.id} className="cust-ledger-row">
                <span className={`cust-ledger-delta ${c.delta > 0 ? 'is-plus' : 'is-minus'}`}>{c.delta > 0 ? `+${c.delta}` : c.delta}</span>
                <span className="grow"><span className="small">{t(`customer.classes.reason.${c.reason}`)}</span><span className="xs muted"> · {formatDate(c.created_at, lang)}</span>{c.frozen_from && <span className="xs muted"> · {t('customer.classes.frozenRange', { from: formatDate(c.frozen_from, lang), to: formatDate(c.frozen_until ?? c.frozen_from, lang) })}</span>}</span>
                {c.expires_at && c.delta > 0 && <Badge tone={c.expires_at < today ? 'danger' : 'neutral'}>{c.expires_at < today ? t('customer.classes.expired') : t('customer.classes.until', { date: formatDate(c.expires_at, lang) })}</Badge>}
              </div>
            ))}
          </Card>
        </section>
        {pkg.left > 0 && packGrid}
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.classes.note', { h: policy.cancelWindowHours })}</p>
      </div>

      <Drawer open={!!buying} onClose={() => { setBuying(null); setDone(false); }} side="bottom" title={done ? t('customer.classes.done.title') : t('customer.classes.buy.title')}>
        {buying && shownBuying && !done && (
          <div className="stack">
            <QuoteNotice catalog={catalog} review={review}/>
            {purchaseError&&<Notice tone="danger">{t('quotes.failed')}</Notice>}
            <OrderSummary lines={[{ label: bi(shownBuying.name), amount:review.quote?.chargedAmount??0 }]} taxRate={policy.ivaRate} subtotalLabel={t('customer.checkout.subtotal')} taxLabel={t('customer.checkout.iva')} totalLabel={t('customer.checkout.total')} note={t('customer.checkout.receiptNote')} />
            {buying.audience && <Notice tone="info">{t('customer.plans.benefit.affiliates')}</Notice>}
            <Button block size="lg" disabled={!review.available} loading={busy} onClick={buy}>{t('customer.checkout.payWompi', { amount: formatCOP(review.quote?.chargedAmount??0,lang) })}</Button>
          </div>
        )}
        {done && buying && <Notice tone="success" title={t('customer.classes.done.title')}>{t('customer.classes.done.body', { n:review.quote?.classes??buying.classes??1 })}</Notice>}
      </Drawer>

      <Drawer open={sheet} onClose={() => setSheet(false)} side="bottom" title={t('customer.classes.freeze')}>
        {purchase && (
          <div className="stack">
            <p className="small muted">{t('customer.classes.freeze.body', { days: policy.freezeMaxDays })}</p>
            <Field label={t('customer.classes.freeze.days')}>{(id) => <Select id={id} value={days} onChange={(e) => setDays(Number(e.target.value))}>{options.map((d) => <option key={d} value={d}>{t('customer.classes.freeze.option', { n: d })}</option>)}</Select>}</Field>
            <p className="small">{t('customer.classes.freeze.preview', { until: formatDate(addDaysKey(today, days - 1), lang), expires: purchase.expires_at ? formatDate(addDaysKey(purchase.expires_at, days), lang) : '—' })}</p>
            <Button block size="lg" loading={busy} onClick={doFreeze}>{t('customer.classes.freeze.cta')}</Button>
            <Button block variant="ghost" onClick={() => setSheet(false)}>{t('core.common.cancel')}</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
