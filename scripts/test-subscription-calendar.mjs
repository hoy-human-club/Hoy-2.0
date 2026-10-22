import assert from 'node:assert/strict';
import { emptyDirectory,validateDirectory,readDirectory,saveDirectory,parseBackup,storageKey } from '../src/shared/subscriptions/model.ts';
const NativeDate=Date;let now=NativeDate.parse('2026-10-23T04:59:59Z');
class ClockDate extends NativeDate {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
const tomorrow=emptyDirectory('qa_calendar');tomorrow.dependencies.push({id:'qa_app',workspaceId:'qa_calendar',provider:'FICTIONAL',product:'QA calendar',purpose:'Clock validation fixture',category:'Test',officialUrl:'https://example.com',manageUrl:'',relatedProjects:[],connectionState:'verified',evidence:'FICTIONAL test assertion',lastVerified:'2026-10-23'});
const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
let calendarCalls=0;const studioToday=()=>{calendarCalls++;return now<NativeDate.parse('2026-10-23T05:00Z')?'2026-10-22':'2026-10-23';};
try {
 globalThis.Date=ClockDate;
 // Default portable contract remains UTC, including before Bogotá midnight.
 validateDirectory(tomorrow);saveDirectory(storage,tomorrow,null);assert.deepEqual(readDirectory(storage,'qa_calendar'),tomorrow);assert.deepEqual(parseBackup(JSON.stringify(tomorrow),'qa_calendar'),tomorrow);
 const raw=values.get(storageKey('qa_calendar'));
 for(const command of [()=>validateDirectory(tomorrow,studioToday),()=>readDirectory(storage,'qa_calendar',studioToday),()=>saveDirectory(storage,tomorrow,raw,studioToday),()=>parseBackup(raw,'qa_calendar',studioToday)])assert.throws(command,/valid past or current date/);
 assert.equal(values.get(storageKey('qa_calendar')),raw,'rejected validation never writes storage');assert.equal(calendarCalls,4);
 now=NativeDate.parse('2026-10-23T05:00Z');
 validateDirectory(tomorrow,studioToday);assert.deepEqual(readDirectory(storage,'qa_calendar',studioToday),tomorrow);saveDirectory(storage,tomorrow,raw,studioToday);assert.deepEqual(parseBackup(raw,'qa_calendar',studioToday),tomorrow);assert.equal(calendarCalls,8,'same callback evaluated fresh at each command after midnight');
 assert.throws(()=>validateDirectory(tomorrow,()=> 'invalid'),/Invalid validation calendar date/);
 console.log('PASS portable UTC default and optional host clock across validate/read/save/import; before/exact Bogotá midnight, fresh callback and failed-write preservation.');
}finally{globalThis.Date=NativeDate;}
