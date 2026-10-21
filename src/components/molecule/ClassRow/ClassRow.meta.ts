import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ClassRow } from './ClassRow';

const at = (hh: number) => { const d = new Date(); d.setHours(hh, 30, 0, 0); return d.toISOString(); };

export default defineMeta({
  tier: 'molecule', name: 'ClassRow',
  description: { es: 'Fila densa de clase: hora, título, profesor, punto con el tono de la clase y cupos.', en: 'Dense class row: time, title, teacher, class-tone dot and capacity.' },
  props: [
    { name: 'title / teacher / startsAt / durationMin', type: 'string | number', required: true, description: { es: 'Datos de la sesión.', en: 'Session data.' } },
    { name: 'thumbnail', type: 'ReactNode', description: { es: 'Foto del catálogo compartido con el CMS.', en: 'Photo from the shared CMS catalogue.' } },
    { name: 'tone', type: 'Tone', required: true, description: { es: 'Color del punto (tono de la modalidad).', en: 'Dot colour (the modality tone).' } },
    { name: 'booked / capacity', type: 'number', required: true, description: { es: 'Para CapacityMeter; con booked ≥ capacity la fila muestra la píldora «Sin cupos» en lugar del medidor.', en: 'For CapacityMeter; when booked ≥ capacity the row shows the “Full” pill instead of the meter.' } },
    { name: 'status', type: "'scheduled' | 'cancelled' | 'completed'", default: 'scheduled', description: { es: 'Tachado en cancelada.', en: 'Struck through when cancelled.' } },
    { name: 'disabled / availabilityLabel', type: 'boolean / string', description: { es: 'Atenúa la fila y desactiva el botón; explica el motivo en texto.', en: 'Mutes the row and disables its button; explains the reason in text.' } },
    { name: 'onClick', type: '() => void', description: { es: 'Convierte la fila en botón.', en: 'Makes the row a button.' } },
  ],
  states: ['disabled (muted, no interaction)', 'availability label', 'with-thumbnail', 'default', 'hover', 'booked-by-me', 'cancelled', 'completed', 'full'],
  usages: [{ title: { es: 'Lista de hoy', en: 'Today list' }, render: () => h('div', null, h(ClassRow, { title: 'Ligereza', teacher: 'Manuela Torres', startsAt: at(6), durationMin: 60, tone: 'river', booked: 9, capacity: 15, booked_by_me: true, onClick: () => {} }), h(ClassRow, { title: 'Pilates · sin cupos', teacher: 'Paula Mejía', startsAt: at(8), durationMin: 55, tone: 'moss', booked: 15, capacity: 15, onClick: () => {} }), h(ClassRow, { title: 'Fuego', teacher: 'Andrés Quintero', startsAt: at(17), durationMin: 60, tone: 'clay', booked: 4, capacity: 15, status: 'cancelled', disabled: true, availabilityLabel: 'Cancelada', onClick: () => {} })) }],
  a11y: [{ es: 'Botón cuando hay onClick; el estado va en texto (badge), no solo en color.', en: 'Button when onClick; status is text (badge), not colour alone.' }],
  usedBy: ['C-01', 'C-02', 'S-02', 'S-03', 'P-SCHEDULE'],
});
