import {lazyPages} from '../../app/lazyPage';
import type {RouteDef} from '../../specs/types';
import {giftDemoSpec} from './spec';
export {strings} from './strings';
const page=lazyPages(()=>import('./page'));
export const routes:RouteDef[]=[{path:'/app/voucher-gifts',element:page('VoucherGiftPage'),spec:giftDemoSpec,roles:giftDemoSpec.roles,surface:'customer',layout:'mobile',nav:{labelKey:'giftDemo.title',icon:'gift',order:15}}];
