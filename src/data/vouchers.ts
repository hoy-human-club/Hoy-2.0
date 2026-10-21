import type { BaseRow, BookingRow, ClassSessionRow } from './schema';

/** Demo contract only. Production needs authenticated transactional RPCs, row locks,
 * secure claim tokens, server quotations and scoped RLS; this is not a live backend. */
export interface VoucherTerms {
  title: string; benefitKind: 'classes' | 'cop'; benefitTotal: number;
  participantCap: number; capScope: 'per_booking' | 'lifetime';
  creditUnit: 'per_person' | 'per_booking'; expiresAt: string | null;
  cancellationPolicy: 'restore' | 'forfeit'; recipientName?: string; recipientContact?: string; message?: string;
}
export interface VoucherRow extends BaseRow, VoucherTerms {
  recipientName: string; recipientContact: string; message: string;
  code: string; source: 'admin_invitation' | 'purchased_gift' | 'promotion_claim'; balance: number;
  campaignId?: string; shareId?: string; referrerId?: string;
  claimedBy: string | null; status: 'issued' | 'claimed' | 'revoked'; issuedBy: string;
}
/** Future bridge, intentionally not executable from the browser. A server must verify
 * a settled provider payment and uniquely associate it before issuing purchased_gift. */
export interface PurchasedGiftBridge {
  source: 'purchased_gift'; paymentId: string; providerReference: string;
  settledAmountCop: number; currency: 'COP'; terms: VoucherTerms;
  /** Stable server-side idempotency identity, unique per settled payment. */
  settlementKey: string;
}
export interface VoucherParticipant { name: string; email?: string; userId?: string }
export interface VoucherBookingRow extends BaseRow {
  voucherId: string; sessionId: string; participants: VoucherParticipant[]; cost: number;
  status: 'booked' | 'cancelled' | 'attended'; restored: boolean; mats: number[];
  confirmedAt?: string | null; confirmedBy?: string | null;
}
export interface VoucherEventRow extends BaseRow {
  voucherId: string; bookingId: string | null; kind: VoucherCommand['type']; actorId: string;
  requestId: string; fingerprint: string; payload: Record<string, unknown>;
}
type Actor = { requestId: string; actorId: string; role: string };
export type VoucherCommand = Actor & (
  | ({ type: 'issue' } & VoucherTerms)
  | { type: 'claim'; voucherId: string; userId: string }
  | { type: 'book'; voucherId: string; sessionId: string; participants: VoucherParticipant[]; contactConsent: boolean; costPerPerson?: number; verificationConfirmed?: boolean }
  | { type: 'cancel' | 'attendance'; bookingId: string }
  | { type: 'confirm_booking'; bookingId: string; verificationConfirmed: boolean }
  | { type: 'preview_delivery'; voucherId: string; channel: 'email' | 'whatsapp' }
  | { type: 'revoke'; voucherId: string }
);
export interface VoucherResult { voucher: VoucherRow; booking?: VoucherBookingRow; event: VoucherEventRow }
export type VoucherDb = Record<string, BaseRow[]>;
/** Reception accepts both kinds of code in one lookup, so they share a tenant namespace. */
export const redemptionCodeExists = (db: VoucherDb, tenantId: string, code: string): boolean =>
  ['vouchers', 'promotion_shares'].some(table => (db[table] ?? []).some(row =>
    row.tenant_id === tenantId && typeof row.code === 'string' && row.code.toUpperCase() === code.toUpperCase()));
const fail = (code: string): never => { throw new Error(code); };
const positive = (n: number) => Number.isSafeInteger(n) && n > 0;
// Display names are labels, never identities. Keep identifier namespaces distinct
// and consider every supplied identifier so adding a userId cannot hide a matching email.
const participantIdentities = (p: VoucherParticipant): string[] => [
  ...(p.userId ? [`user:${p.userId}`] : []),
  ...(p.email?.trim() ? [`email:${p.email.trim().toLowerCase()}`] : []),
];
const staff = (role: string) => ['super_admin', 'admin'].includes(role);
const reception = (role: string) => staff(role) || ['front_desk', 'coordinator'].includes(role);
export const voucherSeats = (db: VoucherDb, sessionId: string, tenantId?: string) => (db.voucher_bookings ?? []).filter(b => (!tenantId || b.tenant_id === tenantId) && b.sessionId === sessionId && b.status !== 'cancelled').reduce((n, b) => n + (b as VoucherBookingRow).participants.length, 0);

/** Pure copy-on-write transaction: errors never mutate the supplied database. */
export function executeVoucherCommand(database: VoucherDb, command: VoucherCommand, context: { tenantId: string; now?: string; id?: () => string; usesMats?: (session: ClassSessionRow) => boolean; matCapacity?: number }): { db: VoucherDb; result: VoucherResult } {
  const db = structuredClone(database), c = command;
  const now = context.now ?? new Date().toISOString();
  const id = context.id ?? (() => crypto.randomUUID());
  const base = (): BaseRow => ({ id: id(), tenant_id: context.tenantId, created_at: now, updated_at: now });
  const vouchers = (db.vouchers ??= []) as VoucherRow[], bookings = (db.voucher_bookings ??= []) as VoucherBookingRow[], events = (db.voucher_events ??= []) as VoucherEventRow[];
  if (!c.requestId?.trim() || !c.actorId?.trim() || !(db.users ?? []).some(u => u.id === c.actorId && u.tenant_id === context.tenantId)) fail('voucher_identity_required');
  const fingerprint = JSON.stringify(c);
  const prior = events.find(e => e.tenant_id === context.tenantId && e.requestId === c.requestId);
  if (prior) {
    if (prior.fingerprint !== fingerprint) fail('voucher_request_conflict');
    return { db, result: structuredClone(prior.payload.result as unknown as VoucherResult) };
  }
  let voucher: VoucherRow, booking: VoucherBookingRow | undefined;
  if (c.type === 'issue') {
    if (!staff(c.role)) fail('voucher_forbidden');
    if (!c.title?.trim() || !positive(c.benefitTotal) || !positive(c.participantCap) || !['classes', 'cop'].includes(c.benefitKind) || !['per_booking', 'lifetime'].includes(c.capScope) || !['per_person', 'per_booking'].includes(c.creditUnit) || !['restore', 'forfeit'].includes(c.cancellationPolicy)) fail('voucher_terms_required');
    if (c.expiresAt !== null && (!Number.isFinite(Date.parse(c.expiresAt)) || Date.parse(c.expiresAt) <= Date.parse(now))) fail('voucher_expiration_invalid');
    voucher = { ...base(), title: c.title.trim(), benefitKind: c.benefitKind, benefitTotal: c.benefitTotal, balance: c.benefitTotal, participantCap: c.participantCap, capScope: c.capScope, creditUnit: c.creditUnit, expiresAt: c.expiresAt, cancellationPolicy: c.cancellationPolicy, recipientName: c.recipientName ?? '', recipientContact: c.recipientContact ?? '', message: c.message ?? '', code: `DEMO-${id().slice(0, 8).toUpperCase()}`, source: 'admin_invitation', claimedBy: null, status: 'issued', issuedBy: c.actorId };
    if (redemptionCodeExists(db, context.tenantId, voucher.code)) fail('voucher_code_exists');
    vouchers.push(voucher);
  } else {
    if ('bookingId' in c) booking = bookings.find(b => b.id === c.bookingId && b.tenant_id === context.tenantId) ?? fail('voucher_booking_not_found');
    const voucherId = 'voucherId' in c ? c.voucherId : booking!.voucherId;
    voucher = vouchers.find(v => v.id === voucherId && v.tenant_id === context.tenantId) ?? fail('voucher_not_found');
    const owner = voucher.claimedBy === c.actorId;
    if (['preview_delivery', 'revoke'].includes(c.type) ? !staff(c.role) : ['attendance', 'confirm_booking'].includes(c.type) ? !reception(c.role) : c.type !== 'claim' && !(owner && c.role === 'customer') && !reception(c.role)) fail('voucher_forbidden');
    if (['claim', 'book'].includes(c.type) && (voucher.status === 'revoked' || (voucher.expiresAt !== null && (!Number.isFinite(Date.parse(voucher.expiresAt)) || Date.parse(voucher.expiresAt) <= Date.parse(now))))) fail('voucher_unavailable');
    if (c.type === 'claim') {
      if (c.userId !== c.actorId || c.role !== 'customer' || !(db.users ?? []).some(u => u.id === c.userId && u.tenant_id === context.tenantId)) fail('voucher_identity_required');
      if (voucher.claimedBy && voucher.claimedBy !== c.userId) fail('voucher_already_claimed');
      voucher.claimedBy = c.userId; voucher.status = 'claimed';
    }
    if (c.type === 'book') {
      if (!voucher.claimedBy || voucher.status !== 'claimed') fail('voucher_claim_required');
      if (['front_desk', 'coordinator'].includes(c.role) && c.verificationConfirmed !== true) fail('voucher_verification_required');
      if (c.contactConsent !== true || !c.participants.length || c.participants.some(p => !p.name?.trim() || (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)))) fail('voucher_guest_details_required');
      if (c.participants.some(p => p.userId && (p.userId !== voucher.claimedBy || !(db.users ?? []).some(u => u.id === p.userId && u.tenant_id === context.tenantId)))) fail('voucher_identity_required');
      const identities = c.participants.flatMap(participantIdentities);
      if (new Set(identities).size !== identities.length) fail('voucher_duplicate_guest');
      const priorSeats = voucher.capScope === 'lifetime' ? bookings.filter(b => b.tenant_id === context.tenantId && b.voucherId === voucher.id && b.status !== 'cancelled').reduce((n,b) => n+b.participants.length,0) : 0;
      if (priorSeats + c.participants.length > voucher.participantCap) fail('voucher_participant_cap');
      const session = (db.class_sessions as ClassSessionRow[]).find(s => s.id === c.sessionId && s.tenant_id === context.tenantId) ?? fail('session_unavailable');
      if (session.status !== 'scheduled' || !Number.isFinite(Date.parse(session.starts_at)) || Date.parse(session.starts_at) <= Date.parse(now) || (voucher.expiresAt && Date.parse(session.starts_at) >= Date.parse(voucher.expiresAt))) fail('session_unavailable');
      const regular = (db.bookings as BookingRow[]).filter(b => b.tenant_id === context.tenantId && b.session_id === session.id && b.status !== 'cancelled' && b.status !== 'late_cancel');
      if (regular.length + voucherSeats(db, session.id, context.tenantId) + c.participants.length > session.capacity) fail('session_full');
      if (bookings.some(b => b.tenant_id === context.tenantId && b.sessionId === session.id && b.status !== 'cancelled' && b.participants.some(p => participantIdentities(p).some(identity => identities.includes(identity)))) || c.participants.some(p => p.userId && regular.some(b => b.user_id === p.userId))) fail('booking_exists');
      if (voucher.benefitKind === 'cop' && !positive(c.costPerPerson ?? 0)) fail('voucher_price_required');
      const cost = voucher.benefitKind === 'cop' ? c.costPerPerson! * c.participants.length : voucher.creditUnit === 'per_person' ? c.participants.length : 1;
      if (!positive(cost) || cost > voucher.balance) fail('voucher_insufficient_balance');
      const mats: number[] = [];
      if (context.usesMats?.(session)) {
        const taken = new Set([...regular.map(b => b.mat_number), ...bookings.filter(b => b.tenant_id === context.tenantId && b.sessionId === session.id && b.status !== 'cancelled').flatMap(b => b.mats)]);
        for (let n = 1; n <= Math.min(session.capacity, context.matCapacity ?? session.capacity) && mats.length < c.participants.length; n++) if (!taken.has(n)) mats.push(n);
        if (mats.length !== c.participants.length) fail('session_full');
      }
      voucher.balance -= cost;
      booking = { ...base(), voucherId: voucher.id, sessionId: session.id, participants: structuredClone(c.participants), cost, status: 'booked', restored: false, mats, confirmedAt: null, confirmedBy: null };
      bookings.push(booking); session.booked_count = regular.length + voucherSeats(db, session.id, context.tenantId);
    }
    if (c.type === 'cancel') {
      if (booking!.status !== 'booked') fail('voucher_booking_final');
      const session = (db.class_sessions as ClassSessionRow[]).find(s => s.id === booking!.sessionId && s.tenant_id === context.tenantId) ?? fail('session_unavailable');
      if (!Number.isFinite(Date.parse(session.starts_at)) || Date.parse(session.starts_at) <= Date.parse(now)) fail('voucher_cancel_too_late');
      booking!.status = 'cancelled';
      if (voucher.cancellationPolicy === 'restore') { voucher.balance += booking!.cost; booking!.restored = true; }
      session.booked_count = (db.bookings as BookingRow[]).filter(b => b.tenant_id === context.tenantId && b.session_id === session.id && !['cancelled','late_cancel'].includes(b.status)).length + voucherSeats(db, session.id, context.tenantId);
    }
    if (c.type === 'confirm_booking') {
      if (c.verificationConfirmed !== true) fail('voucher_verification_required');
      if (booking!.status !== 'booked') fail('voucher_booking_final');
      if (!booking!.confirmedAt) { booking!.confirmedAt = now; booking!.confirmedBy = c.actorId; }
    }
    if (c.type === 'attendance') {
      if (booking!.status !== 'booked') fail('voucher_booking_final');
      if (voucher.source === 'promotion_claim' && (!booking!.confirmedAt || !booking!.confirmedBy)) fail('voucher_confirmation_required');
      booking!.status = 'attended';
    }
    if (c.type === 'revoke') { if (bookings.some(b => b.tenant_id === context.tenantId && b.voucherId === voucher.id && b.status === 'booked')) fail('voucher_active_bookings'); voucher.status = 'revoked'; }
    voucher.updated_at = now;
    if (booking) booking.updated_at = now;
  }
  const event: VoucherEventRow = { ...base(), voucherId: voucher.id, bookingId: booking?.id ?? null, kind: c.type, actorId: c.actorId, requestId: c.requestId, fingerprint, payload: c.type === 'preview_delivery' ? { channel: c.channel, deliveryStatus: 'preview_only' } : c.type === 'book' ? { contactConsent: c.contactConsent, consentActorId: c.actorId, consentRecordedAt: now, marketingConsent: false, verificationConfirmed: c.verificationConfirmed === true } : c.type === 'confirm_booking' ? { verificationConfirmed: true } : {} };
  const result = structuredClone({ voucher, ...(booking ? { booking } : {}), event });
  event.payload = { ...event.payload, result }; events.push(event);
  return { db, result };
}
