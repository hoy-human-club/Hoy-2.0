import { canvasSpecs } from '../../specs/canvasSpecs';
import { defineSpec } from '../../specs/define';
import { ADMIN_ACTIONS } from './actions';

export const M01 = defineSpec({
  ...canvasSpecs['M-01'],
  layout: ['KPIRow ×4', 'OccupancyChart', 'TodayAtAGlance', 'AuditTrail'],
  data: ['memberships', 'payments', 'class_sessions', 'bookings', 'modalities', 'teachers', 'audit_log', 'users', 'profiles'],
  notes: [...(canvasSpecs['M-01'].notes ?? []), 'Sections are reorderable through useLayout (layout editor D-04).', 'The feature switches moved to M-08b (/admin/settings/features) in 0.5.0; the dashboard no longer writes feature_flags.', 'TodayAtAGlance lists today\'s sessions with occupancy and who is already in the room (bookings.checked_in).'],
});

export const M02 = defineSpec({
  ...canvasSpecs['M-02'],
  // 0031: marketing (content.write) joins; home of the marketing role.
  roles: [...new Set([...canvasSpecs['M-02'].roles, 'marketing' as const])],
  layout: ['ContentSubNav (Catálogo · Artículos · FAQ · Eventos · Medios)', 'EntityTabs (Classes / Teachers / Modalities / Rooms)', 'ListView (DataTable / cards, search, selection, publish toggle)', 'BulkEdit (preview, atomic apply, guarded undo)', 'RecurrencePreview (date range and explicit generation)', 'EditDrawer (fields, ES / EN, publish state)', 'PreviewPane'],
  data: ['class_templates', 'teachers', 'modalities', 'rooms', 'audit_log'],
  notes: [...(canvasSpecs['M-02'].notes ?? []), 'Pricing is not editable here: prices live in src/tenant/pricing.ts (P-01).', 'Publish state = the active column of each table.', 'M-02 is now a family: this page is the catalogue (the four scheduling entities); M-02a…M-02d are articles, FAQ, events and the media library, behind one shared sub-navigation.'],
});

/** M-02 family leaf. Each one keeps M-02's purpose and adds its own layout, data and rules. */
const contentSub = (code: string, name: { es: string; en: string }, purpose: { es: string; en: string }, layout: string[], extra: Partial<typeof M02> = {}) => defineSpec({
  ...canvasSpecs['M-02'], code, name, purpose, layout,
  roles: ['super_admin', 'admin', 'coordinator', 'marketing'],
  notes: [...(canvasSpecs['M-02'].notes ?? []), 'Sub-page of M-02; the sub-navigation is shared by all five.', 'Every write appends an audit_log row through useAudit(\'admin\').'],
  ...extra,
});

export const M02a = contentSub('M-02a',
  { es: 'Contenido · Artículos', en: 'Content · Articles' },
  { es: 'Editor de `content_articles`: título y cuerpo bilingües en markdown con vista previa en vivo, slug, categoría, publicación programada y “publicar ahora”.', en: 'Editor for `content_articles`: bilingual title and markdown body with a live preview, slug, category, scheduled publication and “publish now”.' },
  ['ContentSubNav', 'StatusFilter (todos / publicado / programado / borrador)', 'ArticleTable (título + slug, categoría, estado, fecha, orden)', 'EditDrawer', 'MarkdownEditor ES/EN + preview', 'ScheduleFields (publish_at, sort)', 'PublishNow / Unpublish'],
  {
    data: ['content_articles', 'audit_log'],
    logic: [
      'Status is derived, not stored: published = false is a draft; published = true with a future publish_at is scheduled; otherwise it is live.',
      '“Publish now” sets published = true and clears publish_at in one write, so a scheduled row can be pushed live early.',
      'Slug is lowercase a–z, digits and hyphens; C-13 and C-14/C-15 read the rows by section and sort.',
    ],
    states: ['Loading', 'Empty (no articles)', 'Filter with no matches', 'Draft / scheduled / published', 'Invalid slug', 'Read-only (sin content.write)', 'Unsaved changes'],
    integrations: [],
  },
);

export const M02b = contentSub('M-02b',
  { es: 'Contenido · Preguntas frecuentes', en: 'Content · FAQ' },
  { es: 'Editor de `faq_entries` por secciones: pregunta y respuesta bilingües, orden con ↑/↓, página 1 o 2 y estado de publicación.', en: 'Editor for `faq_entries` by section: bilingual question and answer, ↑/↓ ordering, page 1 or 2 and publish state.' },
  ['ContentSubNav', 'PageFilter (todas / 1 / 2)', 'SectionCard ×n', 'EntryRow (↑ ↓, pregunta, respuesta, publicado)', 'EditDrawer (Q/A, sección, página)', 'AddGroup / AddEntry'],
  {
    data: ['faq_entries', 'audit_log'],
    logic: [
      'Order is the `sort` column and moves one step at a time (↑/↓ swap the two sort values) — keyboard-reachable and impossible to do by accident, unlike drag-and-drop.',
      'group_title, group_lead and page belong to the section: saving them propagates to every sibling row of the same group_key.',
      'A new section is a new group_key with one unpublished entry; C-14 is page 1 and C-15 is page 2.',
    ],
    states: ['Loading', 'Empty', 'First / last entry (arrow disabled)', 'Unpublished entry', 'Read-only', 'New empty section'],
    integrations: [],
  },
);

export const M02c = contentSub('M-02c',
  { es: 'Contenido · Eventos', en: 'Content · Events' },
  { es: 'Publicador de `events`: crear y editar, publicar o despublicar, aforo, precio público y de socio, y las inscripciones ya recibidas.', en: 'Publisher for `events`: create and edit, publish or unpublish, capacity, public and member price, and the RSVPs already received.' },
  ['ContentSubNav', 'StatusFilter', 'EventTable (título, cuándo, inscritos / aforo, precios, estado)', 'EditDrawer (fechas, sala, anfitrión, aforo, precios)', 'Publish / Unpublish / Cancel'],
  {
    data: ['events', 'event_rsvps', 'rooms', 'teachers', 'audit_log'],
    logic: [
      'The RSVP count is event_rsvps rows with status going or attended, plus their guests — it is never stored on the event.',
      'Capacity cannot drop below the RSVPs already taken, and cannot exceed the studio mats (tenant.studio.mats).',
      'Publishing is the only thing that makes an event visible in C-23; cancelling keeps the row and its RSVPs for the refund conversation.',
      'A default price comes from src/tenant/pricing.ts (talleres); member_price_cop = 0 renders as “included”.',
    ],
    states: ['Loading', 'Empty', 'Draft / published / cancelled', 'Sold out (RSVPs = capacity)', 'Capacity below RSVPs: blocked', 'End before start: blocked', 'Delete blocked by RSVPs', 'Read-only'],
    integrations: ['Wompi'],
  },
);

export const M02d = contentSub('M-02d',
  { es: 'Contenido · Biblioteca de medios', en: 'Content · Media library' },
  { es: 'Inventario de archivos con búsqueda, filtros, variantes y estado por uso. El editor de asignaciones conserva los cambios en este navegador hasta conectar el backend.', en: 'Searchable asset inventory with filters, variants and per-placement state. The assignment editor keeps changes in this browser until the backend is connected.' },
  ['ContentSubNav', 'AssetCatalog (search, filters, per-placement states, links)', 'ReadyKPIs (listas / pendientes / video)', 'StatusFilter', 'MediaGrid → MediaCard (marco con proporción, encargo, URL, alt)', 'MarkReady / MarkPending', 'AdvancedFields (slot_key, ratio, kind, credit, label, alt, brief)'],
  {
    data: ['media_assets', 'teachers', 'modalities', 'events', 'audit_log'],
    notes: ['Asset catalog is a build-time file index joined with live provider rows. Source placements are not a claim of production-backend publication. Original files are never edited.'],
    logic: [
      'slot_key is the contract between the table and the components: MediaPlaceholder({slotKey}) renders the URL when status = ready and a branded empty slot otherwise.',
      'A row can only be marked ready with a URL; marking it pending again hides the asset everywhere without deleting the record.',
      'The seed ships one pending row per known slot (class hero 16:9, teacher portrait 4:3, event 4:5, studio tour video 16:9, site hero 21:9, about 4:3, contact map), so the owner reads the page as a to-do list.',
      'HoyOS stores the URL, never the binary: uploads belong to Supabase Storage when it lands.',
    ],
    states: ['Loading', 'Empty', 'Pending slot (ratio + brief)', 'Ready photo', 'Ready video', 'Invalid URL', 'Read-only'],
    integrations: ['Supabase Storage'],
  },
);

export const M04 = defineSpec({
  ...canvasSpecs['M-04'],
  roles: [...new Set([...canvasSpecs['M-04'].roles, 'marketing' as const])], // 0031
  layout: ['TemplateList (audience → priority, trigger, locale, status)', 'Canvas (EmailPreview)', 'VariablePanel + Editor', 'LocaleSwitch ES / EN', 'Versions + TestSend + SendLog'],
  data: ['email_templates', 'message_log', 'audit_log'],
  notes: [...(canvasSpecs['M-04'].notes ?? []), 'body_mjml stores a JSON {es,en} plain-text body until the MJML designer exists.', '0055: the default set is src/data/emailCatalog.ts (95 emails to customers, teachers and the team: 72 from the 2026-10-02 inventories, 23 proposed); the list is filtered by audience and grouped by priority; every email is a suggestion with a note for the admin.', 'Versions are the audit_log rows of the template; rollback restores the before value.', 'Test send writes message_log with payload.test = true.'],
});

export const M05 = defineSpec({
  ...canvasSpecs['M-05'],
  roles: [...new Set([...canvasSpecs['M-05'].roles, 'marketing' as const])], // 0031
  layout: ['AutomationList (trigger → template → delay)', 'PhonePreview (bubble render)', 'TemplateEditor + variables', 'ApprovalStatus (Meta) + QuietHours + OptIn', 'MessageLog'],
  data: ['automations', 'wa_templates', 'message_log', 'profiles', 'users', 'tenants', 'audit_log'],
  notes: [...(canvasSpecs['M-05'].notes ?? []), 'Quiet hours come from M-08 settings (default 21:00–07:00).', 'An automation cannot be enabled while its template is not approved by Meta.'],
});

export const M06 = defineSpec({
  ...canvasSpecs['M-06'],
  roles: [...new Set([...canvasSpecs['M-06'].roles, 'marketing' as const])], // 0031
  layout: ['SegmentRail (all, at risk, new, no classes left, birthdays)', 'MemberList (search, sort)', 'MemberDetail (IdentityHeader → S-06, MetricRow, Tabs: Conversación · Reservas · Pagos · Práctica)', 'Conversación: filter chips Todo / WhatsApp / Email / Notas / Sistema → MessageThread + MessageComposer'],
  data: ['users', 'profiles', 'memberships', 'plans', 'bookings', 'class_sessions', 'payments', 'class_ledger', 'message_log', 'consents', 'audit_log', 'practice_goals'],
  states: [...(canvasSpecs['M-06'].states ?? []), 'Conversación: unread inbound (blue ring) → read on open', 'Composer read-only (no members.write)', 'WhatsApp blocked (unverified number)', 'Quiet hours (queued hint)', 'Sistema filter: events only, no composer'],
  notes: [...(canvasSpecs['M-06'].notes ?? []), 'At risk = person with a live package and no check-in in 21 days (0051: no credits, no membership at launch).', 'Since 0.8.0 the conversation is message_log: inbound and outbound WhatsApp/email (manual, automation, newsletter, system) and internal notes (channel note, direction internal) — never visible to the member. Bookings, payments and consents appear inline as system lines.', 'Sending and notes go through useMessaging() (src/data/comms.ts): audit_log keeps member.message / member.note as a trail without content. Opening the tab marks the member’s inbound rows read.', 'Opening a record writes member.view to audit_log (Ley 1581).', 'Práctica tab (read-only): useMemberPractice(id) — streak (StreakBadge), this week (WeekDots), classes this month / all time, last visit, the active weekly goal and milestones (MilestoneList). Same practiceStats() the member sees in C-27, so the desk and the member never read different numbers.'],
});

export const M07 = defineSpec({
  ...canvasSpecs['M-07'],
  layout: ['FilterBar (range, actor, entity, action)', 'SortableTable (When · Who · Action · Object · Source)', 'DetailDrawer (before / after)', 'ExportButton (CSV)', 'RetentionNotice'],
  data: ['audit_log', 'users', 'profiles', 'user_roles'],
  notes: [...(canvasSpecs['M-07'].notes ?? []), 'Append-only: the page has no write path.'],
});

/**
 * M-08 is now a group of five sub-pages behind one sub-navigation (0.5.0). M-08 keeps the family spec and
 * routes to General; M-08a…M-08e are the leaves. Every group saves one `tenants.settings` section and
 * writes audit_log settings.update with before/after.
 */
const M08 = defineSpec({
  ...canvasSpecs['M-08'],
  layout: ['SettingsSubNav', 'General (M-08a)', 'Features (M-08b)', 'Payments (M-08c)', 'Communications (M-08d)', 'Branding (M-08e)', 'Content (M-08f)', 'Holidays & special hours (M-08g)'],
  data: ['tenants', 'feature_flags', 'rooms', 'modalities', 'teachers', 'legal_documents', 'hours_overrides', 'audit_log'],
  notes: [...(canvasSpecs['M-08'].notes ?? []), 'Stored in tenants.settings (json) via useSettings(); defaults from src/tenant/tenant.ts.', 'S-02 reads lateGraceMin, S-04 reads tax, M-05 reads quietHours.', 'usePolicy() (src/modules/admin/settings.ts) re-renders consumers when a section is saved.', '0018: the owner decisions of ROADMAP §E that are values, not code, live here — contact identity (M-08a), IVA-in-prices, payroll cadence and the teacher rate card (M-08c), public class naming, Respiración as its own class, map provider and which legal versions are published (M-08f).'],
});

const sub = (code: string, name: { es: string; en: string }, purpose: { es: string; en: string }, layout: string[], extra: Partial<typeof M08> = {}) => defineSpec({
  ...M08, code, name, purpose, layout,
  notes: [...(M08.notes ?? []), 'Sub-page of M-08; the sub-navigation is shared by all seven.'],
  ...extra,
});

export const M08a = sub('M-08a',
  { es: 'Ajustes · General', en: 'Settings · General' },
  { es: 'Identidad de contacto (dirección, ciudad, WhatsApp, correo, Instagram, mapa) con su estado “pendiente”, horario de apertura, aforo y políticas: los números que todas las demás pantallas leen.', en: 'Contact identity (address, city, WhatsApp, email, Instagram, map) with its “pending” state, opening hours, capacity and policies: the numbers every other screen reads.' },
  ['SettingsSubNav', 'StudioProfile (contact + map + confirmed per field)', 'OpeningHours (weekly + today line + links to M-08g and M-10a)', 'Capacity', 'Policies', 'IntegrationsPointer (M-10)'],
  { data: ['tenants', 'hours_overrides', 'rooms', 'audit_log'], actions: ADMIN_ACTIONS['M-08a'], logic: ['0041: the weekly hours saved here are the source of truth (D-0016). useOpeningHours() (src/modules/admin/settings.ts) merges them with the M-08g overrides and tenant.ts defaults; the site footer, W-06, C-25, the manual’s {{tenant:hours}}, the website’s LocalBusiness JSON-LD and the Google Business Profile body (M-10a) all read it. The card shows today’s line (todayStatus, America/Bogota) and links to M-08g and M-10a.', 'useContact() (src/modules/admin/settings.ts) is the one reader of address / city / WhatsApp / email / Instagram / map: M-08a first, src/tenant/tenant.ts as the default for every empty field. The site footer, W-06, MapSlot, the legal tokens, the email footer, the customer contact rows and the manual’s {{tenant:contact}} all read it.', 'Confirmation is per field (0036): WhatsApp, address, email and Instagram each have a “confirmed” switch; every consumer labels only the unconfirmed ones as pending (the tenant.ts placeholders are never presented as fact). tenant.ts ships WhatsApp and address confirmed (from the owner, 2026-09-29), email and Instagram pending. A stored pre-0036 `confirmed: true` still confirms all four.'], states: ['Some fields pending (default: email, Instagram)', 'All confirmed', 'Saving', 'Read-only'] },
);
export const M08g = sub('M-08g',
  { es: 'Ajustes · Festivos y horarios especiales', en: 'Settings · Holidays & special hours' },
  { es: 'Excepciones con fecha al horario semanal: festivos cerrados, jornadas con otro horario y eventos. Importa los festivos de Colombia (Ley Emiliani) con un clic, edita cada excepción en un panel y muestra lo que verán los clientes los próximos 30 días.', en: 'Dated exceptions to the weekly hours: closed holidays, days with other hours and events. Imports the Colombian holidays (Ley Emiliani) in one click, edits each exception in a panel and previews what customers will see over the next 30 days.' },
  ['SettingsSubNav', 'PrecedenceNotice', 'Overrides (DataTable + ImportHolidays + Add)', 'Upcoming30Days', 'OverrideDrawer (dates · label ES/EN · closed · times · kind · note)'],
  { data: ['hours_overrides', 'tenants', 'audit_log'], integrations: ['Google Business Profile (specialHours, via M-10a)'], actions: ADMIN_ACTIONS['M-08g'],
    roles: ['super_admin', 'admin', 'coordinator'],
    logic: ['An override covering a date wins over the weekly hours for that date (ranges inclusive; on overlap the narrowest range wins) — effectiveHoursFor() in src/tenant/hours.ts. An open override with empty times keeps the weekly times.', 'Import: colombianHolidays() (src/tenant/holidays.co.ts, Ley 51/1983 with Meeus Easter) for the rest of this year and all of next; each holiday not already present on its date is inserted closed with source colombia. Audit hours.import_holidays with the count.', 'Save / delete write audit_log hours.override.save / hours.override.delete with before and after. hours.write gates every write (admin, super_admin, coordinator).', 'Validation: end ≥ start; when both times are set, close > open; one time without the other is refused; the Spanish label is required.', 'The Google column reads google_synced_at: empty or older than updated_at = pending push. Only the server sets it (no server yet, D-0017).'],
    states: ['Loading', 'Empty (no exceptions yet)', 'Seed: three holidays + one special Saturday', 'Drawer new / edit', 'Validation error', 'Import done (n added) / nothing new', 'Read-only (no hours.write)'],
    notes: [...(M08.notes ?? []), 'Sub-page of M-08 (0041). The weekly hours stay in M-08a; this page never edits them.'] },
);
export const M08b = sub('M-08b',
  { es: 'Ajustes · Funciones', en: 'Settings · Features' },
  { es: 'Interruptores de funciones del estudio y de página (feature_flags), con escritura auditada. Vivían en el panel M-01 hasta 0.5.0.', en: 'Studio and per-page feature switches (feature_flags) with audited writes. They lived on the M-01 dashboard until 0.5.0.' },
  ['SettingsSubNav', 'StudioFeatures', 'FeatureFlagsByPage'],
  { logic: ['features.write gates every switch; without it the toggles render disabled.', 'A-06 and E-04 flags are locked: the demo needs them on.', 'Each flip writes audit_log flag.toggle with before/after.'], states: ['Loading', 'Read-only (sin features.write)', 'Flag bloqueado', 'Guardado'] },
);
export const M08c = sub('M-08c',
  { es: 'Ajustes · Pagos', en: 'Settings · Payments' },
  { es: 'Cuenta de consignación, NIT, IVA (incluido o no en los precios publicados) y resolución DIAN, el entorno de Wompi, y la nómina: cadencia mensual o quincenal, medio de pago, quién firma y la tarjeta de tarifas por modalidad y por profesor.', en: 'Payout account, NIT, IVA (included in published prices or not) and DIAN resolution, the Wompi environment, and payroll: monthly or biweekly cadence, payout method, who signs, and the rate card by modality and by teacher.' },
  ['SettingsSubNav', 'PayoutAccount', 'WompiEnvironment + SecretNotice', 'FiscalIdentity (NIT)', 'TaxAndInvoicing (pricesIncludeIva)', 'Payroll (cadence · payoutMethod · signedBy · withholding) + RateCard (byModality · byTeacher)'],
  { integrations: ['Wompi', 'DIAN e-invoicing'], data: ['tenants', 'modalities', 'teachers', 'audit_log'],
    logic: ['pricesIncludeIva drives splitTax() (S-04), OrderSummary (C-04) and the P-01 “¿Incluye IVA?” card.', 'cadence is programmed both ways: payrollCalc.periodsFor() returns one period per month or two (1–15, 16–end); M-09a generates one run per period, S-03 navigates by period, M-09’s default range follows it (30 d vs 15 d).', 'The rate card is resolved by payrollCalc.rateFor(): teacher override → modality rate → teachers.rate_per_class → 0. Editing a rate changes the S-03 estimate and the next draft; approved and paid runs keep their lines.', 'Every save writes audit_log settings.update with before/after.'],
    states: ['Monthly (default)', 'Biweekly', 'Rate row empty (falls through)', 'Saving', 'Read-only'],
    notes: [...(M08.notes ?? []), 'Sub-page of M-08.', 'Wompi private keys live in server environment variables, never in tenants.settings nor in the browser.'] },
);
export const M08d = sub('M-08d',
  { es: 'Ajustes · Comunicaciones', en: 'Settings · Communications' },
  { es: 'Horas de silencio y nombres de remitente de WhatsApp y email, que M-04 y M-05 usan al enviar.', en: 'Quiet hours and the WhatsApp and email sender names M-04 and M-05 use when sending.' },
  ['SettingsSubNav', 'QuietHours', 'SenderIdentity'],
  { integrations: ['WhatsApp Cloud API', 'Email'] },
);
export const M08f = sub('M-08f',
  { es: 'Ajustes · Contenido', en: 'Settings · Content' },
  { es: 'Decisiones de contenido del owner como ajustes: si Respiración es una clase propia o vive dentro de meditación, qué proveedor de mapa usa el sitio, y qué versiones legales están publicadas.', en: 'The owner’s content decisions as settings: whether Respiración is its own class or lives inside meditation, which map provider the site embeds, and which legal versions are published.' },
  ['SettingsSubNav', 'BreathworkOwnClass', 'MapProvider + MapSlot preview', 'LegalVersions (publish toggle per version)'],
  { data: ['tenants', 'legal_documents', 'media_assets', 'audit_log'], integrations: ['Maps (OSM / Google embed)'],
    logic: ['Classes are always titled by their modality (classDisplay() keeps the session title); the publicNaming switch was retired in 0039 and a stored value is ignored.', 'breathworkOwnClass: visibleModalities() hides the respiracion modality row from W-03, W-07, W-08 and the C-03 filter while it is off; W-08 then prints the “lives inside the guided classes” sentence.', 'mapProvider: MapSlot reads it when no prop is passed — none keeps the site offline-safe.', 'Publishing a legal version flips legal_documents.status and stamps published_at; A-06 shows the newest published version per kind. Each flip writes audit_log legal.publish / legal.unpublish.'],
    states: ['Respiración hidden (default) / shown', 'Map none / osm / google', 'Legal: n of 7 published', 'Read-only'] },
);
export const M08e = sub('M-08e',
  { es: 'Ajustes · Marca', en: 'Settings · Branding' },
  { es: 'Nombre visible del estudio, variante del wordmark e idioma por defecto; la vista previa usa el wordmark real.', en: 'Studio display name, wordmark variant and default language; the preview uses the real wordmark.' },
  ['SettingsSubNav', 'DisplayName', 'WordmarkVariant', 'DefaultLanguage', 'Preview'],
  { notes: [...(M08.notes ?? []), 'Sub-page of M-08.', 'Empty display name falls back to src/tenant/tenant.ts; nothing is hardcoded per studio.'] },
);

/** New code: finance view (revenue, payouts, refunds, invoices). */
export const M09 = defineSpec({
  code: 'M-09',
  name: { es: 'Finanzas', en: 'Finance' },
  purpose: { es: 'Ingresos por producto y método, pagos pendientes, reembolsos, facturas con referencia DIAN y el resumen de la nómina de profesores.', en: 'Revenue by product and method, pending payments, refunds, invoices with the DIAN reference and the teacher-payroll roll-up.' },
  layout: ['KPIRow', 'BalanceCard (Ingresos − Nómina − Gastos = Balance, enlaces a M-09a y M-09c)', 'RevenueByProduct', 'RevenueByMethod', 'PayoutsSummary (M-09a: próxima, por aprobar, pagado en el trimestre)', 'PaymentsList + Refund', 'InvoicesTable (DIAN) + StatusFilter'],
  data: ['payments', 'invoices', 'plans', 'users', 'profiles', 'payroll_runs', 'payroll_lines', 'expenses', 'audit_log', 'tenants'],
  roles: ['super_admin', 'admin', 'finance'],
  logic: [
    'Revenue = approved payments in the selected range grouped by plan and by method.',
    'Refund flips payments.status to refunded and writes audit_log payment.refund; returning the class to the package is a follow-up.',
    'E-invoicing requires a DIAN resolution in M-08; until then the CUFE column shows a badge instead.',
    'The invoice filter is the status of the payment behind the invoice (invoices carry no status of their own).',
    'Ranges are 7 / 15 / 30 / 90 days and all time: 15 days is there because Colombian studios settle biweekly, and it drives both the KPI tiles and the invoice table.',
    'The payouts tiles read payroll_runs: the draft total, the sum of approved-not-yet-paid runs, and runs paid in the last three months.',
    'Balance = approved payments in the range − payroll (every payroll_runs row whose period overlaps the range, at its current total; a draft counts because the classes were taught) − expenses (expenses rows with incurred_on in the range, paid or not). The card links to M-09a and M-09c; nothing on it is written here.',
  ],
  integrations: ['Wompi', 'DIAN e-invoicing'],
  states: ['Loading', 'Empty range', 'No refund permission: action hidden', 'E-invoicing off: notice', 'No draft run yet', 'Negative balance (expenses above revenue in the range)'],
  toggles: [{ label: 'Wompi payouts', on: true }, { label: 'Refunds', on: true }, { label: 'DIAN column', on: true }],
  notes: ['Payouts are real rows now (payroll_runs / payroll_lines); only the Wompi dispersion call is simulated, and the page says so.', 'The balance card (0.6.1) is the answer to “what did the studio spend”: it reads payments, payroll_runs and expenses with the same range chips, so the three numbers always describe one window.'],
});

const PAYOUT_NOTES = [
  'Teachers are paid per class taught: one completed class_sessions row = one payroll_lines row of kind class at teachers.rate_per_class. Bonuses and adjustments are lines finance adds by hand and are never derived.',
  'src/data/payrollCalc.ts is the single arithmetic: the seed (historical runs), M-09a (generate draft) and S-03 (the teacher statement) all use it, so the three screens can never disagree.',
  'A payout is NOT a payments row: payments is money in from members (it feeds M-09 revenue, C-11 history and M-01 KPIs). Money out lives on payroll_runs (status / paid_at / method / provider_ref) with an audit_log row per action.',
  'wompiPayout() in src/modules/admin/payouts.ts is the dispersion seam — simulated today, with the rejected path included; the badge says simulated on both pages.',
];

/** M-09a — the payroll runs list. */
export const M09a = defineSpec({
  code: 'M-09a',
  name: { es: 'Finanzas · Nóminas', en: 'Finance · Payroll runs' },
  purpose: { es: 'Las liquidaciones mensuales de profesores: qué se debe, qué está aprobado y qué ya se pagó, y el botón que genera el borrador del periodo.', en: 'The monthly teacher payroll runs: what is owed, what is approved and what is paid, plus the button that generates the period’s draft.' },
  layout: ['KPIRow (próxima corrida, por aprobar, pagado en el trimestre)', 'GeneratePanel (periodo + generar borrador)', 'RunsTable (periodo, estado, profesores, clases, total, medio, liquidada)', 'SeamNote'],
  data: ['payroll_runs', 'payroll_lines', 'class_sessions', 'bookings', 'teachers', 'special_charges', 'space_bookings', 'audit_log'],
  roles: ['super_admin', 'admin', 'finance'],
  logic: [
    'Generating a draft is idempotent: an existing draft for the same period has its lines deleted and recomputed, so pressing the button twice cannot double-pay. An approved or paid run is refused with a reason.',
    'The draft is class lines + manual lines: every special_charges row with a teacher and a teacher_payout whose service date (its space booking, else the sale) falls in the period becomes one payroll_lines row of kind manual, sourced by special_charge_id (src/data/payrollCalc.ts draftLinesFor). 0017.',
    'payroll.write gates every action; payroll.read is enough to look.',
    ...PAYOUT_NOTES,
  ],
  integrations: ['Wompi'],
  states: ['Loading', 'No runs yet', 'Draft exists for the period: regenerated', 'Period already approved/paid: blocked', 'Read-only (solo payroll.read)'],
  notes: PAYOUT_NOTES,
});

/** M-09b — one run, with the per-teacher statement. */
export const M09b = defineSpec({
  ...M09a,
  code: 'M-09b',
  name: { es: 'Finanzas · Detalle de nómina', en: 'Finance · Payroll run' },
  purpose: { es: 'Una corrida: el extracto por profesor con sus clases, bonos y ajustes, y las cuatro acciones de finanzas — aprobar, enviar por Wompi, marcar pagada por transferencia o efectivo, exportar CSV.', en: 'One run: the per-teacher statement with their classes, bonuses and adjustments, and finance’s four actions — approve, send via Wompi, mark paid by transfer or cash, export CSV.' },
  layout: ['RunHeader (periodo, estado, simulado)', 'KPIRow (total, medio, estado)', 'ActionBar (regenerar · aprobar · Wompi · transferencia · efectivo · CSV · imprimir)', 'Statement → TeacherCard (estado de pago, clases, líneas, subtotal, marcar como pagado)'],
  states: ['Draft: regenerate + approve', 'Approved: pay by Wompi / transfer / cash', 'Approved: one teacher settled, the rest pending', 'Paid: locked, read-only', 'Wompi rejected: reason shown', 'Run not found', 'Negative adjustment line'],
  logic: [
    'A run can be settled teacher by teacher: payroll_lines.paid_at + paid_method carry the stamp, so a bounced transfer for one teacher does not hold the other seven. The run closes itself as paid once every teacher is settled.',
    'Each teacher card shows the classes taught, the total attendance, the payment method and the settlement date — the payment detail finance is asked for on the phone.',
    'A run-level payment stamps every unpaid line with the same date and method, so the two paths can never disagree.',
    ...(M09a.logic ?? []),
  ],
});

const EXPENSE_NOTES = [
  'An expense is neither a payments row (money in from members) nor a payroll row (teacher pay): it lives in expenses / expense_templates and subtracts in the M-09 balance. Mixing it into payments would corrupt every revenue number.',
  'src/data/expenseCalc.ts is the single arithmetic: dueDatesFor() and fixedExpensesFor() are what the seed and the generator both call, so the fixed rows on screen and the ones a button creates cannot disagree.',
  'Generating a period is idempotent: one row per template per due day; a due day that already has its row is skipped (paid or not), nothing is deleted, inactive templates generate nothing. Regenerating never duplicates, and a paid row is never touched.',
  'expenses.write gates every action (finance, admin, super_admin); expenses.read is enough to look. Every write appends an audit_log row through useAudit(\'admin\').',
];

/** M-09c — the expenses ledger. */
export const M09c = defineSpec({
  code: 'M-09c',
  name: { es: 'Finanzas · Gastos', en: 'Finance · Expenses' },
  purpose: { es: 'El libro de gastos del estudio: fijos recurrentes (arriendo, servicios, aseo por quincena…) generados de plantillas con un botón idempotente, variables registrados a mano, pagado y por pagar, por categoría — la tercera pata del balance de M-09.', en: 'The studio’s expenses ledger: recurring fixed costs (rent, utilities, cleaning by the quincena…) generated from templates with one idempotent button, variable costs recorded by hand, paid and to pay, by category — the third leg of the M-09 balance.' },
  layout: ['RangeChips (7 / 15 / 30 / 90 días / Todo, los mismos de M-09)', 'KPIRow (fijos, variables, pagado, por pagar)', 'ByCategory (BarList)', 'AddExpenseForm (tipo, concepto, categoría, valor, fecha, pagado/por pagar, método, proveedor, nota)', 'TemplatesPanel (periodo + generar gastos fijos, tabla de plantillas con activar/desactivar, nueva plantilla)', 'ExpensesTable (fecha, concepto, categoría, tipo, método, valor, estado + marcar pagado)'],
  data: ['expenses', 'expense_templates', 'audit_log'],
  roles: ['super_admin', 'admin', 'finance'],
  logic: [
    'A template falls due on anchor_day of every month; a biweekly template also falls due 15 days later (the Colombian quincena, clamped to the month’s last day). One due day inside the period = one expenses row of kind fixed pointing at the template.',
    'Range = rows whose incurred_on is inside the window, paid or not; “por pagar” is paid_on = null. Marking paid stamps today as paid_on and writes expense.pay to audit_log.',
    'Only an unpaid row can be deleted; a paid row is history and a correction is a new row with a note.',
    ...EXPENSE_NOTES,
  ],
  integrations: [],
  states: ['Loading', 'Empty range', 'No templates yet', 'Generate: n created / all skipped', 'Unpaid row: marcar pagado', 'Paid row: locked', 'Read-only (solo expenses.read)', 'Invalid form (empty concept, zero amount)'],
  notes: EXPENSE_NOTES,
});

const DELETION_NOTES = [
  'A deletion request is a row, never a client-side delete: C-26 (member, signed in), W-09 (public page, no session) and the desk (front_desk channel, by hand in M-03 today) all insert into deletion_requests; this page moves the status and ticks the checklist. The anonymisation itself — profiles and users overwritten, auth user removed, notifications purged, payments and invoices kept under an anonymous id — is a server-side job (Supabase function) once the backend exists; until then the admin performs the steps in M-03 and ticks them here.',
  'Ley 1581 de 2012 gives fifteen business days for a deletion claim; App Store Review 5.1.1(v) and Google Play’s account-deletion policy require the request to be discoverable in-app and (Play) at a public URL. The queue is what proves the studio honoured each one: rows are never deleted.',
];

/** M-11 — the account-deletion queue (0019). */
export const M11 = defineSpec({
  code: 'M-11',
  name: { es: 'CRM · Solicitudes de eliminación', en: 'CRM · Deletion requests' },
  purpose: { es: 'La cola de peticiones de borrar una cuenta: quién la pidió y por dónde, en qué estado va, la lista de anonimización paso a paso, la nota interna y el enlace a la ficha del socio. Admin la mueve de pendiente a en proceso y a hecha; cancelada cierra sin borrar.', en: 'The queue of account-deletion requests: who asked and through which channel, its status, the step-by-step anonymisation checklist, the internal note and the link to the member record. Admin moves it from requested to processing to done; cancelled closes it without deleting.' },
  layout: ['KPIRow (abiertas · en proceso · hechas 90 días)', 'RuleNotice (15 días hábiles, qué se conserva)', 'StatusChips (abiertas / pendiente / en proceso / hecha / cancelada / todas)', 'RequestsTable (fecha + antigüedad, quién, canal, motivo, estado, checklist n/7)', 'RequestDrawer (ficha, enlace a M-06, checklist, nota, acciones)'],
  data: ['deletion_requests', 'users', 'profiles', 'audit_log'],
  roles: ['super_admin', 'admin'],
  logic: [
    'Status flow: requested → processing → done; cancelled from either open state. done and cancelled stamp resolved_at + resolved_by. Each move writes audit_log deletion.<status>; each checklist tick writes deletion.checklist.',
    '“Marcar hecha” is disabled until all seven checklist steps are ticked (profile, contact, notifications, messages, auth, payments, confirm), so a case cannot be closed with the member still identifiable.',
    'A public request (user_id null) shows the email or masked phone and no CRM link; matching it to a member is a human step, noted in the internal note.',
    ...DELETION_NOTES,
  ],
  integrations: ['Supabase Auth'],
  states: ['Loading', 'No open requests', 'Filter with no matches', 'Requested (mover a en proceso)', 'Processing with a partial checklist (hecha disabled)', 'All steps ticked (hecha enabled)', 'Done / cancelled (locked, read-only)', 'Public request without an account', 'Read-only (not admin)'],
  notes: DELETION_NOTES,
});

/** M-10 — Integraciones (0018): one card per external system, non-secret fields ready to fill, a status chip and the dev checklist. */
export const M10 = defineSpec({
  code: 'M-10',
  name: { es: 'Integraciones', en: 'Integrations' },
  purpose: { es: 'Una tarjeta por integración — Wompi, WhatsApp Business, correo, facturación DIAN, mapas, Supabase, Google Business Profile — con los campos no secretos listos para llenar (ids de comercio, número emisor, namespace de plantillas, proveedor, URL del proyecto), un estado simulado · configurado · conectado, el aviso de que las llaves viven en el servidor y la lista de lo que el dev debe terminar.', en: 'One card per integration — Wompi, WhatsApp Business, email, DIAN e-invoicing, maps, Supabase, Google Business Profile — with the non-secret fields ready to fill (merchant ids, sender number, template namespace, provider, project URL), a simulated · configured · connected status, the notice that keys live server-side and the checklist of what the dev must finish.' },
  layout: ['Intro', 'Cards', 'Order'],
  data: ['integrations', 'audit_log'],
  roles: ['super_admin', 'admin'],
  logic: [
    'The integrations table holds one row per key with status, a config json of NON-SECRET fields and notes; the definitions (which fields, which checklist, which secrets exist) live in src/modules/admin/integrationDefs.ts so the seed and the page agree.',
    'Status is moved by hand: simulated (seam only) → configured (ids filled, dev has not wired it) → connected (live). Nothing here performs a connection; the seams (wompiCheckout, wompiPayout, message_log, MockProvider) keep behaving as before until the dev replaces them.',
    'Secrets never enter the table or the browser; the card names the environment variables the dev must set instead.',
    'settings.write gates every save; each save writes audit_log integration.update with key, before and after.',
    'M-09a reads the Wompi row’s status for its “simulado” badge (useIntegrationStatus).',
  ],
  integrations: ['Wompi', 'WhatsApp Business (Meta)', 'Email provider', 'DIAN e-invoicing provider', 'Maps', 'Supabase', 'Google Business Profile'],
  states: ['Loading', 'All simulated (seed)', 'Configured: fields filled, dev pending', 'Connected', 'Dirty card (unsaved)', 'Saved', 'Read-only (no settings.write)'],
  notes: ['0041: the google_business card opens M-10a (its detail page) and its checklist is split into “Platform, once” and “This studio, per location”; the Intro gains a notice that separates outbound secrets (server env, this page) from the inbound developer keys HoyOS issues (D-07).', 'Sections: Intro = title · status counts · keys-live-server-side notice · manual link; Cards = one IntegrationCard per system (body · what is simulated today · fields · filled count · secrets named · checklist · notes · status select · save); Order = the connection order from ROADMAP §B and where each setting lives.', 'Manual chapter 26 is written around this page: what can be promised today and the order in which the systems get connected.', 'The M-08a “Integraciones” section became a pointer to this page in 0018; the old tenants.settings.integrations statuses are superseded by the table.'],
});

/** M-10a — Google Business Profile (0041, D-0017): the hours HoyOS will push, the setup split by who does it, and a manual fallback. */
export const M10a = defineSpec({
  code: 'M-10a',
  name: { es: 'Integraciones · Google Business Profile', en: 'Integrations · Google Business Profile' },
  purpose: { es: 'El horario del estudio en Google Search y Maps. Muestra el estado de la conexión, el cuerpo exacto que HoyOS enviará a la Business Profile API (horario semanal de M-08a + festivos y horarios especiales de M-08g), los pasos separados por quién los hace (plataforma una vez, estudio por sede) y, mientras no hay servidor, copiar el horario para pegarlo a mano.', en: 'The studio’s hours on Google Search and Maps. Shows the connection status, the exact body HoyOS will send to the Business Profile API (M-08a weekly hours + M-08g holidays and special hours), the steps split by who does them (platform once, studio per location) and, while there is no server, copying the hours to paste by hand.' },
  layout: ['Status', 'Preview', 'Setup', 'Fallback'],
  data: ['integrations', 'tenants', 'hours_overrides', 'audit_log'],
  roles: ['super_admin', 'admin'],
  logic: [
    'HoyOS is the source of truth and pushes one way (D-0017): on save in M-08a / M-08g and nightly, the server calls locations.patch with updateMask=regularHours,specialHours and the body toGoogleBusinessHours() builds (src/tenant/hours.ts). Nightly it reads the location back and flags drift; nothing is pulled into HoyOS silently.',
    'Tokens never reach the browser: the OAuth client id / secret are platform env vars; each location’s refresh token is a server secret named per tenant (GOOGLE_BUSINESS_REFRESH_TOKEN_<TENANT>). The integrations row keeps only locationName, accountEmail and placeId.',
    'Status reads the google_business integrations row; “last push” is the newest hours_overrides.google_synced_at, which only the server writes (none yet).',
    'Special hours are one period per date (Google allows endDate at most one day after startDate), so multi-day overrides are expanded; past overrides are left out.',
    'Connect with Google and Push now are Placeholders until the server exists; Copy (JSON and text) and the Google link work today.',
  ],
  integrations: ['Google Business Profile (Business Information API v1, Account Management API)', 'Google OAuth 2.0 (scope business.manage)'],
  states: ['Loading', 'Simulated (seed)', 'Configured (location filled, server pending)', 'Connected', 'No special hours upcoming', 'Copied'],
  actions: ADMIN_ACTIONS['M-10a'],
  notes: ['Sub-page of M-10, linked from the google_business card (“Open”) and from the M-08a Opening hours card.', 'Multi-tenant: the platform steps happen once for every studio on HoyOS; each studio only connects its own location.'],
});

/** M-12 — practice analytics (attendance and retention; no money on this page). */
export const M12 = defineSpec({
  code: 'M-12',
  name: { es: 'Analítica de práctica', en: 'Practice analytics' },
  purpose: { es: 'Cómo va el estudio en asistencia y retención: ocupación, asistencia, no-shows, horarios populares, segunda visita, quién lleva días sin venir, modalidades, profesores, logros para felicitar en persona y paquetes por vencer. Sin cifras de ingresos.', en: 'How the studio is doing on attendance and retention: fill, attendance, no-shows, popular slots, second visit, who has not come in for a while, modalities, teachers, milestones to congratulate in person and packages about to expire. No revenue figures.' },
  layout: ['KPIRow ×4', 'Heatmap', 'Retention', 'AtRiskList', 'ByModality', 'ByTeacher', 'Milestones', 'CreditsExpiring'],
  data: ['bookings', 'class_sessions', 'memberships', 'class_ledger', 'practice_goals', 'profiles', 'users', 'teachers', 'modalities'],
  roles: ['super_admin', 'admin', 'coordinator', 'finance'],
  logic: [
    'Every number comes from studioStats() in src/data/analytics.ts through useStudioStats(range); the page computes nothing itself. Range chips 7 / 30 / 90 days, default 30.',
    'Ocupación (fill) = seats taken (booked + checked_in + no_show) / capacity of completed classes in range.',
    'Asistencia = checked_in / seats taken. No-shows = no_show / seats taken. Cancelaciones tardías = late_cancel / (seats taken + late_cancel).',
    'Miembros activos = distinct users with ≥ 1 check-in in range; nuevos = their first ever check-in falls in range; visitas / semana = check-ins / active members / (range ÷ 7).',
    'Heatmap cell = mean per-class fill of completed classes at that weekday × start hour; rows Lun–Sáb (Dom only when a Sunday class ran), columns = the hours present. 70–85 % healthy, > 90 % add a class, < 60 % for 4 weeks review the slot (research §4).',
    'Segunda visita = members whose first visit was 30–60 days ago and who attended again within 30 days / those members (goal > 60 %).',
    'En riesgo = a live package (or a dormant membership) AND last check-in ≥ 14 days ago; band = largest of 14 / 30 / 60 / 90 ≤ days since. Sorted by days since, descending. Each row opens the M-06 record.',
    'Por profesor = completed classes per teacher: classes, mean attendance (check-ins / classes), fill, no-show rate, new faces (first check-in with that teacher in range), regulars (≥ 3 check-ins with that teacher in range); sorted by classes.',
    'Logros = MILESTONES (1, 5, 10, 25, 50, 100, 250) reached inside the range, newest first, first 8, each linking to M-06.',
    'Paquetes por vencer (0051, was Créditos por vencer) = people with classes left whose package expiry falls within 14 / 7 days (notify at 14 and 7).',
  ],
  integrations: [],
  states: ['Loading (empty tables)', 'Range with no classes held', 'Nobody at risk (EmptyState)', 'No milestones in range', 'No goals set yet', 'Heatmap scrolls inside its card on phones'],
  actions: [
    { id: 'analytics.setRange', label: { es: 'Cambiar el rango', en: 'Change the range' }, intent: { es: 'Muéstrame la analítica de los últimos {range} días', en: 'Show me analytics for the last {range} days' }, params: { range: 'enum:7,30,90' }, permission: 'members.read' },
    { id: 'analytics.openMember', label: { es: 'Abrir la ficha de un miembro', en: 'Open a member record' }, intent: { es: 'Abre la ficha de {userId}', en: 'Open the record of {userId}' }, params: { userId: 'string — users.id (usr_cust)' }, permission: 'members.read' },
  ],
  checkedAt: [390, 1280, 3840],
  notes: [
    'No revenue on this page: ROADMAP §E item 32 (does the coordinator see the monthly revenue KPI) is still open, so M-12 is attendance / retention only and opens for super_admin, admin, coordinator and finance — the same roles as M-01. Money stays in M-09.',
    'Members are never ranked here. The at-risk list is an operational list for the team (who to call), not a leaderboard, and it links to the CRM record.',
    'The per-teacher table is for studio staff only. Teachers see their own numbers against the studio average in S-03 ("Mis números"), never a list of colleagues (research §B).',
    'At-risk here uses the 14 / 30 / 60 / 90 ladder of analytics.ts; the M-06 segment rail still uses its own 21-day rule (useMemberStats) until the two are unified.',
  ],
});

/** 0044 — M-03 table manager, redesigned (views, sidebar, graph). Replaces the raw canvas spec (whose `data` named non-tables). */
export const M03 = defineSpec({
  ...canvasSpecs['M-03'],
  code: 'M-03',
  name: { es: 'Tablas y relaciones', en: 'Tables & relations' },
  purpose: {
    es: 'El gestor de datos del estudio con vistas: cualquier tabla como cuadrícula, lista, galería, tablero, calendario, línea de tiempo o grafo de relaciones, con filtros, orden, agrupación, columnas y vistas guardadas para el equipo. Todo en palabras (los nombres técnicos solo en modo dev), cada referencia abre la fila a la que apunta y el panel de la fila muestra quién la usa.',
    en: 'The studio’s data manager with views: any table as a grid, list, gallery, board, calendar, timeline or relationship graph, with filters, sorts, grouping, columns and views saved for the team. Everything in words (technical names only in dev mode), every reference opens the row it points at and the row panel shows what uses it.',
  },
  layout: [
    'TablesSidebar (expanded · rail · phone sheet): search, Fijadas, Recientes, groups as accordions, row counts, provider footer, reset demo data (in-product confirm)',
    'TableHeader (icon, human title, kind + group badges, description, counts, technical-names toggle in dev mode)',
    'ViewSwitcher (SegmentedControl: Cuadrícula · Lista · Galería · Tablero · Calendario · Línea de tiempo · Grafo) + SavedViewsMenu (pick, save, rename, delete with in-product confirm)',
    'Toolbar (Filtrar · Ordenar · Agrupar / Carriles · Fecha + Hasta (calendar, timeline) · Columnas · Buscar · Exportar · Esquema · Nueva fila) + ActiveFilterChips + ToolPanel',
    'View: GridView (DataTable) | ListView (ListRow) | GalleryView (Card grid) | KanbanView (KanbanBoard) | CalendarTableView (CalendarView: month · week · agenda) | TimelineTableView (TimelineView: day · week · month · quarter, lanes by the group column) | GraphView (RelationGraph, table or row level) | SchemaView',
    'RowDrawer (fields by type, FK pickers by title, ES / EN inputs, Relaciones, Ver en el grafo, delete with in-product confirm)',
  ],
  data: ['table_views', 'any table in src/data/schema.ts (tableRegistry)', 'tenants'],
  roles: ['super_admin', 'finance', 'developer'],
  logic: [
    'One pipeline for every view: rows → filters (AND) → search (display text of the visible columns) → sorts → view. Filters, sorts, groupBy, hidden columns, column order, card fields and the board column live in the view state; “Guardar vista” writes exactly that into table_views.config.',
    'Labels: columnLabel() = ColumnDef.label → the bilingual dictionary in src/data/labels.ts → humanizeName(); tableLabel() = TableDef.label; rowTitle() = titleColumn (Bi json in the current language, a foreign key resolves the referenced row’s title) → the first text column → the id.',
    'Foreign keys render as a chip with the referenced row’s title and open /admin/tables/<table>?id=<id>; the page reads ?id= and opens the row drawer. ?view= makes views linkable, ?focus= centres the row-level graph, ?where=column:value opens a table filtered (the drawer’s Relaciones links use it).',
    'Relations come from ColumnDef.references (src/data/relations.ts): outgoing = the columns of this table, incoming = columns elsewhere pointing here, with reverse names “<table> · <column>”. tenant_id is left out of the graph.',
    'Graph: all tables coloured by group tone, FK arrows, the open table ringed with its neighbours (“Solo vecinos” keeps only them), layout by layoutGraph() (seeded force-directed, identical on every render). Row level: the row in the centre, the rows it points at on the right, the tables pointing at it on the left with counts.',
    'Kanban: one lane per value of an enum / boolean column (default status); a drag of the grip or the “Mover a…” menu writes data.update(table, id, { column: value }). Read-only without tables.write.',
    'Technical names (snake_case) show only as a quiet mono line when dev mode is on and the toggle is on (default on in dev mode). Sensitive columns (api_keys.key_hash) are hidden from roles without tables.write.',
    'Per-viewer conveniences (sidebar state, open groups, pinned, recent, technical names) persist in localStorage hoyos.tables.prefs; saved views are shared rows in table_views.',
    'Calendar and timeline (0046) place rows by the view’s date column (config.dateColumn, default dateColumnOf: the first date / timestamp column) and end column (config.endColumn, default endColumnOf: starts_at → ends_at, start_date → end_date, period_start → period_end, then end_* / *_until / expires_at); the toolbar’s Fecha / Hasta selects change them and saved views keep them. Both are disabled (with a hint) for tables without a date column of their own.',
    'Calendar: month (Monday first, up to three chips a day and “+N más” → the day’s list), week (all-day strip and hour rows from the first to the last timed row, overlapping chips side by side, a now line) and agenda (30 days from the cursor, grouped by day; the default under 768 px). Clicking an empty day (or a free hour in the week) with tables.write inserts a row with the date prefilled and opens the drawer. Chip tone: the row’s tone → the tone of the row it points at (a class’s modality) → toneForStatus(status); cancelled / expired rows are dimmed.',
    'Timeline: bars from the date column to the end column (a diamond when there is no end) on a day · week · month · quarter axis, lanes by the view’s groupBy (teacher, room, status…) with sticky labels, a today line, scroll with snap; below 768 px one lane with the group as a chip on each bar. Bars open the row; moving a row’s dates is not a timeline gesture.',
    'URL: ?view=calendar|timeline, ?date=YYYY-MM-DD (the cursor; absent = today when the period around today has rows, otherwise the nearest row), ?mode=month|week|agenda, ?zoom=day|week|month|quarter. The mode and zoom also go into the view state, so “Guardar vista” keeps them.',
    'Saved views: the views menu renames (inline field) and deletes (in-product confirm) a view; only its creator or a role with tables.write.',
  ],
  integrations: ['DataProvider (MockProvider today, SupabaseProvider later): list / peek / insert / update / remove / subscribe'],
  states: ['No table picked (overview of every group)', 'Grid · List · Gallery · Board · Graph (table level) · Graph (row level)', 'Filtered to no rows', 'Sidebar expanded / rail / phone sheet', 'Search with no matching table', 'Row drawer (edit) / read-only for finance and developer', 'Delete confirm (in-product)', 'Reset demo data confirm', 'Board without an option column', 'Calendar month · week · agenda', 'Calendar empty period (jump to the previous / next row)', 'Timeline day · week · month · quarter, with lanes', 'Timeline, phone (one lane, group chips)', 'Calendar / timeline disabled (no date column)', 'Saved view rename / delete confirm', 'Technical names on (dev mode)'],
  toggles: [{ label: 'Technical names (dev mode)', on: true }, { label: 'Neighbours only (graph)', on: false }],
  actions: ADMIN_ACTIONS['M-03'],
  checkedAt: [390, 768, 1280, 1920, 3840],
  notes: [
    '0044 redesign (Justin: “looks like it’s only for developers… Airtable, Notion are baseline… I also like graph views”). The canvas layout (EntityGrid / RelationMap / MigrationLog) is superseded by the views above; the relation map is the graph view.',
    'Column labels come from the dictionary until a later pass fills ColumnDef.label per column (Sonnet, mechanical).',
    '0046 (Justin: “it looks like the other views aren’t wired. Finish it up please”): calendar and timeline built as the CalendarView / TimelineView organisms; saved views can be renamed and deleted.',
  ],
});
