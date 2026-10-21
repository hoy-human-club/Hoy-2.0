import { defineSpec } from '../../specs/define';
import { EVERYONE } from '../../auth/roles';
import type { ActionDef } from '../../actions/types';

/** The card families the hub lays out, in document order. Also the `surface` enum of `hub.enterAs`. */
export const HUB_SURFACES = ['promotions', 'app', 'site', 'coming-soon', 'teacher', 'desk', 'inbox', 'pos', 'admin', 'crm', 'messages', 'finance', 'marketing', 'manual', 'sources', 'docs', 'kb', 'dev'] as const;
export type HubSurfaceKey = (typeof HUB_SURFACES)[number];

/** The testing-hub row, in document order. Also the `tool` enum of `hub.openTool`. */
export const HUB_TOOLS = ['canvas', 'simulator', 'specs', 'layout', 'tables', 'components', 'tokens', 'decisions', 'screenshots'] as const;
export type HubToolKey = (typeof HUB_TOOLS)[number];

/** What HUB-01 can be asked to do — by a click, by window.__hoyos.run, and later by voice. */
const hubActions: ActionDef[] = [
  {
    id: 'hub.enterAs',
    label: { es: 'Entrar a una superficie', en: 'Enter a surface' },
    intent: { es: 'Entra a {surface} como su usuario demo', en: 'Enter {surface} as its demo user' },
    params: { surface: `enum:${HUB_SURFACES.join(',')}` },
  },
  { id: 'hub.openCanvas', label: { es: 'Abrir el lienzo', en: 'Open the canvas' }, intent: { es: 'Muéstrame todas las páginas en el lienzo', en: 'Show me every page on the canvas' }, permission: 'dev.tools' },
  { id: 'hub.openSimulator', label: { es: 'Abrir el simulador', en: 'Open the simulator' }, intent: { es: 'Abre el simulador de dispositivos', en: 'Open the device simulator' }, permission: 'dev.tools' },
  { id: 'hub.openTool', label: { es: 'Abrir una herramienta', en: 'Open a tool' }, intent: { es: 'Abre {tool}', en: 'Open {tool}' }, params: { tool: `enum:${HUB_TOOLS.join(',')}` } },
  { id: 'hub.toggleDevMode', label: { es: 'Modo dev', en: 'Dev mode' }, intent: { es: 'Enciende o apaga el modo dev', en: 'Turn dev mode on or off' }, permission: 'dev.tools' },
  { id: 'hub.setLang', label: { es: 'Cambiar idioma', en: 'Set the language' }, intent: { es: 'Pon la interfaz en {lang}', en: 'Put the interface in {lang}' }, params: { lang: 'enum:es,en' } },
  {
    id: 'hub.map',
    label: { es: 'Mapa del hub', en: 'Hub map' },
    intent: { es: 'Dame el mapa del hub', en: 'Give me the hub map' },
  },
  { id: 'hub.toggleTheme', label: { es: 'Cambiar tema', en: 'Toggle theme' }, intent: { es: 'Cambia entre claro y oscuro', en: 'Switch between light and dark' } },
  { id: 'hub.toggleWireframe', label: { es: 'Wireframe', en: 'Wireframe' }, intent: { es: 'Muestra el sistema en wireframe', en: 'Show the system as a wireframe' }, permission: 'dev.tools' },
];

export const hubSpec = defineSpec({
  code: 'HUB-01',
  name: { es: 'Hub de pruebas', en: 'Testing hub' },
  purpose: {
    es: 'El hub público de pruebas en /hub: enseña el sistema entero de un vistazo y deja entrar a cualquier puesto del estudio con su usuario demo. Cada tarjeta muestra la pantalla real (captura, y la página en vivo cuando cabe), su estado y su ruta; abajo, el sistema en números y el hub de pruebas (lienzo, simulador, specs, tablas, componentes, tokens, decisiones, capturas).',
    en: 'The public testing hub at /hub: it shows the whole system at once and lets a tester enter any seat at the studio as its demo user. Every card shows the real screen (a capture, and the running page when there is room), its status and its route; below, the system in numbers and the testing hub (canvas, simulator, specs, tables, components, tokens, decisions, captures).',
  },
  layout: [
    'BrandBand (Wordmark, version Badge, LangToggle, theme, wireframe + dev toggles for super_admin)',
    'Hero (eyebrow tenant · city, h1, lead, tagline, BreathingRings art ≥ 900 px)',
    'SessionBar (RoleSwitcher, Ctrl + . hint in dev mode)',
    'FeaturedTraining · Promociones y bonos (P-02, same-session learning and isolated practice for every Hub role)',
    'BandA · Fuera del estudio (Customer app featured with a phone preview, Website, Coming soon page, Teacher app)',
    'BandB · El equipo (Front desk, Inbox, Caja, Admin, CRM, Mensajes transaccionales → M-04 + M-05 link, Finanzas, Kit de marketing — próximamente)',
    'BandC · Construcción y pruebas (Manual, Documentos fuente, Docs, Kanban, Dev tools)',
    'ToolsRow · Hub de pruebas (9 tool cards)',
    'StatStrip (routes, codes, tables, components, actions, manual chapters)',
    'Footer',
  ],
  data: ['users', 'user_roles', 'feature_flags', 'page_layouts'],
  roles: EVERYONE,
  logic: [
    'Cards with switchUser enter as their role’s demo user. Promotions training and other same-session cards navigate without changing identity or permissions.',
    'The built / stub badge is read from the route manifest (src/app/manifest.ts routeManifest), not typed into the card.',
    '“Estás aquí / You are here” shows on the card whose route is ROLE_HOME for the current effective role.',
    'Previews layer a real capture (docs/screenshots/<code>/thumb-*) over a hue-tinted idle tile; a missing capture hides the image instead of breaking it.',
    'A preview upgrades to the running page only when it is in view (IntersectionObserver, 160 px margin) and the budget of 6 live frames has a slot for it: slots are granted in document order on first paint and then kept first-come-first-served, so a card scrolling in later never preempts one that is already live. A preview never boots a frame when the hub is itself framed, the URL carries live=0, or the page is driven by automation (navigator.webdriver) — so a screenshot pass always captures the same static-thumbnail hub.',
    'A framed preview runs under its own session (src/app/frameSession.ts shadows hoyos.session / hoyos.lang / hoyos.theme), so it never touches the tester’s.',
    'The stat strip counts live: routes and codes from the registry, tables from tableRegistry, components from the D-02 glob, actions from listActions(), manual chapters from the ops-manual glob.',
    'A card with comingSoon (0031: the marketing kit) shows a “Próximamente” badge and its enter button is a Placeholder (tooltip + “not wired yet” toast, dashed in dev mode); hub.enterAs refuses it.',
    'The dev-mode toggle renders for super_admin and developer (0031), the wireframe toggle for super_admin only; a tool whose route the current role cannot open still renders and lands on /no-access, as the guard does everywhere else.',
    'The bands and the tools row are drawn from the hub map data (src/hub/hubMap.data.ts): the same module scripts/gen-hub-map.mjs publishes as public/hub-map.json (schema hoy.hub-map/1) for other hosts — aluzina, between-gigs — so the hub and its map cannot drift. Only icons and preview shapes live in HubPage.tsx.',
    'hub.map answers with the published map URL and loads the map into window.__hoyos.hubMap.data.',
    'Hub type sizes, medallions, padding and grid width scale with a hub-scoped --ui variable: 1 · 1.125 (≥1920) · 1.375 (≥2560) · 1.75 (≥3840).',
  ],
  integrations: [],
  states: [
    'default (visitor)', 'signed in as a member', 'super admin', 'dev mode', 'wireframe skin',
    'dark theme', 'live previews on', 'live previews off (live=0)', 'automation: live previews off (navigator.webdriver)', 'framed (inside a preview or the simulator)',
    'no captures yet (idle tiles)', 'English',
  ],
  actions: hubActions,
  checkedAt: [360, 390, 768, 1280, 1920, 2560, 3840],
  notes: [
    'Not part of the canvas; it is the public testing hub at /hub. The public root is Coming Soon; demo role switching remains isolated from production authentication.',
    'Referenced design: the cal-tenant-law hub (same stack) — brand band, floating session bar, 3fr/9fr surface bands, layered previews.',
  ],
});

export const noAccessSpec = defineSpec({
  code: 'E-05',
  name: { es: 'Sin acceso', en: 'No access' },
  purpose: { es: 'Página amable cuando el rol actual no puede entrar a una ruta; ofrece volver al hub para cambiar de usuario demo.', en: 'Friendly page when the current role cannot enter a route; offers the hub to switch demo user.' },
  layout: ['Illustration', 'Title', 'Body (role name)', 'RoleSwitcher', 'CTA → hub'],
  data: ['user_roles'],
  roles: EVERYONE,
  logic: ['RequireRole redirects here with ?from=<path>.', 'A hub tool card whose route the role cannot open lands here rather than disappearing.'],
  integrations: [],
  states: ['default'],
  checkedAt: [360, 390, 768, 1280, 1920],
});
