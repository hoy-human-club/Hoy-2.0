import {useEffect,useState} from 'react';
import {useData,useTable} from './DataContext';
import type {MediaAssetRow,TeacherRow,ModalityRow,EventRow} from './schema';
import {buildMediaLibrary} from './mediaLibrary';
import {listLocalPhotos,LOCAL_MEDIA_EVENT,type LocalPhoto} from './localMediaStore';
import {MockProvider} from './MockProvider';
import {tenant} from '../tenant/tenant';
export function useMediaLibrary(){
 const data=useData();
 const {rows:slots}=useTable<MediaAssetRow>('media_assets');const {rows:teachers}=useTable<TeacherRow>('teachers');const {rows:modalities}=useTable<ModalityRow>('modalities');const {rows:events}=useTable<EventRow>('events');
 const [local,setLocal]=useState<LocalPhoto[]>([]);const [error,setError]=useState(false);
 useEffect(()=>{if(!(data instanceof MockProvider)){setLocal([]);return;}let alive=true;const refresh=()=>listLocalPhotos(tenant.id).then(p=>{if(alive){setLocal(p);setError(false);}}).catch(()=>{if(alive)setError(true);});void refresh();window.addEventListener(LOCAL_MEDIA_EVENT,refresh);return()=>{alive=false;window.removeEventListener(LOCAL_MEDIA_EVENT,refresh);};},[data]);
 return {assets:buildMediaLibrary(slots,teachers,modalities,events,local),localError:error};
}
