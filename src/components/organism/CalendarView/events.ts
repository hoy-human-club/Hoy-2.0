/**
 * 0046 — shared by CalendarView and TimelineView: reading a row's start / end (a date key or a timestamp), the
 * Monday-first week the schedule pages use, and the colour of a row. A class tone (moss, river…) rides the global
 * `[data-tone]` hook from D-01; a status tone (success, warn…) sets the same `--t-fg / --t-bg / --t-dot` trio through
 * `[data-ev]` (eventTone.css), so chips and bars read one set of custom properties whichever tone they get.
 */
import { TONES, type Tone } from '../../../design/tokens';
import { addDays, dateKey, fromDateKey, MS, studioParts, startOfDay } from '../../../i18n/format';
import type { BadgeTone } from '../../atom/Badge/Badge';
import './eventTone.css';

export type EventTone = BadgeTone | Tone;

export function eventTone(tone: EventTone | null | undefined): { 'data-tone'?: string; 'data-ev'?: string } {
  if (!tone) return { 'data-ev': 'neutral' };
  return (TONES as readonly string[]).includes(tone) ? { 'data-tone': tone } : { 'data-ev': tone };
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A cell value as a moment: `YYYY-MM-DD` is a whole (local) day, anything else goes through Date; junk is null. */
export function readWhen(v: unknown): { date: Date; allDay: boolean } | null {
  if (typeof v !== 'string' || !v) return null;
  if (DATE_ONLY.test(v)) return { date: fromDateKey(v), allDay: true };
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : { date: d, allDay: false };
}

/** Monday on or before `d` (the schedule pages start the week on Monday). */
export const mondayOf = (d: Date) => addDays(d, -((studioParts(d).weekday + 6) % 7));
const midnight = (d: Date) => startOfDay(d).getTime();

export interface EventAccessors<T> {
  /** Stable key of a row (default: `row.id`). */
  rowKey?: (row: T) => string;
  /** Where the row sits: a date key (`2026-10-12`, a whole day) or a timestamp. Rows without one are left out. */
  getDate: (row: T) => unknown;
  /** Where it ends (inclusive for a date key). Absent or empty = a point in time. */
  getEnd?: (row: T) => unknown;
  getTitle: (row: T) => string;
  getTone?: (row: T) => EventTone | null | undefined;
  /** Dim the row (cancelled, expired) the way the schedule pages dim cancelled classes. */
  getMuted?: (row: T) => boolean;
}

export interface PlacedEvent<T> {
  row: T; key: string; title: string; tone: EventTone | null | undefined; muted: boolean;
  /** Start and end as moments; a whole-day start is local midnight, a whole-day end the midnight after it. */
  start: Date; startMs: number; endMs: number | null;
  allDay: boolean; hasEnd: boolean;
  /** First and last day it touches (inclusive). */
  startKey: string; endKey: string;
}

export function placeEvents<T>(rows: T[], a: EventAccessors<T>): PlacedEvent<T>[] {
  const out: PlacedEvent<T>[] = [];
  for (const row of rows) {
    const s = readWhen(a.getDate(row));
    if (!s) continue;
    let e = a.getEnd ? readWhen(a.getEnd(row)) : null;
    const startMs = s.allDay ? midnight(s.date) : s.date.getTime();
    let endMs = e ? (e.allDay ? midnight(e.date) + MS.day : e.date.getTime()) : null;
    if (endMs != null && endMs <= startMs) { e = null; endMs = null; }
    const startKey = dateKey(s.date);
    const endKey = endMs == null ? startKey : dateKey(new Date(endMs - 1));
    out.push({
      row, key: a.rowKey ? a.rowKey(row) : String((row as { id?: unknown }).id), title: a.getTitle(row), tone: a.getTone?.(row), muted: !!a.getMuted?.(row),
      start: s.date, startMs, endMs, allDay: s.allDay, hasEnd: !!e, startKey, endKey,
    });
  }
  return out.sort((x, y) => x.startMs - y.startMs || x.title.localeCompare(y.title));
}

/** The day keys from `from` to `to` inclusive. */
export function keysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = fromDateKey(from); dateKey(d) <= to; d = addDays(d, 1)) out.push(dateKey(d));
  return out;
}

/** The nearest rows before `from` and after `to` — the "jump" buttons of an empty period. */
export function nearestOutside<T>(evs: PlacedEvent<T>[], from: string, to: string) {
  let prev: PlacedEvent<T> | undefined, next: PlacedEvent<T> | undefined;
  for (const ev of evs) {
    if (ev.endKey < from) prev = ev;
    else if (ev.startKey > to && !next) next = ev;
  }
  return { prev, next };
}
