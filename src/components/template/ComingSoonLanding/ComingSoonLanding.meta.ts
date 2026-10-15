import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ComingSoonLanding } from './ComingSoonLanding';
export default defineMeta({
  tier: 'template', name: 'ComingSoonLanding',
  description: { es: 'Preapertura independiente: marca, fotografía real del estudio, idioma, aviso de login próximamente y enlace al Instagram del estudio.', en: 'Standalone pre-launch surface with the wordmark, real studio photography, language control, a login coming-soon dialog and the studio Instagram link.' },
  props: [],
  states: ['Spanish', 'English', 'login coming-soon dialog', 'dialog closed with focus restored', 'responsive studio photo', 'static under all motion / data preferences'],
  usages: [{ title: { es: 'Página de preapertura', en: 'Pre-launch page' }, render: () => h(ComingSoonLanding) }],
  a11y: [{ es: 'Título semántico, controles de 44 px, foco de alto contraste y fotografía estática del estudio.', en: 'Semantic heading, 44 px controls, high-contrast focus and a static studio photograph.' }],
  usedBy: ['W-11'],
});
