import { lazyPages } from '../../app/lazyPage';
import type { RouteDef } from '../../specs/types';
import { adminSpec, claimSpec, deskSpec } from './specs';
export { strings } from './strings';
const page = lazyPages(() => import('./pages'));
const desk = lazyPages(() => import('./DeskPage'));
export const routes: RouteDef[] = [
 { path: '/staff/vouchers', element: desk('VoucherDeskPage'), spec: deskSpec, roles: deskSpec.roles, surface:'staff', layout:'desktop', nav:{labelKey:'desk.title',icon:'gift',order:14,group:'core.nav.group.today'} },
 { path: '/admin/vouchers', element: page('VoucherAdminPage'), spec: adminSpec, roles: adminSpec.roles, surface: 'admin', layout: 'desktop', nav: { labelKey: 'vouchers.title', icon: 'gift', order: 41, group: 'core.nav.group.sales' } },
 { path: '/app/vouchers', element: page('VoucherClaimPage'), spec: claimSpec, roles: claimSpec.roles, surface: 'customer', layout: 'mobile' },
 { path: '/app/vouchers/:id', element: page('VoucherClaimPage'), spec: claimSpec, roles: claimSpec.roles, surface: 'customer', layout: 'mobile' },
];
