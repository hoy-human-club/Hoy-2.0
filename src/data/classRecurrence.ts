import { tenant } from '../tenant/tenant';
import type { BaseRow, ClassSessionRow } from './schema';
import type { Role } from '../auth/roles';
import { dateKey, addDays, fromDateKey } from '../i18n/format';
export interface Occurrence { starts_at: string; ends_at: string }
/** Bounded browser-local demo preview. Production scheduling must use the studio timezone. */
export function previewRecurrence(template: BaseRow, now = new Date(), horizonDays = 42): Occurrence[] {
 const out: Occurrence[] = [];
 const duration = Number(template.duration_min), weekday = Number(template.weekday), time = String(template.start_time);
 if (!Number.isInteger(duration) || duration < 1 || duration > 1440 || !Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return out;
 const validDate = (value: unknown) => value == null || value === '' || /^\d{4}-\d{2}-\d{2}$/.test(String(value)) && dateKey(fromDateKey(String(value))) === value;
 if (!validDate(template.start_date) || !validDate(template.end_date) || template.start_date && template.end_date && String(template.start_date) > String(template.end_date)) return out;
 for (let i=0; i<=horizonDays; i++) {
  const day = addDays(now,i), key = dateKey(day);
  if (day.getDay() !== weekday || template.start_date && key < String(template.start_date) || template.end_date && key > String(template.end_date)) continue;
  const [h,m] = time.split(':').map(Number); day.setHours(h,m,0,0);
  if (day <= now) continue;
  out.push({ starts_at:day.toISOString(), ends_at:new Date(day.getTime()+duration*60000).toISOString() });
 }
 return out;
}
export interface GenerateRecurrence { template: BaseRow; occurrences: Occurrence[]; role: Role; actorId: string }
export function generateRecurrence(db: Record<string,BaseRow[]>, command: GenerateRecurrence, tenantId: string, now = new Date()): { db:Record<string,BaseRow[]>; created:number; skipped:number } {
 if (!['admin','super_admin','coordinator'].includes(command.role)) throw new Error('recurrence_forbidden');
 const template = db.class_templates.find(t => t.id === command.template.id && t.tenant_id === tenantId);
 if (!template || JSON.stringify(template) !== JSON.stringify(command.template)) throw new Error('recurrence_conflict');
 if (!template.active) throw new Error('recurrence_unpublished');
 const expected = previewRecurrence(template,now);
 if (!command.occurrences.length || JSON.stringify(command.occurrences) !== JSON.stringify(expected)) throw new Error('recurrence_preview_changed');
 const room = db.rooms.find(r=>r.id===template.room_id && r.tenant_id===tenantId);
 if (!room || !Number.isSafeInteger(template.capacity) || Number(template.capacity)<1 || Number(template.capacity)>Math.min(Number(room.capacity), room.id === 'room_main' ? tenant.studio.mats : Infinity)) throw new Error('recurrence_capacity');
 for (const [field,table] of [['teacher_id','teachers'],['modality_id','modalities']]) if (!db[table].some(r=>r.id===template[field] && r.tenant_id===tenantId && r.active !== false)) throw new Error('recurrence_reference');
 const copy = structuredClone(db); let created=0, skipped=0;
 for (const occurrence of expected) {
  if (copy.class_sessions.some(s=>s.template_id===template.id && s.starts_at===occurrence.starts_at)) { skipped++; continue; }
  if (copy.class_sessions.some(s=>s.tenant_id===tenantId && s.status==='scheduled' && (s.room_id===template.room_id || s.teacher_id===template.teacher_id) && String(s.starts_at)<occurrence.ends_at && String(s.ends_at)>occurrence.starts_at)) throw new Error('recurrence_overlap');
  const session:ClassSessionRow = {id:`session_${crypto.randomUUID()}`,tenant_id:tenantId,created_at:now.toISOString(),updated_at:now.toISOString(),template_id:template.id,title:String(template.title),modality_id:String(template.modality_id),teacher_id:String(template.teacher_id),room_id:String(template.room_id),...occurrence,capacity:Number(template.capacity),booked_count:0,level:String(template.level),status:'scheduled',cancel_reason:null};
  copy.class_sessions.push(session); created++;
 }
 copy.audit_log.push({id:`recurrence_${crypto.randomUUID()}`,tenant_id:tenantId,created_at:now.toISOString(),updated_at:now.toISOString(),actor_id:command.actorId,action:'schedule.generate',entity:'class_templates',entity_id:template.id,ip:null,diff:{role:command.role,source:'admin',created,skipped}});
 return {db:copy,created,skipped};
}
