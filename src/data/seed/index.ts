import { TIMETABLE, timetableId } from './timetable';
import type { ActivityEventRow, BaseRow, BookingRow, ClassLedgerRow, ClassSessionRow, EventRow, InviteRow, MembershipRow, MessageLogRow, NotificationRow, NotificationPrefRow, PaymentMethodRow, PaymentRow, PracticeGoalRow, ProfileRow, ReviewRow, TeacherRow, UserRow } from '../schema';
import { tableNames } from '../schema';
import { demoUsers } from '../../auth/demoUsers';
import { tenant } from '../../tenant/tenant';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { rng } from './rng';
import { NOW, SEED_RATE_CARD, base, iso, modalities, plans, rooms, teachers } from './catalog';
import { contentArticles, events as seedEvents, faqEntries } from './content';
import { currentLegal, legalDocuments } from './legal';
import { mediaAssets } from './media';
import { buildPayroll } from './payroll';
import { buildIntegrations } from './integrations';
import { buildHoursOverrides } from './hours';
import { buildApiKeys } from './apiKeys';
import { buildTableViews } from './views';
import { buildExpenses, expenseTemplates } from './expenses';
import { buildSpecials } from './specials';
import { buildDeletionRequests } from './deletion';
import { automationText, buildMessages } from './messages';
import { buildStudioPolicies } from './studioPolicies';
import { LATE_ROLES, buildLateStaff, buildManual } from './manual';
import { dateKey, addDays, addDaysKey, MS } from '../../i18n/format';
import { practiceStats, weekStartKey } from '../analytics';
import { DEFAULT_IVA_PCT, splitIva } from '../tax';
import { isRetired } from '../../specs/retired';
import { priceItem } from '../../tenant/pricing';
import { EMAIL_CATALOG } from '../emailCatalog';

const giftPrice = (id: string) => priceItem(id)?.price ?? 0;

const FIRST = ['Camila', 'Nicolás', 'Sara', 'Tomás', 'Mariana', 'Julián', 'Daniela', 'Sebastián', 'Gabriela', 'Alejandro', 'Antonia', 'Samuel', 'Salomé', 'Emilio', 'Luciana', 'Martín', 'Elena', 'David', 'Paulina', 'Jerónimo', 'Amelia', 'Simón', 'Renata', 'Lucas', 'Violeta', 'Benjamín', 'Catalina', 'Joaquín', 'Isabel', 'Gael'];
const LAST = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Jiménez', 'Ruiz', 'Álvarez', 'Castro', 'Vargas', 'Romero', 'Suárez', 'Moreno', 'Muñoz', 'Rojas', 'Medina', 'Guerrero', 'Cortés'];

export function buildSeed(): Record<string, BaseRow[]> {
  const r = rng(2026);
  const db: Record<string, BaseRow[]> = Object.fromEntries(tableNames.map((t) => [t, []]));

  db.tenants.push({ ...base('ten_hoy', 365), id: tenant.id, slug: tenant.slug, name: tenant.name, legal_name: tenant.legalName, timezone: tenant.timezone, currency: tenant.currency, default_locale: tenant.defaultLocale, settings: { studio: tenant.studio, openingHours: { ...tenant.openingHours }, payroll: { cadence: 'monthly', payoutMethod: 'wompi', signedBy: '', withholding: false, rateCard: SEED_RATE_CARD } } });
  // 0018: M-10 — every integration starts simulated, with its non-secret fields empty.
  db.integrations.push(...buildIntegrations());
  // 0041: M-08g — the next Colombian holidays (closed) and one special Saturday; D-07 — two example developer keys (hash only).
  db.hours_overrides.push(...buildHoursOverrides());
  db.api_keys.push(...buildApiKeys());
  // 0044: M-03 — the default saved views (a bookings board, a people gallery, upcoming classes).
  db.table_views.push(...buildTableViews());

  // people: demo users + customers
  const users = db.users as UserRow[], profiles = db.profiles as ProfileRow[];
  const addPerson = (id: string, name: string, role: string, email: string, daysAgo: number) => {
    users.push({ ...base(id, daysAgo), email, phone: `+57 3${r.int(10, 50)}${r.int(1000000, 9999999)}`, status: 'active', locale: 'es', last_sign_in_at: iso(new Date(NOW.getTime() - r.int(0, 72) * MS.hour)) });
    profiles.push({ ...base(`prf_${id.slice(4)}`, daysAgo), user_id: id, full_name: name, initials: name.split(' ').map((s) => s[0]).join('').slice(0, 2), photo_url: null, birthday: r.chance(0.3) ? dateKey(new Date(1975 + r.int(0, 30), r.chance(0.5) ? NOW.getMonth() : r.int(0, 11), r.int(1, 28))) : null, emergency_contact: null, marketing_optin: r.chance(0.7), whatsapp_verified: r.chance(0.8), notes: null });
    db.user_roles.push({ ...base(`rol_${id.slice(4)}`, daysAgo), user_id: id, role, granted_by: 'usr_super' });
  };
  // Roles added after 0.11 (marketing, developer) are seeded at the end with fixed rows, so the shared RNG stream is untouched.
  for (const u of demoUsers) if (u.role !== 'public' && !LATE_ROLES.has(u.role)) addPerson(u.id, u.name, u.role, u.email, 120);
  const customerIds: string[] = ['usr_cust'];
  for (let i = 0; i < 30; i++) {
    const name = `${FIRST[i]} ${LAST[(i * 7) % LAST.length]}`;
    const id = `usr_c${String(i + 1).padStart(2, '0')}`;
    addPerson(id, name, 'customer', `${FIRST[i].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}${i + 1}@demo.hoyos.test`, r.int(5, 200));
    customerIds.push(id);
  }

  db.modalities.push(...modalities); db.rooms.push(...rooms); db.teachers.push(...teachers); db.plans.push(...plans);

  // templates
  TIMETABLE.forEach((row) => {
    const { weekday, time: start, modality: mod, teacher: tea, title } = row;
    const m = modalities.find((x) => x.id === mod)!;
    db.class_templates.push({ ...base(timetableId(row), 150), title, modality_id: mod, teacher_id: tea, room_id: 'room_main', weekday, start_time: start, duration_min: m.duration_min, capacity: tenant.studio.mats, level: 'all', active: true });
  });

  // sessions: 7 days back, 7 days forward, including the published weekend classes
  const sessions = db.class_sessions as ClassSessionRow[];
  for (let d = -7; d <= 7; d++) {
    const day = new Date(NOW); day.setDate(day.getDate() + d); day.setHours(0, 0, 0, 0);
    const wd = day.getDay();
    TIMETABLE.filter((t) => t.weekday === wd).forEach((row, i) => {
      const { time: start, modality: mod, teacher: tea, title } = row;
      const m = modalities.find((x) => x.id === mod)!;
      const [h, mi] = start.split(':').map(Number);
      const startsAt = new Date(day); startsAt.setHours(h, mi, 0, 0);
      const endsAt = new Date(startsAt.getTime() + m.duration_min * MS.min);
      const past = endsAt < NOW;
      const cancelled = d > 0 && r.chance(0.04);
      sessions.push({ ...base(`ses_${dateKey(day)}_${i}`, 14), template_id: timetableId(row), title, modality_id: mod, teacher_id: tea, room_id: 'room_main', starts_at: iso(startsAt), ends_at: iso(endsAt), capacity: tenant.studio.mats, booked_count: 0, level: 'all', status: cancelled ? 'cancelled' : past ? 'completed' : 'scheduled', cancel_reason: cancelled ? 'Profesor enfermo' : null });
    });
  }

  // packages (class_ledger) and payments — 0051: HOY sells classes and the 12-class package; no memberships, no credits
  const memberships = db.memberships as MembershipRow[], ledger = db.class_ledger as ClassLedgerRow[], payments = db.payments as PaymentRow[];
  customerIds.forEach((uid, i) => {
    const kind = uid === 'usr_cust' ? 'pack12' : r.pick(['pack12', 'pack12', 'pack12', 'pack12_smtc', 'single', 'single', 'trial', 'none'] as const);
    if (kind === 'none') return;
    const plan = plans.find((p) => p.slug === kind)!;
    const daysAgo = r.int(1, 60);
    const payId = `pay_${i}_${kind}`;
    const paidAt = new Date(NOW); paidAt.setDate(paidAt.getDate() - daysAgo);
    payments.push({ ...base(payId, daysAgo), user_id: uid, plan_id: plan.id, amount: plan.price, amount_paid: plan.price, note: null, currency: 'COP', method: r.pick(['card', 'pse', 'qr', 'cash', 'transfer']), provider: r.chance(0.7) ? 'wompi' : 'manual', provider_ref: r.chance(0.7) ? `wmp_${r.int(100000, 999999)}` : null, status: 'approved', paid_at: iso(paidAt), taken_by: r.chance(0.3) ? 'usr_desk' : null });
    db.invoices.push({ ...base(`inv_${i}`, daysAgo), payment_id: payId, number: `${tenant.invoicePrefix}-${String(1000 + i)}`, ...splitIva(plan.price, DEFAULT_IVA_PCT / 100), issued_at: iso(paidAt), pdf_url: null, dian_cufe: null });
    if (plan.classes) {
      // A package (or a single / trial class bought ahead) opens its classes in the ledger, with the plan's validity.
      const exp = new Date(paidAt); exp.setDate(exp.getDate() + (plan.validity_days ?? 30));
      ledger.push({ ...base(`cls_${i}_buy`, daysAgo), user_id: uid, plan_id: plan.id, payment_id: payId, delta: plan.classes, reason: 'purchase', expires_at: dateKey(exp), frozen_from: null, frozen_until: null });
    }
  });

  // bookings: fill sessions
  const hasPackage = (uid: string) => ledger.some((c) => c.user_id === uid && c.reason === 'purchase' && c.delta > 1);
  const bookings = db.bookings as BookingRow[];
  let b = 0;
  const custDays = new Set<string>(); // the demo customer books at most one class per day (tenant.studio.perPersonPerDay)
  for (const s of sessions) {
    if (s.status === 'cancelled') continue;
    const n = r.int(4, tenant.studio.mats);
    const shuffled = [...customerIds].sort(() => r.next() - 0.5).slice(0, n);
    if (new Date(s.starts_at).getDate() === NOW.getDate() && !shuffled.includes('usr_cust') && r.chance(0.5)) shuffled[0] = 'usr_cust';
    for (const uid of shuffled) {
      if (uid === 'usr_cust') { const day = s.starts_at.slice(0, 10); if (custDays.has(day)) continue; custDays.add(day); }
      const past = s.status === 'completed';
      const status = past ? (r.chance(0.85) ? 'checked_in' : r.chance(0.5) ? 'no_show' : 'late_cancel') : 'booked';
      bookings.push({ ...base(`bk_${b++}`, 3), user_id: uid, session_id: s.id, status, paid_with: hasPackage(uid) ? 'package' : 'single', ledger_id: null, checked_in_at: status === 'checked_in' ? s.starts_at : null, cancelled_at: status === 'late_cancel' ? s.starts_at : null, rated: past && r.chance(0.4) });
      if (status !== 'late_cancel') s.booked_count++;
    }
    if (s.booked_count >= s.capacity) {
      for (let w = 0; w < r.int(1, 3); w++) db.waitlist.push({ ...base(`wl_${s.id}_${w}`, 1), user_id: r.pick(customerIds), session_id: s.id, position: w + 1, status: 'waiting', offered_at: null, claim_until: null });
    }
  }

  // One upcoming class today is always full, so the "Sin cupos" / "Full" state on C-01 and C-02 is real data (Jas review, 2026-09-17).
  const startOf = new Map(sessions.map((s) => [s.id, s.starts_at]));
  const bookedIn = (sid: string, uid: string) => bookings.some((bk) => bk.session_id === sid && bk.user_id === uid && bk.status === 'booked');
  const fullToday = sessions
    .filter((s) => s.status === 'scheduled' && s.starts_at.slice(0, 10) === dateKey(NOW) && new Date(s.starts_at) > NOW && !bookedIn(s.id, 'usr_cust'))
    .sort((a, b) => b.booked_count - a.booked_count || a.starts_at.localeCompare(b.starts_at))[0];
  if (fullToday) {
    // Fill from people who already have an earlier class today first, so nobody's "next class" notification changes.
    const hasEarlier = (uid: string) => bookings.some((bk) => bk.user_id === uid && bk.status === 'booked' && (startOf.get(bk.session_id) ?? '') < fullToday.starts_at);
    const fillers = customerIds.filter((uid) => uid !== 'usr_cust' && !bookedIn(fullToday.id, uid)).sort((a, b) => Number(hasEarlier(b)) - Number(hasEarlier(a)));
    for (const uid of fillers) {
      if (fullToday.booked_count >= fullToday.capacity) break;
      bookings.push({ ...base(`bk_full_${fullToday.booked_count}`, 1), user_id: uid, session_id: fullToday.id, status: 'booked', paid_with: hasPackage(uid) ? 'package' : 'single', ledger_id: null, checked_in_at: null, cancelled_at: null, rated: false });
      fullToday.booked_count++;
    }
    const waiter = customerIds.find((uid) => uid !== 'usr_cust' && !bookedIn(fullToday.id, uid));
    if (waiter && !(db.waitlist as (BaseRow & { session_id: string })[]).some((w) => w.session_id === fullToday.id)) {
      db.waitlist.push({ ...base(`wl_${fullToday.id}_0`, 1), user_id: waiter, session_id: fullToday.id, position: 1, status: 'waiting', offered_at: null, claim_until: null });
    }
  }

  // ---- content as data: club rules (C-13), FAQ (C-14/C-15), events (C-23) ----
  db.content_articles.push(...contentArticles);
  db.faq_entries.push(...faqEntries);
  db.events.push(...seedEvents);

  // event RSVPs: each event between a third and three quarters full; the demo customer is going to the first.
  (db.events as EventRow[]).forEach((ev, ei) => {
    const n = Math.max(2, Math.min(ev.capacity - 2, r.int(Math.ceil(ev.capacity / 3), Math.round(ev.capacity * 0.75))));
    const who = [...customerIds].sort(() => r.next() - 0.5).slice(0, n);
    if (ei === 0 && !who.includes('usr_cust')) who[0] = 'usr_cust';
    who.forEach((uid, i) => db.event_rsvps.push({ ...base(`rsv_${ev.id}_${i}`, r.int(0, 12)), event_id: ev.id, user_id: uid, status: 'going', payment_id: null, guests: 0 }));
  });

  // reviews (C-10): every past class the seed marked as rated has a real review row.
  const GOOD_TAGS = ['music', 'heat', 'pace', 'clarity'] as const;
  const FIX_TAGS = ['crowded', 'late', 'tooHard', 'tooEasy'] as const;
  const COMMENTS = ['Salí como nueva.', 'La música acompañó muy bien.', 'Sala un poco llena hoy.', 'Buenas correcciones, gracias.', 'Ideal para empezar la semana.'];
  const reviews = db.reviews as ReviewRow[];
  bookings.filter((b) => b.rated && b.status === 'checked_in').forEach((b, i) => {
    const s = sessions.find((x) => x.id === b.session_id);
    if (!s) return;
    const rating = r.chance(0.62) ? 5 : r.chance(0.7) ? 4 : 3;
    const tags = new Set<string>([rating >= 4 ? r.pick(GOOD_TAGS) : r.pick(FIX_TAGS)]);
    if (rating === 5 && r.chance(0.4)) tags.add(r.pick(GOOD_TAGS));
    reviews.push({ ...base(`rev_${i}`, 1), user_id: b.user_id, class_session_id: s.id, teacher_id: s.teacher_id, rating, tags: [...tags], comment: r.chance(0.22) ? r.pick(COMMENTS) : null, visibility: r.chance(0.6) ? 'anonymous' : 'named', created_at: s.ends_at, updated_at: s.ends_at });
  });
  // teachers.rating_avg is the average of the reviews above (copied, never mutating the catalog rows).
  db.teachers = (db.teachers as TeacherRow[]).map((tea) => {
    const mine = reviews.filter((x) => x.teacher_id === tea.id);
    return mine.length ? { ...tea, rating_avg: Math.round((mine.reduce((a, x) => a + x.rating, 0) / mine.length) * 10) / 10 } : tea;
  });

  // saved payment methods (C-05): one for anyone who paid electronically, two for the demo customer.
  const methods = db.payment_methods as PaymentMethodRow[];
  const BRANDS: Record<string, string> = { card: 'Visa', pse: 'Bancolombia' };
  customerIds.forEach((uid, i) => {
    const pay = payments.find((p) => p.user_id === uid && p.provider === 'wompi' && p.status === 'approved' && (p.method === 'card' || p.method === 'pse'));
    if (!pay) return;
    const kind = pay.method as 'card' | 'pse';
    methods.push({ ...base(`pm_${i}_${kind}`, r.int(5, 90)), user_id: uid, provider: 'wompi', kind, brand: BRANDS[kind] ?? 'Wompi', last4: kind === 'card' ? String(r.int(1000, 9999)) : null, token_ref: `tok_demo_${r.int(100000, 999999)}`, is_default: true, expires: kind === 'card' ? `0${r.int(1, 9)}/2${r.int(7, 9)}` : null });
  });
  if (!methods.some((m) => m.user_id === 'usr_cust')) methods.push({ ...base('pm_cust_card', 40), user_id: 'usr_cust', provider: 'wompi', kind: 'card', brand: 'Visa', last4: '4242', token_ref: 'tok_demo_424242', is_default: true, expires: '08/28' });
  methods.push({ ...base('pm_cust_pse', 12), user_id: 'usr_cust', provider: 'wompi', kind: 'pse', brand: 'Bancolombia', last4: null, token_ref: 'tok_demo_900112', is_default: false, expires: null });

  // invites (C-16): the demo customer has one pending and one rewarded; a few others have sent one.
  const inviteCode = (uid: string) => `${tenant.invoicePrefix}-${uid.slice(-4).toUpperCase()}`;
  const rewardClass: ClassLedgerRow = { ...base('cls_invite_reward', 30), user_id: 'usr_cust', plan_id: null, payment_id: null, delta: 1, reason: 'gift', expires_at: null, frozen_from: null, frozen_until: null };
  ledger.push(rewardClass);
  const invites = db.invites as InviteRow[];
  invites.push(
    { ...base('inv_cust_1', 6), inviter_user_id: 'usr_cust', invitee_phone: '+57 300 000 0002', invitee_email: null, invitee_user_id: null, channel: 'whatsapp', code: inviteCode('usr_cust'), session_id: null, status: 'sent', reward_ledger_id: null },
    { ...base('inv_cust_2', 30), inviter_user_id: 'usr_cust', invitee_phone: null, invitee_email: 'invitada@demo.hoyos.test', invitee_user_id: 'usr_c11', channel: 'email', code: inviteCode('usr_cust'), session_id: null, status: 'rewarded', reward_ledger_id: rewardClass.id },
  );
  ['usr_c02', 'usr_c05', 'usr_c09'].forEach((uid, i) => invites.push({ ...base(`inv_${uid}`, r.int(3, 45)), inviter_user_id: uid, invitee_phone: null, invitee_email: null, invitee_user_id: null, channel: 'link', code: inviteCode(uid), session_id: null, status: i === 0 ? 'joined' : 'opened', reward_ledger_id: null }));

  // notifications (C-24): a real inbox per person, built from what actually happened to them.
  const notifications = db.notifications as NotificationRow[];
  let nid = 0;
  const notify = (uid: string, kind: NotificationRow['kind'], title: NotificationRow['title'], body: NotificationRow['body'], opts?: { at?: string; link?: string | null; via?: NotificationRow['sent_via']; read?: boolean }) => {
    const at = opts?.at ?? iso(NOW);
    notifications.push({ ...base(`ntf_${nid++}`, 0), created_at: at, updated_at: at, user_id: uid, kind, title, body, read_at: opts?.read ? at : null, deep_link: opts?.link ?? null, sent_via: opts?.via ?? 'in_app' });
  };
  const hoursBefore = (isoDate: string, h: number) => iso(new Date(new Date(isoDate).getTime() - h * MS.hour));
  for (const uid of customerIds) {
    const mine = bookings.filter((b) => b.user_id === uid);
    const upcoming = mine.filter((b) => b.status === 'booked').map((b) => sessions.find((s) => s.id === b.session_id)).filter((s): s is ClassSessionRow => !!s).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
    if (upcoming) notify(uid, 'booking', { es: `Reserva confirmada · ${upcoming.title}`, en: `Booking confirmed · ${upcoming.title}` }, { es: 'Llega 10 minutos antes y haz el check-in en recepción. Puedes cancelarla hasta 12 horas antes.', en: 'Arrive 10 minutes early and check in at the front desk. You can cancel it until 12 hours before.' }, { at: hoursBefore(upcoming.starts_at, 26), link: `/app/class/${upcoming.id}`, via: 'whatsapp' });
    const lastPay = payments.filter((p) => p.user_id === uid && p.status === 'approved').sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''))[0];
    if (lastPay) notify(uid, 'payment', { es: 'Recibo de pago', en: 'Payment receipt' }, { es: 'Tu recibo está en Historial → Pagos.', en: 'Your receipt is in History → Payments.' }, { at: lastPay.paid_at ?? undefined, link: '/app/history', via: 'email', read: true });
    const toRate = mine.filter((b) => b.status === 'checked_in' && !b.rated).map((b) => sessions.find((s) => s.id === b.session_id)).filter((s): s is ClassSessionRow => !!s).sort((a, b) => b.ends_at.localeCompare(a.ends_at))[0];
    if (toRate) notify(uid, 'review', { es: `¿Cómo estuvo ${toRate.title}?`, en: `How was ${toRate.title}?` }, { es: 'Dos toques y nos ayudas a cuidar la calidad de la sala.', en: 'Two taps and you help us keep the room’s quality.' }, { at: toRate.ends_at, link: `/app/rate/${toRate.id}`, via: 'push' });
    if (r.chance(0.55)) notify(uid, 'event', { es: 'Nuevo en la agenda: Baño de sonido · Luna llena', en: 'New on the calendar: Full Moon Sound Bath' }, { es: 'Cupos limitados. Reserva desde la app.', en: 'Limited spots. Book from the app.' }, { at: iso(new Date(NOW.getTime() - r.int(1, 5) * MS.day)), link: '/app/events/evt_sound_bath', via: 'email', read: r.chance(0.5) });
  }
  for (const w of db.waitlist as (BaseRow & { user_id: string; session_id: string; status: string })[]) {
    if (w.status !== 'waiting') continue;
    const s = sessions.find((x) => x.id === w.session_id);
    if (!s || r.chance(0.6)) continue;
    notify(w.user_id, 'waitlist', { es: `Estás en lista de espera · ${s.title}`, en: `You are on the waitlist · ${s.title}` }, { es: 'Te escribimos por WhatsApp si se libera un cupo; tienes 30 minutos para reclamarlo.', en: 'We message you on WhatsApp if a spot opens; you have 30 minutes to claim it.' }, { at: hoursBefore(s.starts_at, 30), link: `/app/waitlist/${s.id}`, via: 'whatsapp' });
  }
  notify('usr_cust', 'invite', { es: 'Tu invitada reservó su primera clase', en: 'Your guest booked her first class' }, { es: 'Te regalamos una clase. Está en Mis clases.', en: 'We gave you one class. It is in My classes.' }, { at: iso(new Date(NOW.getTime() - 29 * MS.day)), link: '/app/classes', via: 'push', read: true });

  // notification prefs (C-24 / C-19): no row means enabled, so only real choices are stored.
  const prefs = db.notification_prefs as NotificationPrefRow[];
  const CHANNELS = ['whatsapp', 'email', 'push'] as const;
  const CATEGORIES = ['bookings', 'waitlist', 'payments', 'events', 'marketing'] as const;
  for (const channel of CHANNELS) for (const category of CATEGORIES) prefs.push({ ...base(`np_cust_${channel}_${category}`, 60), user_id: 'usr_cust', channel, category, enabled: !(category === 'marketing' && channel === 'push') });
  ['usr_c04', 'usr_c08', 'usr_c14', 'usr_c21'].forEach((uid) => prefs.push({ ...base(`np_${uid}_marketing`, r.int(5, 80)), user_id: uid, channel: 'whatsapp', category: 'marketing', enabled: false }));

  // feature flags from spec toggles
  for (const spec of Object.values(canvasSpecs).filter((sp) => !isRetired(sp.code))) for (const t of spec.toggles ?? []) {
    db.feature_flags.push({ ...base(`ff_${spec.code}_${t.label}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase(), 100), key: `${spec.code}.${t.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, page_code: spec.code, label: t.label, enabled: t.on, audience: 'all' });
  }

  // ---- legal library (A-06): six kinds, bilingual, versioned ----
  db.legal_documents.push(...legalDocuments);
  for (const uid of customerIds) { db.consents.push({ ...base(`con_${uid}_t`, 30), user_id: uid, legal_document_id: 'leg_terms_es', accepted_at: iso(NOW), ip: null }); }
  // Acceptance of the waiver version in force: every member signed it on their first visit.
  const waiver = currentLegal('waiver');
  customerIds.forEach((uid, i) => {
    const signedAt = new Date(NOW.getTime() - r.int(20, 180) * MS.day);
    db.legal_acceptances.push({ ...base(`lac_${uid}_waiver`, r.int(20, 180)), user_id: uid, document_id: waiver.id, kind: waiver.kind, version: waiver.version, accepted_at: iso(signedAt), channel: i % 4 === 0 ? 'front_desk' : 'app', ip: null });
    db.legal_acceptances.push({ ...base(`lac_${uid}_terms`, r.int(20, 180)), user_id: uid, document_id: 'leg_terms_es', kind: 'terms', version: '1.0', accepted_at: iso(signedAt), channel: 'app', ip: null });
  });

  // ---- media library (M-02d): one pending slot per known place art belongs ----
  db.media_assets.push(...mediaAssets);

  // ---- Especiales (0017): space bookings (S-05) and the manual charges that paid for them (S-04) ----
  const specials = buildSpecials({ invoiceCount: db.invoices.length });
  db.space_bookings.push(...specials.bookings);
  db.payments.push(...specials.payments);
  db.invoices.push(...specials.invoices);
  db.special_charges.push(...specials.charges);
  db.audit_log.push(...specials.audit);

  // ---- teacher payroll (M-09a / S-03): three months, the latest still a draft ----
  const payroll = buildPayroll({ sessions, bookings, templates: db.class_templates as (BaseRow & { teacher_id: string; modality_id: string; weekday: number; active: boolean })[], teachers: db.teachers as TeacherRow[], specials: specials.charges, spaceBookings: specials.bookings, rateCard: SEED_RATE_CARD });
  db.payroll_runs.push(...payroll.runs);
  db.payroll_lines.push(...payroll.lines);

  db.gift_cards.push(
    // 0051: gift cards are worth classes at the class price — two individual classes, and one 12-class package.
    { ...base('gc_1', 10), code: 'HOY-REGALO-2401', buyer_user_id: 'usr_c03', recipient_name: 'Ana', recipient_contact: '+57 300 000 0001', amount: giftPrice('gift_single') * 2, balance: giftPrice('gift_single') * 2, deliver_at: iso(NOW), redeemed_by: null, status: 'sent' },
    { ...base('gc_2', 40), code: 'HOY-REGALO-2377', buyer_user_id: 'usr_c07', recipient_name: 'Pedro', recipient_contact: 'pedro@example.com', amount: giftPrice('gift_pack12'), balance: 0, deliver_at: null, redeemed_by: 'usr_c11', status: 'redeemed' },
  );

  // 0055: every email in the catalog (customers, teachers, team) as a row; only the receipt is sending today.
  db.email_templates.push(...EMAIL_CATALOG.map((m) => ({ ...base(`em_${m.key}`, 90), key: m.key, name: m.name.es, audience: m.audience, trigger: m.trigger, priority: m.priority, subject: m.subject, body_mjml: JSON.stringify({ es: m.body.es, en: m.body.en, cta: m.cta }), version: 1, active: m.intake === 'sending' })));
  db.wa_templates.push(
    { ...base('wa_otp', 90), key: 'otp', name: 'Código de acceso', category: 'authentication', body: { es: 'Tu código HOY es {{1}}.', en: 'Your HOY code is {{1}}.' }, approval_status: 'approved', active: true },
    { ...base('wa_reminder', 90), key: 'class_reminder', name: 'Recordatorio de clase', category: 'utility', body: { es: 'Hola {{1}}, tu clase de {{2}} empieza a las {{3}}.', en: 'Hi {{1}}, your {{2}} class starts at {{3}}.' }, approval_status: 'approved', active: true },
    { ...base('wa_waitlist', 90), key: 'waitlist_offer', name: 'Cupo liberado', category: 'utility', body: { es: 'Se liberó un cupo en {{1}}. Tienes 30 min para reclamarlo.', en: 'A spot opened in {{1}}. You have 30 min to claim it.' }, approval_status: 'pending', active: false },
  );
  db.automations.push(
    { ...base('aut_1', 80), name: 'Recordatorio 2h antes', trigger: 'booking.t-2h', channel: 'whatsapp', template_key: 'class_reminder', delay_min: 0, quiet_hours: { from: '21:00', to: '07:00' }, enabled: true },
    { ...base('aut_2', 80), name: 'Recibo por email', trigger: 'payment.approved', channel: 'email', template_key: 'receipt', delay_min: 0, quiet_hours: null, enabled: true },
    { ...base('aut_3', 80), name: 'Oferta de lista de espera', trigger: 'waitlist.offered', channel: 'whatsapp', template_key: 'waitlist_offer', delay_min: 0, quiet_hours: null, enabled: false },
  );
  // Automated sends of the last week (reminders, receipts): outbound rows with the text the template rendered.
  for (let i = 0; i < 12; i++) {
    const uid = r.pick(customerIds), channel = r.pick(['whatsapp', 'email'] as const), template_key = r.pick(['class_reminder', 'receipt'] as const), automation_id = r.pick(['aut_1', 'aut_2']), status = r.pick(['sent', 'delivered', 'read'] as const);
    const stamp = base(`msg_${i}`, r.int(0, 6));
    // Local clock time (no RNG): a reminder goes out 2 h before the 5:30 p. m. class, a receipt at a till hour; a row that would land after NOW moves back a day.
    const when = new Date(stamp.created_at); when.setHours(template_key === 'class_reminder' ? 15 : 9 + (i % 5) * 2, template_key === 'class_reminder' ? 30 : 15, 0, 0);
    if (when > NOW) when.setDate(when.getDate() - 1);
    stamp.created_at = stamp.updated_at = iso(when);
    const tx = automationText(template_key, (profiles.find((p) => p.user_id === uid)?.full_name ?? '').split(' ')[0], channel);
    db.message_log.push({ ...stamp, user_id: uid, channel, direction: 'outbound', source: 'automation', template_key, automation_id, subject: tx.subject, body: tx.body, status, sent_at: stamp.created_at, sent_by: null, read_at: null, read_by: null, external_id: null, payload: null } as MessageLogRow);
  }
  for (let i = 0; i < 20; i++) db.audit_log.push({ ...base(`aud_${i}`, r.int(0, 10)), actor_id: r.pick(['usr_desk', 'usr_coord', 'usr_super', 'usr_fin']), action: r.pick(['booking.create', 'payment.take', 'session.cancel', 'member.update', 'flag.toggle']), entity: r.pick(['bookings', 'payments', 'class_sessions', 'profiles', 'feature_flags']), entity_id: null, diff: null, ip: null });

  // ---- expenses ledger (M-09c): recurring templates + three months of fixed costs + variable costs ----
  // Appended after every other pass so the shared RNG stream above is untouched and no other page's data shifts.
  db.expense_templates.push(...expenseTemplates);
  db.expenses.push(...buildExpenses(r));

  // ---- account deletion requests (C-26 / W-09 / M-11, 0019): fixed rows, no RNG ----
  const deletions = buildDeletionRequests();
  db.deletion_requests.push(...deletions.rows);
  db.audit_log.push(...deletions.audit);

  // ---- conversations (M-06 / S-06, 0.8.0): fixed rows, no RNG; six inbound messages stay unread ----
  db.message_log.push(...buildMessages(new Map(profiles.map((p) => [p.user_id, p.full_name]))));

  // ---- the manual as a staff LMS (0031): marketing + developer people, text policies, reading and training history ----
  const late = buildLateStaff();
  users.push(...late.users); profiles.push(...late.profiles); db.user_roles.push(...late.roles);
  db.studio_policies.push(...buildStudioPolicies());
  const manual = buildManual();
  db.manual_progress.push(...manual.progress);
  db.manual_training.push(...manual.training);
  db.manual_requests.push(...manual.requests);
  db.manual_overrides.push(...manual.overrides);

  // ---- practice analytics (0040, C-01 / C-27 / M-06 / M-12): goals, the demo member's history and the events record ----
  // Appended last and without the shared RNG, so nothing above shifts. The session window is ±7 days, so the demo
  // member's older weeks are given here: completed morning classes she attended (one per day, tenant.studio.perPersonPerDay)
  // with a fixed rotation of co-attendees, so the weekly streak has real rows under it: 2 visits in each of the last
  // 7 full weeks except the 6th one back (1 visit) — the rest-week rule visibly saves that week.
  const currentWeek = weekStartKey(NOW);
  const dayOf = (isoStamp: string) => dateKey(new Date(isoStamp));
  const bookedDays = (uid: string) => new Set(bookings.filter((bk) => bk.user_id === uid).map((bk) => { const ses = sessions.find((x) => x.id === bk.session_id); return ses ? dayOf(ses.starts_at) : ''; }));
  const paidWith = (uid: string) => (hasPackage(uid) ? 'package' : 'single');
  let extra = 0;
  const checkIn = (uid: string, ses: ClassSessionRow, status: BookingRow['status'] = 'checked_in') => {
    const daysAgo = Math.max(1, Math.round((NOW.getTime() - new Date(ses.starts_at).getTime()) / MS.day) + 1);
    bookings.push({ ...base(`bk_pr_${extra++}`, daysAgo), user_id: uid, session_id: ses.id, status, paid_with: paidWith(uid), ledger_id: null, checked_in_at: status === 'checked_in' ? ses.starts_at : null, cancelled_at: null, rated: false });
    if (status !== 'late_cancel') ses.booked_count++;
  };
  for (let back = 7; back >= 1; back--) {
    const week = addDaysKey(currentWeek, -7 * back);
    const need = back === 6 ? 1 : 2;
    const mine = bookedDays('usr_cust');
    let have = bookings.filter((bk) => bk.user_id === 'usr_cust' && bk.status === 'checked_in' && weekStartKey(sessions.find((x) => x.id === bk.session_id)?.starts_at ?? NOW) === week).length;
    // First the classes that already exist in that week (the seed window), on days she has nothing yet.
    for (const ses of sessions.filter((x) => x.status === 'completed' && weekStartKey(x.starts_at) === week).sort((a, b) => a.starts_at.localeCompare(b.starts_at))) {
      if (have >= need) break;
      if (mine.has(dayOf(ses.starts_at)) || bookings.some((bk) => bk.user_id === 'usr_cust' && bk.session_id === ses.id)) continue;
      checkIn('usr_cust', ses); mine.add(dayOf(ses.starts_at)); have++;
    }
    // Then her usual slot — Tuesday and Thursday at 08:10 ("practica en la mañana") — on days with no class yet.
    for (const weekday of [2, 4, 1, 3, 5, 6]) {
      if (have >= need) break;
      const day = addDays(new Date(`${week}T12:00:00`), weekday - 1); day.setHours(0, 0, 0, 0);
      const key = dateKey(day);
      if (mine.has(key) || key >= dateKey(NOW)) continue;
      const row = TIMETABLE.find(t => t.weekday === weekday && t.time === '08:10');
      if (!row) continue;
      const { time: start, modality: mod, teacher: tea, title } = row;
      const id = `ses_${key}_1`;
      if (sessions.some((x) => x.id === id)) continue;
      const m = modalities.find((x) => x.id === mod)!;
      const [h, mi] = start.split(':').map(Number);
      const startsAt = new Date(day); startsAt.setHours(h, mi, 0, 0);
      const ses: ClassSessionRow = { ...base(id, back * 7 + 14), template_id: timetableId(row), title, modality_id: mod, teacher_id: tea, room_id: 'room_main', starts_at: iso(startsAt), ends_at: iso(new Date(startsAt.getTime() + m.duration_min * MS.min)), capacity: tenant.studio.mats, booked_count: 0, level: 'all', status: 'completed', cancel_reason: null };
      sessions.push(ses);
      checkIn('usr_cust', ses); mine.add(key); have++;
      // Eight regulars in a fixed rotation keep the class plausible (seven present, one no-show).
      for (let j = 0; j < 8; j++) {
        const uid = customerIds[1 + ((extra * 3 + j * 4) % (customerIds.length - 1))];
        if (bookedDays(uid).has(key)) continue;
        checkIn(uid, ses, j === 7 ? 'no_show' : 'checked_in');
      }
    }
  }

  // Goals: the demo member's current goal (2 / week, six weeks old) over an ended 1 / week she started with (her first
  // week is graded at 1, so the run starts there — analytics.ts rule 8), and six more members for M-12.
  const goals = db.practice_goals as PracticeGoalRow[];
  const goalRow = (id: string, uid: string, target: number, source: PracticeGoalRow['source'], daysAgo: number, active: boolean, note: string | null): PracticeGoalRow => ({ ...base(id, daysAgo), user_id: uid, cadence: 'week', target, source, starts_on: dateKey(addDays(NOW, -daysAgo)), active, note });
  goals.push(goalRow('pgl_cust_1', 'usr_cust', 1, 'member', 77, false, 'Quiero volver a la rutina de la mañana.'));
  goals.push(goalRow('pgl_cust_2', 'usr_cust', 2, 'member', 42, true, 'Dos veces por semana es lo que sostengo.'));
  ([['usr_c02', 1], ['usr_c05', 2], ['usr_c08', 3], ['usr_c11', 2], ['usr_c14', 1], ['usr_c17', 2]] as const).forEach(([uid, target], i) => goals.push(goalRow(`pgl_${uid.slice(4)}`, uid, target, i % 2 ? 'suggested' : 'member', 20 + i * 3, true, null)));

  // The events record for the demo member: goals set, milestones at the visit that reached them, the rest week that saved the streak.
  const events = db.activity_events as ActivityEventRow[];
  const event = (id: string, kind: ActivityEventRow['kind'], occurredAt: string, ref: [string, string] | null, payload: Record<string, unknown>): ActivityEventRow => ({ id, tenant_id: tenant.id, created_at: occurredAt, updated_at: occurredAt, user_id: 'usr_cust', kind, occurred_at: occurredAt, ref_table: ref?.[0] ?? null, ref_id: ref?.[1] ?? null, payload });
  for (const g of goals.filter((x) => x.user_id === 'usr_cust')) events.push(event(`aev_${g.id}`, 'goal.set', g.created_at, ['practice_goals', g.id], { target: g.target, source: g.source }));
  const custStats = practiceStats({ userId: 'usr_cust', bookings, sessions, goals: goals.filter((g) => g.user_id === 'usr_cust'), memberships: memberships.filter((m) => m.user_id === 'usr_cust'), now: NOW });
  const custVisits = bookings.filter((bk) => bk.user_id === 'usr_cust' && bk.status === 'checked_in').map((bk) => ({ bk, ses: sessions.find((x) => x.id === bk.session_id)! })).filter((v) => v.ses && v.ses.status !== 'cancelled').sort((a, b) => a.ses.starts_at.localeCompare(b.ses.starts_at));
  for (const m of custStats.milestonesReached.filter((x) => x <= 10)) { const v = custVisits[m - 1]; events.push(event(`aev_cust_m${m}`, 'milestone', v.ses.starts_at, ['bookings', v.bk.id], { count: m })); }
  for (const week of custStats.streak.savedWeeks) events.push(event(`aev_cust_saved_${week}`, 'streak.saved', iso(new Date(`${addDaysKey(week, 7)}T07:00:00`)), null, { week }));

  return db;
}
