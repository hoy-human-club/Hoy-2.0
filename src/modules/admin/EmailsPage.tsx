import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useContact , pendingSuffix } from './settings';
import { useSession } from '../../auth/SessionProvider';
import { useData } from '../../data/DataContext';
import type { MessageLogRow, UserRow, ProfileRow } from '../../data/schema';
import type { Bi } from '../../specs/types';
import { formatDateTime } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Badge, toneForStatus } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { EmailPreview } from '../../components/organism/EmailPreview/EmailPreview';
import { DataTable } from '../../components/organism/DataTable/DataTable';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { Notice } from '../../components/molecule/Notice/Notice';
import { useAudit, type AuditRow } from '../staff/audit';
import { APP, EMAIL_AUDIENCES, EMAIL_CATALOG, EMAIL_PRIORITIES, adminNotesFor, emailEntry, sampleFor, type EmailAudience, type EmailPriority } from '../../data/emailCatalog';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { parseEmailBody, type EmailRow, type ParsedBody } from './emailTest';
import { useEmailRows, useEmailTest } from './useEmailTest';
import { useEmailEdit } from './useEmailEdit';
import type { EmailPatch, EmailVersionAudit } from './emailEdit';
import './admin.css';
import './emailTest.css';

const PRIORITY_TONE: Record<EmailPriority, 'primary' | 'highlight' | 'neutral'> = { launch: 'primary', first_60: 'highlight', later: 'neutral' };
/** A row written before 0055 has no audience / priority: the catalog entry with the same key answers. */
const audienceOf = (row: EmailRow): EmailAudience => row.audience ?? emailEntry(row.key)?.audience ?? 'customer';
const priorityOf = (row: EmailRow): EmailPriority | null => row.priority ?? emailEntry(row.key)?.priority ?? null;
/** `name` is the studio's Spanish label; while it is still the catalog's, the English UI shows the catalog's English name. */
const nameOf = (row: EmailRow, bi: (b: Bi) => string) => { const m = emailEntry(row.key); return m && m.name.es === row.name ? bi(m.name) : row.name; };
/** Within a priority the list follows the catalog (the inventory's order); templates the studio added go last. */
const catalogOrder = (row: EmailRow) => { const i = EMAIL_CATALOG.findIndex((m) => m.key === row.key); return i < 0 ? EMAIL_CATALOG.length : i; };

const parseBody=parseEmailBody;
const varsIn = (...texts: string[]) => [...new Set(texts.join(' ').match(/\{\{\s*[\w.]+\s*\}\}/g)?.map((v) => v.replace(/[{}\s]/g, '')) ?? [])];

/** M-04 — template list by recipient and priority, rendered canvas with sample data, ES/EN switch, editor, versions, test send, send log. */
export function EmailsPage() {
  const { t, lang, bi } = useI18n();
  const data = useData();
  const { can, user, role } = useSession();
  const audit = useAudit('admin');
  const context=JSON.stringify([user.id,role]);
  const templateRead=useEmailRows<EmailRow>(data,'email_templates',{where:{tenant_id:tenant.id},orderBy:{column:'trigger'}},context);
  const logRead=useEmailRows<MessageLogRow>(data,'message_log',{where:{tenant_id:tenant.id,channel:'email'},orderBy:{column:'created_at',dir:'desc'}},context);
  const templates=templateRead.rows,log=logRead.rows,loading=templateRead.status==='loading';
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<'es' | 'en'>('es');
  const [tab, setTab] = useState<'edit' | 'versions' | 'log'>('edit');
  const [audience, setAudience] = useState<EmailAudience>('customer');
  const [priority, setPriority] = useState<EmailPriority | 'all'>('all');
  const shown = templates.filter((x) => audienceOf(x) === audience && (priority === 'all' || priorityOf(x) === priority)).sort((a, b) => catalogOrder(a) - catalogOrder(b));
  const groups = [...EMAIL_PRIORITIES, null].map((p) => ({ p, rows: shown.filter((x) => priorityOf(x) === p) })).filter((g) => g.rows.length > 0);
  const row = shown.find((x) => x.id === selected) ?? groups[0]?.rows[0];
  const inAudience = templates.filter((x) => audienceOf(x) === audience);
  const versionRead=useEmailRows<AuditRow>(data,'audit_log',{where:{tenant_id:tenant.id,entity:'email_templates',entity_id:row?.id??'__none__'},orderBy:{column:'created_at',dir:'desc'}},context);
  const versions=versionRead.rows;
  const ids=[...new Set([user.id,...log.map(m=>m.user_id),...versions.map(v=>v.actor_id)].filter((id):id is string=>!!id))].sort();
  const usersRead=useEmailRows<UserRow>(data,'users',{where:{tenant_id:tenant.id,id:ids}},context);
  const profilesRead=useEmailRows<ProfileRow>(data,'profiles',{where:{tenant_id:tenant.id,user_id:ids}},context);
  const byId=new Map(usersRead.rows.map(u=>[u.id,{name:profilesRead.rows.find(p=>p.user_id===u.id)?.full_name??u.email}]));
  const reads=[templateRead,logRead,versionRead,usersRead,profilesRead],readError=reads.some(r=>r.status==='error'),readsReady=reads.every(r=>r.status==='ready');
  const edit=useEmailEdit(row?.id);
  const test=useEmailTest(data,{id:user.id,role},row?.id,row?.version,preview);
  const canWrite = can('content.write');
  const missing = EMAIL_CATALOG.filter((s) => !templates.some((x) => x.key === s.key));

  const createMissing = async () => {
    for (const s of missing) {
      const r = await data.insert<EmailRow>('email_templates', { key: s.key, name: s.name.es, audience: s.audience, trigger: s.trigger, priority: s.priority, subject: s.subject, body_mjml: JSON.stringify({ es: s.body.es, en: s.body.en, cta: s.cta }), version: 1, active: false });
      await audit('email_template.create', 'email_templates', r.id, { key: s.key });
    }
  };
  const logColumns = [
    { key: 'sent_at', label: t('admin.emails.log.when'), render: (r: MessageLogRow) => <span className="mono small">{r.sent_at ? formatDateTime(r.sent_at, lang) : '—'}</span> },
    { key: 'user_id', label: t('admin.emails.log.to'), render: (r: MessageLogRow) => r.payload?.test ? <span>{String(r.payload.to)} <Badge tone="warn">{t('admin.emails.local.test')}</Badge></span> : byId.get(r.user_id ?? '')?.name ?? '—' },
    { key: 'template_key', label: t('admin.emails.log.template') },
    { key: 'status', label: t('admin.emails.log.status'), render: (r: MessageLogRow) => <Badge tone={toneForStatus(r.status)}>{r.payload?.test===true?`${t('admin.emails.local.status')} · ${r.status}`:r.status}</Badge> },
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>{t('admin.emails.title')}</h1><p className="muted small">{t('admin.emails.subtitle')}</p></div>
        {canWrite && missing.length > 0 && <Button size="sm" variant="secondary" disabled={!readsReady} onClick={createMissing}>{t('admin.emails.createMissing', { n: missing.length })}</Button>}
      </div>
      {/* 0166 · the two standing notes sit side by side instead of stacking two full-width boxes */}
      <div className="emails-notes">
        <Notice>{t('admin.emails.local.notice')}</Notice>
        {templates.length > 0 && <Notice title={t('admin.emails.suggested.title')}>{t('admin.emails.suggested.body')}</Notice>}
      </div>
      {readError&&<Notice tone="danger">{t('admin.emails.local.readError')} <Button variant="ghost" onClick={()=>reads.forEach(r=>r.retry())}>{t('admin.emails.local.retry')}</Button></Notice>}
      {!readError&&!readsReady&&<Notice>{t('admin.emails.local.loading')}</Notice>}
      {loading && templates.length === 0 && <EmptyState tone="loading" title={t('core.common.loading')} />}
      {!loading && templates.length === 0 && <EmptyState title={t('admin.emails.empty')} body={t('admin.emails.empty.body')} action={canWrite && <Button size="sm" disabled={!readsReady} onClick={createMissing}>{t('admin.emails.createMissing', { n: missing.length })}</Button>} />}
      {templates.length > 0 && (
        <div className="stack-sm emails-filters">
          <div className="row wrap" role="tablist" aria-label={t('admin.emails.f.audience')}>
            {EMAIL_AUDIENCES.map((a) => <Chip key={a} selected={audience === a} onClick={() => { setAudience(a); setSelected(null); }}>{t(`admin.emails.audience.${a}`)} · {templates.filter((x) => audienceOf(x) === a).length}</Chip>)}
          </div>
          <div className="row-between wrap">
            <div className="row wrap" role="tablist" aria-label={t('admin.emails.f.priority')}>
              <Chip selected={priority === 'all'} onClick={() => setPriority('all')}>{t('admin.emails.priority.all')}</Chip>
              {EMAIL_PRIORITIES.map((p) => <Chip key={p} selected={priority === p} onClick={() => { setPriority(p); setSelected(null); }}>{t(`admin.emails.priority.${p}`)} · {inAudience.filter((x) => priorityOf(x) === p).length}</Chip>)}
            </div>
            <span className="xs muted">{t('admin.emails.coverage', { active: inAudience.filter((x) => x.active).length, total: inAudience.length, launch: inAudience.filter((x) => priorityOf(x) === 'launch').length })}</span>
          </div>
        </div>
      )}
      {templates.length > 0 && !row && <EmptyState title={t('admin.emails.filter.empty')} />}
      {row && (
        <div className="emails">
          <aside className="emails-list">
            {groups.map(({ p, rows }) => (
              <div key={p ?? 'none'} className="stack-sm">
                <div className="eyebrow">{t(`admin.emails.priority.${p ?? 'none'}`)} · {rows.length}</div>
                {rows.map((x) => { const b = parseBody(x); return (
                  <button key={x.id} type="button" className={`emails-item ${x.id === row.id ? 'is-selected' : ''}`} onClick={() => { setSelected(x.id); setTab('edit'); }}>
                    <span className="grow"><span className="small">{nameOf(x, bi)}</span><span className="xs muted"> · v{x.version}</span></span>
                    <span className="row"><code className="xs muted emails-trigger">{x.trigger}</code><span className="row"><span className="xs muted">{b.en ? 'ES · EN' : 'ES'}</span><Badge tone={x.active ? 'success' : 'warn'}>{x.active ? t('core.common.on') : t('admin.emails.draft')}</Badge></span></span>
                  </button>
                ); })}
              </div>
            ))}
          </aside>
          <section className="emails-canvas stack-sm">
            <div className="row-between wrap">
              <div className="row wrap"><h2 className="adm-h2">{nameOf(row, bi)}</h2><code className="xs muted">{row.key}</code></div>
              <div className="row wrap" role="tablist"><Chip selected={preview === 'es'} onClick={() => setPreview('es')}>ES</Chip><Chip selected={preview === 'en'} onClick={() => setPreview('en')}>EN</Chip></div>
            </div>
            <Facts row={row} />
            <Canvas row={row} lang={preview} />
            <p className="xs muted">{t('admin.emails.deepLink')} · {t('admin.emails.dianNote')}</p>
          </section>
          <aside className="emails-side stack">
            <section className="stack-sm" data-email-edit-state>
              <Notice>{t('admin.emails.edit.mock')}</Notice>
              {edit.error&&<Notice tone="warn">{t(`admin.emails.edit.${edit.error}`)}<div className="row wrap">{edit.canRetry&&<Button size="sm" onClick={()=>void edit.retry().catch(()=>{})}>{t('admin.emails.edit.retry')}</Button>}<Button size="sm" variant="ghost" onClick={()=>void edit.reload()}>{t('admin.emails.edit.reload')}</Button></div></Notice>}
              {edit.busy&&<Notice action={<Button size="sm" variant="secondary" onClick={edit.cancel}>{t('admin.emails.edit.cancel')}</Button>}>{t('admin.emails.edit.busy')}</Notice>}
              {edit.saved&&<Notice tone="success">{t('admin.emails.edit.saved',{v:edit.saved.version})}</Notice>}
            </section>
            <div className="row wrap" role="tablist">
              <Chip selected={tab === 'edit'} onClick={() => setTab('edit')}>{t('core.common.edit')}</Chip>
              <Chip selected={tab === 'versions'} onClick={() => setTab('versions')}>{t('admin.emails.versions')} · {versions.length}</Chip>
              <Chip selected={tab === 'log'} onClick={() => setTab('log')}>{t('admin.emails.log')}</Chip>
            </div>
            {tab === 'edit' && <Editor key={`${context}:${row.id}`} row={row} acknowledged={edit.saved} busy={edit.busy} onChanged={edit.changed} readOnly={!canWrite||!readsReady||edit.error==='read'||edit.error==='missing'} onSave={(patch,basis)=>edit.run({kind:'edit',basis,patch})} testDisabled={!readsReady||edit.busy} onTest={test.openPreview} />}
            {tab === 'versions' && (
              <Card padding="sm">
                {versions.length === 0 && <p className="small muted" style={{ padding: 'var(--sp-sm)' }}>{t('admin.emails.versions.empty')}</p>}
                {versions.map((v) => (
                  <div key={v.id} className="emails-version">
                    <div className="grow"><div className="small"><strong>{v.action.replace('email_template.', '')}</strong>{v.diff?.version != null ? ` · v${String(v.diff.version)}` : ''}</div><div className="xs muted">{formatDateTime(v.created_at, lang)} · {byId.get(v.actor_id ?? '')?.name ?? '—'}</div></div>
                    {canWrite && v.action === 'email_template.update' && v.diff?.before != null && <Button size="sm" variant="ghost" disabled={!readsReady||edit.busy||edit.error==='read'||edit.error==='missing'} onClick={()=>void edit.run({kind:'rollback',basis:row,target:v as EmailVersionAudit}).catch(()=>{})}>{t('admin.emails.rollback')}</Button>}
                  </div>
                ))}
              </Card>
            )}
            {tab === 'log' && <DataTable columns={logColumns} rows={log} rowKey={(r) => r.id} dense pageSize={10} emptyText={t('admin.emails.log.empty')} />}
          </aside>
        </div>
      )}
      <Drawer open={test.open} onClose={test.close} title={t('admin.emails.local.title')} footer={<><Button variant="ghost" onClick={test.close}>{t('core.common.cancel')}</Button>{!test.done&&<Button loading={test.busy} disabled={test.status!=='ready'||!readsReady} onClick={()=>void test.send()}>{t('admin.emails.local.run')}</Button>}</>}>
        <div className="stack-sm">
          <Notice>{t('admin.emails.local.notice')}</Notice>
          {test.status==='loading'&&<Notice>{t('admin.emails.local.loading')}</Notice>}
          {test.status==='error'&&<Notice tone="danger">{t('admin.emails.local.readError')} <Button variant="ghost" onClick={test.retry}>{t('admin.emails.local.retry')}</Button></Notice>}
          {test.error&&<Notice tone="danger">{t('admin.emails.local.error')}</Notice>}
          {test.done&&<Notice tone="success">{t('admin.emails.local.done')} <Button variant="ghost" onClick={()=>{test.close();setTab('log');}}>{t('admin.emails.local.viewLog')}</Button></Notice>}
          {test.snapshot&&<><p className="small mono email-test-recipient">{test.snapshot.recipient} · {test.snapshot.locale.toUpperCase()} · v{test.snapshot.version}</p><Notice>{t('admin.emails.local.savedVersion')}</Notice><div className="email-test-preview"><EmailPreview subject={test.snapshot.subject} body={test.snapshot.body} cta={test.snapshot.cta} /></div></>}
        </div>
      </Drawer>
    </div>
  );
}

function Canvas({ row, lang }: { row: EmailRow; lang: 'es' | 'en' }) {
  const { t } = useI18n();
  const contact = useContact();
  const b = parseBody(row);
  const body = lang === 'en' ? b.en || b.es : b.es;
  const subject = lang === 'en' ? row.subject.en || row.subject.es : row.subject.es;
  const vars = sampleFor(audienceOf(row), row.key);
  return <EmailPreview envelope={`${tenant.name} <${contact.email}>${pendingSuffix(contact, 'email', lang)} → ${vars.first_name.toLowerCase()}@…  ·  ${lang.toUpperCase()} · v${row.version}`} subject={subject} body={body} cta={b.cta ? { label: lang === 'en' ? b.cta.label.en || b.cta.label.es : b.cta.label.es, href: b.cta.href } : undefined} footer={`${tenant.legalName} · ${contact.address}, ${contact.city}${pendingSuffix(contact, 'address', lang)} · WhatsApp ${contact.whatsapp}${pendingSuffix(contact, 'whatsapp', lang)} · ${t('admin.emails.footer', { studio: tenant.name })}${emailEntry(row.key)?.category === 'marketing' ? ` ${t('admin.emails.unsubscribe')}` : ''}`} vars={vars} />;
}

/** `{{var}}` in a note reads as code so the admin sees which variable it means. */
const renderNote = (text: string) => text.split(/(\{\{\s*[\w.]+\s*\}\})/g).map((part, i) => (part.startsWith('{{') ? <code key={i} className="emails-var">{part}</code> : part));

/** What the catalog knows about this email: when it sends, its priority, the 2026-10-02 inventory state and its rows. */
function Facts({ row }: { row: EmailRow }) {
  const { t, bi } = useI18n();
  const m = emailEntry(row.key);
  const p = priorityOf(row);
  const notes = m ? adminNotesFor(m) : [];
  if (!m && !p) return null;
  return (
    <div className="stack-sm">
      {m && <p className="small"><span className="muted">{t('admin.emails.sendsWhen')}:</span> {bi(m.sendsWhen)}</p>}
      <div className="row wrap">
        {p && <Badge tone={PRIORITY_TONE[p]}>{t(`admin.emails.priority.${p}`)}</Badge>}
        {m?.promised && <Badge tone="warn">{t('admin.emails.promised')}</Badge>}
        {m?.category === 'marketing' && <Badge>{t('admin.emails.consent')}</Badge>}
        {m?.channelTbd && <Badge>{t('admin.emails.channelTbd')}</Badge>}
        {m?.intake === 'proposed' && <Badge tone="highlight">{t('admin.emails.proposed')}</Badge>}
        {m && <span className="xs muted">{t('admin.emails.intake')}: {t(`admin.emails.intake.${m.intake}`)} · <span className="mono">{m.refs.join(' · ')}</span></span>}
      </div>
      {notes.length > 0 && (
        <Notice tone="warn" icon="info" title={t('admin.emails.adminNote')}>
          <ul className="emails-notes">{notes.map((n, i) => <li key={i}>{renderNote(bi(n))}</li>)}</ul>
        </Notice>
      )}
    </div>
  );
}

function Editor({ row, readOnly, testDisabled, onSave, onTest, acknowledged, busy, onChanged }: { row: EmailRow; readOnly: boolean; testDisabled:boolean; onSave: (patch: EmailPatch, basis:EmailRow) => Promise<EmailRow>; onTest: () => void; acknowledged:EmailRow|null;busy:boolean;onChanged:()=>void }) {
  const { t } = useI18n();
  const blocked=readOnly||busy;
  const [basis,setBasis]=useState(row);
  const fields=(r:EmailRow)=>{const b=parseBody(r);return {name:r.name,audience:audienceOf(r),priority:(priorityOf(r)??'') as EmailPriority|'',trigger:r.trigger,subjectEs:r.subject.es,subjectEn:r.subject.en??'',bodyEs:b.es,bodyEn:b.en,ctaLabelEs:b.cta?.label.es??'',ctaLabelEn:b.cta?.label.en??'',ctaHref:b.cta?.href??'',active:r.active};};
  const init=useMemo(()=>fields(basis),[basis]);
  const [d, setD] = useState(init);
  useEffect(()=>{if(acknowledged?.id===basis.id){setBasis(acknowledged);setD(fields(acknowledged));}},[acknowledged]);
  const update=(next:typeof d)=>{onChanged();setD(next);};
  const dirty = JSON.stringify(d) !== JSON.stringify(init);
  const missingEn = !d.subjectEn.trim() || !d.bodyEn.trim();
  const vars = varsIn(d.subjectEs, d.bodyEs, d.subjectEn, d.bodyEn, d.ctaHref);
  const save = async () => {
    try {
      const body: ParsedBody = { es: d.bodyEs, en: d.bodyEn, cta: d.ctaHref ? { label: { es: d.ctaLabelEs, en: d.ctaLabelEn }, href: d.ctaHref } : undefined };
      await onSave({ name: d.name, audience: d.audience, priority: d.priority || null, trigger: d.trigger, subject: { es: d.subjectEs, en: d.subjectEn }, body_mjml: JSON.stringify(body), active: d.active && !missingEn }, basis);
    } catch { /* The scoped command notice contains the error; retain the draft for retry/review. */ }
  };
  return (
    <div className="stack-sm">
      <Field label={t('admin.emails.f.name')}>{(id) => <Input id={id} disabled={blocked} value={d.name} onChange={(e) => update({ ...d, name: e.target.value })} />}</Field>
      <div className="grid grid-2">
        <Field label={t('admin.emails.f.audience')}>{(id) => <Select id={id} disabled={blocked} value={d.audience} onChange={(e) => update({ ...d, audience: e.target.value as EmailAudience })}>{EMAIL_AUDIENCES.map((a) => <option key={a} value={a}>{t(`admin.emails.audience.${a}`)}</option>)}</Select>}</Field>
        <Field label={t('admin.emails.f.priority')}>{(id) => <Select id={id} disabled={blocked} value={d.priority} onChange={(e) => update({ ...d, priority: e.target.value as EmailPriority | '' })}><option value="">{t('admin.emails.priority.none')}</option>{EMAIL_PRIORITIES.map((p) => <option key={p} value={p}>{t(`admin.emails.priority.${p}`)}</option>)}</Select>}</Field>
      </div>
      <Field label={t('admin.emails.f.trigger')} hint={t('admin.emails.f.trigger.hint')}>{(id) => <Input id={id} disabled={blocked} value={d.trigger} onChange={(e) => update({ ...d, trigger: e.target.value })} className="mono" />}</Field>
      <Field label={`${t('admin.emails.f.subject')} · ES`} required>{(id) => <Input id={id} disabled={blocked} value={d.subjectEs} onChange={(e) => update({ ...d, subjectEs: e.target.value })} />}</Field>
      <Field label={`${t('admin.emails.f.subject')} · EN`}>{(id) => <Input id={id} disabled={blocked} value={d.subjectEn} onChange={(e) => update({ ...d, subjectEn: e.target.value })} />}</Field>
      <Field label={`${t('admin.emails.f.body')} · ES`} required>{(id) => <textarea id={id} className="input adm-textarea" rows={6} disabled={blocked} value={d.bodyEs} onChange={(e) => update({ ...d, bodyEs: e.target.value })} />}</Field>
      <Field label={`${t('admin.emails.f.body')} · EN`}>{(id) => <textarea id={id} className="input adm-textarea" rows={6} disabled={blocked} value={d.bodyEn} onChange={(e) => update({ ...d, bodyEn: e.target.value })} />}</Field>
      <div className="grid grid-2">
        <Field label={`${t('admin.emails.f.cta')} · ES`}>{(id) => <Input id={id} disabled={blocked} value={d.ctaLabelEs} onChange={(e) => update({ ...d, ctaLabelEs: e.target.value })} />}</Field>
        <Field label={`${t('admin.emails.f.cta')} · EN`}>{(id) => <Input id={id} disabled={blocked} value={d.ctaLabelEn} onChange={(e) => update({ ...d, ctaLabelEn: e.target.value })} />}</Field>
      </div>
      <Field label={t('admin.emails.f.deepLink')}>{(id) => <Input id={id} disabled={blocked} value={d.ctaHref} onChange={(e) => update({ ...d, ctaHref: e.target.value })} className="mono" placeholder={`${APP}…`} />}</Field>
      <div className="stack-sm"><div className="eyebrow">{t('admin.emails.vars')}</div><div className="row wrap">{vars.map((v) => <code key={v} className="emails-var">{`{{${v}}}`}</code>)}{vars.length === 0 && <span className="xs muted">—</span>}</div></div>
      <div className="row-between wrap">
        <Toggle size="sm" checked={d.active} disabled={blocked || missingEn} label={t('admin.emails.f.active')} onChange={(on) => update({ ...d, active: on })} />
        {missingEn && <span className="xs muted">{t('admin.emails.missingEn')}</span>}
      </div>
      <div className="row-between wrap">
        <Button size="sm" variant="secondary" disabled={testDisabled} onClick={onTest}>{t('admin.emails.test')}</Button>
        {!readOnly && <Button size="sm" disabled={busy || !dirty || !d.subjectEs.trim() || !d.bodyEs.trim()} loading={busy} onClick={save}>{t('admin.emails.saveVersion', { v: basis.version + 1 })}</Button>}
      </div>
      {dirty && <p className="xs muted">{t('admin.emails.unsaved')}</p>}
    </div>
  );
}

