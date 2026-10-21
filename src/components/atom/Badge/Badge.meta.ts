import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Badge } from './Badge';

export default defineMeta({
  tier: 'atom', name: 'Badge',
  description: { es: 'Etiqueta de estado compacta con seis tonos. toneForStatus() mapea strings comunes.', en: 'Compact status label with six tones. toneForStatus() maps common strings.' },
  props: [{ name: 'tone', type: "'neutral' | 'primary' | 'success' | 'warn' | 'danger' | 'highlight'", default: 'neutral', description: { es: 'Color semántico.', en: 'Semantic colour.' } }],
  states: ['default'],
  usages: [{ title: { es: 'Tonos', en: 'Tones' }, render: () => h('div', { className: 'row wrap' }, h(Badge, null, 'neutral'), h(Badge, { tone: 'primary' }, 'booked'), h(Badge, { tone: 'success' }, 'active'), h(Badge, { tone: 'warn' }, 'pending'), h(Badge, { tone: 'danger' }, 'cancelled'), h(Badge, { tone: 'highlight' }, 'Mejor valor')) }],
  a11y: [{ es: 'Solo color + texto; nunca solo color.', en: 'Colour plus text; never colour alone.' }],
  usedBy: ['S-07', 'S-08', 'C-29', 'M-15', 'P-02', 'M-03', 'P-01', 'C-01', 'DEV-SPECS', 'HUB-01', 'M-08g', 'M-10', 'M-10a', 'D-07'],
});
