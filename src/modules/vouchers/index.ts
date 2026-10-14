import { lazyPages } from '../../app/lazyPage';
import type { RouteDef } from '../../specs/types';
import { adminSpec, claimSpec } from './specs';
export { strings } from './strings';
const page = lazyPages(() => import('./pages'));
export const routes: RouteDef[] = [
 { path: '/admin/vouchers', element: page('VoucherAdminPage'), spec: adminSpec, roles: adminSpec.roles, surface: 'admin', layout: 'desktop', nav: { labelKey: 'vouchers.title', icon: 'gift', order: 15.7, group: 'core.nav.group.admin' } },
 { path: '/app/vouchers', element: page('VoucherClaimPage'), spec: claimSpec, roles: claimSpec.roles, surface: 'customer', layout: 'mobile' },
 { path: '/app/vouchers/:id', element: page('VoucherClaimPage'), spec: claimSpec, roles: claimSpec.roles, surface: 'customer', layout: 'mobile' },
];
