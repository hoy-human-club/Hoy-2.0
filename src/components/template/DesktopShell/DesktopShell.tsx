import { useCallback, useEffect, useLayoutEffect, useMemo, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Link, NavLink, matchPath, useLocation } from 'react-router-dom';
import type { RouteDef, Surface, NavBadge } from '../../../specs/types';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useTheme } from '../../../design/ThemeProvider';
import { useTable } from '../../../data/DataContext';
import type { ProfileRow } from '../../../data/schema';
import { toSummary, useUnreadInbound } from '../../../data/comms';
import { DEV_MODE_ROLES, ROLE_HOME, ROLE_LABEL } from '../../../auth/roles';
import { Badge } from '../../atom/Badge/Badge';
import { openInspector } from '../../../dev/inspectorBus';
import { Wordmark } from '../../atom/Wordmark/Wordmark';
import { LangToggle } from '../../molecule/LangToggle/LangToggle';
import { Toggle } from '../../atom/Toggle/Toggle';
import { RoleSwitcher } from '../../molecule/RoleSwitcher/RoleSwitcher';
import { Avatar } from '../../atom/Avatar/Avatar';
import { TopBar } from '../../organism/TopBar/TopBar';
import { GlobalSearch, type SearchItem } from '../../molecule/GlobalSearch/GlobalSearch';
import { InboxPopover } from '../../molecule/InboxPopover/InboxPopover';
import './DesktopShell.css';
import { Icon } from '../../atom/Icon/Icon';

export interface DesktopShellProps {
  surfaces: Surface[];
  routes: RouteDef[];
  /** i18n key of the label beside the sidebar wordmark (core.nav.group.staff, core.nav.docs…). */
  titleKey: string;
  children: ReactNode;
}

const KEY = 'hoyos.shell';
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const value = JSON.parse(raw);
      if (typeof fallback === 'boolean') return (typeof value === 'boolean' ? value : fallback) as T;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return { ...fallback, ...Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === 'boolean')) } as T;
      }
    }
  } catch { /* ignore */ }
  return fallback;
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/** Key-aware state: switching users must never write the previous user's preferences to the new key. */
function usePreference<T>(key: string, fallback: T) {
  const [stored, setStored] = useState(() => ({ key, value: read(key, fallback) }));
  const value = stored.key === key ? stored.value : read(key, fallback);
  // The updater stays pure (StrictMode runs it twice in dev; writing storage inside it made the first toggle after a
  // user switch undo itself). Persisting happens in the effect below, only for the current key.
  const update = useCallback((change: (previous: T) => T) => {
    setStored((previous) => ({ key, value: change(previous.key === key ? previous.value : read(key, fallback)) }));
  }, [key]);
  const dirty = useRef(false);
  useEffect(() => { if (dirty.current && stored.key === key) write(key, stored.value); dirty.current = true; }, [stored]);
  return [value, update] as const;
}
// 0159 · IA phase 1: groups by job. Today and People start open (the desk uses them all day); the rest start folded.
const GROUP_ORDER = ['today', 'people', 'sales', 'finance', 'studio', 'reports', 'system', 'design'].map((key) => `core.nav.group.${key}`);
const DEFAULT_FOLDED: Record<string, boolean> = {
  'core.nav.group.sales': true, 'core.nav.group.finance': true, 'core.nav.group.studio': true,
  'core.nav.group.reports': true, 'core.nav.group.system': true,
};
const BADGE_TONE: Record<NavBadge, 'primary' | 'warn'> = { beta: 'primary', preview: 'warn' };

function useMedia(query: string) {
  const [match, setMatch] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/**
 * 0165 · the menu never leaves the screen on a tablet or a laptop: below 1024 px it is the icon rail (the ☰ opens the
 * full column over the page); only a phone (< 600 px) hides it behind the ☰ as a drawer.
 */
function useShellMode() {
  const phone = useMedia('(max-width: 599.98px)');
  const compact = useMedia('(max-width: 1023.98px)');
  return { phone, tablet: compact && !phone, overlay: compact };
}

/**
 * 0165 · no scrollbar on the menu, in any state: the list still scrolls (wheel, touch, keyboard focus) and a soft fade
 * plus a small chevron appear only at an edge that hides more items; the chevron scrolls one page that way.
 */
function useScrollEdges(ref: RefObject<HTMLElement>, deps: unknown[]) {
  const [edges, setEdges] = useState({ up: false, down: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const up = el.scrollTop > 2, down = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
      setEdges((p) => (p.up === up && p.down === down ? p : { up, down }));
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    return () => { el.removeEventListener('scroll', measure); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  const page = useCallback((dir: 1 | -1) => ref.current?.scrollBy({ top: dir * ref.current.clientHeight * 0.7, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), [ref]);
  return { edges, page };
}

/**
 * Desktop-first shell (staff, admin, dev, docs).
 * Sidebar: 240 px cream lane that collapses to a 56 px icon rail (chevron in the footer or the `[` key,
 * remembered per surface in localStorage) and becomes an off-canvas drawer below 900 px. Nav groups come
 * from `RouteDef.nav.group` and fold with a caret (remembered per group; navigation automatically opens the active route's group).
 * Top bar: sidebar toggle · wordmark · page name + code · global search · language, theme, the inbox bell
 * (unread inbound messages, with a popover of the threads → S-06), user switcher, dev mode and the spec chip.
 */
export function DesktopShell({ surfaces, routes, titleKey, children }: DesktopShellProps) {
  const { t, bi, dict } = useI18n();
  const title = t(titleKey);
  const { user, role, canDevMode, devMode, setDevMode, hasRole, can } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const { phone, tablet, overlay } = useShellMode();
  const surfaceKey = surfaces[0] ?? 'desktop';
  const preferenceScope = `${KEY}.v2.${encodeURIComponent(user.id)}.${role}.${surfaceKey}`;
  const collapsedKey = `${preferenceScope}.collapsed`;
  const groupId = useId();
  const groupsKey = `${preferenceScope}.groups`;

  // 0160 · the Studio look (Pulso for staff, D-01 `studio`) lives on <html> so drawers and toasts portalled to <body>
  // follow it; set before paint, removed when the person leaves for the member app or the website.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.look = 'studio';
    return () => { delete root.dataset.look; };
  }, []);

  const [collapsed, setCollapsed] = usePreference(collapsedKey, false);
  const [folded, setFolded] = usePreference(groupsKey, DEFAULT_FOLDED);
  const sideRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { setDrawer(false); }, [pathname]);

  // A tablet shows the rail until the ☰ opens the full column over the page; a phone shows nothing until then.
  const rail = tablet ? !drawer : collapsed && !phone;

  useEffect(() => {
    const side = sideRef.current;
    if (!side) return;
    side.inert = phone && !drawer;
    if (!overlay || !drawer) return;
    const focusable = () => [...side.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter((el) => el.getClientRects().length);
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setDrawer(false); menuRef.current?.focus(); }
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    side.addEventListener('keydown', onKey);
    return () => side.removeEventListener('keydown', onKey);
  }, [phone, overlay, drawer]);

  const toggleSidebar = useCallback(() => {
    if (overlay) setDrawer((o) => !o); else setCollapsed((c) => !c);
  }, [overlay, setCollapsed]);

  // `[` collapses and expands the column (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '[' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) return;
      e.preventDefault();
      if (overlay) setDrawer((o) => !o); else setCollapsed((c) => !c);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay, setCollapsed]);

  // 0159: running the studio and building the product are two workspaces. The Build workspace (dev surface) lists only
  // the design-system routes; super admins and developers move between them with the switcher at the top of the sidebar.
  const inBuild = surfaces.includes('dev');
  const allowed = useMemo(() => routes.filter((r) => hasRole(r.roles)), [routes, hasRole]);
  const canBuild = DEV_MODE_ROLES.includes(role) && allowed.some((r) => r.surface === 'dev' && r.nav);
  const canStudio = useMemo(() => allowed.some((r) => (r.surface === 'staff' || r.surface === 'admin') && r.nav), [allowed]);
  const rank = (g: string) => (g === '' ? -1 : GROUP_ORDER.indexOf(g) < 0 ? GROUP_ORDER.length : GROUP_ORDER.indexOf(g));
  const { items, homeTo } = useMemo(() => {
    const all = allowed
      .filter((r) => surfaces.includes(r.surface) && r.nav)
      .map((r) => ({ to: r.nav!.to ?? r.path, route: r, group: r.nav!.group ?? '', labelKey: r.nav!.labelKey }));
    // Exactly one “Inicio”: the home candidate that is this role's landing page (ROLE_HOME), else the ungrouped one (S-01).
    const homes = all.filter((i) => i.route.nav!.home);
    const home = homes.find((i) => i.route.path === ROLE_HOME[role]) ?? homes.find((i) => !i.group);
    const list = all
      .filter((i) => !i.route.nav!.home || i === home || i.group)
      .map((i) => (i === home ? { ...i, group: '', labelKey: 'core.nav.home' } : i))
      .sort((a, b) => (rank(a.group) - rank(b.group)) || (a.route.nav!.order - b.route.nav!.order));
    return { items: list, homeTo: inBuild ? '/dev' : home?.to ?? ROLE_HOME[role] };
  }, [allowed, surfaces, role, inBuild]);
  const groups = useMemo(() => [...new Set(items.map((i) => i.group))].sort((a, b) => rank(a) - rank(b)), [items]);
  const label = useCallback((g: string) => (dict[g] ? t(g) : g), [dict, t]);

  const isRoot = (to: string) => to.split('/').filter(Boolean).length <= 1;
  const isOn = (to: string) => pathname === to || (!isRoot(to) && pathname.startsWith(`${to}/`));
  // The most specific nav item on the current path is the only active one: /admin/crm/deletions lights
  // "Eliminaciones", not "CRM" as well.
  const activeTo = useMemo(() => {
    const direct = [...items].filter((i) => isOn(i.to) || (i.route.nav?.to && isOn(i.route.path)))
      .sort((a, b) => b.route.path.length - a.route.path.length)[0];
    if (direct) return direct.to;
    // Alias pages (e.g. /dev) share the same spec with their canonical sidebar entry.
    const currentRoute = allowed.find((r) => matchPath({ path: r.path, end: true }, pathname));
    return items.find((i) => i.route.spec.code === currentRoute?.spec.code)?.to ?? '';
  }, [items, allowed, pathname]);
  const activeGroup = useMemo(() => items.find((i) => i.to === activeTo)?.group ?? '', [items, activeTo]);

  // Reopen on navigation (including Back/Forward), but let the user fold the current category afterwards.
  useEffect(() => {
    if (activeGroup) setFolded((previous) => previous[activeGroup] ? { ...previous, [activeGroup]: false } : previous);
  }, [pathname, activeGroup, groupsKey, setFolded]);

  const current = useMemo(() => allowed.find((r) => matchPath({ path: r.path, end: true }, pathname)) ?? null, [allowed, pathname]);

  // Global search: every route this role may open, plus members by name.
  const { rows: profiles } = useTable<ProfileRow>('profiles');
  const searchItems = useMemo<SearchItem[]>(() => {
    const pages = allowed.filter((r) => !r.path.includes(':')).map((r) => ({ id: `r:${r.path}`, group: t('core.search.pages'), label: bi(r.spec.name), hint: r.spec.code, to: r.path }));
    const people = can('members.read')
      ? profiles.map((p) => ({ id: `p:${p.id}`, group: t('core.search.people'), label: p.full_name, hint: p.initials ?? undefined, to: `/admin/crm/${p.user_id}` }))
      : [];
    return [...pages, ...people];
  }, [allowed, profiles, can, bi, t]);

  // The bell counts what members sent and nobody on the team has read (S-06); it only shows to roles that can open the inbox.
  const inbox = useUnreadInbound();
  const inboxItems = useMemo(() => inbox.conversations.map(toSummary), [inbox.conversations]);
  const hasInbox = allowed.some((r) => r.path === '/staff/inbox');

  const sidebarLabel = overlay ? (drawer ? t('core.shell.closeMenu') : t('core.shell.menu')) : collapsed ? t('core.shell.expand') : t('core.shell.collapse');
  const navRef = useRef<HTMLElement>(null);
  const { edges, page } = useScrollEdges(navRef, [rail, drawer, folded, items.length]);

  return (
    <div className={`deskshell ${rail ? 'is-rail' : ''} ${drawer ? 'is-open' : ''} ${tablet ? 'is-tablet' : ''}`}>
      <aside ref={sideRef} className="deskshell-side" aria-hidden={phone && !drawer ? true : undefined} aria-label={t('core.shell.sections')}>
        <div className="deskshell-brand">
          <Link to={homeTo} className="deskshell-mark" title={t('core.nav.home')}><Wordmark height={rail ? 15 : 26} variant="cream" /></Link>
          {!rail && !(canBuild && canStudio) && <span className="deskshell-title">{title}</span>}
        </div>
        {canBuild && canStudio && !rail && (
          <nav className="deskshell-workspace" aria-label={t('core.workspace.switch')}>
            <Link to={inBuild ? ROLE_HOME[role].startsWith('/dev') ? '/staff' : ROLE_HOME[role] : homeTo} className={`deskshell-ws ${inBuild ? '' : 'is-on'}`} aria-current={inBuild ? undefined : 'page'}>{t('core.workspace.studio')}</Link>
            <Link to="/dev" className={`deskshell-ws ${inBuild ? 'is-on' : ''}`} aria-current={inBuild ? 'page' : undefined}>{t('core.workspace.build')}</Link>
          </nav>
        )}
        <div className={`deskshell-navwrap ${edges.up ? 'has-up' : ''} ${edges.down ? 'has-down' : ''}`}>
        {edges.up && <button type="button" className="deskshell-more is-up" onClick={() => page(-1)} aria-label={t('core.shell.moreUp')} title={t('core.shell.moreUp')}><Icon name="chevron-up" size="sm" /></button>}
        <nav ref={navRef} className="deskshell-nav" aria-label={t('core.shell.sections')}>
          {groups.map((g) => {
            const open = !g || !folded[g];
            const panelId = `${groupId}-${g.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
            return (
              <div key={g} className={`deskshell-group ${open ? '' : 'is-folded'}`}>
                {g && !rail && (
                  <button
                    type="button" className="deskshell-grouplabel eyebrow" aria-expanded={open} aria-controls={panelId}
                    title={t(open ? 'core.shell.group.collapse' : 'core.shell.group.expand', { group: label(g) })}
                    onClick={() => setFolded((f) => ({ ...f, [g]: !f[g] }))}
                  >
                    <span className="deskshell-caret" aria-hidden><Icon name={open ? 'chevron-down' : 'chevron-right'} size="xs" /></span>
                    <span className="deskshell-grouptext">{label(g)}</span>
                  </button>
                )}
                {g && rail && <hr className="deskshell-sep" aria-hidden />}
                <div id={panelId} className="deskshell-groupitems" hidden={!open && !rail}>
                {items.filter((i) => i.group === g).map(({ to, route: r, labelKey }) => {
                  const badge = r.nav!.badge;
                  return (
                    <NavLink
                      key={`${r.path}-${to}`} to={to} end={isRoot(to)} aria-current={to === activeTo ? 'page' : false}
                      className={() => `deskshell-link ${to === activeTo ? 'is-active' : ''}`}
                      title={rail ? t(labelKey) : badge ? t(`core.nav.badge.${badge}.hint`) : undefined}
                      onClick={() => setDrawer(false)}
                    >
                      <span className="deskshell-icon" aria-hidden><Icon name={r.nav!.icon} size="md" /></span>
                      <span className="deskshell-linktext">{t(labelKey)}</span>
                      {badge && !rail && <Badge tone={BADGE_TONE[badge]} className="deskshell-badge">{t(`core.nav.badge.${badge}`)}</Badge>}
                      {devMode && !rail && <code className="deskshell-code">{r.spec.code}</code>}
                      {rail && <span className="deskshell-tip" aria-hidden>{t(labelKey)}{badge ? ` · ${t(`core.nav.badge.${badge}`)}` : ''}</span>}
                    </NavLink>
                  );
                })}
                </div>
              </div>
            );
          })}
        </nav>
        {edges.down && <button type="button" className="deskshell-more is-down" onClick={() => page(1)} aria-label={t('core.shell.moreDown')} title={t('core.shell.moreDown')}><Icon name="chevron-down" size="sm" /></button>}
        </div>
        <div className="deskshell-foot">
          <button
            type="button" className="deskshell-collapse" onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!rail} aria-label={rail ? t('core.shell.expand') : t('core.shell.collapse')}
            title={`${rail ? t('core.shell.expand') : t('core.shell.collapse')} · ${t('core.shell.collapseHint')}`}
          >
            <span className="deskshell-chev" aria-hidden><Icon name={rail ? 'chevron-right' : 'chevron-left'} size="sm" /></span>
            {!rail && <span className="small">{t('core.shell.collapse')}</span>}
          </button>
          {rail ? (
            <Link to={homeTo} title={user.name} className="deskshell-me"><Avatar name={user.name} initials={user.initials} size={28} /></Link>
          ) : (
            <>
              <div className="row"><Avatar name={user.name} initials={user.initials} size={32} /><div className="grow small"><div className="deskshell-who">{user.name}</div><div className="xs muted">{bi(ROLE_LABEL[role])}</div></div></div>
              {/* 0159: the product links to help, not to the testing hub (that lives in the demo strip). */}
              <Link to="/manual" className="small"><Icon name="manual" size="sm" /> {t('core.nav.help')}</Link>
            </>
          )}
        </div>
      </aside>
      <div className="deskshell-col">
        {/* 0154 · testing tools live in their own strip above the product bar, so the top bar carries only what staff use
            (search, language, theme, inbox) and a production build can drop the demo controls in this one place (HALL-16). */}
        <div className="deskshell-demobar" role="region" aria-label={t('core.demo.bar')}>
          <span className="deskshell-demolabel"><span className="deskshell-specdot" aria-hidden />{t('core.demo.bar')}</span>
          <Link to="/hub" className="deskshell-hublink">{t('core.nav.hub')}</Link>
          <div className="deskshell-rs"><RoleSwitcher compact /></div>
          {canDevMode && <span className="deskshell-devtoggle" title={t('core.dev.mode')}><Toggle size="sm" checked={devMode} onChange={setDevMode} label={t('core.dev.mode')} /></span>}
          {devMode && current && (
            <button type="button" className="deskshell-spec" onClick={openInspector} title="Ctrl+." aria-label={`${t('core.dev.spec')} ${current.spec.code}`}>
              <span className="deskshell-specdot" aria-hidden />{current.spec.code}
            </button>
          )}
        </div>
        <TopBar
          brand homeTo={homeTo} title={current ? (current.nav ? t(items.find((i) => i.route === current)?.labelKey ?? current.nav.labelKey) : bi(current.spec.name)) : title}
          code={devMode ? current?.spec.code : undefined}
          leading={<button ref={menuRef} type="button" className="topbar-lead" onClick={toggleSidebar} aria-label={sidebarLabel} aria-expanded={overlay ? drawer : !rail} title={sidebarLabel}>☰</button>}
          center={<GlobalSearch items={searchItems} />}
          actions={
            <>
              <LangToggle size="sm" />
              <button type="button" className="deskshell-iconbtn ctl-round" onClick={toggleTheme} aria-label={t('core.theme.toggle')} title={t('core.theme.toggle')}><Icon name={theme === 'dark' ? 'moon' : 'sun'} size="sm" /></button>
              {hasInbox && <InboxPopover count={inbox.count} items={inboxItems} itemTo={(k) => `/staff/inbox/${k}`} inboxTo="/staff/inbox" />}
            </>
          }
        />
        <main className="deskshell-main">{children}</main>
      </div>
      {drawer && <div className="deskshell-scrim" onClick={() => setDrawer(false)} aria-hidden />}
    </div>
  );
}
