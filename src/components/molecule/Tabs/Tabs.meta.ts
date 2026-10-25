import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { Tabs } from './Tabs';

type Seg = 'all' | 'at_risk' | 'new' | 'no_membership' | 'birthdays';

function Demo() {
  const [v, setV] = useState<Seg>('all');
  return h(Tabs<Seg>, {
    ariaLabel: 'Segmentos', value: v, onChange: setV,
    items: [{ value: 'all', label: 'Todos', count: 31 }, { value: 'at_risk', label: 'En riesgo', count: 0 }, { value: 'new', label: 'Nuevos este mes', count: 1 }, { value: 'no_membership', label: 'Sin clases', count: 7 }, { value: 'birthdays', label: 'Cumpleaños', count: 6 }],
  });
}

export default defineMeta({
  tier: 'molecule', name: 'Tabs',
  description: { es: 'Cambia entre secciones o subconjuntos de una misma página: los segmentos del CRM. El único estilo de pestaña: subrayado, con conteo opcional.', en: 'Switches between sections or subsets of one page: the CRM segments. The only tab style: underline, with an optional count.' },
  props: [
    { name: 'items', type: '{ value, label, count? }[]', required: true, description: { es: 'En orden. count se muestra también en 0.', en: 'In order. count shows at 0 too.' } },
    { name: 'value / onChange', type: 'T / (v: T) => void', required: true, description: { es: 'Controlado.', en: 'Controlled.' } },
    { name: 'ariaLabel', type: 'string', required: true, description: { es: 'Nombre de la lista de pestañas.', en: 'Names the tab list.' } },
    { name: 'panelId', type: 'string', description: { es: 'id de la región que cambian (aria-controls).', en: 'id of the region they switch (aria-controls).' } },
  ],
  states: [
    'studio look (0160): pill track, active tab is the ink pill','default', 'active', 'hover', 'focus', 'with count', 'zero count', 'overflow (scrolls, never wraps)'],
  usages: [{ title: { es: 'Segmentos del CRM', en: 'CRM segments' }, render: () => h(Demo) }],
  a11y: [
    { es: 'role=tablist con role=tab y aria-selected; tabindex itinerante: Tab entra a la pestaña activa, ←/→, Inicio y Fin se mueven.', en: 'role=tablist with role=tab and aria-selected; roving tabindex: Tab lands on the active tab, ←/→, Home and End move.' },
    { es: 'Activa = subrayado de 2 px y texto en ink, no solo color.', en: 'Active = 2 px underline and ink label, not colour alone.' },
  ],
  usedBy: ['M-06'],
});
