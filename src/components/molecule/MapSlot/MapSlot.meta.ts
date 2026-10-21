import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { MapSlot } from './MapSlot';

export default defineMeta({
  tier: 'molecule', name: 'MapSlot',
  description: {
    es: 'La ubicación del estudio, leída de M-08a (`useContact()`, con `tenant.location` como valor por defecto). Sin prop, el proveedor lo decide M-08f (Google si no hay una elección guardada); con `"none"` muestra un marco de marca con la dirección y un enlace profundo a Google Maps, sin pedir red: los screenshots siguen siendo offline. Con `"osm"` o `"google"` carga el mapa sin llave solo al pulsar Cargar mapa interactivo. El enlace de indicaciones permanece disponible si falla.',
    en: 'The studio’s location, read from M-08a (`useContact()`, `tenant.location` as the default). Without the prop the provider is the M-08f setting (Google when no choice was saved); with `"none"` it renders a branded frame with the address line and a Google Maps deep link, with no network request, so screenshots stay offline-safe. `"osm"` and `"google"` load keyless maps only after Load interactive map is selected. The directions link remains available if loading fails.',
  },
  props: [
    { name: 'provider', type: "'none' | 'osm' | 'google'", default: 'M-08f setting', description: { es: 'Proveedor del mapa. Sin prop lee Ajustes › Contenido; `none` no hace ninguna petición.', en: 'Map provider. Omitted reads Settings › Content; `none` makes no request.' } },
    { name: 'ratio', type: "'16:9' | '4:3' | '4:5' | '1:1' | '21:9'", default: '16:9', description: { es: 'Proporción del marco.', en: 'Frame aspect ratio.' } },
    { name: 'heading', type: '{ es, en } | string', description: { es: 'Cejilla sobre la dirección. Por defecto "Dónde estamos".', en: 'Eyebrow above the address. Defaults to “Where we are”.' } },
    { name: 'address', type: '{ es, en } | string', description: { es: 'Sobrescribe la etiqueta del mapa de M-08a.', en: 'Overrides the M-08a map label.' } },
    { name: 'openLabel', type: '{ es, en } | string', description: { es: 'Texto del enlace a Google Maps.', en: 'Label of the Google Maps link.' } },
    { name: 'slotKey', type: 'string', description: { es: 'Llave de la biblioteca de medios (M-02d). Mientras no haya proveedor de mapas, un mapa ilustrado del barrio puesto en `ready` llena el marco; la dirección y el enlace se quedan.', en: 'Key into the media library (M-02d). Until a map provider is chosen, a drawn neighbourhood map flipped to `ready` fills the frame; the address line and the link stay.' } },
  ],
  states: ['ready to load (default)', 'explicit provider none / address only', 'drawn map from the media library', 'loading map', 'osm embed', 'google embed', 'map failure with retry and directions fallback'],
  usages: [
    { title: { es: 'Mapa listo para cargar', en: 'Map ready to load' }, render: () => h(MapSlot) },
    { title: { es: 'OpenStreetMap listo para cargar', en: 'OpenStreetMap ready to load' }, render: () => h(MapSlot, { provider: 'osm', ratio: '4:3' }) },
    { title: { es: 'Sin proveedor (elección guardada)', en: 'No provider (saved choice)' }, render: () => h(MapSlot, { provider: 'none', ratio: '4:3' }) },
  ],
  a11y: [
    { es: 'El iframe lleva `title` para que el lector de pantalla lo anuncie; el placeholder es texto real, no una imagen de mapa.', en: 'The iframe carries a `title` so a screen reader announces it; the placeholder is real text, not a picture of a map.' },
    { es: 'Las coordenadas se imprimen junto al enlace, así el dato existe aunque el mapa no cargue.', en: 'The coordinates print next to the link, so the information survives a map that will not load.' },
  ],
  usedBy: ['W-06', 'M-08f'],
});
