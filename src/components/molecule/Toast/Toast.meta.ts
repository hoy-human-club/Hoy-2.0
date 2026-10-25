import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Button } from '../../atom/Button/Button';
import { toast } from '../../../app/toast';

export default defineMeta({
  tier: 'molecule', name: 'Toast',
  description: {
    es: 'Aviso de una línea. `<Toasts/>` se monta una sola vez en App.tsx y cualquier módulo llama a toast() desde src/app/toast.ts. Se apila, se auto-descarta y se puede cerrar a mano.',
    en: 'One-line notice. `<Toasts/>` mounts once in App.tsx and any module calls toast() from src/app/toast.ts. They stack, auto-dismiss and can be closed by hand.',
  },
  props: [
    { name: 'max', type: 'number', default: '4', description: { es: 'Cuántos avisos se ven a la vez.', en: 'How many notices show at once.' } },
    { name: 'toast(text, tone, ttl)', type: "(string, 'neutral' | 'success' | 'warn' | 'danger', number) => string", description: { es: 'La función del bus, no una prop: la llama quien quiera avisar.', en: 'The bus function, not a prop: anything that needs to notify calls it.' } },
  ],
  states: [
    'studio look (0160): dark ink tile, status kept on the left edge','neutral', 'success', 'warn', 'danger', 'vacío (no renderiza nada)'],
  usages: [
    { title: { es: 'Los cuatro tonos', en: 'The four tones' }, render: () => h('div', { className: 'row wrap' },
      h(Button, { size: 'sm', variant: 'secondary', onClick: () => toast('Guardado') }, 'neutral'),
      h(Button, { size: 'sm', variant: 'secondary', onClick: () => toast('Reserva confirmada', 'success') }, 'success'),
      h(Button, { size: 'sm', variant: 'secondary', onClick: () => toast('Aún no conectado: Exportar', 'warn') }, 'warn'),
      h(Button, { size: 'sm', variant: 'secondary', onClick: () => toast('No se pudo cobrar', 'danger') }, 'danger')) },
  ],
  a11y: [
    { es: 'Cada aviso es role="status" (región viva educada): se anuncia sin robar el foco.', en: 'Each notice is role="status" (polite live region): announced without stealing focus.' },
    { es: 'El botón de cerrar mide 44 px y tiene nombre accesible.', en: 'The close button is a 44 px target with an accessible name.' },
  ],
  usedBy: ['HUB-01'],
});
