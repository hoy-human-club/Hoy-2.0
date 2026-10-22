import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { addDaysKey, dateKey, atStudioTime, addDays, fromDateKey } from '../../../i18n/format';
import { useI18n } from '../../../i18n/I18nProvider';
import { Badge } from '../../atom/Badge/Badge';
import { CalendarView, type CalendarMode } from './CalendarView';

interface DemoRow { id: string; title: string; starts_at: string; ends_at: string | null; status: string; tone: 'moss' | 'river' | 'clay' | 'sun' }
const at = (days: number, h: number, m = 0) => { return atStudioTime(addDays(new Date(), days), h, m).toISOString(); };
const ROWS: DemoRow[] = [
  { id: 'c1', title: 'Fuego', starts_at: at(0, 6, 30), ends_at: at(0, 7, 30), status: 'scheduled', tone: 'clay' },
  { id: 'c2', title: 'Pilates Mat', starts_at: at(0, 7, 0), ends_at: at(0, 7, 50), status: 'scheduled', tone: 'river' },
  { id: 'c3', title: 'Centro', starts_at: at(1, 19, 0), ends_at: at(1, 20, 15), status: 'scheduled', tone: 'moss' },
  { id: 'c4', title: 'Barre', starts_at: at(2, 8, 0), ends_at: at(2, 8, 55), status: 'cancelled', tone: 'sun' },
  { id: 'c5', title: 'Alineación', starts_at: at(-2, 17, 30), ends_at: at(-2, 18, 30), status: 'completed', tone: 'moss' },
  { id: 'h1', title: 'Festivo', starts_at: addDaysKey(dateKey(), 4), ends_at: null, status: 'holiday', tone: 'sun' },
];

function Demo({ initial, create }: { initial: CalendarMode; create?: boolean }) {
  const { lang } = useI18n();
  const [mode, setMode] = useState<CalendarMode>(initial);
  const [cursor, setCursor] = useState(dateKey());
  const [rows, setRows] = useState(ROWS);
  return h(CalendarView<DemoRow>, {
    rows, mode, onModeChange: setMode, cursor, onCursorChange: setCursor, lang, ariaLabel: 'Clases',
    getDate: (r) => r.starts_at, getEnd: (r) => r.ends_at, getTitle: (r) => r.title, getTone: (r) => r.tone, getMuted: (r) => r.status === 'cancelled',
    getDetail: (r) => h(Badge, { tone: r.status === 'cancelled' ? 'danger' : 'neutral' }, r.status),
    onOpen: () => {},
    onCreate: create ? (k: string, time?: string) => setRows((rs) => [...rs, { id: `n${rs.length}`, title: 'Nueva', starts_at: time ? atStudioTime(fromDateKey(k), ...time.split(':').map(Number) as [number, number]).toISOString() : k, ends_at: null, status: 'scheduled', tone: 'river' }]) : undefined,
  });
}

export default defineMeta({
  tier: 'organism', name: 'CalendarView',
  description: {
    es: 'Calendario genérico de filas con fecha (0046, M-03 «Calendario»): mes (7 columnas, hasta 3 fichas por día y «+N más»), semana (franja de todo el día y filas por hora, fichas lado a lado cuando se cruzan) y agenda agrupada por día. Lunes primero, nombres de días y meses desde Intl, hoy con anillo. Bajo 768 px el mes y la semana son celdas de 44 px con puntos de tono y la lista del día.',
    en: 'Generic calendar of dated rows (0046, M-03 “Calendar”): month (7 columns, up to 3 chips a day and “+N more”), week (all-day strip and hour rows, overlapping chips side by side) and an agenda grouped by day. Monday first, weekday and month names from Intl, today ringed. Below 768 px the month and week become 44 px cells with tone dots and the day’s list.',
  },
  props: [
    { name: 'rows', type: 'T[]', required: true, description: { es: 'Las filas; las que no tienen fecha no se muestran.', en: 'The rows; rows without a date are left out.' } },
    { name: 'getDate / getEnd', type: '(row) => string | null', required: true, description: { es: 'Inicio y fin: una fecha (día completo) o una marca de tiempo (con hora).', en: 'Start and end: a date (whole day) or a timestamp (with a time).' } },
    { name: 'getTitle', type: '(row) => string', required: true, description: { es: 'El texto de la ficha (rowTitle en M-03).', en: 'The chip text (rowTitle in M-03).' } },
    { name: 'getTone / getMuted', type: '(row) => EventTone · boolean', description: { es: 'Tono de clase (moss, river…) o de estado (success, warn…); atenuada = cancelada.', en: 'Class tone (moss, river…) or status tone (success, warn…); muted = cancelled.' } },
    { name: 'getDetail', type: '(row) => ReactNode', description: { es: 'Lado derecho de una fila de la agenda (insignia de estado).', en: 'Right-hand slot of an agenda row (status badge).' } },
    { name: 'mode / onModeChange', type: "'month' | 'week' | 'agenda'", required: true, description: { es: 'Disposición (control segmentado en la cabecera).', en: 'Layout (segmented control in the header).' } },
    { name: 'cursor / onCursorChange', type: 'YYYY-MM-DD', required: true, description: { es: 'El día enfocado: elige el mes, la semana o el inicio de la agenda.', en: 'The focused day: picks the month, the week or the agenda start.' } },
    { name: 'onCreate', type: '(dateKey, time?) => void', description: { es: 'Con él, un clic en un día vacío (o una hora libre de la semana) crea una fila.', en: 'With it, a click on an empty day (or a free hour in the week) creates a row.' } },
    { name: 'onOpen', type: '(row) => void', required: true, description: { es: 'Abrir la fila (cada ficha es un botón).', en: 'Open the row (every chip is a button).' } },
    { name: 'lang · ariaLabel · selectedKey', type: 'Lang · string · string', description: { es: 'Idioma para Intl, nombre de la región, fila abierta (con anillo).', en: 'Language for Intl, region name, open row (ringed).' } },
  ],
  states: ['month', 'week with hours', 'week, dates only (tall all-day strip)', 'agenda', 'today ring', 'cursor day', '+N more → day list', 'empty period with jump to the previous / next row', 'overlapping chips side by side', 'muted (cancelled) chip', 'selected chip', 'create on an empty day', 'phone (44 px day cells + day list)'],
  usages: [
    { title: { es: 'Semana con horas y creación', en: 'Week with hours and create' }, render: () => h(Demo, { initial: 'week', create: true }) },
    { title: { es: 'Mes', en: 'Month' }, render: () => h(Demo, { initial: 'month' }) },
    { title: { es: 'Agenda', en: 'Agenda' }, render: () => h(Demo, { initial: 'agenda' }) },
  ],
  a11y: [
    { es: 'Flechas mueven el día, Inicio / Fin la semana, RePág / AvPág el mes, T vuelve a hoy; el foco sigue al día (tabindex itinerante) y Enter abre la ficha o el día.', en: 'Arrow keys move the day, Home / End the week, Page Up / Down the month, T goes to today; focus follows the day (roving tabindex) and Enter opens the chip or the day.' },
    { es: 'Cada ficha, día y «+N más» es un botón de 44 px con su fecha completa en la etiqueta; el título del periodo se anuncia (aria-live).', en: 'Every chip, day and “+N more” is a 44 px button with its full date in the label; the period title is announced (aria-live).' },
    { es: 'Nada depende del cursor: el «+» de un día vacío aparece al pasar o enfocar, y siempre en pantallas táctiles.', en: 'Nothing depends on hover: an empty day’s “+” shows on hover or focus, and always on touch screens.' },
  ],
  usedBy: ['M-03'],
});
