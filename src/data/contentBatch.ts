import { tenant } from '../tenant/tenant';
import type { BaseRow } from './schema';
import type { Role } from '../auth/roles';
import { roleCan } from '../auth/permissions';
export type ContentEntity = 'class_templates' | 'teachers' | 'modalities' | 'rooms';
export interface ContentChange { id: string; before: BaseRow; patch: Record<string, unknown> }
export interface ContentBatch { table: ContentEntity; changes: ContentChange[]; role: Role; actorId: string; undo?: boolean }
export interface ContentBatchResult { changes: ContentChange[] }
const FIELDS: Record<ContentEntity, string[]> = {
 class_templates: ['teacher_id', 'modality_id', 'room_id', 'weekday', 'start_time', 'duration_min', 'capacity', 'level', 'active'],
 teachers: ['active'], modalities: ['active', 'heated', 'duration_min', 'intensity', 'tone'], rooms: ['heated', 'capacity'],
};
/** Demo-only transaction. Production needs an authenticated, tenant-scoped RPC and row locks. */
export function applyContentBatch(db: Record<string, BaseRow[]>, command: ContentBatch, tenantId: string, now = new Date().toISOString()): { db: Record<string, BaseRow[]>; result: ContentBatchResult } {
 const { table, changes, role, actorId } = command;
 if (!roleCan(role, 'content.write') || !FIELDS[table] || !changes.length || new Set(changes.map(c => c.id)).size !== changes.length) throw new Error('content_forbidden');
 const copy = structuredClone(db);
 const reverse: ContentChange[] = [];
 for (const change of changes) {
  const row = copy[table]?.find(x => x.id === change.id && x.tenant_id === tenantId);
  if (!row || JSON.stringify(row) !== JSON.stringify(change.before)) throw new Error('content_conflict');
  const keys = Object.keys(change.patch);
  if (!keys.length || keys.some(k => !FIELDS[table].includes(k))) throw new Error('content_field');
  const next: BaseRow = { ...row, ...change.patch, updated_at: now };
  for (const key of ['active', 'heated']) if (key in change.patch && typeof next[key] !== 'boolean') throw new Error('content_value');
  for (const key of ['capacity', 'duration_min', 'intensity']) if (key in change.patch && (!Number.isSafeInteger(next[key]) || Number(next[key]) < 1)) throw new Error('content_value');
  if ('intensity' in change.patch && Number(next.intensity) > 5) throw new Error('content_value');
  if ('weekday' in change.patch && (!Number.isInteger(next.weekday) || Number(next.weekday) < 0 || Number(next.weekday) > 6)) throw new Error('content_value');
  if ('start_time' in change.patch && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(next.start_time))) throw new Error('content_value');
  if ('level' in change.patch && !['all','beginner','intermediate','advanced'].includes(String(next.level))) throw new Error('content_value');
  if ('tone' in change.patch && !['moss','river','clay','sun','sage','slate','plum'].includes(String(next.tone))) throw new Error('content_value');
  for (const [key, ref] of [['teacher_id','teachers'], ['modality_id','modalities'], ['room_id','rooms']]) if (key in change.patch && !copy[ref]?.some(x => x.id === next[key] && x.tenant_id === tenantId && x.active !== false)) throw new Error('content_reference');
  if (table === 'class_templates') {
   const room = copy.rooms.find(x => x.id === next.room_id && x.tenant_id === tenantId);
   if (!room || Number(next.capacity) > Math.min(Number(room.capacity), room.id === 'room_main' ? tenant.studio.mats : Infinity)) throw new Error('content_capacity');
   if ('capacity' in change.patch && copy.class_sessions.some(s => s.template_id === row.id && s.status === 'scheduled' && String(s.starts_at) > now && Number(s.booked_count) > Number(next.capacity))) throw new Error('content_booked');
  }
  if (table === 'rooms' && 'capacity' in change.patch && copy.class_sessions.some(s => s.room_id === row.id && s.status === 'scheduled' && String(s.starts_at) > now && Math.max(Number(s.capacity), Number(s.booked_count)) > Number(next.capacity))) throw new Error('content_booked');
  const index = copy[table].findIndex(x => x.id === row.id);
  copy[table][index] = next;
  reverse.push({ id: row.id, before: structuredClone(next), patch: Object.fromEntries(keys.map(k => [k, row[k]])) });
 }
 const audit: BaseRow = { id: `batch_${crypto.randomUUID()}`, tenant_id: tenantId, created_at: now, updated_at: now, actor_id: actorId, action: command.undo ? 'content.bulk.undo' : 'content.bulk.update', entity: table, entity_id: null, ip: null, diff: { role, source: 'admin', ids: changes.map(c => c.id), fields: [...new Set(changes.flatMap(c => Object.keys(c.patch)))] } };
 copy.audit_log = [...(copy.audit_log ?? []), audit];
 return { db: copy, result: { changes: reverse } };
}
