/**
 * A-06 — the legal library, shared by the public site (`/site/legal/:kind`) and the app
 * (`/app/legal/:kind`). One renderer (`LegalDocument`), one token resolver, one source of numbers:
 * whatever M-08 says today is what the cancellation policy says today.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { LegalAcceptanceRow, LegalDocumentRow, LegalKind } from '../../data/schema';
import { formatDate, formatDateTime, formatCOP } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import {currentLegalDocument} from './auth/signupLegal';
import { pricing } from '../../tenant/pricing';
import { usePolicy, contactOf, useSettings } from '../admin/settings';
import { LegalDocument, resolveLegalTokens, type LegalTokens } from '../../components/organism/LegalDocument/LegalDocument';
import { Button } from '../../components/atom/Button/Button';
import { Chip } from '../../components/atom/Chip/Chip';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import './customer.css';
import { Icon } from '../../components/atom/Icon/Icon';

/** Display order of the library — the order the footer links and the site nav use. */
export const LEGAL_KINDS: LegalKind[] = ['terms', 'privacy', 'waiver', 'cancellation', 'refunds', 'house-rules'];

export const legalTitleKey = (kind: string) => `customer.legal.kind.${kind}`;

/**
 * The values the {{tenant.*}} and {{policy.*}} tokens resolve to: studio identity from
 * src/tenant/tenant.ts overlaid with M-08, and the policy numbers from usePolicy(). Change the
 * cancellation window in Settings and the legal page says the new number on the next render.
 */
function useLegalTokens(): LegalTokens {
  const { t, lang } = useI18n();
  const { settings } = useSettings();
  const policy = usePolicy();
  const contact = contactOf(settings);
  return useMemo<LegalTokens>(() => ({
    tenant: {
      name: settings.branding.displayName || tenant.name,
      legalName: tenant.legalName,
      city: contact.city,
      nit: settings.profile.nit || t('customer.legal.token.pending'),
      address: contact.pendingFields.address ? `${contact.address} (${t('customer.legal.token.pending')})` : `${contact.address}, ${contact.city}`,
      email: contact.pendingFields.email ? `${contact.email} ${t('customer.legal.token.pending')}` : contact.email,
      whatsapp: contact.pendingFields.whatsapp ? `${contact.whatsapp} ${t('customer.legal.token.pending')}` : contact.whatsapp,
      mats: settings.studio.mats,
      perPersonPerDay: settings.studio.perPersonPerDay,
      landmark: tenant.contact.landmark[lang],
      instagram: contact.instagram,
    },
    // 0051: {{price.<id>}} — a price from src/tenant/pricing.ts, formatted for the reader.
    price: Object.fromEntries(pricing.map((p) => [p.id, p.price == null ? '' : formatCOP(p.price, lang)])),
    policy: {
      cancellationHours: policy.cancellationHours,
      waitlistClaimMin: policy.waitlistClaimMin,
      lateGraceMin: policy.lateGraceMin,
      freezeMaxDays: policy.freezeMaxDays,
      freezesPerPackage: policy.freezesPerPackage,
      // the Terms v1.0 (kept as history) still name the pre-0051 membership-pause tokens
      pauseDaysPerYear: policy.freezeMaxDays,
      maxPausesPerYear: policy.freezesPerPackage,
      chargeNoticeDays: policy.chargeNoticeDays,
      noShowFeeClause: policy.features.noShowFee && policy.noShowFee > 0
        ? t('customer.legal.token.noShowFee', { amount: formatCOP(policy.noShowFee, lang) })
        : '',
    },
  }), [settings, policy, t, lang]);
}

export interface LegalView {
  doc: LegalDocumentRow | undefined;
  versions: LegalDocumentRow[];
  pick: (id: string) => void;
  loading: boolean;
}

/** Every version of one kind, newest effective date first, with the version the reader is on. */
export function useLegalDoc(kind: string, options:{versionId?:string|null;publishedOnly?:boolean}={}): LegalView {
  const { rows, loading } = useTable<LegalDocumentRow>('legal_documents', { where: { kind } });
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(()=>setPicked(null),[kind,options.versionId]);
  const versions = useMemo(() => rows.filter(r=>r.tenant_id===tenant.id&&r.kind===kind&&(!options.publishedOnly||r.status==='published')).sort((a, b) => b.effective_from.localeCompare(a.effective_from) || b.version.localeCompare(a.version)), [rows,kind,options.publishedOnly]);
  const inForce = options.publishedOnly?currentLegalDocument(versions,kind as LegalKind):versions.find((d) => d.status === 'published') ?? versions[0];
  const requested=picked??options.versionId;
  const doc = requested?versions.find(d=>d.id===requested):inForce;
  return { doc, versions, pick: setPicked, loading };
}

/** The props LegalDocument needs, built from a row — shared by the site page and the app page. */
export function useLegalDocProps(view: LegalView) {
  const { t, bi, lang } = useI18n();
  const tokens = useLegalTokens();
  const { doc, versions } = view;
  const statusLabel = doc?.status === 'published' ? t('customer.legal.status.published') : t('customer.legal.status.draft');
  return {
    title: doc ? bi(doc.title) : '',
    summary: doc ? bi(doc.summary) : undefined,
    body: doc ? resolveLegalTokens(bi(doc.body_md), tokens) : '',
    version: doc?.version ?? '',
    status: doc?.status ?? 'draft',
    statusLabel,
    effectiveLabel: doc
      ? t(doc.status === 'published' ? 'customer.legal.effective' : 'customer.legal.effective.draft', { date: formatDate(doc.effective_from, lang, { dateStyle: 'long' }) })
      : '',
    notice: t('customer.legal.counsel'),
    versions: versions.map((v) => ({ id: v.id, label: `v${v.version} · ${v.status === 'published' ? t('customer.legal.status.published') : t('customer.legal.status.draft')}` })),
    activeVersionId: doc?.id,
    versionsLabel: t('customer.legal.versions'),
    onPickVersion: view.pick,
  } as const;
}

/** Cross-links to the rest of the library, as chips. `to` builds the route for each kind. */
export function LegalFooterLinks({ current, to }: { current: string; to: (kind: LegalKind) => string }) {
  const { t } = useI18n();
  return (
    <>
      <span className="xs muted">{t('customer.legal.others')}</span>
      {LEGAL_KINDS.filter((k) => k !== current).map((k) => (
        <Link key={k} to={to(k)} className="cust-legal-link">{t(legalTitleKey(k))} →</Link>
      ))}
    </>
  );
}

/**
 * A-06 in-app — `/app/legal/:kind`. Same renderer as the site, plus the member's own acceptance:
 * the waiver they signed, with the date and the version, and a way to accept the current version
 * when they have not.
 */
export function LegalAppPage({ kind: fixed }: { kind?: LegalKind } = {}) {
  const { kind: param } = useParams();
  const kind = (fixed ?? param ?? 'terms') as LegalKind;
  const { t, lang } = useI18n();
  const data = useData();
  const { user } = useSession();
  const view = useLegalDoc(kind);
  const props = useLegalDocProps(view);
  const { rows: acceptances } = useTable<LegalAcceptanceRow>('legal_acceptances', { where: { user_id: user.id, kind } });
  const [saving, setSaving] = useState(false);
  const doc = view.doc;
  const mine = useMemo(() => [...acceptances].sort((a, b) => b.accepted_at.localeCompare(a.accepted_at)), [acceptances]);
  const forThis = mine.find((a) => a.document_id === doc?.id);

  const accept = useCallback(async () => {
    if (!doc) return;
    setSaving(true);
    try {
      await data.insert('legal_acceptances', { user_id: user.id, document_id: doc.id, kind: doc.kind, version: doc.version, accepted_at: new Date().toISOString(), channel: 'app', ip: null });
    } finally { setSaving(false); }
  }, [data, doc, user.id]);

  if (!doc) {
    return (
      <div className="container page stack">
        <EmptyState tone={view.loading ? 'loading' : 'empty'} title={t(view.loading ? 'core.common.loading' : 'customer.legal.notFound')} body={view.loading ? undefined : t('customer.legal.notFound.body')} action={<Link to="/app/more"><Button size="sm" variant="ghost">{t('core.nav.more')}</Button></Link>} />
      </div>
    );
  }

  const accepted = forThis
    ? t('customer.legal.accepted', { date: formatDateTime(forThis.accepted_at, lang), channel: t(`customer.legal.channel.${forThis.channel}`) })
    : mine[0]
      ? t('customer.legal.acceptedOther', { v: mine[0].version, date: formatDate(mine[0].accepted_at, lang, { dateStyle: 'long' }) })
      : null;

  return (
    <div className="container page stack cust-legal">
      <Link to="/app/more" className="cust-back"><Icon name="chevron-left" size="sm" /><span>{t('core.nav.back')}</span></Link>
      <LegalDocument
        {...props}
        accepted={doc.requires_acceptance ? (
          <div className="row-between wrap">
            <span>{accepted ?? t('customer.legal.notAccepted')}</span>
            {!forThis && doc.status === 'published' && <Button size="sm" loading={saving} onClick={accept}>{t('customer.legal.accept')}</Button>}
          </div>
        ) : undefined}
        footer={<LegalFooterLinks current={kind} to={(k) => `/app/legal/${k}`} />}
      />
      <div className="row wrap">
        <Button size="sm" variant="ghost" onClick={() => window.print()}>{t('customer.legal.print')}</Button>
        <Chip onClick={undefined}>{t('customer.legal.liveNumbers')}</Chip>
      </div>
    </div>
  );
}
