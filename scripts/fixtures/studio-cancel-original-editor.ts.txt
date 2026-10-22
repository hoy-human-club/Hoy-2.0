import { tenant } from '../tenant/tenant';
import type { BaseRow, ClassSessionRow, ModalityRow } from './schema';
import type { Bi } from '../specs/types';
import type { Role } from '../auth/roles';
/** Null/absent inherits; an explicit empty bilingual value clears the inherited text. */
export function resolveSessionEditorial(session: Pick<ClassSessionRow, 'theme_override' | 'description_override'>, template?: BaseRow | null, modality?: Pick<ModalityRow, 'description'> | null): { theme: Bi; description: Bi } {
 return { theme: session.theme_override ?? template?.theme as Bi ?? { es: '', en: '' }, description: session.description_override ?? template?.description as Bi ?? modality?.description ?? { es: '', en: '' } };
}
export interface SessionEdit { before: ClassSessionRow; patch: Partial<ClassSessionRow>; role: Role; actorId: string }
export function applySessionEdit(db: Record<string, BaseRow[]>, command: SessionEdit, tenantId: string, now = new Date().toISOString()): { db: Record<string, BaseRow[]>; row: ClassSessionRow } {
 if (!['admin','super_admin'].includes(command.role)) throw new Error('schedule_forbidden');
 const previous = db.class_sessions.find(s => s.id === command.before.id && s.tenant_id === tenantId) as ClassSessionRow | undefined;
 if (!previous || JSON.stringify(previous) !== JSON.stringify(command.before)) throw new Error('schedule_conflict');
 if (previous.status !== 'scheduled' || previous.starts_at <= now) throw new Error('schedule_history');
 if (Object.keys(command.patch).some(k => !['teacher_id','modality_id','room_id','capacity','theme_override','description_override'].includes(k))) throw new Error('schedule_field');
 const next = { ...previous, ...command.patch, updated_at: now };
 for (const key of ['theme_override','description_override'] as const) { const value = next[key]; if (value != null && (typeof value !== 'object' || typeof value.es !== 'string' || (value.en != null && typeof value.en !== 'string') || value.es.length > 4000 || (value.en?.length ?? 0) > 4000)) throw new Error('schedule_copy'); }
 const room = db.rooms.find(r => r.id === next.room_id && r.tenant_id === tenantId);
 if (!Number.isSafeInteger(next.capacity) || next.capacity < 1 || next.capacity < previous.booked_count || !room || next.capacity > Math.min(Number(room.capacity), room.id === 'room_main' ? tenant.studio.mats : Infinity)) throw new Error('schedule_capacity');
 for (const [key, table] of [['teacher_id','teachers'],['modality_id','modalities']] as const) if (next[key] !== previous[key] && !db[table].some(r => r.id === next[key] && r.tenant_id === tenantId && r.active !== false)) throw new Error('schedule_reference');
 if (next.room_id !== previous.room_id && previous.booked_count > 0) throw new Error('schedule_booked_room');
 if (db.class_sessions.some(s => s.id !== previous.id && s.tenant_id === tenantId && s.status === 'scheduled' && String(s.starts_at) < next.ends_at && String(s.ends_at) > next.starts_at && (next.teacher_id !== previous.teacher_id && s.teacher_id === next.teacher_id || next.room_id !== previous.room_id && s.room_id === next.room_id))) throw new Error('schedule_overlap');
 const copy = structuredClone(db);
 copy.class_sessions = copy.class_sessions.map(s => s.id === next.id ? next : s);
 copy.audit_log = [...copy.audit_log, { id: `session_${crypto.randomUUID()}`, tenant_id: tenantId, created_at: now, updated_at: now, actor_id: command.actorId, action:'schedule.update', entity:'class_sessions', entity_id: next.id, ip:null, diff:{ role:command.role, source:'admin', before: Object.fromEntries(Object.keys(command.patch).map(k => [k, previous[k]])), after:command.patch } }];
 return { db:copy, row:next };
}
