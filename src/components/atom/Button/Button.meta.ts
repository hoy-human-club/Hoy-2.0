import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Button } from './Button';

export default defineMeta({
  tier: 'atom', name: 'Button',
  description: { es: 'Acción principal, secundaria, tonal, con borde, fantasma o destructiva. Pill, tres tamaños, estado de carga.', en: 'Primary, secondary, tonal, outline, ghost or destructive action. Pill, three sizes, loading state.' },
  props: [
    { name: 'variant', type: "'primary' | 'secondary' | 'tonal' | 'outline' | 'ghost' | 'danger'", default: 'primary', description: { es: 'Jerarquía visual. tonal = tinte de marca al 12 %, texto de marca, sin sombra (acción principal repetida en filas); outline = borde de control de 1 px, texto normal (acción secundaria que debe leerse como botón).', en: 'Visual hierarchy. tonal = 12% brand tint, brand text, no shadow (a main action repeated on rows); outline = 1 px control border, default text (a secondary action that must read as a button).' } },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: 'md', description: { es: 'Altura 44 / 44 / 48 (--h-ctl, --h-ctl-lg); relleno 0 × 12 / 16 / 24 (--btn-pad-x en md). Dentro de RowActions, sm mide 36 visibles (--h-ctl-sm), texto --fs-xs, icono 16, y conserva 44 de área táctil.', en: 'Height 44 / 44 / 48 (--h-ctl, --h-ctl-lg); padding 0 × 12 / 16 / 24 (--btn-pad-x on md). Inside RowActions, sm is 36 visible (--h-ctl-sm), --fs-xs text, 16 icon, and keeps a 44 hit area.' } },
    { name: 'loading', type: 'boolean', default: 'false', description: { es: 'Muestra spinner y bloquea.', en: 'Shows spinner and blocks.' } },
    { name: 'block', type: 'boolean', default: 'false', description: { es: 'Ancho completo.', en: 'Full width.' } },
    { name: 'icon', type: 'IconName | ReactNode', description: { es: 'Icono a la izquierda: un nombre del set Icon o un nodo. Decorativo; la etiqueta nombra la acción.', en: 'Leading icon: an Icon set name or a node. Decorative; the label names the action.' } },
  ],
  states: ['default', 'hover', 'active', 'focus', 'disabled', 'loading'],
  usages: [
    { title: { es: 'Variantes', en: 'Variants' }, render: () => h('div', { className: 'row wrap' }, h(Button, null, 'Reservar'), h(Button, { variant: 'secondary' }, 'Ver horario'), h(Button, { variant: 'ghost' }, 'Cancelar'), h(Button, { variant: 'danger' }, 'Eliminar')) },
    { title: { es: 'Tamaños y estados', en: 'Sizes and states' }, render: () => h('div', { className: 'row wrap' }, h(Button, { size: 'sm' }, 'Pequeño'), h(Button, { size: 'lg' }, 'Grande'), h(Button, { loading: true }, 'Guardando'), h(Button, { disabled: true }, 'Deshabilitado')) },
    { title: { es: 'Con icono (recepción)', en: 'With icon (front desk)' }, render: () => h('div', { className: 'row wrap' }, h(Button, { icon: 'user-check' }, 'Check-in'), h(Button, { variant: 'secondary', icon: 'user-plus' }, 'Registrar nuevo'), h(Button, { variant: 'secondary', icon: 'promote' }, 'Pasar a la clase'), h(Button, { variant: 'ghost', icon: 'cancel' }, 'Cancelar reserva'), h(Button, { size: 'sm', variant: 'ghost', icon: 'invite' }, 'Invitar')) },
    { title: { es: 'Tonal y outline en fila densa (RowActions)', en: 'Tonal and outline in a dense row (RowActions)' }, render: () => h('div', { className: 'stack-sm' },
      h('div', { className: 'row wrap is-dense' }, h(Button, { size: 'sm', variant: 'tonal', icon: 'check' }, 'Check-in'), h(Button, { size: 'sm', variant: 'outline', icon: 'user-x' }, 'No vino')),
      h('div', { className: 'row wrap is-dense' }, h(Button, { size: 'sm', variant: 'tonal', icon: 'check', loading: true }, 'Check-in'), h(Button, { size: 'sm', variant: 'outline', icon: 'user-x', disabled: true }, 'No vino'), h(Button, { size: 'sm', variant: 'tonal', icon: 'promote', disabled: true }, 'Promover')),
      h('div', { className: 'row wrap' }, h(Button, { variant: 'tonal', icon: 'check' }, 'Tonal md'), h(Button, { variant: 'outline', icon: 'undo' }, 'Outline md'))) },
  ],
  a11y: [{ es: 'Tonal y outline: hover sube el tinte / rellena surface-2, active baja 1 px, foco con el anillo global.', en: 'Tonal and outline: hover deepens the tint / fills surface-2, active drops 1 px, focus uses the global ring.' }, { es: 'Usa <button>; aria-busy en carga; foco visible con anillo de 2px.', en: 'Native <button>; aria-busy while loading; 2px visible focus ring.' }],
  usedBy: ['S-07', 'S-08', 'C-29', 'M-15', 'P-02', 'C-01', 'P-01', 'M-03', 'HUB-01', 'S-02', 'S-03'],
});
