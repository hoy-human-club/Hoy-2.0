import { useSiteHref } from '../links';
import { Fragment, type ReactNode } from 'react';
import { Link } from '../links';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { useTable } from '../../../data/DataContext';
import type { TeacherRow, ModalityRow, ReviewRow } from '../../../data/schema';
import { formatCOP } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { priceItem, FAMILY_LABEL, type PlanFamily } from '../../../tenant/pricing';
import { classesIntro, classForModality, classes, classOrder, taglines } from '../../../tenant/brand';
import { AmbientScene } from '../../../components/organism/AmbientScene/AmbientScene';
import { ClassArch } from '../../../components/molecule/ClassArch/ClassArch';
import { Icon } from '../../../components/atom/Icon/Icon';
import { SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';
import { useClassPhotos, useTodaySessions } from '../hooks';
import { useSiteEdition } from '../edition';
import { siteImage, siteVideo, siteLoops } from '../artwork';
import { studioPhotoProps, teacherStudioPhoto } from '../photography';
import { ClassicHomePage } from './ClassicHomePage';

export function HomePage() {
  const { edition } = useSiteEdition();
  return edition === 'classic' ? <ClassicHomePage /> : <SanctuaryHome />;
}
function SanctuaryHome() {
  const href = useSiteHref();
  const { t, bi, lang } = useI18n();
  const { sections, isVisible } = useLayout(siteSpecs.home);
  const today = useTodaySessions();
  const { motion, setMotion, videoEnabled, photoEdition } = useSiteEdition();
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true } });
  const photos = useClassPhotos();
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const { rows: reviews } = useTable<ReviewRow>('reviews', { orderBy: { column: 'created_at', dir: 'desc' } });
  const quotes = [...new Map(reviews.filter(r => r.comment && r.visibility !== 'private').map(r => [r.comment, r])).values()].slice(0, 2);
  // 0051: the three ways in, each with its launch price — the trial class, the 12-class package, a private class.
  const pack = priceItem('pack12'), priv = priceItem('private');
  const families: { fam: PlanFamily; price?: number | null; sub: string }[] = [
    { fam: 'bienvenida', price: priceItem('trial')?.price, sub: t('site.new.firstClass') },
    { fam: 'paquetes', price: pack?.price, sub: t('site.new.packageSub', { n: pack?.classes ?? 12, months: Math.round((pack?.validityDays ?? 90) / 30) }) },
    { fam: 'privadas', price: priv?.price, sub: t('site.new.privateSub', { n: priv?.maxPeople ?? 3 }) },
  ];
  const SECTIONS: Record<string, () => ReactNode> = {
    Hero: () => <section className="sanctuary-hero studio-hero">
      <img
        className="photo-hero-image studio-hero-image"
        src={`${import.meta.env.BASE_URL}images/studio-2026/facility-red-studio-1600.webp`}
        srcSet={`${import.meta.env.BASE_URL}images/studio-2026/facility-red-studio-480.webp 480w, ${import.meta.env.BASE_URL}images/studio-2026/facility-red-studio-960.webp 960w, ${import.meta.env.BASE_URL}images/studio-2026/facility-red-studio-1600.webp 1600w`}
        sizes="(max-aspect-ratio: 3/2) 150vh, 100vw" width={1600} height={1067} loading="eager" fetchPriority="high" decoding="async"
        alt={t('site.photos.studioHero')}
      />
      <div className="sanctuary-hero-wash" />
      <div className="container sanctuary-hero-inner">
        <div className="sanctuary-hero-copy">
          <p className="eyebrow">{t('site.new.eyebrow', { name: tenant.name.toUpperCase() })} <span className="hero-eyebrow-rule" /> {tenant.city}</p>
          <h1>{t('site.new.title')}<br /><em>{t('site.new.title2')}</em></h1>
          <p className="sanctuary-intro is-tagline">{bi(taglines.present)}</p>
          <Link to="/site/schedule" className="sanctuary-button">{t('site.new.book')}<Icon name="arrow-right" size={20} /></Link>
          <Link to="/site/about" className="sanctuary-text-link">{t('site.new.explore')} <span>↗</span></Link>
        </div>
      </div>
      <div className="sanctuary-hero-bottom container"><span className="sanctuary-scroll"><span aria-hidden>↓</span>{t('site.new.scroll')}</span>{!photoEdition && <button type="button" className="sanctuary-motion" onClick={() => setMotion(!motion)} aria-pressed={!motion}>{motion ? 'Ⅱ' : '▷'} <span>{t(motion ? 'site.new.ambient' : 'site.new.static')}</span></button>}</div>
    </section>,
    Philosophy: () => <section className="sanctuary-philosophy" data-reveal><div className="container sanctuary-philosophy-grid">
      <div className="sanctuary-philosophy-art"><>{photoEdition ? <img {...studioPhotoProps('philosophy-carolina', true)} alt={t('site.photos.philosophy')} className="photo-philosophy" /> : <AmbientScene {...siteLoops.philosophy} video={videoEnabled ? siteLoops.philosophy.video : undefined} alt={t('site.new.philosophyAlt')} className="sanctuary-portrait" motion={motion} />}</><span className="sanctuary-photo-caption">{t('site.new.scroll')}</span></div>
      <div className="sanctuary-philosophy-copy"><p className="eyebrow">{t('site.new.philosophyLabel')}</p><h2>{t('site.new.philosophyTitle')}<br /><em>{t('site.new.philosophyEm')}</em></h2><p className="muted">{t('site.new.philosophyBody', { name: tenant.name })}</p><Link className="sanctuary-text-link" to="/site/about">{t('site.philosophy.more')} <Icon name="arrow-right" /></Link></div>
    </div></section>,
    Classes: () => <section className="container sanctuary-section" data-reveal>
      <div className="sanctuary-heading"><div><p className="eyebrow">{t('site.new.chapter2')}</p><h2>{t('site.new.classesTitle')}<br /><em>{t('site.new.classesEm')}</em></h2><p className="muted">{bi(classesIntro.methods)}</p></div><Link className="sanctuary-text-link" to="/site/classes">{t('site.classes.all')} <Icon name="arrow-right" /></Link></div>
      <div className="sanctuary-arches">{classOrder.map((slug, index) => <ClassArch key={slug} slug={slug} index={index + 1} to={href(`/site/classes/${slug}`)} photoUrl={photos.get(slug)} />)}</div>
    </section>,
    TodayClasses: () => <section className="sanctuary-schedule" data-reveal><div className="container sanctuary-schedule-grid"><div className="sanctuary-schedule-intro"><p className="eyebrow">{t('site.new.chapter3')}</p><h2>{t('site.new.scheduleTitle')}</h2><Link className="sanctuary-button is-light" to="/site/schedule">{t('site.today.all')} <Icon name="arrow-right" /></Link></div>
      <div className="sanctuary-agenda"><div className="sanctuary-agenda-head"><span>{t('site.today.title')}</span><span>{new Intl.DateTimeFormat(lang === 'es' ? 'es-CO' : 'en-US', { day: 'numeric', month: 'short' }).format(new Date())}</span></div>
        {today.length ? today.slice(0, 4).map(({ session, modality, teacher }) => <Link key={session.id} to={modality ? `/site/schedule?modality=${modality.slug}` : '/site/schedule'} className="sanctuary-session"><span className="sanctuary-session-time">{new Intl.DateTimeFormat(lang === 'es' ? 'es-CO' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(session.starts_at))}</span><span><strong>{session.title}</strong><small>{teacher?.display_name} · {modality?.duration_min ?? 60} min</small></span><span aria-hidden>↗</span></Link>) : <p className="sanctuary-agenda-empty">{t('site.today.empty')}</p>}
      </div></div></section>,
    Teachers: () => <section className="container sanctuary-section" data-reveal><div className="sanctuary-heading"><div><p className="eyebrow">{t('site.nav.teachers')}</p><h2>{t('site.new.teachersTitle')}</h2><p className="muted">{t('site.new.teachersBody')}</p></div><Link className="sanctuary-text-link" to="/site/teachers">{t('site.nav.teachers')} <Icon name="arrow-right" /></Link></div>
      <div className="sanctuary-teachers"><div className="sanctuary-community"><>{photoEdition ? <img {...studioPhotoProps('pricing-duo')} alt={t('site.photos.duo')} className="photo-community" /> : <AmbientScene poster={siteImage('community')} video={videoEnabled ? siteVideo('community') : undefined} alt={t('site.new.community')} motion={motion} className="community-living" />}</><p>{t('site.new.community')}</p></div><div className="sanctuary-teacher-list">{teachers.map((te, i) => {
        // 0051: real teachers, no generated portraits — the photo once uploaded, else initials in the tone of their class.
        const mod = modalities.find((m) => m.id === te.specialties[0]);
        const cls = classForModality(mod?.slug);
        const photo = te.photo_url || (photoEdition ? teacherStudioPhoto(te.id) : undefined);
        return <Link to="/site/teachers" key={te.id} className="sanctuary-teacher-link"><span className="sanctuary-teacher-number">{String(i + 1).padStart(2, '0')}</span>{photo ? <img src={photo} loading="lazy" alt="" className="sanctuary-teacher-photo" /> : <span className="sanctuary-teacher-initials" data-tone={mod?.tone ?? 'river'} aria-hidden>{te.display_name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>}<span><h3>{te.display_name}</h3><p>{te.specialties.map(id => {const m = modalities.find(m => m.id === id); return m ? (lang === 'es' ? m.name_es : m.name_en) : '';}).filter(Boolean).join(' · ')}{cls ? ` · ${bi(classes[cls].tagline)}` : ''}</p></span><span aria-hidden>↗</span></Link>;
      })}</div></div>
    </section>,
    ValueModel: () => <section className="sanctuary-plans" data-reveal><div className="container sanctuary-section"><div className="sanctuary-centered"><p className="eyebrow">{t('site.nav.plans')}</p><h2>{t('site.new.plansTitle')}</h2><p className="muted">{t('site.new.plansBody')}</p></div><div className="sanctuary-plan-grid">{families.map(({ fam, price, sub }, i) => <Link to={'/site/plans'} key={fam} className={`sanctuary-plan ${i === 1 ? 'is-blue' : ''}`}><p className="eyebrow">0{i + 1} / {t(`site.new.planLabel${i}`)}</p><h3>{bi(FAMILY_LABEL[fam])}</h3>{price != null && <p className="sanctuary-price">{formatCOP(price, lang)}<small>{sub}</small></p>}<span className="sanctuary-plan-cta">{t('site.plans.all')}<Icon name="arrow-right" /></span></Link>)}</div><div className="sanctuary-centered sanctuary-plans-more"><Link className="sanctuary-text-link" to="/site/plans">{t('site.value.all')} <Icon name="arrow-right" /></Link></div></div></section>,
    Testimonials: () => quotes.length > 0 ? <section className="container sanctuary-section sanctuary-quotes" data-reveal>{quotes.map(r => <blockquote key={r.id}><span className="sanctuary-quote-mark" aria-hidden>“</span><p>{r.comment}</p><footer>{t('site.testimonials.member')}</footer></blockquote>)}</section> : null,
    FirstStep: () => <section className="sanctuary-finale" data-reveal><>{photoEdition ? <img {...studioPhotoProps('facility-studio')} alt={t('site.photos.studio')} className="photo-finale-image" /> : <AmbientScene {...siteLoops.ritual} video={videoEnabled ? siteLoops.ritual.video : undefined} alt={t('site.new.ritualAlt')} className="sanctuary-finale-scene" motion={motion} />}</><div className="sanctuary-finale-card"><p className="eyebrow">{t('site.new.visit')}</p><h2>{t('site.new.endTitle')}<br /><em>{t('site.new.endEm')}</em></h2><p>{t('site.new.endBody')}</p><Link className="sanctuary-button" to="/site/schedule">{t('site.new.book')}<Icon name="arrow-right" /></Link></div></section>,
  };
  return <SiteShell><div className="sanctuary" data-motion={motion ? 'on' : 'off'}>{sections.filter(isVisible).map(name => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}</div></SiteShell>;
}
