import { MediaLibrary } from '../../components/organism/MediaLibrary/MediaLibrary';
import { buildMediaLibrary } from '../../data/mediaLibrary';
import type { TeacherRow, ModalityRow, EventRow } from '../../data/schema';
import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useTable } from '../../data/DataContext';
import type { MediaAssetRow } from '../../data/schema';
import type { Bi } from '../../specs/types';
import { Card } from '../../components/molecule/Card/Card';
import { Input, Select } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { Field } from '../../components/molecule/Field/Field';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { BiField, ContentHead, useContentEditing } from './contentNav';
import './admin.css';

const KINDS = ['photo', 'video', 'illustration'] as const;
const RATIOS = ['21 / 9', '16 / 9', '4 / 3', '1 / 1', '4 / 5', '3 / 4'] as const;

/**
 * M-02d — the media library. Every slot the app and the site can show art in is a row, so the owner
 * reads it as a checklist: what is still owed, in which ratio, with which brief. Paste a URL, press
 * save and the photo appears everywhere that slot is used, with no deploy.
 */
export function MediaPage() {
  const { t, bi } = useI18n();
  const { data, audit, canWrite } = useContentEditing();
  const { rows, loading } = useTable<MediaAssetRow>('media_assets', { orderBy: { column: 'sort' } });
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const { rows: events } = useTable<EventRow>('events');
  const [view, setView] = useState<'catalog' | 'slots'>('catalog');
  const [filter, setFilter] = useState<'all' | MediaAssetRow['status']>('all');
  const ready = rows.filter((r) => r.status === 'ready');
  const shown = rows.filter((r) => filter === 'all' || r.status === filter);

  const add = async () => {
    const body: Partial<MediaAssetRow> = {
      slot_key: '', kind: 'photo', ratio: '16 / 9', label: { es: '', en: '' }, alt: { es: '', en: '' },
      brief: { es: '', en: '' }, tone: null, url: null, credit: null, status: 'pending',
      sort: Math.max(0, ...rows.map((r) => r.sort)) + 10,
    };
    const created = await data.insert<MediaAssetRow>('media_assets', body);
    await audit('media.create', 'media_assets', created.id, { after: body });
  };

  return (
    <div className="stack">
      <ContentHead current="media" title={t('admin.media.title')} subtitle={t('media.library.subtitle')}
        actions={canWrite && view === 'slots' ? <Button size="sm" onClick={add}>{t('admin.media.add')}</Button> : undefined} />

      <p className="small muted">{t('media.library.demo')}</p>
      <div className="row wrap">{(['catalog','slots'] as const).map(v=><Button key={v} variant={view===v?'primary':'ghost'} onClick={()=>setView(v)} aria-pressed={view===v}>{t(`media.library.${v}`)}</Button>)}</div>
      {view==='catalog' ? <MediaLibrary assets={buildMediaLibrary(rows, teachers, modalities, events)} /> : <>
      <div className="grid grid-3">
        <StatTile label={t('admin.media.kpi.ready')} value={`${ready.length} / ${rows.length}`} hint={t('admin.media.kpi.ready.hint')} trend={ready.length === rows.length ? 'up' : 'flat'} />
        <StatTile label={t('admin.media.kpi.pending')} value={rows.length - ready.length} hint={t('admin.media.kpi.pending.hint')} />
        <StatTile label={t('admin.media.kpi.video')} value={rows.filter((r) => r.kind === 'video').length} hint={t('admin.media.kpi.video.hint')} />
      </div>

      <div className="row wrap" role="tablist" aria-label={t('admin.media.title')}>
        {(['all', 'pending', 'ready'] as const).map((f) => <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? t('admin.articles.filter.all') : t(`admin.media.status.${f}`)}</Chip>)}
        <span className="xs muted">{t('admin.media.note')}</span>
      </div>

      {loading && rows.length === 0 && <EmptyState tone="loading" title={t('core.common.loading')} />}
      {!loading && rows.length === 0 && <EmptyState title={t('admin.media.empty')} body={t('admin.media.empty.body')} action={canWrite && <Button size="sm" onClick={add}>{t('admin.media.add')}</Button>} />}

      <div className="adm-media">
        {shown.map((asset) => (
          <MediaCard key={asset.id} asset={asset} readOnly={!canWrite} bi={bi}
            onSave={async (patch) => {
              await data.update('media_assets', asset.id, patch);
              await audit('media.update', 'media_assets', asset.id, { before: Object.fromEntries(Object.keys(patch).map((k) => [k, asset[k]])), after: patch });
            }}
            onRemove={async () => {
              if (!confirm(t('admin.content.deleteConfirm'))) return;
              await data.remove('media_assets', asset.id);
              await audit('media.delete', 'media_assets', asset.id, { before: { slot_key: asset.slot_key } });
            }} />
        ))}
      </div>
      </>}
    </div>
  );
}

interface MediaDraft extends Record<string, unknown> { slot_key: string; kind: MediaAssetRow['kind']; ratio: string; label: Bi; alt: Bi; brief: Bi; url: string | null; credit: string | null; status: MediaAssetRow['status'] }
const pick = (a: MediaAssetRow): MediaDraft => ({ slot_key: a.slot_key, kind: a.kind, ratio: a.ratio, label: a.label, alt: a.alt, brief: a.brief, url: a.url ?? null, credit: a.credit ?? null, status: a.status });

function MediaCard({ asset, readOnly, bi, onSave, onRemove }: { asset: MediaAssetRow; readOnly: boolean; bi: (v: Bi) => string; onSave: (patch: Partial<MediaAssetRow>) => Promise<void>; onRemove: () => Promise<void> }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(() => pick(asset));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(pick(asset)); }, [asset.id, asset.updated_at]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(pick(asset));
  const set = <K extends keyof MediaDraft>(k: K, v: MediaDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const urlBad = !!draft.url && !/^(https?:\/\/|\.\/|\/)/.test(draft.url);
  const canBeReady = !!draft.url && !urlBad;
  const save = async (patch: Partial<MediaAssetRow>) => { setSaving(true); try { await onSave(patch); } finally { setSaving(false); } };

  return (
    <Card padding="sm" tone={asset.status === 'ready' ? 'surface' : 'muted'}
      eyebrow={<span className="mono xs">{asset.slot_key || t('admin.media.noKey')}</span>}
      title={bi(asset.label) || t('admin.media.untitled')}
      actions={<Badge tone={asset.status === 'ready' ? 'success' : 'warn'}>{t(`admin.media.status.${asset.status}`)}</Badge>}>
      <div className={`adm-media-frame ${asset.tone ? `adm-tone-${asset.tone}` : ''}`} style={{ aspectRatio: draft.ratio }}>
        {asset.status === 'ready' && asset.url
          ? (asset.kind === 'video' ? <video src={asset.url} controls playsInline /> : <img src={asset.url} alt={bi(asset.alt)} loading="lazy" />)
          : <span className="adm-media-ratio">{draft.ratio.replace(/\s/g, '')}</span>}
      </div>
      <div className="row wrap" style={{ marginTop: 'var(--sp-sm)' }}>
        <Chip>{t(`admin.media.kind.${asset.kind}`)}</Chip>
        <Chip>{draft.ratio.replace(/\s/g, '')}</Chip>
        {asset.tone && <Chip tone={asset.tone} dot>{asset.tone}</Chip>}
      </div>
      <p className="xs muted" style={{ marginTop: 'var(--sp-sm)' }}>{bi(asset.brief) || t('admin.media.noBrief')}</p>

      <div className="stack-sm" style={{ marginTop: 'var(--sp-sm)' }}>
        <Field label={t('admin.media.url')} error={urlBad ? t('admin.media.url.bad') : undefined} hint={t('admin.media.url.hint')}>
          {(id) => <Input id={id} disabled={readOnly} value={draft.url ?? ''} placeholder="https://…" onChange={(e) => set('url', e.target.value || null)} />}
        </Field>
        <div className="row wrap">
          {!readOnly && <Button size="sm" disabled={!dirty || urlBad} loading={saving} onClick={() => save(draft)}>{t('core.common.save')}</Button>}
          {!readOnly && asset.status === 'pending' && <Button size="sm" variant="ghost" disabled={!canBeReady} onClick={() => save({ ...draft, status: 'ready' })}>{t('admin.media.markReady')}</Button>}
          {!readOnly && asset.status === 'ready' && <Button size="sm" variant="ghost" onClick={() => save({ status: 'pending' })}>{t('admin.media.markPending')}</Button>}
          <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>{t(open ? 'admin.media.less' : 'admin.media.more')}</Button>
        </div>
      </div>

      {open && (
        <div className="stack-sm" style={{ marginTop: 'var(--sp-md)' }}>
          <div className="grid grid-2">
            <Field label={t('admin.media.slotKey')} hint={t('admin.media.slotKey.hint')}>
              {(id) => <Input id={id} disabled={readOnly} value={draft.slot_key} onChange={(e) => set('slot_key', e.target.value.trim())} />}
            </Field>
            <Field label={t('admin.media.ratio')}>
              {(id) => <Select id={id} disabled={readOnly} value={draft.ratio} onChange={(e) => set('ratio', e.target.value)}>{RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}</Select>}
            </Field>
          </div>
          <div className="grid grid-2">
            <Field label={t('admin.media.kindField')}>
              {(id) => <Select id={id} disabled={readOnly} value={draft.kind} onChange={(e) => set('kind', e.target.value as MediaDraft['kind'])}>{KINDS.map((k) => <option key={k} value={k}>{t(`admin.media.kind.${k}`)}</option>)}</Select>}
            </Field>
            <Field label={t('admin.media.credit')} hint={t('admin.media.credit.hint')}>
              {(id) => <Input id={id} disabled={readOnly} value={draft.credit ?? ''} onChange={(e) => set('credit', e.target.value || null)} />}
            </Field>
          </div>
          <BiField label={t('admin.media.label')} value={draft.label} onChange={(v) => set('label', v)} disabled={readOnly} rows={1} />
          <BiField label={t('admin.media.alt')} value={draft.alt} onChange={(v) => set('alt', v)} disabled={readOnly} rows={2} hint={t('admin.media.alt.hint')} />
          <BiField label={t('admin.media.brief')} value={draft.brief} onChange={(v) => set('brief', v)} disabled={readOnly} rows={4} />
          {!readOnly && <div className="row-between wrap"><Button size="sm" variant="danger" onClick={onRemove}>{t('core.common.delete')}</Button><Button size="sm" disabled={!dirty || urlBad} loading={saving} onClick={() => save(draft)}>{t('core.common.save')}</Button></div>}
        </div>
      )}
    </Card>
  );
}
