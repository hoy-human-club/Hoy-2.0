/** Browser-only optimized copies. No network/storage credentials; originals remain with the owner. */
export interface LocalPhoto { id:string; tenantId:string; url:string; name:string; width:number; height:number; createdAt:string }
export const LOCAL_MEDIA_EVENT = 'hoy:local-media';
export const isLocalPhotoUrl=(url:string)=>/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(url);
const open=()=>new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('hoy.local-media.v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('photos',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('storage'));r.onblocked=()=>reject(new Error('storage'));});
export async function listLocalPhotos(tenantId:string):Promise<LocalPhoto[]> {const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readonly');const r=tx.objectStore('photos').getAll();r.onsuccess=()=>resolve((r.result as LocalPhoto[]).filter(p=>p.tenantId===tenantId));r.onerror=()=>reject(new Error('storage'));});}finally{db.close();}}
export async function importLocalPhoto(file:File,tenantId:string):Promise<LocalPhoto>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('format');
 if(!file.size||file.size>10*1024*1024)throw new Error('size');
 const b=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const valid=file.type==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:file.type==='image/png'?b.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
 if(!valid)throw new Error('format');
 let bitmap:ImageBitmap;try{bitmap=await createImageBitmap(file);}catch{throw new Error('format');}
 try{
 if(bitmap.width*bitmap.height>40_000_000)throw new Error('dimensions');
 const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('format');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
 const url=canvas.toDataURL('image/webp',.8);if(!isLocalPhotoUrl(url))throw new Error('format');if(url.length>1_400_000)throw new Error('size');
 const photo:LocalPhoto={id:crypto.randomUUID(),tenantId,url,name:file.name,width:canvas.width,height:canvas.height,createdAt:new Date().toISOString()};
 const db=await open();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').add(photo);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('storage'));tx.onabort=()=>reject(new Error('storage'));});}finally{db.close();}
 window.dispatchEvent(new Event(LOCAL_MEDIA_EVENT));return photo;
 }finally{bitmap.close();}
}
