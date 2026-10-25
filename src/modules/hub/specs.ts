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
    es: 'El hub público de pruebas en /hub, como un bento (0161): un vistazo al sistema entero y una entrada a cualquier puesto del estudio con su usuario demo. Arriba, a quién estás probando y su inicio; luego lo que ve un miembro en mosaicos de color de clase, los puestos del equipo, cómo se opera y construye, las herramientas y el sistema en números.',
    en: 'The public testing hub at /hub, as a bento (0161): the whole system at a glance and a way into any seat at the studio as its demo user. At the top, who you are testing as and their home; then what a member sees as class-tone tiles, the team’s seats, how it is run and built, the tools and the system in numbers.',
  },
  layout: [
    'Header (Wordmark, “Testing hub” label, version Badge, ProblemReport, LangToggle, theme, wireframe + dev toggles)',
    'HeroTile · river with breathing rings (eyebrow tenant · city, serif h1 with the sun mark, lead, SessionBar: RoleSwitcher + “Open {name}’s home” sun button, Ctrl + . hint in dev mode)',
    'DateTile · sun (days to opening, day and month from tenant.opensOn, tagline)',
    'TrainingBanner · Promociones y bonos (P-02, sun edge, same-session practice)',
    'Section · What a member sees (Customer app, Website, Coming soon, Teacher app as class-tone tiles)',
    'Section · Every seat at the studio (8 paper seat tiles with a tone dot)',
    'BuildTile · ink (Manual, Source documents, Docs, Kanban, Dev tools as rows)',
    'Toolbox · paper (9 tool pills, stats: routes, codes, tables, components, actions, manual chapters)',
    'Footer',
  ],
  data: ['users', 'user_roles', 'feature_flags', 'page_layouts'],
  roles: EVERYONE,
  logic: [
    'OT-03 opens a validated, scoped browser-only draft with current pathname, demo actor and effective role. Preview/save/cancel/storage failure/retry exist; no report is sent and the source sends criterion remains unmet.',
    'Cards with switchUser enter as their role’s demo user. Promotions training and other same-session cards navigate without changing identity or permissions.',
    'The built / stub badge is read from the route manifest (src/app/manifest.ts routeManifest), not typed into the card.',
    '“Estás aquí / You are here” shows on the card whose route is ROLE_HOME for the current effective role.',
    '0161: the tiles carry no screen previews (they made the page long and mostly empty); the tile names the screen, its role and route, and the button opens it. The page canvas and simulator (tools) still show every screen.',
    'The built / stub badge only shows when a screen is not built yet; “Open {name}’s home” goes to ROLE_HOME of the current role.',
    'The stat strip counts live: routes and codes from the registry, tables from tableRegistry, components from the D-02 glob, actions from listActions(), manual chapters from the ops-manual glob.',
    'A card with comingSoon shows a “Próximamente” badge and its enter button is a Placeholder; hub.enterAs refuses it. Marketing now opens the M-18 future-phase local fictional draft prototype; no publishing or owner acceptance is implied.',
    'The dev-mode toggle renders for super_admin and developer (0031), the wireframe toggle for super_admin only; a tool whose route the current role cannot open still renders and lands on /no-access, as the guard does everywhere else.',
    'The bands and the tools row are drawn from the hub map data (src/hub/hubMap.data.ts): the same module scripts/gen-hub-map.mjs publishes as public/hub-map.json (schema hoy.hub-map/1) for other hosts — aluzina, between-gigs — so the hub and its map cannot drift. Only icons and preview shapes live in HubPage.tsx.',
    'hub.map answers with the published map URL and loads the map into window.__hoyos.hubMap.data.',
    'Hub type sizes, medallions, padding and grid width scale with a hub-scoped --ui variable: 1 · 1.125 (≥1920) · 1.375 (≥2560) · 1.75 (≥3840).',
  ],
  integrations: [],
  states: [
    'default (visitor)', 'signed in as a member', 'super admin', 'dev mode', 'wireframe skin',
    'dark theme', 'framed (inside a preview or the simulator)', 'phone (one column)', 'English', 'local report draft: edit / invalid / preview / storage failure / retry / saved without dispatch',
  ],
  actions: hubActions,
  checkedAt: [360, 390, 768, 1280, 1920, 2560, 3840],
  notes: [
    'Not part of the canvas; it is the public testing hub at /hub. The public root is Coming Soon; demo role switching remains isolated from production authentication.',
    'Design: layout B of the “HoyOS Hub Layouts” canvas (0161), in the coming-soon (Pulso) language.',
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
