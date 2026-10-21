import { lazyPages } from '../../app/lazyPage';
import type { RouteDef } from '../../specs/types';
import { promoteSpec, offerSpec, performanceSpec } from './specs';
export { strings } from './strings';
const page=lazyPages(()=>import('./pages'));
export const routes:RouteDef[]=[
 {path:'/teach/promote',element:page('PromotePage'),spec:promoteSpec,roles:promoteSpec.roles,surface:'teacher',layout:'mobile',nav:{labelKey:'promotions.promote',icon:'invite',order:2.5}},
 {path:'/promotions/:code',element:page('PromotionOfferPage'),spec:offerSpec,roles:offerSpec.roles,surface:'public',layout:'auto'},
 {path:'/promotions',element:page('PromotionOfferPage'),spec:offerSpec,roles:offerSpec.roles,surface:'public',layout:'auto'},
 {path:'/admin/promotions',element:page('PromotionPerformancePage'),spec:performanceSpec,roles:performanceSpec.roles,surface:'admin',layout:'desktop',nav:{labelKey:'promotions.results',icon:'invite',order:15.8,group:'core.nav.group.community'}},
];
