import { subscriptionSpec } from './subscriptionSpec';
import { lazyPages } from '../../app/lazyPage';
import type { RouteDef } from '../../specs/types';
import type { Role } from '../../auth/roles';
import { M01, M02, M03, M02a, M02b, M02c, M02d, M04, M05, M06, M07, M08a, M08b, M08c, M08d, M08e, M08f, M08g, M09, M09a, M09b, M09c, M10, M10a, M11, M12 } from './specs';
export { strings } from './strings';
// Admin pages (M-xx): one chunk for staff who open /admin.
const page = lazyPages(() => import('./pages'));

const G = 'core.nav.group.';
const base = { surface: 'admin' as const, layout: 'desktop' as const };
const admins: Role[] = ['super_admin', 'admin'];
const crm: Role[] = [...admins, 'coordinator', 'front_desk', 'finance', 'marketing'];
/** 0031: marketing writes content and comms; the table manager is read-only for developer (tables.read). */
const content: Role[] = [...admins, 'coordinator', 'marketing'];
const tablesRoles: Role[] = ['super_admin', 'finance', 'developer'];

export const routes: RouteDef[] = [
  { ...base, path: '/admin/finance/subscriptions', roles: [...admins, 'finance'], element: page('AppDirectoryPage'), spec: subscriptionSpec, nav: { labelKey: 'admin.subscriptions.nav', icon: 'integrations', order: 20.5, group: G + 'finance' } },
  { ...base, path: '/admin', roles: [...admins, 'coordinator', 'finance'], element: page('DashboardPage'), spec: M01, nav: { labelKey: 'core.nav.dashboard', icon: 'dashboard', order: 10, group: G + 'overview' } },
  // M-12: attendance / retention only (no revenue) — same roles as M-01 while ROADMAP §E 32 is open.
  { ...base, path: '/admin/analytics', roles: M12.roles, element: page('AnalyticsPage'), spec: M12, nav: { labelKey: 'admin.analytics.nav', icon: 'gauge', order: 10.5, group: G + 'overview' } },
  { ...base, path: '/admin/content', roles: content, element: page('ContentPage'), spec: M02, nav: { labelKey: 'core.nav.content', icon: 'content', order: 11, group: G + 'publishing' } },
  { ...base, path: '/admin/content/articles', roles: content, element: page('ArticlesPage'), spec: M02a },
  { ...base, path: '/admin/content/faq', roles: content, element: page('FaqAdminPage'), spec: M02b },
  { ...base, path: '/admin/content/events', roles: content, element: page('EventsAdminPage'), spec: M02c },
  { ...base, path: '/admin/content/media', roles: content, element: page('MediaPage'), spec: M02d },
  { ...base, path: '/admin/tables', roles: tablesRoles, element: page('TablesPage'), spec: M03, nav: { labelKey: 'core.nav.tables', icon: 'table', order: 12, group: G + 'system' } },
  { ...base, path: '/admin/tables/:table', roles: tablesRoles, element: page('TablesPage'), spec: M03 },
  { ...base, path: '/admin/emails', roles: content, element: page('EmailsPage'), spec: M04, nav: { labelKey: 'core.nav.emails', icon: 'mail', order: 13, group: G + 'community' } },
  { ...base, path: '/admin/whatsapp', roles: [...content, 'front_desk'], element: page('WhatsAppPage'), spec: M05, nav: { labelKey: 'core.nav.whatsapp', icon: 'whatsapp', order: 14, group: G + 'community' } },
  { ...base, path: '/admin/crm', roles: crm, element: page('CrmPage'), spec: M06, nav: { labelKey: 'core.nav.crm', icon: 'crm', order: 15, group: G + 'community' } },
  // Static segment outranks the :id param in React Router v6, so /admin/crm/deletions never reaches MemberPage.
  { ...base, path: '/admin/crm/deletions', roles: admins, element: page('DeletionsPage'), spec: M11, nav: { labelKey: 'admin.deletions.nav', icon: 'deletions', order: 15.5, group: G + 'community' } },
  { ...base, path: '/admin/crm/:id', roles: crm, element: page('MemberPage'), spec: M06 },
  { ...base, path: '/admin/activity', roles: [...admins, 'coordinator', 'finance'], element: page('ActivityPage'), spec: M07, nav: { labelKey: 'core.nav.activity', icon: 'activity', order: 16, group: G + 'overview' } },
  { ...base, path: '/admin/settings', roles: [...admins, 'coordinator', 'finance'], element: page('SettingsPage', { group: 'general' }), spec: M08a, nav: { labelKey: 'core.nav.settings', icon: 'settings', order: 17, group: G + 'system' } },
  // 0041: holidays and special hours — the coordinator keeps them current (hours.write).
  { ...base, path: '/admin/settings/hours', roles: [...admins, 'coordinator'], element: page('SettingsPage', { group: 'hours' }), spec: M08g },
  { ...base, path: '/admin/settings/features', roles: [...admins, 'coordinator', 'finance'], element: page('SettingsPage', { group: 'features' }), spec: M08b },
  { ...base, path: '/admin/settings/payments', roles: [...admins, 'finance'], element: page('SettingsPage', { group: 'payments' }), spec: M08c },
  { ...base, path: '/admin/settings/communications', roles: [...admins, 'coordinator'], element: page('SettingsPage', { group: 'communications' }), spec: M08d },
  { ...base, path: '/admin/settings/branding', roles: admins, element: page('SettingsPage', { group: 'branding' }), spec: M08e },
  { ...base, path: '/admin/settings/content', roles: [...admins, 'coordinator'], element: page('SettingsPage', { group: 'content' }), spec: M08f },
  { ...base, path: '/admin/integrations', roles: admins, element: page('IntegrationsPage'), spec: M10, nav: { labelKey: 'core.nav.integrations', icon: 'integrations', order: 21, group: G + 'system' } },
  { ...base, path: '/admin/integrations/google-business', roles: admins, element: page('GoogleBusinessPage'), spec: M10a },
  { ...base, path: '/admin/finance', roles: [...admins, 'finance'], element: page('FinancePage'), spec: M09, nav: { labelKey: 'admin.finance.nav', icon: 'finance', order: 18, group: G + 'finance' } },
  { ...base, path: '/admin/finance/payouts', roles: [...admins, 'finance'], element: page('PayoutsPage'), spec: M09a, nav: { labelKey: 'admin.payouts.nav', icon: 'payroll', order: 19, group: G + 'finance' } },
  { ...base, path: '/admin/finance/payouts/:id', roles: [...admins, 'finance'], element: page('PayoutRunPage'), spec: M09b },
  { ...base, path: '/admin/finance/expenses', roles: [...admins, 'finance'], element: page('ExpensesPage'), spec: M09c, nav: { labelKey: 'admin.expenses.nav', icon: 'expenses', order: 20, group: G + 'finance' } },
];
