import { lazyPages } from '../../app/lazyPage';
import type { RouteDef } from '../../specs/types';
import { productSpec, productPreviewSpec } from './spec';
export { strings } from './strings';
const page = lazyPages(() => import('./pages'));
export const routes: RouteDef[] = [{path:'/admin/products/preview',element:page('ProductPreviewPage'),spec:productPreviewSpec,roles:productPreviewSpec.roles,surface:'admin',layout:'desktop'}, { path:'/admin/products',element:page('ProductsPage'),spec:productSpec,roles:productSpec.roles,surface:'admin',layout:'desktop',nav:{labelKey:'products.title',icon:'ticket',order:15.8,group:'core.nav.group.community'} }];
