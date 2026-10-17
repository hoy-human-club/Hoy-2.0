import { useState, type ReactNode } from 'react';
import { type Directory, type AppDependency, type Subscription, type ActualCharge, emptyDirectory, readDirectory, saveDirectory, storageKey, monthlyEstimates, chargeTotals, nextRenewal } from './model';
import './directory.css';
type Candidate = { key: string; name: string; purpose: string };
type Props = { workspaceId: string; workspaceName: string; canRead: boolean; canWrite: boolean; candidates?: Candidate[]; text?: (value: string) => string; expensePreview?: (data: Directory) => ReactNode };
const formatMoney = (n: number | null, currency: string) => n === null ? '—' : new Intl.NumberFormat('en', {style:'currency',currency}).format(n);
const id = () => crypto.randomUUID();
const field = (f: FormData, key: string) => String(f.get(key) ?? '').trim();
const proof = (f: FormData) => ({evidence:field(f,'evidence'), lastVerified:field(f,'lastVerified') || null});
export function DirectoryPanel(props: Props) {
  const t=props.text ?? ((s:string)=>s);
  // Mount the storage reader only for permitted roles.
  return props.canRead ? <DirectoryEditor key={props.workspaceId} {...props} /> : <p role="alert">{t("App subscriptions are restricted to workspace administrators and finance.")}</p>;
}
function DirectoryEditor({workspaceId,workspaceName,canWrite,candidates=[],text:t=(s:string)=>s,expensePreview}: Props) {
  const money = (n: number | null,currency:string) => n === null ? t('Unknown') : formatMoney(n,currency);
  const [initial] = useState(() => { try {return {data:readDirectory(localStorage,workspaceId),raw:localStorage.getItem(storageKey(workspaceId)),error:''};} catch(e) {return {data:emptyDirectory(workspaceId),raw:null,error:`Cannot read saved records: ${String(e)}. Existing data will not be overwritten.`};} });
  const [data,setData] = useState(initial.data);
  const [raw,setRaw] = useState(initial.raw);
  const [error,setError] = useState(initial.error);
  const [editing,setEditing] = useState<AppDependency | null>(null);
  const [subscription,setSubscription] = useState<Subscription | null>(null);
  const [mode,setMode] = useState<'app'|'subscription'|'charge'|null>(null);
  const [filter,setFilter] = useState('');
  function save(next: Directory) {
    if (!canWrite || initial.error) return;
    try {saveDirectory(localStorage,next,raw);setData(next);setRaw(JSON.stringify(next));setMode(null);setError('');} catch(e) {setError(t(e instanceof Error ? e.message : String(e)));}
  }
  function submit(form: HTMLFormElement) {
    const f = new FormData(form);
    if (mode === 'app') {
      const a: AppDependency = {id:editing?.id ?? id(),workspaceId,provider:field(f,'provider'),product:field(f,'product'),purpose:field(f,'purpose'),category:field(f,'category'),officialUrl:field(f,'officialUrl'),manageUrl:field(f,'manageUrl'),relatedProjects:field(f,'relatedProjects').split(',').map(x=>x.trim()).filter(Boolean),connectionState:field(f,'connectionState') as AppDependency['connectionState'],...proof(f)};
      save({...data,dependencies:[...data.dependencies.filter(x=>x.id!==a.id),a]});
    } else if (mode === 'subscription') {
      const date=field(f,'nextChargeDate');
      const s: Subscription = {id:subscription?.id ?? id(),workspaceId,dependencyId:field(f,'dependencyId'),expectedAmount:field(f,'expectedAmount') === '' ? null : Number(field(f,'expectedAmount')),currency:field(f,'currency').toUpperCase(),interval:field(f,'interval') as Subscription['interval'],anchorDay:Number(field(f,'anchorDay')) || (date ? Number(date.slice(-2)) : 1),nextChargeDate:date || null,paymentAccountLabel:field(f,'paymentAccountLabel'),status:field(f,'status') as Subscription['status'],owner:field(f,'owner'),...proof(f)};
      save({...data,subscriptions:[...data.subscriptions.filter(x=>x.id!==s.id),s]});
    } else if (mode === 'charge') {
      const c: ActualCharge = {id:id(),workspaceId,subscriptionId:field(f,'subscriptionId'),amount:Number(field(f,'amount')),currency:field(f,'currency').toUpperCase(),chargedOn:field(f,'chargedOn'),reference:field(f,'reference'),...proof(f)};
      save({...data,charges:[...data.charges,c]});
    }
  }
  const estimates=monthlyEstimates(data.subscriptions), actual=chargeTotals(data.charges);
  const selected = mode === 'app' ? editing : mode === 'subscription' ? subscription : null;
  const input = (label: string,name: string,type='text',required=false, fallback='') => <label>{t(label)}<input name={name} type={type} required={required} min={type==='number' ? '0' : undefined} step={type==='number' ? 'any' : undefined} defaultValue={String((selected as unknown as Record<string,unknown>)?.[name] ?? fallback)} /></label>;
  const select = (label: string,name: string,options: string[],value?: string) => <label>{t(label)}<select name={name} defaultValue={value}>{options.map(o=><option key={o} value={o}>{t(o)}</option>)}</select></label>;
  return <section className="app-directory">
    <header><div><p className="muted">{workspaceName}{' '}{t("· workspace directory")}</p><h1>{t("Apps & subscriptions")}</h1><p>{t("Track what each service does, who owns it, and what it costs.")}</p></div>{canWrite && <button onClick={()=>{setEditing(null);setMode('app');}}>{t("Add app")}</button>}</header>
    <aside className="directory-warning"><strong>{t("Browser-local records · manual tracking")}</strong><p>{t("Saved only in this browser for this workspace. No server sync or backup; clearing site data removes records. Demo role switching is not production authorization. Do not enter secrets or full card numbers. Payment accounts are display labels only.")}</p><p>{t("Email: DISCONNECTED · Bank: DISCONNECTED. No OAuth, bank access, or automatic charge imports.")}</p></aside>
    {error && <p role="alert" className="directory-warning">{error}</p>}
    <div className="directory-summary"><article><h2>{t("Expected monthly estimate")}</h2>{Object.keys(estimates).length ? Object.entries(estimates).map(([c,v])=><p key={c}>{c}: {money(v.amount,c)}{' '}{t("known")}{v.unknown ? ` + ${v.unknown} ${t('unknown')}` : ''}</p>) : <p>{t("No active subscriptions recorded.")}</p>}<small>{t("Active records only. Annual ÷ 12; every 14 days × 26 ÷ 12. No currency conversion.")}</small></article><article><h2>{t("Actual charges recorded")}</h2>{Object.keys(actual).length ? Object.entries(actual).map(([c,n])=><p key={c}>{c}: {money(n,c)}</p>) : <p>{t("No charges recorded.")}</p>}<small>{t("Manual evidence-backed entries, separate from estimates and the demo expense ledger.")}</small></article></div>
    {mode && <form key={`${mode}-${selected?.id ?? 'new'}`} onSubmit={e=>{e.preventDefault();submit(e.currentTarget);}}><h2>{t(mode==='app' ? 'App details' : mode==='subscription' ? 'Subscription details' : 'Record actual charge')}</h2><div className="directory-fields">
      {mode === 'app' && <>{input('Provider','provider','text',true)}{input('Product','product','text',true)}{input('Purpose','purpose','text',true)}{input('Category','category')}{input('Official URL (HTTPS)','officialUrl','url')}{input('Manage URL (HTTPS, no tokens)','manageUrl','url')}{input('Related projects (comma separated)','relatedProjects','text',false,editing?.relatedProjects.join(', ') ?? '')}{select('Connection state','connectionState',['possible','disconnected','manual','verified'],editing?.connectionState ?? 'possible')}</>}
      {mode === 'subscription' && <><label>{t("App")}<select name="dependencyId" defaultValue={subscription?.dependencyId}>{data.dependencies.map(a=><option key={a.id} value={a.id}>{a.provider} · {a.product}</option>)}</select></label>{input('Expected amount (blank = unknown)','expectedAmount','number')}{input('Currency','currency','text',true,'USD')}{select('Interval','interval',['monthly','biweekly','yearly'],subscription?.interval ?? 'monthly')}{input('Next charge date','nextChargeDate','date')}{input('Original billing day (1–31; blank uses date)','anchorDay','number')}{input('Payment account display label (optional)','paymentAccountLabel')}{input('Owner','owner')}{select('Status','status',['unknown','trial','active','paused','cancelled'],subscription?.status ?? 'unknown')}</>}
      {mode === 'charge' && <><label>{t("Subscription")}<select name="subscriptionId">{data.subscriptions.map(s=><option key={s.id} value={s.id}>{data.dependencies.find(a=>a.id===s.dependencyId)?.product} · {s.currency} · {s.owner || t('Owner unknown')}</option>)}</select></label>{input('Amount','amount','number',true)}{input('Currency','currency','text',true,'USD')}{input('Charged on','chargedOn','date',true)}{input('Unique receipt / transaction reference','reference','text',true)}</>}
      {input('Evidence reference (no sensitive content)','evidence','text',mode==='charge')}{input('Last verified date (only with evidence)','lastVerified','date')}
    </div><p>{t("Verification is a manual assertion, never a live connectivity check. “Biweekly” means every 14 days here.")}</p><div className="directory-actions"><button type="submit" disabled={!!initial.error}>{t("Save record")}</button><button type="button" onClick={()=>setMode(null)}>{t("Cancel")}</button></div></form>}
    <div className="directory-actions"><label>{t("Find an app")}<input type="search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder={t("Provider, product, purpose…")} /></label>{canWrite && data.dependencies.length>0 && <button onClick={()=>{setSubscription(null);setMode('subscription');}}>{t("Add subscription")}</button>}{canWrite && data.subscriptions.length>0 && <button onClick={()=>setMode('charge')}>{t("Record charge")}</button>}</div>
    <div className="directory-cards">{data.dependencies.filter(a=>`${a.provider} ${a.product} ${a.purpose} ${a.relatedProjects.join(' ')}`.toLowerCase().includes(filter.toLowerCase())).map(a=><article key={a.id}><div className="directory-actions"><h2>{a.product}</h2><span>{t(a.connectionState)}</span></div><p>{a.provider} · {a.category || t('Uncategorized')}</p><p>{a.purpose}</p><p>{t("Projects:")}{' '}{a.relatedProjects.join(', ') || t('Not recorded')}</p><p>{a.officialUrl && <a href={a.officialUrl} target="_blank" rel="noreferrer">{t("Official site ↗")}</a>} {a.manageUrl && <a href={a.manageUrl} target="_blank" rel="noreferrer">{t("Manage ↗")}</a>}</p><p className="muted">{t("Evidence:")}{' '}{a.evidence || t('None')}{' '}{t("· Verified:")}{' '}{a.lastVerified || t('Unverified')}</p>{canWrite && <button onClick={()=>{setEditing(a);setMode('app');}}>{t("Edit app")}</button>}{data.subscriptions.filter(s=>s.dependencyId===a.id).map(s=><div className="directory-subscription" key={s.id}><strong>{money(s.expectedAmount,s.currency)} / {t(s.interval)} · {t(s.status)}</strong><p>{t("Next:")}{' '}{s.nextChargeDate || t('Unknown')}{' '}{t("· Following:")}{' '}{nextRenewal(s) || t('Unknown')}</p><p>{t("Owner:")}{' '}{s.owner || t('Unknown')}{' '}{t("· Account label:")}{' '}{s.paymentAccountLabel || t('Unknown')}</p><p>{t("Evidence:")}{' '}{s.evidence || t('None')}{' '}{t("· Verified:")}{' '}{s.lastVerified || t('Unverified')}</p>{canWrite && <button onClick={()=>{setSubscription(s);setMode('subscription');}}>{t("Edit subscription")}</button>}</div>)}</article>)}</div>
    {!data.dependencies.length && <p>{t("No app records yet. Add a service you use, or start from a possible integration below.")}</p>}
    <details><summary>{t("Possible integrations (")}{candidates.length}{t(") · not paid-service evidence")}</summary><p>{t("Catalog entries are suggestions only. Adding one creates a possible app with no subscription or charge.")}</p>{candidates.map(c=><div className="directory-candidate" key={c.key}><span><strong>{c.name}</strong> — {c.purpose}</span>{canWrite && <button onClick={()=>{setEditing({id:id(),workspaceId,provider:c.name,product:c.name,purpose:c.purpose,category:'Integration',officialUrl:'',manageUrl:'',relatedProjects:[workspaceName],connectionState:'possible',evidence:'Integration catalog only; not proof of usage or billing.',lastVerified:null});setMode('app');}}>{t("Use")}{' '}{c.name}</button>}</div>)}</details>
    {expensePreview?.(data)}
    <details><summary>{t("Actual charge history (")}{data.charges.length})</summary>{data.charges.map(c=><article key={c.id}><strong>{money(c.amount,c.currency)} · {c.chargedOn}</strong><p>{data.dependencies.find(a=>a.id===data.subscriptions.find(s=>s.id===c.subscriptionId)?.dependencyId)?.product} · {c.reference}</p><p>{t("Evidence:")}{' '}{c.evidence}{' '}{t("· Verified:")}{' '}{c.lastVerified || t('Unverified')}</p></article>)}</details>
  </section>;
}
