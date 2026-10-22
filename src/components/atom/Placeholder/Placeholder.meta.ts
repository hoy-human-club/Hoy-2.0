import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Placeholder } from './Placeholder';
import { Button } from '../Button/Button';

export default defineMeta({
  tier: 'atom', name: 'Placeholder',
  description: {
    es: 'Envuelve un control que todavía no funciona: tooltip “Aún no conectado · Not wired yet”, texto para lectores de pantalla, clic y Enter bloqueados en fase de captura, toast en su lugar y contorno punteado siempre visible en modo dev.',
    en: 'Wraps a control that does not work yet: an “Aún no conectado · Not wired yet” tooltip, screen-reader text, click and Enter blocked in the capture phase, a toast instead, and a dashed outline always visible in dev mode.',
  },
  props: [
    { name: 'what', type: 'string', required: true, description: { es: 'Qué no está conectado, ya traducido; va al tooltip y al toast.', en: 'What is not wired, already translated; it goes into the tooltip and the toast.' } },
    { name: 'block', type: 'boolean', default: 'false', description: { es: 'Ocupa toda la fila en vez de ajustarse al control.', en: 'Fills the row instead of shrinking to the control.' } },
  ],
  states: ['default', 'modo dev (contorno punteado + punto)', 'activado (toast)'],
  usages: [
    { title: { es: 'Botón sin conectar', en: 'Unwired button' }, render: () => h(Placeholder, { what: 'Exportar PDF' }, h(Button, { variant: 'secondary' }, 'Exportar PDF')) },
    { title: { es: 'Bloque', en: 'Block' }, render: () => h(Placeholder, { what: 'Simulador de voz', block: true }, h(Button, { variant: 'secondary', block: true }, 'Hablar con el sistema')) },
  ],
  a11y: [
    { es: 'aria-describedby en el control envuelto con el texto “Aún no conectado: {qué}”.', en: 'aria-describedby on the wrapped control with the “Not wired yet: {what}” text.' },
    { es: 'Bloquea clic, Enter y Espacio en captura, así el control conserva su foco y su rol.', en: 'Blocks click, Enter and Space in the capture phase, so the control keeps its focus and role.' },
  ],
  usedBy: ['HUB-01', 'M-10a'],
});
