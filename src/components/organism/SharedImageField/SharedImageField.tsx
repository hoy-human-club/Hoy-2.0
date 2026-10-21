import {useEffect,useMemo,useRef,useState} from 'react';
import {useSession} from '../../../auth/SessionProvider';
import {getRoutes} from '../../../app/registry';
import {placementTarget} from '../MediaLibrary/placementTarget';
import {Link} from 'react-router-dom';
import {useI18n} from '../../../i18n/I18nProvider';
import {useData} from '../../../data/DataContext';
import {MockProvider} from '../../../data/MockProvider';
import {useMediaLibrary} from '../../../data/useMediaLibrary';
import {safeMediaUrl} from '../../../data/mediaLibrary';
import {importLocalPhoto,isLocalPhotoUrl} from '../../../data/localMediaStore';
import {tenant} from '../../../tenant/tenant';
import {Button} from '../../atom/Button/Button';
import {Input,Select} from '../../atom/Input/Input';
import './SharedImageField.css';
export interface SharedImageFieldProps {value:string|null;onChange:(url:string|null)=>void;disabled?:boolean;label?:string}
const displayUrl=(url:string)=>/^(data:|https?:|\/)/.test(url)?url:`${import.meta.env.BASE_URL}${url.replace(/^\.\//,'')}`;
export function SharedImageField({value,onChange,disabled=false,label}:SharedImageFieldProps){
 const {hasRole}=useSession();const routes=useMemo(()=>getRoutes(),[]);
 const {t,dict}=useI18n();const text=(k:string)=>t(`media.picker.${k}`);const data=useData();const {assets,localError}=useMediaLibrary();
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[source,setSource]=useState('all'),[candidate,setCandidate]=useState<string|null>(null),[previous,setPrevious]=useState<string|null|undefined>(undefined),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const root=useRef<HTMLElement>(null);
 const closeChooser=()=>{setOpen(false);setCandidate(null);root.current?.querySelector<HTMLButtonElement>('button')?.focus();};
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const current=assets.find(a=>a.url===value||a.variants.includes(value||''));
 const shown=assets.filter(a=>a.kind!=='video'&&safeMediaUrl(a.url)&&(!isLocalPhotoUrl(a.url)||data instanceof MockProvider)&&(source==='all'||a.source===source)&&`${a.name} ${a.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
 const choose=(url:string|null)=>{if(url&&isLocalPhotoUrl(url)&&!(data instanceof MockProvider))return;setPrevious(value);onChange(url);closeChooser();};
 const upload=async(file?:File)=>{if(!file||busy||disabled||!(data instanceof MockProvider))return;setBusy(true);setError('');try{const p=await importLocalPhoto(file,tenant.id);if(alive.current){setCandidate(p.url);setOpen(true);}}catch(e){if(alive.current)setError(['format','size','dimensions','storage'].includes((e as Error).message)?(e as Error).message:'storage');}finally{if(alive.current)setBusy(false);}};
 return <section ref={root} className="shared-image-field stack-sm" aria-label={label||text('title')}>
 <strong>{label||text('title')}</strong>
 {value&&safeMediaUrl(value)?<img className="shared-image-preview" src={displayUrl(value)} alt={current?.name||text('preview')} />:<span className="muted">{text('none')}</span>}
 <div className="row wrap"><Button type="button" variant="outline" disabled={disabled||busy} onClick={()=>{setOpen(!open);setCandidate(null);}} aria-expanded={open}>{text('browse')}</Button><Button type="button" variant="ghost" disabled={disabled||busy||!value} onClick={()=>choose(null)}>{text('remove')}</Button>{previous!==undefined&&<Button type="button" variant="ghost" disabled={disabled||busy} onClick={()=>{onChange(previous);setPrevious(undefined);}}>{text('undo')}</Button>}</div>
 <p className="muted small">{text('draft')}</p>
 {current&&current.usages.length>0&&<details><summary>{text('uses')}</summary>{current.usages.map((u,i)=>{const target=placementTarget(u.path,routes,hasRole);const label=dict[`media.usage.${u.label}`]?t(`media.usage.${u.label}`):u.label;return target?<Link key={i} to={target.to}>{label} · {t(`media.library.${u.state}`)}{target.documented&&` · ${t('media.library.documentedPreview')}`}</Link>:<span key={i}>{label} · {t('media.library.unavailablePreview')}</span>;})}</details>}
 {open&&<div className="shared-image-chooser stack-sm" onKeyDown={e=>{if(e.key==='Escape'&&!busy){e.stopPropagation();closeChooser();}}}>
 <label>{text('search')}<Input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
 <label>{text('source')}<Select value={source} onChange={e=>setSource(e.target.value)}><option value="all">{text('all')}</option>{[...new Set(assets.map(a=>a.source))].map(s=><option key={s} value={s}>{t(`media.library.${s}`)}</option>)}</Select></label>
 <div className="shared-image-options">{shown.map(a=><button type="button" key={a.id} disabled={disabled||busy} className="shared-image-option" aria-pressed={candidate===a.url} onClick={()=>setCandidate(a.url)}><img loading="lazy" src={displayUrl(a.thumbnail||a.url)} alt=""/><span>{a.name}</span></button>)}</div>
 {!shown.length&&<p role="status">{text('empty')}</p>}
 <label>{text('upload')}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||busy||!(data instanceof MockProvider)} onChange={e=>{const f=e.target.files?.[0];e.target.value='';void upload(f);}}/></label>
 <p className="muted small">{text('privacy')}</p>{!(data instanceof MockProvider)&&<p>{text('backend')}</p>}
 {candidate&&<img className="shared-image-preview" src={displayUrl(candidate)} alt={text('preview')}/>}
 <div className="row wrap"><Button type="button" disabled={disabled||busy||!candidate} onClick={()=>choose(candidate)}>{text('use')}</Button><Button type="button" variant="ghost" disabled={busy} onClick={closeChooser}>{text('cancel')}</Button></div>
 </div>}
 {busy&&<p role="status">{text('busy')}</p>}{(error||localError)&&<p role="alert">{text(error||'storage')}</p>}
 </section>;
}
