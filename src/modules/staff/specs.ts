import { canvasSpecs } from '../../specs/canvasSpecs';
import { defineSpec } from '../../specs/define';

/** S-01 role home — live numbers and the two counter actions. */
export const S01 = defineSpec({
  ...canvasSpecs['S-01'],
  layout: ['RoleBadge + KPIRow (arrivals · shifts · payments · unread messages)', 'NextClassCard', 'TodayList', 'QuickActions (check-in · register · rooms S-05 · inbox S-06)', 'RecentMessages (latest conversations → S-06)', 'AuditNotice (recent activity)'],
  data: ['class_sessions', 'bookings', 'waitlist', 'payments', 'message_log', 'users', 'profiles', 'audit_log', 'teachers'],
  notes: [...(canvasSpecs['S-01'].notes ?? []), 'Live: subscribes to bookings and class_sessions through useTable.', 'Unread = message_log rows with direction inbound and read_at null (useUnreadInbound); the card lists the five latest conversations, unread first.'],
});

/** S-02 door / check-in — sections are the layout-editor keys. */
export const S02 = defineSpec({
  ...canvasSpecs['S-02'],
  // Canvas audit #26: no scanner — the door is a person with a search box, so the scan API and face templates are dropped.
  api: (canvasSpecs['S-02'].api ?? []).filter((a) => !/scan|face/i.test(a)),
  logic: (canvasSpecs['S-02'].logic ?? []).filter((l) => !/face.template/i.test(l)),
  layout: ['TodayStrip (now / next / later)', 'MemberSearch + CapacityMeter', 'RosterList (expected / checked in / waitlist)', 'TeachersInToday', 'QuickSell (walk-in)'],
  data: ['class_sessions', 'bookings', 'waitlist', 'users', 'profiles', 'memberships', 'plans', 'teachers', 'modalities', 'audit_log', 'tenants'],
  states: [...(canvasSpecs['S-02'].states ?? []).filter((s) => !/scan/i.test(s)), 'No classes today: empty strip', 'Loading roster', 'No permission: roster read-only', 'Future-session booking on behalf of a customer', 'Confirmed balance and expiry preview', 'Pending-only / frozen / expired / insufficient balance blocks booking', 'Attendance commit failure with no partial booking/audit', 'Undo unavailable with visible policy-confirmation explanation'],
  notes: [...(canvasSpecs['S-02'].notes ?? []), 'Late = checked in after starts_at + policies.lateGraceMin (M-08).', 'Keyboard: / focuses search, Enter checks in the first expected match, Esc clears.', 'Capacity comes from the session row (seeded from tenant.studio.mats).', 'RC-02: eligible reception attendance and its audit commit together in the mock adapter with same-intent replay; no entitlement debit. Existing after-start restore restriction remains; the disabled control explains the unresolved attendance-correction policy. No new no-show undo is enabled.', 'RC-04/05: bookWithPackage inside the isolated mock atomic adapter allocates one ledger debit and booking; attendance updates never debit twice. Production requires server transactions.'],
});

/** S-04 register & take payment. */
export const S04 = defineSpec({
  ...canvasSpecs['S-04'],
  layout: ['Step1 · Who (new / existing)', 'Step2 · What (pricing.ts)', 'Step3 · How they pay', 'SummaryRail (IVA + total)', 'Receipt'],
  data: ['users', 'profiles', 'user_roles', 'consents', 'payments', 'invoices', 'memberships', 'class_ledger', 'bookings', 'class_sessions', 'message_log', 'audit_log', 'tenants'],
  states: [...(canvasSpecs['S-04'].states ?? []), 'No permission: form read-only', 'Selected customer trial assessment loading/read error/retry', 'Repeated/active-package trial unavailable; ambiguous history pauses fictional trial only', 'Fresh staged trial guard including pending link', 'Sale complete: receipt view', 'Capacity / duplicate / pending check-in rejected with entire sale rolled back', 'Storage or injected write failure: no partial user, consent, payment, invoice, ledger or booking'],
  notes: [...(canvasSpecs['S-04'].notes ?? []), 'Ordinary mapped fictional sales use reviewed dated local catalog snapshots; baseline pricing.ts before any publication. Special/private pricing stays separate; IVA from M-08 tax settings. Submitted price/terms never reprice later.', 'Wompi link is a placeholder: payment stays pending until the gateway confirms.', 'RC-10: entire fictional sale is staged, persisted once and deduplicated by a browser-local transaction receipt. No actual messaging/payment dispatch. Pending sales never activate classes or check in.'],
});

/** S-05 rooms — the day of every room; classes and space bookings side by side (Especiales, 0017). */
export const S05 = defineSpec({
  code: 'S-05',
  name: { es: 'Salas y reservas de espacio', en: 'Rooms & space bookings' },
  purpose: { es: 'Ver cada sala por día con sus clases y sus reservas de espacio, reservar una ventana para un evento privado, alquiler, clase privada, mantenimiento o bloqueo, y confirmar, cancelar o cerrar la reserva.', en: 'See every room by day with its classes and space bookings, book a window for a private event, rental, private class, maintenance or a block, and confirm, cancel or close the booking.' },
  layout: ['DateStrip', 'DayGrid', 'BookingForm', 'Selected', 'UpcomingList'],
  data: ['rooms', 'class_sessions', 'space_bookings', 'special_charges', 'teachers', 'modalities', 'users', 'profiles', 'audit_log'],
  roles: ['super_admin', 'admin', 'coordinator', 'front_desk'],
  logic: [
    'A room is taken by a scheduled class or by a space booking that is not cancelled; two windows conflict when they overlap for more than zero minutes (src/modules/staff/rooms.ts findConflicts). The form refuses an overlapping window and lists what is in the way.',
    'Statuses: held (quoted, no deposit — dashed block) → confirmed → done; cancelled at any point frees the room. Each transition writes an audit_log row (space_booking.<status>).',
    'Booking and charging are two acts: "Cobrar" opens S-04 with ?booking=<id>, which sells an Especial and links it back (special_charge_id) while confirming the booking. S-04 can also create the booking inside the sale.',
    'A teacher on a booking is paid through the Especial (special_charges.teacher_payout → payroll_lines kind manual), never here.',
    'bookings.write_any gates every write; the rest of the page is read-only for other staff.',
  ],
  integrations: [],
  states: ['Loading', 'No rooms', 'Empty day', 'Day with classes only', 'Held / confirmed / done / cancelled blocks', 'Cancelled hidden by default (toggle)', 'Conflict: CTA disabled with the list of what overlaps', 'Read-only (no bookings.write_any)', 'Selected class → open check-in', 'Selected booking → confirm / done / cancel / charge'],
  notes: ['Sections: DateStrip (14 days + any date) · DayGrid (rooms × hours: class_sessions + space_bookings) · BookingForm (kind, room, window, title, who, teacher, note, conflict check) · Selected (status actions, Cobrar → S-04) · UpcomingList.', 'Rooms come from the rooms table (seed: Sala principal + Sala de meditación); the grid draws as many columns as there are rows.', 'The hour range widens to fit the blocks; 06–21 is only the display default, not a studio fact.'],
});

/** S-06 front-desk inbox — every customer conversation (WhatsApp, email, notes) in one WhatsApp-style view (0.8.0). */
export const S06 = defineSpec({
  code: 'S-06',
  name: { es: 'Bandeja de mensajes', en: 'Message inbox' },
  purpose: { es: 'Ver quién escribió al estudio, responder por WhatsApp o email desde la misma pantalla, dejar notas internas y saltar a la ficha CRM de la persona. Una conversación por persona, con lo entrante, lo saliente, lo automático y las notas del equipo en un solo hilo.', en: 'See who wrote to the studio, reply by WhatsApp or email from the same screen, leave internal notes and jump to the person’s CRM record. One conversation per person, with inbound, outbound, automated and staff notes in a single thread.' },
  layout: ['ConversationList (search · Todos / No leídos / WhatsApp / Email · unread first)', 'ThreadHeader (avatar, plan, masked phone, WhatsApp verified, → M-06)', 'MessageThread (day separators, bubbles, email cards, notes)', 'MessageComposer (WhatsApp · Email · Nota)'],
  data: ['message_log', 'users', 'profiles', 'memberships', 'plans', 'tenants', 'audit_log'],
  roles: ['super_admin', 'admin', 'coordinator', 'front_desk'],
  logic: [
    'A conversation is every message_log row with the same user_id, ordered by sent_at (or created_at); test sends from M-04/M-05 (payload.test) are excluded (src/data/comms.ts useConversations).',
    'Unread = inbound rows with read_at null. Opening a thread writes read_at / read_by on all of them (markConversationRead) — that is the team’s read receipt, and what empties the bell, S-01 and the list badge.',
    'Sending goes through useMessaging(): WhatsApp and email insert an outbound row (source manual, sent_by = the signed-in user) and an audit_log member.message; a note inserts an internal row (channel note) plus member.note without its content.',
    'WhatsApp status is queued during quiet hours (M-08 quietHours) and sent otherwise; the composer says so. Email ignores quiet hours. A member whose number is not verified cannot receive WhatsApp: the tab stays, the box is disabled with the reason.',
    'members.write gates the composer; other desk roles read the thread. members.read gates the “Ver ficha CRM” button.',
    'Rows with user_id null (a teacher’s substitution request) belong to the team, not to a customer, and are not listed here.',
  ],
  integrations: ['WhatsApp Cloud API (simulated: inbound rows arrive by webhook into message_log)', 'Email provider (simulated: same table, channel email)'],
  states: ['Loading', 'No conversations', 'None selected (“Elige una conversación”)', 'All read', 'Thread with unread inbound (blue ring)', 'Filtered / searched list, no match', 'Read-only composer (no members.write)', 'WhatsApp blocked (unverified number)', 'Quiet hours (queued hint)', 'Thread not found (old link)', 'Narrow: list, then thread (≤ 900 px)'],
  notes: ['Route /staff/inbox lists; /staff/inbox/:id selects. The URL is the selection so the bell, S-01 and M-06 can deep-link.', 'The same three components (MessageThread, ChatBubble, MessageComposer) render the Conversación tab of M-06.', 'Every capture reseeds, so the six unread demo messages are always there at first load.'],
});
