import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import pkg from '../../../package.json';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useTheme } from '../../design/ThemeProvider';
import { ROLE_HOME, ROLE_LABEL, type Role } from '../../auth/roles';
import { demoUserByRole } from '../../auth/demoUsers';
import { tenant } from '../../tenant/tenant';
import { taglines } from '../../tenant/brand';
import { getRoutes } from '../../app/registry';
import { routeManifest } from '../../app/manifest';
import { componentCount, manualChapterCount } from '../../app/counts';
import { tableRegistry } from '../../data/schema';
import { listActions, useActions } from '../../actions';
import type { ThumbShape } from '../../app/thumbnails';
import { Wordmark } from '../../components/atom/Wordmark/Wordmark';
import { Badge } from '../../components/atom/Badge/Badge';
import { Button } from '../../components/atom/Button/Button';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Icon, type IconName } from '../../components/atom/Icon/Icon';
import { Placeholder } from '../../components/atom/Placeholder/Placeholder';
import { LangToggle } from '../../components/molecule/LangToggle/LangToggle';
import { RoleSwitcher } from '../../components/molecule/RoleSwitcher/RoleSwitcher';
import { ProblemReport } from '../../components/organism/ProblemReport/ProblemReport';
import { hubSpec, HUB_SURFACES, HUB_TOOLS, type HubSurfaceKey, type HubToolKey } from './specs';
import { useUiScale } from './useUiScale';
import { HUB_EXPERIENCES, HUB_TOOL_LIST } from '../../hub/hubMap.data';
import type { HubBand } from '../../hub/hubMap.types';
import { hubMapUrl, loadHubMap } from '../../hub/hubMapClient';
import './hub.css';

interface SurfaceCard {
  key: HubSurfaceKey;
  /** Page code — drives the thumbnail folder and the dev-mode chip. */
  code: string;
  to: string;
  band: HubBand;
  /** Entering the card switches to this role's demo user first. */
  role?: Role;
  icon: IconName;
  shape?: ThumbShape;
  featured?: boolean;
  secondary?: { to: string; key: string; asRole?: boolean };
  /** Hue family for the medallion and preview tile (default: the card's own key). */
  hue?: HubSurfaceKey;
  /** 0031: announced, not built — "Próximamente" badge and a Placeholder instead of the enter button. */
  comingSoon?: boolean;
}

/**
 * What only this page needs to draw a card: its icon and preview shape. Everything else — code, route,
 * band, role, label, purpose — comes from the hub map data (src/hub/hubMap.data.ts), the same module
 * `npm run hub-map` publishes as public/hub-map.json for other hosts.
 */
const CARD_UI: Record<HubSurfaceKey, { icon: IconName; shape?: ThumbShape; hue?: HubSurfaceKey; secondaryAsRole?: boolean }> = {
  promotions: { icon: 'gift', hue: 'teacher' },
  app: { icon: 'smartphone', shape: 'phone' },
  site: { icon: 'globe' },
  'coming-soon': { icon: 'sparkle', hue: 'site' },
  teacher: { icon: 'sparkle' },
  desk: { icon: 'check' },
  inbox: { icon: 'inbox' },
  pos: { icon: 'receipt' },
  admin: { icon: 'gauge' },
  crm: { icon: 'users' },
  // 0048: the inbox's hue family (no new token); its M-05 link enters as the same demo user, like the button
  messages: { icon: 'mail', hue: 'inbox', secondaryAsRole: true },
  finance: { icon: 'wallet' },
  marketing: { icon: 'palette' },
  manual: { icon: 'book' },
  sources: { icon: 'files' },
  docs: { icon: 'file-text' },
  kb: { icon: 'list-checks' },
  dev: { icon: 'code' },
};

const ALL_CARDS: SurfaceCard[] = HUB_EXPERIENCES.map((e) => {
  const key = e.id as HubSurfaceKey;
  const { secondaryAsRole, ...ui } = CARD_UI[key];
  return {
    key, code: e.code, to: e.route, band: e.band, ...ui,
    role: e.switchUser ? (e.roleId as Role) : undefined,
    featured: e.featured,
    secondary: e.secondary ? { to: e.secondary.route, key: `hub.card.${key}.secondary`, asRole: secondaryAsRole } : undefined,
    comingSoon: e.comingSoon,
  };
});
const inBand = (band: HubBand) => ALL_CARDS.filter((c) => c.band === band);
const BAND_OUTSIDE = inBand('outside');
const BAND_PROMOTIONS = ALL_CARDS.filter((c) => c.key === 'promotions');
const BAND_TEAM = inBand('team').filter((c) => c.key !== 'promotions');
const BAND_BUILD = inBand('build');

interface ToolCard { key: HubToolKey; to: string; icon: IconName; isNew?: boolean }

const TOOL_UI: Record<HubToolKey, { icon: IconName; isNew?: boolean }> = {
  canvas: { icon: 'grid', isNew: true },
  simulator: { icon: 'monitor', isNew: true },
  specs: { icon: 'file-text' },
  layout: { icon: 'layout' },
  tables: { icon: 'table' },
  components: { icon: 'layers' },
  tokens: { icon: 'palette' },
  decisions: { icon: 'list-checks' },
  screenshots: { icon: 'camera' },
};

const TOOLS: ToolCard[] = HUB_TOOL_LIST.map((x) => ({ key: x.id as HubToolKey, to: x.route, ...TOOL_UI[x.id as HubToolKey] }));

type Status = 'built' | 'stub' | 'planned';
type TileKind = 'tone' | 'seat' | 'row' | 'training';

/**
 * 0161 · bento hub (layout B): members' experiences are whole class-tone tiles, the team's seats paper tiles with a tone
 * dot, the build experiences rows on the ink tile. Tone ids are D-01 class tones; ink is deep on every tone but moss.
 */
const TILE_TONE: Partial<Record<HubSurfaceKey, string>> = {
  app: 'river', site: 'sun', 'coming-soon': 'clay', teacher: 'moss',
  desk: 'river', inbox: 'sage', pos: 'sun', admin: 'clay', crm: 'plum', messages: 'slate', finance: 'moss', marketing: 'plum',
};

/** One experience tile: what it is, its status, the one button that enters it, its route. Live previews were dropped
 *  for the bento (0161): the tile names the screen and the button opens it. */
function HubTile({ card, kind, status, here, onEnter }: {
  card: SurfaceCard; kind: TileKind; status: Status; here: boolean; onEnter: (card: SurfaceCard) => void;
}) {
  const { t, bi } = useI18n();
  const { devMode } = useSession();
  const name = t(`hub.card.${card.key}`);
  const person = card.role ? demoUserByRole(card.role) : undefined;
  const tone = TILE_TONE[card.key];
  const who = card.key === 'promotions' ? t('hub.training.everyone') : card.role ? bi(ROLE_LABEL[card.role]) : bi(ROLE_LABEL.public);
  const enterLabel = card.key === 'promotions' ? t('hub.training.open') : person ? t('hub.enterAs', { name: person.name.split(' ')[0] }) : t('hub.open');

  return (
    <article className={`hub-card hub-tile is-${kind} ${card.comingSoon ? 'is-soon' : ''}`} data-tone={tone}>
      <div className="hub-tile-top">
        {kind === 'seat' && <span className="hub-tile-dot" aria-hidden />}
        {kind !== 'row' && <span className="hub-tile-eyebrow">{kind === 'seat' && devMode ? card.code : who}</span>}
        <span className="hub-tile-badges">
          {card.key === 'promotions' && <Badge tone="highlight">{t('hub.training.preview')}</Badge>}
          {card.comingSoon && <Badge tone="highlight">{t('hub.status.soon')}</Badge>}
          {!card.comingSoon && card.key !== 'promotions' && status !== 'built' && <Badge tone={status === 'stub' ? 'warn' : 'neutral'}>{t(`hub.status.${status}`)}</Badge>}
          {here && !card.comingSoon && <Badge tone="primary">{t('hub.here')}</Badge>}
        </span>
      </div>
      <div className="hub-tile-text">
        <h3 className="hub-tile-title">{name}</h3>
        <p className="hub-tile-body">{t(`hub.card.${card.key}.body`)}</p>
      </div>
      <div className="hub-tile-foot">
        {card.comingSoon ? (
          <>
            <Placeholder what={name}><Button variant="secondary" size="sm" icon="sparkle">{t('hub.soon.cta')}</Button></Placeholder>
            <Link className="hub-tile-link" to={card.to} onClick={(e) => { e.preventDefault(); onEnter({ ...card, comingSoon: false }); }}>{t('hub.soon.today', { code: card.code })}</Link>
          </>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => onEnter(card)}>{enterLabel}</Button>
        )}
        {card.secondary && (
          <Link
            className="hub-tile-link" to={card.secondary.to}
            onClick={card.secondary.asRole ? (e) => { e.preventDefault(); onEnter({ ...card, to: card.secondary!.to }); } : undefined}
          >{t(card.secondary.key)}</Link>
        )}
        <code className="hub-tile-route">{card.to}</code>
      </div>
    </article>
  );
}

/** A bento section: a serif heading with a short line beside it, then its tiles. */
function Section({ id, title, aside, children }: { id: string; title: string; aside: string; children: ReactNode }) {
  return (
    <section className="hub-section" aria-labelledby={id}>
      <header className="hub-section-head"><h2 id={id}>{title}</h2><p>{aside}</p></header>
      {children}
    </section>
  );
}

/** HUB-01 — the front door of the whole system. */
export function HubPage() {
  const { t, bi, lang, setLang } = useI18n();
  const nav = useNavigate();
  const { user, role, isSuperAdmin, canDevMode, devMode, setDevMode, switchUser } = useSession();
  const { theme, toggleTheme, skin, toggleSkin } = useTheme();
  const root = useRef<HTMLDivElement>(null);
  const ui = useUiScale(root);

  const routes = useMemo(() => getRoutes(), []);
  const manifest = useMemo(() => routeManifest(routes), [routes]);
  const statusOf = useCallback((path: string): Status => manifest.find((m) => m.path === path)?.status ?? 'planned', [manifest]);

  const enter = useCallback((card: SurfaceCard) => {
    if (card.role) switchUser(card.role);
    nav(card.to);
  }, [switchUser, nav]);

  const stats = useMemo(() => {
    const codes = new Set(routes.map((r) => r.spec.code));
    return [
      { key: 'routes', value: routes.length },
      { key: 'codes', value: codes.size },
      { key: 'tables', value: Object.keys(tableRegistry).length },
      { key: 'components', value: componentCount },
      { key: 'actions', value: listActions().length },
      { key: 'chapters', value: manualChapterCount },
    ];
  }, [routes]);

  const handlers = useMemo(() => ({
    'hub.enterAs': (p?: Record<string, string>) => {
      const key = p?.surface as HubSurfaceKey | undefined;
      const card = ALL_CARDS.find((c) => c.key === key);
      // A bad parameter is a failure, not a result: `run()` turns a throw into { ok: false }, while a
      // returned string is reported as { ok: true } and an agent would read it as "done".
      if (!card) throw new Error(`unknown surface "${p?.surface ?? ''}" — one of ${HUB_SURFACES.join(', ')}`);
      if (card.comingSoon) throw new Error(`${card.key} is coming soon (not built yet); today that work happens at ${card.to}`);
      enter(card);
      return `entered ${card.key} at ${card.to}`;
    },
    'hub.openCanvas': () => { nav('/dev/canvas'); return 'opened /dev/canvas'; },
    'hub.openSimulator': () => { nav('/dev/simulator'); return 'opened /dev/simulator'; },
    'hub.openTool': (p?: Record<string, string>) => {
      const tool = TOOLS.find((x) => x.key === p?.tool);
      if (!tool) throw new Error(`unknown tool "${p?.tool ?? ''}" — one of ${HUB_TOOLS.join(', ')}`);
      nav(tool.to);
      return `opened ${tool.to}`;
    },
    // `permission` on the spec is advisory metadata for agents; the gate that counts is here.
    'hub.toggleDevMode': () => {
      if (!canDevMode) throw new Error('requires super_admin or developer');
      setDevMode(!devMode); return `dev mode ${devMode ? 'off' : 'on'}`;
    },
    'hub.setLang': (p?: Record<string, string>) => {
      if (p?.lang !== 'es' && p?.lang !== 'en') throw new Error('lang must be es or en');
      setLang(p.lang);
      return `language ${p.lang}`;
    },
    // The machine-readable hub map other hosts (aluzina, between-gigs) render from: where it lives and what it holds.
    'hub.map': async () => {
      const m = await loadHubMap();
      return `hub map ${hubMapUrl()} · ${m.schema} v${m.product.version} · ${m.roles.length} roles, ${m.experiences.length} experiences, ${m.pages.length} pages, ${m.tools.length} tools · data at window.__hoyos.hubMap.data`;
    },
    'hub.toggleTheme': () => { toggleTheme(); return `theme ${theme === 'dark' ? 'light' : 'dark'}`; },
    'hub.toggleWireframe': () => {
      if (!isSuperAdmin) throw new Error('requires super_admin');
      toggleSkin(); return `skin ${skin === 'wireframe' ? 'styled' : 'wireframe'}`;
    },
  }), [enter, nav, setDevMode, devMode, setLang, toggleTheme, theme, toggleSkin, skin, isSuperAdmin, canDevMode]);
  useActions(hubSpec, handlers);

  const tile = (kind: TileKind) => (card: SurfaceCard) => (
    <HubTile key={card.key} card={card} kind={kind} status={statusOf(card.to)} here={ROLE_HOME[role] === card.to} onEnter={enter} />
  );
  const opens = useMemo(() => new Date(`${tenant.opensOn}T12:00:00`), []);
  const daysLeft = Math.ceil((opens.getTime() - Date.now()) / 86400000);
  const month = opens.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', { month: 'long' });
  const firstName = user.name.split(' ')[0];

  return (
    <div className="hub hub-bento" ref={root}>
      <div className="hub-wrap">
        <header className="hub-head">
          <div className="hub-head-brand">
            <Link to="/hub" aria-label={t('core.nav.hub')}><Wordmark height={Math.round(28 * ui)} /></Link>
            <span className="hub-head-label">{t('hub.bento.label')}</span>
            <Badge tone="highlight">{t('hub.version', { v: pkg.version })}</Badge>
          </div>
          <div className="hub-head-tools">
            <ProblemReport />
            <LangToggle />
            <button type="button" className="hub-iconbtn ctl-round" onClick={toggleTheme} aria-label={t('core.theme.toggle')} title={t('core.theme.toggle')}>
              <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={20} />
            </button>
            {isSuperAdmin && <Toggle size="sm" checked={skin === 'wireframe'} onChange={toggleSkin} label={t('hub.wireframe')} />}
            {canDevMode && <Toggle size="sm" checked={devMode} onChange={setDevMode} label={t('core.dev.mode')} />}
          </div>
        </header>

        <main className="hub-main">
          <div className="hub-bento-top">
            <section className="hub-hero" aria-labelledby="hub-title">
              <p className="hub-hero-eyebrow">{tenant.legalName} · {tenant.city}</p>
              <h1 id="hub-title">
                {t('hub.bento.one')} <br /><em>{t('hub.bento.every')}</em> {t('hub.bento.at')} <span className="hub-mark">{t('hub.bento.studio')}</span>.
              </h1>
              <p className="hub-hero-lead">{t('hub.bento.lead')}</p>
              <div className="hub-sessionbar">
                <span className="hub-sessionbar-label">{t('hub.session')}</span>
                <RoleSwitcher />
                <button type="button" className="hub-sun-btn" onClick={() => nav(ROLE_HOME[role])}>{t('hub.bento.openHome', { name: firstName })} <span aria-hidden>→</span></button>
              </div>
              {devMode && <p className="small hub-devhint">{t('hub.devHint')}</p>}
            </section>
            <section className="hub-date" aria-label={t('hub.bento.opening')}>
              <p className="hub-hero-eyebrow">{daysLeft > 0 ? t('hub.bento.daysLeft', { n: daysLeft }) : t('hub.bento.opening')}</p>
              <p className="hub-date-day"><span>{opens.getDate()}</span> <em>{month}</em></p>
              <p className="hub-date-meta">{bi(taglines.start)}</p>
            </section>
          </div>

          <div className="hub-promotions-preview">{BAND_PROMOTIONS.map(tile('training'))}</div>

          <Section id="hub-band-outside" title={t('hub.band.outside.title')} aside={t('hub.band.outside.eyebrow')}>
            <div className="hub-grid-outside">{BAND_OUTSIDE.map(tile('tone'))}</div>
          </Section>

          <Section id="hub-band-team" title={t('hub.band.team.title')} aside={t('hub.band.team.eyebrow')}>
            <div className="hub-grid-team">{BAND_TEAM.map(tile('seat'))}</div>
          </Section>

          <div className="hub-bento-bottom">
            <section className="hub-build" aria-labelledby="hub-band-build">
              <h2 id="hub-band-build">{t('hub.band.build.title')}</h2>
              <div className="hub-build-rows">{BAND_BUILD.map(tile('row'))}</div>
            </section>
            <section className="hub-toolbox" aria-labelledby="hub-band-tools">
              <h2 id="hub-band-tools">{t('hub.band.tools.title')}</h2>
              <ul className="hub-tools">
                {TOOLS.map((tool) => (
                  <li key={tool.key}>
                    <Link className="hub-tool" to={tool.to} title={t(`hub.tool.${tool.key}.body`)}>
                      <Icon name={tool.icon} size={16} />{t(`hub.tool.${tool.key}`)}
                      {tool.isNew && <Badge tone="highlight">{t('hub.new')}</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
              <dl className="hub-stats" aria-label={t('hub.stats.label')}>
                {stats.map((s) => (
                  <div key={s.key} className="hub-stat">
                    <dt className="hub-stat-key">{t(`hub.stat.${s.key}`)}</dt>
                    <dd className="hub-stat-value">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </main>

        <footer className="hub-foot"><p className="xs hub-footline">{t('hub.footer', { v: pkg.version })}</p></footer>
      </div>
    </div>
  );
}
