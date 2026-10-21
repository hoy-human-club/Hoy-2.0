import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { Drawer } from './Drawer';
import { Button } from '../../atom/Button/Button';

function Demo() {
  const [open, setOpen] = useState(false);
  return h('div', null, h(Button, { variant: 'secondary', onClick: () => setOpen(true) }, 'Abrir drawer'), h(Drawer, { open, onClose: () => setOpen(false), title: 'Detalle', footer: h(Button, { onClick: () => setOpen(false) }, 'Listo') }, h('p', null, 'Contenido del panel. Escape o el fondo lo cierran.')));
}

function DemoBottom() {
  const [open, setOpen] = useState(false);
  return h('div', null, h(Button, { variant: 'secondary', onClick: () => setOpen(true) }, 'Abrir hoja'), h(Drawer, { open, onClose: () => setOpen(false), side: 'bottom', title: 'Confirmar' }, h('p', null, 'Hoja inferior en el teléfono; diálogo centrado desde 900 px.')));
}

export default defineMeta({
  tier: 'organism', name: 'Drawer',
  description: { es: 'Panel deslizante (derecha, izquierda o abajo) en portal, con cabecera, cuerpo desplazable y pie.', en: 'Slide-over panel (right, left or bottom) in a portal, with header, scrollable body and footer.' },
  props: [
    { name: 'open / onClose', type: 'boolean / () => void', required: true, description: { es: 'Control.', en: 'Control.' } },
    { name: 'side', type: "'right' | 'left' | 'bottom'", default: 'right', description: { es: 'Lado de entrada.', en: 'Entry side.' } },
    { name: 'width', type: 'number', default: '420', description: { es: 'Ancho en px (lados).', en: 'Width in px (sides).' } },
    { name: 'title / footer', type: 'ReactNode', description: { es: 'Cabecera y pie.', en: 'Header and footer.' } },
    { name: 'desktop', type: "'dialog' | 'sheet'", default: 'dialog', description: { es: 'Cómo se ve una hoja inferior desde 900 px: diálogo centrado o hoja completa.', en: 'How a bottom sheet renders from 900 px: centred dialog or full-width sheet.' } },
  ],
  states: ['closed', 'open', 'accessible title', 'mobile-fullwidth', 'bottom-sheet (< 900 px)', 'desktop-dialog (≥ 900 px)', 'focus-trapped (Tab cycles inside)', 'scroll-locked (body does not scroll behind the overlay)'],
  usages: [{ title: { es: 'Interactivo', en: 'Interactive' }, render: () => h(Demo) }, { title: { es: 'Hoja / diálogo (side="bottom")', en: 'Sheet / dialog (side="bottom")' }, render: () => h(DemoBottom) }],
  a11y: [{ es: 'role="dialog" aria-modal; el foco entra al abrir, queda atrapado (Tab / Shift+Tab ciclan dentro) y vuelve al disparador al cerrar; Escape cierra solo el diálogo más interno; el documento no se desplaza detrás.', en: 'role="dialog" aria-modal; focus enters on open, is trapped (Tab / Shift+Tab cycle inside) and returns to the trigger on close; Escape closes only the innermost dialog; the document does not scroll behind it.' }],
  usedBy: ['M-14', 'M-03', 'InspectorPanel', 'C-02', 'C-04', 'C-06', 'C-08b', 'W-04', 'M-08g', 'D-07', 'W-11'],
});
