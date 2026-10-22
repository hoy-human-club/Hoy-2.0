import { atStudioTime } from '../../../i18n/format';
import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { RoomDayGrid, type RoomBlock } from './RoomDayGrid';

const day = (hh: number, mm = 0) => { return atStudioTime(new Date(), hh, mm).toISOString(); };
const rooms = [{ id: 'a', name: 'Sala principal', capacity: 15 }, { id: 'b', name: 'Sala de meditación', capacity: 8 }];
const blocks: RoomBlock[] = [
  { id: '1', roomId: 'a', startsAt: day(6), endsAt: day(7), title: 'Ligereza', sub: 'Manuela · 9/15', tone: 'river', status: 'class' },
  { id: '2', roomId: 'a', startsAt: day(12), endsAt: day(13), title: 'Fuego', sub: 'Andrés · 15/15', tone: 'clay', status: 'class' },
  { id: '3', roomId: 'a', startsAt: day(16), endsAt: day(17, 30), title: 'Sesión privada · equipo', sub: 'Paula · Lumen Studio', tone: 'private', status: 'confirmed' },
  { id: '4', roomId: 'b', startsAt: day(8), endsAt: day(11), title: 'Mantenimiento', tone: 'maintenance', status: 'confirmed' },
  { id: '5', roomId: 'b', startsAt: day(17), endsAt: day(18, 30), title: 'Cumpleaños de Mariana', sub: 'Felipe · 8 personas', tone: 'event', status: 'held' },
  { id: '6', roomId: 'b', startsAt: day(13), endsAt: day(15), title: 'Foto & video', sub: 'Ropa Tierra', tone: 'rental', status: 'cancelled' },
];

export default defineMeta({
  tier: 'organism', name: 'RoomDayGrid',
  description: { es: 'Un día de todas las salas: salas en columnas, horas en filas, clases y reservas de espacio como bloques al minuto.', en: 'One day of every room: rooms as columns, hours as rows, classes and space bookings as blocks by the minute.' },
  props: [
    { name: 'rooms', type: '{ id, name, capacity? }[]', required: true, description: { es: 'Columnas, en orden.', en: 'Columns, in order.' } },
    { name: 'blocks', type: 'RoomBlock[]', required: true, description: { es: 'Bloques con sala, ventana, título, tono y estado.', en: 'Blocks with room, window, title, tone and status.' } },
    { name: 'fromHour / toHour', type: 'number', description: { es: 'Rango de horas; por defecto se ensancha hasta cubrir los bloques.', en: 'Hour range; defaults widen to fit the blocks.' } },
    { name: 'hourHeight', type: 'number', default: '56', description: { es: 'Píxeles por hora.', en: 'Pixels per hour.' } },
    { name: 'selectedId', type: 'string | null', description: { es: 'Bloque resaltado.', en: 'Highlighted block.' } },
    { name: 'onSelect', type: '(block) => void', description: { es: 'Clic en un bloque.', en: 'Block click.' } },
    { name: 'onSlot', type: '(roomId, hour) => void', description: { es: 'Clic en una celda vacía: propone una hora de inicio.', en: 'Click on an empty cell: proposes a start time.' } },
    { name: 'now', type: 'Date | null', description: { es: 'Dibuja la línea de "ahora" cuando el día es hoy.', en: 'Draws the "now" line when the day is today.' } },
  ],
  states: ['class (modality tone tint)', 'short block (under an hour: no sub-line · under ~35 min: title only)', 'confirmed (event / rental / private / maintenance material)', 'held (dashed)', 'cancelled (faded, struck)', 'done (dimmed)', 'selected', 'empty day', 'now line'],
  usages: [
    { title: { es: 'Dos salas, un día', en: 'Two rooms, one day' }, render: () => h(RoomDayGrid, { rooms, blocks, fromHour: 6, toHour: 20, hourHeight: 40, selectedId: '3', now: new Date() }) },
    { title: { es: 'Sin nada programado', en: 'Nothing scheduled' }, render: () => h(RoomDayGrid, { rooms, blocks: [], fromHour: 8, toHour: 12, hourHeight: 32 }) },
  ],
  a11y: [
    { es: 'Cada bloque es un botón con hora y título en su title; el estado se lee del chip, no solo del color.', en: 'Every block is a button with time and title in its title; status is read from the chip, not only the colour.' },
    { es: 'Las celdas vacías son botones enfocables solo cuando la página acepta crear desde ahí.', en: 'Empty cells are focusable buttons only when the page accepts creating from there.' },
  ],
  usedBy: ['S-05'],
});
