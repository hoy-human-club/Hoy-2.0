import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import type { IntegrationRow, IntegrationStatus } from '../../data/schema';
import { useLayout } from '../../layout/useLayout';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Badge, type BadgeTone } from '../../components/atom/Badge/Badge';
import { Notice } from '../../components/molecule/Notice/Notice';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useAudit } from '../staff/audit';
import { INTEGRATIONS, INTEGRATION_STATUSES, filledCount, useIntegrations, type IntegrationDef } from './integrations';
import { M10 } from './specs';
import { Icon } from '../../components/atom/Icon/Icon';
import './admin.css';

export const STATUS_TONE: Record<IntegrationStatus, BadgeTone> = { simulated: 'warn', configured: 'primary', connected: 'success' };

/**
 * M-10 `/admin/integrations` — one card per external system. The owner fills the non-secret fields
 * and moves the status chip; the dev reads the checklist. Keys never come here (the notice says so,
 * and the `integrations` table has no column for them).
 */
export function IntegrationsPage() {
  const { t } = useI18n();
  const { can } = useSession();
  const { rows, byKey, loading } = useIntegrations();
  const { sections, isVisible } = useLayout(M10);
  const canWrite = can('settings.write');

  const counts = INTEGRATION_STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length] as const);

  const SECTIONS: Record<string, () => ReactNode> = {
    Intro: () => (
      <>
        <Link to="/admin/finance/subscriptions">{t('admin.subscriptions.nav')} →</Link>
        <div className="page-head">
          <div><h1>{t('admin.integrations.title')}</h1><p className="muted small">{t('admin.integrations.subtitle')}</p></div>
          <div className="row wrap">{counts.map(([s, n]) => <Badge key={s} tone={STATUS_TONE[s]}>{n} · {t(`admin.integrations.status.${s}`)}</Badge>)}{!canWrite && <Badge tone="warn">{t('admin.settings.readonly')}</Badge>}</div>
        </div>
        <Notice tone="warn" title={t('admin.integrations.keys.title')} action={<Link to="/manual/26-integraciones" className="small">{t('admin.integrations.manual')} →</Link>}>{t('admin.integrations.keys.body')}</Notice>
        <Notice tone="info" icon="key-round" title={t('admin.integrations.devkeys.title')} action={<Link to="/dev/api-keys" className="small">{t('admin.integrations.devkeys.open')} →</Link>}>{t('admin.integrations.devkeys.body')}</Notice>
      </>
    ),
    Cards: () => (
      loading && rows.length === 0
        ? <EmptyState tone="loading" title={t('core.common.loading')} />
        : <div className="grid grid-2 integ-grid">{INTEGRATIONS.map((def) => <IntegrationCard key={def.key} def={def} row={byKey.get(def.key)} readOnly={!canWrite} />)}</div>
    ),
    Order: () => (
      <Card tone="muted" title={t('admin.integrations.order.title')} eyebrow="ROADMAP §B">
        <p className="small">{t('admin.integrations.order.body')}</p>
        <p className="xs muted" style={{ marginTop: 'var(--sp-sm)' }}>{t('admin.integrations.order.where')} <Link to="/admin/settings/payments">M-08c</Link> · <Link to="/admin/settings/communications">M-08d</Link> · <Link to="/admin/settings/content">M-08f</Link> · <Link to="/admin/activity">M-07</Link></p>
      </Card>
    ),
  };

  return <div className="stack">{sections.filter(isVisible).map((s) => <div key={s} data-section={s}>{SECTIONS[s]?.()}</div>)}</div>;
}

function IntegrationCard({ def, row, readOnly }: { def: IntegrationDef; row: IntegrationRow | undefined; readOnly: boolean }) {
  const { t, bi } = useI18n();
  const { user } = useSession();
  const audit = useAudit('admin');
  const { save } = useIntegrations();
  const [status, setStatus] = useState<IntegrationStatus>(row?.status ?? 'simulated');
  const [config, setConfig] = useState<Record<string, string>>(row?.config ?? {});
  const [notes, setNotes] = useState(row?.notes ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  useEffect(() => { if (row) { setStatus(row.status); setConfig(row.config ?? {}); setNotes(row.notes ?? ''); } }, [row]);

  const dirty = !!row && (status !== row.status || notes !== (row.notes ?? '') || JSON.stringify(config) !== JSON.stringify(row.config ?? {}));
  const filled = filledCount(def, row);

  const doSave = async () => {
    if (!row) return;
    setState('saving');
    const { before, after } = await save(row, { status, config, notes: notes.trim() || null }, user.id);
    await audit('integration.update', 'integrations', row.id, { key: def.key, before, after });
    setState('saved'); setTimeout(() => setState('idle'), 2000);
  };

  return (
    <Card
      title={bi(def.name)}
      eyebrow={def.screens.join(' · ')}
      actions={<Badge tone={STATUS_TONE[status]}>{t(`admin.integrations.status.${status}`)}</Badge>}
      className="integ-card"
    >
      <div className="stack">
        <p className="small">{bi(def.body)}</p>
        <p className="xs muted"><strong>{t('admin.integrations.today')}</strong> {bi(def.simulated)}</p>

        <div className="grid grid-2 integ-fields">
          {def.fields.map((f) => (
            <Field key={f.name} label={bi(f.label)} hint={f.hint ? bi(f.hint) : undefined}>
              {(id) => <Input id={id} value={config[f.name] ?? ''} placeholder={f.placeholder} disabled={readOnly || !row} onChange={(e) => setConfig({ ...config, [f.name]: e.target.value })} />}
            </Field>
          ))}
        </div>
        <p className="xs muted">{t('admin.integrations.filled', { n: filled, total: def.fields.length })} · {t('admin.integrations.secrets')} <span className="mono">{def.secrets.join(', ')}</span></p>

        {def.groups
          ? <IntegrationSteps def={def} />
          : (
            <div className="stack-sm">
              <span className="eyebrow">{t('admin.integrations.checklist')}</span>
              <ol className="integ-check small">{def.checklist.map((c, i) => <li key={i}>{bi(c)}</li>)}</ol>
            </div>
          )}
        {def.notes && <ul className="xs muted integ-notes">{def.notes.map((n, i) => <li key={i}>{bi(n)}</li>)}</ul>}

        <Field label={t('admin.integrations.notes')} hint={t('admin.integrations.notes.hint')}>
          {(id) => <textarea id={id} className="input adm-textarea" rows={2} value={notes} disabled={readOnly || !row} onChange={(e) => setNotes(e.target.value)} />}
        </Field>

        <div className="row-between wrap">
          <div className="row wrap">
            <Select value={status} disabled={readOnly || !row} aria-label={t('admin.integrations.statusLabel')} onChange={(e) => setStatus(e.target.value as IntegrationStatus)}>
              {INTEGRATION_STATUSES.map((s) => <option key={s} value={s}>{t(`admin.integrations.status.${s}`)}</option>)}
            </Select>
            <Link to={`/manual/${def.manual}`} className="xs integ-manual">{t('admin.integrations.manual')} →</Link>
            {def.detail && <Link to={def.detail} className="btn btn-secondary btn-sm"><span className="btn-icon" aria-hidden><Icon name="arrow-right" size="sm" /></span><span className="btn-label">{t('admin.integrations.open')}</span></Link>}
          </div>
          {!readOnly && <div className="row"><span className="xs muted">{state === 'saved' ? t('admin.settings.saved') : dirty ? t('admin.settings.unsaved') : ''}</span><Button size="sm" disabled={!dirty} loading={state === 'saving'} onClick={doSave}>{t('core.common.save')}</Button></div>}
        </div>
      </div>
    </Card>
  );
}

/** 0041: a checklist split by who does it (platform once · studio per location). M-10 cards and M-10a share it. */
export function IntegrationSteps({ def }: { def: IntegrationDef }) {
  const { t, bi } = useI18n();
  return (
    <div className="stack">
      <span className="eyebrow">{t('admin.integrations.steps')}</span>
      {def.groups?.map((g) => (
        <div key={g.key} className="stack-sm">
          <div className="row wrap"><strong className="small">{bi(g.label)}</strong><Badge tone={g.key === 'platform' ? 'primary' : 'highlight'}>{t('admin.integrations.who', { who: bi(g.who) })}</Badge></div>
          <ol className="integ-check small">{g.steps.map((c, i) => <li key={i}>{bi(c)}</li>)}</ol>
        </div>
      ))}
    </div>
  );
}
