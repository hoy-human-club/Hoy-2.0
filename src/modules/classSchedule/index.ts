import { lazyPages } from '../../app/lazyPage';
import type { RouteDef } from '../../specs/types';
import { scheduleSpec, paySpec } from './specs';
export { strings } from './strings';
const page = lazyPages(() => import('./pages'));
export const routes: RouteDef[] = [
  { path: '/admin/class-pay', element: page('ClassPayPage'), spec: paySpec, roles: paySpec.roles, surface: 'admin', layout: 'desktop', nav: { labelKey: 'schedule.payNav', icon: 'payroll', order: 19.1, group: 'core.nav.group.finance' } },
  { path: '/admin/class-schedule', element: page('ClassSchedulePage'), spec: scheduleSpec, roles: scheduleSpec.roles, surface: 'admin', layout: 'desktop', nav: { labelKey: 'schedule.title', icon: 'classes', order: 11.1, group: 'core.nav.group.staff' } },
];
