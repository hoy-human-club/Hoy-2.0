import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { TABLE_GROUPS, tableRegistry, tables as allTables, type TableDef } from '../../../data/schema';
import { tableLabel } from '../../../data/labels';
import { Icon } from '../../../components/atom/Icon/Icon';
import { Input } from '../../../components/atom/Input/Input';
import { Button } from '../../../components/atom/Button/Button';
import { toggleIn, type TablesPrefs } from './prefs';

const tables = allTables.filter(table => table.name !== 'class_pay_rules');

export interface TablesSidebarProps {
  current?: string;
  counts: Record<string, number>;
  prefs: TablesPrefs;
  update: (fn: (p: TablesPrefs) => TablesPrefs) => void;
  technical: boolean;
  /** 'rail' = collapsed to group icons; 'sheet' = inside the phone drawer (always expanded, no collapse button). */
  mode: 'expanded' | 'rail' | 'sheet';
  onNavigate: () => void;
  onToggle: () => void;
  providerName: string;
  onReset?: () => void;
}

/** M-03 sidebar: pinned, recent, then the groups as accordions; a search field; a collapsed rail of group icons. */
export function TablesSidebar({ current, counts, prefs, update, technical, mode, onNavigate, onToggle, providerName, onReset }: TablesSidebarProps) {
  const { t, bi, lang } = useI18n();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const match = (x: TableDef) => !query || x.name.toLowerCase().includes(query) || tableLabel(x, lang).toLowerCase().includes(query) || tableLabel(x, lang === 'es' ? 'en' : 'es').toLowerCase().includes(query);
  const pinned = prefs.pinned.filter((n) => n !== 'class_pay_rules' && tableRegistry[n]);
  const recent = prefs.recent.filter((n) => n !== 'class_pay_rules' && tableRegistry[n] && !pinned.includes(n));
  const groups = useMemo(() => TABLE_GROUPS.map((g) => ({ ...g, list: tables.filter((x) => x.group === g.id && match(x)) })).filter((g) => g.list.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, lang]);

  if (mode === 'rail') {
    return (
      <aside className="tbl-side is-rail" aria-label={t('admin.tables.sidebar')}>
        <div className="tbl-side-head">
          <button type="button" className="tbl-iconbtn ctl-round" onClick={onToggle} aria-label={t('admin.tables.sidebar.expand')} title={t('admin.tables.sidebar.expand')} aria-expanded={false}><Icon name="panel-left-open" size="md" /></button>
        </div>
        <nav className="tbl-rail" aria-label={t('admin.tables.groups')}>
          {TABLE_GROUPS.map((g) => {
            const active = current && tableRegistry[current]?.group === g.id;
            return (
              <button key={g.id} type="button" className={`tbl-railbtn ctl-round ${active ? 'is-active' : ''}`} title={bi(g.label)} aria-label={t('admin.tables.sidebar.openGroup', { group: bi(g.label) })}
                onClick={() => { update((p) => ({ ...p, sidebar: 'expanded', closedGroups: p.closedGroups.filter((x) => x !== g.id) })); }}>
                <Icon name={g.icon} size="md" />
              </button>
            );
          })}
        </nav>
      </aside>
    );
  }

  const row = (x: TableDef, key: string) => {
    const isPinned = prefs.pinned.includes(x.name);
    return (
      <li key={key} className="tbl-item">
        <NavLink to={`/admin/tables/${x.name}`} className={({ isActive }) => `tbl-link ${isActive ? 'is-active' : ''}`} onClick={() => { setQ(''); onNavigate(); }}>
          <span className="tbl-link-icon" aria-hidden><Icon name={x.icon ?? 'table'} size="sm" /></span>
          <span className="tbl-link-text">
            <span className="tbl-link-label">{tableLabel(x, lang)}</span>
            {technical && <code className="tbl-tech">{x.name}</code>}
          </span>
          <span className="tbl-link-count" aria-label={t('core.common.rows', { n: counts[x.name] ?? 0 })}>{counts[x.name] ?? 0}</span>
        </NavLink>
        <button type="button" className={`tbl-star ctl-round ${isPinned ? 'is-on' : ''}`} aria-pressed={isPinned} onClick={() => update((p) => ({ ...p, pinned: toggleIn(p.pinned, x.name) }))}
          aria-label={t(isPinned ? 'admin.tables.unpin' : 'admin.tables.pin', { table: tableLabel(x, lang) })} title={t(isPinned ? 'admin.tables.unpin' : 'admin.tables.pin', { table: tableLabel(x, lang) })}>
          <Icon name="star" size="sm" />
        </button>
      </li>
    );
  };

  return (
    <aside className={`tbl-side ${mode === 'sheet' ? 'is-sheet' : ''}`} aria-label={t('admin.tables.sidebar')}>
      <div className="tbl-side-head">
        <h2 className="tbl-h2">{t('admin.tables.title')}</h2>
        {mode === 'expanded' && <button type="button" className="tbl-iconbtn ctl-round" onClick={onToggle} aria-label={t('admin.tables.sidebar.collapse')} title={t('admin.tables.sidebar.collapse')} aria-expanded><Icon name="panel-left-close" size="md" /></button>}
      </div>
      <div className="tbl-side-search">
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.tables.sidebar.search')} aria-label={t('admin.tables.sidebar.search')} />
      </div>
      <nav className="tbl-nav" aria-label={t('core.nav.tables')}>
        {!query && pinned.length > 0 && (
          <section className="tbl-section">
            <h3 className="eyebrow tbl-section-title"><Icon name="pin" size="xs" />{t('admin.tables.pinned')}</h3>
            <ul className="tbl-list">{pinned.map((n) => row(tableRegistry[n], `p-${n}`))}</ul>
          </section>
        )}
        {!query && recent.length > 0 && (
          <section className="tbl-section">
            <h3 className="eyebrow tbl-section-title"><Icon name="history" size="xs" />{t('admin.tables.recent')}</h3>
            <ul className="tbl-list">{recent.map((n) => row(tableRegistry[n], `r-${n}`))}</ul>
          </section>
        )}
        {groups.map((g) => {
          const open = !!query || !prefs.closedGroups.includes(g.id);
          const panel = `tbl-group-${g.id}`;
          return (
            <section key={g.id} className={`tbl-group ${open ? 'is-open' : ''}`}>
              <h3 className="tbl-group-h">
                <button type="button" className="tbl-grouplabel" aria-expanded={open} aria-controls={panel} onClick={() => update((p) => ({ ...p, closedGroups: toggleIn(p.closedGroups, g.id) }))}>
                  <Icon name={g.icon} size="sm" />
                  <span className="grow">{bi(g.label)}</span>
                  <span className="tbl-group-n">{g.list.length}</span>
                  <span className="tbl-caret" aria-hidden><Icon name="chevron-down" size="xs" /></span>
                </button>
              </h3>
              {open && <ul id={panel} className="tbl-list">{g.list.map((x) => row(x, x.name))}</ul>}
            </section>
          );
        })}
        {groups.length === 0 && <p className="small muted tbl-noresults">{t('admin.tables.sidebar.none', { q })}</p>}
      </nav>
      <div className="tbl-side-foot">
        <span className="tbl-provider small muted"><Icon name="database" size="xs" />{t('admin.tables.provider', { name: providerName })}</span>
        {onReset && <Button size="sm" variant="ghost" icon="refresh-cw" onClick={onReset}>{t('admin.tables.resetSeed')}</Button>}
      </div>
    </aside>
  );
}
