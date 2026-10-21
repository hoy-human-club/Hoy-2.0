/**
 * The hub map's hand-written half — PURE data, no React, no JSX, no runtime imports, so plain node
 * can load it (`node --experimental-strip-types`) as well as Vite.
 *
 * One source of truth for what the hub shows: HUB-01 (`src/modules/hub/HubPage.tsx`) renders its
 * bands and tool row from these arrays and its card / tool strings are derived from them
 * (`src/modules/hub/strings.ts`), and `scripts/gen-hub-map.mjs` joins them with the route registry
 * into `public/hub-map.json` (contract: `./hubMap.types.ts`, `docs/reference/hub-map.md`).
 *
 * Role facts (labels, homes, demo first names) are duplicated from `src/auth/roles.ts` and
 * `src/auth/demoUsers.ts` because those files are imported without extensions elsewhere and this file
 * must stay import-free; `checkHubMapData()` in `./hubMap.check.ts` (dev) and the generator (every
 * build) fail loudly when the copies drift.
 */
import type { Bi, HubBand, HubDevice, HubExperience, HubGroup, HubLensHint, HubLensId, HubRole } from './hubMap.types';

export const HUB_MAP_SCHEMA = 'hoy.hub-map/1' as const;
/** Where the product is published (GitHub Pages). Every URL in the map is relative to it. */
export const HOY_BASE_URL = 'https://imagine-os.github.io/hoy/';
/** The testing hub's own route. */
export const HUB_ROUTE = '/hub';
/** The published file, relative to the base URL. */
export const HUB_MAP_FILE = 'hub-map.json';
/** Where the build copies the captures the map points at, relative to the base URL. */
export const HUB_SHOTS_DIR = 'hub-map/shots';

/** Exactly what `frameUrl()` (src/app/frameSession.ts) builds for a preview iframe, as a template. */
export const EMBED_PATTERN = '{baseUrl}#{route}?as={role}&lang={lang}&theme={theme}&dev=0&live=0';
export const EMBED_NOTE: Bi = {
  es: 'Sustituye {baseUrl}, {route} (una ruta de experiences[] o pages[]; para una página usa sampleRoute ?? route: un segmento :id es una plantilla y sampleRoute ya trae un registro real), {role} (un id de roles[]), {lang} (es | en) y {theme} (light | dark), y carga la URL en un iframe. Dentro del iframe la app corre como el usuario demo de ese rol sin tocar la sesión de quien la mira; live=0 apaga las vistas previas anidadas. Mismo origen solo en imagine-os.github.io.',
  en: 'Substitute {baseUrl}, {route} (a route from experiences[] or pages[]; for a page use sampleRoute ?? route: a :id segment is a template and sampleRoute already opens a real record), {role} (an id from roles[]), {lang} (es | en) and {theme} (light | dark), and load the URL in an iframe. Inside the frame the app runs as that role’s demo user without touching the viewer’s own session; live=0 turns nested previews off. Same-origin only on imagine-os.github.io.',
};

export const HOY_PRODUCT: { id: 'hoy'; name: Bi; tagline: Bi; accent: string; wordmark: string } = {
  id: 'hoy',
  name: { es: 'HoyOS', en: 'HoyOS' },
  // Also the hub hero's lead (`hub.lead`).
  tagline: {
    es: 'Un solo sistema para cada puesto del estudio: quien practica, quien enseña, quien recibe en la puerta, quien administra y quien lo construye.',
    en: 'One system for every seat at the studio: members, teachers, front desk, admin, and the people who build it.',
  },
  accent: '#35597D', // D-01 brand.deepBlue (src/design/tokens.ts) — checked by the generator
  wordmark: 'brand/hoy-blue.png',
};

/** Every role, outside-in: who practises, who visits, who teaches, then the team, then who builds. */
export const HUB_ROLES: HubRole[] = [
  {
    id: 'customer', label: { es: 'Cliente', en: 'Customer' },
    description: { es: 'Quien practica: reserva, paga y lleva su paquete de clases y su historial desde el teléfono.', en: 'Whoever practises: books, pays and keeps their class package and history on the phone.' },
    band: 'outside', home: '/app', device: 'phone', demoUser: { id: 'usr_cust', firstName: 'Juliana' }, look: 'customer', props: ['phone', 'rating'],
  },
  {
    id: 'public', label: { es: 'Público', en: 'Public' },
    description: { es: 'Cualquiera sin sesión: el sitio web, las clases, los planes y el contacto.', en: 'Anyone not signed in: the website, the classes, the plans and contact.' },
    band: 'outside', home: '/site', device: 'page', look: 'public', props: ['tablet', 'book'],
  },
  {
    id: 'teacher', label: { es: 'Profesor/a', en: 'Teacher' },
    description: { es: 'Enseña: sus clases, la lista de asistentes, la asistencia desde el mat y su nómina.', en: 'Teaches: their classes, the roster, attendance from the mat and their payroll.' },
    band: 'outside', home: '/teach', device: 'phone', demoUser: { id: 'usr_teach', firstName: 'Carolina' }, look: 'teacher', props: ['phone', 'clipboard'],
  },
  {
    id: 'front_desk', label: { es: 'Recepción', en: 'Front desk' },
    description: { es: 'La puerta del estudio: check-in, la bandeja de mensajes y la caja.', en: 'The studio’s door: check-in, the message inbox and the register.' },
    band: 'team', home: '/staff', device: 'desktop', demoUser: { id: 'usr_desk', firstName: 'Camilo' }, look: 'frontdesk', props: ['stamp', 'keys'],
  },
  {
    id: 'coordinator', label: { es: 'Coordinación', en: 'Coordinator' },
    description: { es: 'Coordina el horario, los profesores y las comunicaciones, y lleva el CRM.', en: 'Runs the schedule, the teachers and communications, and owns the CRM.' },
    band: 'team', home: '/staff', device: 'desktop', demoUser: { id: 'usr_coord', firstName: 'Valentina' }, look: 'coordinator', props: ['board', 'clipboard'],
  },
  {
    id: 'finance', label: { es: 'Finanzas', en: 'Finance' },
    description: { es: 'Ingresos, gastos, nómina de profesores e impuestos, con el libro detrás.', en: 'Revenue, expenses, teacher payroll and tax, with the ledger behind it.' },
    band: 'team', home: '/admin', device: 'desktop', demoUser: { id: 'usr_fin', firstName: 'Laura' }, look: 'finance', props: ['calculator', 'contract'],
  },
  {
    id: 'admin', label: { es: 'Administración', en: 'Admin' },
    description: { es: 'El dueño del estudio: el panel, los ajustes, el contenido, las tablas y el manual.', en: 'The studio owner: the dashboard, settings, content, tables and the manual.' },
    band: 'team', home: '/admin', device: 'desktop', demoUser: { id: 'usr_admin', firstName: 'Mateo' }, look: 'admin', props: ['laptop', 'keys'],
  },
  {
    id: 'super_admin', label: { es: 'Super admin', en: 'Super admin' },
    description: { es: 'Quien construye el sistema: ve todo, incluido el modo dev, y puede ver como cualquier rol.', en: 'Whoever builds the system: sees everything, dev mode included, and can view as any role.' },
    band: 'build', home: '/admin', device: 'desktop', demoUser: { id: 'usr_super', firstName: 'Sofía' }, look: 'superadmin', props: ['laptop', 'plans'],
  },
  {
    id: 'maintenance', label: { es: 'Mantenimiento', en: 'Maintenance' },
    description: { es: 'Salas, incidencias e inventario, desde el panel del equipo.', en: 'Rooms, incidents and inventory, from the team dashboard.' },
    band: 'team', home: '/staff', device: 'desktop', demoUser: { id: 'usr_maint', firstName: 'Rosa' }, look: 'maintenance', props: ['hardhat', 'tape'],
  },
  // 0031 · two new roles
  {
    id: 'marketing', label: { es: 'Marketing', en: 'Marketing' },
    description: { es: 'Contenido, campañas y la voz de la marca: el CMS, los correos y WhatsApp, y el CRM en lectura. El kit de marketing llega pronto.', en: 'Content, campaigns and the brand voice: the CMS, emails and WhatsApp, and the CRM read-only. The marketing kit is coming soon.' },
    band: 'team', home: '/admin/content', device: 'desktop', demoUser: { id: 'usr_mkt', firstName: 'Camila' }, look: 'marketing', props: ['board', 'swatches'],
  },
  {
    id: 'developer', label: { es: 'Desarrollo', en: 'Developer' },
    description: { es: 'Quien construye y mantiene el software: herramientas dev, specs, tablas en lectura y la documentación, con modo dev; sin ajustes ni finanzas.', en: 'Whoever builds and maintains the software: dev tools, specs, read-only tables and the docs, with dev mode; no settings or finance.' },
    band: 'build', home: '/dev', device: 'desktop', demoUser: { id: 'usr_dev', firstName: 'Julián' }, look: 'developer', props: ['laptop', 'plans'],
  },
];

/** The sub-mats. `order` sorts the groups inside one experience; ids are stable, labels are copy. */
export const HUB_GROUPS: Record<string, HubGroup> = Object.fromEntries(([
  ['book', 'Reservar', 'Book', 10], ['pay', 'Pagar', 'Pay', 20], ['account', 'Cuenta', 'Account', 30], ['auth', 'Entrar', 'Sign in', 40],
  ['site', 'Sitio', 'Website', 10], ['coming-soon', 'Próximamente', 'Coming soon', 10],
  ['teach', 'Enseñar', 'Teach', 10],
  ['desk', 'Recepción', 'Front desk', 10], ['inbox', 'Bandeja', 'Inbox', 20], ['pos', 'Caja', 'Register', 30],
  ['admin', 'Administración', 'Admin', 10], ['content', 'Contenido', 'Content', 20], ['crm', 'CRM', 'CRM', 30], ['messages', 'Mensajes', 'Messages', 10], ['finance', 'Finanzas', 'Finance', 40], ['tables', 'Tablas', 'Tables', 50],
  ['dev', 'Desarrollo', 'Dev tools', 10], ['docs', 'Documentación', 'Docs', 10], ['manual', 'Manual', 'Manual', 10],
  ['sources', 'Documentos fuente', 'Source documents', 10],
  ['promotions', 'Promociones · formación', 'Promotions · training', 10],
] as [string, string, string, number][]).map(([id, es, en, order]) => [id, { id, label: { es, en }, order }]));

/**
 * Route prefix -> group id. A rule matches a path when the path equals the prefix or sits under it
 * (`prefix/...`); with `exact` only the path itself matches. The longest matching prefix wins, so a rule
 * for `/app/schedule` beats the one for `/app`. Every page must match a rule (the generator fails the
 * build otherwise). Customer app: book (schedule, class, booking, waitlist, rate, events),
 * pay (checkout, payment methods, plans, passes, classes, gift, invite, history), account
 * (profile, account, notifications, more, rules, faq, teachers, legal, edge states, /no-access), auth.
 */
export const HUB_GROUP_RULES: { prefix: string; group: string; exact?: boolean }[] = [
  // customer app
  { prefix: '/app', group: 'book', exact: true },
  ...['schedule', 'class', 'booking', 'waitlist', 'rate', 'events'].map((p) => ({ prefix: `/app/${p}`, group: 'book' })),
  ...['checkout', 'payment-methods', 'plans', 'passes', 'classes', 'gift', 'invite', 'vouchers', 'history'].map((p) => ({ prefix: `/app/${p}`, group: 'pay' })),
  ...['profile', 'account', 'practice', 'notifications', 'more', 'rules', 'faq', 'teachers', 'legal', 'state'].map((p) => ({ prefix: `/app/${p}`, group: 'account' })),
  { prefix: '/no-access', group: 'account' },
  { prefix: '/auth', group: 'auth' },
  // website, teacher app
  { prefix: '/site', group: 'site' },
  { prefix: '/coming-soon', group: 'coming-soon' },
  { prefix: '/teach', group: 'teach' },
  // staff
  { prefix: '/staff', group: 'desk' },
  { prefix: '/staff/inbox', group: 'inbox' },
  { prefix: '/staff/register', group: 'pos' },
  // admin (0048: emails and WhatsApp automations left the content group for their own card, `messages`)
  { prefix: '/admin', group: 'admin' },
  { prefix: '/admin/settings', group: 'admin' },
  { prefix: '/admin/integrations', group: 'admin' },
  { prefix: '/admin/activity', group: 'admin' },
  { prefix: '/admin/content', group: 'content' },
  { prefix: '/admin/emails', group: 'messages' },
  { prefix: '/admin/whatsapp', group: 'messages' },
  { prefix: '/admin/crm', group: 'crm' },
  { prefix: '/admin/finance', group: 'finance' },
  { prefix: '/admin/tables', group: 'tables' },
  // build
  { prefix: '/hub', group: 'dev', exact: true }, // the testing hub itself
  { prefix: '/hub/promotions', group: 'promotions' },
  { prefix: '/promotions', group: 'promotions' },
  { prefix: '/', group: 'coming-soon', exact: true }, // the public landing
  { prefix: '/dev', group: 'dev' },
  { prefix: '/docs', group: 'docs' },
  { prefix: '/docs/source', group: 'sources' },
  { prefix: '/manual', group: 'manual' },
];

/** The group a route belongs to, or undefined when no rule matches. Pure: the hub page can use it too. */
export function hubGroupOf(path: string): HubGroup | undefined {
  let best: { prefix: string; group: string } | undefined;
  for (const r of HUB_GROUP_RULES) {
    const hit = r.exact ? path === r.prefix : path === r.prefix || path.startsWith(`${r.prefix}/`);
    if (hit && (!best || r.prefix.length > best.prefix.length)) best = r;
  }
  return best && HUB_GROUPS[best.group];
}

/**
 * Since 0029: a working route per template page (`pages[].sampleRoute`), so a host that embeds a page
 * live opens a real record instead of a literal `:id`. Keyed by the page's template route; the
 * generator fails the build when a template page has no entry or an entry matches no page.
 *
 * Classes, bookings and payroll runs are reseeded every day with date-based ids (`ses_<date>_<n>`,
 * `pyr_<yyyy-mm>`), so a baked id would be stale by tomorrow. Those samples carry the reserved segment
 * `SAMPLE_TOKEN` and a `pick`; the app swaps it for a live seed id on load (`src/app/SampleRoute.tsx`,
 * picks in `src/hub/sampleIds.ts`). Static params (legal kind, site class slug) are written literally
 * and checked against the seed by `checkHubMapData()`.
 */
export const SAMPLE_TOKEN = 'sample';
/** session: an upcoming class with bookings and free mats · fullSession: an upcoming full class (waitlist) · booking: the demo customer's next booking · attendedSession: a class the demo customer attended · payrollRun: the approved payout run. */
export type SamplePick = 'session' | 'fullSession' | 'booking' | 'attendedSession' | 'payrollRun';
export const HUB_SAMPLE_ROUTES: Record<string, { route: string; pick?: SamplePick }> = {
  // Deliberately exercises the honest missing-code state; no live invitation is fabricated.
  '/promotions/:code': { route: '/promotions/DEMO-PROMOTION' },
  '/app/class/:id': { route: '/app/class/sample', pick: 'session' },
  '/app/checkout/:id': { route: '/app/checkout/sample', pick: 'session' },
  '/app/booking/:id': { route: '/app/booking/sample', pick: 'booking' },
  '/app/booking/:id/change': { route: '/app/booking/sample/change', pick: 'booking' },
  '/app/rate/:id': { route: '/app/rate/sample', pick: 'attendedSession' },
  '/app/waitlist/:id': { route: '/app/waitlist/sample', pick: 'fullSession' },
  '/app/legal/:kind': { route: '/app/legal/terms' },
  '/site/classes/:slug': { route: '/site/classes/ligereza' },
  '/admin/finance/payouts/:id': { route: '/admin/finance/payouts/sample', pick: 'payrollRun' },
};

/** The hand-written part of an experience; the generator adds `roles`, `url`, `pageCodes` and `shots`. */
export interface HubExperienceSeed extends Omit<HubExperience, 'roles' | 'url' | 'pageCodes' | 'shots'> {
  /** Entering the card switches to `roleId`'s demo user first (false: open as whoever is testing). */
  switchUser: boolean;
}

const exp = (id: string, code: string, band: HubBand, device: HubDevice, route: string, roleId: string, switchUser: boolean, label: Bi, purpose: Bi, extra: Partial<HubExperienceSeed> = {}): HubExperienceSeed =>
  ({ id, code, label, purpose, roleId, band, device, route, switchUser, ...extra });

/** Hub cards in document order (= `HUB_SURFACES` in src/modules/hub/specs.ts). */
export const HUB_EXPERIENCES: HubExperienceSeed[] = [
  exp('promotions', 'P-02', 'team', 'desktop', '/hub/promotions', 'public', false,
    { es: 'Promociones y bonos · aprender y probar', en: 'Promotions and vouchers · learn and practise' },
    { es: 'Una práctica aislada para todos: oferta aprobada, compartir, activar y reservar, verificar y recibir. Tu rol no cambia.', en: 'An isolated practice for everyone: approved offer, share, claim and book, verify and welcome. Your role stays the same.' },
    { featured: true }),
  exp('app', 'C-01', 'outside', 'phone', '/app', 'customer', true,
    { es: 'App de clientes', en: 'Customer app' },
    { es: 'Móvil primero: las clases de hoy, reservar, pagar, el paquete y el historial.', en: 'Mobile first: today’s classes, booking, paying, the package and history.' },
    { featured: true, secondary: { label: { es: 'Entrar o crear cuenta', en: 'Sign in or create an account' }, route: '/auth/sign-in' } }),
  exp('site', 'W-01', 'outside', 'page', '/site', 'public', false,
    { es: 'Sitio web', en: 'Website' },
    { es: 'Lo que ve cualquiera antes de entrar: filosofía, clases, horario, profesores, planes y contacto.', en: 'What anyone sees before signing in: philosophy, classes, schedule, teachers, plans and contact.' }),
  exp('coming-soon', 'W-11', 'outside', 'page', '/coming-soon', 'public', false,
    { es: 'Próximamente', en: 'Coming soon' },
    { es: 'Página de preapertura con arte vivo y la marca del estudio. Independiente del sitio web completo.', en: 'A branded pre-launch page with living artwork. Separate from the full website.' }),
  exp('teacher', 'S-03', 'outside', 'phone', '/teach', 'teacher', true,
    { es: 'App de profesores', en: 'Teacher app' },
    { es: 'Sus clases, la lista de asistentes, la asistencia desde el mat y su nómina.', en: 'Their classes, the roster, attendance from the mat and their payroll.' }),
  exp('desk', 'S-02', 'team', 'desktop', '/staff/checkin', 'front_desk', true,
    { es: 'Recepción', en: 'Front desk' },
    { es: 'Check-in de la clase que empieza, búsqueda por nombre y control de aforo.', en: 'Check-in for the class about to start, search by name and capacity control.' }),
  exp('inbox', 'S-06', 'team', 'desktop', '/staff/inbox', 'front_desk', true,
    { es: 'Bandeja de mensajes', en: 'Inbox' },
    { es: 'WhatsApp, correos y notas del equipo en un solo hilo por persona.', en: 'WhatsApp, emails and team notes in one thread per person.' }),
  exp('pos', 'S-04', 'team', 'desktop', '/staff/register', 'front_desk', true,
    { es: 'Caja', en: 'Point of sale' },
    { es: 'Vender un plan, un pase o un producto, cobrar y emitir el recibo.', en: 'Sell a plan, a pass or a product, take the payment and issue the receipt.' }),
  exp('admin', 'M-01', 'team', 'desktop', '/admin', 'admin', true,
    { es: 'Panel de administración', en: 'Admin dashboard' },
    { es: 'Cómo va el estudio hoy: ocupación, ingresos, clases y lo que necesita atención.', en: 'How the studio is doing today: occupancy, revenue, classes and what needs attention.' }),
  exp('crm', 'M-06', 'team', 'desktop', '/admin/crm', 'coordinator', true,
    { es: 'CRM', en: 'CRM' },
    { es: 'La ficha de cada persona: conversación, reservas, pagos, consentimientos y notas.', en: 'Each person’s record: conversation, bookings, payments, consents and notes.' }),
  // 0048 · one card, two pages: the emails (M-04) and the WhatsApp automations (M-05) the studio sends on its own
  exp('messages', 'M-04', 'team', 'desktop', '/admin/emails', 'coordinator', true,
    { es: 'Mensajes transaccionales', en: 'Transactional messages' },
    { es: 'Los correos y WhatsApp que el estudio envía solo: se editan y se prueban aquí.', en: 'The emails and WhatsApp messages the studio sends on its own: edit and test them here.' },
    { secondary: { label: { es: 'WhatsApp →', en: 'WhatsApp →' }, route: '/admin/whatsapp' } }),
  exp('finance', 'M-09', 'team', 'desktop', '/admin/finance', 'finance', true,
    { es: 'Finanzas', en: 'Finance' },
    { es: 'Ingresos, gastos, nómina de profesores e impuestos, con el libro detrás.', en: 'Revenue, expenses, teacher payroll and tax, with the ledger behind it.' }),
  exp('marketing', 'M-02', 'team', 'desktop', '/admin/content', 'marketing', true,
    { es: 'Kit de marketing — próximamente', en: 'Marketing kit — coming soon' },
    { es: 'Campañas, piezas de marca y calendario de contenido para el equipo de marketing. Aún no está construido; hoy marketing trabaja en Contenido (M-02).', en: 'Campaigns, brand assets and the content calendar for the marketing team. Not built yet; today marketing works in Content (M-02).' },
    { comingSoon: true }),
  exp('manual', 'K-03', 'build', 'sheet', '/manual', 'admin', false,
    { es: 'Manual de operaciones', en: 'Operations manual' },
    { es: 'El manual del equipo como un curso: cada rol ve lo suyo, marca lo leído y firma su formación; el owner lo ajusta desde aquí.', en: 'The team manual as a course: each role sees its own, marks what it read and signs off its training; the owner adjusts it from here.' }),
  exp('sources', 'K-05', 'build', 'sheet', '/docs/source', 'admin', false,
    { es: 'Documentos fuente', en: 'Source documents' },
    { es: 'El modelo de valor, los textos del sitio y el manual de marca, con visor y los capítulos que los citan.', en: 'The value model, the website copy and the brand manual, with a viewer and the chapters that cite them.' }),
  exp('docs', 'K-02', 'build', 'sheet', '/docs', 'super_admin', false,
    { es: 'Documentación y changelog', en: 'Documentation & changelog' },
    { es: 'Cada prompt, cada respuesta y cada cambio, con sus capturas.', en: 'Every prompt, every response and every change, with their captures.' }),
  exp('kb', 'K-01', 'build', 'desktop', '/dev/knowledgebase', 'super_admin', true,
    { es: 'Kanban y knowledgebase', en: 'Kanban & knowledgebase' },
    { es: 'El tablero de trabajo, el changelog y el registro de prompts en una sola pantalla.', en: 'The work board, the changelog and the prompt log on one screen.' }),
  exp('dev', 'D-03', 'build', 'desktop', '/dev', 'super_admin', true,
    { es: 'Herramientas de desarrollo', en: 'Dev tools' },
    { es: 'Specs, tokens, biblioteca de componentes, editor de layout, lienzo y simulador.', en: 'Specs, tokens, component library, layout editor, canvas and simulator.' }),
];

/** The hand-written part of a tool; the generator adds `url`, `device` and `shots`. */
export interface HubToolSeed { id: string; code: string; label: Bi; purpose: Bi; route: string }

/** The testing-hub row, in document order (= `HUB_TOOLS` in src/modules/hub/specs.ts). */
export const HUB_TOOL_LIST: HubToolSeed[] = [
  { id: 'canvas', code: 'D-05', route: '/dev/canvas', label: { es: 'Lienzo de páginas', en: 'Page canvas' }, purpose: { es: 'Cada pantalla del sistema como miniatura, agrupada por superficie y con zoom.', en: 'Every screen as a thumbnail, grouped by surface, with zoom.' } },
  { id: 'simulator', code: 'D-06', route: '/dev/simulator', label: { es: 'Simulador', en: 'Simulator' }, purpose: { es: 'Cualquier ruta en teléfono, tableta, escritorio o TV 4K, con el rol que quieras.', en: 'Any route on phone, tablet, desktop or 4K TV, as any role.' } },
  { id: 'specs', code: 'D-03', route: '/dev/specs', label: { es: 'Specs de página', en: 'Page specs' }, purpose: { es: 'Qué promete cada pantalla y cuánto le falta.', en: 'What each screen promises and how much is missing.' } },
  { id: 'layout', code: 'D-04', route: '/dev/layout/C-01', label: { es: 'Editor de layout', en: 'Layout editor' }, purpose: { es: 'Reordenar y ocultar las secciones de una página.', en: 'Reorder and hide a page’s sections.' } },
  { id: 'tables', code: 'M-03', route: '/admin/tables', label: { es: 'Tablas', en: 'Tables' }, purpose: { es: 'El gestor de datos con vistas: cuadrícula, lista, galería, tablero, calendario, línea de tiempo y grafo.', en: 'The data manager with views: grid, list, gallery, board, calendar, timeline and graph.' } },
  { id: 'components', code: 'D-02', route: '/dev/components', label: { es: 'Biblioteca de componentes', en: 'Component library' }, purpose: { es: 'Cada componente con sus props, estados y accesibilidad.', en: 'Every component with its props, states and accessibility.' } },
  { id: 'tokens', code: 'D-01', route: '/dev/tokens', label: { es: 'Tokens de diseño', en: 'Design tokens' }, purpose: { es: 'Color, tipografía, sombra, textura y movimiento, en vivo.', en: 'Colour, type, shadow, texture and motion, live.' } },
  { id: 'decisions', code: 'K-04', route: '/manual/decisions', label: { es: 'Decisiones pendientes', en: 'Decisions pending' }, purpose: { es: 'Lo que el estudio todavía tiene que decidir.', en: 'What the studio still has to decide.' } },
  { id: 'screenshots', code: 'K-02', route: '/docs/screenshots', label: { es: 'Capturas', en: 'Screenshots' }, purpose: { es: 'Todas las capturas por código de página, ES y EN, claro y oscuro.', en: 'Every capture by page code, ES and EN, light and dark.' } },
];

/** How each host is expected to look into the hub. Hints, not rules: a host may ignore them. */
export const HUB_LENSES: Record<HubLensId, HubLensHint> = {
  aluzina: {
    title: { es: 'hoy en el estudio aluzina', en: 'hoy in the aluzina studio' },
    framing: { es: 'Un entregable del estudio: un mat por cada rol del cliente, con las pantallas de ese rol encima.', en: 'A studio deliverable: one mat per client role, with that role’s screens laid on it.' },
    groupBy: 'role', showTools: false, entry: '/hub',
  },
  'between-gigs': {
    title: { es: 'hoy como gig', en: 'hoy as a gig' },
    framing: { es: 'Un gig con sus superficies y sus herramientas.', en: 'One gig with its surfaces and tools.' },
    groupBy: 'experience', showTools: true, entry: '/hub',
  },
  standalone: {
    title: { es: 'Hub de pruebas de hoy', en: 'hoy’s testing hub' },
    framing: { es: 'El hub de pruebas propio de hoy: cada superficie por banda y cada herramienta, como en /#/hub.', en: 'hoy’s own testing hub: every surface by band and every tool, as at /#/hub.' },
    groupBy: 'surface', showTools: true, entry: '/hub',
  },
};
