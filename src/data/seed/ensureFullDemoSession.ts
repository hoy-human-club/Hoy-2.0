import type { BaseRow, BookingRow, ClassLedgerRow, ClassSessionRow, ModalityRow, UserRow } from '../schema';
import { voucherSeats } from '../vouchers';
import { usesMats } from '../mats';
import { tenant } from '../../tenant/tenant';
import { dateKey } from '../../i18n/format';

type DemoDb = Record<string, BaseRow[]>;
const active = (booking: BookingRow) => booking.status === 'booked' || booking.status === 'checked_in';
const generatedSession = (session: ClassSessionRow) => /^ses_\d{4}-\d{2}-\d{2}_\d+$/.test(session.id) || session.id.startsWith('demo_tpl_fixed_');

/** Demo fixtures only. Repair a clock-expired full-class sample without reseeding or changing existing bookings. */
export function ensureFullDemoSession(db: DemoDb, now: number): boolean {
  const sessions = db.class_sessions as ClassSessionRow[];
  const bookings = db.bookings as BookingRow[];
  const mine = new Set(bookings.filter(b => b.user_id === 'usr_cust' && active(b)).map(b => b.session_id));
  const upcoming = sessions.filter(s => generatedSession(s) && s.status === 'scheduled' && Number.isSafeInteger(s.capacity) && s.capacity > 0 && new Date(s.starts_at).getTime() > now && !mine.has(s.id));
  if (upcoming.some(s => s.booked_count >= s.capacity)) return false;

  const customers = (db.users as UserRow[]).filter(u => /^usr_c\d{2}$/.test(u.id) && u.email.endsWith('@demo.hoyos.test') && u.status === 'active' && db.user_roles.some(r => r.user_id === u.id && r.role === 'customer')).map(u => u.id);
  const ledger = db.class_ledger as ClassLedgerRow[];
  const starts = new Map(sessions.map(s => [s.id, s.starts_at]));
  const today = dateKey(new Date(now));
  upcoming.sort((a, b) => Number(b.starts_at.slice(0, 10) === today) - Number(a.starts_at.slice(0, 10) === today) || (a.starts_at.slice(0, 10) === today ? b.booked_count - a.booked_count : 0) || a.starts_at.localeCompare(b.starts_at));
  const stamp = new Date(now).toISOString();
  for (const session of upcoming) {
    // A local capacity edit must not make synthetic mat allocation exceed the physical studio limit.
    const modality = (db.modalities as ModalityRow[]).find(m => m.id === session.modality_id);
    if (usesMats(modality) && session.capacity > tenant.studio.mats) continue;
    // Leave participant/mat allocations from voucher test bookings entirely untouched.
    if (voucherSeats(db, session.id) > 0) continue;
    // A previous cancellation remains a decision; do not silently rebook that person.
    const existingUsers = new Set(bookings.filter(b => b.session_id === session.id).map(b => b.user_id));
    const hasEarlier = (uid: string) => bookings.some(b => b.user_id === uid && active(b) && (starts.get(b.session_id) ?? '') < session.starts_at);
    const fillers = customers.filter(uid => !existingUsers.has(uid) && !bookings.some(b => b.id === `bk_full_${session.id}_${uid}`)).sort((a, b) => Number(hasEarlier(b)) - Number(hasEarlier(a)));
    const occupied = bookings.filter(b => b.session_id === session.id && !['cancelled', 'late_cancel'].includes(b.status)).length + voucherSeats(db, session.id);
    if (occupied + fillers.length < session.capacity) continue;
    let count = occupied;
    for (const uid of fillers) {
      if (count >= session.capacity) break;
      bookings.push({ id: `bk_full_${session.id}_${uid}`, tenant_id: session.tenant_id, created_at: stamp, updated_at: stamp, user_id: uid, session_id: session.id, status: 'booked', paid_with: ledger.some(c => c.user_id === uid && c.reason === 'purchase' && c.delta > 1) ? 'package' : 'single', ledger_id: null, checked_in_at: null, cancelled_at: null, rated: false });
      count++;
    }
    session.booked_count = count;
    const waiter = customers.find(uid => !existingUsers.has(uid) && !bookings.some(b => b.session_id === session.id && active(b) && b.user_id === uid));
    if (waiter && !db.waitlist.some(w => w.session_id === session.id)) db.waitlist.push({ id: `wl_full_${session.id}_${waiter}`, tenant_id: session.tenant_id, created_at: stamp, updated_at: stamp, user_id: waiter, session_id: session.id, position: 1, status: 'waiting', offered_at: null, claim_until: null });
    return true;
  }
  return false;
}
