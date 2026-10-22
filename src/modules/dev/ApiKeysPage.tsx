import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { ApiKeyEnvironment, ApiKeyRow } from '../../data/schema';
import { formatDate, formatDateTime } from '../../i18n/format';
import { useLayout } from '../../layout/useLayout';
import { useActions } from '../../actions/bus';
import type { ActionHandler } from '../../actions/types';
import { toast } from '../../app/toast';
import { copyText } from '../../app/clipboard';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Badge, type BadgeTone } from '../../components/atom/Badge/Badge';
import { Notice } from '../../components/molecule/Notice/Notice';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { API_KEY_SCOPES, keyStatus, type ApiKeyStatus } from './apiKeys';
import { apiKeysSpec } from './specs';
import { API_REQUEST_SCENARIOS, fictionalApiResponse, type ApiRequestScenario, type ApiFixtureResponse } from './apiRequestFixture';
import { tenant } from '../../tenant/tenant';
import { apiKeyDraftFromAction, findApiKey, prepareApiKeyMutation, validateApiKeyDraft, type ApiKeyActor, type ApiKeyIntent, type ApiKeyDraft, type PreparedApiKeyMutation, type ApiKeyResult } from './apiKeyMutation';
import './dev.css';

const STATUS_TONE: Record<ApiKeyStatus, BadgeTone> = { active: 'success', expiring: 'warn', expired: 'neutral', revoked: 'danger', invalid: 'warn' };
const EXPIRY_DAYS = [0, 30, 90, 365] as const;

type Draft = ApiKeyDraft;
const EMPTY: Draft = { name: '', environment: 'test', scopes: ['classes.read', 'hours.read'], expiryDays: 90 };

/**
 * D-07 `/dev/api-keys` (0041, D-0018) — keys HoyOS issues to developers. Hashed at rest, shown once, scoped,
 * rotated with a 24-hour grace period, revoked by stamping revoked_at. Nothing verifies them yet: that is the server.
 */
export function ApiKeysPage() {
  const { t, lang } = useI18n();
  const { can, user, role } = useSession();
  const data = useData();
  const { sections, isVisible } = useLayout(apiKeysSpec);
  const { rows, loading } = useTable<ApiKeyRow>('api_keys', { where: { tenant_id: can('api_keys.read') ? tenant.id : '__denied__' }, orderBy: { column: 'created_at', dir: 'desc' } });
  const canWrite = can('api_keys.write');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [shown, setShown] = useState<{ raw: string; row: ApiKeyRow; rotatedFrom?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [mutationNote,setMutationNote] = useState<string | null>(null);
  const actorRef=useRef<ApiKeyActor>({actorId:user.id,role,tenantId:tenant.id});
  actorRef.current={actorId:user.id,role,tenantId:tenant.id};
  const contextRef=useRef(data);contextRef.current=data;
  const pending=useRef<{intentKey:string; requestId:string; preparation:Promise<PreparedApiKeyMutation>; prepared?:PreparedApiKeyMutation; controller:AbortController; flight?:Promise<ApiKeyResult>; context:ApiKeyActor; provider:typeof data} | null>(null);
  const displayOpen=useRef(false);
  const mounted=useRef(true);
  const closeShown=()=>{displayOpen.current=false;setShown(null);};
  const cancelMutation=()=>{const current=pending.current;current?.controller.abort();current?.prepared?.discard();pending.current=null;setBusy(false);setDraft(null);setConfirmRevoke(null);setError(null);setMutationNote('dev.apiKeys.mutation.cancelled');};
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;pending.current?.controller.abort();pending.current?.prepared?.discard();pending.current=null;displayOpen.current=false;};},[]);
  useEffect(()=>{pending.current?.controller.abort();pending.current?.prepared?.discard();pending.current=null;closeShown();setDraft(null);setBusy(false);setConfirmRevoke(null);setError(null);},[user.id,role,data]);

  const [scenario, setScenario] = useState<ApiRequestScenario>('valid');
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestResult, setRequestResult] = useState<ApiFixtureResponse | null>(null);
  const [failNext, setFailNext] = useState(false);
  const requestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (requestTimer.current) clearTimeout(requestTimer.current); }, []);
  const cancelRequest = () => {
    if (requestTimer.current) clearTimeout(requestTimer.current);
    requestTimer.current = null; setRequestBusy(false); setRequestResult(null);
  };
  const tryFictionalRequest = () => {
    cancelRequest(); setRequestBusy(true);
    const selected = scenario, fail = failNext;
    setFailNext(false);
    requestTimer.current = setTimeout(() => {
      requestTimer.current = null;
      setRequestResult(fictionalApiResponse(selected, fail)); setRequestBusy(false);
    }, 450);
  };

  const mutationError=(e:unknown)=>{
    const code=e instanceof Error?e.message:'';
    return t(`dev.apiKeys.mutation.${['name','scopes','environment','expiry','invalid','rotate_dead','changed','context_changed','forbidden','disconnected','missing','replay_conflict','cancelled','finish_display'].map(k=>'api_key_'+k).includes(code)?code.slice(8):'failed'}`);
  };
  const actor = () => ({...actorRef.current});
  const guard = () => { if (!canWrite) throw Error('api_key_forbidden'); };
  const find = (idOrPrefix:string) => findApiKey(data,actor(),idOrPrefix);
  const runMutation=(input:ApiKeyIntent):Promise<ApiKeyResult>=>{
    guard();
    const intent:ApiKeyIntent=input.kind==='create'?{kind:'create',draft:validateApiKeyDraft(input.draft)}:input;
    const intentKey=JSON.stringify(intent), prior=pending.current;
    if(prior?.flight){if(prior.intentKey===intentKey)return prior.flight;throw Error('api_key_changed');}
    if(displayOpen.current)throw Error('api_key_finish_display');
    if(prior && prior.intentKey!==intentKey){prior.controller.abort();prior.prepared?.discard();pending.current=null;}
    let operation=pending.current;
    if(!operation){
      const requestId=crypto.randomUUID(),context=actor(),controller=new AbortController();
      const preparation=prepareApiKeyMutation(data,context,intent,requestId);
      operation={intentKey,requestId,context,provider:data,controller,preparation};pending.current=operation;
    }
    const current=operation;
    setBusy(true);setError(null);setMutationNote(null);
    current.flight=(async()=>{
      try{
        current.prepared=await current.preparation;
        if(pending.current!==current || current.controller.signal.aborted){current.prepared.discard();throw Error('api_key_cancelled');}
        const result=await current.prepared.execute({signal:current.controller.signal,currentActor:()=>contextRef.current===current.provider?actor():{...actor(),tenantId:'__changed__'}});
        if(pending.current!==current || !mounted.current || current.controller.signal.aborted){current.prepared.discard();return result;}
        const raw=current.prepared.takeRaw(result);
        if(raw){
          if(actorRef.current.actorId!==current.context.actorId || actorRef.current.role!==current.context.role || contextRef.current!==current.provider){current.prepared.discard();return result;}
          const saved=(await data.list<ApiKeyRow>('api_keys',{where:{tenant_id:current.context.tenantId,id:result.rowId}})).find(k=>k.id===result.rowId && k.tenant_id===current.context.tenantId);
          if(saved && saved.tenant_id===current.context.tenantId && actorRef.current.actorId===current.context.actorId && actorRef.current.role===current.context.role && !current.controller.signal.aborted && pending.current===current){displayOpen.current=true;setShown({raw,row:saved,rotatedFrom:result.rotatedFrom});}
        }else setMutationNote(result.replayed?'dev.apiKeys.mutation.replayed':'dev.apiKeys.mutation.completed');
        current.prepared.discard();pending.current=null;setDraft(null);
        if(result.kind==='revoke')toast(t('dev.apiKeys.revoked',{prefix:result.prefix}),'success');
        return result;
      }catch(e){
        if(!current.prepared && pending.current===current)pending.current=null;
        if(mounted.current && (pending.current===current || !pending.current) && !current.controller.signal.aborted){setError(mutationError(e));setMutationNote('dev.apiKeys.mutation.retry');}
        throw e;
      }finally{current.flight=undefined;if(mounted.current && (pending.current===current || !pending.current))setBusy(false);}
    })();
    return current.flight;
  };
  const create=(draft:Draft)=>runMutation({kind:'create',draft});
  const rotate=(old:ApiKeyRow)=>runMutation({kind:'rotate',targetId:old.id});
  const revoke=(old:ApiKeyRow)=>runMutation({kind:'revoke',targetId:old.id});
  const reportError=(e:unknown)=>{if(mounted.current && roleCanWrite() && !(e instanceof Error && ['api_key_cancelled','api_key_context_changed'].includes(e.message)))setError(mutationError(e));};
  const roleCanWrite=()=>actorRef.current.actorId===user.id && actorRef.current.role===role && contextRef.current===data && canWrite;
  const submit=async()=>{if(draft)try{await create(draft);}catch(e){reportError(e);}};
  const onRevoke=async(k:ApiKeyRow)=>{
    if(confirmRevoke!==k.id){setConfirmRevoke(k.id);return;}
    try{await revoke(k);setConfirmRevoke(null);}catch(e){reportError(e);}
  };
  const onRotate=async(k:ApiKeyRow)=>{try{await rotate(k);}catch(e){reportError(e);}};
  const copyRaw = async () => {
    if (!shown) return;
    const ok = await copyText(shown.raw);
    toast(ok ? t('dev.apiKeys.copied') : t('dev.apiKeys.copyFailed'), ok ? 'success' : 'danger');
  };

  // WebMCP: same writes and audit; the raw key is shown on screen, never returned to the caller.
  const impl = useMemo<Record<string, ActionHandler>>(() => ({
    'dev.apiKeys.create': async (p) => {
      const draft=apiKeyDraftFromAction(p);
      const k = await create(draft);
      if(k.replayed)return t('dev.apiKeys.mutation.actionReplay',{prefix:k.prefix});
      return `created ${k.prefix}… (${draft.environment}); the full key is shown once on screen and is not returned here`;
    },
    'dev.apiKeys.rotate': async (p) => {
      const old = await find(p?.id?.trim() ?? '');
      if (!old) throw new Error('api_key_missing');
      const k = await rotate(old);
      if(k.replayed)return t('dev.apiKeys.mutation.actionReplay',{prefix:k.prefix});
      return `rotated ${old.prefix}… → ${k.prefix}…; the old key works for 24 h; the new key is shown once on screen`;
    },
    'dev.apiKeys.revoke': async (p) => {
      const k = await find(p?.id?.trim() ?? '');
      if (!k) throw new Error('api_key_missing');
      await revoke(k);
      return `revoked ${k.prefix}…`;
    },
  }), [rows, canWrite, user.id, role, data, t]);
  useActions(apiKeysSpec, impl);

  const replaces = (k: ApiKeyRow) => (k.replaces_id ? rows.find((r) => r.id === k.replaces_id)?.prefix : null);
  const columns: DataTableColumn<ApiKeyRow>[] = [
    // Name, prefix and lineage share one cell, and created / last used another, so the table fits 1280 without scrolling.
    { key: 'name', label: t('dev.apiKeys.col.name'), render: (k) => <span className="apikeys-cell"><strong className="small">{k.name}</strong><code className="xs">{k.prefix}…</code>{replaces(k) && <span className="xs muted">{t('dev.apiKeys.replaces', { prefix: replaces(k)! })}</span>}</span> },
    { key: 'environment', label: t('dev.apiKeys.col.env'), render: (k) => <Badge tone={k.environment === 'live' ? 'primary' : 'neutral'}>{t(`dev.apiKeys.env.${k.environment}`)}</Badge> },
    { key: 'scopes', label: t('dev.apiKeys.col.scopes'), sortable: false, render: (k) => <span className="apikeys-scopes">{k.scopes.map((s) => <Badge key={s}>{s}</Badge>)}</span> },
    { key: 'created_at', label: t('dev.apiKeys.col.created'), render: (k) => <span className="apikeys-cell"><span className="small">{formatDate(k.created_at, lang)}</span><span className="xs muted">{t('dev.apiKeys.col.lastUsed')}: {k.last_used_at ? formatDateTime(k.last_used_at, lang) : t('dev.apiKeys.never')}</span></span> },
    { key: 'revoked_at', label: t('dev.apiKeys.col.status'), sortable: false, render: (k) => { const st = keyStatus(k); return <span className="apikeys-cell"><Badge tone={STATUS_TONE[st]}>{t(`dev.apiKeys.status.${st}`)}</Badge>{st === 'expiring' && k.expires_at && <span className="xs muted">{formatDateTime(k.expires_at, lang)}</span>}</span>; } },
    ...(canWrite ? [{ key: 'actions', label: t('dev.apiKeys.col.actions'), sortable: false, render: (k: ApiKeyRow) => {
      const st = keyStatus(k);
      if (st === 'revoked' || st === 'expired') return <span className="xs muted">—</span>;
      return (
        <span className="row apikeys-actions">
          <Button size="sm" variant="secondary" icon="refresh-cw" disabled={busy || !!shown || st === 'invalid'} onClick={() => { void onRotate(k); }}>{t('dev.apiKeys.rotate')}</Button>
          <Button size="sm" variant="danger" icon="close" disabled={busy || !!shown} onClick={() => { void onRevoke(k); }}>{confirmRevoke === k.id ? t('dev.apiKeys.revoke.confirm') : t('dev.apiKeys.revoke')}</Button>
        </span>
      );
    } } as DataTableColumn<ApiKeyRow>] : []),
  ];

  const SECTIONS: Record<string, () => ReactNode> = {
    Intro: () => (
      <>
        <div className="page-head">
          <div><h1>{t('dev.apiKeys.title')}</h1><p className="muted small">{t('dev.apiKeys.subtitle')}</p></div>
          <div className="row wrap">
            {!canWrite && <Badge tone="warn">{t('dev.apiKeys.readonly')}</Badge>}
            {canWrite && <Button icon="plus" disabled={busy || !!shown} onClick={() => { pending.current?.prepared?.discard();pending.current=null;setDraft({ ...EMPTY });setError(null);setMutationNote(null); }}>{t('dev.apiKeys.create')}</Button>}
          </div>
        </div>
        <Notice tone="warn">{t('dev.apiKeys.mutation.boundary')}</Notice>
        <Notice tone="info" icon="key-round" title={t('dev.apiKeys.intro.title')} action={<Link to="/admin/integrations" className="small">{t('dev.apiKeys.intro.outbound')} →</Link>}>
          {t('dev.apiKeys.intro.body')} <code className="xs">Authorization: Bearer hoy_live_…</code>
        </Notice>
      </>
    ),
    Keys: () => (
      <Card icon="key-round" title={t('dev.apiKeys.list')} eyebrow={t('dev.apiKeys.list.count', { n: rows.length, active: rows.filter((k) => keyStatus(k) === 'active' || keyStatus(k) === 'expiring').length })}>
        {loading && rows.length === 0
          ? <EmptyState tone="loading" title={t('core.common.loading')} compact />
          : rows.length === 0
            ? <EmptyState icon="key-round" title={t('dev.apiKeys.empty')} body={t('dev.apiKeys.empty.body')} compact />
            : <DataTable<ApiKeyRow> columns={columns} rows={rows} rowKey={(k) => k.id} dense />}
      </Card>
    ),
    TryRequest: () => (
      <Card icon="code" title={t('dev.apiFixture.title')} tone="muted">
        <div className="stack" data-testid="api-fixture-console">
          <Notice tone="warn">{t('dev.apiFixture.boundary')}</Notice>
          <p className="small">{t('dev.apiFixture.endpoint')} <code>MOCK /v1/hours</code></p>
          <Field label={t('dev.apiFixture.scenario')}>{(id) => <Select id={id} value={scenario} disabled={requestBusy} onChange={e => { setScenario(e.target.value as ApiRequestScenario); setRequestResult(null); }}>{API_REQUEST_SCENARIOS.map(value => <option key={value} value={value}>{t(`dev.apiFixture.${value}`)}</option>)}</Select>}</Field>
          <Toggle checked={failNext} disabled={requestBusy} onChange={setFailNext} label={t('dev.apiFixture.failNext')} />
          <div className="row wrap">
            <Button variant="secondary" icon="play" disabled={requestBusy} onClick={tryFictionalRequest}>{t(requestResult?.status === 503 ? 'dev.apiFixture.retry' : 'dev.apiFixture.run')}</Button>
            <Button variant="ghost" onClick={cancelRequest}>{t('dev.apiFixture.cancel')}</Button>
          </div>
          {requestBusy && <p role="status">{t('dev.apiFixture.loading')}</p>}
          {requestResult && <div className="stack-sm" role="status"><Badge tone={requestResult.status === 200 ? 'success' : requestResult.status === 503 ? 'warn' : 'danger'}>{t('dev.apiFixture.status', { status: requestResult.status })}</Badge><pre className="apikeys-curl" tabIndex={0} data-testid="api-fixture-response">{JSON.stringify(requestResult.body, null, 2)}</pre><p className="small muted">{t('dev.apiFixture.resultBoundary')}</p></div>}
        </div>
      </Card>
    ),
  };

  return (
    <div className="stack">
      {error && !draft && <Notice tone="danger">{error}</Notice>}
      {mutationNote && <Notice tone="info"><span role="status">{t(mutationNote)}</span></Notice>}
      {busy && <Button variant="ghost" onClick={cancelMutation}>{t('core.common.cancel')}</Button>}
      {sections.filter(isVisible).map((s) => <div key={s} data-section={s}>{SECTIONS[s]?.()}</div>)}

      <Drawer
        open={!!draft} onClose={cancelMutation} width={520} title={t('dev.apiKeys.create')}
        footer={draft ? <div className="row-between wrap"><Button variant="ghost" size="sm" onClick={cancelMutation}>{t('core.common.cancel')}</Button><Button size="sm" icon="key-round" loading={busy} onClick={submit}>{t('dev.apiKeys.create.submit')}</Button></div> : undefined}
      >
        {draft && (
          <div className="stack">
            {error && <Notice tone="danger">{error}</Notice>}
            <Field label={t('dev.apiKeys.f.name')} hint={t('dev.apiKeys.f.name.hint')} required>{(id) => <Input id={id} disabled={busy} value={draft.name} placeholder={t('dev.apiKeys.f.name.ph')} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />}</Field>
            <div className="grid grid-2">
              <Field label={t('dev.apiKeys.f.env')} hint={t('dev.apiKeys.f.env.hint')}>{(id) => <Select id={id} disabled={busy} value={draft.environment} onChange={(e) => setDraft({ ...draft, environment: e.target.value as ApiKeyEnvironment })}><option value="test">{t('dev.apiKeys.env.test')}</option><option value="live">{t('dev.apiKeys.env.live')}</option></Select>}</Field>
              <Field label={t('dev.apiKeys.f.expiry')}>{(id) => <Select id={id} disabled={busy} value={draft.expiryDays} onChange={(e) => setDraft({ ...draft, expiryDays: Number(e.target.value) })}>{EXPIRY_DAYS.map((d) => <option key={d} value={d}>{d ? t('dev.apiKeys.f.expiry.days', { n: d }) : t('dev.apiKeys.f.expiry.never')}</option>)}</Select>}</Field>
            </div>
            <fieldset className="stack-sm apikeys-scopes-field">
              <legend className="eyebrow">{t('dev.apiKeys.f.scopes')}</legend>
              {API_KEY_SCOPES.map((s) => <Toggle key={s} disabled={busy} size="sm" checked={draft.scopes.includes(s)} label={`${s} — ${t(`dev.apiKeys.scope.${s}`)}`} onChange={(on) => setDraft({ ...draft, scopes: on ? [...draft.scopes, s] : draft.scopes.filter((x) => x !== s) })} />)}
            </fieldset>
          </div>
        )}
      </Drawer>

      <Drawer
        open={!!shown} onClose={closeShown} width={560} title={shown?.rotatedFrom ? t('dev.apiKeys.shown.rotated') : t('dev.apiKeys.shown.title')}
        footer={shown ? <div className="row-between wrap"><Button variant="secondary" size="sm" icon="copy" onClick={() => { void copyRaw(); }}>{t('dev.apiKeys.copy')}</Button><Button size="sm" onClick={closeShown}>{t('dev.apiKeys.shown.done')}</Button></div> : undefined}
      >
        {shown && (
          <div className="stack">
            <Notice tone="warn" icon="eye-off" title={t('dev.apiKeys.shown.once')}>{t('dev.apiKeys.shown.once.body')}</Notice>
            <pre className="apikeys-raw" tabIndex={0} aria-label={t('dev.apiKeys.shown.title')} data-testid="api-key-raw">{shown.raw}</pre>
            <p className="xs muted">{t('dev.apiKeys.shown.meta', { name: shown.row.name, prefix: shown.row.prefix, env: t(`dev.apiKeys.env.${shown.row.environment}`) })}</p>
            {shown.rotatedFrom && <p className="small">{t('dev.apiKeys.shown.grace', { prefix: shown.rotatedFrom })}</p>}
          </div>
        )}
      </Drawer>
    </div>
  );
}
