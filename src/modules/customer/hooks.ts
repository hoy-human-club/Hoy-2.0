import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, BookingRow, ClassSessionRow, ContentArticleRow, ClassLedgerRow, EventRow, EventRsvpRow, FaqEntryRow, InviteRow, MembershipRow, ModalityRow, NotificationPrefRow, NotificationRow, PaymentMethodRow, PaymentRow, PlanRow, ProfileRow, ReviewRow, RoomRow, TeacherRow, UserRow } from '../../data/schema';
import { isSameDay, MS } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { priceItem, type PriceItem } from '../../tenant/pricing';
import { insideCancelWindow, policy } from './policy';
import { freezePatch, packageState, resumePatch } from '../../data/packages';

export interface WaitlistRow extends BaseRow { user_id: string; session_id: string; position: number; status: 'waiting' | 'offered' | 'claimed' | 'expired' | 'left'; offered_at: string | null; claim_until: string | null }
export interface EmergencyContact { name: string; phone: string }
export interface ProfileFull extends ProfileRow { birthday: string | null; emergency_contact: EmergencyContact | null; notes: string | null }

export interface JoinedSession { session: ClassSessionRow; modality?: ModalityRow; teacher?: TeacherRow; room?: RoomRow; templateActive?: boolean }

/** One session joined with its modality, teacher and room. Live. */
export function useSessionJoined(id: string | undefined): { joined: JoinedSession | null; loading: boolean } {
  const { rows, loading } = useTable<ClassSessionRow>('class_sessions', id ? { where: { id } } : undefined);
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  const { rows: rooms } = useTable<RoomRow>('rooms');
  return useMemo(() => {
    const s = id ? rows.find((r) => r.id === id) : undefined;
    if (!s) return { joined: null, loading };
    return { joined: { session: s, modality: modalities.find((m) => m.id === s.modality_id), teacher: teachers.find((t) => t.id === s.teacher_id), room: rooms.find((r) => r.id === s.room_id) }, loading };
  }, [id, rows, modalities, teachers, rooms, loading]);
}

/** All sessions joined (for lists). */
export function useAllSessionsJoined(): JoinedSession[] {
  const { rows: templates } = useTable<BaseRow & { active: boolean }>('class_templates');
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions', { orderBy: { column: 'starts_at' } });
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  const { rows: rooms } = useTable<RoomRow>('rooms');
  return useMemo(() => {
    const mod = new Map(modalities.map((m) => [m.id, m])), tea = new Map(teachers.map((t) => [t.id, t])), rm = new Map(rooms.map((r) => [r.id, r]));
    return sessions.map((s) => ({ session: s, modality: mod.get(s.modality_id), teacher: tea.get(s.teacher_id), room: rm.get(s.room_id), templateActive: templates.find(t => t.id === s.template_id)?.active }));
  }, [sessions, modalities, teachers, rooms, templates]);
}

export function useMyBookings() {
  const { user } = useSession();
  return useTable<BookingRow>('bookings', { where: { user_id: user.id } });
}

export function useMyProfile() {
  const { user } = useSession();
  const { rows: profiles } = useTable<ProfileFull>('profiles', { where: { user_id: user.id } });
  const { rows: users } = useTable<UserRow>('users', { where: { id: user.id } });
  return { profile: profiles[0] ?? null, account: users[0] ?? null };
}

export type EntitlementKind = 'package' | 'membership' | 'trial' | 'single';

/**
 * What the signed-in person can pay a class with, in the C-04 order: a class of their package → trial → single class.
 * 0051: HOY has no credits and no membership at launch; the balance is the package's classes (src/data/packages.ts).
 * `membership` stays readable for a future recurring plan but nothing sells one.
 */
export function useEntitlements() {
  const { user } = useSession();
  const { rows: memberships } = useTable<MembershipRow>('memberships', { where: { user_id: user.id } });
  const { rows: ledger } = useTable<ClassLedgerRow>('class_ledger', { where: { user_id: user.id } });
  const { rows: payments } = useTable<PaymentRow>('payments', { where: { user_id: user.id } });
  const { rows: bookings } = useTable<BookingRow>('bookings', { where: { user_id: user.id } });
  const { rows: plans } = useTable<PlanRow>('plans');
  return useMemo(() => {
    const membership = memberships.find((m) => m.status === 'active') ?? memberships.find((m) => m.status === 'paused') ?? null;
    const pkg = packageState(ledger);
    const plan = membership ? plans.find((p) => p.id === membership.plan_id) ?? null : pkg.purchase?.plan_id ? plans.find((p) => p.id === pkg.purchase!.plan_id) ?? null : null;
    const trialUsed = bookings.some((b) => b.paid_with === 'trial') || payments.some((p) => p.plan_id === 'plan_trial' && p.status === 'approved');
    const defaultKind: EntitlementKind = pkg.balance > 0 ? 'package' : membership?.status === 'active' ? 'membership' : !trialUsed ? 'trial' : 'single';
    return { membership, plan, ledger, pkg, classBalance: pkg.balance, nextExpiry: pkg.expiresAt, trialUsed, payments, defaultKind, hasAnyEntitlement: pkg.balance > 0 || membership?.status === 'active' };
  }, [memberships, ledger, payments, bookings, plans]);
}

/** C-07b: freeze the package (once, up to the M-08 freezeMaxDays) and end a freeze early. */
export function usePackageActions() {
  const data = useData();
  const freeze = useCallback(async (purchase: ClassLedgerRow, days: number) => {
    if (purchase.frozen_from) throw new Error('freeze_used');
    if (days < 1 || days > policy.freezeMaxDays) throw new Error('freeze_days');
    await data.update('class_ledger', purchase.id, freezePatch(purchase, days));
  }, [data]);
  const resume = useCallback(async (purchase: ClassLedgerRow) => { await data.update('class_ledger', purchase.id, resumePatch(purchase)); }, [data]);
  return { freeze, resume };
}

export function useWaitlistFor(sessionId: string | undefined) {
  const { user } = useSession();
  const { rows } = useTable<WaitlistRow>('waitlist', sessionId ? { where: { session_id: sessionId }, orderBy: { column: 'position' } } : undefined);
  const active = rows.filter((w) => w.status === 'waiting' || w.status === 'offered');
  const mine = active.find((w) => w.user_id === user.id) ?? rows.filter((w) => w.user_id === user.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  return { entries: rows, active, mine, position: mine ? active.filter((w) => w.status === 'waiting').findIndex((w) => w.id === mine.id) + 1 : 0 };
}

/** Ticks every `ms`; returns Date.now(). */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

/** The C-04 / C-08 / C-20 transactions, written the same way from every page. */
export function useBookingActions() {
  const data = useData();
  const { user } = useSession();

  /** Rule: one class per person per day. Returns the conflicting booking's session id when there is one. */
  const sameDayConflict = useCallback((myBookings: BookingRow[], sessions: ClassSessionRow[], target: ClassSessionRow): string | null => {
    if (tenant.studio.perPersonPerDay !== 1) return null;
    const active = myBookings.filter((b) => b.status === 'booked' && b.session_id !== target.id);
    const hit = active.find((b) => { const s = sessions.find((x) => x.id === b.session_id); return s && isSameDay(s.starts_at, target.starts_at); });
    return hit?.session_id ?? null;
  }, []);

  const book = useCallback(async (session: ClassSessionRow, paidWith: EntitlementKind, opts?: { packagePlanId?: string | null; matNumber?: number | null }) => {
    // Race guard: re-read the session so a spot that filled during checkout is caught (C-04 "Race" state).
    const fresh = await data.get<ClassSessionRow>('class_sessions', session.id);
    if (!fresh || fresh.status !== 'scheduled') throw new Error('session_unavailable');
    if (fresh.booked_count >= fresh.capacity) throw new Error('session_full');
    const existing = await data.list<BookingRow>('bookings', { where: { user_id: user.id, session_id: fresh.id } });
    if (existing.some(b => b.status === 'booked' || b.status === 'checked_in')) throw new Error('booking_exists');
    const booking = await data.insert<BookingRow>('bookings', { user_id: user.id, session_id: fresh.id, status: 'booked', paid_with: paidWith, ledger_id: null, checked_in_at: null, cancelled_at: null, rated: false, mat_number: opts?.matNumber ?? null });
    if (paidWith === 'package') {
      const c = await data.insert<ClassLedgerRow>('class_ledger', { user_id: user.id, plan_id: opts?.packagePlanId ?? null, payment_id: null, delta: -1, reason: 'booking', expires_at: null } as Partial<ClassLedgerRow>);
      await data.update('bookings', booking.id, { ledger_id: c.id });
      booking.ledger_id = c.id;
    }
    await data.update('class_sessions', fresh.id, { booked_count: fresh.booked_count + 1 });
    return booking;
  }, [data, user.id]);

  /** Offers the freed spot to the first waiting person (C-20: 30-minute claim window). */
  const promoteWaitlist = useCallback(async (sessionId: string) => {
    const waiting = (await data.list<WaitlistRow>('waitlist', { where: { session_id: sessionId, status: 'waiting' }, orderBy: { column: 'position' } }));
    const first = waiting[0];
    if (!first) return;
    const now = Date.now();
    await data.update('waitlist', first.id, { status: 'offered', offered_at: new Date(now).toISOString(), claim_until: new Date(now + policy.claimWindowMinutes * MS.min).toISOString() });
  }, [data]);

  const cancel = useCallback(async (booking: BookingRow, session: ClassSessionRow, reason: 'customer' | 'studio' = 'customer') => {
    const late = reason === 'customer' && insideCancelWindow(session.starts_at);
    const status = late ? 'late_cancel' : 'cancelled';
    await data.update('bookings', booking.id, { status, cancelled_at: new Date().toISOString() });
    // The class returns to the package outside the window, or always when the studio cancelled (E-03).
    if (booking.paid_with === 'package' && !late) await data.insert('class_ledger', { user_id: booking.user_id, plan_id: null, payment_id: null, delta: 1, reason: reason === 'studio' ? 'refund' : 'cancel_return', expires_at: null });
    if (session.status === 'scheduled') {
      await data.update('class_sessions', session.id, { booked_count: Math.max(0, session.booked_count - 1) });
      await promoteWaitlist(session.id);
    }
    return { late };
  }, [data, promoteWaitlist]);

  /** Reschedule = cancel + rebook in one transaction, same entitlement, no fee outside the window (C-08b). */
  const reschedule = useCallback(async (booking: BookingRow, from: ClassSessionRow, to: ClassSessionRow) => {
    const fresh = await data.get<ClassSessionRow>('class_sessions', to.id);
    if (!fresh || fresh.booked_count >= fresh.capacity || fresh.status !== 'scheduled') throw new Error('session_full');
    const next = await data.insert<BookingRow>('bookings', { user_id: booking.user_id, session_id: fresh.id, status: 'booked', paid_with: booking.paid_with, ledger_id: booking.ledger_id, checked_in_at: null, cancelled_at: null, rated: false });
    await data.update('bookings', booking.id, { status: 'cancelled', cancelled_at: new Date().toISOString() });
    await data.update('class_sessions', from.id, { booked_count: Math.max(0, from.booked_count - 1) });
    await data.update('class_sessions', fresh.id, { booked_count: fresh.booked_count + 1 });
    await promoteWaitlist(from.id);
    return next;
  }, [data, promoteWaitlist]);

  const joinWaitlist = useCallback(async (session: ClassSessionRow) => {
    const existing = await data.list<WaitlistRow>('waitlist', { where: { session_id: session.id } });
    const position = existing.filter((w) => w.status === 'waiting' || w.status === 'offered').length + 1;
    return data.insert<WaitlistRow>('waitlist', { user_id: user.id, session_id: session.id, position, status: 'waiting', offered_at: null, claim_until: null } as Partial<WaitlistRow>);
  }, [data, user.id]);

  const leaveWaitlist = useCallback(async (entry: WaitlistRow) => data.update('waitlist', entry.id, { status: 'left' }), [data]);

  const claimWaitlist = useCallback(async (entry: WaitlistRow, session: ClassSessionRow, paidWith: EntitlementKind) => {
    const booking = await book(session, paidWith);
    await data.update('waitlist', entry.id, { status: 'claimed' });
    return booking;
  }, [book, data]);

  return { book, cancel, reschedule, joinWaitlist, leaveWaitlist, claimWaitlist, sameDayConflict, promoteWaitlist };
}

/** Pricing helpers shared by C-04 / C-07 / C-17 — every figure comes from pricing.ts. */
export const priceOf = (id: string): PriceItem => { const p = priceItem(id); if (!p) throw new Error(`unknown price ${id}`); return p; };
/** Pay-per-class items (C-07): the trial class and the individual class. */
export const PASS_IDS = ['trial', 'single'] as const;
/** The packages a member can buy (C-06, C-04): the 12-class package and its Santa María Tennis Club price. */
export const PACKAGE_IDS = ['pack12', 'pack12_smtc'] as const;

/**
 * Small localStorage-backed per-viewer preference. Since 0008 the faked data (notification prefs,
 * invites, ratings, RSVPs) lives in real tables; what stays here is genuinely local — the C-13 read
 * receipts and the C-20 auto-claim switch — because no table claims to own it.
 */
export function useLocalPref<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const { user } = useSession();
  const k = `hoyos.pref.${user.id}.${key}`;
  const [v, setV] = useState<T>(() => { try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as T) : initial; } catch { return initial; } });
  const set = useCallback((next: T | ((prev: T) => T)) => setV((prev) => { const val = typeof next === 'function' ? (next as (p: T) => T)(prev) : next; try { localStorage.setItem(k, JSON.stringify(val)); } catch { /* ignore */ } return val; }), [k]);
  return [v, set];
}

// ---------------------------------------------------------------------------------------------
// Tables added in 0008 (data depth): notifications, notification_prefs, reviews, invites,
// events + event_rsvps, payment_methods, content_articles, faq_entries. Every page reads them
// through useTable(); nothing here keeps state in localStorage any more.
// ---------------------------------------------------------------------------------------------

/** C-24 inbox: my notifications, newest first, with the unread count and read/mark-all writers. */
export function useMyNotifications() {
  const data = useData();
  const { user } = useSession();
  const { rows, loading } = useTable<NotificationRow>('notifications', { where: { user_id: user.id }, orderBy: { column: 'created_at', dir: 'desc' } });
  const unread = rows.filter((n) => !n.read_at).length;
  const markRead = useCallback(async (n: NotificationRow) => { if (!n.read_at) await data.update('notifications', n.id, { read_at: new Date().toISOString() }); }, [data]);
  const markAllRead = useCallback(async () => { const at = new Date().toISOString(); for (const n of rows) if (!n.read_at) await data.update('notifications', n.id, { read_at: at }); }, [data, rows]);
  return { rows, loading, unread, markRead, markAllRead };
}

export const NOTIF_CHANNELS = ['whatsapp', 'email', 'push'] as const;
export const NOTIF_CATEGORIES = ['bookings', 'waitlist', 'payments', 'events', 'marketing'] as const;
export type NotifChannel = (typeof NOTIF_CHANNELS)[number];
export type NotifCategory = (typeof NOTIF_CATEGORIES)[number];

/**
 * C-24 / C-19 notification preferences. No row means enabled, so only real choices are stored:
 * `set` inserts the first time and updates afterwards (upsert), and `setChannel` is the C-19
 * master switch that writes every category of one channel at once.
 */
export function useNotificationPrefs() {
  const data = useData();
  const { user } = useSession();
  const { rows } = useTable<NotificationPrefRow>('notification_prefs', { where: { user_id: user.id } });
  const isEnabled = useCallback((channel: NotifChannel, category: NotifCategory) => rows.find((p) => p.channel === channel && p.category === category)?.enabled ?? true, [rows]);
  const set = useCallback(async (channel: NotifChannel, category: NotifCategory, enabled: boolean) => {
    const existing = rows.find((p) => p.channel === channel && p.category === category);
    if (existing) await data.update('notification_prefs', existing.id, { enabled });
    else await data.insert<NotificationPrefRow>('notification_prefs', { user_id: user.id, channel, category, enabled } as Partial<NotificationPrefRow>);
  }, [data, rows, user.id]);
  const channelOn = useCallback((channel: NotifChannel) => NOTIF_CATEGORIES.some((c) => isEnabled(channel, c)), [isEnabled]);
  const setChannel = useCallback(async (channel: NotifChannel, enabled: boolean) => { for (const c of NOTIF_CATEGORIES) await set(channel, c, enabled); }, [set]);
  return { rows, isEnabled, set, channelOn, setChannel };
}

/** C-10: the reviews this person wrote, and the writer that records one. */
export function useMyReviews() {
  const data = useData();
  const { user } = useSession();
  const { rows } = useTable<ReviewRow>('reviews', { where: { user_id: user.id } });
  const forSession = useCallback((sessionId: string | undefined) => (sessionId ? rows.find((r) => r.class_session_id === sessionId) ?? null : null), [rows]);
  const rate = useCallback(async (input: { session: ClassSessionRow; rating: number; tags: string[]; comment: string; anonymous: boolean; booking?: BookingRow | null }) => {
    const review = await data.insert<ReviewRow>('reviews', {
      user_id: user.id, class_session_id: input.session.id, teacher_id: input.session.teacher_id,
      rating: input.rating, tags: input.tags, comment: input.comment.trim() || null, visibility: input.anonymous ? 'anonymous' : 'named',
    } as Partial<ReviewRow>);
    if (input.booking) await data.update('bookings', input.booking.id, { rated: true });
    // teachers.rating_avg stays the studio-facing average of every review of that teacher.
    const all = await data.list<ReviewRow>('reviews', { where: { teacher_id: input.session.teacher_id } });
    if (all.length) await data.update('teachers', input.session.teacher_id, { rating_avg: Math.round((all.reduce((a, r) => a + r.rating, 0) / all.length) * 10) / 10 });
    return review;
  }, [data, user.id]);
  return { rows, forSession, rate };
}

/** Reviews of one class session (teacher app, read-only). */
export function useSessionReviews(sessionId: string | undefined) {
  const { rows } = useTable<ReviewRow>('reviews', { where: { class_session_id: sessionId ?? '__none__' } });
  return useMemo(() => {
    if (!sessionId || rows.length === 0) return { rows: [] as ReviewRow[], count: 0, average: null as number | null, tags: [] as { tag: string; n: number }[] };
    const counts = new Map<string, number>();
    for (const r of rows) for (const tag of r.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return {
      rows, count: rows.length,
      average: Math.round((rows.reduce((a, r) => a + r.rating, 0) / rows.length) * 10) / 10,
      tags: [...counts.entries()].map(([tag, n]) => ({ tag, n })).sort((a, b) => b.n - a.n),
    };
  }, [rows, sessionId]);
}

/** C-16: invites I sent, plus the writer that records a new one with my referral code. */
export function useMyInvites() {
  const data = useData();
  const { user } = useSession();
  const { rows } = useTable<InviteRow>('invites', { where: { inviter_user_id: user.id }, orderBy: { column: 'created_at', dir: 'desc' } });
  const code = `${tenant.invoicePrefix}-${user.id.slice(-4).toUpperCase()}`;
  const send = useCallback(async (input: { channel: InviteRow['channel']; target: string; sessionId?: string | null }) => {
    const email = input.target.includes('@');
    return data.insert<InviteRow>('invites', {
      inviter_user_id: user.id, invitee_phone: !email && /\d/.test(input.target) ? input.target : null, invitee_email: email ? input.target : null,
      invitee_user_id: null, channel: input.channel, code, session_id: input.sessionId ?? null, status: 'prepared', reward_ledger_id: null,
    } as Partial<InviteRow>);
  }, [code, data, user.id]);
  return { rows, code, send };
}

/** C-05: my saved payment methods, with add / remove / make-default. */
export function usePaymentMethods() {
  const data = useData();
  const { user } = useSession();
  const { rows } = useTable<PaymentMethodRow>('payment_methods', { where: { user_id: user.id }, orderBy: { column: 'created_at', dir: 'desc' } });
  const makeDefault = useCallback(async (row: PaymentMethodRow) => {
    for (const m of rows) if (m.is_default && m.id !== row.id) await data.update('payment_methods', m.id, { is_default: false });
    await data.update('payment_methods', row.id, { is_default: true });
  }, [data, rows]);
  /** INTEGRATION SEAM: `token_ref` is a placeholder. With Wompi live, the widget returns the real token and this insert stores only that reference. */
  const add = useCallback(async (input: { kind: PaymentMethodRow['kind']; brand: string; last4?: string | null; expires?: string | null; tokenRef: string }) => {
    const first = rows.length === 0;
    const created = await data.insert<PaymentMethodRow>('payment_methods', {
      user_id: user.id, provider: 'wompi', kind: input.kind, brand: input.brand, last4: input.last4 ?? null,
      token_ref: input.tokenRef, is_default: first, expires: input.expires ?? null,
    } as Partial<PaymentMethodRow>);
    return created;
  }, [data, rows.length, user.id]);
  const remove = useCallback(async (row: PaymentMethodRow) => {
    await data.remove('payment_methods', row.id);
    const rest = rows.filter((m) => m.id !== row.id);
    if (row.is_default && rest[0]) await data.update('payment_methods', rest[0].id, { is_default: true });
  }, [data, rows]);
  return { rows, add, remove, makeDefault };
}

/** C-23: published events, upcoming first, joined with my RSVP. */
export function useEvents() {
  const { user } = useSession();
  const { rows: events, loading } = useTable<EventRow>('events', { where: { status: 'published' }, orderBy: { column: 'starts_at' } });
  const { rows: rsvps } = useTable<EventRsvpRow>('event_rsvps');
  return useMemo(() => {
    const going = (id: string) => rsvps.filter((r) => r.event_id === id && (r.status === 'going' || r.status === 'attended'));
    return {
      loading,
      events: events.map((e) => ({ event: e, taken: going(e.id).reduce((a, r) => a + 1 + (r.guests ?? 0), 0), mine: rsvps.find((r) => r.event_id === e.id && r.user_id === user.id && r.status !== 'cancelled') ?? null })),
    };
  }, [events, rsvps, user.id, loading]);
}

/** C-23 RSVP writers (the payment itself goes through payments.ts, like every other charge). */
export function useEventRsvp() {
  const data = useData();
  const { user } = useSession();
  const going = useCallback(async (event: EventRow, paymentId: string | null) => data.insert<EventRsvpRow>('event_rsvps', { event_id: event.id, user_id: user.id, status: 'going', payment_id: paymentId, guests: 0 } as Partial<EventRsvpRow>), [data, user.id]);
  const cancel = useCallback(async (rsvp: EventRsvpRow) => data.update('event_rsvps', rsvp.id, { status: 'cancelled' }), [data]);
  return { going, cancel };
}

/** C-13 club rules and the "about HOY" article, from content_articles (M-02 edits them). */
export function useContentArticles(section: ContentArticleRow['section'] | 'all' = 'all') {
  const { rows, loading } = useTable<ContentArticleRow>('content_articles', { where: { published: true }, orderBy: { column: 'sort' } });
  return { articles: section === 'all' ? rows : rows.filter((a) => a.section === section), loading };
}

export interface FaqGroup { key: string; title: { es: string; en: string }; lead: { es: string; en: string }; items: FaqEntryRow[] }

/** C-14 / C-15 FAQ, grouped by section for one page. */
export function useFaq(page: number) {
  const { rows, loading } = useTable<FaqEntryRow>('faq_entries', { where: { published: true }, orderBy: { column: 'sort' } });
  return useMemo(() => {
    const pages = [...new Set(rows.map((r) => r.page))].sort((a, b) => a - b);
    const groups: FaqGroup[] = [];
    for (const r of rows.filter((x) => x.page === page)) {
      const g = groups.find((x) => x.key === r.group_key);
      if (g) g.items.push(r);
      else groups.push({ key: r.group_key, title: r.group_title, lead: r.group_lead, items: [r] });
    }
    return { groups, totalPages: Math.max(pages.length, 1), loading };
  }, [rows, page, loading]);
}
