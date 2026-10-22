import { createElement } from 'react';
import type { RouteDef } from '../../specs/types';
import { MaintenancePage } from './MaintenancePage';
import { maintenanceSpec } from './specs';
export { strings } from './strings';
export const routes:RouteDef[]=[{path:'/staff/maintenance',element:createElement(MaintenancePage),spec:maintenanceSpec,roles:['super_admin','admin','maintenance'],surface:'staff',layout:'desktop',nav:{labelKey:'maintenance.title',icon:'rooms',order:4.5,group:'core.nav.group.staff'}}];
