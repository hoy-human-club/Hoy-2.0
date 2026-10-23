import { useRef, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Drawer } from '../../organism/Drawer/Drawer';
import { Button } from '../../atom/Button/Button';
import { useI18n } from '../../../i18n/I18nProvider';
import { tenant } from '../../../tenant/tenant';
import { dateKey, formatDate } from '../../../i18n/format';
import { classes, taglines, type ClassSlug } from '../../../tenant/brand';
import { Wordmark } from '../../atom/Wordmark/Wordmark';
import { Icon } from '../../atom/Icon/Icon';
import { LangToggle } from '../../molecule/LangToggle/LangToggle';
import './ComingSoonLanding.css';

/** 0156 · Pulso: four classes get a colour tile, the other three sit in the list tile, so each of the seven shows once. */
const TILE_CLASSES: ClassSlug[] = ['ligereza', 'fuego', 'centro', 'pulso'];
const LIST_CLASSES = (Object.keys(classes) as ClassSlug[]).filter((s) => !TILE_CLASSES.includes(s));

/**
 * An independent launch surface: no website-edition state or mock conversion controls.
 * 0156 — Direction C "Pulso": a bento of rounded tiles on sand. The hero tile carries the approved tagline and the
 * Instagram CTA, the sun tile the opening date, the tall tile the approved studio photo, and the class tiles the
 * studio's seven classes in their own tones.
 */
export function ComingSoonLanding() {
  const { t, bi, lang } = useI18n();
  // 0155: opening day shows until it has passed, then the page falls back to "Próximamente".
  const beforeOpening = dateKey() <= tenant.opensOn;
  // 0155: the tagline's last line is set in italic and its last word carries the sun marker.
  const lines = bi(taglines.present).split('.').map((l) => l.trim()).filter(Boolean);
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const loginButton = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const wasOpen = useRef(false);
  const loginOpen = params.get('login') === 'soon';
  useEffect(() => { closing.current = false; }, [location.key]);
  useEffect(() => {
    if (wasOpen.current && !loginOpen) loginButton.current?.focus();
    wasOpen.current = loginOpen;
  }, [loginOpen]);
  const openLogin = () => {
    if (loginOpen) return;
    const next = new URLSearchParams(params); next.set('login', 'soon');
    setParams(next, { state: { comingSoonLogin: true } });
  };
  const closeLogin = () => {
    if (closing.current) return;
    closing.current = true;
    if (location.state?.comingSoonLogin) navigate(-1);
    else { const next = new URLSearchParams(params); next.delete('login'); setParams(next, { replace: true }); }
  };
  return <><main className="coming-soon">
    <header className="coming-soon-header">
      <Wordmark vector tone="blue" className="coming-soon-wordmark" />
      <div className="coming-soon-tools"><button ref={loginButton} type="button" className="coming-soon-login" onClick={openLogin} aria-haspopup="dialog" aria-expanded={loginOpen}>{t('soon.login')}</button><LangToggle /></div>
    </header>
    <div className="coming-soon-bento">
      <section className="coming-soon-tile coming-soon-hero" aria-labelledby="coming-soon-title">
        <span className="coming-soon-rings" aria-hidden="true" />
        <p className="coming-soon-chip"><span aria-hidden="true" />{bi(tenant.tagline)} · {tenant.city}</p>
        <div className="coming-soon-message">
          <h1 id="coming-soon-title">{lines.map((line, i) => {
            if (i < lines.length - 1) return <span key={line}>{line}.</span>;
            const cut = line.lastIndexOf(' ');
            return <span key={line} className="coming-soon-lead">{cut > 0 ? `${line.slice(0, cut)} ` : ''}<mark className="coming-soon-mark">{line.slice(cut + 1)}</mark>.</span>;
          })}</h1>
          <p className="coming-soon-intro">{t('soon.intro')}</p>
          <div className="coming-soon-cta">
            <a className="coming-soon-follow" href={tenant.social.instagramUrl} target="_blank" rel="noopener noreferrer">
              <span>{t('soon.follow')}</span><Icon name="arrow-right" size={18} />
            </a>
            <p>{t('soon.news')}</p>
          </div>
        </div>
      </section>

      <section className="coming-soon-tile coming-soon-date" aria-label={beforeOpening ? t('soon.opens', { date: formatDate(tenant.opensOn, lang, { day: 'numeric', month: 'long' }) }) : t('soon.status')}>
        <p className="coming-soon-status">{beforeOpening ? t('soon.opensLabel') : t('soon.status')}</p>
        {beforeOpening && <p className="coming-soon-day" aria-hidden="true"><span>{formatDate(tenant.opensOn, lang, { day: 'numeric' })}</span><em>{t('soon.month', { month: formatDate(tenant.opensOn, lang, { month: 'long' }) })}</em></p>}
      </section>

      <figure className="coming-soon-tile coming-soon-photo">
        <img
          className="coming-soon-scene"
          src={`${import.meta.env.BASE_URL}images/studio-2026/facility-red-studio-1600.webp`}
          srcSet={`${import.meta.env.BASE_URL}images/studio-2026/facility-red-studio-480.webp 480w, ${import.meta.env.BASE_URL}images/studio-2026/facility-red-studio-960.webp 960w, ${import.meta.env.BASE_URL}images/studio-2026/facility-red-studio-1600.webp 1600w`}
          sizes="(min-width: 900px) 25vw, 50vw" width={1600} height={1067} loading="eager" fetchPriority="high" decoding="async"
          alt={t('soon.art')}
        />
        <figcaption className="coming-soon-photo-chip">{t('soon.room', { city: tenant.city })}</figcaption>
      </figure>

      <section className="coming-soon-classes" aria-label={t('soon.classes', { n: Object.keys(classes).length })}>
        {TILE_CLASSES.map((s) => (
          <article key={s} className="coming-soon-tile coming-soon-class" data-tone={classes[s].tone}>
            <h2>{bi(classes[s].name)}</h2>
            <p>{bi(classes[s].tagline)}</p>
          </article>
        ))}
      </section>

      <section className="coming-soon-tile coming-soon-more" aria-labelledby="coming-soon-more-title">
        <h2 id="coming-soon-more-title" className="coming-soon-more-title">{t('soon.classesMore')}</h2>
        <ul>
          {LIST_CLASSES.map((s) => (
            <li key={s} data-tone={classes[s].tone}><span className="coming-soon-dot" aria-hidden="true" /><span><strong>{bi(classes[s].name)}</strong><span>{bi(classes[s].tagline)}</span></span></li>
          ))}
        </ul>
        <p className="coming-soon-footer">{tenant.city}<span aria-hidden="true"> · </span>{bi(tenant.tagline)}</p>
      </section>
    </div>
  </main><Drawer open={loginOpen} onClose={closeLogin} side="bottom" title={t('soon.loginTitle')} footer={<Button onClick={closeLogin}>{t('core.common.close')}</Button>}>
    <p>{t('soon.loginBody')}</p>
  </Drawer></>;
}
