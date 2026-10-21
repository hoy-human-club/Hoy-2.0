import {createElement} from 'react';
import type {RouteDef} from '../../specs/types';
import {transferSpec} from './specs';
import {TransferQueuePage} from './TransferQueuePage';
export {strings} from './strings';
export const routes:RouteDef[]=[{path:'/staff/transfers',element:createElement(TransferQueuePage),spec:transferSpec,roles:['super_admin','admin','front_desk'],surface:'staff',layout:'desktop',nav:{labelKey:'transfers.title',icon:'bank',order:3.5,group:'core.nav.group.staff'}}];
