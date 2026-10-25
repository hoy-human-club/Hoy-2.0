import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { RouteDef, Surface } from '../../../specs/types';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useMinWidth } from '../../../layout/useMinWidth';
import { TopBar } from '../../organism/TopBar/TopBar';
import { NavBar } from '../../organism/NavBar/NavBar';
import { LangToggle } from '../../molecule/LangToggle/LangToggle';
import { Avatar } from '../../atom/Avatar/Avatar';
import './AppShell.css';

export interface AppShellProps {
  surface: Surface;
  routes: RouteDef[];
  homeTo: string;
  /** Where the avatar goes: the person's own profile (customer: /app/more, teacher: /teach/profile). */
  profileTo?: string;
  children: ReactNode;
  /** Hide the shell's own top bar when the page brings its own (the dock still shows below 900 px). */
  bare?: boolean;
}

/**
 * The one shell of the customer and teacher apps (D-0006). Below 900 px: brand top bar, a content column of at most
 * 560 px and the sticky bottom dock. From 900 px: a full-viewport page — top bar with the wordmark, the primary nav,
 * language and avatar; content in a centred container (`--w-app`, growing with `--ui`); the document scrolls.
 * There is no phone bezel here at any width; the hub's DeviceFrame simulator draws it around a real 390 px iframe.
 */
export function AppShell({ surface, routes, homeTo, profileTo = homeTo, children, bare = false }: AppShellProps) {
  const { t } = useI18n();
  const { user, hasRole } = useSession();
  const wide = useMinWidth('shell');
  const items = routes.filter((r) => r.surface === surface && r.nav && hasRole(r.roles)).sort((a, b) => a.nav!.order - b.nav!.order)
    .map((r) => ({ to: r.nav!.to ?? r.path, label: t(r.nav!.labelKey), icon: r.nav!.icon, end: r.path === homeTo }));
  return (
    <div className={`appshell ${wide ? 'is-wide' : 'is-narrow'}`} data-surface={surface}>
      {!bare && (
        <TopBar brand homeTo={homeTo} nav={wide && items.length > 0 ? <NavBar variant="top" items={items} /> : undefined}
          actions={<><LangToggle size="sm" /><Link to={profileTo} className="appshell-avatar" title={t('core.nav.profile')} aria-label={t('core.nav.profile')}><Avatar name={user.name} initials={user.initials} size={wide ? 36 : 30} /></Link></>} />
      )}
      <main className="appshell-main">{children}</main>
      {!wide && items.length > 0 && <div className="appshell-dock"><NavBar items={items} /></div>}
    </div>
  );
}
