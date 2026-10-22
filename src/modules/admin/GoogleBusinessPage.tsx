import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useLayout } from '../../layout/useLayout';
import { useActions } from '../../actions/bus';
import type { ActionHandler } from '../../actions/types';
import { toast } from '../../app/toast';
import { copyText } from '../../app/clipboard';
import { formatDateTime } from '../../i18n/format';
import { GOOGLE_HOURS_UPDATE_MASK, WEEK_ORDER, hoursForGoogleText, overrideLine, toGoogleBusinessHours, upcomingOverrides } from '../../tenant/hours';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Notice } from '../../components/molecule/Notice/Notice';
import { Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { hoursDryRunSourceKey, prepareHoursDryRun, simulateHoursDryRun, type HoursDryRun, type HoursDryRunResult } from './googleBusinessDryRun';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { Icon } from '../../components/atom/Icon/Icon';
import { useOpeningHours } from './settings';
import { integrationDef, useIntegrations } from './integrations';
import { IntegrationSteps, STATUS_TONE } from './IntegrationsPage';
import { M10a } from './specs';
import './admin.css';

const DAY_LABEL = { es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
const GOOGLE_PROFILE_URL = 'https://business.google.com/';
const API_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';

/**
 * M-10a `/admin/integrations/google-business` (0041, D-0017) — what HoyOS will send to Google Business Profile.
 * Nothing here talks to Google: the preview is the real `locations.patch` body, the copy buttons work, and the
 * real connect / push controls remain disabled; only the explicit in-memory dry-run can execute.
 */
export function GoogleBusinessPage() {
  const { t, bi, lang } = useI18n();
  const { sections, isVisible } = useLayout(M10a);
  const hours = useOpeningHours();
  const { byKey, loading } = useIntegrations();
  const def = integrationDef('google_business');
  const row = byKey.get('google_business');
  // Configuration rows cannot prove a real Google session or provider readback.
  const status = 'simulated' as const;
  const locationName = row?.config?.locationName?.trim() || '';

  const body = useMemo(() => toGoogleBusinessHours(hours.weekly, hours.overrides, hours.todayKey), [hours.weekly, hours.overrides, hours.todayKey]);
  const json = useMemo(() => JSON.stringify(body, null, 2), [body]);
  const text = useMemo(() => hoursForGoogleText(hours.weekly, hours.overrides, hours.todayKey, lang), [hours.weekly, hours.overrides, hours.todayKey, lang]);
  const lastPush = hours.overrides.map((o) => o.google_synced_at).filter((v): v is string => !!v).sort().pop() ?? null;
  const soon = upcomingOverrides(hours.overrides, hours.todayKey, 366);
  const [prepared,setPrepared] = useState<HoursDryRun | null>(null);
  const [phase,setPhase] = useState('idle');
  const [outcome,setOutcome] = useState<'success'|'failure'>('success');
  const [result,setResult] = useState<HoursDryRunResult | null>(null);
  const running = useRef<AbortController | null>(null);
  const sourceKey = hoursDryRunSourceKey(body,hours.confirmed);
  const stale = !!prepared && prepared.sourceKey !== sourceKey;
  const busy = phase==='validating'||phase==='previewing';
  useEffect(()=>()=>running.current?.abort(),[]);
  const prepare = () => {
    if(running.current)return;
    setResult(null);
    try{setPrepared(prepareHoursDryRun(body,hours.confirmed));setPhase('prepared');}
    catch{setPrepared(null);setPhase('invalid');}
  };
  const simulate = async () => {
    if(!prepared||running.current)return;
    const controller=new AbortController();running.current=controller;setResult(null);
    try {
      const receipt=await simulateHoursDryRun(prepared,sourceKey,{signal:controller.signal,outcome,onProgress:setPhase});
      if(!controller.signal.aborted){setResult(receipt);setPhase('success');}
    }catch(e){setPhase(e instanceof Error&&e.message==='cancelled'?'cancelled':e instanceof Error&&e.message==='source_changed'?'stale':'error');}
    finally{if(running.current===controller)running.current=null;}
  };


  const copy = async (what: 'json' | 'text') => {
    const ok = await copyText(what === 'json' ? json : text);
    toast(ok ? t('admin.gbp.copied') : t('admin.gbp.copyFailed'), ok ? 'success' : 'danger');
    return ok;
  };

  const impl = useMemo<Record<string, ActionHandler>>(() => ({
    'integrations.google.copyHours': async (p) => {
      const what = p?.format === 'json' ? 'json' : 'text';
      await copy(what);
      return what === 'json' ? json : text;
    },
    'integrations.google.connect': () => { throw new Error('not wired yet: the HoyOS server that holds the Google OAuth client does not exist (M-10a Setup lists the steps)'); },
    'integrations.google.push': () => { throw new Error('not wired yet: pushing needs the server and a connected location; copy the hours instead (integrations.google.copyHours)'); },
    // copy() only closes over json, text and t, which are the deps.
  }), [json, text, t]);
  useActions(M10a, impl);

  const SECTIONS: Record<string, () => ReactNode> = {
    Status: () => (
      <>
        <div className="page-head">
          <div><h1>{bi(def.name)}</h1><p className="muted small">{t('admin.gbp.subtitle')}</p></div>
          <div className="row wrap"><Badge tone={STATUS_TONE[status]}>{t(`admin.integrations.status.${status}`)}</Badge><Link to="/admin/integrations" className="btn btn-ghost btn-sm"><span className="btn-icon" aria-hidden><Icon name="arrow-left" size="sm" /></span><span className="btn-label">{t('admin.gbp.back')}</span></Link></div>
        </div>
        <Card icon="store" title={t('admin.gbp.status')} eyebrow="M-10a">
          {loading && !row ? <EmptyState tone="loading" title={t('core.common.loading')} compact /> : (
            <div className="stack">
              <dl className="grid grid-3 gbp-facts">
                <div className="stack-sm"><dt className="eyebrow">{t('admin.gbp.location')}</dt><dd className="small mono">{locationName || t('admin.gbp.location.none')}</dd></div>
                <div className="stack-sm"><dt className="eyebrow">{t('admin.gbp.account')}</dt><dd className="small">{row?.config?.accountEmail?.trim() || '—'}</dd></div>
                <div className="stack-sm"><dt className="eyebrow">{t('admin.gbp.lastPush')}</dt><dd className="small">{lastPush ? formatDateTime(lastPush, lang) : t('admin.gbp.lastPush.never')}</dd></div>
              </dl>
              <p className="xs muted">{t('admin.gbp.lastPush.hint')}</p>
              <div className="row wrap">
                <Button icon="link" disabled>{t('admin.gbp.connect')}</Button>
                <Button variant="secondary" icon="refresh-cw" disabled>{t('admin.gbp.push')}</Button>
                <Link to="/admin/integrations" className="btn btn-ghost btn-md"><span className="btn-icon" aria-hidden><Icon name="edit" size="sm" /></span><span className="btn-label">{t('admin.gbp.fillFields')}</span></Link>
              </div>
            </div>
          )}
        </Card>
        <Card title={t('admin.gbp.dry.title')}>
          <div className="stack" data-testid="gbp-dry-run">
            <p>{t('admin.gbp.dry.notice')}</p>
            {!hours.confirmed&&<Notice tone="warn" title={t('admin.gbp.dry.unconfirmed')}/>}
            <div className="row wrap"><Button onClick={prepare} disabled={busy||hours.loading}>{t('admin.gbp.dry.prepare')}</Button><Button variant="secondary" onClick={()=>void simulate()} disabled={!prepared||busy||stale}>{t(phase==='error'||phase==='cancelled'?'admin.gbp.dry.retry':'admin.gbp.dry.run')}</Button>{busy&&<Button variant="ghost" onClick={()=>running.current?.abort()}>{t('admin.gbp.dry.cancel')}</Button>}</div>
            <Field label={t('admin.gbp.dry.outcome')}>{id=><Select id={id} disabled={busy} value={outcome} onChange={e=>setOutcome(e.target.value as 'success'|'failure')}><option value="success">{t('admin.gbp.dry.outcome.success')}</option><option value="failure">{t('admin.gbp.dry.outcome.failure')}</option></Select>}</Field>
            <p role={phase==='error'||phase==='invalid'?'alert':'status'} data-testid="gbp-dry-status">{t(`admin.gbp.dry.${stale?'stale':phase}`)}</p>
            {result&&<p className="small" data-testid="gbp-dry-result">{t('admin.gbp.dry.result')} · {formatDateTime(result.finishedAt,lang)}</p>}
            {prepared&&<details open><summary>{t('admin.gbp.dry.snapshot')}</summary><pre className="gbp-json" tabIndex={0} aria-label={t('admin.gbp.dry.snapshot')} data-testid="gbp-prepared-json">{JSON.stringify(prepared.payload,null,2)}</pre></details>}
          </div>
        </Card>
      </>
    ),
    Preview: () => (
      <div className="grid grid-2">
        <Card icon="calendar-clock" title={t('admin.gbp.preview.human')}>
          <div className="stack">
            <p className="small"><strong>{bi(hours.today)}</strong></p>
            <table className="gbp-week small">
              <caption className="sr-only">{t('admin.gbp.preview.human')}</caption>
              <tbody>
                {WEEK_ORDER.map((wd) => { const h = hours.weekly[String(wd)]; return (
                  <tr key={wd}><th scope="row">{DAY_LABEL[lang][wd]}</th><td className={h ? '' : 'muted'}>{h ? `${h.open}–${h.close}` : t('admin.settings.hours.closedCell')}</td></tr>
                ); })}
              </tbody>
            </table>
            <div className="stack-sm">
              <span className="eyebrow">{t('admin.gbp.preview.special', { n: soon.length })}</span>
              {soon.length
                ? <ul className="small integ-notes">{soon.map((o) => <li key={o.id}>{overrideLine(o, lang)}</li>)}</ul>
                : <p className="xs muted">{t('admin.gbp.preview.noSpecial')}</p>}
              <Link to="/admin/settings/hours" className="btn btn-ghost btn-sm"><span className="btn-icon" aria-hidden><Icon name="calendar-clock" size="sm" /></span><span className="btn-label">{t('admin.settings.hours.link.overrides')}</span></Link>
            </div>
          </div>
        </Card>
        <Card icon="code" title={t('admin.gbp.preview.json')}>
          <div className="stack">
            <div className="row wrap"><Button size="sm" variant="secondary" icon="copy" onClick={() => { void copy('json'); }}>{t('admin.gbp.copyJson')}</Button></div>
            <p className="xs mono gbp-endpoint">PATCH {API_BASE}/{locationName || 'locations/{id}'}?updateMask={GOOGLE_HOURS_UPDATE_MASK}</p>
            <pre className="gbp-json" tabIndex={0} aria-label={t('admin.gbp.preview.json')}>{json}</pre>
            <p className="xs muted">{t('admin.gbp.preview.json.note')}</p>
          </div>
        </Card>
      </div>
    ),
    Setup: () => (
      <Card icon="list-checks" title={t('admin.gbp.setup')}>
        <div className="stack">
          <p className="small">{t('admin.gbp.setup.body')}</p>
          <IntegrationSteps def={def} />
          {def.notes && <ul className="xs muted integ-notes">{def.notes.map((n, i) => <li key={i}>{bi(n)}</li>)}</ul>}
          <p className="xs muted">{t('admin.integrations.secrets')} <span className="mono">{def.secrets.join(', ')}</span></p>
        </div>
      </Card>
    ),
    Fallback: () => (
      <Card icon="copy" title={t('admin.gbp.fallback')} tone="muted">
        <div className="stack">
          <p className="small">{t('admin.gbp.fallback.body')}</p>
          <div className="row wrap">
            <Button icon="copy" onClick={() => { void copy('text'); }}>{t('admin.gbp.copyText')}</Button>
            <a href={GOOGLE_PROFILE_URL} target="_blank" rel="noreferrer" className="btn btn-secondary btn-md"><span className="btn-icon" aria-hidden><Icon name="store" size="sm" /></span><span className="btn-label">{t('admin.gbp.openGoogle')} ↗</span></a>
          </div>
          <Notice tone="info" title={t('admin.gbp.fallback.what')}><span className="xs mono" style={{ whiteSpace: 'pre-wrap' }}>{text}</span></Notice>
        </div>
      </Card>
    ),
  };

  return <div className="stack">{sections.filter(isVisible).map((s) => <div key={s} data-section={s}>{SECTIONS[s]?.()}</div>)}</div>;
}
