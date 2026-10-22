import { formatDate } from '../../i18n/format';
// Editing the manual from the app (0031): a section marked `{{editable:owner|coordinator}}` can be rewritten
// by that role and up, and since 0050 admin and super admin rewrite any section (canEditSection); the edit is stored beside the markdown (manual_overrides), shown in place with a badge,
// a "see original" toggle, a history and "restore original". `{{studio:<key>}}` text policies edit inline;
// M-08 policies link to Settings. Any team member can request a change; an agent can suggest an edit.
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import type { ManualOverrideRow, ManualRequestRow, StudioPolicyRow } from '../../data/schema';
import { Badge } from '../../components/atom/Badge/Badge';
import { Button } from '../../components/atom/Button/Button';
import { Icon } from '../../components/atom/Icon/Icon';
import { Input, Select } from '../../components/atom/Input/Input';
import { Placeholder } from '../../components/atom/Placeholder/Placeholder';
import { MarkdownEditor } from '../../components/molecule/MarkdownEditor/MarkdownEditor';
import { LiveBlock, policyField } from '../../components/organism/LiveBlock/LiveBlock';
import { toast } from '../../app/toast';
import { canEditLevel, canEditSection, isLead, isOwner, isTeam, useNames, useOverrideWrites, useRequestWrites, useRequests, useStudioPolicies, useStudioPolicyWrite } from './manualData';
import { chapterFor, type Chapter } from './manualIndex';
import type { Section } from './sections';
import { useRoleName } from './lms';

const shortDate = (iso: string, lang: string) => formatDate(iso, lang === 'en' ? 'en' : 'es', { day: 'numeric', month: 'short', year: 'numeric' });

export interface OverrideAccess {
  liveOf: (heading: string) => ManualOverrideRow | undefined;
  historyOf: (heading: string) => ManualOverrideRow[];
  suggestionsOf: (heading: string) => ManualOverrideRow[];
}

/** One `##` section of a chapter: the override (if any) in place of the source, with the editing controls. */
export function SectionBlock({ chapter, section, overrides, render }: { chapter: Chapter; section: Section; overrides: OverrideAccess; render: (md: string) => ReactNode }) {
  const { t, lang } = useI18n();
  const roleName = useRoleName();
  const names = useNames();
  const { role } = useSession();
  const { save, restore, decide } = useOverrideWrites();
  const live = section.heading ? overrides.liveOf(section.heading) : undefined;
  const history = section.heading ? overrides.historyOf(section.heading) : [];
  const suggestions = section.heading ? overrides.suggestionsOf(section.heading) : [];
  const level = section.editable;
  // 0050: admin and super admin edit any `##` section in place; coordination only the ones marked for it.
  const canEdit = canEditSection(role, section);
  const canDecide = canEdit || isOwner(role);
  const body = live ? live.body_md : section.body;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<'none' | 'history' | 'suggestions'>('none');

  const start = () => { setDraft(body); setNote(''); setEditing(true); };
  const onSave = async () => {
    setBusy(true);
    try { await save(chapter.slug, chapter.lang, section.heading, draft, note.trim() || null); setEditing(false); toast(t('manual.edit.saved'), 'success'); }
    finally { setBusy(false); }
  };
  const onRestore = async () => { await restore(chapter.slug, chapter.lang, section.heading); toast(t('manual.edit.restored'), 'success'); };

  const tools = section.heading && isTeam(role) && (level || canEdit || suggestions.length > 0 || history.length > 0);
  return (
    <div className={`manual-section ${level ? 'is-editable' : ''} ${canEdit && !level ? 'is-admin-editable' : ''} ${live ? 'is-overridden' : ''}`} data-section={section.heading || undefined}>
      {section.headingLine && render(section.headingLine)}
      {tools && (
        <div className="manual-section-tools">
          {level && <span className="manual-editable-tag" title={t('manual.edit.levelHint')}><Icon name="layers" size={14} />{t(`manual.edit.level.${level}`)}</span>}
          {live && (
            <span className="manual-edited">
              {t('manual.edit.badge', { name: names(live.edited_by), date: shortDate(live.updated_at, lang) })}
            </span>
          )}
          <span className="grow" />
          {canDecide && suggestions.length > 0 && <Button size="md" variant="secondary" onClick={() => setPanel(panel === 'suggestions' ? 'none' : 'suggestions')} aria-expanded={panel === 'suggestions'}>{t('manual.edit.suggestions', { n: suggestions.length })}</Button>}
          {history.length > 0 && (canEdit || live) && <Button size="md" variant="ghost" onClick={() => setPanel(panel === 'history' ? 'none' : 'history')} aria-expanded={panel === 'history'}>{t('manual.edit.history', { n: history.length })}</Button>}
          {canEdit && live && !editing && <Button size="md" variant="ghost" onClick={onRestore}>{t('manual.edit.restore')}</Button>}
          {canEdit && !editing && <Button size="md" variant="secondary" icon="edit" onClick={start} title={level ? t('manual.edit.levelHint') : t('manual.edit.adminHint')}>{t('manual.edit.edit')}</Button>}
        </div>
      )}
      {panel === 'suggestions' && (
        <div className="manual-panel" role="region" aria-label={t('manual.edit.suggestions', { n: suggestions.length })}>
          {suggestions.map((s) => (
            <div key={s.id} className="manual-suggestion">
              <div className="xs muted">{t('manual.edit.suggestedBy', { name: names(s.edited_by), date: shortDate(s.created_at, lang) })}{s.note ? ` · ${s.note}` : ''}</div>
              <div className="manual-suggestion-body">{render(s.body_md)}</div>
              <div className="row wrap">
                <Button size="md" onClick={() => decide(s, true)} disabled={!canEdit && role !== 'admin' && role !== 'super_admin'}>{t('manual.edit.accept')}</Button>
                <Button size="md" variant="ghost" onClick={() => decide(s, false)}>{t('manual.edit.dismiss')}</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {panel === 'history' && (
        <div className="manual-panel" role="region" aria-label={t('manual.edit.history', { n: history.length })}>
          <ol className="manual-history">
            {[...history].reverse().map((h) => (
              <li key={h.id}>
                <details>
                  <summary><span className="mono">v{h.version}</span> <Badge tone={h.status === 'live' ? 'success' : h.status === 'suggested' ? 'primary' : 'neutral'}>{t(`manual.edit.status.${h.status}`)}</Badge> {names(h.edited_by)} · {shortDate(h.created_at, lang)}{h.note ? ` · ${h.note}` : ''}</summary>
                  <div className="manual-history-body">{render(h.body_md)}</div>
                </details>
              </li>
            ))}
          </ol>
        </div>
      )}
      {editing ? (
        <div className="manual-editor">
          <MarkdownEditor
            value={draft} onChange={setDraft}
            editLabel={t('manual.edit.editLabel', { section: section.heading, lang: chapter.lang.toUpperCase() })}
            previewLabel={t('manual.edit.preview')} emptyPreview={t('manual.edit.empty')} rows={14}
            renderPreview={(md) => render(md)}
          />
          <label className="manual-editor-note">
            <span className="eyebrow">{t('manual.edit.note')}</span>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('manual.edit.notePh')} />
          </label>
          <div className="row wrap">
            <Button onClick={onSave} loading={busy} disabled={!draft.trim()}>{t('manual.edit.save')}</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>{t('manual.edit.cancel')}</Button>
            <span className="grow" />
            <Placeholder what={t('manual.edit.ai')}><span className="manual-ai-wrap" title={t('manual.edit.aiHint')}><Button variant="secondary" icon={<Icon name="sparkle" size={16} />}>{t('manual.edit.ai')}</Button></span></Placeholder>
          </div>
          <p className="xs muted">{t('manual.edit.foot', { role: roleName(role) })}</p>
        </div>
      ) : (
        <>
          {render(body)}
          {live && (
            <details className="manual-original">
              <summary>{t('manual.edit.original')}</summary>
              {render(section.body)}
            </details>
          )}
        </>
      )}
    </div>
  );
}

/** `{{studio:<key>}}` — a text policy from `studio_policies`, editable inline by its level; an M-08 key links to Settings. */
export function StudioValue({ policyKey }: { policyKey?: string }) {
  const { t, lang, bi } = useI18n();
  const { role } = useSession();
  const names = useNames();
  const { rows, byKey } = useStudioPolicies();
  const write = useStudioPolicyWrite();
  const row = policyKey ? byKey(policyKey) : undefined;
  const [edit, setEdit] = useState<{ es: string; en: string }>();
  const m08 = policyKey ? policyField(policyKey) : undefined;
  if (m08 && policyKey) return <PolicyWithNote field={policyKey} />;
  if (!row) {
    return <div className="live live-unknown"><p><code>{`{{studio${policyKey ? `:${policyKey}` : ''}}}`}</code> {t('manual.live.unknown')}</p><p className="muted small">{t('manual.live.available')} {rows.map((r) => r.key).join(', ')}</p></div>;
  }
  const allowed = canEditLevel(role, row.editable_by);
  const save = async (r: StudioPolicyRow) => { if (!edit) return; await write(r, edit.es, edit.en); setEdit(undefined); toast(t('manual.policy.saved'), 'success'); };
  return (
    <section className="live manual-studio" aria-label={bi(row.label)}>
      <header className="live-head">
        <div className="grow"><div className="eyebrow">{t('manual.policy.eyebrow')}</div><h4 className="live-title">{bi(row.label)}</h4></div>
        {allowed && !edit && <button type="button" className="manual-pencil" onClick={() => setEdit({ es: row.value_es, en: row.value_en })} aria-label={t('manual.policy.edit', { label: bi(row.label) })} title={t('manual.policy.edit', { label: bi(row.label) })}><Icon name="edit" size={18} /></button>}
      </header>
      <div className="live-body">
        {edit ? (
          <div className="manual-studio-edit">
            <label><span className="eyebrow">ES</span><Input value={edit.es} onChange={(e) => setEdit({ ...edit, es: e.target.value })} /></label>
            <label><span className="eyebrow">EN</span><Input value={edit.en} onChange={(e) => setEdit({ ...edit, en: e.target.value })} /></label>
            <div className="row wrap"><Button onClick={() => save(row)} disabled={!edit.es.trim()}>{t('manual.edit.save')}</Button><Button variant="ghost" onClick={() => setEdit(undefined)}>{t('manual.edit.cancel')}</Button></div>
          </div>
        ) : (
          <p className="live-big manual-studio-value">{lang === 'en' ? row.value_en || row.value_es : row.value_es}</p>
        )}
      </div>
      <footer className="live-foot">
        <span>{t(`manual.edit.level.${row.editable_by}`)}{row.updated_by ? ` · ${t('manual.policy.updatedBy', { name: names(row.updated_by), date: shortDate(row.updated_at, lang) })}` : ''}</span>
        <span className="live-source">studio_policies · {row.key}</span>
      </footer>
    </section>
  );
}

/** `{{policy:…}}` in the manual: the live M-08 value, and for an editor a pencil that points to Settings. */
export function PolicyWithNote({ field }: { field?: string }) {
  const { t } = useI18n();
  const { role, can } = useSession();
  const [open, setOpen] = useState(false);
  const pf = field ? policyField(field) : undefined;
  const editor = can('settings.write') || (role === 'coordinator' && !pf?.payroll);
  return (
    <div className="manual-policy">
      <LiveBlock kind="policy" arg={field} />
      {editor && (
        <div className="manual-policy-edit">
          <Button size="md" variant="ghost" icon="edit" onClick={() => setOpen(!open)} aria-expanded={open}>{t('manual.policy.m08Edit')}</Button>
          {open && <p className="small">{t(pf?.payroll ? 'manual.policy.m08c' : 'manual.policy.m08a')} <Link to={pf?.payroll ? '/admin/settings/payments' : '/admin/settings'}>{t('manual.policy.go')} →</Link></p>}
        </div>
      )}
    </div>
  );
}

/** "Pedir un cambio" — any team member asks for a change to this chapter (optionally one section). */
export function RequestBox({ chapter, headings }: { chapter: Chapter; headings: string[] }) {
  const { t, lang } = useI18n();
  const { user, role } = useSession();
  const { add } = useRequestWrites();
  const mine = useRequests(chapter.slug).filter((r) => r.requested_by === user.id);
  const [text, setText] = useState('');
  const [section, setSection] = useState('');
  const [busy, setBusy] = useState(false);
  if (!isTeam(role)) return null;
  const send = async () => {
    setBusy(true);
    try { await add(chapter.slug, chapter.lang, text.trim(), section || null); setText(''); setSection(''); toast(t('manual.req.sent'), 'success'); }
    finally { setBusy(false); }
  };
  return (
    <section className="manual-request" aria-labelledby="manual-req-title">
      <h2 id="manual-req-title" className="manual-h3">{t('manual.req.title')}</h2>
      <p className="small muted">{t('manual.req.lead')}</p>
      {isOwner(role) && <p className="small muted">{t('manual.req.adminLead')}</p>}
      {isLead(role) && <Link className="manual-request-see small" to="/manual/decisions">{t('manual.req.see')} →</Link>}
      <div className="manual-request-form">
        <label>
          <span className="eyebrow">{t('manual.req.section')}</span>
          <Select value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">{t('manual.req.whole')}</option>
            {headings.map((h) => <option key={h} value={h}>{h}</option>)}
          </Select>
        </label>
        <label className="manual-request-text">
          <span className="eyebrow">{t('manual.req.what')}</span>
          <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('manual.req.ph')} />
        </label>
        <div className="row wrap"><Button onClick={send} loading={busy} disabled={text.trim().length < 5}>{t('manual.req.send')}</Button><span className="xs muted">{t('manual.req.agent')}</span></div>
      </div>
      {mine.length > 0 && (
        <ul className="manual-request-mine">
          {mine.map((r) => (
            <li key={r.id}>
              <Badge tone={r.status === 'open' ? 'warn' : r.status === 'done' ? 'success' : 'neutral'}>{t(`manual.req.status.${r.status}`)}</Badge>
              <span className="small">{r.request}</span>
              {r.answer && <span className="small muted">→ {r.answer}</span>}
              <span className="xs muted">{shortDate(r.created_at, lang)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** K-04: the open change requests for coordination and the owner, with an answer box. */
export function RequestsPanel() {
  const { t, lang } = useI18n();
  const { role } = useSession();
  const names = useNames();
  const all = useRequests();
  const { answer } = useRequestWrites();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const open = useMemo(() => all.filter((r) => r.status === 'open'), [all]);
  const closed = useMemo(() => all.filter((r) => r.status !== 'open'), [all]);
  if (!isLead(role)) return <p className="small muted">{t('manual.req.leadOnly')}</p>;
  const title = (r: ManualRequestRow) => chapterFor(lang, r.chapter_slug)?.chapter;
  const row = (r: ManualRequestRow, editable: boolean) => {
    const c = title(r);
    return (
      <li key={r.id} className="manual-reqrow">
        <div className="manual-reqrow-head">
          <Badge tone={r.status === 'open' ? 'warn' : r.status === 'done' ? 'success' : 'neutral'}>{t(`manual.req.status.${r.status}`)}</Badge>
          <Link to={`/manual/${r.chapter_slug}`}><span className="manual-num">{c?.number ?? '??'}</span>{c?.title ?? r.chapter_slug}</Link>
          {r.section_heading && <span className="small muted">· {r.section_heading}</span>}
        </div>
        <p className="manual-reqrow-text">{r.request}</p>
        <div className="xs muted">{t('manual.req.by', { name: names(r.requested_by), date: shortDate(r.created_at, lang) })}</div>
        {editable ? (
          <div className="manual-reqrow-answer">
            <Input aria-label={t('manual.req.answer')} placeholder={t('manual.req.answerPh')} value={answers[r.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [r.id]: e.target.value })} />
            <Button onClick={() => answer(r.id, answers[r.id]?.trim() || null, 'done')}>{t('manual.req.done')}</Button>
            <Button variant="ghost" onClick={() => answer(r.id, answers[r.id]?.trim() || null, 'dismissed')}>{t('manual.req.dismiss')}</Button>
          </div>
        ) : r.answer ? <p className="small">→ {r.answer}</p> : null}
      </li>
    );
  };
  return (
    <div className="manual-requests">
      {open.length === 0 && <p className="muted">{t('manual.req.none')}</p>}
      <ul className="manual-reqlist">{open.map((r) => row(r, true))}</ul>
      {closed.length > 0 && (
        <details className="manual-reqclosed">
          <summary>{t('manual.req.closed', { n: closed.length })}</summary>
          <ul className="manual-reqlist">{closed.map((r) => row(r, false))}</ul>
        </details>
      )}
    </div>
  );
}
