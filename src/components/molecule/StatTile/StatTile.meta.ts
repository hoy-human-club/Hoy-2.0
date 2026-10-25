import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { StatTile } from './StatTile';

export default defineMeta({
  tier: 'molecule', name: 'StatTile',
  description: { es: 'Métrica única: etiqueta, valor grande, pista y tendencia. El valor nunca parte línea: se encoge hasta caber en el ancho de la tarjeta.', en: 'Single metric: label, big value, hint and trend. The value never wraps: it shrinks to fit the tile width.' },
  props: [
    { name: 'label', type: 'string', required: true, description: { es: 'Qué se mide. Máximo dos líneas, luego elipsis.', en: 'What is measured. Two lines at most, then an ellipsis.' } },
    { name: 'value', type: 'ReactNode', required: true, description: { es: 'El número. Se mide tras el layout y baja de tamaño (hasta 50 %) para caber en una sola línea.', en: 'The number. Measured after layout and scaled down (to 50 %) so it stays on one line.' } },
    { name: 'hint', type: 'string', description: { es: 'Contexto. Máximo dos líneas.', en: 'Context. Two lines at most.' } },
    { name: 'trend', type: "'up' | 'down' | 'flat'", description: { es: 'Flecha coloreada; conserva su tamaño aunque el valor se encoja.', en: 'Coloured arrow; keeps its size even when the value shrinks.' } },
  ],
  states: [
    'studio look (0160): in a grid the tiles take the class tones river, sun, clay, moss in turn (deep ink; paper on moss)','default', 'trend-up', 'trend-down', 'long-value'],
  usages: [
    { title: { es: 'Fila de tres', en: 'Row of three' }, render: () => h('div', { className: 'grid grid-3' }, h(StatTile, { label: 'Clases este mes', value: 12, trend: 'up', hint: '+3 vs. agosto' }), h(StatTile, { label: 'Racha', value: '4 sem', trend: 'flat' }), h(StatTile, { label: 'Ocupación', value: '82%', trend: 'down', hint: 'promedio 7 días' })) },
    { title: { es: 'Valor largo en columna estrecha (0019)', en: 'Long value in a narrow column (0019)' }, render: () => h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 118px)', gap: 12 } }, h(StatTile, { label: 'Nómina estimada', value: 'COP 15,326,000', trend: 'up', hint: 'clases dictadas × tarifa' }), h(StatTile, { label: 'Balance del periodo', value: '− $ 8.113.800', trend: 'down', hint: 'margen −53 % sobre ingresos' }), h(StatTile, { label: 'Última visita registrada en el estudio', value: 'mié, 17 sept', hint: 'una etiqueta larga se corta en la segunda línea con puntos suspensivos' })) },
  ],
  a11y: [{ es: 'La tendencia es decorativa; el hint lleva el significado. El texto encogido sigue siendo texto real (seleccionable, legible por lector de pantalla).', en: 'Trend arrow is decorative; the hint carries meaning. The shrunk value is still real text (selectable, readable by a screen reader).' }],
  usedBy: ['C-01', 'C-07b', 'C-22', 'S-01', 'S-03', 'M-01', 'M-02d', 'M-06', 'M-09', 'M-09a', 'M-09b', 'M-09c'],
});
