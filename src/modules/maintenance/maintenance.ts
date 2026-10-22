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
export interface MaintenanceControl {signal?:AbortSignal;currentActor?:()=>{actorId:string;role:Role};failAfterWrites?:number}
interface Metadata {id:string;revision:number;kind:MaintenanceKind;digest:string}
interface Receipt extends BaseRow {diff:{version?:2;fingerprint:string;result:Metadata[]|MaintenanceRecordRow[];role:Role;source:string}}
function check(data:DataProvider,command:Pick<MaintenanceCommand,'actorId'|'role'>,control:MaintenanceControl={}){
 if(data.name!=='mock')throw Error('maintenance_disconnected');
 if(!roleCan(command.role,'maintenance.write'))throw Error('maintenance_denied');
 if(!data.atomic)throw Error('maintenance_atomic_required');
 const current=control.currentActor?.()??command;
 if(current.actorId!==command.actorId||current.role!==command.role)throw Error('maintenance_context');
 if(control.signal?.aborted)throw Error('maintenance_cancelled');
}
async function actor(data:DataProvider,command:Pick<MaintenanceCommand,'actorId'|'role'>,control:MaintenanceControl={}){
 check(data,command,control);const rows=await data.list<UserRow>('users',{where:{tenant_id:tenant.id,id:command.actorId}});check(data,command,control);
 if(rows.length!==1||rows[0].tenant_id!==tenant.id||rows[0].id!==command.actorId)throw Error('maintenance_scope');
}
async function scopedRows<T extends BaseRow>(data:DataProvider,table:string,control:MaintenanceControl,command:Pick<MaintenanceCommand,'actorId'|'role'>){
 check(data,command,control);const rows=await data.list<T>(table,{where:{tenant_id:tenant.id}});check(data,command,control);
 if(rows.some(r=>r.tenant_id!==tenant.id)||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('maintenance_scope');return rows;
}
function shape(row:MaintenanceRecordRow){
 if(!row||row.tenant_id!==tenant.id||typeof row.id!=='string'||!row.id||!Number.isSafeInteger(row.revision)||row.revision<0||typeof row.created_by!=='string'||!row.payload||typeof row.payload!=='object'||Array.isArray(row.payload)||row.room_id!==null&&typeof row.room_id!=='string')throw Error('maintenance_scope');
 validateMaintenanceLabel(row.label);validateMaintenance(row.kind,row.payload);
}
async function target(data:DataProvider,id:string,command:Pick<MaintenanceCommand,'actorId'|'role'>,control:MaintenanceControl,required=true){
 const rows=await scopedRows<MaintenanceRecordRow>(data,'maintenance_records',control,command),matches=rows.filter(r=>r.id===id);
 if(!matches.length){if(required)throw Error('maintenance_scope');return null;}
 shape(matches[0]);return matches[0];
}
async function requireRoom(data:DataProvider,id:string,command:Pick<MaintenanceCommand,'actorId'|'role'>,control:MaintenanceControl){const rooms=await scopedRows<RoomRow>(data,'rooms',control,command);if(!rooms.some(r=>r.id===id))throw Error('maintenance_scope');}
export async function readMaintenanceWorkspace(data:DataProvider,identity:{actorId:string;role:Role},suppliedControl:MaintenanceControl={}){
 const control:MaintenanceControl={signal:suppliedControl.signal,currentActor:suppliedControl.currentActor,failAfterWrites:suppliedControl.failAfterWrites};
 const command={...identity};await actor(data,command,control);const records=await scopedRows<MaintenanceRecordRow>(data,'maintenance_records',control,command);records.forEach(shape);const rooms=await scopedRows<RoomRow>(data,'rooms',control,command);if(rooms.some(r=>typeof r.id!=='string'||typeof r.name!=='string'))throw Error('maintenance_scope');await actor(data,command,control);return {records,rooms};
}
async function digest(value:unknown){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
const rowDigest=(row:MaintenanceRecordRow)=>digest({kind:row.kind,roomId:row.room_id,label:row.label,payload:row.payload,revision:row.revision,createdBy:row.created_by});
async function acknowledge(data:DataProvider,metadata:Metadata[],request:MaintenanceCommand,control:MaintenanceControl){
 await actor(data,request,control);
 if(!Array.isArray(metadata)||!metadata.length||new Set(metadata.map(r=>r.id)).size!==metadata.length)throw Error('maintenance_request_conflict');
 const rows:MaintenanceRecordRow[]=[];
 for(const item of metadata){if(typeof item.id!=='string'||!Number.isSafeInteger(item.revision)||item.revision<0||!MAINTENANCE_KINDS.includes(item.kind))throw Error('maintenance_request_conflict');const row=(await target(data,item.id,request,control))!;if(row.revision!==item.revision||row.kind!==item.kind||typeof item.digest!=='string'||await rowDigest(row)!==item.digest)throw Error('maintenance_revision_conflict');rows.push(row);}
 if(request.type==='create'&&request.roomId)await requireRoom(data,request.roomId,request,control);
 await actor(data,request,control);check(data,request,control);return rows;
}
/** Fictional commands only. Snapshot before awaiting; no server/security or operational guarantee. */
export async function runMaintenance(data:DataProvider,command:MaintenanceCommand,suppliedControl:MaintenanceControl={}):Promise<MaintenanceRecordRow[]>{
 const control:MaintenanceControl={signal:suppliedControl.signal,currentActor:suppliedControl.currentActor,failAfterWrites:suppliedControl.failAfterWrites};
 const request=structuredClone(command);check(data,request,control);
 if(typeof request.requestId!=='string'||!request.requestId||request.requestId.length>160)throw Error('maintenance_request');
 if(!['examples','create','save'].includes(request.type))throw Error('maintenance_validation');
 if(request.type!=='examples'&&(typeof request.id!=='string'||!request.id||request.id.length>160)||request.type==='create'&&request.roomId!==null&&typeof request.roomId!=='string'||request.type==='save'&&(!Number.isSafeInteger(request.expectedRevision)||request.expectedRevision<0))throw Error('maintenance_validation');
 await actor(data,request,control);
 const fingerprint=await digest(request),nonce=await digest({tenant:tenant.id,actor:request.actorId,role:request.role,requestId:request.requestId});check(data,request,control);
 const metadata=await data.atomic!(async tx=>{
    check(data,request,control);await actor(tx,request,control);
    const receiptId=`maintenance_request_v2_${nonce}`;
    const prior=await tx.get<Receipt>('audit_log',receiptId)??await tx.get<Receipt>('audit_log',`maintenance_request_${tenant.id}_${request.actorId}_${request.requestId}`);check(data,request,control);
    if(prior){
      if(!prior.diff||!Array.isArray(prior.diff.result)||prior.tenant_id!==tenant.id||prior.actor_id!==request.actorId||prior.diff.role!==request.role||prior.diff.source!=='fictional-maintenance'||(prior.diff.version===2?prior.diff.fingerprint!==fingerprint:prior.diff.fingerprint!==JSON.stringify(request)))throw Error('maintenance_request_conflict');
      const items=prior.diff.version===2?prior.diff.result as Metadata[]:await Promise.all((prior.diff.result as MaintenanceRecordRow[]).map(async r=>({id:r.id,revision:r.revision,kind:r.kind,digest:await rowDigest(r)})));await acknowledge(tx,items,request,control);return items;
    }
    let result: MaintenanceRecordRow[];
    if (request.type === 'examples') {
      if (!validDate(request.day)) throw new Error('maintenance_validation');
      const rooms = await scopedRows<RoomRow>(tx,'rooms',control,request);
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
        const existing=await tx.get<MaintenanceRecordRow>('maintenance_records',id);check(data,request,control);if(existing&&existing.tenant_id!==tenant.id)throw Error('maintenance_scope');
        const current = await target(tx,id,request,control,false);
        if (current) { if (current.tenant_id !== tenant.id) throw new Error('maintenance_scope'); result.push(current); continue; }
        check(data,request,control);result.push(await tx.insert<MaintenanceRecordRow>('maintenance_records', { id, tenant_id: tenant.id, room_id: roomId, ...sample, revision: 0, created_by: request.actorId }));
      }
    } else if (request.type === 'create') {
      if (!request.id || request.id.length > 160) throw new Error('maintenance_validation');
      validateMaintenance(request.kind, request.payload); validateMaintenanceLabel(request.label);
      if (request.roomId) await requireRoom(tx,request.roomId,request,control);
      if (await tx.get('maintenance_records', request.id)) throw new Error('maintenance_record_exists');
      check(data,request,control);result = [await tx.insert<MaintenanceRecordRow>('maintenance_records', { id: request.id, kind: request.kind, room_id: request.roomId, label: { es: request.label.es.trim(), en: request.label.en.trim() }, payload: request.payload, revision: 0, created_by: request.actorId })];
    } else {
      const row = (await target(tx,request.id,request,control))!;
      if (row.revision !== request.expectedRevision) throw new Error('maintenance_revision_conflict');
      validateMaintenance(row.kind, request.payload);
      check(data,request,control);result = [await tx.update<MaintenanceRecordRow>('maintenance_records', row.id, { payload: request.payload, revision: row.revision + 1 })];
    }
    check(data,request,control);const items=await Promise.all(result.map(async r=>({id:r.id,revision:r.revision,kind:r.kind,digest:await rowDigest(r)})));check(data,request,control);
    await tx.insert('audit_log',{id:receiptId,actor_id:request.actorId,action:'maintenance.demo',entity:'maintenance_records',entity_id:request.type==='examples'?'examples':request.id,ip:null,diff:{version:2,fingerprint,result:items,role:request.role,source:'fictional-maintenance'}});
    check(data,request,control);await actor(tx,request,control);return items;
 },{failAfterWrites:control.failAfterWrites});
 // A failed fence after commit withholds acknowledgement; it cannot undo the committed record/audit.
 return acknowledge(data,metadata,request,control);
}
