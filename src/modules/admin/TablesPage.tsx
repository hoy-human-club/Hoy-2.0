import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { DataProvider } from '../../data/types';
import { CALENDAR_MODES, TABLE_GROUPS, TABLE_VIEW_KINDS, TIMELINE_ZOOMS, tableRegistry, tables as allTables, type BaseRow, type CalendarMode, type TableViewConfig, type TableViewKind, type TableViewRow, type TimelineZoom, type ViewFilterOp } from '../../data/schema';
import { columnLabel, enumLabel, rowTitle, tableLabel, type RowResolver } from '../../data/labels';
import { dateColumnOf } from '../../data/relations';
import { dateKey } from '../../i18n/format';
import { useActions } from '../../actions/bus';
import type { ActionHandler } from '../../actions/types';
import { useMinWidth } from '../../layout/useMinWidth';
import { toast } from '../../app/toast';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { Input } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { Icon } from '../../components/atom/Icon/Icon';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { SegmentedControl, type SegmentOption } from '../../components/molecule/SegmentedControl/SegmentedControl';
import { Notice } from '../../components/molecule/Notice/Notice';
import { ListRow, ListGroup } from '../../components/molecule/ListRow/ListRow';
import { TablesSidebar } from './tables/TablesSidebar';
import { useTablesPrefs, pushRecent, toggleIn } from './tables/prefs';
import { applyView, download, opNeedsValue, opsFor, sortRows, toCsv, allowedColumns, visibleColumns, type Def } from './tables/model';
import type { CellCtx } from './tables/cells';
import { GalleryView, GridView, KanbanView, ListView } from './tables/Views';
import { GraphView } from './tables/GraphView';
import { SchemaView } from './tables/SchemaView';
import { CalendarTableView, DateColumnPicker, TimelineTableView, timeColumns } from './tables/TimeViews';
import { calendarPeriod, shiftCursor } from '../../components/organism/CalendarView/CalendarView';
import { shiftTimeline, timelineRange } from '../../components/organism/TimelineView/TimelineView';
import { readWhen } from '../../components/organism/CalendarView/events';
import { RowDrawer } from './tables/RowDrawer';
import { ColumnsPanel, ExportPanel, FilterPanel, GroupPanel, SortPanel, VIEW_ICON, ViewsPanel, type PanelId } from './tables/Panels';
import { M03 } from './specs';
import { need } from './actions';
import './tables.css';

// Private compensation is available only through its guarded dedicated page.
const tables = allTables.filter(table => table.name !== 'class_pay_rules');

/** Re-renders on every change event of any table (row counts, FK titles, the resolver). */
function useDbVersion(data: DataProvider): number {
  const [v, setV] = useState(0);
  useEffect(() => data.subscribe('*', () => setV((n) => n + 1)), [data]);
  return v;
}

/** Lazy id → row maps per table from the provider's synchronous snapshot, rebuilt when anything changes. */
function makeResolver(data: DataProvider) {
  const cache = new Map<string, Map<string, BaseRow>>();
  const rowsOf = (table: string): BaseRow[] => table === 'class_pay_rules' ? [] : data.peek?.(table) ?? [];
  const byCol = new Map<string, Map<string, BaseRow>>();
  const resolve: RowResolver = (table: string, id: string) => {
    let m = cache.get(table);
    if (!m) { m = new Map(rowsOf(table).map((r) => [r.id, r])); cache.set(table, m); }
    return m.get(id);
  };
  resolve.reverse = (table, column, id) => {
    const key = `${table}.${column}`;
    let m = byCol.get(key);
    if (!m) { m = new Map(); for (const r of rowsOf(table)) { const v = r[column]; if (typeof v === 'string' && !m.has(v)) m.set(v, r); } byCol.set(key, m); }
    return m.get(id);
  };
  return { rowsOf, resolve };
}

interface ViewState { viewId: string | null; kind: TableViewKind; cfg: TableViewConfig }
const isKind = (v: string | null): v is TableViewKind => !!v && (TABLE_VIEW_KINDS as readonly string[]).includes(v);
const isMode = (v: string | null | undefined): v is CalendarMode => !!v && (CALENDAR_MODES as readonly string[]).includes(v);
const isZoom = (v: string | null | undefined): v is TimelineZoom => !!v && (TIMELINE_ZOOMS as readonly string[]).includes(v);
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
/** The two views that place rows by a date column (disabled for tables without one). */
const TIME_KINDS: TableViewKind[] = ['calendar', 'timeline'];

/** M-03 — the table manager: sidebar of tables, views (grid · list · gallery · board · calendar · timeline · graph), filters, row drawer. */
export function TablesPage() {
  const { t, bi, lang } = useI18n();
  const { table } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const data = useData();
  const { can, devMode, user } = useSession();
  const canWrite = can('tables.write');
  const [prefs, update] = useTablesPrefs();
  const technical = devMode && (prefs.technical ?? true);
  const wide = useMinWidth('shell');
  const [sheet, setSheet] = useState(false);
  const [resetting, setResetting] = useState(false);
  const version = useDbVersion(data);
  const { rowsOf, resolve } = useMemo(() => makeResolver(data),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, version]);
  const counts = useMemo(() => Object.fromEntries(tables.map((x) => [x.name, rowsOf(x.name).length])), [rowsOf]);
  const def: Def | undefined = table && table !== 'class_pay_rules' ? tableRegistry[table] : undefined;
  const hasDate = def ? !!dateColumnOf(def.name) : false;
  const { rows } = useTable<BaseRow>(def?.name ?? 'tenants');
  const { rows: allViews } = useTable<TableViewRow>('table_views');
  const views = useMemo(() => allViews.filter((v) => v.table_name === def?.name && (v.shared || v.created_by === user.id)), [allViews, def?.name, user.id]);

  // ---- view state (per table), URL params: view, v (saved view), id (open row), focus (graph row), where (column:value) ----
  const initial = (name: string | undefined): ViewState => {
    const d = allViews.find((v) => v.table_name === name && v.is_default);
    return d ? { viewId: d.id, kind: d.kind, cfg: d.config ?? {} } : { viewId: null, kind: 'grid', cfg: {} };
  };
  const [states, setStates] = useState<Record<string, ViewState>>({});
  const vs = (def && states[def.name]) || initial(def?.name);
  const setVs = (fn: (s: ViewState) => ViewState) => { if (def) setStates((all) => ({ ...all, [def.name]: fn(all[def.name] ?? initial(def.name)) })); };
  const setCfg = (fn: (c: TableViewConfig) => TableViewConfig) => setVs((s) => ({ ...s, cfg: fn(s.cfg) }));
  const urlKind = params.get('view');
  const kind: TableViewKind = isKind(urlKind) ? urlKind : vs.kind;
  const cfg = vs.cfg;
  const selected = params.get('id');
  const focusId = params.get('focus');
  const setParam = (patch: Record<string, string | null>, replace = false) => setParams((p) => { const n = new URLSearchParams(p); for (const [k, v] of Object.entries(patch)) { if (v == null) n.delete(k); else n.set(k, v); } return n; }, { replace });

  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [schema, setSchema] = useState(false);
  useEffect(() => { setSearch(''); setPanel(null); setSchema(false); if (def) update((p) => ({ ...p, recent: pushRecent(p.recent, def.name) })); }, [def?.name]); // eslint-disable-line react-hooks/exhaustive-deps
  // ?v= picks a saved view; ?where=column:value adds an "is" filter (links from the drawer's Related section and the graph)
  const vParam = params.get('v'), whereParam = params.get('where');
  useEffect(() => {
    if (!def) return;
    if (vParam) { const v = allViews.find((x) => x.id === vParam && x.table_name === def.name); if (v) setVs(() => ({ viewId: v.id, kind: v.kind, cfg: v.config ?? {} })); }
    if (whereParam) {
      const [column, ...rest] = whereParam.split(':');
      if (def.allColumns.some((c) => c.name === column)) setVs((s) => ({ ...s, viewId: null, kind: s.kind === 'graph' ? 'grid' : s.kind, cfg: { ...s.cfg, filters: [{ column, op: 'is', value: rest.join(':') }] } }));
      setParam({ where: null, view: urlKind === 'graph' ? null : urlKind });
    }
  }, [def?.name, vParam, whereParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- pipeline: rows → filters → search → sorts → view ----
  const cols = useMemo(() => (def ? visibleColumns(def, canWrite, cfg) : []), [def, canWrite, cfg]);
  const filterCols = useMemo(() => (def ? allowedColumns(def, canWrite).filter((c) => c.name !== 'tenant_id') : []), [def, canWrite]);
  const filtered = useMemo(() => (def ? applyView(def, rows, cfg, search, lang, resolve, cols) : []), [def, rows, cfg, search, lang, resolve, cols]);
  const sorted = useMemo(() => (def && kind !== 'grid' ? sortRows(def, filtered, cfg.sorts, lang, resolve) : filtered), [def, filtered, cfg.sorts, kind, lang, resolve]);
  const selectedRow = selected ? rows.find((r) => r.id === selected) ?? (def ? resolve(def.name, selected) ?? null : null) : null;
  const focusRow = focusId && def ? rows.find((r) => r.id === focusId) ?? null : null;

  // ---- calendar / timeline: ?date= (cursor), ?mode= (calendar layout, agenda by default on phones), ?zoom= ----
  const phone = !useMinWidth('tablet');
  const urlMode = params.get('mode'), urlZoom = params.get('zoom'), urlDate = params.get('date');
  const calMode: CalendarMode = isMode(urlMode) ? urlMode : phone ? 'agenda' : cfg.calendarMode ?? 'month';
  const tlZoom: TimelineZoom = isZoom(urlZoom) ? urlZoom : cfg.timelineZoom ?? 'month';
  const time = def ? timeColumns(def, cfg) : { date: null, end: null, options: [] as string[] };
  /** Today when the period around today has rows; otherwise the nearest row after it (or the last one before it). */
  const autoCursor = useMemo(() => {
    const today = dateKey();
    if (!def || !time.date || (kind !== 'calendar' && kind !== 'timeline')) return today;
    const keys = filtered.map((r) => readWhen(r[time.date!])).filter((w): w is NonNullable<typeof w> => !!w).map((w) => dateKey(w.date)).sort();
    if (keys.length === 0) return today;
    let from: string, to: string;
    if (kind === 'calendar') ({ from, to } = calendarPeriod(calMode, today));
    else { const r = timelineRange(tlZoom, today); from = dateKey(r.from); to = dateKey(new Date(r.to.getTime() - 1)); }
    if (keys.some((k) => k >= from && k <= to)) return today;
    return keys.find((k) => k > to) ?? keys[keys.length - 1];
  }, [def, time.date, kind, filtered, calMode, tlZoom]);
  const cursor = urlDate && DATE_KEY.test(urlDate) ? urlDate : autoCursor;
  const setCursor = (k: string) => setParam({ date: k }, true);
  // `also` rides in the same URL update: two setSearchParams calls in one tick would drop the first (the view switch)
  const setCalMode = (m: CalendarMode, also: Record<string, string | null> = {}) => { setCfg((c) => ({ ...c, calendarMode: m })); setParam({ ...also, mode: m }, true); };
  const setTlZoom = (z: TimelineZoom, also: Record<string, string | null> = {}) => { setCfg((c) => ({ ...c, timelineZoom: z })); setParam({ ...also, zoom: z }, true); };
  const canCreateOnDate = canWrite && !!time.date && time.date !== 'created_at' && time.date !== 'updated_at';
  const createOn = (k: string, hhmm?: string) => {
    if (!def || !time.date) return;
    const col = (name: string | null) => (name ? def.allColumns.find((c) => c.name === name) : undefined);
    const start = col(time.date), end = col(time.end);
    const at = (h: string) => new Date(`${k}T${h}:00`);
    const s = at(hhmm ?? '09:00');
    const prefill: Record<string, unknown> = { [time.date]: start?.type === 'date' ? k : s.toISOString() };
    if (end && time.end) prefill[time.end] = end.type === 'date' ? k : new Date(s.getTime() + 3600e3).toISOString();
    void addRow(prefill);
  };

  const openRow = (id: string | null) => setParam({ id });
  const ctx: CellCtx = useMemo(() => ({
    lang, resolve, yes: t('admin.tables.yes'), no: t('admin.tables.no'),
    openRef: (ref, id) => nav(`/admin/tables/${ref}?id=${encodeURIComponent(id)}`),
    openLabel: (title, tbl) => t('admin.tables.openRefRow', { title, table: tbl }),
  }), [lang, resolve, t, nav]);

  const exportRows = (format: 'json' | 'csv') => {
    if (!def) return;
    const allowed = allowedColumns(def, canWrite);
    const clean = sorted.map((r) => Object.fromEntries(allowed.map((c) => [c.name, r[c.name]])));
    if (format === 'json') download(`${def.name}.json`, JSON.stringify(clean, null, 2), 'application/json');
    else download(`${def.name}.csv`, toCsv(allowed, sorted), 'text/csv');
    toast(t('admin.tables.exported', { n: sorted.length, format: format.toUpperCase() }), 'success');
  };
  const addRow = async (prefill: Record<string, unknown> = {}) => {
    if (!def || !canWrite) return;
    const blank: Record<string, unknown> = {};
    for (const c of def.columns) {
      if (c.references) blank[c.name] = c.nullable ? null : rowsOf(c.references)[0]?.id ?? null;
      else if (c.type === 'bool') blank[c.name] = false;
      else if (c.type === 'int' || c.type === 'numeric') blank[c.name] = 0;
      else if (c.type === 'json') blank[c.name] = /\{es,en\}/.test(c.description ?? '') ? { es: '', en: '' } : null;
      else if (c.enum) blank[c.name] = c.enum[0];
      else if (c.type === 'timestamptz') blank[c.name] = c.nullable ? null : new Date().toISOString();
      else blank[c.name] = c.nullable ? null : '';
    }
    const row = await data.insert(def.name, { ...blank, ...prefill });
    openRow(row.id);
    toast(t('admin.tables.added'), 'success');
  };
  const saveView = async (name: string) => {
    if (!def || !canWrite) return;
    const row = await data.insert<TableViewRow>('table_views', { table_name: def.name, name: { es: name, en: name }, kind, config: cfg, is_default: false, shared: true, created_by: user.id });
    setVs(() => ({ viewId: row.id, kind, cfg }));
    toast(t('admin.tables.views.saved', { name }), 'success');
  };
  const setKind = (k: TableViewKind) => { setVs((s) => ({ ...s, kind: k })); setParam({ view: k === 'grid' ? null : k, focus: k === 'graph' ? focusId : null }); };
  const canEditView = (v: TableViewRow) => canWrite || v.created_by === user.id;
  const renameView = async (v: TableViewRow, name: string) => {
    if (!canEditView(v) || !name.trim()) return;
    const other = lang === 'es' ? 'en' : 'es';
    const next = { ...v.name, [lang]: name.trim(), ...(v.name[other] === v.name[lang] || !v.name[other] ? { [other]: name.trim() } : {}) };
    await data.update<TableViewRow>('table_views', v.id, { name: next });
    toast(t('admin.tables.views.renamed', { name: name.trim() }), 'success');
  };
  const deleteView = async (v: TableViewRow) => {
    if (!canEditView(v)) return;
    await data.remove('table_views', v.id);
    if (vs.viewId === v.id) { setVs(() => ({ viewId: null, kind: 'grid', cfg: {} })); setParam({ view: null, v: null, mode: null, zoom: null }); }
    toast(t('admin.tables.views.deleted', { name: bi(v.name) }), 'success');
  };
  /** A saved view by id or by its name in either language (default: the active one). */
  const findView = (ref?: string) => {
    if (!ref) return views.find((v) => v.id === vs.viewId);
    const q = ref.trim().toLowerCase();
    return views.find((v) => v.id === ref) ?? views.find((v) => v.name.es.toLowerCase() === q || v.name.en.toLowerCase() === q);
  };
  const moveCard = async (id: string, column: string, value: string | boolean) => {
    if (!def || !canWrite) return;
    await data.update(def.name, id, { [column]: value });
    const row = resolve(def.name, id);
    toast(t('admin.tables.kanban.moved', { title: row ? rowTitle(def, row, lang, resolve) : id, value: typeof value === 'boolean' ? t(value ? 'admin.tables.yes' : 'admin.tables.no') : enumLabel(value, lang) }), 'success');
  };
  const toggleSidebar = () => { if (!wide) setSheet((s) => !s); else update((p) => ({ ...p, sidebar: p.sidebar === 'rail' ? 'expanded' : 'rail' })); };
  const setTechnical = (on: boolean) => update((p) => ({ ...p, technical: on }));

  // ---- actions (WebMCP / voice): handlers read the latest state through a ref ----
  const api = useRef<Record<string, ActionHandler>>({});
  api.current = {
    'tables.open': (p) => { const name = need(p, 'table'); if (!tableRegistry[name]) throw new Error(`unknown table "${name}"`); nav(`/admin/tables/${name}`); return `opened ${name}`; },
    'tables.openRow': (p) => { const name = need(p, 'table'); const id = need(p, 'id'); if (!tableRegistry[name]) throw new Error(`unknown table "${name}"`); nav(`/admin/tables/${name}?id=${encodeURIComponent(id)}`); return `opened ${name}/${id}`; },
    'tables.setView': (p) => { const k = need(p, 'kind'); if (!isKind(k)) throw new Error(`unknown view "${k}"`); if (!def) throw new Error('open a table first'); if (TIME_KINDS.includes(k) && !hasDate) throw new Error(`${def.name} has no date column`); setKind(k); return `view ${k}`; },
    'tables.setDateColumn': (p) => {
      if (!def) throw new Error('open a table first');
      if (!hasDate) throw new Error(`${def.name} has no date column`);
      const column = need(p, 'column'); if (!time.options.includes(column)) throw new Error(`"${column}" is not a date column of ${def.name} (${time.options.join(', ')})`);
      const endRaw = p?.endColumn; const endColumn = endRaw == null || endRaw === '' ? undefined : endRaw === 'none' ? null : endRaw;
      if (endColumn && (!time.options.includes(endColumn) || endColumn === column)) throw new Error(`"${endColumn}" is not another date column of ${def.name}`);
      setCfg((c) => ({ ...c, dateColumn: column, endColumn }));
      return `date column ${column}${endColumn ? ` → ${endColumn}` : endColumn === null ? ' (no end)' : ''}`;
    },
    'tables.calendarMode': (p) => { const m = need(p, 'mode'); if (!isMode(m)) throw new Error('mode is month, week or agenda'); if (!def || !hasDate) throw new Error('open a table with a date column first'); if (kind !== 'calendar') setVs((st) => ({ ...st, kind: 'calendar' })); setCalMode(m, { view: 'calendar', focus: null }); return `calendar by ${m}`; },
    'tables.timelineZoom': (p) => { const z = need(p, 'zoom'); if (!isZoom(z)) throw new Error('zoom is day, week, month or quarter'); if (!def || !hasDate) throw new Error('open a table with a date column first'); if (kind !== 'timeline') setVs((st) => ({ ...st, kind: 'timeline' })); setTlZoom(z, { view: 'timeline', focus: null }); return `timeline zoom ${z}`; },
    'tables.goToDate': (p) => {
      const d = need(p, 'date');
      if (kind !== 'calendar' && kind !== 'timeline') throw new Error('open the calendar or the timeline first');
      const step = (n: number) => (kind === 'calendar' ? shiftCursor(calMode, cursor, n) : shiftTimeline(tlZoom, cursor, n));
      const k = d === 'today' ? dateKey() : d === 'next' ? step(1) : d === 'previous' ? step(-1) : d;
      if (!DATE_KEY.test(k)) throw new Error('date is YYYY-MM-DD, today, next or previous');
      setCursor(k); return `at ${k}`;
    },
    'tables.renameView': async (p) => { const v = findView(p?.view); if (!v) throw new Error('no such saved view'); if (!canEditView(v)) throw new Error('only its creator or tables.write'); await renameView(v, need(p, 'name')); return 'view renamed'; },
    'tables.deleteView': async (p) => { const v = findView(p?.view); if (!v) throw new Error('no such saved view'); if (!canEditView(v)) throw new Error('only its creator or tables.write'); await deleteView(v); return 'view deleted'; },
    'tables.search': (p) => { setSearch(p?.q ?? ''); return `search "${p?.q ?? ''}"`; },
    'tables.filter': (p) => {
      if (!def) throw new Error('open a table first');
      const column = need(p, 'column'); const c = def.allColumns.find((x) => x.name === column);
      if (!c) throw new Error(`unknown column "${column}"`);
      const op = (p?.op ?? opsFor(c)[0]) as ViewFilterOp;
      if (!opsFor(c).includes(op)) throw new Error(`operator "${op}" does not apply to ${column}`);
      if (opNeedsValue(op) && !p?.value) throw new Error('missing param "value"');
      setCfg((cc) => ({ ...cc, filters: [...(cc.filters ?? []), { column, op, value: op === 'in' ? String(p?.value).split(',') : p?.value }] }));
      return `filter ${column} ${op} ${p?.value ?? ''}`;
    },
    'tables.newRow': async () => { if (!canWrite) throw new Error('needs tables.write'); await addRow(); return 'row added'; },
    'tables.export': (p) => { const f = (p?.format ?? 'json') as 'json' | 'csv'; if (f !== 'json' && f !== 'csv') throw new Error('format is json or csv'); exportRows(f); return `exported ${sorted.length} rows as ${f}`; },
    'tables.toggleSidebar': () => { toggleSidebar(); return 'sidebar toggled'; },
    'tables.saveView': async (p) => { if (!canWrite) throw new Error('needs tables.write'); await saveView(need(p, 'name')); return 'view saved'; },
    'tables.pin': (p) => { const name = p?.table ?? def?.name; if (!name || !tableRegistry[name]) throw new Error('missing param "table"'); update((x) => ({ ...x, pinned: toggleIn(x.pinned, name) })); return `pin toggled for ${name}`; },
    'tables.toggleTechnicalNames': () => { if (!devMode) throw new Error('technical names need dev mode'); setTechnical(!technical); return `technical names ${technical ? 'off' : 'on'}`; },
  };
  const impl = useMemo(() => Object.fromEntries((M03.actions ?? []).map((a) => [a.id, (p?: Record<string, string>) => api.current[a.id](p)])) as Record<string, ActionHandler>, []);
  useActions(M03, impl);

  const sidebarMode = prefs.sidebar === 'rail' ? 'rail' : 'expanded';
  const sidebar = (mode: 'expanded' | 'rail' | 'sheet') => (
    <TablesSidebar current={def?.name} counts={counts} prefs={prefs} update={update} technical={technical} mode={mode} providerName={data.name}
      onNavigate={() => setSheet(false)} onToggle={toggleSidebar} onReset={data.reset && canWrite ? () => setResetting(true) : undefined} />
  );

  const kindOptions: SegmentOption<TableViewKind>[] = TABLE_VIEW_KINDS.map((k) => ({
    value: k, label: t(`admin.tables.view.${k}`), icon: VIEW_ICON[k],
    ...(TIME_KINDS.includes(k) && !hasDate ? { disabled: true, hint: t('admin.tables.view.noDate') } : {}),
  }));
  const activeView = views.find((v) => v.id === vs.viewId);
  const filters = cfg.filters ?? [];
  const toolBtn = (id: PanelId, icon: Parameters<typeof Button>[0]['icon'], label: string, n?: number) => (
    <Button key={id} size="sm" variant={panel === id ? 'primary' : 'secondary'} icon={icon} aria-expanded={panel === id} aria-controls="tbl-panel" onClick={() => setPanel((p) => (p === id ? null : id))}>
      {label}{n ? <span className="tbl-count">{n}</span> : null}
    </Button>
  );

  return (
    <div className={`tbl ${wide && sidebarMode === 'rail' ? 'is-rail' : ''}`}>
      {wide && sidebar(sidebarMode)}
      {!wide && <Drawer open={sheet} onClose={() => setSheet(false)} side="left" width={360} title={t('admin.tables.title')}>{sidebar('sheet')}</Drawer>}

      <section className="tbl-main" aria-labelledby="tbl-title">
        {!def && (
          <div className="stack">
            <header className="tbl-head">
              <div className="tbl-titlebar">
                {!wide && <Button size="sm" variant="secondary" icon="table" onClick={() => setSheet(true)} aria-expanded={sheet}>{t('admin.tables.title')}</Button>}
                <div className="grow">
                  <h1 id="tbl-title" className="tbl-title">{t('admin.tables.title')}</h1>
                  <p className="tbl-desc">{t('admin.tables.subtitle')}</p>
                </div>
              </div>
            </header>
            <div className="tbl-overview">
              {TABLE_GROUPS.map((g) => (
                <ListGroup key={g.id} title={bi(g.label)}>
                  {tables.filter((x) => x.group === g.id).map((x) => <ListRow key={x.name} icon={x.icon ?? 'table'} title={tableLabel(x, lang)} subtitle={technical ? x.name : undefined} to={`/admin/tables/${x.name}`} trailing={<span className="small muted">{counts[x.name] ?? 0}</span>} />)}
                </ListGroup>
              ))}
            </div>
          </div>
        )}
        {def && (
          <>
            <header className="tbl-head">
              <div className="tbl-titlebar">
                {!wide && <Button size="sm" variant="secondary" icon="table" onClick={() => setSheet(true)} aria-expanded={sheet}>{t('admin.tables.title')}</Button>}
                <span className="tbl-titleicon" aria-hidden><Icon name={def.icon ?? 'table'} size="lg" /></span>
                <div className="grow tbl-titletext">
                  <div className="row wrap tbl-titlerow">
                    <h1 id="tbl-title" className="tbl-title">{tableLabel(def, lang)}</h1>
                    {def.kind && <Badge tone="primary">{t(`admin.tables.kind.${def.kind}`)}</Badge>}
                    <Badge>{bi(TABLE_GROUPS.find((g) => g.id === def.group)!.label)}</Badge>
                  </div>
                  {technical && <code className="tbl-tech">{def.name}</code>}
                  <p className="tbl-desc">{bi(def.description)}</p>
                  <p className="small muted">{t('core.common.rows', { n: rows.length })} · {t('admin.tables.columns', { n: def.allColumns.length })}{filtered.length !== rows.length ? ` · ${t('admin.tables.inView', { n: filtered.length })}` : ''}</p>
                </div>
                {devMode && <Toggle size="sm" checked={technical} onChange={setTechnical} label={t('admin.tables.technical')} />}
              </div>

              <div className="tbl-viewbar">
                <div className="tbl-scrollx"><SegmentedControl<TableViewKind> ariaLabel={t('admin.tables.view')} options={kindOptions} value={kind} onChange={setKind} compact size="sm" /></div>
                <Button size="sm" variant={panel === 'views' ? 'primary' : 'secondary'} icon="layers" aria-expanded={panel === 'views'} aria-controls="tbl-panel" onClick={() => setPanel((p) => (p === 'views' ? null : 'views'))}>
                  {activeView ? bi(activeView.name) : t('admin.tables.views')}
                </Button>
              </div>

              <div className="tbl-toolbar" role="toolbar" aria-label={t('admin.tables.toolbar')}>
                {toolBtn('filter', 'filter', t('admin.tables.filter'), filters.length)}
                {toolBtn('sort', 'sort', t('admin.tables.sort'), cfg.sorts?.length)}
                {(kind === 'grid' || kind === 'timeline') && toolBtn('group', 'group', t(kind === 'timeline' ? 'admin.tables.lanes' : 'admin.tables.group'), cfg.groupBy ? 1 : 0)}
                {TIME_KINDS.includes(kind) && hasDate && <DateColumnPicker def={def} cfg={cfg} setCfg={setCfg} technical={technical} />}
                {toolBtn('columns', 'columns', t('admin.tables.columnsPanel'))}
                <div className="tbl-search"><Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.tables.search', { table: tableLabel(def, lang) })} aria-label={t('core.common.search')} /></div>
                {toolBtn('export', 'download', t('admin.tables.export'))}
                <Chip selected={schema} onClick={() => setSchema((s) => !s)}>{t('admin.tables.schema')}</Chip>
                {canWrite && <Button size="sm" icon="plus" onClick={() => addRow()}>{t('admin.tables.addRow')}</Button>}
              </div>

              {filters.length > 0 && (
                <div className="row wrap tbl-chips" aria-label={t('admin.tables.filter.active')}>
                  {filters.map((f, i) => {
                    const c = def.allColumns.find((x) => x.name === f.column);
                    const val = Array.isArray(f.value) ? f.value.map((x) => (c?.enum ? enumLabel(x, lang) : x)).join(', ') : f.value == null ? '' : c?.references ? (() => { const r = resolve(c.references, String(f.value)); return r ? rowTitle(c.references, r, lang, resolve) : String(f.value); })() : c?.enum ? enumLabel(String(f.value), lang) : c?.type === 'bool' ? t(f.value === 'true' ? 'admin.tables.yes' : 'admin.tables.no') : String(f.value);
                    const text = `${c ? columnLabel(def, c, lang) : f.column} ${t(`admin.tables.op.${f.op}`)}${opNeedsValue(f.op) ? ` ${val}` : ''}`;
                    return <Chip key={i} selected onClick={() => setCfg((cc) => ({ ...cc, filters: (cc.filters ?? []).filter((_, j) => j !== i) }))} aria-label={t('admin.tables.filter.removeNamed', { filter: text })}>{text}<Icon name="close" size="xs" /></Chip>;
                  })}
                </div>
              )}

              {panel && (
                <div id="tbl-panel" className="tbl-panelwrap">
                  {panel === 'filter' && <FilterPanel def={def} cfg={cfg} setCfg={setCfg} technical={technical} cols={filterCols} resolveRows={rowsOf} onClose={() => setPanel(null)} />}
                  {panel === 'sort' && <SortPanel def={def} cfg={cfg} setCfg={setCfg} technical={technical} cols={filterCols} onClose={() => setPanel(null)} />}
                  {panel === 'group' && <GroupPanel def={def} cfg={cfg} setCfg={setCfg} technical={technical} onClose={() => setPanel(null)} />}
                  {panel === 'columns' && <ColumnsPanel def={def} cfg={cfg} setCfg={setCfg} technical={technical} canWrite={canWrite} onClose={() => setPanel(null)} />}
                  {panel === 'export' && <ExportPanel count={sorted.length} onExport={exportRows} onClose={() => setPanel(null)} />}
                  {panel === 'views' && <ViewsPanel views={views} activeId={vs.viewId} canWrite={canWrite} onClose={() => setPanel(null)} onSave={saveView}
                    canEdit={canEditView} onRename={renameView} onDelete={deleteView}
                    onDefault={() => { setVs(() => ({ viewId: null, kind: 'grid', cfg: {} })); setParam({ view: null, v: null, mode: null, zoom: null, date: null }); }}
                    onPick={(v) => { setVs(() => ({ viewId: v.id, kind: v.kind, cfg: v.config ?? {} })); setParam({ view: v.kind === 'grid' ? null : v.kind, v: null, mode: null, zoom: null, date: null }); setPanel(null); }} />}
                </div>
              )}
            </header>

            {schema ? <SchemaView def={def} canWrite={canWrite} /> : (
              <div className="tbl-view">
                {kind === 'grid' && <GridView def={def} rows={filtered} cols={cols} cfg={cfg} setCfg={setCfg} ctx={ctx} onOpen={openRow} selected={selected} technical={technical} canWrite={canWrite} />}
                {kind === 'list' && <ListView def={def} rows={sorted} cols={cols} cfg={cfg} setCfg={setCfg} ctx={ctx} onOpen={openRow} selected={selected} technical={technical} canWrite={canWrite} />}
                {kind === 'gallery' && <GalleryView def={def} rows={sorted} cols={cols} cfg={cfg} setCfg={setCfg} ctx={ctx} onOpen={openRow} selected={selected} technical={technical} canWrite={canWrite} />}
                {kind === 'kanban' && <KanbanView def={def} rows={sorted} cols={cols} cfg={cfg} setCfg={setCfg} ctx={ctx} onOpen={openRow} selected={selected} technical={technical} canWrite={canWrite} onMove={moveCard} />}
                {kind === 'graph' && <GraphView def={def} counts={counts} focus={focusRow} resolve={resolve} rowsOf={rowsOf}
                  onTable={(name) => nav(`/admin/tables/${name}?view=graph`)} onRow={(tbl, id) => nav(`/admin/tables/${tbl}?view=graph&focus=${encodeURIComponent(id)}`)}
                  onOpenRow={(id) => openRow(id)} onRelated={(tbl, column, id) => nav(`/admin/tables/${tbl}?where=${encodeURIComponent(`${column}:${id}`)}`)} onClearFocus={() => setParam({ focus: null })} />}
                {kind === 'calendar' && (hasDate
                  ? <CalendarTableView def={def} rows={sorted} cfg={cfg} resolve={resolve} onOpen={openRow} selected={selected} cursor={cursor} onCursorChange={setCursor}
                      mode={calMode} onModeChange={setCalMode} onCreate={canCreateOnDate ? createOn : undefined} />
                  : <Notice tone="info" title={t('admin.tables.view.calendar')}>{t('admin.tables.view.noDate')}</Notice>)}
                {kind === 'timeline' && (hasDate
                  ? <TimelineTableView def={def} rows={sorted} cfg={cfg} resolve={resolve} onOpen={openRow} selected={selected} cursor={cursor} onCursorChange={setCursor}
                      zoom={tlZoom} onZoomChange={setTlZoom} />
                  : <Notice tone="info" title={t('admin.tables.view.timeline')}>{t('admin.tables.view.noDate')}</Notice>)}
              </div>
            )}

            <RowDrawer def={def} row={selectedRow} canWrite={canWrite} technical={technical} resolve={resolve} rowsOf={rowsOf} onClose={() => openRow(null)}
              onGraph={(id) => setParam({ id: null, view: 'graph', focus: id })} relatedHref={(tbl, column, id) => `/admin/tables/${tbl}?where=${encodeURIComponent(`${column}:${id}`)}`} />
          </>
        )}
      </section>

      <Drawer open={resetting} onClose={() => setResetting(false)} side="bottom" title={t('admin.tables.resetSeed')}
        footer={<div className="row wrap tbl-dialog-foot"><Button variant="ghost" onClick={() => setResetting(false)}>{t('core.common.cancel')}</Button><Button variant="danger" icon="refresh-cw" onClick={async () => { await data.reset?.(); setResetting(false); toast(t('admin.tables.resetDone'), 'success'); }}>{t('admin.tables.resetSeed')}</Button></div>}>
        <Notice tone="warn">{t('admin.tables.resetConfirm')}</Notice>
      </Drawer>
    </div>
  );
}
