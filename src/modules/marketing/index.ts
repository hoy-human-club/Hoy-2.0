import {createElement} from 'react';
import type {RouteDef} from '../../specs/types';
import {MarketingPage} from './MarketingPage';
import {marketingSpec} from './specs';
export {strings} from './strings';
export const routes:RouteDef[]=[{path:'/admin/marketing',element:createElement(MarketingPage),spec:marketingSpec,roles:marketingSpec.roles,surface:'admin',layout:'desktop',nav:{labelKey:'marketing.title',icon:'palette',order:11.5,group:'core.nav.group.publishing'}}];
