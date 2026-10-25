import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Link,useSearchParams,useLocation} from 'react-router-dom';
import {useData} from '../../../data/DataContext';
import {useSession} from '../../../auth/SessionProvider';
import {ROLE_LABEL} from '../../../auth/roles';
import {useI18n} from '../../../i18n/I18nProvider';
import {tenant} from '../../../tenant/tenant';
import {dateKey} from '../../../i18n/format';
import {Button} from '../../atom/Button/Button';
import {Input,Select} from '../../atom/Input/Input';
import {Badge} from '../../atom/Badge/Badge';
import {Card} from '../../molecule/Card/Card';
import {Field} from '../../molecule/Field/Field';
import {Notice} from '../../molecule/Notice/Notice';
import {Drawer} from '../Drawer/Drawer';
import {blankDraft,brandReferences,draftErrors,draftKey,monthDays,readDrafts,runDraftCommand,shiftMonth,validDay,type DraftSnapshot,type MarketingDraft,type DraftCommand} from '../../../modules/marketing/drafts';
import './MarketingDraftBoard.css';
export function MarketingDraftBoard(){
 const data=useData(),{user,role}=useSession(),{t,bi}=useI18n(),[params,setParams]=useSearchParams(),location=useLocation(),currentUrl=location.pathname+location.search;
 const context=useMemo(()=>({tenantId:tenant.id,actorId:user.id,role,adapter:data.name}),[user.id,role,data]);
 const [loadedContext,setLoadedContext]=useState<typeof context|null>(null);
 const [snapshot,setSnapshot]=useState<DraftSnapshot|null>(null),[loading,setLoading]=useState(true),[readError,setReadError]=useState(false),[revision,setRevision]=useState(0);
 const [edit,setEdit]=useState<MarketingDraft|null>(null),[expected,setExpected]=useState(0),[request,setRequest]=useState(''),[preview,setPreview]=useState(false),[discard,setDiscard]=useState(false),[invalid,setInvalid]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false);
 const [month,setMonth]=useState(()=>dateKey().slice(0,7));const generation=useRef(0);
 type Editor={context:typeof context;route:string|null;url:string;existing:boolean};
 type Operation={editor:Editor;cancelled:boolean};
 const mounted=useRef(true),scopeRef=useRef(context),urlRef=useRef(currentUrl),editorRef=useRef<Editor|null>(null),operation=useRef<Operation|null>(null);
 scopeRef.current=context;urlRef.current=currentUrl;
 const validEditor=(editor:Editor)=>mounted.current&&editorRef.current===editor&&scopeRef.current===editor.context&&urlRef.current===editor.url;
 const validOperation=(op:Operation)=>operation.current===op&&!op.cancelled&&validEditor(op.editor);
 function cancelOperation(){if(operation.current)operation.current.cancelled=true;operation.current=null;}
 const resetEditor=useCallback(()=>{if(operation.current)operation.current.cancelled=true;operation.current=null;editorRef.current=null;setEdit(null);setPreview(false);setDiscard(false);setInvalid(false);setError('');setBusy(false);},[]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(operation.current)operation.current.cancelled=true;operation.current=null;editorRef.current=null;};},[]);
 useEffect(()=>{let active=true;const stamp=++generation.current;setLoading(true);setReadError(false);const frame=requestAnimationFrame(()=>{try{const value=readDrafts(localStorage,context);if(active&&stamp===generation.current){setSnapshot(value);setLoadedContext(context);}}catch{if(active){setReadError(true);setSnapshot(null);setLoadedContext(context);}}finally{if(active)setLoading(false);}});return()=>{active=false;cancelAnimationFrame(frame);};},[context,revision]);
 useEffect(()=>{const onStorage=(event:StorageEvent)=>{if(event.key===draftKey(context))setRevision(n=>n+1);};window.addEventListener('storage',onStorage);return()=>window.removeEventListener('storage',onStorage);},[context]);
 const currentLoading=loading||loadedContext!==context;
 const ready=!currentLoading&&!readError&&snapshot?.actorId===context.actorId&&snapshot.role===context.role&&snapshot.tenantId===context.tenantId;
 const rows=ready?snapshot.rows:[],selectedId=params.get('draft'),selected=rows.find(row=>row.id===selectedId);
 const close=useCallback(()=>{resetEditor();setParams({});},[resetEditor,setParams]);
 useEffect(()=>{resetEditor();setSaved(false);},[context,resetEditor]);
 function open(row:MarketingDraft){cancelOperation();editorRef.current={context,route:row.id,url:location.pathname+'?draft='+encodeURIComponent(row.id),existing:true};setBusy(false);setEdit(structuredClone(row));setExpected(snapshot!.revision);setRequest(crypto.randomUUID());setParams({draft:row.id});setPreview(false);setDiscard(false);setInvalid(false);setError('');setSaved(false);}
 function create(kind:MarketingDraft['kind']){if(!ready||operation.current)return;editorRef.current={context,route:null,url:location.pathname,existing:false};setBusy(false);setEdit(blankDraft(kind,crypto.randomUUID()));setExpected(snapshot!.revision);setRequest(crypto.randomUUID());setParams({});setPreview(false);setDiscard(false);setInvalid(false);setError('');setSaved(false);}
 // IDs confer no access. Route changes synchronously fence pending callbacks/writes.
 useEffect(()=>{if(!ready)return;const editor=editorRef.current;if(editor&&editor.context===context&&editor.url!==currentUrl){const previousId=editor.route;resetEditor();if(selected&&selected.id!==previousId)open(selected);return;}if(selected&&(!editor||selected.id!==editor.route))open(selected);else if((selectedId&&!selected)||(!selectedId&&editor?.route))resetEditor();},[selectedId,selected,ready,currentUrl]);
 function change(patch:Partial<MarketingDraft>){if(operation.current)return;setEdit(row=>row?{...row,...patch}:row);setInvalid(false);setError('');setRequest(crypto.randomUUID());}
 function showPreview(){if(!edit||operation.current)return;if(draftErrors(edit,rows).length){setInvalid(true);requestAnimationFrame(()=>document.querySelector<HTMLInputElement>('.marketing-editor input')?.focus());return;}setPreview(true);setInvalid(false);}
 async function commit(type:'save'|'discard'){
  const editor=editorRef.current;if(!edit||!ready||operation.current||!editor||!validEditor(editor))return;
  const op:Operation={editor,cancelled:false};operation.current=op;setBusy(true);setError('');
  const command:DraftCommand=type==='save'?{type,row:edit,expect:editor.existing?'edit':'create',expectedRevision:expected,requestId:request}:{type,id:edit.id,kind:edit.kind,expectedRevision:expected,requestId:request};
  try{const next=await runDraftCommand(localStorage,context,command,()=>!validOperation(op));if(validOperation(op)){setSnapshot(next);setLoadedContext(context);close();setSaved(type==='save');}}
  catch(failure){if(validOperation(op)){const message=failure instanceof Error?failure.message:'';setError(['revision_conflict','request_conflict','effect_conflict','missing'].includes(message)?'marketing.conflict':message==='linked'?'marketing.linked':'marketing.saveError');}}
  finally{if(validOperation(op)){operation.current=null;setBusy(false);}}
 }
 function dateField(key:'plannedOn'|'startOn'|'endOn'){return <Field label={t(`marketing.${key}`)} hint={t('marketing.dateHint')}>{id=><Input disabled={busy} id={id} type="date" min="1900-01-01" max="2199-12-31" value={edit?.[key]??''} onChange={event=>change({[key]:event.target.value||null})}/>}</Field>;}
 function draftButton(row:MarketingDraft){return <Button variant="ghost" size="sm" disabled={busy} onClick={()=>open(row)}>{bi(row.title)}</Button>;}
 const cells=monthDays(month);
 return <div className="stack mkt-board" data-testid="marketing-workbench"><h1 className="sr-only">{t('marketing.title')}</h1><div className="mkt-head"><Notice tone="warn">{t('marketing.boundary')}</Notice>
 <p className="small muted mkt-who">{user.name} · {bi(ROLE_LABEL[role])}</p></div>
 {currentLoading?<p role="status">{t('marketing.loading')}</p>:!ready?<Notice tone="danger" action={<Button onClick={()=>setRevision(n=>n+1)}>{t('marketing.retry')}</Button>}>{t('marketing.readError')}</Notice>:<>
 <div className="row wrap mkt-actions"><Button disabled={busy} onClick={()=>create('campaign')}>{t('marketing.newCampaign')}</Button><Button variant="secondary" disabled={busy} onClick={()=>create('content')}>{t('marketing.newContent')}</Button><Button variant="ghost" onClick={()=>setRevision(n=>n+1)}>{t('marketing.retry')}</Button>{!rows.length&&<p className="small muted mkt-empty">{t('marketing.empty')}</p>}</div>
 {saved&&<Notice tone="success">{t('marketing.saved')}</Notice>}{selectedId&&!selected&&<Notice action={<Button variant="ghost" onClick={()=>setParams({})}>{t('marketing.close')}</Button>}>{t('marketing.unavailable')}</Notice>}
 <section className="stack-sm mkt-calendar"><h2>{t('marketing.calendar')}</h2><Notice>{t('marketing.dateOnly')}</Notice><div className="row wrap"><Button variant="secondary" onClick={()=>setMonth(shiftMonth(month,-1))}>{t('marketing.previous')}</Button><Field label={t('marketing.month')}>{id=><Input disabled={busy} id={id} type="month" min="1900-01" max="2199-12" value={month} onChange={event=>{if(validDay(`${event.target.value}-01`))setMonth(event.target.value);}}/>}</Field><Button variant="secondary" onClick={()=>setMonth(shiftMonth(month,1))}>{t('marketing.next')}</Button></div>
 <div className="marketing-calendar" role="group" aria-label={`${t('marketing.calendar')} ${month}`}><div className="marketing-weekdays">{['sun','mon','tue','wed','thu','fri','sat'].map(day=><strong key={day}>{t(`marketing.${day}`)}</strong>)}</div><div className="marketing-days">{cells.map((day,index)=><div key={day??`blank${index}`} className={`marketing-day ${day?'':'is-blank'}`} data-day={day??undefined}>{day&&<><span className="small">{Number(day.slice(-2))}</span>{rows.filter(row=>row.kind==='content'&&row.plannedOn===day).map(row=><Button key={row.id} variant="ghost" size="sm" aria-label={bi(row.title)} disabled={busy} onClick={()=>open(row)}><span className="marketing-date-marker" aria-hidden>•</span></Button>)}</>}</div>)}</div></div><div className="stack-sm">{rows.filter(row=>row.kind==='content'&&row.plannedOn?.startsWith(month)).sort((a,b)=>a.plannedOn!.localeCompare(b.plannedOn!)).map(row=><div key={row.id} className="row wrap"><span className="small muted">{row.plannedOn}</span>{draftButton(row)}</div>)}</div></section>
 <div className="mkt-side"><Card className="mkt-campaigns"><div className="stack-sm"><h2>{t('marketing.campaigns')}</h2>{!rows.some(row=>row.kind==='campaign')&&<p>{t('marketing.noCampaigns')}</p>}{rows.filter(row=>row.kind==='campaign').map(row=><div className="stack-sm" key={row.id}><div className="row wrap">{draftButton(row)}<Badge>{t('marketing.draft')}</Badge></div>{(row.startOn||row.endOn)&&<p className="small">{row.startOn??'—'} → {row.endOn??'—'}</p>}</div>)}</div></Card><Card className="mkt-undated"><div className="stack-sm"><h2>{t('marketing.undated')}</h2>{rows.filter(row=>row.kind==='content'&&!row.plannedOn).map(row=><div key={row.id}>{draftButton(row)}</div>)}{!rows.some(row=>row.kind==='content'&&!row.plannedOn)&&<p>{t('marketing.noUndated')}</p>}</div></Card></div>
 <section className="stack-sm mkt-assets"><h2>{t('marketing.assets')}</h2><Notice>{t('marketing.artBoundary')}</Notice><div className="grid grid-2">{brandReferences.map(asset=><Card key={asset.id}><div className="stack-sm"><img src={asset.url} alt={bi(asset.label)} className={`marketing-brand ${asset.id==='cream'||asset.id==='yellow'?'is-light-reference':''}`}/><p>{bi(asset.label)}</p></div></Card>)}</div><div className="row wrap"><Link to="/admin/content/media">{t('marketing.media')}</Link><Link to="/manual/19-medios-y-artwork">{t('marketing.manual')}</Link></div></section>
 </>}
 <Drawer open={!!edit&&!!ready&&!!editorRef.current&&validEditor(editorRef.current)} title={t(discard?'marketing.discard':preview?'marketing.preview':'marketing.edit')} onClose={close}>{edit&&<div className="stack marketing-editor"><Badge>{t('marketing.draft')}</Badge><Notice>{t('marketing.boundary')}</Notice>{discard?<Notice tone="warn">{t('marketing.discardConfirm')}</Notice>:preview?<><h3>{bi(edit.title)}</h3><p className="marketing-copy">{bi(edit.body)}</p><p>{edit.kind==='campaign'?`${edit.startOn??'—'} → ${edit.endOn??'—'}`:edit.plannedOn??t('marketing.undated')}</p>{edit.channel&&<p>{edit.channel}</p>}{edit.campaignId&&<p>{rows.find(row=>row.id===edit.campaignId)?bi(rows.find(row=>row.id===edit.campaignId)!.title):t('marketing.unavailable')}</p>}<p>{edit.assetIds.map(id=>bi(brandReferences.find(asset=>asset.id===id)!.label)).join(' · ')}</p></>:<>
 {(['es','en'] as const).map(lang=><Field key={`title${lang}`} label={t(lang==='es'?'marketing.titleEs':'marketing.titleEn')} required>{id=><Input disabled={busy} id={id} value={edit.title[lang]} maxLength={120} onChange={event=>change({title:{...edit.title,[lang]:event.target.value}})}/>}</Field>)}
 {(['es','en'] as const).map(lang=><Field key={`body${lang}`} label={t(lang==='es'?'marketing.bodyEs':'marketing.bodyEn')}>{id=><textarea disabled={busy} className="input" id={id} rows={4} maxLength={2000} value={edit.body[lang]} onChange={event=>change({body:{...edit.body,[lang]:event.target.value}})}/>}</Field>)}
 {edit.kind==='campaign'?<>{dateField('startOn')}{dateField('endOn')}</>:<>{dateField('plannedOn')}<Field label={t('marketing.campaignLink')}>{id=><Select disabled={busy} id={id} value={edit.campaignId??''} onChange={event=>change({campaignId:event.target.value||null})}><option value="">{t('marketing.none')}</option>{rows.filter(row=>row.kind==='campaign').map(row=><option key={row.id} value={row.id}>{bi(row.title)}</option>)}</Select>}</Field><Field label={t('marketing.channel')}>{id=><Input disabled={busy} id={id} value={edit.channel} maxLength={80} onChange={event=>change({channel:event.target.value})}/>}</Field></>}
 <fieldset className="stack-sm"><legend>{t('marketing.assets')}</legend>{brandReferences.map(asset=><label key={asset.id} className="row"><input disabled={busy} type="checkbox" checked={edit.assetIds.includes(asset.id)} onChange={event=>change({assetIds:event.target.checked?[...edit.assetIds,asset.id]:edit.assetIds.filter(id=>id!==asset.id)})}/><span>{bi(asset.label)}</span></label>)}</fieldset>
 </>}
 {busy&&<p role="status">{t('marketing.saving')}</p>}<p className="small muted">{t('marketing.cancelHint')}</p>
 {invalid&&<Notice tone="danger">{t('marketing.validation')}</Notice>}{error&&<Notice tone="danger">{t(error)}</Notice>}
 <div className="stack-sm">{discard?<Button disabled={busy} onClick={()=>void commit('discard')}>{t('marketing.confirmDiscard')}</Button>:preview?<><Button disabled={busy} onClick={()=>void commit('save')}>{t('marketing.save')}</Button><Button variant="secondary" disabled={busy} onClick={()=>setPreview(false)}>{t('marketing.back')}</Button></>:<><Button disabled={busy} onClick={showPreview}>{t('marketing.preview')}</Button>{rows.some(row=>row.id===edit.id)&&<Button variant="secondary" onClick={()=>{setDiscard(true);setRequest(crypto.randomUUID());setError('');}}>{t('marketing.discard')}</Button>}</>}
 <Button variant="ghost" onClick={close}>{t('marketing.cancel')}</Button></div></div>}</Drawer></div>;
}
