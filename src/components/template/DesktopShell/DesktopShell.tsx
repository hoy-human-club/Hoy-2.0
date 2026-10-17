import { useCallback, useEffect, useMemo, useId, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, matchPath, useLocation } from 'react-router-dom';
import type { RouteDef, Surface } from '../../../specs/types';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useTheme } from '../../../design/ThemeProvider';
import { useTable } from '../../../data/DataContext';
import type { ProfileRow } from '../../../data/schema';
import { toSummary, useUnreadInbound } from '../../../data/comms';
import { ROLE_LABEL } from '../../../auth/roles';
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
  const update = useCallback((change: (previous: T) => T) => {
    setStored((previous) => {
      const next = change(previous.key === key ? previous.value : read(key, fallback));
      write(key, next);
      return { key, value: next };
    });
  }, [key]);
  return [value, update] as const;
}
const DEFAULT_FOLDED: Record<string, boolean> = {
  'core.nav.group.staff': true,
  'core.nav.group.publishing': true, 'core.nav.group.community': true,
  'core.nav.group.finance': true, 'core.nav.group.system': true, 'core.nav.group.design': true,
};

/** True while the viewport is narrower than the drawer breakpoint (900 px). */
function useNarrow() {
  const [narrow, setNarrow] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)').matches : false));
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
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
  const { user, role, isSuperAdmin, canDevMode, devMode, setDevMode, hasRole, can } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const narrow = useNarrow();
  const surfaceKey = surfaces[0] ?? 'desktop';
  const preferenceScope = `${KEY}.v2.${encodeURIComponent(user.id)}.${role}.${surfaceKey}`;
  const collapsedKey = `${preferenceScope}.collapsed`;
  const groupId = useId();
  const groupsKey = `${preferenceScope}.groups`;

  const [collapsed, setCollapsed] = usePreference(collapsedKey, false);
  const [folded, setFolded] = usePreference(groupsKey, DEFAULT_FOLDED);
  const sideRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { setDrawer(false); }, [pathname]);

  const rail = collapsed && !narrow;

  useEffect(() => {
    const side = sideRef.current;
    if (!side) return;
    side.inert = narrow && !drawer;
    if (!narrow || !drawer) return;
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
  }, [narrow, drawer]);

  const toggleSidebar = useCallback(() => {
    if (narrow) setDrawer((o) => !o); else setCollapsed((c) => !c);
  }, [narrow, setCollapsed]);

  // `[` collapses and expands the column (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '[' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) return;
      e.preventDefault();
      if (narrow) setDrawer((o) => !o); else setCollapsed((c) => !c);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [narrow, setCollapsed]);

  // A super admin sees the design-system (dev) routes from the staff and admin sidebars too.
  const shown = useMemo<Surface[]>(
    () => (isSuperAdmin && surfaces.includes('admin') && !surfaces.includes('dev') ? [...surfaces, 'dev'] : surfaces),
    [isSuperAdmin, surfaces],
  );
  const allowed = useMemo(() => routes.filter((r) => hasRole(r.roles)), [routes, hasRole]);
  const items = useMemo(() => allowed
    .filter((r) => shown.includes(r.surface) && r.nav)
    .map((r) => ({ to: r.nav!.to ?? r.path, route: r, group: r.nav!.group ?? '' }))
    .sort((a, b) => (shown.indexOf(a.route.surface) - shown.indexOf(b.route.surface)) || (a.route.nav!.order - b.route.nav!.order)),
  [allowed, shown]);
  const groups = useMemo(() => {
    const order = ['overview', 'staff', 'community', 'publishing', 'finance', 'system', 'design'].map((key) => `core.nav.group.${key}`);
    return [...new Set(items.map((i) => i.group))].sort((a, b) => (order.indexOf(a) < 0 ? order.length : order.indexOf(a)) - (order.indexOf(b) < 0 ? order.length : order.indexOf(b)));
  }, [items]);
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

  const sidebarLabel = narrow ? (drawer ? t('core.shell.closeMenu') : t('core.shell.menu')) : collapsed ? t('core.shell.expand') : t('core.shell.collapse');

  return (
    <div className={`deskshell ${rail ? 'is-rail' : ''} ${drawer ? 'is-open' : ''}`}>
      <aside ref={sideRef} className="deskshell-side" aria-hidden={narrow && !drawer ? true : undefined} aria-label={t('core.shell.sections')}>
        <div className="deskshell-brand">
          <Link to="/hub" className="deskshell-mark" title={t('core.nav.hub')}><Wordmark height={rail ? 15 : 26} /></Link>
          {!rail && <span className="deskshell-title">{title}</span>}
        </div>
        <nav className="deskshell-nav" aria-label={t('core.shell.sections')}>
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
                {items.filter((i) => i.group === g).map(({ to, route: r }) => (
                  <NavLink
                    key={`${r.path}-${to}`} to={to} end={isRoot(to)} aria-current={to === activeTo ? 'page' : false}
                    className={() => `deskshell-link ${to === activeTo ? 'is-active' : ''}`}
                    title={rail ? t(r.nav!.labelKey) : undefined}
                    onClick={() => setDrawer(false)}
                  >
                    <span className="deskshell-icon" aria-hidden><Icon name={r.nav!.icon} size="md" /></span>
                    <span className="deskshell-linktext">{t(r.nav!.labelKey)}</span>
                    {devMode && !rail && <code className="deskshell-code">{r.spec.code}</code>}
                    {rail && <span className="deskshell-tip" aria-hidden>{t(r.nav!.labelKey)}</span>}
                  </NavLink>
                ))}
                </div>
              </div>
            );
          })}
        </nav>
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
            <Link to="/hub" title={user.name} className="deskshell-me"><Avatar name={user.name} initials={user.initials} size={28} /></Link>
          ) : (
            <>
              <div className="row"><Avatar name={user.name} initials={user.initials} size={32} /><div className="grow small"><div className="deskshell-who">{user.name}</div><div className="xs muted">{bi(ROLE_LABEL[role])}</div></div></div>
              <Link to="/hub" className="small">← {t('core.nav.hub')}</Link>
            </>
          )}
        </div>
      </aside>
      <div className="deskshell-col">
        <TopBar
          brand homeTo="/hub" title={current ? (current.nav ? t(current.nav.labelKey) : bi(current.spec.name)) : title} code={current?.spec.code}
          leading={<button ref={menuRef} type="button" className="topbar-lead" onClick={toggleSidebar} aria-label={sidebarLabel} aria-expanded={narrow ? drawer : !rail} title={sidebarLabel}>☰</button>}
          center={<GlobalSearch items={searchItems} />}
          actions={
            <>
              <LangToggle size="sm" />
              <button type="button" className="deskshell-iconbtn ctl-round" onClick={toggleTheme} aria-label={t('core.theme.toggle')} title={t('core.theme.toggle')}><Icon name={theme === 'dark' ? 'moon' : 'sun'} size="sm" /></button>
              {hasInbox && <InboxPopover count={inbox.count} items={inboxItems} itemTo={(k) => `/staff/inbox/${k}`} inboxTo="/staff/inbox" />}
              <div className="deskshell-rs"><RoleSwitcher compact /></div>
              {canDevMode && <span className="deskshell-devtoggle" title={t('core.dev.mode')}><Toggle size="sm" checked={devMode} onChange={setDevMode} label={t('core.dev.mode')} /></span>}
              {devMode && current && (
                <button type="button" className="deskshell-spec" onClick={openInspector} title="Ctrl+." aria-label={`${t('core.dev.spec')} ${current.spec.code}`}>
                  <span className="deskshell-specdot" aria-hidden />{current.spec.code}
                </button>
              )}
            </>
          }
        />
        <main className="deskshell-main">{children}</main>
      </div>
      {drawer && <div className="deskshell-scrim" onClick={() => setDrawer(false)} aria-hidden />}
    </div>
  );
}
