import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useWhatsappLink } from '../../admin/settings';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import { formatCOP, formatDate, addDays, dateKey } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { pricingByFamily, priceItem, type PriceItem } from '../../../tenant/pricing';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { PriceRow } from '../../../components/molecule/PriceRow/PriceRow';
import { OrderSummary } from '../../../components/molecule/OrderSummary/OrderSummary';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { PACKAGE_IDS, PASS_IDS, useEntitlements } from '../hooks';
import { activatePaidPackage, recordPayment, wompiCheckout } from '../payments';
import { policy } from '../policy';
import { PageHead } from '../ui';
import { useActions } from '../../../actions';
import { need, useAppNavHandlers } from '../actions';
import { canvasSpecs } from '../specs';

const spec = canvasSpecs['C-06'];
const PENDING_PASS_KEY = 'hoyos.customer.pendingPass';
/** Package dates carry the year: three months can cross into the next one. */
const DATE_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/**
 * C-06 Planes (0051) — the launch list: the 12-class package (and its Santa María Tennis Club price) bought here,
 * the trial and individual class (C-07), private classes (WhatsApp) and gift cards (C-17). No membership, no credits.
 */
export function PlansPage() {
  const { t, bi, lang } = useI18n();
  // 0047: private classes and specials are a `specials` handoff (M-08a contacts; the front desk by default).
  const wa = useWhatsappLink();
  const specials = wa.resolve('specials');
  const nav = useNavigate();
  const data = useData();
  const { user } = useSession();
  const ent = useEntitlements();
  const [params] = useSearchParams();
  const packages = PACKAGE_IDS.map((id) => priceItem(id)!).filter(Boolean);
  // W-xx → A-02 → here with ?plan=<id>: a package opens its confirmation; a single or trial class goes to the schedule with the pass ready.
  const wanted = params.get('plan');
  const preselected = packages.find((p) => p.id === wanted) ?? null;
  const [buying, setBuying] = useState<PriceItem | null>(preselected);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const months = Math.round((priceItem('pack12')?.validityDays ?? 90) / 30);
  const benefits = (p: PriceItem) => [
    t('customer.plans.benefit.classes', { n: p.classes ?? 12 }),
    t('customer.plans.benefit.validity', { months }),
    t('customer.plans.benefit.freeze', { days: policy.freezeMaxDays }),
    t('customer.plans.benefit.noRefund'),
  ];
  useEffect(() => {
    if (!wanted || !(PASS_IDS as readonly string[]).includes(wanted)) return;
    try { sessionStorage.setItem(PENDING_PASS_KEY, wanted); } catch { /* ignore */ }
    nav('/app/schedule', { replace: true });
  }, [wanted, nav]);

  // WebMCP (0025): app.choosePlan preselects a package and opens its confirmation — the same state as ?plan=<id>.
  // Paying stays a person's click on the confirmation's button.
  const navHandlers = useAppNavHandlers();
  const handlers = useMemo(() => ({
    ...navHandlers,
    'app.choosePlan': (p?: Record<string, string>) => {
      const id = need(p, 'plan');
      const plan = PACKAGE_IDS.map((x) => priceItem(x)!).find((x) => x?.id === id);
      if (!plan) throw new Error(`unknown plan "${id}" — one of ${PACKAGE_IDS.join(', ')}`);
      setDone(false); setBuying(plan);
      return `package ${plan.id} chosen; confirmation open`;
    },
  }), [navHandlers]);
  useActions(spec, handlers);

  const buy = async () => {
    if (!buying) return;
    setBusy(true); setError(false);
    try {
      const result = await wompiCheckout({ amount: buying.price ?? 0, method: 'card' }); // INTEGRATION SEAM: Wompi
      if (!data.atomic) throw new Error('atomic_unavailable');
      await data.atomic(async transaction => {
        const payment = await recordPayment(transaction, { userId: user.id, planId: `plan_${buying.id}`, amount: buying.price ?? 0, method: 'card', result, ivaRate: policy.ivaRate });
        if (result.status !== 'approved') return;
        await activatePaidPackage(transaction, { paymentId: payment.id, userId: user.id, planId: `plan_${buying.id}`, classes: buying.classes ?? 12, expiresAt: dateKey(addDays(new Date(), buying.validityDays ?? 90)) });
      });
      if (result.status === 'approved') setDone(true);
      else setError(true);
    } catch { setError(true); } finally { setBusy(false); }
  };

  return (
    <div className="container page cust-page">
      <PageHead title={t('customer.plans.title')} sub={t('customer.plans.sub')} />
      <div className="stack">
        {ent.pkg.purchase && (
          <Notice tone={ent.pkg.frozen ? 'warn' : 'success'} title={t('customer.plans.current', { plan: ent.plan ? bi({ es: ent.plan.name_es, en: ent.plan.name_en }) : t('customer.classes.package') })} action={<Link to="/app/classes"><Button size="sm" variant="secondary">{t('customer.plans.manage')}</Button></Link>}>
            {t('customer.plans.left', { n: ent.pkg.left })}
            <span className="cust-plan-dates xs">
              <span>{t('customer.plans.starts')}: <strong>{formatDate(ent.pkg.purchase.created_at, lang, DATE_OPTS)}</strong></span>
              {ent.pkg.expiresAt && <span>{t('customer.plans.ends')}: <strong>{formatDate(ent.pkg.expiresAt, lang, DATE_OPTS)}</strong></span>}
            </span>
          </Notice>
        )}
        <div className="cust-plans">
          {packages.map((p, i) => (
            <Card key={p.id} className={`cust-plan ${i === 0 ? 'is-featured' : ''} ${preselected?.id === p.id ? 'is-preselected' : ''}`} raised={i === 0} padding="lg">
              <div className="row-between wrap"><h2 className="cust-h2">{bi(p.name)}</h2>{p.badge && <Badge tone="highlight">{bi(p.badge)}</Badge>}</div>
              <p className="small muted">{bi(p.description)}</p>
              <div className="cust-plan-price"><strong>{formatCOP(p.price ?? 0, lang)}</strong></div>
              <ul className="cust-checklist small">
                {benefits(p).map((b) => <li key={b}>{b}</li>)}
                {p.audience && <li>{t('customer.plans.benefit.affiliates')}</li>}
              </ul>
              <Button block size="lg" variant={i === 0 ? 'primary' : 'secondary'} onClick={() => { setDone(false); setBuying(p); }}>{t('customer.plans.cta')}</Button>
            </Card>
          ))}
        </div>
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.plans.note', { mats: tenant.studio.mats })}</p>
        <div className="cust-plans-links">
          <Card tone="muted" className="row-between wrap">
            <span className="small">{t('customer.plans.skip')}</span>
            <Link to="/app/passes"><Button size="sm" variant="secondary">{t('customer.plans.skip.cta')} →</Button></Link>
          </Card>
          <Card tone="muted" className="stack-sm">
            <strong className="small">{t('customer.plans.private.title')}</strong>
            {pricingByFamily('privadas').map((p) => <PriceRow key={p.id} item={p} />)}
            <div className="row wrap"><a href={wa.link('specials', t('customer.plans.specials.wa'))} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost">{t('customer.plans.specials.cta')} →</Button></a></div>
            {specials.note && <p className="xs muted">{bi(specials.note)}</p>}
          </Card>
          <Card tone="muted" className="row-between wrap">
            <span className="small">{t('customer.plans.gift')}</span>
            <Link to="/app/gift"><Button size="sm" variant="secondary">{t('customer.plans.gift.cta')} →</Button></Link>
          </Card>
        </div>
      </div>

      <Drawer open={!!buying} onClose={() => { setBuying(null); setDone(false); }} side="bottom" title={done ? t('customer.plans.done.title') : t('customer.plans.confirm.title')}>
        {buying && !done && (
          <div className="stack">
            <OrderSummary lines={[{ label: bi(buying.name), amount: buying.price ?? 0 }]} taxRate={policy.ivaRate} subtotalLabel={t('customer.checkout.subtotal')} taxLabel={t('customer.checkout.iva')} totalLabel={t('customer.checkout.total')} note={t('customer.plans.confirm.note', { months })} />
            {error && <Notice tone="danger">{t('customer.plans.paymentError')}</Notice>}
            {buying.audience && <Notice tone="info">{t('customer.plans.benefit.affiliates')}</Notice>}
            <Button block size="lg" loading={busy} onClick={buy}>{t('customer.checkout.payWompi', { amount: formatCOP(buying.price ?? 0, lang) })}</Button>
            <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.pay.wompi.seam')}</p>
          </div>
        )}
        {done && buying && (
          <div className="stack">
            <Notice tone="success" title={t('customer.plans.done.title')}>{t('customer.plans.done.body', { n: buying.classes ?? 12 })}</Notice>
            <Button block size="lg" onClick={() => nav('/app/schedule')}>{t('customer.home.next.cta')}</Button>
            <Button block variant="ghost" onClick={() => nav('/app/classes')}>{t('customer.plans.manage')}</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
