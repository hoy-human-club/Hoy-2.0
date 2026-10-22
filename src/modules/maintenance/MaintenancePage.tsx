import { useCallback, useEffect, useState } from 'react';
import { useData } from '../../data/DataContext';
import type { MaintenanceRecordRow, RoomRow } from '../../data/schema';
import { useSession } from '../../auth/SessionProvider';
import { useLayout } from '../../layout/useLayout';
import { MaintenanceWorkbench } from '../../components/organism/MaintenanceWorkbench/MaintenanceWorkbench';
import { maintenanceSpec } from './specs';
import { runMaintenance, type MaintenanceCommand, type MaintenanceInput } from './maintenance';
export function MaintenancePage() {
 const data=useData(),{user,role}=useSession(),{isVisible}=useLayout(maintenanceSpec);
 const [records,setRecords]=useState<MaintenanceRecordRow[]>([]),[rooms,setRooms]=useState<RoomRow[]>([]),[loading,setLoading]=useState(true),[readError,setReadError]=useState(false);
 const refresh=useCallback(async()=>{setLoading(true);try {const [next,locations]=await Promise.all([data.list<MaintenanceRecordRow>('maintenance_records'),data.list<RoomRow>('rooms')]);setRecords(next);setRooms(locations);setReadError(false);}catch{setReadError(true);}finally{setLoading(false);}},[data]);
 useEffect(()=>{void refresh();return data.subscribe('maintenance_records',()=>{void refresh();});},[data,refresh]);
 const command=useCallback((input: MaintenanceInput)=>runMaintenance(data,{...input,actorId:user.id,role} as MaintenanceCommand),[data,user.id,role]);
 return isVisible('MaintenanceWorkbench')?<MaintenanceWorkbench records={records} rooms={rooms} loading={loading} readError={readError} onRetry={()=>{void refresh();}} onCommand={command}/>:null;
}
