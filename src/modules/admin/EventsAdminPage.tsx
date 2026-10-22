import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useTable } from '../../data/DataContext';
import type { EventRow, EventRsvpRow, RoomRow, TeacherRow } from '../../data/schema';
import type { Bi } from '../../specs/types';
import { formatCOP, formatDateTime, MS, atStudioTime, addDays } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { priceItem } from '../../tenant/pricing';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { Input, Select } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { Field } from '../../components/molecule/Field/Field';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { BiField, ContentHead, fromLocalInput, toLocalInput, useContentEditing } from './contentNav';
import './admin.css';

const TONE = { draft: 'warn', published: 'success', cancelled: 'danger' } as const;

/** M-02c — the event publisher: create, edit, publish and see who has said yes. */
export function EventsAdminPage() {
  const { t, bi, lang } = useI18n();
  const { data, audit, canWrite } = useContentEditing();
  const { rows, loading } = useTable<EventRow>('events', { orderBy: { column: 'starts_at', dir: 'desc' } });
  const { rows: rsvps } = useTable<EventRsvpRow>('event_rsvps');
  const { rows: rooms } = useTable<RoomRow>('rooms');
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | EventRow['status']>('all');
  const row = rows.find((r) => r.id === selected) ?? null;

  const going = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rsvps) if (r.status === 'going' || r.status === 'attended') m.set(r.event_id, (m.get(r.event_id) ?? 0) + 1 + (r.guests ?? 0));
    return m;
  }, [rsvps]);
  const shown = rows.filter((r) => filter === 'all' || r.status === filter);

  const add = async () => {
    const start = atStudioTime(addDays(new Date(), 14), 18);
    const end = new Date(start.getTime() + 90 * MS.min);
    const body: Partial<EventRow> = {
      slug: '', title: { es: '', en: '' }, kind: { es: 'Taller', en: 'Workshop' }, description: { es: '', en: '' }, bring: null,
      starts_at: start.toISOString(), ends_at: end.toISOString(), room_id: rooms[0]?.id ?? null, host_teacher_id: null,
      capacity: tenant.studio.mats, price_cop: priceItem('single')?.price ?? 0, member_price_cop: priceItem('single')?.price ?? 0, cover_key: 'event.cover', status: 'draft',
    };
    const created = await data.insert<EventRow>('events', body);
    await audit('content.create', 'events', created.id, { after: { starts_at: body.starts_at } });
    setSelected(created.id);
  };
  const setStatus = async (r: EventRow, status: EventRow['status']) => {
    await data.update('events', r.id, { status });
    await audit(status === 'published' ? 'event.publish' : status === 'cancelled' ? 'event.cancel' : 'event.unpublish', 'events', r.id, { before: r.status, after: status, rsvps: going.get(r.id) ?? 0 });
  };
  const remove = async (r: EventRow) => {
    if ((going.get(r.id) ?? 0) > 0) { alert(t('admin.events.hasRsvps')); return; }
    if (!confirm(t('admin.content.deleteConfirm'))) return;
    await data.remove('events', r.id);
    await audit('content.delete', 'events', r.id, { before: { slug: r.slug, title: r.title } });
    setSelected(null);
  };

  const cols: DataTableColumn<EventRow>[] = [
    { key: 'title', label: t('admin.events.col.title'), render: (r) => <><strong className="small">{bi(r.title) || <span className="muted">{t('admin.events.untitled')}</span>}</strong><div className="xs muted">{bi(r.kind)} · <span className="mono">{r.slug || '—'}</span></div></> },
    { key: 'starts_at', label: t('admin.events.col.when'), render: (r) => <span className="xs mono">{formatDateTime(r.starts_at, lang)}</span> },
    { key: 'rsvps', label: t('admin.events.col.rsvps'), align: 'right', sortable: false, render: (r) => <span className={going.get(r.id) && going.get(r.id)! >= r.capacity ? 'adm-neg' : ''}>{going.get(r.id) ?? 0} / {r.capacity}</span> },
    { key: 'price_cop', label: t('admin.events.col.price'), align: 'right', render: (r) => formatCOP(r.price_cop, lang) },
    { key: 'member_price_cop', label: t('admin.events.col.memberPrice'), align: 'right', render: (r) => r.member_price_cop === 0 ? <Chip>{t('admin.events.included')}</Chip> : formatCOP(r.member_price_cop, lang) },
    { key: 'status', label: t('admin.events.col.status'), render: (r) => <Badge tone={TONE[r.status]}>{t(`admin.events.status.${r.status}`)}</Badge> },
  ];

  return (
    <div className="stack">
      <ContentHead current="events" title={t('admin.events.title')} subtitle={t('admin.events.subtitle')}
        actions={canWrite ? <Button size="sm" onClick={add}>{t('admin.events.add')}</Button> : undefined} />

      <div className="row wrap" role="tablist" aria-label={t('admin.events.col.status')}>
        {(['all', 'published', 'draft', 'cancelled'] as const).map((f) => (
          <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? t('admin.articles.filter.all') : t(`admin.events.status.${f}`)}
            {f !== 'all' ? ` · ${rows.filter((r) => r.status === f).length}` : ''}
          </Chip>
        ))}
        <span className="xs muted">{t('admin.events.rsvpNote')}</span>
      </div>

      {loading && rows.length === 0
        ? <EmptyState tone="loading" title={t('core.common.loading')} />
        : rows.length === 0
          ? <EmptyState title={t('admin.events.empty')} body={t('admin.events.empty.body')} action={canWrite && <Button size="sm" onClick={add}>{t('admin.events.add')}</Button>} />
          : <DataTable columns={cols} rows={shown} rowKey={(r) => r.id} dense onRowClick={(r) => setSelected(r.id)} selectedKey={selected} emptyText={t('admin.articles.emptyFilter')} />}

      <Drawer open={!!row} onClose={() => setSelected(null)} width={620}
        title={<div className="row wrap"><span>{t('admin.events.editor')}</span>{row && <Badge tone={TONE[row.status]}>{t(`admin.events.status.${row.status}`)}</Badge>}</div>}
        footer={row && canWrite ? (
          <div className="row-between wrap">
            <Button variant="danger" size="sm" onClick={() => remove(row)}>{t('core.common.delete')}</Button>
            <div className="row wrap">
              {row.status !== 'published' && <Button size="sm" onClick={() => setStatus(row, 'published')}>{t('admin.events.publish')}</Button>}
              {row.status === 'published' && <Button size="sm" variant="ghost" onClick={() => setStatus(row, 'draft')}>{t('admin.events.unpublish')}</Button>}
              {row.status !== 'cancelled' && <Button size="sm" variant="ghost" onClick={() => setStatus(row, 'cancelled')}>{t('admin.events.cancel')}</Button>}
            </div>
          </div>
        ) : undefined}>
        {row && <EventEditor key={row.id} row={row} rooms={rooms} teachers={teachers} rsvps={going.get(row.id) ?? 0} readOnly={!canWrite} onSave={async (patch) => {
          await data.update('events', row.id, patch);
          await audit('content.update', 'events', row.id, { before: Object.fromEntries(Object.keys(patch).map((k) => [k, row[k]])), after: patch });
        }} />}
      </Drawer>
    </div>
  );
}

interface EventDraft extends Record<string, unknown> {
  slug: string; title: Bi; kind: Bi; description: Bi; starts_at: string; ends_at: string;
  room_id: string | null; host_teacher_id: string | null; capacity: number; price_cop: number; member_price_cop: number;
}
const pick = (r: EventRow): EventDraft => ({
  slug: r.slug ?? '', title: r.title, kind: r.kind, description: r.description, starts_at: r.starts_at, ends_at: r.ends_at,
  room_id: r.room_id ?? null, host_teacher_id: r.host_teacher_id ?? null, capacity: r.capacity, price_cop: r.price_cop, member_price_cop: r.member_price_cop,
});

function EventEditor({ row, rooms, teachers, rsvps, readOnly, onSave }: { row: EventRow; rooms: RoomRow[]; teachers: TeacherRow[]; rsvps: number; readOnly: boolean; onSave: (patch: Partial<EventRow>) => Promise<void> }) {
  const { t, bi, lang } = useI18n();
  const [draft, setDraft] = useState(() => pick(row));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(pick(row)); }, [row.id, row.updated_at]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(pick(row));
  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const slugError = !draft.slug.trim() ? t('admin.content.required') : undefined;
  const capError = draft.capacity < rsvps ? t('admin.events.capBelowRsvps', { n: rsvps }) : draft.capacity > tenant.studio.mats ? t('admin.events.capOverMats', { n: tenant.studio.mats }) : undefined;
  const order = draft.ends_at > draft.starts_at ? undefined : t('admin.events.endBeforeStart');

  return (
    <div className="stack">
      <div className="adm-notice small">{t('admin.events.rsvpCount', { n: rsvps, cap: row.capacity })}</div>
      <div className="grid grid-2">
        <Field label={t('admin.articles.slug')} required error={slugError}>
          {(id) => <Input id={id} disabled={readOnly} value={draft.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />}
        </Field>
        <Field label={t('admin.events.capacity')} error={capError} hint={t('admin.events.capacity.hint', { n: tenant.studio.mats })}>
          {(id) => <Input id={id} type="number" disabled={readOnly} value={String(draft.capacity)} onChange={(e) => set('capacity', Number(e.target.value) || 0)} />}
        </Field>
      </div>
      <BiField label={t('admin.events.titleField')} value={draft.title} onChange={(v) => set('title', v)} disabled={readOnly} rows={1} />
      <BiField label={t('admin.events.kind')} value={draft.kind} onChange={(v) => set('kind', v)} disabled={readOnly} rows={1} hint={t('admin.events.kind.hint')} />
      <BiField label={t('admin.events.description')} value={draft.description} onChange={(v) => set('description', v)} disabled={readOnly} rows={5} />
      <div className="grid grid-2">
        <Field label={t('admin.events.starts')} error={order}>
          {(id) => <Input id={id} type="datetime-local" disabled={readOnly} value={toLocalInput(draft.starts_at)} onChange={(e) => set('starts_at', fromLocalInput(e.target.value) ?? draft.starts_at)} />}
        </Field>
        <Field label={t('admin.events.ends')}>
          {(id) => <Input id={id} type="datetime-local" disabled={readOnly} value={toLocalInput(draft.ends_at)} onChange={(e) => set('ends_at', fromLocalInput(e.target.value) ?? draft.ends_at)} />}
        </Field>
      </div>
      <div className="grid grid-2">
        <Field label={t('admin.events.room')}>
          {(id) => <Select id={id} disabled={readOnly} value={draft.room_id ?? ''} onChange={(e) => set('room_id', e.target.value || null)}><option value="">—</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>}
        </Field>
        <Field label={t('admin.events.host')}>
          {(id) => <Select id={id} disabled={readOnly} value={draft.host_teacher_id ?? ''} onChange={(e) => set('host_teacher_id', e.target.value || null)}><option value="">—</option>{teachers.map((x) => <option key={x.id} value={x.id}>{x.display_name}</option>)}</Select>}
        </Field>
      </div>
      <div className="grid grid-2">
        <Field label={t('admin.events.col.price')} hint={t('admin.events.price.hint')}>
          {(id) => <Input id={id} type="number" step={1000} disabled={readOnly} value={String(draft.price_cop)} onChange={(e) => set('price_cop', Number(e.target.value) || 0)} />}
        </Field>
        <Field label={t('admin.events.col.memberPrice')} hint={t('admin.events.memberPrice.hint')}>
          {(id) => <Input id={id} type="number" step={1000} disabled={readOnly} value={String(draft.member_price_cop)} onChange={(e) => set('member_price_cop', Number(e.target.value) || 0)} />}
        </Field>
      </div>
      <p className="xs muted">{t('admin.events.preview', { title: bi(draft.title) || '—', price: formatCOP(draft.price_cop, lang) })}</p>
      {!readOnly && (
        <div className="row-between wrap">
          <span className="xs muted">{dirty ? t('admin.content.unsaved') : t('admin.content.upToDate')}</span>
          <Button size="sm" disabled={!dirty || !!slugError || !!capError || !!order} loading={saving} onClick={async () => { setSaving(true); try { await onSave(draft); } finally { setSaving(false); } }}>{t('core.common.save')}</Button>
        </div>
      )}
    </div>
  );
}
