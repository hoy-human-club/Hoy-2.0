import { createElement } from 'react';
import type { RouteDef } from '../../specs/types';
import { MaintenancePage } from './MaintenancePage';
import { maintenanceSpec } from './specs';
export { strings } from './strings';
export const routes:RouteDef[]=[{path:'/staff/maintenance',element:createElement(MaintenancePage),spec:maintenanceSpec,roles:['super_admin','admin','maintenance'],surface:'staff',layout:'desktop',nav:{labelKey:'core.nav.maintenance',icon:'rooms',order:63,group:'core.nav.group.studio',badge:'preview'}}];
