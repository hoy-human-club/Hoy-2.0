import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Notice } from './Notice';
import { Button } from '../../atom/Button/Button';

export default defineMeta({
  tier: 'molecule', name: 'Notice',
  description: { es: 'Banner en línea para estados que la página debe explicar: clase cancelada, pago rechazado, pasarela caída, guardado.', en: 'Inline banner for states the page must explain: cancelled class, declined payment, gateway down, saved.' },
  props: [
    { name: 'tone', type: "'info' | 'success' | 'warn' | 'danger'", default: 'info', description: { es: 'Color e icono.', en: 'Colour and glyph.' } },
    { name: 'title', type: 'ReactNode', description: { es: 'Línea en negrita.', en: 'Bold line.' } },
    { name: 'action', type: 'ReactNode', description: { es: 'Botón o enlace a la derecha.', en: 'Button or link on the right.' } },
    { name: 'icon', type: 'IconName | ReactNode', description: { es: 'Sustituye el glifo del tono (info, check, alert, circle-alert).', en: 'Replaces the tone glyph (info, check, alert, circle-alert).' } },
  ],
  states: ['info', 'success', 'warn', 'danger', 'with action'],
  usages: [{ title: { es: 'Cuatro tonos', en: 'Four tones' }, render: () => h('div', { className: 'stack-sm' },
    h(Notice, { tone: 'info', title: 'Pago con Wompi' }, 'Integración pendiente: este botón simula una aprobación.'),
    h(Notice, { tone: 'success', title: 'Reserva confirmada' }, 'Te enviamos el recibo por WhatsApp y email.'),
    h(Notice, { tone: 'warn', title: 'Dentro de la ventana de cancelación' }, 'Si cancelas ahora, la clase se cuenta como tomada.'),
    h(Notice, { tone: 'danger', title: 'El estudio canceló esta clase', action: h(Button, { size: 'sm', variant: 'secondary' }, 'Ver alternativas') }, 'La clase ya volvió a tu paquete.'),
  ) }],
  a11y: [{ es: 'role=alert en warn/danger, role=status en info/success; el tono nunca es solo color (icono + texto).', en: 'role=alert for warn/danger, role=status for info/success; tone is never colour alone (glyph + text).' }],
  usedBy: ['S-07', 'S-08', 'C-29', 'M-15', 'P-02', 'M-13', 'C-28', 'C-03', 'C-04', 'C-05', 'C-08', 'C-20', 'C-22', 'E-02', 'E-03', 'E-04', 'M-08g', 'M-10', 'M-10a', 'D-07'],
});
