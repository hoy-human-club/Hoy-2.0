import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { Combobox, type ComboboxOption } from './Combobox';

const CLASSES: ComboboxOption[] = [
  { value: 'a', group: 'sáb, 24 de oct', label: '7:00 a. m. · Pulso · Barre Full Body', hint: 'Carolina Cifuentes · 7 / 16' },
  { value: 'b', group: 'sáb, 24 de oct', label: '9:10 a. m. · Fuego · Vinyasa Yoga', hint: 'Sara Crismatt · 16 / 16 · llena', disabled: true },
  { value: 'c', group: 'dom, 25 de oct', label: '8:10 a. m. · Híbrido · Pilates Upper Body', hint: 'Andrea · 4 / 10' },
  { value: 'd', group: 'dom, 25 de oct', label: '10:10 a. m. · Sólido · Power Yoga', hint: 'Raghu · 9 / 14' },
];

function Demo() {
  const [v, setV] = useState('');
  const [w, setW] = useState('c');
  return h('div', { className: 'stack-sm' },
    h(Combobox, { ariaLabel: 'Clase', placeholder: 'Elige una clase', options: CLASSES, value: v, onChange: setV }),
    h(Combobox, { ariaLabel: 'Clase', options: CLASSES, value: w, onChange: setW }),
    h(Combobox, { ariaLabel: 'Clase', placeholder: 'Elige una clase', options: CLASSES, value: '', onChange: () => {}, invalid: true }),
  );
}

export default defineMeta({
  tier: 'molecule', name: 'Combobox',
  description: { es: 'Elegir un valor de una lista larga escribiendo para filtrarla: la clase programada en recepción, asignar una persona, un servicio entre docenas.', en: 'Pick one value from a long list by typing to filter it: the scheduled class at the front desk, assigning a person, one service out of dozens.' },
  props: [
    { name: 'options', type: '{ value, label, hint?, group?, disabled? }[]', required: true, description: { es: 'En orden. group = encabezado (un día); hint = segunda línea, también se busca; disabled = visible pero no se puede elegir (clase llena).', en: 'In order. group = heading (a day); hint = second line, searched too; disabled = shown but cannot be picked (a full class).' } },
    { name: 'value / onChange', type: "string / (v: string) => void", required: true, description: { es: "Controlado. '' = nada elegido.", en: "Controlled. '' = nothing chosen." } },
    { name: 'ariaLabel', type: 'string', required: true, description: { es: 'Nombre del campo y de la lista.', en: 'Names the field and the list.' } },
    { name: 'placeholder', type: 'string', description: { es: 'Texto cuando no hay elección.', en: 'Shown when nothing is chosen.' } },
    { name: 'limit', type: 'number', default: '60', description: { es: 'Filas a la vez; el resto se cuenta y se acota escribiendo.', en: 'Rows at a time; the rest are counted and narrowed by typing.' } },
    { name: 'invalid / disabled', type: 'boolean', default: 'false', description: { es: 'Como el átomo Input.', en: 'As the Input atom.' } },
  ],
  states: ['default (placeholder)', 'chosen', 'open', 'filtered', 'active option', 'disabled option', 'no matches', 'more than limit', 'focus', 'invalid', 'disabled'],
  usages: [{ title: { es: 'Clase programada', en: 'Scheduled class' }, render: () => h(Demo) }],
  a11y: [
    { es: 'Patrón combobox de ARIA 1.2: input role=combobox con aria-expanded, aria-controls y aria-activedescendant; lista role=listbox con role=option y aria-selected.', en: 'ARIA 1.2 combobox pattern: input role=combobox with aria-expanded, aria-controls and aria-activedescendant; role=listbox list with role=option and aria-selected.' },
    { es: 'Flechas mueven, Enter elige, Escape cierra y restaura; la búsqueda ignora tildes y mayúsculas.', en: 'Arrows move, Enter picks, Escape closes and restores; search ignores accents and case.' },
  ],
  usedBy: ['S-02'],
});
