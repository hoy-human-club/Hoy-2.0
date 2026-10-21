import { tenant } from '../../tenant/tenant';
import { ClassPayRulesPanel } from '../../components/organism/ClassPayRulesPanel/ClassPayRulesPanel';
import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, ClassSessionRow, ModalityRow, TeacherRow, RoomRow } from '../../data/schema';
import { useI18n } from '../../i18n/I18nProvider';
import { formatDateTime } from '../../i18n/format';
import { useLayout } from '../../layout/useLayout';
import { SessionCalendar } from '../../components/organism/SessionCalendar/SessionCalendar';
import { DataTable } from '../../components/organism/DataTable/DataTable';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Card } from '../../components/molecule/Card/Card';
import { Field } from '../../components/molecule/Field/Field';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useSession } from '../../auth/SessionProvider';
import { BiField } from '../admin/contentNav';
import { resolveSessionEditorial } from '../../data/sessionEditorial';
import type { Bi } from '../../specs/types';
import { scheduleSpec } from './specs';

export function ClassSchedulePage() {
 const { t, bi, lang } = useI18n();
 const { rows: sessions, loading } = useTable<ClassSessionRow>('class_sessions', { orderBy: { column: 'starts_at' } });
 const { rows: teachers } = useTable<TeacherRow>('teachers');
 const { rows: modalities } = useTable<ModalityRow>('modalities');
 const { rows: rooms } = useTable<RoomRow>('rooms');
 const { rows: templates } = useTable<BaseRow>('class_templates');
 const [view, setView] = useState('calendar');
 const [teacher, setTeacher] = useState(''), [modality, setModality] = useState(''), [room, setRoom] = useState('');
 const [status, setStatus] = useState('scheduled'), [search, setSearch] = useState('');
 const [selected, setSelected] = useState<ClassSessionRow | null>(null);
 const { sections, isVisible } = useLayout(scheduleSpec);
 const teacherName = (id: string) => teachers.find(x => x.id === id)?.display_name ?? '—';
 const modalityName = (id: string) => { const m = modalities.find(x => x.id === id); return m ? bi({ es: m.name_es, en: m.name_en }) : '—'; };
 const roomName = (id: string) => rooms.find(x => x.id === id)?.name ?? '—';
 const rows = sessions.filter(s => (!teacher || s.teacher_id === teacher) && (!modality || s.modality_id === modality) && (!room || s.room_id === room) && (!status || s.status === status) && s.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 const inactive = (s: ClassSessionRow) => s.template_id && templates.find(x => x.id === s.template_id)?.active === false;
 const contents: Record<string, () => React.ReactNode> = {
 notice: () => <Card tone="muted"><p>{t('schedule.demo')}</p><div className="row wrap"><Link to="/admin/content?entity=class_templates">{t('schedule.templates')}</Link>{(['teachers', 'modalities', 'rooms'] as const).map(e => <Link key={e} to={`/admin/content?entity=${e}`}>{t(`admin.content.tab.${e}`)}</Link>)}</div></Card>,
 filters: () => <div className="stack"><div className="row wrap"><Input aria-label={t('schedule.search')} placeholder={t('schedule.search')} value={search} onChange={e => setSearch(e.target.value)} />{[['teacher', teacher, setTeacher, teachers.map(x => [x.id, x.display_name])], ['modality', modality, setModality, modalities.map(x => [x.id, modalityName(x.id)])], ['room', room, setRoom, rooms.map(x => [x.id, x.name])]] .map(([key, value, change, options]) => <label key={String(key)}>{t(`schedule.${key}`)}<Select value={String(value)} onChange={e => (change as (s: string) => void)(e.target.value)}><option value="">{t('schedule.all')}</option>{(options as string[][]).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select></label>)}<label>{t('schedule.status')}<Select value={status} onChange={e => setStatus(e.target.value)}><option value="">{t('schedule.all')}</option>{['scheduled', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{t(`schedule.${s}`)}</option>)}</Select></label></div><div className="row wrap" role="group" aria-label={t('schedule.views')}>{['calendar', 'list', 'table'].map(v => <Button key={v} variant={view === v ? 'primary' : 'secondary'} aria-pressed={view === v} onClick={() => setView(v)}>{t(`schedule.${v}`)}</Button>)}</div></div>,
 sessions: () => loading ? <EmptyState title={t('core.common.loading')} /> : !rows.length ? <EmptyState title={t('schedule.empty')} /> : view === 'calendar' ? <SessionCalendar allowUnavailable sessions={rows.map(session => ({ session, modality: modalities.find(x => x.id === session.modality_id), teacher: teachers.find(x => x.id === session.teacher_id) }))} onPick={setSelected} /> : view === 'list' ? <div className="stack">{rows.map(s => <Card key={s.id} title={s.title} eyebrow={formatDateTime(s.starts_at, lang)} actions={<Button onClick={() => setSelected(s)}>{t('schedule.open')}</Button>}><p>{teacherName(s.teacher_id)} · {modalityName(s.modality_id)} · {roomName(s.room_id)}</p><p className="small muted">{s.booked_count} / {s.capacity} · {t(`schedule.${s.status}`)}{inactive(s) ? ` · ${t('schedule.inactive')}` : ''}</p></Card>)}</div> : <DataTable rows={rows} rowKey={s => s.id} onRowClick={setSelected} columns={[
 { key: 'starts_at', label: t('schedule.when'), render: s => formatDateTime(s.starts_at, lang) }, { key: 'title', label: t('schedule.class') }, { key: 'teacher_id', label: t('schedule.teacher'), render: s => teacherName(s.teacher_id) }, { key: 'modality_id', label: t('schedule.modality'), render: s => modalityName(s.modality_id) }, { key: 'room_id', label: t('schedule.room'), render: s => roomName(s.room_id) }, { key: 'capacity', label: t('schedule.capacity'), render: s => `${s.booked_count} / ${s.capacity}` }, { key: 'status', label: t('schedule.status'), render: s => `${t(`schedule.${s.status}`)}${inactive(s) ? ` · ${t('schedule.inactive')}` : ''}` },
 ]} />,
 };
 return <div className="stack"><div className="page-head"><div><h1>{t('schedule.title')}</h1><p className="muted">{t('schedule.subtitle')}</p></div></div>{sections.filter(isVisible).map(key => <Fragment key={key}>{contents[key]?.()}</Fragment>)}<Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.title}>{selected && <SessionEditor key={selected.id} session={selected} teachers={teachers} modalities={modalities} rooms={rooms} />}</Drawer></div>;
}

function SessionEditor({ session, teachers, modalities, rooms }: { session: ClassSessionRow; teachers: TeacherRow[]; modalities: ModalityRow[]; rooms: RoomRow[] }) {
 const { t, bi, lang } = useI18n(), data = useData();
 const { role, user } = useSession();
 const { rows: templates } = useTable<BaseRow>('class_templates');
 const [draft, setDraft] = useState({ teacher_id: session.teacher_id, modality_id: session.modality_id, room_id: session.room_id, capacity: session.capacity, theme_override: session.theme_override ?? null as Bi | null, description_override: session.description_override ?? null as Bi | null });
 const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
 const [before, setBefore] = useState(session);
 const resolved = resolveSessionEditorial(draft, templates.find(x => x.id === session.template_id), modalities.find(x => x.id === draft.modality_id));
 const readOnly = session.status !== 'scheduled' || new Date(session.starts_at).getTime() <= Date.now();
 const save = async () => {
  if (busy || readOnly) return;
  setBusy(true); setMessage('');
  try {
   if (!data.editSession) throw new Error('not_connected');
   const saved = await data.editSession({ before, patch: draft, role, actorId: user.id });
   setBefore(saved);
   setMessage('schedule.saved');
  } catch { setMessage('schedule.error'); } finally { setBusy(false); }
 };
 return <div className="stack"><p>{formatDateTime(session.starts_at, lang)}</p><strong>{t('schedule.occurrence')}</strong><p className="muted small">{t('schedule.scope')}</p>{readOnly && <p>{t('schedule.history')}</p>}{(['teacher_id', 'modality_id', 'room_id'] as const).map(key => <Field key={key} label={t(`schedule.${key.split('_')[0]}`)}>{id => <Select id={id} value={draft[key]} disabled={readOnly || busy} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}>{(key === 'teacher_id' ? teachers.map(x => ({ id: x.id, name: x.display_name, active: x.active })) : key === 'modality_id' ? modalities.map(x => ({ id: x.id, name: bi({ es: x.name_es, en: x.name_en }), active: x.active })) : rooms.map(x => ({ id: x.id, name: x.name, active: true }))).map(x => <option key={x.id} value={x.id} disabled={!x.active}>{x.name}</option>)}</Select>}</Field>)}<Field label={t('schedule.capacity')}>{id => <Input id={id} type="number" min={Math.max(1, session.booked_count)} max={Math.min(rooms.find(r => r.id === draft.room_id)?.capacity ?? 0, draft.room_id === 'room_main' ? tenant.studio.mats : Infinity)} value={draft.capacity} disabled={readOnly || busy} onChange={e => setDraft(d => ({ ...d, capacity: Number(e.target.value) }))} />}</Field>{(['theme_override', 'description_override'] as const).map(key => <div key={key} className="stack-sm"><BiField label={t(key === 'theme_override' ? 'schedule.theme' : 'schedule.description')} value={draft[key] ?? resolved[key === 'theme_override' ? 'theme' : 'description']} disabled={readOnly || busy} onChange={value => setDraft(d => ({ ...d, [key]: value }))} hint={t(draft[key] == null ? 'schedule.inherited' : 'schedule.overridden')} /><Button variant="ghost" disabled={readOnly || busy || draft[key] == null} onClick={() => setDraft(d => ({ ...d, [key]: null }))}>{t('schedule.resetDefault')}</Button></div>)}<Card tone="muted" title={t('schedule.bookingPreview')}><strong>{bi(resolved.theme)}</strong><p>{bi(resolved.description)}</p></Card>{!readOnly && <Button disabled={!data.editSession} loading={busy} onClick={save}>{t('core.common.save')}</Button>}{message && <p role="status">{t(message)}</p>}<ClassPayRulesPanel sessionId={session.id} templateId={session.template_id} sessionDate={session.starts_at} /><div className="row wrap">{(['teachers', 'modalities', 'rooms'] as const).map(e => <Link key={e} to={`/admin/content?entity=${e}&row=${session[e === 'teachers' ? 'teacher_id' : e === 'modalities' ? 'modality_id' : 'room_id']}`}>{t(`admin.content.tab.${e}`)}</Link>)}{session.template_id && <Link to={`/admin/content?entity=class_templates&row=${session.template_id}`}>{t('schedule.templates')}</Link>}</div></div>;
}


export function ClassPayPage() {
 const { t } = useI18n();
 const { rows } = useTable<BaseRow>('class_templates');
 const [templateId, setTemplateId] = useState('');
 return <div className="stack"><h1>{t('schedule.payNav')}</h1><p>{t('schedule.paySelect')}</p><Field label={t('schedule.templates')}>{id => <Select id={id} value={templateId} onChange={e => setTemplateId(e.target.value)}><option value="">—</option>{rows.map(row => <option key={row.id} value={row.id}>{String(row.title)}</option>)}</Select>}</Field>{templateId && <ClassPayRulesPanel templateId={templateId} />}</div>;
}
