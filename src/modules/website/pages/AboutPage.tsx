import { studioPhotoProps } from '../photography';
import { AmbientScene } from '../../../components/organism/AmbientScene/AmbientScene';
import { useTable } from '../../../data/DataContext';
import type { MediaAssetRow } from '../../../data/schema';
import { siteLoops, siteImage } from '../artwork';
import { useSiteEdition } from '../edition';
import { Fragment, type ReactNode } from 'react';
import { Link } from '../links';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { tenant } from '../../../tenant/tenant';
import { about, philosophy, taglines } from '../../../tenant/brand';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { MediaSlot } from '../../../components/molecule/MediaSlot/MediaSlot';
import { PageHead, SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';

/** W-02 — the brand's own words, from src/tenant/brand.ts. */
export function AboutPage() {
  const { edition, videoEnabled, motion, setMotion, photoEdition } = useSiteEdition();
  const { rows: media } = useTable<MediaAssetRow>('media_assets', { where: { slot_key: 'site.about' } });
  const readyMedia = media.some(asset => asset.status === 'ready' && asset.url);
  const { t, bi } = useI18n();
  const { sections, isVisible } = useLayout(siteSpecs.about);

  const SECTIONS: Record<string, () => ReactNode> = {
    Head: () => <PageHead eyebrow={bi(about.eyebrow)} title={bi(about.title)} body={bi(taglines.start)} />,
    About: () => (
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <div className="site-prose">
          {about.paragraphs.map((p, i) => <p key={i}>{bi(p)}</p>)}
        </div>
        <div className="row wrap" style={{ marginTop: 'var(--sp-xl)' }}>
          <Link to="/site/classes"><Button>{t('site.about.classes')}</Button></Link>
          <Link to="/site/plans"><Button variant="secondary">{t('site.plans.all')}</Button></Link>
        </div>
      </section>
    ),
    Media: () => (
      <section className="container site-section">
        <div className="site-media-cap">
          {photoEdition && !readyMedia ? <img {...studioPhotoProps('facility-studio')} alt={t('site.photos.studio')} className="photo-about-main" /> : edition === 'sanctuary' && !readyMedia ? <><AmbientScene {...siteLoops.studio} video={videoEnabled ? siteLoops.studio.video : undefined} motion={motion} className="sanctuary-about-scene" alt={t('site.about.media')} /><button type="button" className="sanctuary-motion" onClick={() => setMotion(!motion)} aria-pressed={!motion}>{t(motion ? 'site.new.ambient' : 'site.new.static')}</button></> : <MediaSlot ratio="4:3" kind="photo" slotKey="site.about" fallbackSrc={edition === "sanctuary" ? siteImage("arch") : undefined} label={t('site.about.media')} />}
        </div>
      </section>
    ),
    Philosophy: () => (
      <section className="container site-section">
        {/* 0051 — "La filosofía de HOY": two titled parts (nuestra filosofía, nuestro propósito) and the closing question. */}
        {photoEdition && <div className="photo-facilities"><h2>{t('site.photos.facilities')}</h2><div className="photo-facilities-grid">{([['facility-red-studio','red'],['facility-heater','heater'],['facility-equipment','equipment']] as const).map(([name,alt],i) => <img key={name} {...studioPhotoProps(name,i > 0)} alt={t(`site.photos.${alt}`)} />)}</div></div>}
        <div className="site-panel site-philosophy">
          <p className="eyebrow">{bi(philosophy.eyebrow)}</p>
          <h2>{bi(philosophy.title)}</h2>
          <hr className="site-panel-rule" />
          <div className="site-panel-cols">
            {philosophy.sections.map((sec) => (
              <div key={sec.title.es} className="site-philosophy-part">
                <h3>{bi(sec.title)}</h3>
                {sec.paragraphs.map((p, i) => <p key={i}>{bi(p)}</p>)}
              </div>
            ))}
          </div>
          <hr className="site-panel-rule" />
          <p className="site-quote">{bi(philosophy.closing)}</p>
          <p className="site-philosophy-sign">{bi(taglines.life)}</p>
        </div>
      </section>
    ),
    BrandBoard: () => (
      <section className="container site-section">
        <Card eyebrow={t('site.about.board')} padding="sm">
          <img src={tenant.brand.lockup.sand} alt={`${tenant.name} lockup`} style={{ width: '100%', borderRadius: 'var(--r-sm)' }} />
          <p className="xs muted" style={{ marginTop: 'var(--sp-sm)' }}>{t('site.about.boardNote')}</p>
        </Card>
      </section>
    ),
  };

  return (
    <SiteShell>
      {sections.filter(name => isVisible(name) && (edition === 'classic' || name !== 'BrandBoard')).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
    </SiteShell>
  );
}
