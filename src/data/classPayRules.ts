import type { BaseRow } from './schema';
import { tenant } from '../tenant/tenant';

export type PayMode = 'flat' | 'attendance';
export type AttendanceBasis = 'checked_in' | 'booked';
export interface ClassPayRuleRow extends BaseRow {
  template_id: string | null;
  session_id: string | null;
  effective_from: string;
  mode: PayMode;
  flat_amount: number | null;
  base_amount: number | null;
  per_attendee: number | null;
  attendance_basis: AttendanceBasis | null;
  revision_of: string | null;
  created_by: string | null;
}
export interface PayScope { templateId?: string | null; sessionId?: string | null }
export interface AttendanceCounts { checked_in: number; booked: number }
export interface ClassPayQuote {
  configured: boolean;
  amountCOP: number | null;
  ruleId: string | null;
  source: 'session' | 'template' | 'unconfigured';
  mode: PayMode | null;
  attendanceBasis: AttendanceBasis | null;
  attendeeCount: number | null;
  effectiveFrom: string | null;
}
const validCOP = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
const dateValid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
export const canManageClassPay = (role: string) => ['super_admin', 'admin', 'finance'].includes(role);
export function validateClassPayRule(rule: Pick<ClassPayRuleRow, 'template_id' | 'session_id' | 'effective_from' | 'mode' | 'flat_amount' | 'base_amount' | 'per_attendee' | 'attendance_basis'>): boolean {
  if (!!rule.template_id === !!rule.session_id || !dateValid(rule.effective_from)) return false;
  if (rule.mode === 'flat') return validCOP(rule.flat_amount);
  return rule.mode === 'attendance' && validCOP(rule.base_amount) && validCOP(rule.per_attendee) && ['checked_in', 'booked'].includes(rule.attendance_basis ?? '');
}
/** Only the new-class transaction calls this. Never backfill existing classes merely because a rule is absent. */
export function defaultClassPayRule(scope: PayScope, effectiveFrom: string, createdBy: string | null = null): Pick<ClassPayRuleRow, 'template_id' | 'session_id' | 'effective_from' | 'mode' | 'flat_amount' | 'base_amount' | 'per_attendee' | 'attendance_basis' | 'revision_of' | 'created_by'> {
  return { template_id: scope.sessionId ? null : scope.templateId ?? null, session_id: scope.sessionId ?? null, effective_from: effectiveFrom,
    mode: 'flat', flat_amount: tenant.classDefaults.flatPayCOP, base_amount: null, per_attendee: null, attendance_basis: null, revision_of: null, created_by: createdBy };
}
/** Immutable revisions are selected by effective date, then creation time; no historical row is edited. */
export function resolveClassPayRule(rules: ClassPayRuleRow[], scope: PayScope, onDate: string): ClassPayRuleRow | null {
  if (!dateValid(onDate)) return null;
  const eligible = rules.filter(rule => rule.effective_from <= onDate && validateClassPayRule(rule));
  const latest = (list: ClassPayRuleRow[]) => list.sort((a, b) => b.effective_from.localeCompare(a.effective_from) || b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))[0] ?? null;
  return (scope.sessionId ? latest(eligible.filter(rule => rule.session_id === scope.sessionId)) : null)
    ?? (scope.templateId ? latest(eligible.filter(rule => !rule.session_id && rule.template_id === scope.templateId)) : null);
}
/** Snapshot-ready preview only. No payout, ledger or already-generated payroll line is changed. */
export function quoteClassPay(rules: ClassPayRuleRow[], scope: PayScope, onDate: string, counts?: AttendanceCounts): ClassPayQuote {
  const rule = resolveClassPayRule(rules, scope, onDate);
  const blank: ClassPayQuote = { configured: false, amountCOP: null, ruleId: null, source: 'unconfigured', mode: null, attendanceBasis: null, attendeeCount: null, effectiveFrom: null };
  if (!rule) return blank;
  const count = rule.mode === 'attendance' && rule.attendance_basis ? counts?.[rule.attendance_basis] : null;
  const amount = rule.mode === 'flat' ? rule.flat_amount : count != null && Number.isSafeInteger(count) && count >= 0 ? rule.base_amount! + count * rule.per_attendee! : null;
  return { configured: amount != null && validCOP(amount), amountCOP: amount != null && validCOP(amount) ? amount : null, ruleId: rule.id,
    source: rule.session_id ? 'session' : 'template', mode: rule.mode, attendanceBasis: rule.attendance_basis, attendeeCount: count ?? null, effectiveFrom: rule.effective_from };
}

export type ClassPayRuleDraft = Pick<ClassPayRuleRow, 'template_id' | 'session_id' | 'effective_from' | 'mode' | 'flat_amount' | 'base_amount' | 'per_attendee' | 'attendance_basis'>;
export interface AppendClassPayRuleCommand { requestId: string; role: string; actorId: string; rule: ClassPayRuleDraft }
/** Atomic, append-only demo operation. Server-side tenant/auth enforcement is still required in production. */
export function appendClassPayRule(db: Record<string, BaseRow[]>, command: AppendClassPayRuleCommand, now = new Date()): ClassPayRuleRow {
  if (!canManageClassPay(command.role)) throw new Error('class_pay_forbidden');
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(command.requestId)) throw new Error('class_pay_request_invalid');
  if (!validateClassPayRule(command.rule)) throw new Error('class_pay_invalid');
  const all = (db.class_pay_rules ?? []) as ClassPayRuleRow[];
  const id = `cpr_${command.requestId}`;
  const previous = all.find(rule => rule.id === id);
  if (previous) {
    if (previous.created_by !== command.actorId || Object.entries(command.rule).some(([key, value]) => previous[key] !== value)) throw new Error('class_pay_request_conflict');
    return structuredClone(previous);
  }
  const scopeTable = command.rule.session_id ? 'class_sessions' : 'class_templates';
  const target = db[scopeTable]?.find(row => row.id === (command.rule.session_id || command.rule.template_id));
  const actor = db.users?.find(row => row.id === command.actorId);
  if (!target || !actor || actor.tenant_id !== target.tenant_id) throw new Error('class_pay_scope_invalid');
  if (command.rule.session_id && !Number.isFinite(Date.parse(String(target.starts_at)))) throw new Error('class_pay_scope_invalid');
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (command.rule.effective_from < today || (command.rule.session_id && Date.parse(String(target.starts_at)) <= now.getTime())) throw new Error('class_pay_historical_immutable');
  const ownRules = all.filter(rule => rule.tenant_id === target.tenant_id && (command.rule.session_id ? rule.session_id === command.rule.session_id : !rule.session_id && rule.template_id === command.rule.template_id));
  const prior = ownRules.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const row: ClassPayRuleRow = { ...command.rule, id, tenant_id: target.tenant_id, created_at: now.toISOString(), updated_at: now.toISOString(), revision_of: prior?.id ?? null, created_by: command.actorId };
  all.push(row);
  db.class_pay_rules = all;
  return structuredClone(row);
}
