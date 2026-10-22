import type { Lang } from './types';
import { tenant } from '../tenant/tenant';

/** BCP-47 locale for a UI language: Spanish is Colombian Spanish, English is en-US. */
export const localeOf = (lang: Lang) => (lang === 'es' ? 'es-CO' : 'en-US');

/** Milliseconds in a minute, an hour and a day — the only place these literals are written. */
export const MS = { min: 60e3, hour: 3600e3, day: 86400e3 } as const;

const pad = (n: number) => String(n).padStart(2, '0');
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Studio calendar, independent of the viewer's device timezone; tenant.ts owns the setting. */
export const STUDIO_TIMEZONE = tenant.timezone;
const partsFormatter = new Intl.DateTimeFormat('en-US', { timeZone: STUDIO_TIMEZONE, era: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' });
/** Month is zero based, like Date; invalid Dates retain NaN parts. */
export function studioParts(d: Date) {
  const values: Record<string, number> = {};
  let bc = false;
  if (Number.isFinite(d.getTime())) for (const p of partsFormatter.formatToParts(d)) { if (p.type === 'era') bc = p.value === 'BC'; else values[p.type] = Number(p.value); }
  const year = bc ? 1 - values.year : values.year ?? NaN, month = (values.month ?? NaN) - 1, day = values.day ?? NaN;
  const calendar = new Date(0); calendar.setUTCFullYear(year, month, day);
  return { year, month, day, weekday: calendar.getUTCDay(), hour: values.hour ?? NaN, minute: values.minute ?? NaN, second: values.second ?? NaN, millisecond: d.getUTCMilliseconds() };
}
/** Explicit studio wall clock → instant. Overflow follows Date semantics; never parses persisted strings. */
export function studioDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, millisecond = 0): Date {
  const wall = new Date(0); wall.setUTCFullYear(year, month, day); wall.setUTCHours(hour, minute, second, millisecond);
  if (!Number.isFinite(wall.getTime())) return wall;
  let instant = new Date(wall);
  // Intl supplies historical timezone offsets too; do not hardcode today's UTC−5 offset.
  for (let i = 0; i < 3; i++) {
    const p = studioParts(instant), shown = new Date(0);
    shown.setUTCFullYear(p.year, p.month, p.day); shown.setUTCHours(p.hour, p.minute, p.second, p.millisecond);
    const correction = wall.getTime() - shown.getTime();
    if (!correction) break;
    instant = new Date(instant.getTime() + correction);
  }
  return instant;
}
/** Replace the studio wall-clock time, preserving its calendar day. */
export function atStudioTime(d: Date, hour: number, minute = 0, second = 0, millisecond = 0): Date {
  const p = studioParts(d); return studioDate(p.year, p.month, p.day, hour, minute, second, millisecond);
}

/**
 * `YYYY-MM-DD` of an instant in America/Bogota, regardless of the browser timezone.
 * Never `toISOString().slice(0, 10)`: that is UTC, and after 19:00 in Bogotá it names tomorrow.
 */
export const dateKey = (d: Date = new Date()) => { const p = studioParts(d); return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`; };

/** A date key back to a Date at studio noon; use studioParts rather than browser getters. */
export const fromDateKey = (key: string) => {
  if (!DATE_KEY.test(key)) return new Date(NaN);
  const [y, m, d] = key.split('-').map(Number);
  // Date's existing impossible-day rollover is preserved; invalid months stay invalid.
  return m < 1 || m > 12 || d < 1 || d > 31 ? new Date(NaN) : studioDate(y, m - 1, d, 12);
};

export const addDays = (d: Date, n: number) => { const p = studioParts(d); return studioDate(p.year, p.month, p.day + n, p.hour, p.minute, p.second, p.millisecond); };
export const addMonths = (d: Date, n: number) => { const p = studioParts(d); return studioDate(p.year, p.month + n, p.day, p.hour, p.minute, p.second, p.millisecond); };
export const startOfDay = (d: Date) => atStudioTime(d, 0);
/** `key` shifted by `n` days, as a key. */
export const addDaysKey = (key: string, n: number) => dateKey(addDays(fromDateKey(key), n));

/** ISO timestamp, date key or Date → Date; a bare date key is read as studio noon (see `fromDateKey`). */
const toDate = (v: string | Date): Date => (typeof v === 'string' ? (DATE_KEY.test(v) ? fromDateKey(v) : new Date(v)) : v);

/** COP with the `$` symbol in both languages (`$ 15.326.000` · `$15,326,000`), no decimals. */
export function formatCOP(amount: number, lang: Lang = 'es'): string {
  return new Intl.NumberFormat(localeOf(lang), { style: 'currency', currency: 'COP', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(amount);
}
export function formatDate(iso: string | Date, lang: Lang = 'es', opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  return new Intl.DateTimeFormat(localeOf(lang), { ...opts, timeZone: STUDIO_TIMEZONE }).format(toDate(iso));
}
export function formatTime(iso: string | Date, lang: Lang = 'es'): string {
  return new Intl.DateTimeFormat(localeOf(lang), { hour: 'numeric', minute: '2-digit', timeZone: STUDIO_TIMEZONE }).format(toDate(iso));
}
export function formatDateTime(iso: string | Date, lang: Lang = 'es'): string {
  return new Intl.DateTimeFormat(localeOf(lang), { dateStyle: 'medium', timeStyle: 'short', timeZone: STUDIO_TIMEZONE }).format(toDate(iso));
}
/**
 * "hace 5 min" · "hace 2 h" · "ayer" · "12 sept": how long ago something happened, for chat lists and
 * notification rows. Under a minute it says "ahora"; past a week it falls back to the short date.
 */
export function formatRelative(iso: string | Date, lang: Lang = 'es', now: Date = new Date()): string {
  const diff = now.getTime() - toDate(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(localeOf(lang), { numeric: 'auto', style: 'narrow' });
  if (diff < MS.min) return lang === 'es' ? 'ahora' : 'now';
  if (diff < MS.hour) return rtf.format(-Math.round(diff / MS.min), 'minute');
  if (diff < MS.day) return rtf.format(-Math.round(diff / MS.hour), 'hour');
  if (diff < 7 * MS.day) return rtf.format(-Math.round(diff / MS.day), 'day');
  return formatDate(iso, lang, { day: 'numeric', month: 'short' });
}
export function isSameDay(a: string | Date, b: string | Date): boolean {
  const da = toDate(a), db = toDate(b);
  return Number.isFinite(da.getTime()) && Number.isFinite(db.getTime()) && dateKey(da) === dateKey(db);
}

/** Only the digits of a typed value ('+57 300 123 4567' → '573001234567'). */
export const digitsOf = (raw: string) => raw.replace(/\D/g, '');
/** A typed amount as a whole number of pesos ('1.200.000' → 1200000; nonsense → 0). */
export const parseDigits = (raw: string) => Math.max(0, Math.round(Number(digitsOf(raw)) || 0));
/** True when the value carries at least `min` digits — the whole check a phone field does. */
export const isPhone = (raw: string, min = 10) => digitsOf(raw).length >= min;

/** wa.me deep link: to a number when there is one, otherwise the share sheet with the text prefilled. */
export const waLink = (phone: string | null | undefined, text?: string) =>
  `https://wa.me/${phone ? digitsOf(phone) : ''}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
