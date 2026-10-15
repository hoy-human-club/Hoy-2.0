import { useI18n } from '../../../i18n/I18nProvider';
import type { SiteVersion } from '../../../modules/website/edition';
export function SiteVersionSelect({ value, onChange, videoEnabled = true }: { value: SiteVersion; videoEnabled?: boolean; onChange: (value: SiteVersion, video?: boolean) => void }) {
  const { t } = useI18n();
  const selected = value === 'latest' && !videoEnabled ? 'still' : value;
  return <label className="site-version"><span className="sr-only">{t('site.edition.label')}</span><select value={selected} aria-label={t('site.edition.label')} onChange={e => onChange(e.target.value === 'still' ? 'latest' : e.target.value as SiteVersion, e.target.value !== 'still')}><option value="latest">{t('site.edition.latest')}</option><option value="photos">{t('site.edition.photos')}</option><option value="archive">{t('site.edition.archive')}</option><option value="still">{t('site.edition.still')}</option><option value="classic">{t('site.edition.classic')}</option></select></label>;
}
