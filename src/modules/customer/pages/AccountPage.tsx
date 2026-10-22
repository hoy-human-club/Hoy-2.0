import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData, useTable } from '../../../data/DataContext';
import type { DeletionRequestRow, LegalAcceptanceRow } from '../../../data/schema';
import { formatDate, formatDateTime, dateKey } from '../../../i18n/format';
import { useLayout } from '../../../layout/useLayout';
import { tenant } from '../../../tenant/tenant';
import { useSettings } from '../../admin/settings';
import { useAudit } from '../../staff/audit';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { LEGAL_KINDS, legalTitleKey } from '../legal';
import { canvasSpecs } from '../specs';
import { useMyProfile, useNotificationPrefs } from '../hooks';
import { PageHead } from '../ui';

import { checkAccount, prepareAccountCommand, prepareAccountPreview, readAccountState, offerAccountPreview, type AccountActor, type AccountCommand, type AccountIntent, type AccountOutcome } from '../accountData';

const spec = canvasSpecs['C-26'];

/**
 * C-26 `/app/account` — Cuenta y datos. The account-level rights the stores and Ley 1581 both expect
 * in one place: the consents the member controls, a copy of their own rows, the
 * legal library, and the request to delete the account. Deleting is a *request*: the row goes to
 * `deletion_requests`, admin follows it in M-11, and the anonymisation itself runs server-side later.
 */
export function AccountPage() {
  const { t, lang } = useI18n();
  const data = useData();
  const { user, role } = useSession();
  const { settings } = useSettings();
  const audit = useAudit('app');
  const { sections, isVisible } = useLayout(spec);
  const { profile } = useMyProfile();
  const prefs = useNotificationPrefs();
  const { rows: acceptances } = useTable<LegalAcceptanceRow>('legal_acceptances', { where: { tenant_id: tenant.id, user_id: user.id, kind: 'privacy' } });
  const [requests,setRequests]=useState<DeletionRequestRow[]>([]);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [reason, setReason] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const open = requests.find((r) => r.status === 'requested' || r.status === 'processing') ?? null;
  const privacy = useMemo(() => acceptances.filter(r=>r.tenant_id===tenant.id&&r.user_id===user.id).sort((a, b) => b.accepted_at.localeCompare(a.accepted_at))[0], [acceptances,user.id]);
  const controllerName = settings.branding.displayName || tenant.name;
  const [error,setError]=useState<string|null>(null);
  const [readError,setReadError]=useState(false);
  const [reading,setReading]=useState(true);
  const [exportReady,setExportReady]=useState<{tables:number;rows:number}|null>(null);
  const actorRef=useRef<AccountActor>({userId:user.id,tenantId:tenant.id,role});actorRef.current={userId:user.id,tenantId:tenant.id,role};
  const dataRef=useRef(data);dataRef.current=data;
  const mounted=useRef(true),busyRef=useRef(false),readyRef=useRef(false),readSequence=useRef(0);
  type Pending={key:string;kind:AccountIntent['kind'];context:AccountActor;provider:typeof data;controller:AbortController;preparation:Promise<AccountCommand>;command?:AccountCommand;flight?:Promise<AccountOutcome|undefined>};
  const pending=useRef<Pending|null>(null);
  const sameContext=(context:AccountActor,provider:typeof data)=>dataRef.current===provider&&actorRef.current.userId===context.userId&&actorRef.current.role===context.role&&actorRef.current.tenantId===context.tenantId;
  const discardPending=()=>{pending.current?.controller.abort();pending.current?.command?.discard();pending.current=null;};
  const say=(msg:string)=>setFlash(msg);
  useEffect(()=>{if(!flash)return;const timer=setTimeout(()=>setFlash(null),5000);return()=>clearTimeout(timer);},[flash]);
  const reload=useCallback(async()=>{
    const seq=++readSequence.current,context={...actorRef.current};readyRef.current=false;setReading(true);setReadError(false);setRequests([]);
    try{const result=await readAccountState(data,context,{currentActor:()=>dataRef.current===data?actorRef.current:{...actorRef.current,tenantId:'__changed__'}});
      if(mounted.current&&seq===readSequence.current&&sameContext(context,data)){setRequests(result.requests.sort((a,b)=>b.requested_at.localeCompare(a.requested_at)));readyRef.current=true;}
    }catch{if(mounted.current&&seq===readSequence.current){setReadError(true);setRequests([]);}}
    finally{if(mounted.current&&seq===readSequence.current)setReading(false);}
  },[data,user.id,role]);
  useEffect(()=>{mounted.current=true;discardPending();busyRef.current=false;setBusy(false);setStep(0);setReason('');setUnderstood(false);setExportReady(null);setError(null);setFlash(null);void reload();
    let queued=false;const refresh=()=>{if(queued||busyRef.current)return;queued=true;queueMicrotask(()=>{queued=false;if(mounted.current&&!busyRef.current)void reload();});};
    const unsub=['users','profiles','deletion_requests'].map(table=>data.subscribe(table,refresh));
    return()=>{mounted.current=false;readSequence.current++;readyRef.current=false;discardPending();unsub.forEach(fn=>fn());};
  },[data,user.id,role,reload]);
  const cancelOperation=()=>{discardPending();busyRef.current=false;setBusy(false);setStep(0);setReason('');setUnderstood(false);setExportReady(null);setError(null);say(t('customer.account.mock.cancelled'));void reload();};
  const errorText=(e:unknown)=>{const code=e instanceof Error?e.message:'';const known=['disconnected','forbidden','context','cancelled','missing','open','status','replay','invalid','loading','offer'];return t('customer.account.mock.'+(known.includes(code.slice(8))?code==='account_offer'?'offerFailed':code.slice(8):'failed'));};
  const operate=(kind:AccountIntent['kind'],execute=true,targetId?:string):Promise<AccountOutcome|undefined>=>{
    const key=kind==='request'?JSON.stringify({kind,reason:reason.trim()}):kind==='cancel'?JSON.stringify({kind,targetId}):kind;
    const previous=pending.current;
    if(busyRef.current){if(previous?.key===key&&previous.flight)return previous.flight;return Promise.resolve(undefined);}
    try{checkAccount(data,actorRef.current);if(!readyRef.current)throw Error('account_loading');}catch(e){setError(errorText(e));return Promise.resolve(undefined);}
    if(previous&&previous.key!==key)discardPending();
    let operation=pending.current;
    if(!operation){
      const context={...actorRef.current},controller=new AbortController(),nonce=crypto.randomUUID();
      const control={signal:controller.signal,currentActor:()=>dataRef.current===data?actorRef.current:{...actorRef.current,tenantId:'__changed__'}};
      const preparation=(async()=>{
        if(kind==='export'){
          const preview=await prepareAccountPreview(data,context,control);
          const command=await prepareAccountCommand(data,context,{kind:'export',preview},nonce);
          if(controller.signal.aborted||!sameContext(context,data)){command.discard();throw Error('account_cancelled');}
          setExportReady({tables:Object.keys(preview.tables).length,rows:Object.values(preview.tables).reduce((n,rows)=>n+rows.length,0)});return command;
        }
        return prepareAccountCommand(data,context,kind==='request'?{kind,reason}:{kind,requestId:targetId??''},nonce);
      })();
      operation={key,kind,context,controller,provider:data,preparation};pending.current=operation;
    }
    const current=operation;busyRef.current=true;setBusy(true);setError(null);setFlash(null);
    current.flight=(async()=>{
      try{
        current.command=await current.preparation;
        if(!mounted.current||pending.current!==current||current.controller.signal.aborted||!sameContext(current.context,current.provider)){current.command.discard();return;}
        if(!execute)return;
        const control={signal:current.controller.signal,currentActor:()=>sameContext(current.context,current.provider)?actorRef.current:{...actorRef.current,tenantId:'__changed__'}};
        const outcome=await current.command.execute(control);
        if(!mounted.current||pending.current!==current||current.controller.signal.aborted||!sameContext(current.context,current.provider)){current.command.discard();return outcome;}
        if(kind==='export'){
          const preview=await current.command.takePreview(control);
          if(!mounted.current||pending.current!==current||current.controller.signal.aborted||!sameContext(current.context,current.provider)){current.command.discard();return outcome;}
          if(!preview)throw Error('account_offer');
          try{offerAccountPreview(`${tenant.slug}-fictional-account-${dateKey()}.json`,preview);}catch{current.command.discard();pending.current=null;setExportReady(null);throw Error('account_offer');}
          setExportReady(null);say(t('customer.account.export.done'));
        }else{setStep(0);setReason('');setUnderstood(false);say(t(outcome.replayed?'customer.account.mock.replayed':kind==='request'?'customer.account.delete.sent':'customer.account.delete.cancelled'));}
        current.command.discard();pending.current=null;return outcome;
      }catch(e){
        if(!current.command&&pending.current===current)pending.current=null;
        if(mounted.current&&!current.controller.signal.aborted&&sameContext(current.context,current.provider))setError(errorText(e));
        return undefined;
      }finally{
        current.flight=undefined;
        if(mounted.current&&(pending.current===current||!pending.current)&&sameContext(current.context,current.provider)){busyRef.current=false;setBusy(false);if(execute)void reload();}
      }
    })();return current.flight;
  };

  const setMarketing = async (channel: 'whatsapp' | 'email', on: boolean) => {
    await prefs.set(channel, 'marketing', on);
    const otherOn = prefs.isEnabled(channel === 'whatsapp' ? 'email' : 'whatsapp', 'marketing');
    if (profile) await data.update('profiles', profile.id, { marketing_optin: on || otherOn });
    await audit('consent.marketing', 'notification_prefs', null, { channel, after: on });
  };

  const exportData=()=>{void operate('export',false);};
  const requestDeletion=()=>{if(understood)void operate('request');};
  const cancelDeletion=()=>{if(open)void operate('cancel',true,open.id);};

  const SECTIONS: Record<string, () => ReactNode> = {
    ConsentToggles: () => (
      <ListGroup title={t('customer.account.consents')}>
        <ListRow icon="whatsapp" title={t('customer.account.consent.marketingWa')} subtitle={t('customer.account.consent.marketing.sub')} trailing={<Toggle size="sm" checked={prefs.isEnabled('whatsapp', 'marketing')} onChange={(v) => { void setMarketing('whatsapp', v); }} label="" />} />
        <ListRow icon="mail" title={t('customer.account.consent.marketingEmail')} subtitle={t('customer.account.consent.marketing.sub')} trailing={<Toggle size="sm" checked={prefs.isEnabled('email', 'marketing')} onChange={(v) => { void setMarketing('email', v); }} label="" />} />
        <ListRow icon="shield" title={t('customer.account.consent.processing')} subtitle={privacy ? t('customer.account.consent.processing.on', { v: privacy.version, date: formatDate(privacy.accepted_at, lang, { dateStyle: 'long' }) }) : t('customer.account.consent.processing.off')} to="/app/legal/privacy" trailing={<Badge tone={privacy ? 'success' : 'warn'}>{privacy ? `v${privacy.version}` : t('customer.legal.notAccepted.short')}</Badge>} />
        <ListRow icon="bell" title={t('customer.notifications.prefs.title')} subtitle={t('customer.notifications.prefs.byCategory')} to="/app/notifications" />
      </ListGroup>
    ),
    ExportData: () => (
      <Card eyebrow={t('customer.account.export')} padding="md">
        <p className="small">{t('customer.account.export.body')}</p>
        <div className="row wrap" style={{ marginTop: 'var(--sp-md)' }}>
          <Button size="sm" variant="secondary" loading={busy&&pending.current?.kind==='export'} disabled={busy||reading||readError||!!exportReady} onClick={exportData}>{t('customer.account.export.cta')}</Button>
          <Link to="/app/history" className="small">{t('core.nav.history')} →</Link>
        </div>
      </Card>
    ),
    LegalLinks: () => (
      <ListGroup title={t('customer.profile.legal')}>
        {LEGAL_KINDS.map((k) => <ListRow key={k} title={t(legalTitleKey(k))} to={`/app/legal/${k}`} />)}
      </ListGroup>
    ),
    DeleteAccount: () => open ? (
      <Card tone="highlight" eyebrow={t('customer.account.delete')} padding="md">
        <div className="row wrap" style={{ marginBottom: 'var(--sp-sm)' }}>
          <Badge tone={open.status === 'processing' ? 'primary' : 'warn'}>{t(`customer.account.status.${open.status}`)}</Badge>
          <span className="xs muted">{t('customer.account.delete.requestedOn', { date: formatDateTime(open.requested_at, lang) })}</span>
        </div>
        <p className="small">{t(open.status === 'processing' ? 'customer.account.delete.processing.body' : 'customer.account.delete.pending.body')}</p>
        <p className="xs muted" style={{ marginTop: 'var(--sp-sm)' }}>{t('customer.account.delete.retention')}</p>
        {open.status === 'requested' && <Button size="sm" variant="ghost" disabled={busy||reading||readError} onClick={cancelDeletion} style={{ marginTop: 'var(--sp-md)' }}>{t('customer.account.delete.cancel')}</Button>}
      </Card>
    ) : (
      <ListGroup title={t('customer.account.delete')}>
        <ListRow disabled={busy||reading||readError||!!exportReady} icon="trash" tone="danger" title={t('customer.profile.delete')} subtitle={t('customer.account.delete.sub')} onClick={() => {if(!busyRef.current&&readyRef.current){discardPending();setError(null);setStep(1);}}} />
      </ListGroup>
    ),
  };

  return (
    <div className="container page cust-page">
      <PageHead title={t('customer.account.title')} sub={t('customer.account.sub')} back="/app/profile" />
      <Notice tone="warn">{t('customer.account.mock.boundary')}</Notice>
      {flash && <Notice tone="info">{flash}</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}
      {reading && <p role="status">{t('core.common.loading')}</p>}
      {readError && <Notice tone="danger" action={<Button size="sm" onClick={()=>{void reload();}}>{t('customer.account.mock.retryRead')}</Button>}>{t('customer.account.mock.readFailed')}</Notice>}
      {busy && <Button variant="ghost" onClick={cancelOperation}>{t('core.common.cancel')}</Button>}
      <div className="stack">
        {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
      </div>

      <Drawer open={!!exportReady} onClose={cancelOperation} side="bottom" title={t('customer.account.mock.previewTitle')} footer={<><Button variant="ghost" onClick={cancelOperation}>{t('core.common.cancel')}</Button><Button disabled={busy||reading||readError} loading={busy} onClick={()=>{void operate('export');}}>{t('customer.account.mock.offer')}</Button></>}>
        <div className="stack">{error&&<Notice tone="danger">{error}</Notice>}<Notice tone="warn">{t('customer.account.mock.previewBody')}</Notice><p>{t('customer.account.mock.counts',{tables:exportReady?.tables??0,rows:exportReady?.rows??0})}</p></div>
      </Drawer>

      {/* Step 1 — what deleting means. Step 2 — the confirmation itself. Two taps, nothing destructive on the first. */}
      <Drawer open={step === 1} onClose={cancelOperation} side="bottom" title={t('customer.profile.delete.confirm.title')}
        footer={<><Button variant="ghost" onClick={cancelOperation}>{t('core.common.cancel')}</Button><Button variant="danger" disabled={!understood||busy||reading||readError} onClick={() => setStep(2)}>{t('customer.account.delete.next')}</Button></>}>
        <div className="stack">
          <Notice tone="warn">{t('customer.account.mock.boundary')}</Notice>
          <Notice tone="warn" title={t('customer.account.delete.what')}>{t('customer.account.delete.what.body')}</Notice>
          <ul className="cust-checklist small">
            <li>{t('customer.account.delete.keep.invoices')}</li>
            <li>{t('customer.account.delete.keep.profile')}</li>
            <li>{t('customer.account.delete.keep.access')}</li>
            <li>{t('customer.account.delete.keep.time')}</li>
          </ul>
          <label className="field-label"><span>{t('customer.account.delete.reason')}</span></label>
          <textarea className="input cust-textarea" disabled={busy} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('customer.account.delete.reason.ph')} aria-label={t('customer.account.delete.reason')} />
          <Toggle size="sm" disabled={busy} checked={understood} onChange={setUnderstood} label={t('customer.account.delete.understood')} />
          <p className="xs muted">{t('customer.profile.legal.law')} · <Link to="/app/legal/privacy">{t('customer.profile.legal.privacy')}</Link></p>
        </div>
      </Drawer>
      <Drawer open={step === 2} onClose={cancelOperation} side="bottom" title={t('customer.account.delete.confirm2.title')}>
        <div className="stack">
          <Notice tone="warn">{t('customer.account.mock.boundary')}</Notice>
          {error && <Notice tone="danger">{error}</Notice>}
          <Notice tone="danger">{t('customer.account.delete.confirm2.body', { name: controllerName })}</Notice>
          <Button block variant="danger" loading={busy} disabled={busy||reading||readError||!understood} onClick={requestDeletion}>{t('customer.account.delete.cta')}</Button>
          <Button block variant="ghost" onClick={() => {if(!busyRef.current&&readyRef.current){discardPending();setError(null);setStep(1);}}}>{t('core.nav.back')}</Button>
        </div>
      </Drawer>
    </div>
  );
}
