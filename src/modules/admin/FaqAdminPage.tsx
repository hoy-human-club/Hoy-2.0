import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useTable } from '../../data/DataContext';
import type { FaqEntryRow } from '../../data/schema';
import type { Bi } from '../../specs/types';
import { Card } from '../../components/molecule/Card/Card';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { Input, Select } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Field } from '../../components/molecule/Field/Field';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { BiField, ContentHead, useContentEditing } from './contentNav';
import './admin.css';
import { useSession } from '../../auth/SessionProvider';
import { writeContent } from './contentRecovery';
import { useContentRecovery } from './useContentRecovery';

interface Group { key: string; title: Bi; lead: Bi; page: number; entries: FaqEntryRow[] }

/**
 * M-02b — the FAQ editor. Sections come from the rows themselves (`group_key`), order is `sort` and
 * moves one step at a time: no drag-and-drop, because two buttons are keyboard-reachable, obvious
 * on a phone and impossible to do by accident.
 */
export function FaqAdminPage() {
  const { t, bi } = useI18n();
  const { data, canWrite } = useContentEditing();
  const { user, role } = useSession();
  const recovery = useContentRecovery();
  const write = (intent: Parameters<typeof writeContent>[2], after?: (id: string) => void) => recovery.run(async request => { const id = await writeContent(data, { id: user.id, role }, intent, request); after?.(id); });
  const { rows, loading } = useTable<FaqEntryRow>('faq_entries', { orderBy: { column: 'sort' } });
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState<1 | 2 | 0>(0);
  const row = rows.find((r) => r.id === selected) ?? null;

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, FaqEntryRow[]>();
    for (const r of rows) map.set(r.group_key, [...(map.get(r.group_key) ?? []), r]);
    return [...map.entries()]
      .map(([key, entries]) => {
        const sorted = [...entries].sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
        return { key, title: sorted[0].group_title, lead: sorted[0].group_lead, page: sorted[0].page, entries: sorted };
      })
      .filter((g) => page === 0 || g.page === page)
      .sort((a, b) => a.page - b.page || a.key.localeCompare(b.key));
  }, [rows, page]);

  const swap = (group: Group, index: number, dir: -1 | 1) => write({ kind: 'reorder', table: 'faq_entries', entries: group.entries, id: group.entries[index].id, dir });
  const togglePublished = (r: FaqEntryRow) => write({ kind: 'update', table: 'faq_entries', before: r, patch: { published: !r.published } });
  const addEntry = async (group?: Group) => {
    const g = group ?? groups[0];
    const nextKey = g?.key ?? `s${rows.length + 1}`;
    const body: Partial<FaqEntryRow> = {
      group_key: nextKey,
      group_title: g?.title ?? { es: 'Sección nueva', en: 'New section' },
      group_lead: g?.lead ?? { es: '', en: '' },
      page: g?.page ?? 1,
      question: { es: '', en: '' }, answer: { es: '', en: '' },
      sort: (g ? Math.max(...g.entries.map((e) => e.sort)) : Math.max(0, ...rows.map((r) => r.sort))) + 1,
      published: false,
    };
    await write({ kind: 'create', table: 'faq_entries', patch: body }, setSelected);
  };
  const addGroup = async () => {
    let n = 1; while (rows.some(r => r.group_key === `s${n}`)) n++;
    const body: Partial<FaqEntryRow> = {
      group_key: `s${n}`, group_title: { es: `Sección ${n}`, en: `Section ${n}` }, group_lead: { es: '', en: '' },
      page: 1, question: { es: '', en: '' }, answer: { es: '', en: '' }, sort: Math.max(0, ...rows.map((r) => r.sort)) + 1, published: false,
    };
    await write({ kind: 'create', table: 'faq_entries', patch: body }, setSelected);
  };
  const remove = async (r: FaqEntryRow) => {
    if (!confirm(t('admin.content.deleteConfirm'))) return;
    await write({ kind: 'delete', table: 'faq_entries', before: r }, () => setSelected(null));
  };

  return (
    <div className="stack">
      <ContentHead current="faq" title={t('admin.faq.title')} subtitle={t('admin.faq.subtitle')}
        actions={canWrite ? <>
          <Button size="sm" variant="ghost" disabled={recovery.busy} onClick={addGroup}>{t('admin.faq.addGroup')}</Button>
          <Button size="sm" disabled={recovery.busy} onClick={() => addEntry()}>{t('admin.faq.addEntry')}</Button>
        </> : undefined} />

      {!row && recovery.notice}
      <div className="row wrap" role="tablist" aria-label={t('admin.faq.page')}>
        {([0, 1, 2] as const).map((p) => <Chip key={p} selected={page === p} onClick={() => setPage(p)}>{p === 0 ? t('admin.faq.page.all') : t('admin.faq.page.n', { n: p })}</Chip>)}
        <span className="xs muted">{t('admin.faq.count', { n: rows.length, published: rows.filter((r) => r.published).length })}</span>
      </div>

      {loading && rows.length === 0 && <EmptyState tone="loading" title={t('core.common.loading')} />}
      {!loading && groups.length === 0 && <EmptyState title={t('admin.faq.empty')} body={t('admin.faq.empty.body')} action={canWrite && <Button size="sm" disabled={recovery.busy} onClick={addGroup}>{t('admin.faq.addGroup')}</Button>} />}

      {groups.map((g) => (
        <Card key={g.key} padding="sm" title={bi(g.title) || g.key}
          eyebrow={`${g.key} · ${t('admin.faq.page.n', { n: g.page })}`}
          actions={canWrite ? <Button size="sm" variant="ghost" disabled={recovery.busy} onClick={() => addEntry(g)}>{t('admin.faq.addHere')}</Button> : undefined}>
          {bi(g.lead) && <p className="xs muted">{bi(g.lead)}</p>}
          <div className="adm-lines">
            {g.entries.map((e, i) => (
              <div key={e.id} className="adm-line">
                <span className="adm-faq-move">
                  <Button size="sm" variant="ghost" disabled={recovery.busy || !canWrite || i === 0} onClick={() => swap(g, i, -1)} aria-label={t('admin.faq.up')}>↑</Button>
                  <Button size="sm" variant="ghost" disabled={recovery.busy || !canWrite || i === g.entries.length - 1} onClick={() => swap(g, i, 1)} aria-label={t('admin.faq.down')}>↓</Button>
                </span>
                <button type="button" className="grow adm-faq-q" onClick={() => setSelected(e.id)}>
                  <span className="small">{bi(e.question) || t('admin.faq.untitled')}</span>
                  <span className="xs muted">{(bi(e.answer) || '').slice(0, 90) || t('admin.faq.noAnswer')}</span>
                </button>
                <Badge tone={e.published ? 'success' : 'warn'}>{t(e.published ? 'admin.content.published' : 'admin.content.draft')}</Badge>
                <Toggle size="sm" checked={e.published} disabled={recovery.busy || !canWrite} onChange={() => togglePublished(e)} label={t('admin.content.published')} />
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Drawer open={!!row} onClose={() => setSelected(null)} width={560} title={t('admin.faq.editor')}
        footer={row && canWrite ? <div className="row-between wrap"><Button variant="danger" size="sm" disabled={recovery.busy} onClick={() => remove(row)}>{t('core.common.delete')}</Button><Toggle size="sm" checked={row.published} disabled={recovery.busy} label={t('admin.content.published')} onChange={() => togglePublished(row)} /></div> : undefined}>
        {row && recovery.notice}
        {row && <FaqEditor key={row.id} row={row} readOnly={!canWrite} busy={recovery.busy} onSave={async (patch, basis) => {
          if (!await write({ kind: 'update', table: 'faq_entries', before: basis, patch })) throw Error('content_save_failed');
        }} />}
      </Drawer>
    </div>
  );
}

interface FaqDraft extends Record<string, unknown> { group_key: string; group_title: Bi; group_lead: Bi; page: number; question: Bi; answer: Bi; sort: number }
const pick = (r: FaqEntryRow): FaqDraft => ({ group_key: r.group_key, group_title: r.group_title, group_lead: r.group_lead, page: r.page, question: r.question, answer: r.answer, sort: r.sort });

function FaqEditor({ row, readOnly, busy, onSave }: { row: FaqEntryRow; readOnly: boolean; busy: boolean; onSave: (patch: Partial<FaqEntryRow>, basis: FaqEntryRow) => Promise<void> }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(() => pick(row));
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const basis = useRef(row);
  const dirty = JSON.stringify(draft) !== JSON.stringify(pick(row));
  useEffect(() => { if (!dirty) basis.current = row; }, [row, dirty]);
  const set = <K extends keyof FaqDraft>(k: K, v: FaqDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  return (
    <div className="stack">
      <BiField label={t('admin.faq.question')} value={draft.question} onChange={(v) => set('question', v)} disabled={readOnly || saving || busy} rows={2} />
      <BiField label={t('admin.faq.answer')} value={draft.answer} onChange={(v) => set('answer', v)} disabled={readOnly || saving || busy} rows={5} />
      <div className="grid grid-2">
        <Field label={t('admin.faq.groupKey')} hint={t('admin.faq.groupKey.hint')}>
          {(id) => <Input id={id} disabled={readOnly || saving || busy} value={draft.group_key} onChange={(e) => set('group_key', e.target.value.trim())} />}
        </Field>
        <Field label={t('admin.faq.page')} hint={t('admin.faq.page.hint')}>
          {(id) => <Select id={id} disabled={readOnly || saving || busy} value={String(draft.page)} onChange={(e) => set('page', Number(e.target.value))}>{[1, 2].map((p) => <option key={p} value={p}>{t('admin.faq.page.n', { n: p })}</option>)}</Select>}
        </Field>
      </div>
      <BiField label={t('admin.faq.groupTitle')} value={draft.group_title} onChange={(v) => set('group_title', v)} disabled={readOnly || saving || busy} rows={1} hint={t('admin.faq.groupTitle.hint')} />
      <BiField label={t('admin.faq.groupLead')} value={draft.group_lead} onChange={(v) => set('group_lead', v)} disabled={readOnly || saving || busy} rows={2} />
      {!readOnly && (
        <div className="row-between wrap">
          <span className="xs muted">{dirty ? t('admin.content.unsaved') : t('admin.content.upToDate')}</span>
          <Button size="sm" disabled={!dirty || busy} loading={saving} onClick={async () => { if (saveLock.current || readOnly) return; saveLock.current = true; setSaving(true); try { await onSave(structuredClone(draft), basis.current); } catch { /* Page retains the retry operation and draft. */ } finally { saveLock.current = false; setSaving(false); } }}>{t('core.common.save')}</Button>
        </div>
      )}
    </div>
  );
}
