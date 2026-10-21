import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Card } from './Card';

export default defineMeta({
  tier: 'molecule', name: 'Card',
  description: { es: 'Superficie física base con sombra de tres capas y radio 16. Tonos: surface, primary, highlight, muted.', en: 'Base physical surface with three-layer shadow and 16 radius. Tones: surface, primary, highlight, muted.' },
  props: [
    { name: 'title / eyebrow / actions', type: 'ReactNode', description: { es: 'Cabecera opcional.', en: 'Optional header.' } },
    { name: 'icon', type: 'IconName | ReactNode', description: { es: 'Glifo en un cuadro teñido junto al título (secciones de Ajustes).', en: 'Glyph in a tinted tile beside the title (Settings sections).' } },
    { name: 'padding', type: "'none' | 'sm' | 'md' | 'lg'", default: 'md', description: { es: 'Relleno igual en los cuatro lados: sm 12 · md --card-pad (16 teléfono / 24 desde 768) · lg --card-pad-lg (24 / 32).', en: 'Equal on all four sides: sm 12 · md --card-pad (16 phone / 24 from 768) · lg --card-pad-lg (24 / 32).' } },
    { name: 'tone', type: "'surface' | 'primary' | 'highlight' | 'muted'", default: 'surface', description: { es: 'Material.', en: 'Material.' } },
    { name: 'raised / interactive', type: 'boolean', description: { es: 'Elevación mayor / hover que levanta.', en: 'Higher elevation / lifting hover.' } },
  ],
  states: ['arched teacher card', 'default', 'with icon', 'raised', 'interactive-hover'],
  usages: [{ title: { es: 'Maestro · arco completo', en: 'Teacher · full arch' }, render: () => h('div', { className: 'site', 'data-edition': 'sanctuary', style: { maxWidth: 340 } }, h(Card, { className: 'site-teacher' }, h('div', { className: 'site-teacher-monogram', 'data-tone': 'clay', role: 'img', 'aria-label': 'Profesora de muestra / Sample teacher' }, h('span', { 'aria-hidden': true }, 'MP')), h('div', { className: 'site-teacher-copy' }, 'Monograma en el tono de su clase (0051) / Monogram in the class tone'))) },{ title: { es: 'Tonos', en: 'Tones' }, render: () => h('div', { className: 'grid grid-2' }, h(Card, { eyebrow: 'Hoy', title: 'Fuego · 6:30' }, 'Superficie.'), h(Card, { tone: 'primary', title: 'Próxima clase' }, 'Primario.'), h(Card, { tone: 'highlight', title: 'Mejor valor' }, 'Realce.'), h(Card, { tone: 'muted', interactive: true, title: 'Interactiva' }, 'Pasa el cursor.')) }, { title: { es: 'Con icono (M-08)', en: 'With icon (M-08)' }, render: () => h('div', { className: 'grid grid-2' }, h(Card, { icon: 'clock', title: 'Horarios' }, 'Sección de ajustes.'), h(Card, { icon: 'policies', eyebrow: 'M-08a', title: 'Políticas' }, 'Con eyebrow.')) }],
  a11y: [{ es: 'Si es interactiva, el hijo debe tener el control accesible (botón o enlace).', en: 'When interactive, the child must hold the accessible control (button or link).' }],
  usedBy: ['M-14', 'M-13', 'C-28', 'C-01', 'HUB', 'P-01', 'M-03', 'M-08', 'D-01', 'D-02'],
});
