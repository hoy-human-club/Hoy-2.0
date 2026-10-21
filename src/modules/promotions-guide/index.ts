import { lazyPages } from '../../app/lazyPage';
import type { RouteDef } from '../../specs/types';
import { promotionsGuideSpec } from './specs';
export { strings } from './strings';

const page = lazyPages(() => import('./PromotionsGuidePage'));
export const routes: RouteDef[] = [
  { path: '/hub/promotions', element: page('PromotionsGuidePage'), spec: promotionsGuideSpec, roles: promotionsGuideSpec.roles, surface: 'public', layout: 'auto' },
];
