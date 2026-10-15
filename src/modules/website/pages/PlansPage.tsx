import { useSiteEdition } from '../edition';
import { studioPhoto } from '../photography';
import { Fragment, type ReactNode } from 'react';
import { Link, useNavigate } from '../links';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { FAMILY_LABEL, FAMILY_RATIONALE, ON_REQUEST_FORMATS, pricingByFamily, priceItem } from '../../../tenant/pricing';
import { tenant } from '../../../tenant/tenant';
import { usePolicy, useWhatsappLink } from '../../admin/settings';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { PackageCard } from '../../../components/molecule/PackageCard/PackageCard';
import { PriceRow } from '../../../components/molecule/PriceRow/PriceRow';
import { formatCOP } from '../../../i18n/format';
import { PageHead, SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';

/**
 * P-01 — the launch price list (0051). Prices, names and the "why it exists" rationale come from src/tenant/pricing.ts;
 * the package rules (freeze once, up to N days) from the M-08 policy through usePolicy(); the IVA note from M-08 tax.
 * Order: the 12-class package first (the way to practise with consistency), then the trial and the individual class,
 * private classes and gift cards, and what is quoted on request (the studio rental, corporate experiences).
 */
export function PlansPage() {
  const { photoEdition } = useSiteEdition();
  const { t, bi, lang } = useI18n();
  // 0047: private classes, the space rental and corporate experiences are a `specials` handoff (M-08a contacts).
  const wa = useWhatsappLink();
  const specialsNote = wa.resolve('specials').note;
  const nav = useNavigate();
  const { sections, isVisible } = useLayout(siteSpecs.plans);
  const policy = usePolicy();
  const { tax } = policy;
  const buy = (id: string) => nav(`/auth/sign-in?next=${encodeURIComponent(`/app/plans?plan=${id}`)}`);
  const pack = priceItem('pack12');
  const months = Math.round((pack?.validityDays ?? 90) / 30);
  const packageRules = [
    t('site.plans.package.classes', { n: pack?.classes ?? 12 }),
    t('site.plans.package.validity', { months }),
    policy.freezesPerPackage === 1 ? t('site.plans.package.freeze', { days: policy.freezeMaxDays }) : t('site.plans.package.freezeN', { n: policy.freezesPerPackage, days: policy.freezeMaxDays }),
    t('site.plans.package.noRefund'),
  ];

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead title={t('site.plans.title')} body={t('site.plans.body')} />,
    Families: () => <>
      {/* the 12-class package, at the general price and at the Santa María Tennis Club price */}
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <div className="plans-heading"><p className="eyebrow">{bi(FAMILY_LABEL.paquetes)}</p><h2>{t('site.plans.package.title')}</h2><p className="muted">{bi(FAMILY_RATIONALE.paquetes.why)}</p></div>
        <div className="plans-packages">
          {pricingByFamily('paquetes').map((p, i, all) => (
            <PackageCard key={p.id} item={p} index={i + 1} total={all.length} tone={p.audience ? 'moss' : 'river'}
              eyebrow={p.audience ? bi(p.audience) : bi(FAMILY_RATIONALE.paquetes.role)} objectLabel={t('site.plans.package.objectLabel')}
              benefits={p.audience ? [...packageRules, t('site.plans.package.affiliates')] : packageRules}
              ctaLabel={t('site.plans.package.cta')} onSelect={() => buy(p.id)} />
          ))}
        </div>
      </section>
      {/* the trial class and the individual class */}
      <section className="container site-section">
        <div className="site-section-top"><div><p className="eyebrow">{bi(FAMILY_LABEL.bienvenida)}</p><h2>{t('site.plans.passesTitle')}</h2><p className="muted">{t('site.plans.passesBody')}</p></div></div>
        <div className="plans-pass-grid">{pricingByFamily('bienvenida').map((p) => <article className="plans-pass" key={p.id}><span className="eyebrow">{t('site.plans.oneClass')}</span><h3>{bi(p.name)}</h3><p className="small muted">{bi(p.description)}</p><strong className="plans-pass-price">{formatCOP(p.price ?? 0, lang)}</strong><Button variant="secondary" onClick={() => buy(p.id)}>{t('site.plans.select')}</Button></article>)}</div>
        {/* private classes and gift cards */}
        <div className="plans-secondary">
          <Card eyebrow={bi(FAMILY_RATIONALE.privadas.role)} title={bi(FAMILY_LABEL.privadas)}>
            <p className="small muted">{bi(FAMILY_RATIONALE.privadas.why)}</p>
            {pricingByFamily('privadas').map((p) => <PriceRow key={p.id} item={p} />)}
            <div className="stack-sm" style={{ marginTop: 'var(--stack-loose)' }}>
              <a href={wa.link('specials', t('site.plans.private.wa'))} target="_blank" rel="noreferrer"><Button variant="secondary">{t('site.plans.private.cta')} ↗</Button></a>
              {specialsNote && <p className="xs muted">{bi(specialsNote)}</p>}
            </div>
          </Card>
          <Card eyebrow={bi(FAMILY_RATIONALE.regalos.role)} title={bi(FAMILY_LABEL.regalos)}>
            <p className="small muted">{bi(FAMILY_RATIONALE.regalos.subtitle)}</p>
            {pricingByFamily('regalos').map((p) => <PriceRow key={p.id} item={p} onSelect={() => nav('/auth/sign-in?next=%2Fapp%2Fgift')} />)}
            <p className="small muted" style={{ marginTop: 'var(--stack)' }}>{t('site.plans.gift.note')}</p>
            <div style={{ marginTop: 'var(--stack-loose)' }}><Button variant="secondary" onClick={() => nav('/auth/sign-in?next=%2Fapp%2Fgift')}>{t('site.plans.gift.cta')}</Button></div>
          </Card>
        </div>
      </section>
    </>,
    // Especiales (0017) + 0051 on request: the studio rental and corporate experiences are quoted case by case.
    Specials: () => (
      <section className="container site-section">
        <Card eyebrow={t('site.plans.onRequest')} title={t('site.plans.specials.title')} tone="muted" className="site-specials">
          <p className="small" style={{ maxWidth: '60ch' }}>{t('site.plans.specials.body')}</p>
          <div className="plans-onrequest">
            {(['espacio', 'corporativo'] as const).map((fam) => (
              <div key={fam} className="stack-sm" data-on-request={fam}>
                <h3 className="small"><strong>{bi(FAMILY_LABEL[fam])}</strong></h3>
                <p className="small muted">{bi(FAMILY_RATIONALE[fam].subtitle)}</p>
                <ul className="plans-formats small">{ON_REQUEST_FORMATS[fam].map((f) => <li key={f.id}><strong>{bi(f.name)}</strong><span className="muted">{bi(f.description)}</span></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="stack-sm" style={{ marginTop: 'var(--block)' }}>
            <div className="row wrap"><a href={wa.link('specials', t('site.plans.specials.wa'))} target="_blank" rel="noreferrer"><Button variant="secondary">{t('site.plans.specials.cta')}</Button></a></div>
            {specialsNote && <p className="xs muted">{bi(specialsNote)}</p>}
          </div>
        </Card>
      </section>
    ),
    Questions: () => (
      <section className="container site-section">
        <div className="plans-visit"><p className="site-lead" style={{ margin: 0 }}>{t('site.plans.faq')}</p><Link to="/site/faq" className="btn btn-secondary">{t('site.plans.faqCta')} →</Link></div>
      </section>
    ),
    Discipline: () => <section className="container site-section"><div className="plans-visit"><div><p className="eyebrow">{t('site.plans.visitLabel')}</p><h2>{t('site.plans.visitTitle')}</h2><p className="muted">{t('site.plans.visitBody', { n: tenant.studio.mats })}</p></div><Link to="/site/schedule" className="btn btn-secondary">{t('site.nav.schedule')} ↗</Link></div></section>,
    TaxNote: () => (
      <section className="container site-section">
        <Card eyebrow={t('site.plans.taxTitle')}>
          <p className="small">{tax.pricesIncludeIva ? t('site.plans.taxIncluded', { pct: tax.ivaPct }) : t('site.plans.taxExcluded', { pct: tax.ivaPct })}</p>
        </Card>
      </section>
    ),
  };

  return (
    <SiteShell>
      {photoEdition && <div className="container photo-booking-banner"><img src={studioPhoto('pricing-duo')} width={960} height={640} loading="eager" decoding="sync" alt={t('site.photos.duo')} /></div>}
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
    </SiteShell>
  );
}
