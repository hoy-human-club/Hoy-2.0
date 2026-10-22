import {useSearchParams} from 'react-router-dom';
import { useSiteHref } from '../links';
import { useI18n } from '../../../i18n/I18nProvider';
import { LegalDocument } from '../../../components/organism/LegalDocument/LegalDocument';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { LegalFooterLinks, legalTitleKey, useLegalDoc, useLegalDocProps } from '../../customer/legal';
import type { LegalKind } from '../../../data/schema';
import { SiteShell } from '../SiteShell';

/**
 * A-06 (public) — any kind of legal document from `legal_documents`, with its version, its effective
 * date and a version switcher when more than one version exists. The renderer is the shared
 * `LegalDocument` organism, so the site and the in-app page (`/app/legal/:kind`) never drift; the
 * numbers inside the body come from M-08 at render time, so the page cannot go stale.
 */
export function LegalPage({ kind }: { kind: LegalKind }) {
  const href = useSiteHref();
  const { t } = useI18n();
  const [params]=useSearchParams();
  const view = useLegalDoc(kind,{versionId:params.get('version'),publishedOnly:true});
  const props = useLegalDocProps(view);
  return (
    <SiteShell>
      <section className="container site-section legal-body">
        {view.doc
          ? <LegalDocument {...props} footer={<LegalFooterLinks current={kind} to={(k) => href(`/site/legal/${k}`)} />} />
          : <EmptyState tone={view.loading ? 'loading' : 'empty'} title={t(view.loading ? 'core.common.loading' : 'customer.legal.notFound')} body={view.loading ? undefined : t(legalTitleKey(kind))} />}
      </section>
    </SiteShell>
  );
}
