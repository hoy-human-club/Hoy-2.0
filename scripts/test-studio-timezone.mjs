import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'hoy-studio-timezone-'));
try {
 const outfile = join(dir, 'domain.mjs');
 await build({ stdin: { contents: `export * from './src/i18n/format'; export * from './src/data/payrollCalc'; export * from './src/data/expenseCalc'; export * from './src/data/classRecurrence'; export { weekStartKey } from './src/data/analytics'; export { calendarPeriod, shiftCursor } from './src/components/organism/CalendarView/CalendarView'; export { timelineRange, shiftTimeline } from './src/components/organism/TimelineView/TimelineView'; export { placeEvents } from './src/components/organism/CalendarView/events'; export { localIso, dateInputValue, timeInputValue } from './src/modules/staff/rooms'; export { colombianHolidays } from './src/tenant/holidays.co'; export { applyView } from './src/modules/admin/tables/model';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile, loader: { '.css': 'empty' }, define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'silent' });
 const f = await import(pathToFileURL(outfile));
 const originalTZ = process.env.TZ;
 for (const tz of ['America/Bogota', 'UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
  process.env.TZ = tz;
  for (const [iso, key, hour] of [['2026-10-23T04:59:59.999Z','2026-10-22',23],['2026-10-23T05:00:00Z','2026-10-23',0],['2027-01-01T04:30:00Z','2026-12-31',23],['2024-03-01T04:30:00Z','2024-02-29',23]]) {
   const d = new Date(iso); assert.equal(f.dateKey(d),key,tz); assert.equal(f.studioParts(d).hour,hour,tz); assert.equal(d.toISOString(),iso.includes('.999')?iso:iso.replace('Z','.000Z'));
   assert.equal(f.startOfDay(d).toISOString(),`${key}T05:00:00.000Z`);
   assert(f.isSameDay(d,key));
  }
  for (const key of ['2026-10-22','2026-01-01','2024-02-29','1992-10-12']) {
   assert.equal(f.dateKey(f.fromDateKey(key)),key); assert.equal(f.formatDate(key,'en',{year:'numeric',month:'2-digit',day:'2-digit'}), `${key.slice(5,7)}/${key.slice(8,10)}/${key.slice(0,4)}`);
  }
  for (const lang of ['en','es']) {
   const instant = '2026-10-23T04:30:00Z';
   assert.equal(f.formatTime(instant,lang),new Intl.DateTimeFormat(f.localeOf(lang),{timeZone:'America/Bogota',hour:'numeric',minute:'2-digit'}).format(new Date(instant)));
   assert.equal(f.formatDateTime(instant,lang),new Intl.DateTimeFormat(f.localeOf(lang),{timeZone:'America/Bogota',dateStyle:'medium',timeStyle:'short'}).format(new Date(instant)));
   const money=f.formatCOP(15326000.49,lang);assert.equal(money.replace(/\D/g,''),'15326000');
  }
  assert.equal(f.addDaysKey('2024-02-28',1),'2024-02-29'); assert.equal(f.addDaysKey('2026-12-31',1),'2027-01-01');
  assert.equal(f.dateKey(f.addMonths(f.fromDateKey('2026-01-31'),1)),'2026-03-03');
  assert.equal(f.studioDate(2026,9,22,6,10).toISOString(),'2026-10-22T11:10:00.000Z');
  assert.equal(f.localIso('2026-10-22','06:10'),'2026-10-22T11:10:00.000Z'); assert.equal(f.timeInputValue('2026-10-22T11:10:00Z'),'06:10');
  assert.equal(f.dateInputValue(new Date('2026-10-23T04:30Z')),'2026-10-22');
  assert.deepEqual(f.calendarPeriod('month','2026-10-22'),{from:'2026-10-01',to:'2026-10-31'});
  assert.deepEqual(f.calendarPeriod('week','2026-10-22'),{from:'2026-10-19',to:'2026-10-25'});
  assert.equal(f.shiftCursor('month','2026-01-31',1),'2026-02-28');
  assert.equal(f.weekStartKey('2026-10-19T04:30Z'),'2026-10-12');
  const range=f.timelineRange('day','2026-10-22');assert.equal(range.from.toISOString(),'2026-10-22T05:00:00.000Z');assert.equal(range.ticks.length,24);assert.equal(f.studioParts(range.ticks[23]).hour,23);
  assert.equal(f.shiftTimeline('quarter','2026-11-30',1),'2027-02-01');
  const column={name:'at',type:'timestamptz'},def={allColumns:[column]}, rows=[{id:'late',at:'2026-10-23T04:30Z'},{id:'after',at:'2026-10-23T05:30Z'}];
  const filtered=(op,value)=>f.applyView(def,rows,{filters:[{column:'at',op,value}]},'','en',()=>null,[]).map(r=>r.id);
  assert.deepEqual(filtered('is','2026-10-22'),['late']);assert.deepEqual(filtered('after','2026-10-22'),['after']);assert.deepEqual(filtered('before','2026-10-23'),['late']);
  const dateOnlyDef={allColumns:[{name:'at',type:'date'}]};assert.equal(f.applyView(dateOnlyDef,[{id:'date',at:'2026-10-22'}],{filters:[{column:'at',op:'is',value:'2026-10-22'}]},'','en',()=>null,[]).length,1);

  const events=f.placeEvents([{id:'all',start:'2026-10-22',end:'2026-10-22'},{id:'late',start:'2026-10-23T04:30Z',end:'2026-10-23T05:10Z'}],{getDate:r=>r.start,getEnd:r=>r.end,getTitle:r=>r.id});
  assert.equal(events.find(e=>e.key==='all').startMs,Date.parse('2026-10-22T05:00Z')); assert.equal(events.find(e=>e.key==='all').endKey,'2026-10-22');assert.equal(events.find(e=>e.key==='late').startKey,'2026-10-22');assert.equal(events.find(e=>e.key==='late').endKey,'2026-10-23');
  assert.deepEqual(f.monthPeriod(new Date('2026-11-01T04:30Z')),{start:'2026-10-01',end:'2026-10-31'});
  assert.deepEqual(f.periodAt('biweekly',new Date('2026-10-16T04:30Z'),0),{start:'2026-10-01',end:'2026-10-15'});
  assert.deepEqual(f.dueDatesFor({cadence:'biweekly',anchor_day:31},{start:'2026-02-01',end:'2026-02-28'}),['2026-02-28']);
  const occurrences=f.previewRecurrence({weekday:4,start_time:'06:10',duration_min:50,start_date:'2026-10-22',end_date:'2026-10-22'},new Date('2026-10-22T05:00Z'),1);
  assert.deepEqual(occurrences,[{starts_at:'2026-10-22T11:10:00.000Z',ends_at:'2026-10-22T12:00:00.000Z'}]);
  assert.equal(f.colombianHolidays(2026).find(h=>h.key==='todos-santos').date,'2026-11-02'); assert.equal(f.colombianHolidays(2026).length,18);
  for(const historical of ['1900-01-01T05:00:00Z','1992-05-03T04:30:00Z','1993-02-07T04:30:00Z'])assert.equal(f.formatDateTime(historical,'en'),new Intl.DateTimeFormat('en-US',{timeZone:'America/Bogota',dateStyle:'medium',timeStyle:'short'}).format(new Date(historical)));
  assert(Number.isNaN(f.studioDate(NaN,0,1).getTime()));
  assert.throws(()=>f.formatDate('invalid'),RangeError);assert.throws(()=>f.formatTime(new Date(NaN)),RangeError);assert.equal(f.dateKey(new Date(NaN)),'NaN-NaN-NaN');assert(!f.isSameDay(new Date(NaN),new Date(NaN)));assert.equal(f.dateKey(f.fromDateKey('2026-02-30')),'2026-03-02');
  // Offsetless persisted input retains JavaScript parsing: no invented stored timezone.
  const offsetless='2026-10-22T06:10:00';assert.equal(f.formatTime(offsetless,'en'),f.formatTime(new Date(offsetless),'en'));
  console.log(`PASS studio timezone: ${tz}`);
 }
 process.env.TZ=originalTZ;
} finally { await rm(dir,{recursive:true,force:true}); }
