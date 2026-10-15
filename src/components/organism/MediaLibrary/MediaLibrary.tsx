import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { Input, Select } from '../../atom/Input/Input';
import { Button } from '../../atom/Button/Button';
import { Card } from '../../molecule/Card/Card';
import { Badge } from '../../atom/Badge/Badge';
import { EmptyState } from '../../molecule/EmptyState/EmptyState';
import { assetStates, safeMediaUrl, type LibraryAsset } from '../../../data/mediaLibrary';
import './MediaLibrary.css';
const urlFor = (url:string) => /^(https?:|\/)/.test(url) ? url : `${import.meta.env.BASE_URL}${url.replace(/^\.\//,'')}`;
export function MediaLibrary({ assets }: {assets: LibraryAsset[]}) {
 const {t,dict} = useI18n();const text=(k:string)=>t(`media.library.${k}`);
 const [query,setQuery]=useState('');const [status,setStatus]=useState('all');const [source,setSource]=useState('all');const [kind,setKind]=useState('all');const [orientation,setOrientation]=useState('all');const [sort,setSort]=useState('name');
 const shown=useMemo(()=>assets.filter(a=>(status==='all'||assetStates(a).includes(status))&&(source==='all'||source===a.source)&&(kind==='all'||kind===a.kind)&&(orientation==='all'||orientation===a.orientation)&&`${a.name} ${a.tags.join(' ')} ${a.usages.map(u=>u.label).join(' ')}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a,b)=>sort==='usageSort'?b.usages.length-a.usages.length||a.name.localeCompare(b.name):a.name.localeCompare(b.name)),[assets,status,source,kind,orientation,sort,query]);
 const reset=()=>{setQuery('');setStatus('all');setSource('all');setKind('all');setOrientation('all');setSort('name');};
 return <section className="stack media-library" aria-label={text('title')}>
  <div className="media-library-summary"><strong>{t('media.library.count',{n:assets.length})}</strong><span className="muted small">{text('scope')}</span></div>
  <div className="media-library-filters"><label className="media-library-search"><span>{text('search')}</span><Input type="search" value={query} onChange={e=>setQuery(e.target.value)} /></label>
  {([{key:'status',value:status,set:setStatus,options:['live','draft','inactive','archived','unused']},{key:'source',value:source,set:setSource,options:[...new Set(assets.map(a=>a.source))]},{key:'kind',value:kind,set:setKind,options:[...new Set(assets.map(a=>a.kind))]},{key:'orientation',value:orientation,set:setOrientation,options:['portrait','landscape','square','unknown']}]).map(f=><label key={f.key}><span>{text(f.key)}</span><Select aria-label={text(f.key)} value={f.value} onChange={e=>f.set(e.target.value)}><option value="all">{text('all')}</option>{f.options.map(o=><option key={o} value={o}>{text(o)}</option>)}</Select></label>)}
  <label><span>{text('sort')}</span><Select aria-label={text('sort')} value={sort} onChange={e=>setSort(e.target.value)}>{['name','usageSort'].map(o=><option key={o} value={o}>{text(o)}</option>)}</Select></label></div>
  <div className="row-between wrap"><span role="status" aria-live="polite">{t('media.library.count',{n:shown.length})}</span><Button variant="ghost" onClick={reset}>{text('clear')}</Button></div>
  {!shown.length&&<EmptyState title={text('empty')} action={<Button onClick={reset}>{text('clear')}</Button>}/>}
  <div className="media-library-grid">{shown.map(a=><Card key={a.id} padding="md"><div className="media-library-thumb">{a.thumbnail&&safeMediaUrl(a.thumbnail)?<><img src={urlFor(a.thumbnail)} alt={a.name} loading="lazy" onError={e=>{e.currentTarget.hidden=true;}}/><span className="media-library-image-error">{text('noPreview')}</span></>:<span>{text('noPreview')}</span>}</div><div className="stack-sm"><h3>{a.name}</h3><p className="small muted">{text(a.source)} · {text(a.kind)} · {text(a.orientation)}</p><div className="row wrap">{assetStates(a).map(s=><Badge key={s} tone={s==='live'?'success':s==='draft'?'warn':'neutral'}>{text(s)}</Badge>)}</div><details><summary>{text('details')} ({a.usages.length})</summary><div className="stack-sm"><h4>{text('uses')}</h4>{a.usages.length?a.usages.map((u,i)=><div className="media-library-use" key={`${u.path}-${i}`}><Link to={u.path} title={u.evidence}>{dict[`media.usage.${u.label}`] ? t(`media.usage.${u.label}`) : u.label}</Link><Badge tone={u.state==='live'?'success':'neutral'}>{text(u.state)}</Badge></div>):<p className="muted small">{text('unused')}</p>}<h4>{text('variants')}</h4><p className="muted small">{text('original')}</p>{a.variants.filter(safeMediaUrl).map(v=><a key={v} href={urlFor(v)} target="_blank" rel="noreferrer">{v.split('/').pop()}</a>)}</div></details>{safeMediaUrl(a.url)&&<a className="media-library-open" href={urlFor(a.url)} target="_blank" rel="noreferrer">{text('open')} ↗</a>}</div></Card>)}</div>
 </section>;
}
