import type { BookingRow, ClassSessionRow } from '../../data/schema';
import type { VoucherBookingRow, VoucherRow } from '../../data/vouchers';

/** Display eligibility mirrors the local transaction; the transaction remains authoritative. */
export function remainingVoucherParticipants(voucher: VoucherRow, bookings: VoucherBookingRow[]): number {
  const used = voucher.capScope === 'lifetime'
    ? bookings.filter(booking => booking.tenant_id === voucher.tenant_id && booking.voucherId === voucher.id && booking.status !== 'cancelled')
      .reduce((count, booking) => count + booking.participants.length, 0)
    : 0;
  return Math.max(0, voucher.participantCap - used);
}

export function availableWalkupSessions(
  voucher: VoucherRow | undefined,
  sessions: ClassSessionRow[],
  regularBookings: BookingRow[],
  voucherBookings: VoucherBookingRow[],
  partySize: number,
  now = Date.now(),
): ClassSessionRow[] {
  if (!voucher?.claimedBy || partySize < 1 || partySize > remainingVoucherParticipants(voucher, voucherBookings)) return [];
  return sessions.filter(session => {
    if (session.tenant_id !== voucher.tenant_id || session.status !== 'scheduled' || !(Date.parse(session.starts_at) > now)
      || (voucher.expiresAt && !(Date.parse(session.starts_at) < Date.parse(voucher.expiresAt)))) return false;
    const regular = regularBookings.filter(booking => booking.tenant_id === voucher.tenant_id && booking.session_id === session.id && !['cancelled', 'late_cancel'].includes(booking.status));
    const promotional = voucherBookings.filter(booking => booking.tenant_id === voucher.tenant_id && booking.sessionId === session.id && booking.status !== 'cancelled');
    if (regular.some(booking => booking.user_id === voucher.claimedBy)
      || promotional.some(booking => booking.participants.some(participant => participant.userId === voucher.claimedBy))) return false;
    const occupied = regular.length + promotional.reduce((count, booking) => count + booking.participants.length, 0);
    return occupied + partySize <= session.capacity;
  }).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}
