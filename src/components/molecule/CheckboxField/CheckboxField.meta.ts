import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { CheckboxField } from './CheckboxField';
export default defineMeta({
  tier: 'molecule', name: 'CheckboxField',
  description: { es: 'Casilla nativa con etiqueta multilínea y área táctil completa; la casilla no se encoge.', en: 'Native checkbox with a wrapping full-label tap target; the control never shrinks.' },
  props: [{ name: 'checked', type: 'boolean', description: { es: 'Selección actual.', en: 'Current selection.' } }, { name: 'onChange', type: '(checked: boolean) => void', description: { es: 'Recibe la nueva selección.', en: 'Receives the new selection.' } }, { name: 'disabled', type: 'boolean', default: 'false', description: { es: 'Impide cambiar la selección.', en: 'Prevents changes.' } }, { name: 'children', type: 'ReactNode', description: { es: 'Etiqueta visible completa.', en: 'Complete visible label.' } }],
  states: ['unchecked', 'checked', 'disabled', 'keyboard focus', 'long wrapped label'],
  usages: [{ title: { es: 'Verificación y etiqueta larga', en: 'Verification and wrapped label' }, render: () => h('div', { className: 'stack' }, h(CheckboxField, { checked: false, onChange: () => {}, children: 'He revisado el ejemplo y sus participantes. / I reviewed the example and its participants.' }), h(CheckboxField, { checked: true, onChange: () => {}, children: 'Verificado / Verified' }), h(CheckboxField, { checked: false, disabled: true, onChange: () => {}, children: 'No disponible / Unavailable' })) }],
  a11y: [{ es: 'Etiqueta asociada de forma nativa; toda la etiqueta activa la casilla. Usa Espacio para cambiarla.', en: 'Native associated label; the entire label toggles the control. Space toggles keyboard selection.' }],
  usedBy: ['S-08'],
});
