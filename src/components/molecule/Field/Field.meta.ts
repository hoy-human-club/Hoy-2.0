import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Field } from './Field';
import { Input } from '../../atom/Input/Input';

export default defineMeta({
  tier: 'molecule', name: 'Field',
  description: { es: 'Etiqueta + control + pista o error. Genera el id y lo pasa al hijo.', en: 'Label + control + hint or error. Generates the id and hands it to the child.' },
  props: [
    { name: 'label', type: 'string', required: true, description: { es: 'Texto de la etiqueta.', en: 'Label text.' } },
    { name: 'hint / error', type: 'string', description: { es: 'Mensaje bajo el control; error gana.', en: 'Message under the control; error wins.' } },
    { name: 'children', type: '(id) => ReactNode', required: true, description: { es: 'Render del control con el id.', en: 'Control render with the id.' } },
  ],
  states: ['default', 'hint', 'error', 'required'],
  usages: [{ title: { es: 'Con Input', en: 'With Input' }, render: () => h('div', { className: 'stack-sm', style: { maxWidth: 320 } }, h(Field, { label: 'Correo', required: true, hint: 'Usaremos este correo para el recibo.', children: (id: string) => h(Input, { id, placeholder: 'correo@ejemplo.com' }) }), h(Field, { label: 'Teléfono', error: 'Falta el indicativo.', children: (id: string) => h(Input, { id, invalid: true, defaultValue: '300 000 0000' }) })) }],
  a11y: [{ es: 'label[for] enlazado; el error usa role="alert".', en: 'label[for] wired; error uses role="alert".' }],
  usedBy: ['S-07', 'S-08', 'C-29', 'M-15', 'P-02', 'M-13', 'C-28', 'A-02', 'A-03', 'S-04', 'M-03', 'D-06', 'M-08g', 'D-07'],
});
