import { defineSpec } from '../../specs/define';
import { DEV_API_KEY_ACTIONS } from './actions';
export const specsIndexSpec = defineSpec({
  code: 'D-03', name: { es: 'Índice de specs', en: 'Specs index' },
  purpose: { es: 'Lista todas las PageSpec registradas con badge de completitud, ruta y estado (construida / stub / sin ruta).', en: 'Lists every registered PageSpec with completeness badge, route and status (built / stub / no route).' },
  layout: ['PageHead', 'FilterChips', 'SpecTable'], data: ['components', 'page_layouts'], roles: ['super_admin', 'developer'],
  logic: ['Completeness = 7 checks (purpose, layout, data, roles, logic, integrations, states).', 'A route is a stub when its element is PageStub.'],
  integrations: [], states: ['default', 'filtered by family'],
});
export const layoutEditorSpec = defineSpec({
  code: 'D-04', name: { es: 'Editor de layout', en: 'Layout editor' },
  purpose: { es: 'Reordenar y ocultar las secciones de una página con drag-and-drop; persiste en page_layouts y las páginas lo leen con useLayout(spec).', en: 'Reorder and hide a page’s sections with drag-and-drop; persists to page_layouts and pages read it with useLayout(spec).' },
  layout: ['PagePicker', 'SortableList (dnd-kit)', 'Toolbar (reset, preview)'], data: ['page_layouts'], roles: ['super_admin', 'developer'],
  logic: ['Stored order wins; new spec sections append; removed ones drop.', 'Hidden sections stay in order but are skipped by the page.'],
  integrations: [], states: ['default (spec order)', 'custom order saved', 'page not wired'],
});

export const canvasSpec = defineSpec({
  code: 'D-05', name: { es: 'Lienzo de páginas', en: 'Page canvas' },
  purpose: {
    es: 'Todo el producto en una pantalla: cada página con su captura real, agrupada por superficie (Hub · Sitio · Acceso · Clientes · Profesores · Staff · Administración · Desarrollo · Documentación), con nombre, código y ruta, y un zoom de cuatro pasos. Clic o Enter abre la página.',
    en: 'The whole product on one screen: every page with its real capture, grouped by surface (Hub · Website · Auth · Customer · Teacher · Staff · Admin · Dev · Docs), with its name, code and route, and a four-step zoom. Click or Enter opens the page.',
  },
  layout: ['PageHead (title, count, zoom SegmentedControl)', 'GroupSection × 9 (heading + tile grid)', 'Tile (PagePreview + name + code + route)'],
  data: ['page_layouts', 'components'],
  roles: ['super_admin', 'developer'],
  logic: [
    'Routes come from the registry; param routes (:id) and splats are skipped so a tile always opens something.',
    'Only static captures here (docs/screenshots/<code>/thumb-*): a map of 90-plus pages never boots live frames.',
    'Customer and teacher tiles use the phone capture, everything else the desktop one.',
    'The zoom step sets --zoom, which is the grid’s minimum track width — the tiles reflow, they are not transformed.',
    'In dev mode a stub page is badged as such.',
  ],
  integrations: [],
  states: ['default (M)', 'zoom S / L / XL', 'sin capturas todavía (mosaicos inactivos)', 'modo dev (badges de esbozo)'],
  checkedAt: [360, 390, 768, 1280, 1920, 2560, 3840],
  notes: ['Captures come from `npm run screenshots`; a page with no thumbnail yet shows its hue-tinted idle tile.'],
});

export const simulatorSpec = defineSpec({
  code: 'D-06', name: { es: 'Simulador de dispositivos', en: 'Device simulator' },
  purpose: {
    es: 'Cualquier ruta, en cualquier dispositivo, como cualquier persona: teléfono 390×844, tableta 768×1024, escritorio 1280×800 o TV 3840×2160, con rol, idioma y tema propios del marco. Todo el estado va en la query del hash, así una vista es un enlace.',
    en: 'Any route, on any device, as anyone: phone 390×844, tablet 768×1024, desktop 1280×800 or 4K TV 3840×2160, with the frame’s own role, language and theme. All the state lives in the hash query, so a view is a link.',
  },
  layout: ['PageHead (title, “Abrir en pestaña”)', 'Controls (device SegmentedControl, route select, role select, lang, theme)', 'SizeLine', 'DeviceFrame'],
  data: ['users', 'user_roles'],
  roles: ['super_admin', 'developer'],
  logic: [
    'Every control writes to the hash query (route, device, as, lang, theme); the page reads it back, so reload and bookmark keep the view.',
    'The frame is the real app in a same-origin iframe at the preset’s pixel size, scaled to fit with a ResizeObserver.',
    'src/app/frameSession.ts shadows hoyos.session / hoyos.lang / hoyos.theme inside the frame, so simulating a role never changes the tester’s own session.',
    'Dev tooling is off inside the frame, so the spec chip does not appear in a simulated view.',
    'Changing any control remounts the frame (key), which is a real navigation rather than a partial state.',
  ],
  integrations: [],
  states: ['teléfono', 'tableta', 'escritorio', 'TV 4K', 'rol sin acceso a la ruta (el marco muestra E-05)', 'oscuro', 'English'],
  checkedAt: [360, 390, 768, 1280, 1920, 2560, 3840],
});

/** D-07 — developer API keys (0041, D-0018): issue, rotate, revoke; hash at rest, shown once. */
export const apiKeysSpec = defineSpec({
  code: 'D-07', name: { es: 'Llaves de API', en: 'API keys' },
  purpose: { es: 'Las llaves que HoyOS entrega a desarrolladores para llamar su API: crear (con entorno, permisos y vencimiento opcional), ver una sola vez, rotar con 24 horas de gracia y revocar. Solo se guarda un prefijo y el hash SHA-256; la verificación la hará el servidor.', en: 'The keys HoyOS issues to developers to call its API: create (with environment, scopes and an optional expiry), see once, rotate with a 24-hour grace period and revoke. Only a prefix and the SHA-256 hash are stored; the server will do the verification.' },
  layout: ['Intro', 'Keys', 'TryRequest'],
  data: ['api_keys', 'audit_log'],
  roles: ['super_admin', 'developer', 'admin'],
  logic: [
    'Format hoy_<live|test>_<24 base62> from crypto.getRandomValues (rejection-sampled); stored: prefix (13 chars) + SHA-256 hex via crypto.subtle. The raw key lives only in component state until the drawer closes.',
    'Rotate inserts a new key with replaces_id = old id and the old key’s lifetime (same duration from now; never-expiring stays never), and sets the old key’s expires_at to now + 24 h (unless it already expires sooner). Revoke sets revoked_at; rows are never deleted.',
    'Status: revoked (revoked_at) · expired (expires_at past) · expiring (within 7 days) · active.',
    'api_keys.write (super_admin, developer) gates create / rotate / revoke; admin reads the list (api_keys.read). Every write is audited: api_key.create / api_key.rotate / api_key.revoke with the prefix, never the key.',
    'Verification is a server concern (D-0018): hash the bearer token, match key_hash, check environment, scopes, expiry and revocation, stamp last_used_at. The local request console uses symbolic fictional scenarios only; it does not verify keys or make HTTP requests. Server authentication remains disconnected.',
  ],
  integrations: ['HoyOS HTTP API (designed, not built)'],
  states: ['Loading', 'Empty', 'Seed: two example keys', 'Create drawer', 'Key shown once', 'Rotating (grace 24 h)', 'Revoke confirm', 'Read-only (admin)', 'Fictional 200/401/403 response', 'Local request preparing / cancelled', 'Fictional503 / retry'],
  actions: DEV_API_KEY_ACTIONS,
  checkedAt: [390, 1280],
  notes: ['Outbound secrets (Wompi, WhatsApp, Google OAuth…) stay in the server environment and are named on M-10; these are inbound keys HoyOS issues.', 'Scopes: classes.read, bookings.read, bookings.write, customers.read, hours.read, hours.write, webhooks.receive.'],
});
