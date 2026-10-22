import type { Role } from '../auth/roles';
import { roleCan } from '../auth/permissions';
import { tenant } from '../tenant/tenant';
import type { BaseRow, BookingRow, ClassSessionRow } from './schema';
import type { DataProvider } from './types';

export type AttendanceStatus = 'booked' | 'checked_in' | 'no_show';
export interface ReceptionAttendance {
  actorId: string; role: Role; bookingId: string; sessionId: string; userId: string;
  requestId: string; status: AttendanceStatus;
  before: Pick<BookingRow, 'status' | 'checked_in_at' | 'updated_at'>;
}
interface Outcome { bookingId: string; status: AttendanceStatus; checkedInAt: string | null }
/** Preserve the current admission restriction. This is not an approved attendance-correction cutoff. */
export function receptionUndoEligible(session: ClassSessionRow, now = Date.now()): boolean {
  return session.status === 'scheduled' && Number.isFinite(Date.parse(session.starts_at)) && Date.parse(session.starts_at) > now;
}

/** Fictional reception command only. Production requires an authenticated atomic RPC. */
export async function setReceptionAttendance(data: DataProvider, input: ReceptionAttendance, control: { now?: () => number; isCurrent?: () => boolean; failAfterWrites?: number } = {}): Promise<Outcome> {
  if (!data.atomic) throw new Error('disconnected');
  const guard = () => { if (control.isCurrent && !control.isCurrent()) throw new Error('attendance_context'); };
  guard();
  if (!roleCan(input.role, 'checkin.write') || !input.requestId || input.requestId.length > 160) throw new Error('attendance_forbidden');
  const fingerprint = JSON.stringify(input), auditId = `reception_attendance_${input.requestId}`;
  return data.atomic(async tx => {
    guard();
    const actor = await tx.get<BaseRow>('users', input.actorId); guard();
    if (!actor || actor.tenant_id !== tenant.id) throw new Error('attendance_forbidden');
    const prior = await tx.get<BaseRow>('audit_log', auditId); guard();
    if (prior) {
      const diff = prior.diff as { fingerprint?: string; outcome?: Outcome } | null;
      if (prior.tenant_id !== tenant.id || prior.actor_id !== input.actorId || diff?.fingerprint !== fingerprint || !diff.outcome) throw new Error('attendance_conflict');
      return diff.outcome;
    }
    const booking = await tx.get<BookingRow>('bookings', input.bookingId); guard();
    const session = await tx.get<ClassSessionRow>('class_sessions', input.sessionId); guard();
    if (!booking || !session || booking.tenant_id !== tenant.id || session.tenant_id !== tenant.id || booking.session_id !== session.id || booking.user_id !== input.userId) throw new Error('attendance_conflict');
    if (booking.status !== input.before.status || booking.checked_in_at !== input.before.checked_in_at || booking.updated_at !== input.before.updated_at) throw new Error('attendance_conflict');
    const allowed = booking.status === 'booked' && ['checked_in', 'no_show'].includes(input.status)
      || booking.status === 'checked_in' && input.status === 'booked'
      || booking.status === 'no_show' && input.status === 'checked_in';
    if (!allowed) throw new Error('attendance_conflict');
    const now = (control.now ?? Date.now)();
    if (!Number.isFinite(now)) throw new Error('attendance_conflict');
    if (input.status === 'booked' && !receptionUndoEligible(session, now)) throw new Error('attendance_undo_policy_pending');
    const checkedInAt = input.status === 'checked_in' ? new Date(now).toISOString() : null;
    await tx.update('bookings', booking.id, { status: input.status, checked_in_at: checkedInAt }); guard();
    const outcome: Outcome = { bookingId: booking.id, status: input.status, checkedInAt };
    await tx.insert('audit_log', { id: auditId, actor_id: input.actorId, action: input.status === 'checked_in' ? 'booking.checkin' : input.status === 'no_show' ? 'booking.no_show' : 'booking.undo', entity: 'bookings', entity_id: booking.id, ip: null, diff: { role: input.role, source: 'front_desk', before: booking.status, after: input.status, session_id: session.id, user_id: booking.user_id, fingerprint, outcome } }); guard();
    return outcome;
  }, { failAfterWrites: control.failAfterWrites });
}
