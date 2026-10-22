import { addDays, startOfDay, studioParts } from '../../../i18n/format';
import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { DateStrip } from './DateStrip';

const days = Array.from({ length: 7 }, (_, i) => { return addDays(startOfDay(new Date()), i); });
function Demo() { const [v, setV] = useState(0); return h(DateStrip, { days, value: v, onChange: setV, counts: [4, 4, 3, 4, 4, 2, 0], disabledIndex: (i) => studioParts(days[i]).weekday === 0 }); }

export default defineMeta({
  tier: 'molecule', name: 'DateStrip',
  description: { es: 'Tira horizontal de días desde hoy; el día elegido es la píldora primaria. Puntos opcionales indican cuántas clases hay.', en: 'Horizontal strip of days starting today; the selected day is the primary pill. Optional dots show how many classes there are.' },
  props: [
    { name: 'days', type: 'Date[]', required: true, description: { es: 'Normalmente dayList(7).', en: 'Usually dayList(7).' } },
    { name: 'value / onChange', type: 'number / (i) => void', required: true, description: { es: 'Índice seleccionado.', en: 'Selected index.' } },
    { name: 'counts', type: 'number[]', description: { es: 'Clases por día (máx. 4 puntos).', en: 'Classes per day (max 4 dots).' } },
    { name: 'disabledIndex', type: '(i) => boolean', description: { es: 'Días sin clases (domingo).', en: 'Days without classes (Sunday).' } },
  ],
  states: ['default', 'active', 'hover', 'disabled (closed day)'],
  usages: [{ title: { es: 'Siete días', en: 'Seven days' }, render: () => h(Demo) }],
  a11y: [{ es: 'role=tablist; cada día es un botón ≥56×64px con aria-selected.', en: 'role=tablist; each day is a ≥56×64px button with aria-selected.' }],
  usedBy: ['C-02', 'C-08b', 'C-18'],
});
