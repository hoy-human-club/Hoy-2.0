import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Link, NavLink } from './links';
import { useI18n } from '../../i18n/I18nProvider';
import { useContact, useOpeningHours, useWhatsappLink, pendingSuffix, type ContactField } from '../admin/settings';
import { useStudioJsonLd } from './jsonLd';
import { useTheme } from '../../design/ThemeProvider';
import { tenant } from '../../tenant/tenant';
import { taglines } from '../../tenant/brand';
import { Wordmark, type WordmarkTone } from '../../components/atom/Wordmark/Wordmark';
import { brandHeading } from '../../components/atom/Wordmark/brandHeading';
import { LangToggle } from '../../components/molecule/LangToggle/LangToggle';
import { Button } from '../../components/atom/Button/Button';
import { ElementCursor } from '../../components/atom/ElementCursor/ElementCursor';
import './site.css';
import './sanctuary.css';
import './photography.css';
import { useSiteEdition } from './edition';
import { Icon } from '../../components/atom/Icon/Icon';
import { SiteArchiveNotice } from '../../components/molecule/SiteArchiveNotice/SiteArchiveNotice';
import { SiteVersionSelect } from '../../components/molecule/SiteVersionSelect/SiteVersionSelect';

const NAV = [
  ['/site/about', 'about'], ['/site/classes', 'classes'], ['/site/schedule', 'schedule'],
  ['/site/teachers', 'teachers'], ['/site/plans', 'plans'], ['/site/faq', 'faq'], ['/site/contact', 'contact'],
] as const;


/** Public website chrome: header with nav + a footer that carries hours, address and social. */
export function SiteShell({ children }: { children: ReactNode }) {
  const { t, bi, lang } = useI18n();
  const { edition, version, archived, setEdition, videoEnabled, motion, setMotion } = useSiteEdition();
  const { pathname } = useLocation();
  const shell = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (edition !== 'sanctuary' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); } }), { threshold: .08 });
    shell.current?.querySelectorAll('[data-reveal]').forEach(el => { el.classList.add('reveal-ready'); observer.observe(el); });
    return () => observer.disconnect();
  }, [edition, pathname]);
  useEffect(() => {
    const el = shell.current;
    if (!el || edition !== 'sanctuary' || !motion) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    const reset = () => { cancelAnimationFrame(frame); frame = 0; el.style.removeProperty('--depth-x'); el.style.removeProperty('--depth-y'); };
    const move = (event: PointerEvent) => {
      if (preference.matches || !pointer.matches || event.pointerType === 'touch') { reset(); return; }
      const x = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
      const y = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { el.style.setProperty('--depth-x', String(x)); el.style.setProperty('--depth-y', String(y)); });
    };
    window.addEventListener('pointermove', move, { passive: true }); document.documentElement.addEventListener('pointerleave', reset); preference.addEventListener('change', reset);
    return () => { reset(); window.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', reset); preference.removeEventListener('change', reset); };
  }, [edition, pathname, motion]);
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const contact = useContact();
  // 0041: the hours in the footer follow M-08a / M-08g, and the same hours go out as LocalBusiness JSON-LD.
  const hours = useOpeningHours();
  useStudioJsonLd(!archived);
  // 0047: the footer is a front desk handoff; pages with a topic call useWhatsappLink() with their own intent (D-0022).
  const wa = useWhatsappLink();
  // 0036: per field — the phone and the address are confirmed, the email and Instagram still carry the label.
  const pending = (f: ContactField) => pendingSuffix(contact, f, lang);
  return (
    <div className="site" data-edition={edition} data-site-version={version} data-motion={motion ? "on" : "off"} ref={shell}>
      <ElementCursor enabled={edition === 'sanctuary' && motion} />
      <header className="site-head">
        <div className="container site-head-in">
          <Link to="/site" className="site-brand" onClick={() => setOpen(false)}>{edition === 'sanctuary' ? <Wordmark vector /> : <Wordmark height={34} />}<span className="site-brand-caption">{bi(tenant.tagline)}</span></Link>
          <nav className={`site-nav ${open ? 'is-open' : ''}`} aria-label={t('site.nav.label')}>
            {NAV.map(([to, k]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : '')} onClick={() => setOpen(false)}>{t(`site.nav.${k}`)}</NavLink>)}
            {/* on phones (≤ 600 px) the edition select and motion toggle move from the header into the open menu so the header fits without overflow */}
            <div className="site-nav-tools">
              <SiteVersionSelect value={version} videoEnabled={videoEnabled} onChange={setEdition} />
              {edition === 'sanctuary' && <button type="button" className="site-iconbtn ctl-round" onClick={() => setMotion(!motion)} aria-pressed={!motion} aria-label={t(motion ? 'site.new.ambient' : 'site.new.static')}>{motion ? 'Ⅱ' : '▷'}</button>}
            </div>
          </nav>
          <div className="site-actions">
            <SiteVersionSelect value={version} videoEnabled={videoEnabled} onChange={setEdition} />
            {edition === 'sanctuary' && <button type="button" className="site-iconbtn site-motion ctl-round" onClick={() => setMotion(!motion)} aria-pressed={!motion} aria-label={t(motion ? 'site.new.ambient' : 'site.new.static')}>{motion ? 'Ⅱ' : '▷'}</button>}
            <LangToggle size="sm" />
            <button type="button" className="site-iconbtn ctl-round" onClick={toggleTheme} aria-label={t('core.theme.toggle')}><Icon name={theme === 'dark' ? 'moon' : 'sun'} size={17} /></button>
            <Link to="/auth/sign-in"><Button size="sm">{t('site.nav.signin')}</Button></Link>
            <button type="button" className="site-burger" onClick={() => setOpen((o) => !o)} aria-label={t('core.shell.menu')} aria-expanded={open}>☰</button>
          </div>
        </div>
      </header>
      {version === 'photos' && <aside className="photo-preview-notice">{t('site.photos.notice')}</aside>}
      {archived && <SiteArchiveNotice onLatest={() => setEdition('latest', true)} />}
      <main className="site-main" id="site-main">{children}</main>
      <footer className="site-foot">
        <div className="container site-foot-grid">
          <div className="stack-sm">
            {edition === 'sanctuary' ? <Link to="/site" className="site-footer-brand"><Wordmark vector className="site-footer-wordmark" /></Link> : <Wordmark height={42} className="site-footer-wordmark" />}
            <span className="small">{bi(taglines.life)}</span>
            <span className="xs muted">{bi(tenant.tagline)} · {contact.city}</span>
          </div>
          <div className="stack-sm">
            <span className="eyebrow">{t('site.footer.visit')}</span>
            <span className="small">{contact.location.link ? <a href={contact.location.link} target="_blank" rel="noreferrer">{contact.address}{pending('address')}</a> : <>{contact.address}{pending('address')}</>}</span>
            <span className="small muted">{bi(hours.sentence)}</span>
            <span className="xs muted" data-testid="footer-today">{bi(hours.today)}</span>
          </div>
          <div className="stack-sm">
            <span className="eyebrow">{t('site.footer.follow')}</span>
            <a className="small" href={wa.link('frontDesk')} target="_blank" rel="noreferrer" data-testid="footer-whatsapp">WhatsApp {contact.whatsapp}{pending('whatsapp')}</a>
            <a className="small" href={contact.instagramUrl} target="_blank" rel="noreferrer">Instagram {contact.instagram}{pending('instagram')}</a>
            <a className="small" href={`mailto:${contact.email}`}>{contact.email}{pending('email')}</a>
          </div>
          <div className="stack-sm">
            <span className="eyebrow">{t('site.footer.explore')}</span>
            <Link className="small" to="/site/classes">{t('site.nav.classes')}</Link>
            <Link className="small" to="/site/plans">{t('site.nav.plans')}</Link>
            <Link className="small" to="/site/faq">{t('site.footer.faq')}</Link>
            <Link className="small" to="/site/legal/terms">{t('site.legal.terms')}</Link>
            <Link className="small" to="/site/legal/privacy">{t('site.legal.privacy')}</Link>
            <Link className="small" to="/site/delete-account">{t('site.delete.nav')}</Link>
            <Link className="small" to="/hub">{t('site.footer.hub')}</Link>
          </div>
          <div className="stack-sm">
            <span className="eyebrow">{t('site.footer.lang')}</span>
            <LangToggle size="sm" />
          </div>
        </div>
        <div className="container site-foot-bottom">
          {edition === "sanctuary" && version !== 'photos' && <p className="site-concept-note">{t("site.new.demo")}</p>}
          <a className="small" href="https://github.com/imagine-os/hoy/blob/main/docs/website-versions.md" target="_blank" rel="noreferrer">{t("site.edition.history")} ↗</a>
          <span className="xs muted">{t('site.footer.rights', { year: new Date().getFullYear(), name: tenant.legalName })}</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * 0033 — V2 (sanctuary) display headings set the brand word as the vector wordmark (`brandHeading`); V1 keeps its
 * 28–36 px headings as text, where the mark would fall under the brand manual's 120 px minimum.
 */
export function useBrandHeading() {
  const { edition } = useSiteEdition();
  return (text: string, tone?: WordmarkTone) => (edition === 'sanctuary' ? brandHeading(text, { tone }) : text);
}

export function PageHead({ title, body, eyebrow, back }: { title: string; body?: string; eyebrow?: string; back?: { to: string; label: string } }) {
  const brand = useBrandHeading();
  return (
    <div className="site-pagehead container">
      {back && <Link className="small site-back" to={back.to}>‹ {back.label}</Link>}
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{brand(title)}</h1>
      {body && <p className="muted site-lead">{body}</p>}
    </div>
  );
}

/** Section heading used by every site section. */
export function SectionHead({ title, body, eyebrow, action }: { title: string; body?: string; eyebrow?: string; action?: ReactNode }) {
  const brand = useBrandHeading();
  return (
    <div className="site-section-top">
      <div className="site-section-head">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{brand(title)}</h2>
        {body && <p className="muted">{body}</p>}
      </div>
      {action && <div className="site-section-action">{action}</div>}
    </div>
  );
}
