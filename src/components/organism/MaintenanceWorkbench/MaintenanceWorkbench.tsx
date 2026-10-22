import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { MaintenanceRecordRow, RoomRow } from '../../../data/schema';
import { dateKey } from '../../../i18n/format';
import { Button } from '../../atom/Button/Button';
import { Input, Select } from '../../atom/Input/Input';
import { Card } from '../../molecule/Card/Card';
import { Field } from '../../molecule/Field/Field';
import { Notice } from '../../molecule/Notice/Notice';
import { CheckboxField } from '../../molecule/CheckboxField/CheckboxField';
import { EmptyState } from '../../molecule/EmptyState/EmptyState';
import { CHECK_ITEMS, MAINTENANCE_KINDS, emptyMaintenancePayload, validateMaintenance, validateMaintenanceLabel, type MaintenanceControl, type MaintenanceInput, type MaintenanceKind } from '../../../modules/maintenance/maintenance';
export interface MaintenanceWorkbenchProps {
 records:MaintenanceRecordRow[];rooms:RoomRow[];loading:boolean;readError:boolean;onRetry:()=>void;onCommand:(input:MaintenanceInput,control?:MaintenanceControl)=>Promise<MaintenanceRecordRow[]>;
}
export function MaintenanceWorkbench({records,rooms,loading,readError,onRetry,onCommand}:MaintenanceWorkbenchProps) {
 const {t,bi}=useI18n();const [kind,setKind]=useState<MaintenanceKind>('checklist'),[edit,setEdit]=useState<MaintenanceRecordRow|null>(null),[notice,setNotice]=useState<'saved'|'failed'|'invalid'|'conflict'|'cancelled'|null>(null),[busy,setBusy]=useState(false),[retry,setRetry]=useState<MaintenanceInput|null>(null),[previewing,setPreviewing]=useState(false);const lock=useRef(false);
 const operation=useRef<AbortController|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;operation.current?.abort();operation.current=null;};},[]);
 const stop=()=>{operation.current?.abort();operation.current=null;lock.current=false;setBusy(false);setRetry(null);setEdit(null);setPreviewing(false);setNotice('cancelled');onRetry();};
 const act=async(input:MaintenanceInput)=>{if(lock.current||loading||readError)return;const command=structuredClone(input),controller=new AbortController();operation.current=controller;lock.current=true;setBusy(true);setNotice(null);try{await onCommand(command,{signal:controller.signal});if(mounted.current&&operation.current===controller&&!controller.signal.aborted){setNotice('saved');setRetry(null);setEdit(null);setPreviewing(false);}}catch(error){if(mounted.current&&operation.current===controller&&!controller.signal.aborted){setNotice(error instanceof Error&&/revision_conflict|request_conflict/.test(error.message)?'conflict':'failed');setRetry(command);}}finally{if(mounted.current&&operation.current===controller){operation.current=null;setBusy(false);lock.current=false;}}};
 const start=(row:MaintenanceRecordRow)=>{setPreviewing(false);setEdit(structuredClone(row));setNotice(null);setRetry(null);};
 const patch=(key:string,value:unknown)=>{setEdit(row=>row?{...row,payload:{...row.payload,[key]:value}}:null);setRetry(null);setNotice(null);};
 const save=(event:FormEvent)=>{event.preventDefault();if(!edit)return;try{validateMaintenance(edit.kind,edit.payload);if(edit.revision===-1)validateMaintenanceLabel(edit.label);}catch{setNotice('invalid');return;}if(edit.revision===-1&&!previewing){setPreviewing(true);setNotice(null);return;}void act(edit.revision===-1?{type:'create',id:edit.id,kind:edit.kind,roomId:edit.room_id,label:edit.label,payload:edit.payload,requestId:crypto.randomUUID()}:{type:'save',id:edit.id,expectedRevision:edit.revision,payload:edit.payload,requestId:crypto.randomUUID()});};
 const selected=records.filter(row=>row.kind===kind);
 return <div className="container page stack" data-maintenance-workbench>
  <header className="page-head"><h1>{t('maintenance.title')}</h1></header>
  <Notice tone="info">{t('maintenance.boundary')}</Notice><Notice tone="warn">{t('maintenance.pending')}</Notice>
  <div className="row wrap">{MAINTENANCE_KINDS.map(value=><Button key={value} variant={kind===value?'primary':'secondary'} disabled={busy} aria-pressed={kind===value} onClick={()=>{setKind(value);setEdit(null);setNotice(null);setRetry(null);}}>{t(`maintenance.${value}`)}</Button>)}</div>
  {!edit&&<Button disabled={busy||loading||readError} variant="secondary" onClick={()=>{setPreviewing(false);setNotice(null);setRetry(null);setEdit({id:`demo_created_${crypto.randomUUID()}`,tenant_id:'',created_at:'',updated_at:'',kind,room_id:null,label:{es:'',en:''},payload:emptyMaintenancePayload(kind,dateKey()),revision:-1,created_by:''});}}>{t('maintenance.add')}</Button>}
  {busy&&<Notice tone="info" action={<Button size="sm" onClick={stop}>{t('maintenance.stop')}</Button>}>{t('maintenance.saving')}</Notice>}
  {notice&&<Notice tone={notice==='saved'?'success':'warn'} action={retry&&notice==='failed'&&!readError?<Button size="sm" onClick={()=>{void act(retry);}} disabled={busy||loading||readError}>{t('maintenance.retry')}</Button>:undefined}>{t(`maintenance.${notice}`)}</Notice>}
  {readError?<Notice tone="warn" action={<Button onClick={onRetry}>{t('maintenance.retry')}</Button>}>{t('maintenance.readFailed')}</Notice>:loading?<p role="status">{t('maintenance.loading')}</p>:selected.length===0&&!edit?<EmptyState title={t('maintenance.empty')} body={t('maintenance.emptyBody')} action={<Button loading={busy} onClick={()=>{void act({type:'examples',day:dateKey(),requestId:crypto.randomUUID()});}}>{t('maintenance.examples')}</Button>}/>:<>
   {!edit&&<div className="stack">{selected.map(row=><Card key={row.id} padding="md" className="stack-sm">
    <h2>{bi(row.label)}</h2><p className="small muted">{t('maintenance.room')}: {rooms.find(room=>room.id===row.room_id)?.name??t('maintenance.unassigned')} · {t('maintenance.revision',{n:row.revision})}</p>
    {row.kind==='checklist'&&<p>{t('maintenance.checkCount',{n:Array.isArray(row.payload.checked)?row.payload.checked.length:0,total:CHECK_ITEMS.length})}</p>}
    {row.kind==='incident'&&<><p className="small" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{String(row.payload.description??'')}</p><p>{t(`maintenance.${row.payload.state}`)}</p></>}
    {row.kind==='supply'&&<><p>{t('maintenance.quantity')}: {String(row.payload.quantity)}</p>{row.payload.minimum!==null&&Number(row.payload.quantity)<Number(row.payload.minimum)&&<Notice tone="warn">{t('maintenance.low')}</Notice>}</>}
    {row.kind==='equipment'&&<><p>{t(`maintenance.${row.payload.condition}`)}</p><p className="small muted">{t('maintenance.equipmentNote')}</p></>}
    <Button variant="secondary" disabled={busy||loading||readError} onClick={()=>start(row)}>{t('maintenance.edit')}</Button>
   </Card>)}</div>}
   {edit&&<Card padding="md"><form className="stack" noValidate onSubmit={save}>
    <h2>{edit.revision===-1?t(previewing?'maintenance.previewTitle':'maintenance.newTitle'):bi(edit.label)}</h2>
    {edit.revision===-1&&<>
     {previewing&&<Notice tone="info">{t('maintenance.previewNotice')}</Notice>}
     <Field label={t('maintenance.newKind')}>{id=><Select id={id} value={edit.kind} disabled={busy||previewing} onChange={event=>{const next=event.target.value as MaintenanceKind;setEdit({...edit,kind:next,payload:emptyMaintenancePayload(next,dateKey())});setKind(next);setNotice(null);}}>{MAINTENANCE_KINDS.map(value=><option key={value} value={value}>{t(`maintenance.${value}`)}</option>)}</Select>}</Field>
     <Field label={t('maintenance.labelEs')} required>{id=><Input id={id} maxLength={120} value={edit.label.es} disabled={busy||previewing} onChange={event=>setEdit({...edit,label:{...edit.label,es:event.target.value}})}/>}</Field>
     <Field label={t('maintenance.labelEn')} required>{id=><Input id={id} maxLength={120} value={edit.label.en} disabled={busy||previewing} onChange={event=>setEdit({...edit,label:{...edit.label,en:event.target.value}})}/>}</Field>
     <Field label={t('maintenance.room')}>{id=><Select id={id} value={edit.room_id??''} disabled={busy||previewing} onChange={event=>setEdit({...edit,room_id:event.target.value||null})}><option value="">{t('maintenance.unassigned')}</option>{rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}</Select>}</Field>
    </>}

    {['checklist','incident','equipment'].includes(edit.kind)&&<Field label={t('maintenance.day')}>{id=><Input id={id} type="date" value={String(edit.payload[edit.kind==='checklist'?'day':edit.kind==='incident'?'observed_on':'inspected_on']??'')} disabled={busy||previewing} onChange={event=>patch(edit.kind==='checklist'?'day':edit.kind==='incident'?'observed_on':'inspected_on',event.target.value)}/>}</Field>}
    {edit.kind==='checklist'&&<><Field label={t('maintenance.phase')}>{id=><Select id={id} value={String(edit.payload.phase)} disabled={busy||previewing} onChange={event=>patch('phase',event.target.value)}>{['opening','between','closing','weekly'].map(phase=><option key={phase} value={phase}>{t(`maintenance.${phase}`)}</option>)}</Select>}</Field>{CHECK_ITEMS.map(item=><CheckboxField key={item.key} disabled={busy||previewing} checked={Array.isArray(edit.payload.checked)&&edit.payload.checked.includes(item.key)} onChange={checked=>patch('checked',checked?[...(edit.payload.checked as string[]),item.key]:(edit.payload.checked as string[]).filter(key=>key!==item.key))}>{bi(item.label)}</CheckboxField>)}</>}
    {edit.kind==='incident'&&<><Field label={t('maintenance.description')}>{id=><textarea id={id} className="input" rows={4} maxLength={2000} value={String(edit.payload.description)} disabled={busy||previewing} onChange={event=>patch('description',event.target.value)}/>}</Field><Field label={t('maintenance.state')}>{id=><Select id={id} value={String(edit.payload.state)} disabled={busy||previewing} onChange={event=>patch('state',event.target.value)}>{['draft','reviewed'].map(state=><option key={state} value={state}>{t(`maintenance.${state}`)}</option>)}</Select>}</Field></>}
    {edit.kind==='supply'&&<><Field label={t('maintenance.quantity')}>{id=><Input id={id} type="number" min={0} step={1} value={Number.isNaN(edit.payload.quantity)?'':String(edit.payload.quantity)} disabled={busy||previewing} onChange={event=>patch('quantity',event.target.value===''?NaN:Number(event.target.value))}/>}</Field><Field label={t('maintenance.minimum')} hint={t('maintenance.minimumHint')}>{id=><Input id={id} type="number" min={0} step={1} value={edit.payload.minimum===null?'':String(edit.payload.minimum)} disabled={busy||previewing} onChange={event=>patch('minimum',event.target.value===''?null:Number(event.target.value))}/>}</Field></>}
    {edit.kind==='equipment'&&<Field label={t('maintenance.condition')}>{id=><Select id={id} value={String(edit.payload.condition)} disabled={busy||previewing} onChange={event=>patch('condition',event.target.value)}>{['unreviewed','demo_ok','demo_attention'].map(state=><option key={state} value={state}>{t(`maintenance.${state}`)}</option>)}</Select>}</Field>}
    {['supply','equipment'].includes(edit.kind)&&<Field label={t('maintenance.note')}>{id=><Input id={id} value={String(edit.payload.note)} maxLength={500} disabled={busy||previewing} onChange={event=>patch('note',event.target.value)}/>}</Field>}
    <Button type="submit" block disabled={busy||loading||readError} loading={busy}>{t(edit.revision===-1?(previewing?'maintenance.createSave':'maintenance.preview'):'maintenance.save')}</Button>{edit.revision===-1&&previewing&&<Button type="button" block variant="secondary" disabled={busy} onClick={()=>{setPreviewing(false);setRetry(null);setNotice(null);}}>{t('maintenance.editDraft')}</Button>}<Button type="button" block variant="ghost" onClick={()=>{if(busy){stop();return;}setEdit(null);setNotice(null);setRetry(null);}}>{t('maintenance.cancel')}</Button>
   </form></Card>}
  </>}
 </div>;
}
