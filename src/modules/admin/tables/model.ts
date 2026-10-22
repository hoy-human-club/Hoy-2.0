/**
 * 0044 — M-03 view model: which columns show, how filters / sorts / grouping apply, and the plain-text value of a
 * cell (search, CSV, sort by title). One pipeline for every view kind: rows → filters → search → sorts → view.
 */
import type { Lang } from '../../../i18n/types';
import type { BaseRow, ColumnDef, TableDef, TableViewConfig, ViewFilter, ViewFilterOp, ViewSort } from '../../../data/schema';
import { biText, enumLabel, rowTitle, type RowResolver } from '../../../data/labels';
import { dateKey } from '../../../i18n/format';

export type Def = TableDef & { allColumns: ColumnDef[] };
export type Resolve = RowResolver;

const BASE_HIDDEN = new Set(['id', 'tenant_id', 'created_at']);

/** Columns a role may see at all: sensitive ones need tables.write (0041 follow-up: api_keys.key_hash). */
export const allowedColumns = (def: Def, canWrite: boolean) => def.allColumns.filter((c) => canWrite || !c.sensitive);

/** Hidden by default: id, tenant, created_at and wide (long text / json) columns. */
export const defaultHidden = (def: Def) => def.allColumns.filter((c) => BASE_HIDDEN.has(c.name) || c.wide).map((c) => c.name);

/** The columns in view order (columnOrder first, then schema order), hidden ones included (callers filter). */
export function orderedColumns(def: Def, canWrite: boolean, cfg: TableViewConfig): ColumnDef[] {
  const cols = allowedColumns(def, canWrite);
  const order = cfg.columnOrder ?? [];
  const rank = (c: ColumnDef) => { const i = order.indexOf(c.name); return i === -1 ? order.length + cols.indexOf(c) : i; };
  return [...cols].sort((a, b) => rank(a) - rank(b));
}
export const hiddenOf = (def: Def, cfg: TableViewConfig) => cfg.hiddenColumns ?? defaultHidden(def);
export function visibleColumns(def: Def, canWrite: boolean, cfg: TableViewConfig): ColumnDef[] {
  const hidden = new Set(hiddenOf(def, cfg));
  return orderedColumns(def, canWrite, cfg).filter((c) => !hidden.has(c.name));
}

export const isDate = (c: ColumnDef) => c.type === 'timestamptz' || c.type === 'date';
export const isNumber = (c: ColumnDef) => c.type === 'int' || c.type === 'numeric';
export const isMoney = (c: ColumnDef) => c.type === 'int' && /(^|_)(price|amount|total|subtotal|tax|balance|rate|payout)(_|$)|price_cop|amount_paid|rate_per_class/.test(c.name);

/** Operators offered for a column, by type (the filter builder's second select). */
export function opsFor(c: ColumnDef): ViewFilterOp[] {
  if (c.enum) return ['is', 'is_not', 'in', 'empty', 'not_empty'];
  if (c.type === 'bool') return ['is', 'is_not'];
  if (isDate(c)) return ['before', 'after', 'is', 'empty', 'not_empty'];
  if (isNumber(c)) return ['is', 'is_not', 'gt', 'lt', 'empty', 'not_empty'];
  if (c.references) return ['is', 'is_not', 'contains', 'empty', 'not_empty'];
  return ['contains', 'is', 'is_not', 'empty', 'not_empty'];
}
export const opNeedsValue = (op: ViewFilterOp) => op !== 'empty' && op !== 'not_empty';

/** Plain text of a cell in the current language: FK → the referenced row's title, enum → words, Bi json → one language. */
export function cellText(c: ColumnDef, row: BaseRow, lang: Lang, resolve: Resolve): string {
  const v = row[c.name];
  if (v == null || v === '') return '';
  if (c.references && typeof v === 'string') { const ref = resolve(c.references, v); return ref ? rowTitle(c.references, ref, lang, resolve) : v; }
  if (c.enum && typeof v === 'string') return enumLabel(v, lang);
  if (c.type === 'json') return biText(v, lang) ?? JSON.stringify(v);
  if (typeof v === 'boolean') return v ? '✓' : '';
  return String(v);
}

const empty = (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0);

function matches(f: ViewFilter, c: ColumnDef, row: BaseRow, lang: Lang, resolve: Resolve): boolean {
  const v = row[c.name];
  const val = Array.isArray(f.value) ? f.value : f.value == null ? '' : String(f.value);
  const dateBoundary = c.type === 'timestamptz' && /^\d{4}-\d{2}-\d{2}$/.test(String(val));
  const studioDay = dateBoundary && !empty(v) ? dateKey(new Date(String(v))) : '';
  switch (f.op) {
    case 'empty': return empty(v);
    case 'not_empty': return !empty(v);
    case 'in': { const set = Array.isArray(val) ? val : String(val).split(','); return set.length === 0 || set.includes(String(v)); }
    case 'contains': return cellText(c, row, lang, resolve).toLowerCase().includes(String(val).toLowerCase()) || String(v ?? '').toLowerCase().includes(String(val).toLowerCase());
    case 'is': case 'is_not': {
      let eq: boolean;
      if (c.type === 'bool') eq = String(!!v) === String(val);
      else if (dateBoundary) eq = studioDay === val;
      else if (isDate(c)) eq = String(v ?? '').slice(0, 10) === String(val).slice(0, 10);
      else if (isNumber(c)) eq = Number(v) === Number(val);
      else eq = String(v ?? '') === String(val) || cellText(c, row, lang, resolve).toLowerCase() === String(val).toLowerCase();
      return f.op === 'is' ? eq : !eq;
    }
    case 'before': return !empty(v) && (dateBoundary ? studioDay !== 'NaN-NaN-NaN' && studioDay < String(val) : String(v) < String(val));
    case 'after': return !empty(v) && (dateBoundary ? studioDay !== 'NaN-NaN-NaN' && studioDay > String(val) : String(v).slice(0, String(val).length) > String(val));
    case 'gt': return !empty(v) && Number(v) > Number(val);
    case 'lt': return !empty(v) && Number(v) < Number(val);
    default: return true;
  }
}

/** Filters (AND), then a free-text search over the visible columns' display text. */
export function applyView(def: Def, rows: BaseRow[], cfg: TableViewConfig, search: string, lang: Lang, resolve: Resolve, searchCols: ColumnDef[]): BaseRow[] {
  const byName = new Map(def.allColumns.map((c) => [c.name, c]));
  const filters = (cfg.filters ?? []).filter((f) => byName.has(f.column) && (!opNeedsValue(f.op) || (Array.isArray(f.value) ? f.value.length > 0 : f.value != null && f.value !== '')));
  let out = filters.length ? rows.filter((r) => filters.every((f) => matches(f, byName.get(f.column)!, r, lang, resolve))) : rows;
  const q = search.trim().toLowerCase();
  if (q) out = out.filter((r) => r.id.toLowerCase().includes(q) || searchCols.some((c) => cellText(c, r, lang, resolve).toLowerCase().includes(q) || (typeof r[c.name] !== 'object' && String(r[c.name] ?? '').toLowerCase().includes(q))));
  return out;
}

/** Sort value of a column: FK and enum sort by their words, the rest by the raw value. */
export function sortValue(c: ColumnDef, row: BaseRow, lang: Lang, resolve: Resolve): unknown {
  if (c.references || c.enum || c.type === 'json') return cellText(c, row, lang, resolve).toLowerCase();
  return row[c.name];
}

export function sortRows(def: Def, rows: BaseRow[], sorts: ViewSort[] | undefined, lang: Lang, resolve: Resolve): BaseRow[] {
  const list = (sorts ?? []).map((s) => ({ s, c: def.allColumns.find((c) => c.name === s.column) })).filter((x) => !!x.c);
  if (list.length === 0) return rows;
  const cmp = (a: unknown, b: unknown) => {
    if (a === b) return 0; if (a == null || a === '') return 1; if (b == null || b === '') return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  };
  return [...rows].sort((a, b) => {
    for (const { s, c } of list) { const d = cmp(sortValue(c!, a, lang, resolve), sortValue(c!, b, lang, resolve)); if (d) return s.dir === 'asc' ? d : -d; }
    return 0;
  });
}

/** Columns rows can be grouped by (grid) or laid out in lanes by (kanban): enums, booleans and foreign keys (group only). */
export const groupableColumns = (def: Def) => def.allColumns.filter((c) => c.enum || c.type === 'bool' || (c.references && c.name !== 'tenant_id'));
export const laneColumns = (def: Def) => def.allColumns.filter((c) => c.enum || c.type === 'bool');
export const defaultLaneColumn = (def: Def) => (laneColumns(def).find((c) => c.name === 'status') ?? laneColumns(def)[0])?.name ?? null;

/** The first column that holds a picture or a media key (gallery cover). */
export const mediaColumn = (def: Def) => def.columns.find((c) => /(^|_)(url|photo_url|cover_key)$/.test(c.name) && c.name !== 'pdf_url' && c.name !== 'deep_link');

/** Lossless exports of the rows in view: JSON as stored, CSV with the raw column names and values. */
export function toCsv(cols: ColumnDef[], rows: BaseRow[]): string {
  const esc = (v: unknown) => { const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.map((c) => c.name).join(','), ...rows.map((r) => cols.map((c) => esc(r[c.name])).join(','))].join('\n');
}
export function download(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
