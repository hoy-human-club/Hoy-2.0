import type { GoogleBusinessHours } from '../../tenant/hours';

export interface HoursDryRun {
  payload: GoogleBusinessHours;
  sourceKey: string;
  hoursConfirmed: boolean;
  preparedAt: string;
}
export interface HoursDryRunResult {
  status: 'simulated_success';
  sentToGoogle: false;
  payload: GoogleBusinessHours;
  finishedAt: string;
}
export const hoursDryRunSourceKey = (payload: GoogleBusinessHours, hoursConfirmed: boolean) => JSON.stringify({ payload, hoursConfirmed });

const days=new Set(['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']);
const validTime=(time:{hours:number;minutes:number}|undefined) => !!time && Number.isInteger(time.hours) && time.hours>=0 && time.hours<24 && Number.isInteger(time.minutes) && time.minutes>=0 && time.minutes<60;
const validDay=(value:{year:number;month:number;day:number}|undefined) => {
  if(!value||!Number.isInteger(value.year)||value.year<1||value.year>9999||!Number.isInteger(value.month)||!Number.isInteger(value.day))return false;
  const key=`${String(value.year).padStart(4,'0')}-${String(value.month).padStart(2,'0')}-${String(value.day).padStart(2,'0')}`;
  const date=new Date(`${key}T12:00:00Z`);return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===key;
};
function validPayload(payload:GoogleBusinessHours):boolean {
  if(!Array.isArray(payload?.regularHours?.periods)||!Array.isArray(payload?.specialHours?.specialHourPeriods))return false;
  return payload.regularHours.periods.every(p=>days.has(p.openDay)&&days.has(p.closeDay)&&validTime(p.openTime)&&validTime(p.closeTime))&&
    payload.specialHours.specialHourPeriods.every(p=>validDay(p.startDate)&&validDay(p.endDate)&&
      Date.UTC(p.startDate.year,p.startDate.month-1,p.startDate.day)<=Date.UTC(p.endDate.year,p.endDate.month-1,p.endDate.day)&&
      ('closed' in p&&p.closed===true||'openTime' in p&&validTime(p.openTime)&&validTime(p.closeTime)));
}

/** Local-only immutable snapshot. It never turns draft reception hours into confirmed opening times. */
export function prepareHoursDryRun(payload: GoogleBusinessHours, hoursConfirmed: boolean, at = new Date().toISOString()): HoursDryRun {
  if (!validPayload(payload) || !Number.isFinite(Date.parse(at))) throw new Error('invalid_payload');
  return { payload: structuredClone(payload), sourceKey: hoursDryRunSourceKey(payload, hoursConfirmed), hoursConfirmed, preparedAt: at };
}

function localStep(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('cancelled')); return; }
    const cancel = () => { clearTimeout(timer); reject(new Error('cancelled')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, 500);
    signal.addEventListener('abort', cancel, { once: true });
  });
}

/** Deterministic mock processing: no fetch, OAuth, storage, settings mutations or provider state changes. */
export async function simulateHoursDryRun(prepared: HoursDryRun, currentSourceKey: string, options: {
  signal: AbortSignal;
  outcome: 'success' | 'failure';
  onProgress?: (phase: 'validating' | 'previewing') => void;
  wait?: (signal: AbortSignal) => Promise<void>;
}): Promise<HoursDryRunResult> {
  if (prepared.sourceKey !== currentSourceKey) throw new Error('source_changed');
  const check = () => { if (options.signal.aborted) throw new Error('cancelled'); };
  check();
  options.onProgress?.('validating');
  await (options.wait ?? localStep)(options.signal);check();
  options.onProgress?.('previewing');
  await (options.wait ?? localStep)(options.signal);check();
  if (options.outcome === 'failure') throw new Error('simulated_failure');
  return { status: 'simulated_success', sentToGoogle: false, payload: structuredClone(prepared.payload), finishedAt: new Date().toISOString() };
}
