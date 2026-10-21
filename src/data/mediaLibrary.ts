import { isLocalPhotoUrl, type LocalPhoto } from './localMediaStore';
import type { MediaAssetRow, TeacherRow, ModalityRow, EventRow } from './schema';
import catalog from './mediaCatalog.generated.json';
export type UsageState = 'live' | 'draft' | 'archived' | 'inactive';
export interface MediaUsage { label: string; path: string; state: UsageState; evidence: string }
export interface LibraryAsset { id: string; url: string; thumbnail: string | null; name: string; source: string; kind: string; orientation: string; tags: string[]; variants: string[]; usages: MediaUsage[] }
export const normalizeMediaUrl = (url: string) => url.replace(/^\.\//, '').replace(/^\//, '');
export const safeMediaUrl = (url: string) => isLocalPhotoUrl(url) || /^(https?:\/\/|\.\/|\/|images\/|video\/|brand\/)/.test(url) && !url.startsWith('//');
const slotRoutes = (key: string): string[] => key.startsWith('site.classes.') ? ['/site/classes', `/site/classes/${key.slice(13)}`, '/site/schedule', '/site', '/app/schedule'] : ({'site.about':['/site/about'],'site.hero':['/site?version=classic'],'site.contact.map':['/site/contact'],'class.hero':[],'teacher.portrait':['/app/teachers'],'event.cover':[],'studio.tour':['/app/rules']}[key] ?? []);
/** A projection over provider rows plus the build manifest. No invented backend or global publication flag. */
export function buildMediaLibrary(slots: MediaAssetRow[], teachers: TeacherRow[], modalities: ModalityRow[], events: EventRow[] = [], local: LocalPhoto[] = []): LibraryAsset[] {
 const assets = (catalog as LibraryAsset[]).map(a => ({...a, usages: a.usages.map(u => {
   const teacherId=u.evidence.match(/teachers:(tea_\w+):fallback/)?.[1];
   const teacher=teacherId?teachers.find(t=>t.id===teacherId):undefined;
   const slotKey=u.evidence.match(/media_slots:([\w.]+):fallback/)?.[1];
   const slot=slotKey?slots.find(s=>s.slot_key===slotKey):undefined;
   const overridden=teacherId && (!teacher || !teacher.active || !!teacher.photo_url) || slot?.status==='ready' && !!slot.url;
   return overridden ? {...u,state:'inactive' as const} : {...u};
 }), tags: [...a.tags]}));
 for(const p of local) assets.push({id:`local:${p.id}`,url:p.url,thumbnail:p.url,name:p.name,source:'local',kind:'photo',orientation:p.width>p.height?'landscape':p.width<p.height?'portrait':'square',tags:['local'],variants:[p.url],usages:[]});
 const resolve = (url: string, name: string, source: string, kind: string, ratio?: string) => {
  let asset = assets.find(a => [a.url,...a.variants].some(u => normalizeMediaUrl(u) === normalizeMediaUrl(url)));
  if (!asset) { const parts = ratio?.split('/').map(Number); asset={id:`provider:${url}`,url,thumbnail:kind==='video'?'':url,name,source,kind,orientation:parts?.length===2?(parts[0]>parts[1]?'landscape':parts[0]<parts[1]?'portrait':'square'):'unknown',tags:[source],variants:[url],usages:[]};assets.push(asset); }
  return asset;
 };
 for(const slot of slots) if(slot.url && safeMediaUrl(slot.url)) {
  const a=resolve(slot.url,slot.label.en||slot.label.es,'cms',slot.kind,slot.ratio);a.tags.push(slot.slot_key);
  const paths=slot.slot_key==='teacher.portrait'?teachers.map(t=>`/app/teachers/${t.id}`):slot.slot_key==='event.cover'?events.map(e=>`/app/events/${e.id}`):slotRoutes(slot.slot_key);
  const mod=modalities.find(m=>slot.slot_key===`site.classes.${m.slug}`);
  if(mod) a.tags.push(mod.name_es,mod.name_en);
  for(const path of paths) {const event=events.find(e=>path===`/app/events/${e.id}`);a.usages.push({label:slot.label.en||slot.label.es,path,state:slot.status!=='ready'?'draft':event&&event.status!=='published'?(event.status==='draft'?'draft':'inactive'):'live',evidence:`media_assets:${slot.id}`});}
 }
 for(const teacher of teachers) if(teacher.photo_url && safeMediaUrl(teacher.photo_url)) {
  const a=resolve(teacher.photo_url,teacher.display_name,'teacher','photo');a.tags.push('teacher',teacher.display_name);
  for(const path of ['/site','/site/teachers','/app/teachers',`/app/teachers/${teacher.id}`]) a.usages.push({label:teacher.display_name,path,state:teacher.active||path.endsWith(`/${teacher.id}`)?'live':'inactive',evidence:`teachers:${teacher.id}`});
 }
 return assets;
}
export function assetStates(asset: LibraryAsset): string[] {return asset.usages.length ? [...new Set(asset.usages.map(u=>u.state))] : ['unused'];}

/** Search the same bilingual placement labels the inventory displays, including accent-free queries. */
export function matchesMediaQuery(asset: LibraryAsset, query: string, labels: Record<string, { es: string; en?: string }>): boolean {
 const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
 const uses = asset.usages.flatMap(u => { const label = labels[`media.usage.${u.label}`]; return [u.label, label?.es ?? '', label?.en ?? '']; });
 return normalize([asset.name, ...asset.tags, ...uses].join(' ')).includes(normalize(query.trim()));
}
