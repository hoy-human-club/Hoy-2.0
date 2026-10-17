import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';

export default defineMeta({
  tier: 'template', name: 'DesktopShell',
  description: { es: 'Chasis de escritorio (staff, admin, dev, docs): barra superior pegajosa + columna crema de 240 px que colapsa a un riel de iconos de 56 px (chevron del pie o tecla “[”, recordado por usuario, rol y superficie) y se vuelve cajón fuera de lienzo bajo 900 px. Los grupos de navegación vienen de RouteDef.nav.group y se pliegan con un caret; al navegar se abre el grupo de la ruta activa; después se puede plegar. La campana de la barra cuenta los mensajes entrantes sin leer y abre el InboxPopover hacia la bandeja S-06. Un super admin ve además el grupo “Sistema de diseño”.', en: 'Desktop shell (staff, admin, dev, docs): sticky top bar + 240 px cream column that collapses to a 56 px icon rail (footer chevron or the “[” key, remembered per user, role and surface) and becomes an off-canvas drawer below 900 px. Nav groups come from RouteDef.nav.group and fold with a caret; navigation opens the active route’s group; it can then be folded. The top-bar bell counts unread inbound messages and opens the InboxPopover into the S-06 inbox. A super admin also sees the “Design system” group.' },
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
    'mobile-closed (cajón oculto)',
    'mobile-open (cajón + scrim)',
    'inbox bell: none unread / unread count / popover open (roles con /staff/inbox)',
  ],
  usages: [{ title: { es: 'Ver en vivo', en: 'See it live' }, render: () => h('p', { className: 'muted small' }, 'Se usa en /#/staff, /#/admin, /#/dev y /#/docs. Colapsa con “[” o el chevron del pie; los grupos se pliegan con su caret.') }],
  a11y: [
    { es: 'Sidebar es <aside> con aria-label; nav con aria-label; los botones de grupo y de colapsar llevan aria-expanded.', en: 'The sidebar is an <aside> with an aria-label; nav has an aria-label; group buttons carry aria-expanded and aria-controls; the mobile drawer traps focus, closes with Escape and is inert when hidden.' },
    { es: 'En el riel, cada enlace mantiene su nombre accesible (title + tooltip) aunque el texto esté oculto.', en: 'In the rail every link keeps its accessible name (title + tooltip) even though the text is hidden.' },
    { es: 'El atajo “[” se ignora mientras se escribe en un campo.', en: 'The “[” shortcut is ignored while typing in a field.' },
  ],
  usedBy: ['S-*', 'M-*', 'D-*', 'K-01', 'DOCS'],
});
