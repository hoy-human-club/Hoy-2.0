import type { Role } from './roles';

export type Permission =
  | 'bookings.read' | 'bookings.write' | 'bookings.write_any'
  | 'classes.read' | 'classes.write'
  | 'checkin.write'
  | 'payments.read' | 'payments.write' | 'payments.refund'
  | 'members.read' | 'members.write'
  | 'content.write' | 'comms.write'
  | 'manual.edit' | 'manual.train'
  | 'tables.read' | 'tables.write'
  | 'settings.write' | 'features.write'
  | 'hours.write'
  | 'api_keys.read' | 'api_keys.write'
  | 'payroll.read' | 'payroll.write'
  | 'expenses.read' | 'expenses.write'
  | 'maintenance.write'
  | 'dev.tools' | 'docs.read' | 'audit.read';

const ALL: Permission[] = [
  'bookings.read', 'bookings.write', 'bookings.write_any', 'classes.read', 'classes.write', 'checkin.write',
  'payments.read', 'payments.write', 'members.read', 'members.write', 'content.write', 'comms.write',
  'manual.edit', 'manual.train', 'tables.read', 'tables.write', 'settings.write', 'features.write', 'hours.write', 'api_keys.read', 'api_keys.write', 'payroll.read', 'payroll.write',
  'expenses.read', 'expenses.write', 'maintenance.write', 'dev.tools', 'docs.read', 'audit.read',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ALL,
  // 0041: admin reads developer keys (D-07) but only super_admin and developer issue, rotate or revoke them.
  admin: ALL.filter((p) => p !== 'dev.tools' && p !== 'api_keys.write'),
  // manual.edit for a coordinator covers only sections marked {{editable:coordinator}} (K-03 enforces the level).
  // 0041: hours.write — the coordinator keeps holidays and special hours current (M-08g); the weekly hours stay settings.write.
  coordinator: ['bookings.read', 'bookings.write_any', 'classes.read', 'classes.write', 'checkin.write', 'payments.read', 'members.read', 'members.write', 'content.write', 'comms.write', 'manual.edit', 'manual.train', 'docs.read', 'audit.read', 'hours.write'],
  front_desk: ['bookings.read', 'bookings.write_any', 'classes.read', 'checkin.write', 'payments.read', 'payments.write', 'members.read', 'members.write', 'docs.read'],
  finance: ['payments.read', 'payments.write', 'members.read', 'payroll.read', 'payroll.write', 'expenses.read', 'expenses.write', 'tables.read', 'docs.read', 'audit.read'],
  teacher: ['classes.read', 'bookings.read', 'payroll.read', 'docs.read'],
  maintenance: ['classes.read', 'maintenance.write', 'docs.read'],
  // 0031: content and comms write, CRM read — no settings, payments or member edits.
  marketing: ['classes.read', 'content.write', 'comms.write', 'members.read', 'docs.read'],
  // 0031: dev tools, docs, specs and a read-only table manager; dev mode like super_admin, no settings or finance writes.
  // 0041: developer keys (D-07) — issue, rotate, revoke.
  developer: ['classes.read', 'dev.tools', 'docs.read', 'tables.read', 'audit.read', 'api_keys.read', 'api_keys.write'],
  customer: ['bookings.read', 'bookings.write', 'classes.read', 'payments.read', 'docs.read'],
  public: ['classes.read', 'docs.read'],
};

export function roleCan(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
