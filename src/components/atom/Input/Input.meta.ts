import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Input, Select } from './Input';

export default defineMeta({
  tier: 'atom', name: 'Input',
  description: { es: 'Campo de texto y select con el mismo chasis. Úsalo dentro de Field para etiqueta y error.', en: 'Text input and select sharing one chassis. Use inside Field for label and error.' },
  props: [
    { name: 'invalid', type: 'boolean', description: { es: 'Borde de error + aria-invalid.', en: 'Error border + aria-invalid.' } },
    { name: '...InputHTMLAttributes', type: 'native', description: { es: 'Todo lo nativo pasa.', en: 'All native props pass through.' } },
  ],
  states: ['default', 'focus', 'disabled', 'invalid', 'date with minimum/maximum'],
  usages: [
    { title: { es: 'Texto', en: 'Text' }, render: () => h('div', { className: 'stack-sm', style: { maxWidth: 320 } }, h(Input, { placeholder: 'correo@ejemplo.com' }), h(Input, { invalid: true, defaultValue: 'no-es-un-correo' }), h(Input, { disabled: true, placeholder: 'Deshabilitado' })) },
    { title: { es: 'Fecha con vigencia', en: 'Date within validity' }, render: () => h(Input, { type: 'date', defaultValue: '2026-11-03', min: '2026-11-01', max: '2026-11-04', 'aria-label': 'Fecha / Date' }) },
    { title: { es: 'Select', en: 'Select' }, render: () => h(Select, { defaultValue: 'a', style: { maxWidth: 320 } }, h('option', { value: 'a' }, 'Todas las modalidades'), h('option', { value: 'b' }, 'Fuego')) },
  ],
  a11y: [{ es: 'Siempre con <label> (Field lo hace); aria-invalid en error.', en: 'Always labelled (Field does it); aria-invalid on error.' }],
  usedBy: ['MaintenanceWorkbench', 'M-10a', 'ProblemReport', 'M-17', 'S-09', 'C-08b', 'S-07', 'S-08', 'C-29', 'M-15', 'P-02', 'A-02', 'M-03', 'S-04', 'MessageComposer', 'ConversationList', 'D-06'],
});
