import type { BaseRow, BookingRow, ClassSessionRow, TeacherRow } from '../schema';

type Template = BaseRow & { active: boolean; title: string; modality_id: string; teacher_id: string; weekday: number; start_time: string; duration_min: number; capacity: number; room_id: string; level: string };
type Db = Record<string, BaseRow[]>;
/** Upgrade untouched legacy demo timetables only. Never discard bookings or staff-created rows.
 * Old booked sessions remain historical/booking exceptions; new templates use distinct stable IDs.
 */
export function upgradeTimetable(db: Db, fresh: Db, now = new Date()): boolean {
  const templates = db.class_templates as Template[];
  if (templates.some(t => t.id.startsWith('tpl_fixed_'))) return false;
  const legacy = templates.filter(t => /^tpl_\d+$/.test(t.id));
  if (legacy.length !== 24 || templates.some(t => !/^tpl_\d+$/.test(t.id))) return false;
  // A renamed or rescheduled template is a user edit. Leave that local timetable alone.
  const times: Record<number, string[]> = { 1: ['06:30','08:00','17:30','19:00'], 2: ['06:30','08:00','17:30','19:00'], 3: ['06:30','08:00','17:30','19:00'], 4: ['06:30','08:00','17:30','19:00'], 5: ['06:30','08:00','17:30','19:00'], 6: ['08:00','09:15','10:30','11:45'] };
  const modalities = db.modalities as (BaseRow & { name_es: string })[];
  const classes = ['alineacion','pulso','fuego','centro','ligereza','solido','hibrido','pulso','alineacion','hibrido','fuego','ligereza','solido','pulso','hibrido','centro','ligereza','alineacion','fuego','solido','pulso','hibrido','fuego','centro'];
  const teacherFor: Record<string, string> = { alineacion:'maria_camila', pulso:'carolina', fuego:'sara_e', centro:'tatiana', ligereza:'sara_c', solido:'andre', hibrido:'raghu' };
  if (legacy.some(t => {
    const index = Number(t.id.slice(4)), modality = classes[index];
    return !modality || t.weekday !== Math.floor(index / 4) + 1 || t.start_time !== times[t.weekday]?.[index % 4]
      || t.modality_id !== `mod_${modality}` || t.teacher_id !== `tea_${teacherFor[modality]}` || !t.active
      || t.title !== modalities.find(m => m.id === t.modality_id)?.name_es || t.capacity !== 16
      || t.duration_min !== 60 || t.room_id !== 'room_main' || t.level !== 'all';
  })) return false;
  for (const template of legacy) template.active = false;
  templates.push(...fresh.class_templates as Template[]);
  const protectedSessions = new Set((db.bookings as BookingRow[]).map(b => b.session_id));
  for (const row of db.voucher_bookings ?? []) {
    const booking = row as BaseRow & { session_id?: string };
    if (booking.session_id) protectedSessions.add(booking.session_id);
  }
  const legacyIds = new Set(legacy.map(t => t.id));
  db.class_sessions = (db.class_sessions as ClassSessionRow[]).filter(s =>
    !legacyIds.has(s.template_id ?? '') || new Date(s.starts_at) <= now || protectedSessions.has(s.id) || s.booked_count > 0 || s.status !== 'scheduled');
  // Retain existing biographies, pay settings and any staff edits. Add public profiles only when absent.
  for (const teacher of fresh.teachers as TeacherRow[]) {
    if (!db.teachers.some(t => t.id === teacher.id)) db.teachers.push(teacher);
  }
  return true;
}
