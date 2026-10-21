import type { DataProvider } from './types';
import type { BookingRow, ClassLedgerRow, ClassSessionRow, PaymentRow } from './schema';
import { approvedPackageRows, packageState } from './packages';
import { dateKey, isSameDay } from '../i18n/format';
import { tenant } from '../tenant/tenant';

/** Called inside atomic() only. Fictional browser adapter; production requires an authorized RPC. */
export async function bookWithPackage(data: DataProvider, input: { userId: string; sessionId: string; status: 'booked' | 'checked_in'; now?: string }): Promise<BookingRow> {
  const now = input.now ?? new Date().toISOString();
  const session = await data.get<ClassSessionRow>('class_sessions', input.sessionId);
  if (!session || session.tenant_id !== tenant.id || session.status !== 'scheduled' || Date.parse(session.starts_at) <= Date.parse(now)) throw new Error('session_unavailable');
  const bookings = await data.list<BookingRow>('bookings', { where: { user_id: input.userId } });
  const active = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'late_cancel');
  if (active.some(b => b.session_id === session.id)) throw new Error('booking_exists');
  if (tenant.studio.perPersonPerDay === 1) {
    const sessions = await data.list<ClassSessionRow>('class_sessions');
    if (active.some(b => sessions.some(s => s.id === b.session_id && isSameDay(s.starts_at, session.starts_at)))) throw new Error('same_day_conflict');
  }
  // MockProvider's booking insertion also checks actual occupancy, voucher seats and duplicates.
  if (session.booked_count >= session.capacity) throw new Error('session_full');
  const rows = await data.list<ClassLedgerRow>('class_ledger', { where: { user_id: input.userId } });
  const payments = await data.list<PaymentRow>('payments', { where: { user_id: input.userId } });
  const available = approvedPackageRows(rows, payments);
  const state = packageState(available, dateKey(new Date(now)));
  if (state.balance < 1) throw new Error(state.frozen ? 'package_frozen' : 'insufficient_classes');
  // Check the class date too; a class cannot be booked beyond the purchased validity.
  const atClass = packageState(available, dateKey(new Date(session.starts_at)));
  if (atClass.balance < 1) throw new Error('package_expired');
  const purchase = available.filter(r => r.delta > 0 && (!r.expires_at || r.expires_at >= dateKey(new Date(session.starts_at)))).sort((a,b) => (a.expires_at ?? '9999').localeCompare(b.expires_at ?? '9999'))[0];
  const debit = await data.insert<ClassLedgerRow>('class_ledger', { user_id: input.userId, plan_id: purchase?.plan_id ?? null, payment_id: purchase?.payment_id ?? null, delta: -1, reason: 'booking', expires_at: null, frozen_from: null, frozen_until: null });
  return data.insert<BookingRow>('bookings', { user_id: input.userId, session_id: session.id, status: input.status, paid_with: 'package', ledger_id: debit.id, checked_in_at: input.status === 'checked_in' ? now : null, cancelled_at: null, rated: false });
}
