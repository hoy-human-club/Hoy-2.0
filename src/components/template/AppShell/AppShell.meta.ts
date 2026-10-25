import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';

export default defineMeta({
  tier: 'template', name: 'AppShell',
  description: { es: 'El único chasis de la app de cliente y profesor (D-0006). Bajo 900 px: barra superior con logo, columna de contenido de máx. 560 px y dock inferior derivado de las rutas con `nav`. Desde 900 px: página a todo el viewport, barra superior con la navegación principal, idioma y avatar, contenido en un contenedor centrado (`--w-app`, crece con `--ui`). Sin marco de teléfono: ese vive solo en el simulador DeviceFrame del hub.', en: 'The one shell of the customer and teacher apps (D-0006). Below 900 px: brand top bar, 560 px max content column and a bottom dock derived from routes with `nav`. From 900 px: full-viewport page, top bar with the primary nav, language and avatar, content in a centred container (`--w-app`, growing with `--ui`). No phone bezel: that lives only in the hub\'s DeviceFrame simulator.' },
  props: [
    { name: 'surface', type: 'Surface', required: true, description: { es: 'Filtra las rutas de la nav.', en: 'Filters nav routes.' } },
    { name: 'routes', type: 'RouteDef[]', required: true, description: { es: 'Normalmente getRoutes().', en: 'Usually getRoutes().' } },
    { name: 'homeTo', type: 'string', required: true, description: { es: 'Destino del logo.', en: 'Wordmark destination.' } },
    { name: 'profileTo', type: 'string', description: { es: 'Destino del avatar: el perfil de la persona (cliente /app/more, profesor /teach/profile). Nunca el hub (0159).', en: 'Avatar destination: the person’s own profile (customer /app/more, teacher /teach/profile). Never the hub (0159).' } },
    { name: 'bare', type: 'boolean', description: { es: 'Sin barra superior propia (el dock sigue bajo 900 px).', en: 'Without its own top bar (the dock stays below 900 px).' } },
  ],
  states: ['narrow (< 900 px: column + dock)', 'wide (≥ 900 px: top-bar nav, full viewport)'],
  usages: [{ title: { es: 'Ver en vivo', en: 'See it live' }, render: () => h('p', { className: 'muted small' }, 'Se usa en /#/app y /#/teach; el simulador (D-06) lo muestra a 390 px dentro del marco. Abre la app de cliente para verlo con datos reales.') }],
  a11y: [{ es: '<main> para el contenido; la nav (dock o barra) es <nav aria-label> con aria-current; todos los controles ≥ 44 px.', en: '<main> for content; the nav (dock or bar) is <nav aria-label> with aria-current; every control ≥ 44 px.' }],
  usedBy: ['C-*', 'E-*', 'S-03'],
});
