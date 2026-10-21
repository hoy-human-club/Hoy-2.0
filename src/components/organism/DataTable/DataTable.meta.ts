import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { DataTable } from './DataTable';
import { Badge, toneForStatus } from '../../atom/Badge/Badge';

type Row = { id: string; name: string; plan: string; status: string; visits: number };
const rows: Row[] = [
  { id: '1', name: 'Juliana Ospina', plan: 'Plan Mensual', status: 'active', visits: 14 },
  { id: '2', name: 'Camila García', plan: 'Paquete de 10', status: 'paused', visits: 3 },
  { id: '3', name: 'Nicolás Torres', plan: 'Clase de Prueba', status: 'expired', visits: 1 },
];

export default defineMeta({
  tier: 'organism', name: 'DataTable',
  description: { es: 'Tabla limpia con orden por columna, búsqueda, paginación, fila seleccionada y cabecera fija.', en: 'Clean table with column sort, search, pagination, selected row and sticky header.' },
  props: [
    { name: 'columns', type: 'DataTableColumn<T>[]', required: true, description: { es: 'key, label, render?, sortable?, width?, align?, mono?', en: 'key, label, render?, sortable?, width?, align?, mono?' } },
    { name: 'rows / rowKey', type: 'T[] / (row) => string', required: true, description: { es: 'Datos.', en: 'Data.' } },
    { name: 'onRowClick / selectedKey', type: 'fn / string', description: { es: 'Interacción por fila.', en: 'Row interaction.' } },
    { name: 'search', type: 'string', description: { es: 'Filtro de texto en todas las columnas.', en: 'Text filter across columns.' } },
    { name: 'pageSize', type: 'number', default: '50', description: { es: 'Paginación (botones de 44 px desde 0044).', en: 'Pagination (44 px buttons since 0044).' } },
    { name: 'hiddenColumns', type: 'string[]', description: { es: '0044: claves de columna que no se dibujan.', en: '0044: column keys not rendered.' } },
    { name: 'groupBy', type: '{ value(row), label?(value, count), order? }', description: { es: '0044: filas agrupadas bajo cabeceras con su conteo.', en: '0044: rows grouped under header rows with their count.' } },
    { name: 'multiSort / sorts / onSortsChange', type: 'boolean / { key, dir }[] / fn', description: { es: '0044: varios órdenes (Mayús + clic añade uno); controlado si se pasa sorts.', en: '0044: several sort keys (Shift + click adds one); controlled when sorts is passed.' } },
    { name: 'onCellRender', type: '(row, column) => ReactNode | undefined', description: { es: '0044: render de celda para toda la tabla; gana a column.render si no devuelve undefined.', en: '0044: table-wide cell renderer; wins over column.render unless it returns undefined.' } },
    { name: 'column.sortValue', type: '(row) => unknown', description: { es: '0044: valor por el que ordena la columna (una referencia ordena por el título).', en: '0044: the value the column sorts by (a reference sorts by its title).' } },
  ],
  states: ['default', 'sorted', 'multi-sorted', 'grouped', 'row-hover', 'row-focus', 'row-selected', 'empty', 'paginated'],
  usages: [
    { title: { es: 'Miembros', en: 'Members' }, render: () => h(DataTable<Row>, { rows, rowKey: (r) => r.id, onRowClick: () => {}, selectedKey: '1', columns: [{ key: 'name', label: 'Nombre' }, { key: 'plan', label: 'Plan' }, { key: 'status', label: 'Estado', render: (r) => h(Badge, { tone: toneForStatus(r.status) }, r.status) }, { key: 'visits', label: 'Visitas', align: 'right' }] }) },
    { title: { es: 'Agrupada por estado, varios órdenes', en: 'Grouped by status, multi-sort' }, render: () => h(DataTable<Row>, { rows, rowKey: (r) => r.id, multiSort: true, hiddenColumns: ['plan'], groupBy: { value: (r) => r.status }, columns: [{ key: 'name', label: 'Nombre' }, { key: 'plan', label: 'Plan' }, { key: 'status', label: 'Estado' }, { key: 'visits', label: 'Visitas', align: 'right' }] }) },
  ],
  a11y: [{ es: 'aria-sort en cabeceras; filas clicables con tabIndex y Enter.', en: 'aria-sort on headers; clickable rows get tabIndex and Enter.' }],
  usedBy: ['M-14', 'M-03', 'M-06', 'M-07', 'S-02', 'M-08g', 'D-07'],
});
