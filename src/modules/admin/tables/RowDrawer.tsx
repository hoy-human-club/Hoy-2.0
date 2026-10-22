import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import type { BaseRow, ColumnDef } from '../../../data/schema';
import { tableRegistry } from '../../../data/schema';
import { columnLabel, enumLabel, rowTitle, tableLabel } from '../../../data/labels';
import { getRelations } from '../../../data/relations';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { ListRow } from '../../../components/molecule/ListRow/ListRow';
import { Input, Select } from '../../../components/atom/Input/Input';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { toast } from '../../../app/toast';
import { allowedColumns, type Def, type Resolve } from './model';
import { formatWhen } from './cells';
import { removeExpenseRow } from './expenseDelete';

const LOCKED = ['id', 'tenant_id', 'created_at', 'updated_at'];

export interface RowDrawerProps {
  def: Def;
  row: BaseRow | null;
  canWrite: boolean;
  technical: boolean;
  resolve: Resolve;
  rowsOf: (table: string) => BaseRow[];
  onClose: () => void;
  onGraph: (id: string) => void;
  relatedHref: (table: string, column: string, id: string) => string;
}

/** The row drawer: human labels, FK pickers by title, ES / EN inputs for bilingual fields, related rows, in-product delete confirm. */
export function RowDrawer({ def, row, canWrite, technical, resolve, rowsOf, onClose, onGraph, relatedHref }: RowDrawerProps) {
  const { t, lang } = useI18n();
  const data = useData();
  const { user, role } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState<string | null>(null);
  const scope = `${def.name}:${row?.id ?? ''}:${user.id}:${role}:${canWrite}`;
  const live = useRef({ scope, data, epoch: 0, mounted: true, busy: false });
  if (live.current.scope !== scope || live.current.data !== data) live.current = { scope, data, epoch: live.current.epoch + 1, mounted: true, busy: false };
  useEffect(() => { live.current.mounted = true; setConfirming(false); setBusy(false); setError(''); setSaved(null); return () => { live.current.mounted = false; live.current.epoch++; live.current.busy = false; }; }, [scope, data]);
  useEffect(() => { if (!saved) return; const timer = setTimeout(() => setSaved(null), 1400); return () => clearTimeout(timer); }, [saved]);
  const cancel = () => { const wasBusy = live.current.busy; live.current.epoch++; live.current.busy = false; setBusy(false); setConfirming(false); setError(wasBusy ? 'admin.tables.writeCancelled' : ''); };
  const close = () => { cancel(); onClose(); };
  const deleteBefore = useRef<{row:BaseRow;requestId:string} | null>(null);
  const paid = def.name === 'expenses' && !!row?.paid_on;
  const execute = async (field?: string, value?: unknown) => {
    if (!row || !canWrite || live.current.busy || !live.current.mounted || live.current.scope !== scope || live.current.data !== data) return;
    const state = live.current, epoch = state.epoch, id = row.id, table = def.name;
    const current = () => live.current === state && state.mounted && state.epoch === epoch;
    state.busy = true; setBusy(true); setError(''); setSaved(null);
    try {
      if (field) await data.update(table, id, { [field]: value }); else if (table === 'expenses') { if (!deleteBefore.current || deleteBefore.current.row.id !== id) throw Error('expense_delete_stale'); await removeExpenseRow(data, deleteBefore.current.row, {requestId:deleteBefore.current.requestId,actorId:user.id,role}, current); } else await data.remove(table, id);
      if (!current()) return; // Cancellation cannot undo an already committed local write.
      const acknowledged = await data.get(table, id);
      if (!current()) return;
      if (field ? !acknowledged || JSON.stringify(acknowledged[field]) !== JSON.stringify(value) : acknowledged !== null) throw Error('table_ack_unconfirmed');
      if (field) setSaved(field);
      else { toast(t('admin.tables.deleted', { title }), 'success'); setConfirming(false); onClose(); }
    } catch (failure) {
      if (current()) setError(failure instanceof Error && /^expense_paid_/.test(failure.message) ? 'admin.tables.paidProtected' : 'admin.tables.writeFailed');
    } finally { if (current()) { state.busy = false; setBusy(false); } }
  };
  const title = row ? rowTitle(def, row, lang, resolve) : '';
  const incoming = useMemo(() => (row ? getRelations().filter((e) => e.to === def.name).map((e) => ({ e, n: rowsOf(e.from).filter((r) => r[e.column] === row.id).length })).filter((x) => x.n > 0) : []), [row, def.name, rowsOf]);
  return (
    <Drawer open={!!row} onClose={close} width={560}
      title={
        <div className="tbl-drawer-title">
          <span className="eyebrow">{tableLabel(def, lang)}</span>
          <h3>{title}</h3>
          {technical && row && <code className="tbl-tech">{def.name} · {row.id}</code>}
        </div>
      }
      footer={row ? (
        confirming ? (
          <Notice tone="danger" title={t('admin.tables.deleteConfirm')} action={<div className="row wrap"><Button size="sm" variant="ghost" onClick={cancel}>{t('core.common.cancel')}</Button><Button size="sm" variant="danger" icon="trash" loading={busy} disabled={busy || paid} onClick={() => void execute()}>{t('core.common.delete')}</Button></div>}>{t('admin.tables.deleteBody')}</Notice>
        ) : (
          <div className="row-between wrap tbl-drawer-foot">
            <Button size="sm" variant="secondary" icon="graph" onClick={() => onGraph(row.id)}>{t('admin.tables.graph.open')}</Button>
            {canWrite && <Button variant="danger" size="sm" icon="trash" disabled={busy || paid} onClick={() => { deleteBefore.current = {row:structuredClone(row),requestId:crypto.randomUUID()}; setError(''); setConfirming(true); }}>{t('core.common.delete')}</Button>}
          </div>
        )
      ) : undefined}>
      {row && (
        <div className="stack">
          {paid && <Notice tone="info">{t('admin.tables.paidProtected')}</Notice>}
          {busy && <Notice tone="info" action={<Button variant="ghost" onClick={cancel}>{t('core.common.cancel')}</Button>}>{t('admin.tables.pendingWrite')}</Notice>}
          {error && <Notice tone="warn">{t(error)}</Notice>}
          <RowEditor key={row.id} def={def} row={row} readOnly={!canWrite} busy={busy} technical={technical} rowsOf={rowsOf} save={execute} saved={saved} />
          <section className="stack-sm tbl-related" aria-labelledby="tbl-related-h">
            <h4 id="tbl-related-h" className="tbl-h4">{t('admin.tables.related')}</h4>
            {incoming.length === 0 ? <p className="small muted">{t('admin.tables.related.none')}</p> : (
              <div className="tbl-listgroup">
                {incoming.map(({ e, n }) => (
                  <ListRow key={`${e.from}.${e.column}`} icon={tableRegistry[e.from]?.icon ?? 'table'} title={tableLabel(e.from, lang)} subtitle={t('admin.tables.related.via', { column: columnLabel(e.from, e.column, lang) })}
                    to={relatedHref(e.from, e.column, row.id)} trailing={<Badge tone="primary">{n}</Badge>} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}

function typeWord(c: ColumnDef, t: (k: string) => string) {
  if (c.references) return t('admin.tables.type.reference');
  if (c.enum) return t('admin.tables.type.enum');
  return t(`admin.tables.type.${c.type}`);
}

function RowEditor({ def, row, readOnly, technical, rowsOf, save, saved, busy }: { def: Def; row: BaseRow; readOnly: boolean; technical: boolean; rowsOf: (table: string) => BaseRow[]; save: (name: string, value: unknown) => Promise<void>; saved: string | null; busy: boolean }) {
  const { t, lang } = useI18n();
  const locked = (c: ColumnDef) => readOnly || busy || LOCKED.includes(c.name);
  const all = allowedColumns(def, !readOnly);
  // the row's own fields first; id, studio and the two timestamps last, under "Datos del sistema"
  const cols = [...all.filter((c) => !LOCKED.includes(c.name)), ...all.filter((c) => LOCKED.includes(c.name))];
  return (
    <div className="stack-sm tbl-editor">
      {cols.map((c, i) => {
        const sysHead = LOCKED.includes(c.name) && (i === 0 || !LOCKED.includes(cols[i - 1].name)) ? <h4 key={`h-${c.name}`} className="tbl-h4 tbl-syshead">{t('admin.tables.system')}</h4> : null;
        return <Fragment key={c.name}>{sysHead}{renderField(c)}</Fragment>;
      })}
    </div>
  );

  function renderField(c: ColumnDef) {
        const v = row[c.name];
        const parts = [typeWord(c, t)];
        if (c.references) parts[0] = `${parts[0]} → ${tableLabel(c.references, lang)}`;
        if (c.nullable) parts.push(t('admin.tables.optional'));
        if (technical) parts.push(c.name);
        if (locked(c)) parts.push(LOCKED.includes(c.name) ? t('admin.tables.readonly') : t('admin.tables.readonlyRole'));
        else if (saved === c.name) parts.push(t('admin.tables.saved'));
        const hint = parts.join(' · ');
        const isBi = c.type === 'json' && v != null && typeof v === 'object' && !Array.isArray(v) && ('es' in (v as object) || 'en' in (v as object));
        if (isBi || (c.type === 'json' && v == null && /\{es,en\}/.test(c.description ?? ''))) {
          const bi = (v ?? {}) as { es?: string; en?: string };
          return (
            <fieldset key={c.name} className="tbl-bi">
              <legend className="field-label">{columnLabel(def, c, lang)}</legend>
              {(['es', 'en'] as const).map((l) => (
                <Field key={l} label={l.toUpperCase()}>
                  {(id) => <Input id={id} disabled={locked(c)} defaultValue={bi[l] ?? ''} onBlur={(e) => { if (e.target.value !== (bi[l] ?? '')) save(c.name, { ...bi, [l]: e.target.value }); }} />}
                </Field>
              ))}
              <p className="field-msg muted">{hint}</p>
            </fieldset>
          );
        }
        return (
          <Field key={c.name} label={columnLabel(def, c, lang)} hint={hint}>
            {(id) => {
              if (c.references) return <RefSelect id={id} c={c} value={typeof v === 'string' ? v : ''} disabled={locked(c)} rowsOf={rowsOf} onChange={(nv) => save(c.name, nv || null)} />;
              if (c.type === 'bool') return <Select id={id} disabled={locked(c)} value={String(!!v)} onChange={(e) => save(c.name, e.target.value === 'true')}><option value="true">{t('admin.tables.yes')}</option><option value="false">{t('admin.tables.no')}</option></Select>;
              if (c.enum) return <Select id={id} disabled={locked(c)} value={String(v ?? '')} onChange={(e) => save(c.name, e.target.value || null)}>{c.nullable && <option value="">—</option>}{c.enum.map((o) => <option key={o} value={o}>{enumLabel(o, lang)}{technical ? ` · ${o}` : ''}</option>)}</Select>;
              if (c.type === 'json') return <textarea id={id} className="input tbl-json" disabled={locked(c)} defaultValue={v == null ? '' : JSON.stringify(v, null, 2)} rows={4} onBlur={(e) => { try { save(c.name, e.target.value ? JSON.parse(e.target.value) : null); } catch { toast(t('admin.tables.jsonInvalid'), 'warn'); } }} />;
              if (c.type === 'int' || c.type === 'numeric') return <Input id={id} type="number" disabled={locked(c)} defaultValue={v == null ? '' : String(v)} onBlur={(e) => save(c.name, e.target.value === '' ? null : Number(e.target.value))} />;
              if (c.type === 'date') return <Input id={id} type="date" disabled={locked(c)} defaultValue={typeof v === 'string' ? v.slice(0, 10) : ''} onBlur={(e) => { const nv = e.target.value || null; if (nv !== v) save(c.name, nv); }} />;
              if (c.type === 'timestamptz' && LOCKED.includes(c.name) && typeof v === 'string') return <Input id={id} disabled value={formatWhen(c, v, lang)} readOnly />;
              return <Input id={id} disabled={locked(c)} className={c.type === 'uuid' ? 'mono' : ''} defaultValue={v == null ? '' : String(v)} onBlur={(e) => { const nv = e.target.value === '' && c.nullable ? null : e.target.value; if (nv !== v) save(c.name, nv); }} />;
            }}
          </Field>
        );
  }
}

/** A foreign key as a Select of the referenced rows by title; a search box narrows it when there are more than 50. */
function RefSelect({ id, c, value, disabled, rowsOf, onChange }: { id: string; c: ColumnDef; value: string; disabled: boolean; rowsOf: (table: string) => BaseRow[]; onChange: (v: string) => void }) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState('');
  const all = useMemo(() => rowsOf(c.references!).map((r) => ({ id: r.id, title: rowTitle(c.references!, r, lang) })).sort((a, b) => a.title.localeCompare(b.title)), [c.references, rowsOf, lang]);
  const needle = q.trim().toLowerCase();
  const list = (needle ? all.filter((o) => o.title.toLowerCase().includes(needle) || o.id.includes(needle)) : all).slice(0, 200);
  if (value && !list.some((o) => o.id === value)) { const cur = all.find((o) => o.id === value); list.unshift(cur ?? { id: value, title: value }); }
  return (
    <div className="stack-sm">
      {all.length > 50 && !disabled && <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.tables.refSearch', { n: all.length })} aria-label={t('admin.tables.refSearch', { n: all.length })} />}
      <Select id={id} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {list.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
      </Select>
      {value && <Link className="small tbl-reflink" to={`/admin/tables/${c.references}?id=${encodeURIComponent(value)}`}>{t('admin.tables.openRef', { table: tableLabel(c.references!, lang) })}</Link>}
    </div>
  );
}
