import { SharedImageField } from '../../components/organism/SharedImageField/SharedImageField';
import { ClassPayRulesPanel } from '../../components/organism/ClassPayRulesPanel/ClassPayRulesPanel';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { previewRecurrence } from '../../data/classRecurrence';
import { formatDateTime, dateKey } from '../../i18n/format';
import { applyContentBatch, type ContentChange } from '../../data/contentBatch';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, ModalityRow, RoomRow, TeacherRow } from '../../data/schema';
import type { Bi } from '../../specs/types';
import { tenant } from '../../tenant/tenant';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { Input, Select } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { TONES } from '../../design/tokens';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Field } from '../../components/molecule/Field/Field';
import { Card } from '../../components/molecule/Card/Card';
import { ClassRow } from '../../components/molecule/ClassRow/ClassRow';
import { TeacherCard } from '../../components/organism/TeacherCard/TeacherCard';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useAudit } from '../staff/audit';
import { ContentSubNav } from './contentNav';
import './admin.css';

type Entity = 'class_templates' | 'teachers' | 'modalities' | 'rooms';
type FieldKind = 'text' | 'int' | 'bool' | 'bi' | 'select' | 'ref' | 'time' | 'list' | 'tone' | 'date' | 'image';
interface FieldDef { name: string; kind: FieldKind; label: Bi; options?: readonly string[]; ref?: 'modalities' | 'teachers' | 'rooms'; required?: boolean; hint?: Bi }

const WEEKDAYS: Bi[] = [{ es: 'Domingo', en: 'Sunday' }, { es: 'Lunes', en: 'Monday' }, { es: 'Martes', en: 'Tuesday' }, { es: 'Miércoles', en: 'Wednesday' }, { es: 'Jueves', en: 'Thursday' }, { es: 'Viernes', en: 'Friday' }, { es: 'Sábado', en: 'Saturday' }];
const FIELDS: Record<Entity, FieldDef[]> = {
  class_templates: [
    { name: 'title', kind: 'text', label: { es: 'Título', en: 'Title' }, required: true },
    { name: 'theme', kind: 'bi', label: { es: 'Tema predeterminado', en: 'Default theme' } },
    { name: 'description', kind: 'bi', label: { es: 'Descripción predeterminada', en: 'Default description' } },
    { name: 'modality_id', kind: 'ref', ref: 'modalities', label: { es: 'Modalidad', en: 'Modality' } },
    { name: 'teacher_id', kind: 'ref', ref: 'teachers', label: { es: 'Profesor/a', en: 'Teacher' } },
    { name: 'room_id', kind: 'ref', ref: 'rooms', label: { es: 'Sala', en: 'Room' } },
    { name: 'start_date', kind: 'date', label: { es: 'Desde (opcional)', en: 'From (optional)' } },
    { name: 'end_date', kind: 'date', label: { es: 'Hasta (opcional)', en: 'Until (optional)' } },
    { name: 'weekday', kind: 'select', options: ['0', '1', '2', '3', '4', '5', '6'], label: { es: 'Día', en: 'Weekday' } },
    { name: 'start_time', kind: 'time', label: { es: 'Hora', en: 'Start time' } },
    { name: 'duration_min', kind: 'int', label: { es: 'Duración (min)', en: 'Duration (min)' } },
    { name: 'capacity', kind: 'int', label: { es: 'Cupos', en: 'Capacity' }, hint: { es: 'Máximo: mats del estudio', en: 'Max: studio mats' } },
    { name: 'level', kind: 'select', options: ['all', 'beginner', 'intermediate', 'advanced'], label: { es: 'Nivel', en: 'Level' } },
  ],
  teachers: [
    { name: 'display_name', kind: 'text', label: { es: 'Nombre público', en: 'Public name' }, required: true },
    { name: 'bio', kind: 'bi', label: { es: 'Bio', en: 'Bio' } },
    { name: 'specialties', kind: 'list', label: { es: 'Especialidades', en: 'Specialties' } },
    { name: 'rate_per_class', kind: 'int', label: { es: 'Tarifa por clase (COP)', en: 'Rate per class (COP)' } },
    { name: 'photo_url', kind: 'image', label: { es: 'Foto', en: 'Photo' } },
  ],
  modalities: [
    { name: 'name_es', kind: 'text', label: { es: 'Nombre (ES)', en: 'Name (ES)' }, required: true },
    { name: 'name_en', kind: 'text', label: { es: 'Nombre (EN)', en: 'Name (EN)' } },
    { name: 'slug', kind: 'text', label: { es: 'Slug', en: 'Slug' } },
    { name: 'tone', kind: 'tone', label: { es: 'Tono de color', en: 'Colour tone' }, hint: { es: 'El color de la clase en chips, horario y calendario.', en: 'The class colour on chips, schedule and calendar.' } },
    { name: 'description', kind: 'bi', label: { es: 'Descripción', en: 'Description' } },
    { name: 'intensity', kind: 'int', label: { es: 'Intensidad 1–5', en: 'Intensity 1–5' } },
    { name: 'duration_min', kind: 'int', label: { es: 'Duración (min)', en: 'Duration (min)' } },
    { name: 'heated', kind: 'bool', label: { es: 'Sala caliente', en: 'Heated' } },
  ],
  rooms: [
    { name: 'name', kind: 'text', label: { es: 'Nombre', en: 'Name' }, required: true },
    { name: 'capacity', kind: 'int', label: { es: 'Capacidad (mats)', en: 'Capacity (mats)' } },
    { name: 'heated', kind: 'bool', label: { es: 'Calefacción', en: 'Heated' } },
    { name: 'notes', kind: 'text', label: { es: 'Notas', en: 'Notes' } },
  ],
};
const BLANK: Record<Entity, Record<string, unknown>> = {
  class_templates: { generation_mode: 'manual', start_date: dateKey(), end_date: null, title: '', modality_id: '', teacher_id: '', room_id: '', weekday: 1, start_time: '07:00', duration_min: tenant.classDefaults.durationMin, capacity: tenant.studio.mats, level: 'all', active: false },
  teachers: { user_id: null, display_name: '', bio: { es: '', en: '' }, photo_url: null, specialties: [], certifications: null, rate_per_class: 0, active: false, rating_avg: null },
  modalities: { slug: '', name_es: '', name_en: '', tone: 'river', description: { es: '', en: '' }, intensity: 3, heated: false, duration_min: tenant.classDefaults.durationMin, active: false },
  rooms: { name: '', capacity: tenant.studio.mats, heated: false, notes: null },
};

/** M-02 — content CMS: templates, teachers, modalities, rooms. DataTable + Drawer, publish toggles, ES/EN fields, preview. */
export function ContentPage() {
  const { t, bi, lang } = useI18n();
  const data = useData();
  const { can, role, user } = useSession();
  const [params] = useSearchParams();
  const audit = useAudit('admin');
  const [entity, setEntity] = useState<Entity>(() => { const e = params.get('entity'); return e && e in FIELDS ? e as Entity : 'class_templates'; });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(params.get('row'));
  const [checked, setChecked] = useState<string[]>([]);
  const [bulkField, setBulkField] = useState('active'), [bulkValue, setBulkValue] = useState('false');
  const [preview, setPreview] = useState<ContentChange[] | null>(null), [undo, setUndo] = useState<ContentChange[] | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false), [bulkError, setBulkError] = useState('');
  const [view, setView] = useState<'table' | 'list'>('table');
  useEffect(() => { const e = params.get('entity'); if (e && e in FIELDS) { setEntity(e as Entity); setSelected(params.get('row')); setChecked([]); setPreview(null); setUndo(null); } }, [params]);
  const { rows, loading } = useTable<BaseRow>(entity, { orderBy: { column: FIELDS[entity][0].name } });
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  const { rows: rooms } = useTable<RoomRow>('rooms');
  const refs = { modalities: modalities.map((m) => ({ id: m.id, label: bi({ es: m.name_es, en: m.name_en }) })), teachers: teachers.map((x) => ({ id: x.id, label: x.display_name })), rooms: rooms.map((r) => ({ id: r.id, label: r.name })) };
  const refLabel = (ref: keyof typeof refs, id: unknown) => refs[ref].find((r) => r.id === id)?.label ?? String(id ?? '—');
  const canWrite = can('content.write');
  const fields = FIELDS[entity].filter(f => f.name !== 'rate_per_class' || can('payroll.write'));
  const visibleRows = rows.filter(r => String(r[FIELDS[entity][0].name] ?? '').toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const bulkFields = fields.filter(f => ['teacher_id','modality_id','room_id','weekday','start_time','duration_min','capacity','level','heated','intensity','tone'].includes(f.name));
  const activeField: FieldDef = { name: 'active', kind: 'bool', label: { es: 'Publicado', en: 'Published' } };
  if (entity !== 'rooms') bulkFields.unshift(activeField);
  const chosenField = bulkFields.find(f => f.name === bulkField) ?? bulkFields[0];
  const resetBulk = () => { setChecked([]); setPreview(null); setUndo(null); setBulkError(''); setBulkField(entity === 'rooms' ? 'heated' : 'active'); setBulkValue('false'); };
  const bulk = async (action: 'preview' | 'apply' | 'undo') => {
    if (bulkBusy || !canWrite || !data.contentBatch) return;
    setBulkBusy(true); setBulkError('');
    try {
      if (action === 'preview') {
        const value = chosenField.kind === 'bool' ? bulkValue === 'true' : chosenField.kind === 'int' || chosenField.name === 'weekday' ? Number(bulkValue) : bulkValue;
        const changes = rows.filter(r => checked.includes(r.id)).map(r => ({ id: r.id, before: structuredClone(r), patch: { [chosenField.name]: value } }));
        const snapshot = Object.fromEntries(await Promise.all(['class_templates','class_sessions','teachers','modalities','rooms','audit_log'].map(async table => [table, await data.list(table)])));
        applyContentBatch(snapshot, { table: entity, changes, role, actorId: user.id }, tenant.id);
        setPreview(changes);
      } else {
        const changes = action === 'undo' ? undo : preview;
        if (!changes) return;
        const result = await data.contentBatch({ table: entity, changes, role, actorId: user.id, undo: action === 'undo' });
        setUndo(action === 'undo' ? null : result.changes); setPreview(null); setChecked([]);
        setBulkError(action === 'undo' ? 'bulk.undone' : 'bulk.saved');
      }
    } catch { setPreview(null); setBulkError('bulk.error'); } finally { setBulkBusy(false); }
  };
  const row = rows.find((r) => r.id === selected) ?? null;

  const columns = useMemo<DataTableColumn<BaseRow>[]>(() => {
    const first = fields.slice(0, entity === 'class_templates' ? 6 : 4);
    return [
      ...(canWrite ? [{ key: 'select', label: t('bulk.select'), render: (r: BaseRow) => <span onClick={e => e.stopPropagation()}><input type="checkbox" aria-label={`${t('bulk.select')} ${String(r[FIELDS[entity][0].name])}`} checked={checked.includes(r.id)} disabled={bulkBusy} onChange={e => { setChecked(ids => e.target.checked ? [...ids, r.id] : ids.filter(id => id !== r.id)); setPreview(null); }} /></span> }] : []),
      ...first.map<DataTableColumn<BaseRow>>((f) => ({ key: f.name, label: bi(f.label), render: (r) => {
        const v = r[f.name];
        if (f.kind === 'ref' && f.ref) return refLabel(f.ref, v);
        if (f.kind === 'bi') return bi((v as Bi | null) ?? { es: '', en: '' }) || <span className="muted">—</span>;
        if (f.kind === 'list') return (v as string[]).map((id) => <Chip key={id} tone={modalities.find((m) => m.id === id)?.tone}>{refLabel('modalities', id)}</Chip>);
        if (f.name === 'weekday') return bi(WEEKDAYS[Number(v)]);
        if (f.kind === 'tone') return <Chip tone={v as ModalityRow['tone']} dot>{String(v)}</Chip>;
        if (typeof v === 'boolean') return v ? '✓' : '·';
        return v == null || v === '' ? <span className="muted">—</span> : String(v);
      } })),
      { key: 'active', label: t('admin.content.published'), width: 120, render: (r) => <span onClick={(e) => e.stopPropagation()}><Toggle size="sm" checked={!!r.active} disabled={!canWrite} onChange={(on) => publish(r, on)} /></span> },
    ];
  }, [entity, bi, refs, canWrite, checked, bulkBusy, fields]);

  const publish = async (r: BaseRow, on: boolean) => {
    await data.update(entity, r.id, { active: on });
    await audit(on ? 'content.publish' : 'content.unpublish', entity, r.id, { before: !!r.active, after: on });
  };
  const add = async () => {
    const created = await data.insert(entity, BLANK[entity]);
    await audit('content.create', entity, created.id, { after: BLANK[entity] });
    setSelected(created.id);
  };
  const remove = async (r: BaseRow) => {
    if (!confirm(t('admin.content.deleteConfirm'))) return;
    await data.remove(entity, r.id);
    await audit('content.delete', entity, r.id, { before: r });
    setSelected(null);
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>{t('admin.content.title')}</h1><p className="muted small">{t('admin.content.subtitle')}</p></div>
        <div className="row wrap">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('core.common.search')} style={{ width: 220 }} aria-label={t('core.common.search')} />
          {canWrite && <Button size="sm" onClick={add}>{t('admin.content.add')}</Button>}
        </div>
      </div>
      <ContentSubNav current="entities" />
      <div className="row wrap" role="tablist">
        {(Object.keys(FIELDS) as Entity[]).map((e) => <Chip key={e} selected={entity === e} onClick={() => { setEntity(e); setSelected(null); setSearch(''); resetBulk(); setBulkField(e === 'rooms' ? 'heated' : 'active'); }}>{t(`admin.content.tab.${e}`)}</Chip>)}
        <span className="xs muted">{t('admin.content.pricingNote')}</span>
      </div>
      <div className="row wrap"><Link to="/admin/class-schedule">{t('schedule.title')}</Link>{(['table', 'list'] as const).map(v => <Button key={v} variant={view === v ? 'primary' : 'secondary'} aria-pressed={view === v} onClick={() => setView(v)}>{t(`schedule.${v}`)}</Button>)}</div>
      <p className="small muted">{t('schedule.demo')}</p>
      {canWrite && data.contentBatch && <Card title={t('bulk.title')}><div className="stack">
        <p className="small muted">{t('bulk.scope')}</p>
        <div className="row wrap"><Button variant="secondary" disabled={bulkBusy} onClick={() => { setChecked(visibleRows.map(r => r.id)); setPreview(null); }}>{t('bulk.selectVisible')}</Button><Button variant="ghost" disabled={bulkBusy} onClick={() => { setChecked([]); setPreview(null); }}>{t('bulk.clear')}</Button><span>{t('bulk.count', { n: checked.length })}</span></div>
        <div className="row wrap"><label>{t('bulk.field')}<Select aria-label={t('bulk.field')} value={chosenField.name} disabled={bulkBusy} onChange={e => { setBulkField(e.target.value); setBulkValue(''); setPreview(null); }}>{bulkFields.map(f => <option key={f.name} value={f.name}>{bi(f.label)}</option>)}</Select></label><label>{t('bulk.value')}{chosenField.kind === 'bool' ? <Select aria-label={t('bulk.value')} value={bulkValue} disabled={bulkBusy} onChange={e => { setBulkValue(e.target.value); setPreview(null); }}><option value="">—</option><option value="true">{t('admin.tables.yes')}</option><option value="false">{t('admin.tables.no')}</option></Select> : chosenField.kind === 'ref' && chosenField.ref ? <Select aria-label={t('bulk.value')} value={bulkValue} disabled={bulkBusy} onChange={e => { setBulkValue(e.target.value); setPreview(null); }}><option value="">—</option>{refs[chosenField.ref].map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</Select> : chosenField.kind === 'select' || chosenField.kind === 'tone' ? <Select aria-label={t('bulk.value')} value={bulkValue} disabled={bulkBusy} onChange={e => { setBulkValue(e.target.value); setPreview(null); }}><option value="">—</option>{(chosenField.options ?? TONES).map(v => <option key={v} value={v}>{chosenField.name === 'weekday' ? bi(WEEKDAYS[Number(v)]) : v}</option>)}</Select> : <Input aria-label={t('bulk.value')} value={bulkValue} disabled={bulkBusy} type={chosenField.kind === 'int' ? 'number' : chosenField.kind === 'time' ? 'time' : 'text'} onChange={e => { setBulkValue(e.target.value); setPreview(null); }} />}</label><Button disabled={!checked.length || bulkValue === '' || bulkBusy} onClick={() => bulk('preview')}>{t('bulk.preview')}</Button></div>
        {preview && <div className="stack"><strong>{t('bulk.preview')}</strong>{preview.map(c => { const key = Object.keys(c.patch)[0]; const f = bulkFields.find(x => x.name === key); const display = (v: unknown) => f?.ref ? refLabel(f.ref, v) : String(v); return <p key={c.id}>{String(c.before[FIELDS[entity][0].name])}: {bi(f?.label ?? { es: key, en: key })} · {display(c.before[key])} → {display(c.patch[key])}</p>; })}<div className="row wrap"><Button loading={bulkBusy} onClick={() => bulk('apply')}>{t('bulk.apply')}</Button><Button variant="secondary" disabled={bulkBusy} onClick={() => setPreview(null)}>{t('core.common.cancel')}</Button></div></div>}
        {undo && <Button variant="secondary" loading={bulkBusy} onClick={() => bulk('undo')}>{t('bulk.undo')}</Button>}{bulkError && <p role="status">{t(bulkError)}</p>}
      </div></Card>}
      {loading && rows.length === 0 ? <EmptyState tone="loading" title={t('core.common.loading')} /> : rows.length === 0 ? <EmptyState title={t('admin.content.empty')} body={t('admin.content.empty.body')} action={canWrite && <Button size="sm" onClick={add}>{t('admin.content.add')}</Button>} /> : (
        view === 'list' ? <div className="grid grid-2">{visibleRows.map(r => <Card key={r.id} title={String(r[FIELDS[entity][0].name])} actions={<Button onClick={() => setSelected(r.id)}>{t('core.common.edit')}</Button>}><div className="stack-sm">{canWrite && <label><input type="checkbox" checked={checked.includes(r.id)} disabled={bulkBusy} onChange={e => { setChecked(ids => e.target.checked ? [...ids, r.id] : ids.filter(id => id !== r.id)); setPreview(null); }} /> {t('bulk.select')}</label>}{fields.slice(1, 5).filter(f => f.kind !== 'bi' && f.kind !== 'list').map(f => <p key={f.name} className="small">{bi(f.label)}: {f.ref ? refLabel(f.ref, r[f.name]) : String(r[f.name] ?? '—')}</p>)}</div></Card>)}</div> : <DataTable columns={columns} rows={visibleRows} rowKey={(r) => r.id} search={search} onRowClick={(r) => setSelected(r.id)} selectedKey={selected} dense />
      )}
      <Drawer open={!!row} onClose={() => setSelected(null)} width={520} title={<div className="row wrap"><span>{t(`admin.content.tab.${entity}`)}</span>{row && <Badge tone={row.active ? 'success' : 'warn'}>{row.active ? t('admin.content.published') : t('admin.content.draft')}</Badge>}</div>}
        footer={row && canWrite ? <div className="row-between"><Button variant="danger" size="sm" onClick={() => remove(row)}>{t('core.common.delete')}</Button><Toggle size="sm" checked={!!row.active} label={t('admin.content.published')} onChange={(on) => publish(row, on)} /></div> : undefined}>
        {row && <Editor key={row.id} entity={entity} row={row} fields={fields} refs={refs} modalities={modalities} readOnly={!canWrite} lang={lang} onSave={async (patch) => { await data.update(entity, row.id, patch); await audit('content.update', entity, row.id, { before: Object.fromEntries(Object.keys(patch).map((k) => [k, row[k]])), after: patch }); }} />}
      </Drawer>
    </div>
  );
}

function Editor({ entity, row, fields, refs, modalities, readOnly, lang, onSave }: { entity: Entity; row: BaseRow; fields: FieldDef[]; refs: Record<'modalities' | 'teachers' | 'rooms', { id: string; label: string }[]>; modalities: ModalityRow[]; readOnly: boolean; lang: string; onSave: (patch: Record<string, unknown>) => Promise<void> }) {
  const { t, bi, lang: currentLang } = useI18n();
  const data = useData(); const { role, user } = useSession();
  const [recurrencePreview, setRecurrencePreview] = useState<ReturnType<typeof previewRecurrence> | null>(null);
  const [recurrenceMessage, setRecurrenceMessage] = useState('');
  const [draft, setDraft] = useState<Record<string, unknown>>(() => Object.fromEntries(fields.map((f) => [f.name, row[f.name]])));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => { setDraft(Object.fromEntries(fields.map((f) => [f.name, row[f.name]]))); }, [row.updated_at]);
  const dirty = fields.some((f) => JSON.stringify(draft[f.name]) !== JSON.stringify(row[f.name]));
  const errors = fields.filter((f) => f.required && !String(draft[f.name] ?? '').trim()).map((f) => f.name);
  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  const save = async () => { setSaving(true); setSaveError(false); try { await onSave(draft); } catch { setSaveError(true); } finally { setSaving(false); } };
  const d = draft as Record<string, string | number | boolean | Bi | string[] | null>;
  return (
    <div className="stack">
      <div className="stack-sm">
        {fields.map((f) => (
          <Field key={f.name} label={bi(f.label)} required={f.required} hint={f.hint ? bi(f.hint) : undefined} error={errors.includes(f.name) ? t('admin.content.required') : undefined}>
            {(id) => {
              const v = draft[f.name];
              if (f.kind === 'image') return <SharedImageField value={v as string | null} disabled={readOnly || saving} label={bi(f.label)} onChange={url => set(f.name, url)} />;
              if (f.kind === 'bool') return <Toggle checked={!!v} disabled={readOnly} onChange={(on) => set(f.name, on)} />;
              if (f.kind === 'int') return <Input id={id} type="number" disabled={readOnly} value={v == null ? '' : String(v)} onChange={(e) => set(f.name, e.target.value === '' ? null : Number(e.target.value))} />;
              if (f.kind === 'date') return <Input id={id} type="date" disabled={readOnly} value={String(v ?? '')} onChange={e => set(f.name, e.target.value || null)} />;
              if (f.kind === 'time') return <Input id={id} type="time" disabled={readOnly} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} />;
              if (f.kind === 'select') return <Select id={id} disabled={readOnly} value={String(v ?? '')} onChange={(e) => set(f.name, f.name === 'weekday' ? Number(e.target.value) : e.target.value)}>{f.options!.map((o) => <option key={o} value={o}>{f.name === 'weekday' ? bi(WEEKDAYS[Number(o)]) : o}</option>)}</Select>;
              if (f.kind === 'ref' && f.ref) return <Select id={id} disabled={readOnly} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)}><option value="">—</option>{refs[f.ref].map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</Select>;
              if (f.kind === 'bi') { const b = (v as Bi | null) ?? { es: '', en: '' }; return <div className="stack-sm"><textarea id={id} className="input adm-textarea" disabled={readOnly} placeholder="ES" value={b.es} onChange={(e) => set(f.name, { ...b, es: e.target.value })} /><textarea className="input adm-textarea" disabled={readOnly} placeholder="EN" value={b.en} onChange={(e) => set(f.name, { ...b, en: e.target.value })} aria-label={`${bi(f.label)} EN`} /></div>; }
              if (f.kind === 'tone') return <div className="row wrap" id={id} role="group">{TONES.map((k) => <Chip key={k} tone={k} dot selected={v === k} onClick={readOnly ? undefined : () => set(f.name, k)}>{k}</Chip>)}</div>;
              if (f.kind === 'list') { const list = (v as string[]) ?? []; return <div className="row wrap">{modalities.map((m) => <Chip key={m.id} tone={m.tone} dot selected={list.includes(m.id)} onClick={readOnly ? undefined : () => set(f.name, list.includes(m.id) ? list.filter((x) => x !== m.id) : [...list, m.id])}>{bi({ es: m.name_es, en: m.name_en })}</Chip>)}</div>; }
              return <Input id={id} disabled={readOnly} value={v == null ? '' : String(v)} onChange={(e) => set(f.name, e.target.value === '' && f.name !== 'title' ? null : e.target.value)} />;
            }}
          </Field>
        ))}
      </div>
      {saveError && <p role="alert">{t('bulk.saveError')}</p>}
      {!readOnly && <div className="row-between wrap"><span className="xs muted">{dirty ? t('admin.content.unsaved') : t('admin.content.upToDate')}</span><Button size="sm" disabled={!dirty || errors.length > 0} loading={saving} onClick={save}>{t('core.common.save')}</Button></div>}
      {entity === 'class_templates' && <ClassPayRulesPanel templateId={row.id} />}
      {entity === 'class_templates' && <Card title={t('recurrence.title')}><div className="stack"><p className="small muted">{t('recurrence.explain')}</p><p>{t('recurrence.defaults')}</p><Button variant="secondary" disabled={dirty || readOnly || saving || !data.generateRecurrence} onClick={() => { setRecurrencePreview(previewRecurrence(row)); setRecurrenceMessage(''); }}>{t('recurrence.preview')}</Button>{recurrencePreview && <><ol>{recurrencePreview.map(o => <li key={o.starts_at}>{formatDateTime(o.starts_at, currentLang)} · {Number(row.duration_min)} min</li>)}</ol>{!recurrencePreview.length && <p>{t('recurrence.empty')}</p>}<Button disabled={!row.active || !recurrencePreview.length || dirty || readOnly} loading={saving} onClick={async () => { setSaving(true); try { const result = await data.generateRecurrence!({ template: row, occurrences: recurrencePreview, role, actorId: user.id }); setRecurrenceMessage(t('recurrence.done', { n:result.created, skipped:result.skipped })); setRecurrencePreview(null); } catch { setRecurrenceMessage(t('recurrence.error')); } finally { setSaving(false); } }}>{t('recurrence.generate')}</Button>{!row.active && <p>{t('recurrence.publishFirst')}</p>}</>}{recurrenceMessage && <p role="status">{recurrenceMessage}</p>}</div></Card>}
      <Card tone="muted" eyebrow={t('admin.content.preview')} padding="sm">
        {entity === 'class_templates' && <ClassRow title={String(d.title ?? '')} teacher={refs.teachers.find((x) => x.id === d.teacher_id)?.label ?? ''} startsAt={`2026-01-05T${String(d.start_time ?? '07:00')}:00`} durationMin={Number(d.duration_min ?? 60)} tone={modalities.find((m) => m.id === d.modality_id)?.tone ?? 'river'} booked={0} capacity={Number(d.capacity ?? 0)} />}
        {entity === 'teachers' && <TeacherCard name={String(d.display_name ?? '')} bio={(d.bio as Bi) ?? { es: '', en: '' }} photo={d.photo_url as string | null} rating={row.rating_avg as number | null} specialties={((d.specialties as string[]) ?? []).map((id) => modalities.find((m) => m.id === id)).filter(Boolean).map((m) => ({ label: bi({ es: m!.name_es, en: m!.name_en }), tone: m!.tone }))} />}
        {entity === 'modalities' && <div className="stack-sm"><Chip tone={d.tone as ModalityRow['tone']} dot>{lang === 'en' ? String(d.name_en || d.name_es) : String(d.name_es)}</Chip><p className="small">{bi((d.description as Bi) ?? { es: '' })}</p><span className="xs muted">{d.duration_min as number} min · {t('admin.content.intensity')} {String(d.intensity)}{d.heated ? ' · ♨' : ''}</span></div>}
        {entity === 'rooms' && <div className="row-between"><strong>{String(d.name ?? '')}</strong><Badge>{String(d.capacity)} mats{d.heated ? ' · ♨' : ''}</Badge></div>}
      </Card>
    </div>
  );
}
