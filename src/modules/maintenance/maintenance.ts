/** OT-02 future demo contract. No real operations, alerts, procurement or safety signoff. */
import type { DataProvider } from '../../data/types';
import type { BaseRow, MaintenanceRecordRow, RoomRow, UserRow } from '../../data/schema';
import { roleCan } from '../../auth/permissions';
import type { Role } from '../../auth/roles';
import { tenant } from '../../tenant/tenant';
import type { Bi } from '../../specs/types';

export type MaintenanceKind = MaintenanceRecordRow['kind'];
export const MAINTENANCE_KINDS: MaintenanceKind[] = ['checklist', 'incident', 'supply', 'equipment'];
export const CHECK_ITEMS: { key: string; label: Bi }[] = [
  { key: 'floor', label: { es: 'Revisión ficticia del piso seco', en: 'Fictional dry-floor check' } },
  { key: 'props', label: { es: 'Revisión ficticia de mats y accesorios', en: 'Fictional mats and props check' } },
  { key: 'bathroom', label: { es: 'Revisión ficticia de baños e insumos', en: 'Fictional bathrooms and supplies check' } },
  { key: 'exits', label: { es: 'Revisión ficticia de salidas despejadas', en: 'Fictional clear-exits check' } },
];
export interface ChecklistPayload extends Record<string, unknown> { day: string; phase: 'opening'|'between'|'closing'|'weekly'; checked: string[] }
export interface IncidentPayload extends Record<string, unknown> { observed_on: string; description: string; state: 'draft'|'reviewed' }
export interface SupplyPayload extends Record<string, unknown> { quantity: number; minimum: number|null; note: string }
export interface EquipmentPayload extends Record<string, unknown> { inspected_on: string; condition: 'unreviewed'|'demo_ok'|'demo_attention'; note: string }
export type MaintenancePayload = ChecklistPayload | IncidentPayload | SupplyPayload | EquipmentPayload;
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) === value;
export function validateMaintenance(kind: MaintenanceKind, payload: Record<string, unknown>): void {
  if (!MAINTENANCE_KINDS.includes(kind)) throw new Error('maintenance_kind');
  if (kind === 'checklist' && (!validDate(payload.day) || !['opening','between','closing','weekly'].includes(String(payload.phase)) || !Array.isArray(payload.checked) || new Set(payload.checked).size !== payload.checked.length || payload.checked.some(key => !CHECK_ITEMS.some(item => item.key === key)))) throw new Error('maintenance_validation');
  if (kind === 'incident' && (!validDate(payload.observed_on) || typeof payload.description !== 'string' || payload.description.trim().length < 10 || payload.description.length > 2000 || !['draft','reviewed'].includes(String(payload.state)))) throw new Error('maintenance_validation');
  if (kind === 'supply' && (!Number.isSafeInteger(payload.quantity) || Number(payload.quantity) < 0 || (payload.minimum !== null && (!Number.isSafeInteger(payload.minimum) || Number(payload.minimum) < 0)) || typeof payload.note !== 'string' || payload.note.trim().length < 3 || payload.note.length > 500)) throw new Error('maintenance_validation');
  if (kind === 'equipment' && (!validDate(payload.inspected_on) || !['unreviewed','demo_ok','demo_attention'].includes(String(payload.condition)) || typeof payload.note !== 'string' || payload.note.trim().length < 3 || payload.note.length > 500)) throw new Error('maintenance_validation');
}
export type MaintenanceInput = { requestId: string } & ({ type: 'examples'; day: string } | { type: 'create'; id: string; kind: MaintenanceKind; roomId: string|null; label: Bi; payload: Record<string, unknown> } | { type: 'save'; id: string; expectedRevision: number; payload: Record<string, unknown> });
export function emptyMaintenancePayload(kind: MaintenanceKind, day: string): Record<string, unknown> {
  if (kind === 'checklist') return { day, phase: 'opening', checked: [] };
  if (kind === 'incident') return { observed_on: day, description: '', state: 'draft' };
  if (kind === 'supply') return { quantity: 0, minimum: null, note: '' };
  return { inspected_on: day, condition: 'unreviewed', note: '' };
}
export function validateMaintenanceLabel(label: Bi): void {
  if (!label || ['es','en'].some(lang => typeof label[lang as keyof Bi] !== 'string' || label[lang as keyof Bi].trim().length < 3 || label[lang as keyof Bi].length > 120)) throw new Error('maintenance_validation');
}
export type MaintenanceCommand = { actorId: string; role: Role } & MaintenanceInput;
interface Receipt extends BaseRow { diff: { fingerprint: string; result: MaintenanceRecordRow[] } }
/** Authorizes only existing frontend maintenance.write previews; server authorization is not implemented. */
export async function runMaintenance(data: DataProvider, command: MaintenanceCommand): Promise<MaintenanceRecordRow[]> {
  if (data.name !== 'mock') throw new Error('maintenance_disconnected');
  if (!roleCan(command.role, 'maintenance.write')) throw new Error('maintenance_denied');
  if (!data.atomic) throw new Error('maintenance_atomic_required');
  if (!command.requestId || command.requestId.length > 160) throw new Error('maintenance_request');
  const actor = await data.get<UserRow>('users', command.actorId);
  if (!actor || actor.tenant_id !== tenant.id) throw new Error('maintenance_scope');
  const request = structuredClone(command);
  const fingerprint = JSON.stringify(request);
  return data.atomic(async tx => {
    const receiptId = `maintenance_request_${tenant.id}_${request.actorId}_${request.requestId}`;
    const prior = await tx.get<Receipt>('audit_log', receiptId);
    if (prior) {
      if (prior.tenant_id !== tenant.id || prior.diff.fingerprint !== fingerprint) throw new Error('maintenance_request_conflict');
      return prior.diff.result;
    }
    let result: MaintenanceRecordRow[];
    if (request.type === 'examples') {
      if (!validDate(request.day)) throw new Error('maintenance_validation');
      const rooms = await tx.list<RoomRow>('rooms');
      const roomId = rooms.find(room => room.tenant_id === tenant.id)?.id ?? null;
      const samples: { kind: MaintenanceKind; label: Bi; payload: Record<string,unknown> }[] = [
        { kind: 'checklist', label: { es: 'DEMO · checklist de sala', en: 'DEMO · room checklist' }, payload: { day: request.day, phase: 'opening', checked: [] } },
        { kind: 'incident', label: { es: 'DEMO · daño ficticio en un accesorio', en: 'DEMO · fictional prop damage' }, payload: { observed_on: request.day, description: 'DEMO: fictional prop damage for interface testing only.', state: 'draft' } },
        { kind: 'supply', label: { es: 'DEMO · insumo ficticio', en: 'DEMO · fictional supply' }, payload: { quantity: 2, minimum: 3, note: 'DEMO: fictional quantities; no purchase requested.' } },
        { kind: 'equipment', label: { es: 'DEMO · equipo ficticio', en: 'DEMO · fictional equipment' }, payload: { inspected_on: request.day, condition: 'unreviewed', note: 'DEMO: fictional equipment; no operational inspection.' } },
      ];
      result = [];
      for (const sample of samples) {
        const id = `demo_maintenance_${sample.kind}`;
        const current = await tx.get<MaintenanceRecordRow>('maintenance_records', id);
        if (current) { if (current.tenant_id !== tenant.id) throw new Error('maintenance_scope'); result.push(current); continue; }
        result.push(await tx.insert<MaintenanceRecordRow>('maintenance_records', { id, tenant_id: tenant.id, room_id: roomId, ...sample, revision: 0, created_by: request.actorId }));
      }
    } else if (request.type === 'create') {
      if (!request.id || request.id.length > 160) throw new Error('maintenance_validation');
      validateMaintenance(request.kind, request.payload); validateMaintenanceLabel(request.label);
      if (request.roomId) { const room = await tx.get<RoomRow>('rooms', request.roomId); if (!room || room.tenant_id !== tenant.id) throw new Error('maintenance_scope'); }
      if (await tx.get('maintenance_records', request.id)) throw new Error('maintenance_record_exists');
      result = [await tx.insert<MaintenanceRecordRow>('maintenance_records', { id: request.id, kind: request.kind, room_id: request.roomId, label: { es: request.label.es.trim(), en: request.label.en.trim() }, payload: request.payload, revision: 0, created_by: request.actorId })];
    } else {
      const row = await tx.get<MaintenanceRecordRow>('maintenance_records', request.id);
      if (!row || row.tenant_id !== tenant.id) throw new Error('maintenance_scope');
      if (row.revision !== request.expectedRevision) throw new Error('maintenance_revision_conflict');
      validateMaintenance(row.kind, request.payload);
      result = [await tx.update<MaintenanceRecordRow>('maintenance_records', row.id, { payload: request.payload, revision: row.revision + 1 })];
    }
    await tx.insert('audit_log', { id: receiptId, actor_id: request.actorId, action: 'maintenance.demo', entity: 'maintenance_records', entity_id: request.type === 'examples' ? 'examples' : request.id, ip: null, diff: { fingerprint, result, role: request.role, source: 'fictional-maintenance' } });
    return result;
  });
}
