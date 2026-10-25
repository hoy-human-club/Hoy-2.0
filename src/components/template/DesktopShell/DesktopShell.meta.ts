import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';

export default defineMeta({
  tier: 'template', name: 'DesktopShell',
  description: { es: 'Chasis de escritorio (staff, admin, dev, docs): barra superior pegajosa + columna crema de 240 px que colapsa a un riel de iconos de 56 px (chevron del pie o tecla “[”, recordado por usuario, rol y superficie) y se vuelve cajón fuera de lienzo bajo 900 px. Los grupos de navegación vienen de RouteDef.nav.group y se pliegan con un caret; al navegar se abre el grupo de la ruta activa; después se puede plegar. La campana de la barra cuenta los mensajes entrantes sin leer y abre el InboxPopover hacia la bandeja S-06. 0159: staff y admin son un solo espacio “Estudio” agrupado por tarea (Hoy en el estudio · Personas · Ventas · Finanzas · Estudio · Reportes · Administración) con un único “Inicio” arriba (la página de ROLE_HOME); el estado de una página (Beta, Vista previa) es una insignia, nunca parte de la etiqueta; super admin y desarrollo cambian entre “Estudio” y “Desarrollo” (el sistema de diseño) con el selector de espacio. El logo lleva a Inicio; el enlace al hub vive solo en la franja demo; los códigos de spec solo se ven en modo dev.', en: 'Desktop shell (staff, admin, dev, docs): sticky top bar + 240 px cream column that collapses to a 56 px icon rail (footer chevron or the “[” key, remembered per user, role and surface) and becomes an off-canvas drawer below 900 px. Nav groups come from RouteDef.nav.group and fold with a caret; navigation opens the active route’s group; it can then be folded. The top-bar bell counts unread inbound messages and opens the InboxPopover into the S-06 inbox. 0159: staff and admin are one “Studio” workspace grouped by job (Today · People · Sales · Finance · Studio · Reports · Administration) with a single “Home” at the top (the ROLE_HOME page); a page’s status (Beta, Preview) is a badge, never part of the label; super admins and developers switch between “Studio” and “Build” (the design system) with the workspace switcher. The wordmark goes Home; the hub link lives only in the demo strip; spec codes show only in dev mode.' },
  props: [
    { name: 'surfaces', type: 'Surface[]', required: true, description: { es: 'Superficies cuyas rutas con nav se listan (el primer valor es la clave de persistencia).', en: 'Surfaces whose nav routes are listed (the first one is the persistence key).' } },
    { name: 'routes', type: 'RouteDef[]', required: true, description: { es: 'Normalmente getRoutes().', en: 'Usually getRoutes().' } },
    { name: 'titleKey', type: 'string', required: true, description: { es: 'Clave i18n de la etiqueta junto al logo del sidebar (core.nav.group.staff…).', en: 'i18n key of the label beside the sidebar wordmark (core.nav.group.staff…).' } },
  ],
  states: [
    'expanded (240 px)',
    'rail / collapsed (56 px, tooltips al hover y foco)',
    'group folded / group open (navegar abre el grupo activo; también se puede plegar)',
    'dev-mode (códigos de spec visibles + chip de spec en la barra)',
    'tablet (600–1023 px, 0165): the rail always on screen; ☰ opens the full menu over the page with a scrim',
    'phone-closed (< 600 px, drawer hidden) / phone-open (drawer + scrim)',
    'menu overflow (0165): no scrollbar in any state; a fade plus an up/down chevron appear only at an edge that hides items',
    'page title (0165): the top bar names the page; in-page h1 + subtitle are visually hidden (kept for screen readers)',
    'inbox bell: none unread / unread count / popover open (roles con /staff/inbox)',
    'nav item with badge: Beta (primary) / Demo (warn, demo data or prototype); the title explains it; in the rail it moves into the tooltip',
    'workspace switcher: Estudio active / Desarrollo active (only when the role can open both; hidden in the rail)',
    'home: exactly one “Inicio” at the top — M-01 for admin and finance, S-01 for the desk roles',
    'studio look (0160): sets data-look="studio" on <html> while mounted; the sidebar is the river tile with breathing rings floating on the cream ground, the active item the sun pill, the page name serif',
  ],
  usages: [{ title: { es: 'Ver en vivo', en: 'See it live' }, render: () => h('p', { className: 'muted small' }, 'Se usa en /#/staff, /#/admin, /#/dev y /#/docs. Colapsa con “[” o el chevron del pie; los grupos se pliegan con su caret.') }],
  a11y: [
    { es: 'Sidebar es <aside> con aria-label; nav con aria-label; los botones de grupo y de colapsar llevan aria-expanded.', en: 'The sidebar is an <aside> with an aria-label; nav has an aria-label; group buttons carry aria-expanded and aria-controls; the mobile drawer traps focus, closes with Escape and is inert when hidden.' },
    { es: 'En el riel, cada enlace mantiene su nombre accesible (title + tooltip) aunque el texto esté oculto.', en: 'In the rail every link keeps its accessible name (title + tooltip) even though the text is hidden.' },
    { es: 'El atajo “[” se ignora mientras se escribe en un campo.', en: 'The “[” shortcut is ignored while typing in a field.' },
  ],
  usedBy: ['S-*', 'M-*', 'D-*', 'K-01', 'DOCS'],
});
