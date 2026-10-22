// Actual RowDrawer functions with controlled React scheduling; no DOM, financial action or private bodies.
import assert from 'node:assert/strict';import {build} from 'esbuild';
const b=await build({entryPoints:['src/modules/admin/tables/RowDrawer.tsx'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',plugins:[{name:'controlled-drawer-dependencies',setup(b){b.onResolve({filter:/.*/},a=>a.kind==='entry-point'?null:{path:a.path,namespace:'controlled'});b.onLoad({filter:/.*/,namespace:'controlled'},a=>({loader:'js',contents:a.path==='react'?`export const Fragment='Fragment',useState=(...x)=>qa.useState(...x),useRef=(...x)=>qa.useRef(...x),useEffect=(...x)=>qa.useEffect(...x),useMemo=f=>f();`:a.path==='react/jsx-runtime'?`export const Fragment='Fragment',jsx=(type,props)=>({type,props}),jsxs=jsx;`:`export const removeExpenseRow=()=>Promise.resolve(),useI18n=()=>({lang:'en',t:k=>k}),useSession=()=>qa.session,useData=()=>qa.data,toast=(...x)=>qa.toasts.push(x),getRelations=()=>[],rowTitle=()=> 'FICTIONAL',tableLabel=()=> 'Fixtures',columnLabel=()=>'',enumLabel=()=>'',formatWhen=()=>'',allowedColumns=d=>d.allColumns,tableRegistry={},Link='Link',Drawer='Drawer',Field='Field',Notice='Notice',ListRow='ListRow',Input='Input',Select='Select',Button='Button',Badge='Badge';`}));}}]});
const {RowDrawer}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const nodes=x=>!x||typeof x!=='object'?[]:[x,...Object.values(x.props??{}).flatMap(v=>Array.isArray(v)?v.flatMap(nodes):nodes(v))];
let cases=0;
for(const scenario of ['confirmed','cancel','unmount','actor','role','selection','provider','read-failure','write-failure','retry','clear-paid']){
 let cursor=0,slots=[],effects=[],cleanup=[],view,release,reject,writes=0,gets=0,row={id:'fictional_row',paid_on:null,note:'old'},mounted=true;
 const h={session:{user:{id:'usr_super'},role:'super_admin'},toasts:[],data:{update:async(t,id,patch)=>{writes++;return new Promise((yes,no)=>{reject=no;release=()=>{row={...row,...patch};yes(row);};});},get:async()=>{gets++;if(scenario==='read-failure')throw Error('FICTIONAL read');return row;}},useState(v){const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef(v){const i=cursor++;if(!(i in slots))slots[i]={current:v};return slots[i];},useEffect(fn,deps){const i=cursor++;if(!slots[i]||deps.some((x,j)=>x!==slots[i][j])){cleanup[i]?.();slots[i]=deps;effects.push(()=>cleanup[i]=fn());}}};globalThis.qa=h;
 let selected='fictional_row';const render=()=>{cursor=0;view=RowDrawer({def:{name:'expenses',allColumns:[]},row:{...row,id:selected},canWrite:true,technical:false,resolve:()=>null,rowsOf:()=>[],onClose:()=>{},onGraph:()=>{},relatedHref:()=>''});for(const e of effects.splice(0))e();};
 const editor=()=>nodes(view).find(n=>typeof n.type==='function'&&n.type.name==='RowEditor');render();const pending=editor().props.save('note','new');render();assert(editor().props.readOnly===false);assert(editor().props.busy);await editor().props.save('note','duplicate');assert.equal(writes,1,'synchronous latch');
 if(scenario==='cancel')nodes(view).find(n=>n.type==='Button'&&n.props.children==='core.common.cancel').props.onClick();
 if(scenario==='unmount'){mounted=false;for(const f of cleanup)f?.();}
 if(scenario==='actor'){h.session.user={id:'other_fictional'};render();}
 if(scenario==='role'){h.session.role='finance';render();}
 if(scenario==='selection'){selected='another_fictional';render();}
 if(scenario==='provider'){h.data={...h.data};render();}
 if(['write-failure','retry','clear-paid'].includes(scenario))reject(Error(scenario==='clear-paid'?'expense_paid_history_protected':'FICTIONAL write'));else release();
 await pending;if(mounted)render();
 const confirmed=scenario==='confirmed';assert.equal(editor().props.saved==='note',confirmed);assert.equal(h.toasts.length,0);
 if(['read-failure','write-failure','retry','clear-paid'].includes(scenario))assert(nodes(view).some(n=>n.type==='Notice'&&n.props?.tone==='warn'&&['admin.tables.writeFailed','admin.tables.paidProtected'].includes(n.props.children)));
 if(scenario==='clear-paid')assert(nodes(view).some(n=>n.props?.children==='admin.tables.paidProtected'));
 if(scenario==='cancel')assert(nodes(view).some(n=>n.props?.children==='admin.tables.writeCancelled'));
 if(scenario==='retry'){const again=editor().props.save('note','new');release();await again;render();assert.equal(editor().props.saved,'note');assert.equal(writes,2);}
 for(const f of cleanup)f?.();cases++;
}
delete globalThis.qa;console.log(`PASS actual table drawer lifecycle ${cases} cases: latch, confirmed readback, rejection/retry, cancel/unmount/session/selection/provider suppression; no effects outside fictional controlled rows.`);
