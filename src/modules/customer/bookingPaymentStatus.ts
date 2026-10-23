import type { BookingRow, ClassLedgerRow, PaymentRow } from '../../data/schema';
export type BookingPaymentStatus = 'pending' | 'confirmed' | 'released' | 'unknown';
/** Read existing exact debit → payment links only. Cancellation is not evidence of a refund or release. */
export function bookingPaymentStatus(booking: BookingRow, ledger: ClassLedgerRow[], payments: PaymentRow[]): BookingPaymentStatus {
  const debit = ledger.find(row => row.id === booking.ledger_id && row.user_id === booking.user_id && row.tenant_id === booking.tenant_id && row.delta === -1);
  if (!debit?.payment_id) return 'unknown';
  const payment = payments.find(row => row.id === debit.payment_id && row.user_id === booking.user_id && row.tenant_id === booking.tenant_id);
  if (payment?.status === 'approved') return 'confirmed';
  if (payment?.status === 'pending') return 'pending';
  if (payment?.status === 'released') return 'released';
  return 'unknown';
}
