import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ComingSoonLanding } from './ComingSoonLanding';
export default defineMeta({
  tier: 'template', name: 'ComingSoonLanding',
  description: { es: 'Preapertura independiente (dirección Pulso, 0156): mosaico de piezas redondeadas con el lema aprobado y el Instagram, la fecha de apertura, la foto real del estudio y las siete clases en sus tonos; idioma y aviso de login próximamente.', en: 'Standalone pre-launch surface (Pulso direction, 0156): a bento of rounded tiles with the approved tagline and Instagram link, the opening date, the real studio photo and the seven classes in their tones; language control and a login coming-soon dialog.' },
  props: [],
  states: ['Spanish', 'English', 'before opening day (date tile)', 'after opening day (Coming soon)', 'desktop bento 4 × 3', 'phone stack', 'login coming-soon dialog', 'dialog closed with focus restored', 'reduced motion (rings still)'],
  usages: [{ title: { es: 'Página de preapertura', en: 'Pre-launch page' }, render: () => h(ComingSoonLanding) }],
  a11y: [{ es: 'Título semántico, controles de 44 px, foco de alto contraste y fotografía estática del estudio.', en: 'Semantic heading, 44 px controls, high-contrast focus and a static studio photograph.' }],
  usedBy: ['W-11'],
});
