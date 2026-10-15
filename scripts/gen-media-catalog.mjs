/**
 * Deterministic, dependency-free public media inventory. Run: node scripts/gen-media-catalog.mjs
 * New files under images/, video(s)/ and brand/ are discovered automatically. Literal page
 * references and helper calls are indexed; the adapters below resolve dynamic website maps.
 * Usage means a source-code placement, not proof of runtime visibility or publication approval.
 * Empty usages means unassigned / not resolved by this index, NEVER proven unused.
 * URLs are base-relative (the UI must resolve them against import.meta.env.BASE_URL).
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFile(resolve(root, path), 'utf8');
async function walk(dir) {
  let entries;
  try { entries = await readdir(resolve(root, dir), { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return (await Promise.all(entries.sort((a,b) => a.name.localeCompare(b.name, 'en')).map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : `${dir}/${e.name}`))).flat();
}
// Read intrinsic geometry, not the display sizes authored in JSX.
function dimensions(b, ext) {
  if (ext === '.png' && b.length >= 24) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (ext === '.gif' && b.length >= 10) return [b.readUInt16LE(6), b.readUInt16LE(8)];
  if (ext === '.svg') {
    const s = b.toString();
    const box = s.match(/viewBox=["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)/);
    if (box) return [Number(box[1]), Number(box[2])];
  }
  if (ext === '.webp' && b.toString('ascii',0,4) === 'RIFF') {
    for (let p = 12; p + 8 < b.length;) {
      const type = b.toString('ascii',p,p+4), size = b.readUInt32LE(p+4), o = p+8;
      if (type === 'VP8X' && size >= 10) return [1+b.readUIntLE(o+4,3),1+b.readUIntLE(o+7,3)];
      if (type === 'VP8 ' && size >= 10) return [b.readUInt16LE(o+6)&16383,b.readUInt16LE(o+8)&16383];
      if (type === 'VP8L' && size >= 5) { const n=b.readUInt32LE(o+1); return [(n&16383)+1,((n>>>14)&16383)+1]; }
      p = o+size+(size%2);
    }
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    let p=2;
    while (p+8 < b.length && b[p] === 255) {
      const marker=b[p+1], n=b.readUInt16BE(p+2);
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) return [b.readUInt16BE(p+7),b.readUInt16BE(p+5)];
      if(n<2) break; p+=n+2;
    }
  }
  if (ext === '.mp4' || ext === '.mov') {
    function boxes(start,end) {
      for(let p=start;p+8<=end;) {
        const size=b.readUInt32BE(p), type=b.toString('ascii',p+4,p+8);
        if(size<8 || p+size>end) break;
        if(type==='tkhd' && size>=84) { const w=b.readUInt32BE(p+size-8)/65536,h=b.readUInt32BE(p+size-4)/65536; if(w&&h)return [w,h]; }
        if(['moov','trak'].includes(type)) { const found=boxes(p+8,p+size); if(found)return found; }
        p+=size;
      }
    }
    return boxes(0,b.length) ?? [null,null];
  }
  return [null,null];
}
const files=(await Promise.all(['public/images','public/video','public/videos','public/brand'].map(walk))).flat().filter(f=>/\.(webp|png|jpe?g|gif|svg|avif|mp4|webm|mov)$/i.test(f)).sort();
const groups=new Map();
for(const file of files) {
  const url=file.replace(/^public\//,''), ext=extname(url), base=url.slice(0,-ext.length).replace(/-(480|960|1600)$/,'');
  // Keep different formats separate, but group responsive sizes of the same format.
  const id=`${base}${ext}`;
  if(!groups.has(id))groups.set(id,[]);
  groups.get(id).push(url);
}
const catalog=[];
for(const [id,variants] of groups) {
  const weight=p=>Number(p.match(/-(480|960|1600)\./)?.[1]??0);
  variants.sort((a,b)=>weight(a)-weight(b)||a.localeCompare(b,'en'));
  const url=variants.find(p=>/-960\./.test(p))??variants[0];
  const [width,height]=dimensions(await readFile(resolve(root,'public',url)),extname(url));
  const stem=id.split('/').at(-1).replace(/\.[^.]+$/,'');
  const kind=/\.(mp4|webm|mov)$/.test(url)?'video':'image';
  const source=url.startsWith('brand/')?'brand':url.startsWith('images/studio-')?'studio':'concept';
  catalog.push({id,url,thumbnail:kind==='image'?variants[0]:null,name:stem.replace(/-/g,' ').replace(/^./,c=>c.toUpperCase()),source,kind,orientation:width&&height?(width===height?'square':width>height?'landscape':'portrait'):'unknown',width,height,variants,tags:[source,...stem.split('-')].filter((x,i,a)=>a.indexOf(x)===i),usages:[]});
}
const lookup=new Map(catalog.flatMap(a=>a.variants.map(v=>[v,a])));
function add(url,label,path,state,evidence) {
  const a=lookup.get(url); if(!a)return;
  const usage={label,path,state,evidence};
  if(!a.usages.some(u=>u.path===path&&u.label===label&&u.state===state))a.usages.push(usage);
}
const website='src/modules/website';
const index=await read(`${website}/index.ts`);
const routes=[...index.matchAll(/path:\s*'([^']+)'[^\n]*element:\s*page\('([^']+)'/g)].map(m=>({path:m[1],page:m[2]}));
const edition=await read(`${website}/edition.ts`);
if(!edition.includes("photoEdition: version === 'photos'")||!edition.includes(": 'latest'"))throw new Error('Website edition semantics changed; review catalog usage states before rebuilding.');
const photoText=await read(`${website}/photography.ts`);
const teacherPhotoIds=new Map([...photoText.matchAll(/(tea_\w+):\s*'([^']+)'/g)].map(m=>[m[2],m[1]]));
const teacherPhotos=[...teacherPhotoIds.keys()];
const archiveBrand=await read(`${website}/archive/brand.ts`);
const classNames=(archiveBrand.match(/export const classOrder[^=]*=\s*\[([^\]]+)\]/)?.[1].match(/'([^']+)'/g)??[]).map(x=>x.slice(1,-1));
const archiveCatalog=await read(`${website}/archive/catalog.ts`);
const archiveTeachers=[...archiveCatalog.matchAll(/base\('tea_([^']+)'/g)].map(m=>m[1]);
for(const archived of [false,true]) {
  const dir=`${website}/${archived?'archive':'pages'}`;
  const art=await read(`${website}/${archived?'archive/':''}artwork.ts`);
  const loops=new Map([...art.matchAll(/(\w+):\s*\{[^\n]+\}/g)].map(m=>[m[1],m[0]]));
  for(const {path,page} of routes) {
    let code; try{code=await read(`${dir}/${page}.tsx`);}catch(e){if(e.code==='ENOENT')continue;throw e;}
    // Current parameterized class routes have no concept art. Resolve archived slugs below.
    if(path.includes(':'))continue;
    const file=`${dir}/${page}.tsx`, label=page.replace(/Page$/,'').replace(/([a-z])([A-Z])/g,'$1 $2');
    const state=archived?'archived':'live', destination=path+(archived?'?version=archive':'');
    const evidence=`${file}; ${website}/edition.ts. Source placement; layout, saved media and motion settings may override visibility.`;
    const conceptEvidence=evidence+(!archived&&page==='AboutPage'?' media_slots:site.about:fallback':'');
    const concept=(name,video=false)=>add(video?`video/living-${name}.mp4`:`images/sanctuary/${name}.webp`,label,destination,state,conceptEvidence);
    for(const m of code.matchAll(/siteImage\(['"]([^'"]+)['"]\)/g))concept(m[1]);
    for(const m of code.matchAll(/siteVideo\(['"]([^'"]+)['"]\)/g))concept(m[1],true);
    for(const key of new Set([...code.matchAll(/siteLoops\.(\w+)/g)].map(m=>m[1]))) {
      const loop=loops.get(key)??'';
      for(const m of loop.matchAll(/siteImage\('([^']+)'\)/g))concept(m[1]);
      for(const m of loop.matchAll(/siteVideo\('([^']+)'\)/g))concept(m[1],true);
      for(const m of loop.matchAll(/video\/([^`]+\.mp4)/g))add(`video/${m[1]}`,label,destination,state,conceptEvidence);
    }
    if(!archived) {
      const names=new Set([...code.matchAll(/studioPhotoProps\('([^']+)'/g)].map(m=>m[1]));
      for(const m of code.matchAll(/<img\s+src=\{studioPhoto\('([^']+)'/g))names.add(m[1]);
      if(page==='HomePage'&&code.includes('images/studio-2026/facility-red-studio-1600.webp')) {
        const evidence=`${file}: owner-approved real studio hero shared by Latest and Photos; ComingSoonLanding uses the same packaged image.`;
        add('images/studio-2026/facility-red-studio-1600.webp',label,'/site','live',evidence);
        add('images/studio-2026/facility-red-studio-1600.webp',label,'/site?version=photos','draft',evidence);
      }
      if(code.includes('teacherStudioPhoto(te.id)'))teacherPhotos.forEach(n=>names.add(n));
      if(code.includes('studioPhotoProps(name'))for(const m of code.matchAll(/\['(facility-[^']+)'/g))names.add(m[1]);
      for(const name of names)add(`images/studio-2026/${name}-960.webp`,label,path+'?version=photos','draft',`${file}; ${website}/photography.ts; ${website}/edition.ts. Opt-in photos edition only; teacher entries are conditional fallbacks for matching active teachers.${teacherPhotoIds.has(name)?` teachers:${teacherPhotoIds.get(name)}:fallback`:''}${page==='AboutPage'&&name==='facility-studio'?' media_slots:site.about:fallback':''}`);
    }
    if(archived&&code.includes('siteImage(slug)'))for(const name of classNames){concept(name);concept(name,true);}
    if(archived&&code.includes('sampleTeacherPortrait(te.id)'))for(const name of (page==='HomePage'?archiveTeachers.slice(0,4):archiveTeachers)){concept(`teacher-${name}`);concept(`teacher-${name}`,true);}
    if(code.includes('tenant.brand.lockup.sand'))add('brand/p8-2.png',label,destination,state,evidence);
  }
}
// Parameterized archived class details, resolved to real historical slugs.
for(const name of classNames)for(const url of [`images/sanctuary/${name}.webp`,`video/living-${name}.mp4`])add(url,'Class detail',`/site/classes/${name}?version=archive`,'archived',`${website}/archive/ClassDetailPage.tsx: siteImage(slug), siteVideo(slug); archive/brand.ts: classOrder. Fallback media can be overridden.`);
// Literal references in known mounted surfaces, including CSS decorative backgrounds.
for(const [file,label,path] of [
  ['src/components/template/ComingSoonLanding/ComingSoonLanding.tsx','Coming soon','/'],
  [`${website}/sanctuary.css`,'Website materials','/site'],
  [`${website}/faq.css`,'FAQ','/site/faq'],
  ['src/components/molecule/ClassArch/ClassArch.css','Class arch material','/site/classes'],
  ['src/components/molecule/MediaSlot/MediaSlot.meta.ts','Component library','/dev/components'],
  ['src/components/organism/AmbientScene/AmbientScene.meta.ts','Component library','/dev/components'],
]) {
  const code=await read(file);
  for(const a of catalog)for(const url of a.variants)if(code.includes(url))add(url,label,path,'live',`${file}: literal asset reference. This is a code placement, not a runtime visibility guarantee.`);
}
for(const [url,path,label] of [['brand/hoy-wordmark.svg','/site','Website wordmark'],['brand/hoy-blue.png','/site?version=classic','Classic wordmark (light)'],['brand/hoy-cream.png','/site?version=classic','Classic wordmark (dark)']])add(url,label,path,'live',`${website}/SiteShell.tsx uses Wordmark; src/components/atom/Wordmark/Wordmark.tsx selects tenant.brand vector or theme-dependent raster.`);
// Equipment pairs are opt-in About placements, preserving both color originals.
for (const name of ['barre-blue','barre-warm','heater-blue','heater-warm']) add(`images/studio-2026/${name}-960.webp`,'Studio light','/site/about?version=photos','draft','src/modules/website/pages/AboutPage.tsx: SlowPhotoPair; 40-second dissolve, pause and reduced motion.');
// Associate a poster only when an actual still exists; never invent thumbnails for videos.
for(const a of catalog.filter(a=>a.kind==='video')) {
  const stem=a.url.split('/').at(-1).replace(/\.[^.]+$/,'').replace(/^living-/,'');
  const poster=stem==='hoy-studio'?'arch':stem==='hoy-ritual'?'studio-medellin':stem;
  const found=lookup.get(`images/sanctuary/${poster}.webp`);
  if(found)a.thumbnail=found.thumbnail;
}
for(const a of catalog)a.usages.sort((a,b)=>a.path.localeCompare(b.path,'en')||a.label.localeCompare(b.label,'en'));
catalog.sort((a,b)=>a.id.localeCompare(b.id,'en'));
const output=resolve(root,'src/data/mediaCatalog.generated.json');
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(catalog,null,2)+'\n');
console.log(`Media catalog: ${catalog.length} assets, ${files.length} files; ${catalog.filter(a=>!a.usages.length).length} unassigned (not proven unused). Wrote ${relative(root,output)}`);
