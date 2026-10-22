import {useEffect,useRef,useState} from 'react';
import {useData} from '../../data/DataContext';
import type {MaintenanceRecordRow,RoomRow} from '../../data/schema';
import {useSession} from '../../auth/SessionProvider';
import {useLayout} from '../../layout/useLayout';
import {MaintenanceWorkbench} from '../../components/organism/MaintenanceWorkbench/MaintenanceWorkbench';
import {maintenanceSpec} from './specs';
import {readMaintenanceWorkspace,runMaintenance,type MaintenanceInput,type MaintenanceControl} from './maintenance';
export function MaintenancePage(){
 const data=useData(),{user,role}=useSession(),{isVisible}=useLayout(maintenanceSpec);
 const serial=useRef(0),context=useRef<{data:typeof data;actorId:string;role:typeof role;closed:boolean;serial:number;sequence:number;active:number}|null>(null);
 if(!context.current||context.current.data!==data||context.current.actorId!==user.id||context.current.role!==role){if(context.current)context.current.closed=true;context.current={data,actorId:user.id,role,closed:false,serial:++serial.current,sequence:0,active:0};}
 const ctx=context.current,current=()=>context.current===ctx&&!ctx.closed;
 const [view,setView]=useState<{context:typeof ctx;records:MaintenanceRecordRow[];rooms:RoomRow[];loading:boolean;readError:boolean}>({context:ctx,records:[],rooms:[],loading:true,readError:false});
 const control=(signal?:AbortSignal):MaintenanceControl=>({signal,currentActor:()=>current()?{actorId:ctx.actorId,role:ctx.role}:{actorId:'__changed__',role:ctx.role}});
 const refresh=async()=>{const sequence=++ctx.sequence;if(current())setView({context:ctx,records:[],rooms:[],loading:true,readError:false});try{const result=await readMaintenanceWorkspace(data,ctx,control());if(current()&&ctx.sequence===sequence)setView({context:ctx,...result,loading:false,readError:false});}catch{if(current()&&ctx.sequence===sequence)setView({context:ctx,records:[],rooms:[],loading:false,readError:true});}};
 useEffect(()=>{ctx.closed=false;void refresh();const stops=['users','maintenance_records','rooms'].map(table=>data.subscribe(table,()=>{if(!ctx.active)void refresh();}));return()=>{ctx.closed=true;++ctx.sequence;stops.forEach(stop=>stop());};},[ctx]);
 const command=async(input:MaintenanceInput,options:MaintenanceControl={})=>{if(!current())throw Error('maintenance_context');++ctx.active;try{return await runMaintenance(data,{...input,actorId:ctx.actorId,role:ctx.role},control(options.signal));}finally{--ctx.active;if(current())void refresh();}};
 const visible=view.context===ctx?view:{records:[],rooms:[],loading:true,readError:false};
 return isVisible('MaintenanceWorkbench')?<MaintenanceWorkbench key={ctx.serial} {...visible} onRetry={()=>{void refresh();}} onCommand={command}/>:null;
}
