import { useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from '../../../auth/SessionProvider';
import { ROLE_LABEL, type Role } from '../../../auth/roles';
import { useI18n } from '../../../i18n/I18nProvider';
import { tenant } from '../../../tenant/tenant';
import { Button } from '../../atom/Button/Button';
import { Input } from '../../atom/Input/Input';
import { Field } from '../../molecule/Field/Field';
import { Card } from '../../molecule/Card/Card';
import { Notice } from '../../molecule/Notice/Notice';
import { Drawer } from '../Drawer/Drawer';
import { problemDraftErrors, readProblemDraft, saveProblemDraft, type ProblemContext } from './problemDraft';

/** Captures the effective preview role separately from the demo actor. Nothing is sent. */
export function ProblemReport() {
  const { user, role } = useSession();
  const location = useLocation();
  return <ActorReport key={`${user.id}:${role}`} context={{ tenantId: tenant.id, actorId: user.id, actorName: user.name, role, route: `#${location.pathname}` }} />;
}
function ActorReport({ context }: { context: ProblemContext }) {
  const { t, bi } = useI18n();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'edit' | 'preview' | 'saved'>('edit');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [draftId, setDraftId] = useState('');
  const [errors, setErrors] = useState<ReturnType<typeof problemDraftErrors>>({});
  const [failure, setFailure] = useState<'load' | 'save' | null>(null);
  const titleRef = useRef<HTMLInputElement>(null), bodyRef = useRef<HTMLTextAreaElement>(null);
  const start = () => {
    setErrors({}); setFailure(null); setMode('edit');
    try {
      const saved = readProblemDraft(localStorage, context);
      setTitle(saved?.title ?? ''); setDescription(saved?.description ?? ''); setDraftId(saved?.id ?? crypto.randomUUID());
    } catch { setFailure('load'); setTitle(''); setDescription(''); setDraftId(crypto.randomUUID()); }
    setOpen(true);
  };
  const preview = (event: FormEvent) => {
    event.preventDefault();
    const next = problemDraftErrors(title, description); setErrors(next);
    if (next.title || next.description) { (next.title ? titleRef.current : bodyRef.current)?.focus(); return; }
    setTitle(title.trim()); setDescription(description.trim()); setFailure(null); setMode('preview');
  };
  const save = () => {
    try { saveProblemDraft(localStorage, context, { id: draftId, title, description }); setFailure(null); setMode('saved'); }
    catch { setFailure('save'); }
  };
  return <>
    <Button size="sm" variant="ghost" icon="alert" onClick={start}>{t('hub.report')}</Button>
    <Drawer open={open} onClose={() => setOpen(false)} side="bottom" title={t('hub.report')}>
      <div className="stack">
        <Notice tone="info">{t('hub.report.localOnly')}</Notice>
        <Card padding="sm" tone="muted" className="stack-sm" style={{ overflowWrap: 'anywhere' }}>
          <div className="small"><strong>{t('hub.report.screen')}: </strong><span>{context.route}</span></div>
          <div className="small"><strong>{t('hub.report.actor')}: </strong><span>{context.actorName} · {context.actorId}</span></div>
          <div className="small"><strong>{t('hub.report.role')}: </strong><span>{bi(ROLE_LABEL[context.role as Role])}</span></div>
        </Card>
        {failure && <Notice tone="warn">{t(`hub.report.${failure}Failed`)}</Notice>}
        {mode === 'edit' ? <form className="stack" noValidate onSubmit={preview}>
          <Field label={t('hub.report.subject')} required error={errors.title ? t('hub.report.subjectError') : undefined}>{id => <Input id={id} ref={titleRef} value={title} maxLength={120} invalid={!!errors.title} onChange={event => setTitle(event.target.value)} />}</Field>
          <Field label={t('hub.report.details')} required hint={t('hub.report.detailsHint')} error={errors.description ? t('hub.report.detailsError') : undefined}>{id => <textarea id={id} ref={bodyRef} className={`input ${errors.description ? 'is-invalid' : ''}`} rows={5} maxLength={2000} value={description} aria-invalid={errors.description || undefined} onChange={event => setDescription(event.target.value)} />}</Field>
          <Button type="submit" block>{t('hub.report.preview')}</Button>
          <Button type="button" block variant="ghost" onClick={() => setOpen(false)}>{t('hub.report.cancel')}</Button>
        </form> : <div className="stack">
          <Card padding="md" className="stack-sm">
            <strong style={{ overflowWrap: 'anywhere' }}>{title}</strong>
            <p className="small" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{description}</p>
          </Card>
          {mode === 'saved' && <Notice tone="success">{t('hub.report.saved')}</Notice>}
          <Button block disabled={mode === 'saved'} onClick={save}>{t(mode === 'saved' ? 'hub.report.savedButton' : failure === 'save' ? 'hub.report.retry' : 'hub.report.save')}</Button>
          <Button block variant="secondary" onClick={() => { setMode('edit'); setFailure(null); }}>{t('hub.report.edit')}</Button>
          <Button block variant="ghost" onClick={() => setOpen(false)}>{t('hub.report.close')}</Button>
        </div>}
      </div>
    </Drawer>
  </>;
}
