import { lazyPages } from '../../app/lazyPage';
import type { RouteDef } from '../../specs/types';
import { STAFF_ROLES, type Role } from '../../auth/roles';
import { S01, S02, S04, S05, S06 } from './specs';
export { strings } from './strings';
// Front-desk pages (S-xx) load as one chunk on first visit.
const page = lazyPages(() => import('./pages'));

const roles: Role[] = [...STAFF_ROLES, 'teacher'];
const desk: Role[] = ['super_admin', 'admin', 'coordinator', 'front_desk'];
const base = { roles, surface: 'staff' as const, layout: 'desktop' as const };
const G = 'core.nav.group.';

// 0159 · IA phase 1: groups by job (today · people · sales · finance · studio · reports · system); S-01 is a role home candidate.
export const routes: RouteDef[] = [
  { ...base, path: '/staff', element: page('StaffHomePage'), spec: S01, nav: { labelKey: 'core.nav.home', icon: 'home', order: 0, home: true } },
  // Static /staff/inbox before the :id param (React Router v6 ranks it higher anyway; the order keeps the intent visible).
  { ...base, roles: desk, path: '/staff/inbox', element: page('InboxPage'), spec: S06, nav: { labelKey: 'core.nav.inbox', icon: 'inbox', order: 30, group: G + 'people' } },
  { ...base, roles: desk, path: '/staff/inbox/:id', element: page('InboxPage'), spec: S06 },
  { ...base, roles: desk, path: '/staff/checkin', element: page('CheckinPage'), spec: S02, nav: { labelKey: 'core.nav.checkin', icon: 'checkin', order: 10, group: G + 'today' } },
  { ...base, roles: desk, path: '/staff/register', element: page('RegisterPage'), spec: S04, nav: { labelKey: 'core.nav.register', icon: 'register', order: 12, group: G + 'today' } },
  { ...base, roles: desk, path: '/staff/rooms', element: page('RoomsPage'), spec: S05, nav: { labelKey: 'core.nav.rooms', icon: 'rooms', order: 62, group: G + 'studio' } },
];
