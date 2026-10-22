import { canvasSpecs } from '../../specs/canvasSpecs';
import { defineSpec } from '../../specs/define';

const base = canvasSpecs['S-03'];
const data = ['teachers', 'class_sessions', 'bookings', 'modalities', 'users', 'profiles', 'audit_log'];

/** S-03 teacher home. */
export const S03 = defineSpec({
  ...base,
  layout: ['NextClassCard', 'PayrollTile', 'MyNumbers (30 días: own fill, attendance, no-shows, new faces, regulars, first-timer return, rating vs studio average)', 'TodayClasses (roster count)', 'Specials (own space_bookings, S-05)', 'ScheduleList (week)', 'SubstitutionRequest'],
  data: [...data, 'space_bookings', 'special_charges', 'rooms', 'reviews', 'memberships', 'class_ledger', 'practice_goals', 'message_log'],
  roles: ['teacher', 'coordinator', 'admin', 'super_admin'],
  states: ['Own schedule / current week', 'Substitute choices loading', 'Scoped read failure / retry', 'No eligible class', 'Draft reason / no writes', 'Saving / immediate duplicate guard', 'Atomic write failure / same-request retry', 'Cancelled/unmounted/context changed / no late drawer reopen', 'Local queued result / no delivery', 'Class reassigned / stale request rejected'],
  logic: ['Existing schedule, own statistics and payroll remain unchanged; launch attendance stays read-only.', 'The existing scheduled/not-ended/next-seven-day substitute choices are read without roster or colleague details; eligibility is rechecked with the current clock inside the mock transaction.', 'One fictional atomic operation saves the existing substitution audit plus queued team message; safe receipts support retry/replay without duplicate effects.', 'Cancel, unmount and account-context changes suppress stale UI; a committed local request is not undone by later cancellation.', 'No WhatsApp delivery, substitution approval or scheduling change occurs. Owner contact/channel/notice decisions and authenticated outbox remain separate.'],
  checkedAt: [390, 768, 1280, 1920, 3840],
  notes: [...(base.notes ?? []), 'Mobile-first inside AppShell (column + dock below 900 px; from 900 px a --w-teach column of 60rem with the top-bar nav, 0026).', 'Batch26: substitution.request audit and the existing coordinator-tagged queued team message commit together in the fictional browser mock. No real message is sent; real service/owner acceptance remains pending.', 'MyNumbers reads teacherStats(me, 30) and studioStats(30) from src/data/analytics.ts: the teacher sees only their own numbers against the studio average, never a ranked list of colleagues (research §B; the per-teacher table is M-12, staff only). The rating stays hidden until 5 reviews in the range (research §3). "Solo tú y coordinación ven estos números."'],
});

/** /teach/class/:id — roster (read-only: check-in is at reception, 0051), reviews, notes. */
export const S03Class = defineSpec({
  ...base,
  name: { es: 'Clase · lista', en: 'Class · roster' },
  purpose: { es: 'Ver quién viene y quién ya llegó (recepción hace el check-in), cerrar la clase y dejar notas.', en: 'See who is coming and who has arrived (the front desk checks people in), close the class and leave notes.' },
  layout: ['ClassHeader', 'CheckinAtReceptionNote + CloseClass', 'RosterSheet (read-only, live)', 'ReviewSummary (read-only)', 'ClassNotes'],
  data: [...data, 'reviews'],
  states: ['Before start: roster only', 'After start: Close class (own class, or coordinator override)', 'Completed', 'Class not found', 'Ownership loading', 'Foreign / missing link / cross-tenant denied before detail mount', 'Contained read error / Retry', 'Reassignment revokes details and rejects stale writes'],
  notes: ['PF-01: tenant-scoped ownership gate precedes roster/reviews/notes reads. Teachers cannot use a stored preview pick. Admin/coordinator previews retained; server authorization remains backend work.', '0051 (studio FAQ): check-in happens only at reception (S-02 writes bookings.status checked_in); the teacher sees the roster update live and does not mark attendance. Closing the class sets class_sessions.status completed; no-shows are settled by the front desk.', 'Notes are audit_log rows (action session.note) so they appear in M-07.', 'Reviews are read-only here: the average, count and tags of the `reviews` rows for this session (C-10). Anonymous reviews never show who wrote them.'],
});

/** /teach/payroll — the teacher's own statement, from payroll_runs / payroll_lines. */
export const S03Payroll = defineSpec({
  ...base,
  name: { es: 'Nómina', en: 'Payroll' },
  purpose: { es: 'El extracto del profesor: clases dictadas × tarifa del mes, el desglose por clase y el historial de corridas.', en: 'The teacher’s statement: classes taught × rate for the month, the per-class breakdown and the run history.' },
  layout: ['MonthPicker', 'RunStateCard (borrador / aprobada / pagada / estimado)', 'SummaryTiles (clases, tarifa, total)', 'Breakdown (fecha, clase, asistentes, monto)', 'ExtrasLines (bono, ajuste, Especial)', 'PayoutMethodCard', 'RunHistory', 'PrintStatement'],
  data: ['payroll_runs', 'payroll_lines', 'special_charges', 'teachers', 'class_sessions', 'bookings', 'class_templates', 'payment_methods', 'tenants'],
  integrations: ['Wompi'],
  logic: [
    'Before finance generates the run, the month is computed live from completed sessions × teachers.rate_per_class (src/data/payrollCalc.ts) and labelled as an estimate.',
    'Once a payroll_runs row covers the period, the page reads payroll_lines instead — so what the teacher sees is what finance will pay, bonuses and adjustments included.',
    'A line of kind manual is a teacher payout agreed on an Especial (special_charges.teacher_payout, S-04); it prints as "Especial: <concept>" here and in M-09b (0017).',
    'A substitution is a session whose template teacher differs from the session teacher; it is a badge, not a different rate.',
    'The payout method on file comes from payment_methods for the teacher’s user; the method of the run itself is shown next to it.',
    '0051: the “Ask about this statement” WhatsApp option was removed at the studio’s request; questions about payroll go to finance directly.',
  ],
  states: ['Estimate (no run yet)', 'Draft run', 'Approved run', 'Paid run (with date)', 'No classes this month', 'Substitutions present', 'Negative adjustment', 'No payout method on file', 'Not linked to a teacher profile'],
  notes: [
    'Read-only by design: only finance writes payroll (M-09a/M-09b).',
    'The Wompi dispersion is simulated (wompiPayout() in src/modules/admin/payouts.ts); the page says so instead of pretending money moved.',
  ],
});

/** /teach/profile — public profile editor. */
export const S03Profile = defineSpec({
  ...base,
  name: { es: 'Mi perfil', en: 'My profile' },
  purpose: { es: 'Foto, bio en dos idiomas y especialidades; los cambios pasan por coordinación.', en: 'Photo, bilingual bio and specialties; changes go through the coordinator.' },
  layout: ['PhotoAndName', 'BioEditor ES / EN', 'Specialties', 'RateReadOnly'],
  data: ['teachers', 'modalities', 'audit_log'],
  states: ['Saved: sent for review', 'Not linked to a teacher profile'],
  notes: ['Edits update teachers and write audit_log teacher.profile.submit.'],
});
