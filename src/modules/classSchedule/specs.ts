import type { PageSpec } from '../../specs/types';
export const scheduleSpec: PageSpec = {
 code: 'M-14', name: { es: 'Horario de clases', en: 'Class Schedule' },
 purpose: { es: 'Gestionar sesiones fechadas y sus vínculos con el catálogo.', en: 'Manage dated sessions and their catalogue links.' },
 roles: ['super_admin', 'admin'], layout: ['notice', 'filters', 'sessions'],
 data: ['class_sessions', 'class_templates', 'teachers', 'modalities', 'rooms', 'audit_log'],
 logic: ['Templates are recurrence definitions; sessions are individual dated occurrences.', 'Calendar, list and table share filters.', 'Past sessions are read-only. Capacity cannot fall below occupied seats.', 'Current provider is a browser-local demo; no production booking changes.'],
 integrations: ['Supabase (not connected)'], states: ['Loading', 'Empty', 'Filtered', 'Calendar', 'List', 'Table', 'Editing', 'Conflict', 'Error', 'Read-only history'],
};

export const paySpec: PageSpec = { ...scheduleSpec, code: 'M-14a', name: { es: 'Pago por clase', en: 'Class pay' }, roles: ['super_admin', 'admin', 'finance'], layout: ['rules'], data: ['class_pay_rules', 'class_templates'], purpose: { es: 'Configurar reglas futuras de pago, sin ejecutar pagos.', en: 'Configure prospective pay rules without making payments.' } };
