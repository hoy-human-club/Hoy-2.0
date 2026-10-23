import { lazyPages } from '../../app/lazyPage';
import type { RedirectDef, RouteDef } from '../../specs/types';
import type { Role } from '../../auth/roles';
import { EVERYONE } from '../../auth/roles';
// The customer view of the canvas specs (real layout section names + real table names). Same keys as src/specs/canvasSpecs.
import { canvasSpecs } from './specs';
export { strings } from './strings';

/** 0030: A-05 (daily intention) is retired; old links and bookmarks land on Home. */
export const redirects: RedirectDef[] = [
  { from: '/app/intention', to: '/app', reason: 'A-05 retired in 0030 (daily intention removed from the customer experience)' },
  { from: '/app/credits', to: '/app/classes', reason: '0051: HOY has no credits — C-07b is "Mis clases" (the 12-class package) at /app/classes' },
  { from: '/app/membership', to: '/app/classes', reason: 'C-22 retired in 0051: no membership at launch; the package and its freeze live in C-07b' },
];
// The customer app and its auth screens: one chunk, fetched when a member opens /app or /auth.
const page = lazyPages(() => import('./pages'));

const roles: Role[] = ['customer', 'teacher'];
const base = { roles, surface: 'customer' as const, layout: 'mobile' as const };
const pub = { roles: EVERYONE, surface: 'public' as const, layout: 'mobile' as const };

/** Bottom dock (C-25 rule): four destinations — Home, Schedule, History, More. Everything else is one tap away from More. */
export const routes: RouteDef[] = [
  { ...base, path: '/app', element: page('CustomerHomePage'), spec: canvasSpecs['C-01'], nav: { labelKey: 'core.nav.home', icon: 'home', order: 1 } },
  { ...base, path: '/app/schedule', element: page('SchedulePage'), spec: canvasSpecs['C-02'], nav: { labelKey: 'core.nav.schedule', icon: 'schedule', order: 2 } },
  { ...base, path: '/app/schedule/week', element: page('SchedulePage', { view: 'week' }), spec: canvasSpecs['C-02b'] },
  { ...base, path: '/app/class/:id', element: page('ClassDetailPage'), spec: canvasSpecs['C-03'] },
  { ...base, path: '/app/checkout/:id', element: page('CheckoutPage'), spec: canvasSpecs['C-04'] },
  { ...base, path: '/app/payment-methods', element: page('PaymentMethodsPage'), spec: canvasSpecs['C-05'] },
  { ...base, path: '/app/plans', element: page('PlansPage'), spec: canvasSpecs['C-06'] },
  { ...base, path: '/app/passes', element: page('PassesPage'), spec: canvasSpecs['C-07'] },
  { ...base, path: '/app/classes', element: page('ClassesPage'), spec: canvasSpecs['C-07b'] },
  { ...base, path: '/app/booking/:id', element: page('BookedPage'), spec: canvasSpecs['C-08'] },
  { ...base, path: '/app/booking/:id/change', element: page('BookedPage', { change: true }), spec: canvasSpecs['C-08b'] },
  { ...base, path: '/app/rate/:id', element: page('RatePage'), spec: canvasSpecs['C-10'] },
  { ...base, path: '/app/history', element: page('HistoryPage'), spec: canvasSpecs['C-11'], nav: { labelKey: 'core.nav.history', icon: 'history', order: 3 } },
  { ...base, path: '/app/rules', element: page('RulesPage'), spec: canvasSpecs['C-13'] },
  { ...base, path: '/app/faq', element: page('FaqPage', { page: 1 }), spec: canvasSpecs['C-14'] },
  { ...base, path: '/app/faq/2', element: page('FaqPage', { page: 2 }), spec: canvasSpecs['C-15'] },
  { ...base, path: '/app/invite', element: page('InvitePage'), spec: canvasSpecs['C-16'] },
  { ...base, path: '/app/gift', element: page('GiftPage'), spec: canvasSpecs['C-17'] },
  { ...base, path: '/app/teachers', element: page('TeachersPage'), spec: canvasSpecs['C-18'] },
  { ...base, path: '/app/teachers/:id', element: page('TeacherProfilePage'), spec: canvasSpecs['C-18'] },
  { ...base, path: '/app/profile', element: page('ProfilePage'), spec: canvasSpecs['C-19'] },
  { ...base, path: '/app/waitlist/:id', element: page('WaitlistPage'), spec: canvasSpecs['C-20'] },
  { ...base, path: '/app/events', element: page('EventsListPage'), spec: canvasSpecs['C-23'] },
  { ...base, path: '/app/events/:id', element: page('EventPage'), spec: canvasSpecs['C-23'] },
  { ...base, path: '/app/notifications', element: page('NotificationsPage'), spec: canvasSpecs['C-24'] },
  { ...base, path: '/app/more', element: page('MorePage'), spec: canvasSpecs['C-25'], nav: { labelKey: 'core.nav.more', icon: 'more', order: 4 } },
  { ...base, path: '/app/account', element: page('AccountPage'), spec: canvasSpecs['C-26'] },
  { ...base, path: '/app/practice', element: page('PracticePage'), spec: canvasSpecs['C-27'] },
  { ...base, path: '/app/card', element: page('MemberCardPage'), spec: canvasSpecs['C-28'] },
  // A-06 in-app: the same legal library the site serves, plus the member's own acceptance.
  { ...base, path: '/app/legal/:kind', element: page('LegalAppPage'), spec: canvasSpecs['A-06'] },
  // Edge states, reachable as demo routes (and rendered inline by C-01, C-04 and C-08 when the state is real).
  { ...base, path: '/app/state/empty', element: page('EmptyHomePage'), spec: canvasSpecs['E-01'] },
  { ...base, path: '/app/state/declined', element: page('DeclinedDemoPage'), spec: canvasSpecs['E-02'] },
  { ...base, path: '/app/state/cancelled', element: page('CancelledDemoPage'), spec: canvasSpecs['E-03'] },
  // Auth flow — public surface, minimal shell (AuthShell). Real Supabase Auth replaces the demo picker later.
  { ...pub, path: '/auth', element: page('SplashPage'), spec: canvasSpecs['A-01'] },
  { ...pub, path: '/auth/sign-in', element: page('SignInPage'), spec: canvasSpecs['A-02'] },
  { ...pub, path: '/auth/sign-up', element: page('SignUpPage'), spec: canvasSpecs['A-03'] },
  { ...pub, path: '/auth/recover', element: page('PasswordResetPage'), spec: canvasSpecs['C-21'] },
  { ...pub, path: '/auth/locked', element: page('LockedPage'), spec: canvasSpecs['E-04'] },
];
