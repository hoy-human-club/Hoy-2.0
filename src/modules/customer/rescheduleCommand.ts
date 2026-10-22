import { assertRescheduleAllowed } from './reschedule';
import type { DataProvider } from '../../data/types';
import type { BookingRow, ClassLedgerRow, ClassSessionRow, PaymentRow } from '../../data/schema';
import { approvedPackageRows, packageLots } from '../../data/packages';
import { dateKey, isSameDay, MS } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { policy } from './policy';

/** Preserve the class already spent, rather than spending a different live package. */
export function reschedulePurchase(rows: ClassLedgerRow[], booking: BookingRow): ClassLedgerRow | null {
  if (!booking.ledger_id && booking.paid_with !== 'package') return null;
  const lots = packageLots(rows).filter(lot => lot.debits.some(debit => debit.ledgerId === booking.ledger_id));
  if (lots.length !== 1) throw new Error('reschedule_entitlement_unresolved');
  return lots[0].purchase;
}

export function assertRescheduleValidity(purchase: ClassLedgerRow | null, startsAt: string): void {
  if (!purchase) return;
  const targetDay = dateKey(new Date(startsAt));
  if (purchase.expires_at && targetDay > purchase.expires_at) throw new Error('package_expired');
  if (purchase.frozen_from && purchase.frozen_until && purchase.frozen_from <= targetDay && targetDay <= purchase.frozen_until) throw new Error('package_frozen');
}

/** Execute inside the isolated mock atomic adapter. Production needs an authorized server command. */
export async function rescheduleBooking(data: DataProvider, input: { userId: string; role?: string; bookingId: string; fromSessionId: string; toSessionId: string; now?: number }): Promise<BookingRow> {
  const now = input.now ?? Date.now();
  const booking = await data.get<BookingRow>('bookings', input.bookingId);
  const original = await data.get<ClassSessionRow>('class_sessions', input.fromSessionId);
  if (!booking || booking.tenant_id !== tenant.id || booking.user_id !== input.userId || booking.status !== 'booked' || booking.session_id !== original?.id || original.tenant_id !== tenant.id || original.status !== 'scheduled') throw new Error('booking_unavailable');
  assertRescheduleAllowed(original.starts_at, now);
  const target = await data.get<ClassSessionRow>('class_sessions', input.toSessionId);
  if (!target || target.id === original.id || target.tenant_id !== tenant.id || target.status !== 'scheduled' || !Number.isFinite(Date.parse(target.starts_at)) || Date.parse(target.starts_at) <= now) throw new Error('session_unavailable');
  if (target.booked_count >= target.capacity) throw new Error('session_full');
  const bookings = await data.list<BookingRow>('bookings', { where: { user_id: input.userId } });
  const others = bookings.filter(b => b.id !== booking.id && b.status !== 'cancelled' && b.status !== 'late_cancel');
  if (others.some(b => b.session_id === target.id)) throw new Error('booking_exists');
  if (tenant.studio.perPersonPerDay === 1) {
    const sessions = await data.list<ClassSessionRow>('class_sessions');
    if (others.some(b => sessions.some(s => s.id === b.session_id && isSameDay(s.starts_at, target.starts_at)))) throw new Error('same_day_conflict');
  }
  {
    const rows = await data.list<ClassLedgerRow>('class_ledger', { where: { user_id: input.userId } });
    const payments = await data.list<PaymentRow>('payments', { where: { user_id: input.userId } });
    const purchase = reschedulePurchase(approvedPackageRows(rows, payments), booking);
    if (!purchase && !isSameDay(original.starts_at, target.starts_at)) throw new Error('reschedule_entitlement_unresolved');
    assertRescheduleValidity(purchase, target.starts_at);
  }
  assertRescheduleAllowed(original.starts_at, input.now ?? Date.now());
  const next = await data.insert<BookingRow>('bookings', { user_id: booking.user_id, session_id: target.id, status: 'booked', paid_with: booking.paid_with, ledger_id: booking.ledger_id, checked_in_at: null, cancelled_at: null, rated: false });
  await data.update('bookings', booking.id, { status: 'cancelled', cancelled_at: new Date(now).toISOString() });
  // MockProvider recalculates both occupancies from bookings; do not add or subtract capacity again.
  const waiting = await data.list('waitlist', { where: { session_id: original.id, status: 'waiting' }, orderBy: { column: 'position' } });
  if (waiting[0]) await data.update('waitlist', waiting[0].id, { status: 'offered', offered_at: new Date(now).toISOString(), claim_until: new Date(now + policy.claimWindowMinutes * MS.min).toISOString() });
  await data.insert('audit_log', { actor_id: input.userId, action: 'booking.reschedule', entity: 'bookings', entity_id: booking.id, ip: null,
    diff: { ...(input.role ? {role:input.role} : {}), source: 'app', from_session_id: original.id, to_session_id: target.id, replacement_booking_id: next.id } });
  return next;
}
