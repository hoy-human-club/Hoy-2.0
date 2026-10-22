import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { useT } from '../../../i18n/I18nProvider';
import type { Lang } from '../../../i18n/types';
import { addDays, addDaysKey, dateKey, formatDate, formatTime, fromDateKey, localeOf, MS, studioParts, studioDate, startOfDay, STUDIO_TIMEZONE } from '../../../i18n/format';
import { useMinWidth } from '../../../layout/useMinWidth';
import { SegmentedControl, type SegmentOption } from '../../molecule/SegmentedControl/SegmentedControl';
import { ListRow } from '../../molecule/ListRow/ListRow';
import { Badge } from '../../atom/Badge/Badge';
import { Button } from '../../atom/Button/Button';
import { Icon } from '../../atom/Icon/Icon';
import { eventTone, keysBetween, mondayOf, nearestOutside, placeEvents, type EventAccessors, type PlacedEvent } from './events';
import './CalendarView.css';

export type CalendarMode = 'month' | 'week' | 'agenda';
export const CALENDAR_MODES: readonly CalendarMode[] = ['month', 'week', 'agenda'];
/** Days the agenda lists from the cursor on (prev / next move by the same amount). */
export const AGENDA_DAYS = 30;
/** Chips a month cell shows before "+N más". */
const MONTH_CHIPS = 3;
/** A row spanning more days than this sits on its first day only (a year-long membership would fill the month). */
const MAX_SPAN_DAYS = 62;
/** Hours the week grid shows when a week has no timed rows to size it by. */
const DEFAULT_HOURS: [number, number] = [7, 20];

export interface CalendarViewProps<T> extends EventAccessors<T> {
  rows: T[];
  onOpen: (row: T) => void;
  /** Present = clicking an empty day (or a free hour in the week) creates a row on it; `time` is `HH:00` from the week grid. */
  onCreate?: (dateKey: string, time?: string) => void;
  /** Right-hand slot of an agenda / day-list row (a status badge). */
  getDetail?: (row: T) => ReactNode;
  mode: CalendarMode;
  onModeChange: (mode: CalendarMode) => void;
  /** The focused day, `YYYY-MM-DD`: picks the month, the week or the agenda start. */
  cursor: string;
  onCursorChange: (dateKey: string) => void;
  /** Weekday and month names come from Intl in this language. */
  lang: Lang;
  ariaLabel: string;
  /** Key of the row open in a drawer (ringed). */
  selectedKey?: string | null;
}

/** First and last day (inclusive) a mode shows for a cursor. */
export function calendarPeriod(mode: CalendarMode, cursor: string): { from: string; to: string } {
  const c = fromDateKey(cursor);
  if (mode === 'month') return { from: dateKey(studioDate(studioParts(c).year, studioParts(c).month, 1, 12)), to: dateKey(studioDate(studioParts(c).year, studioParts(c).month + 1, 0, 12)) };
  if (mode === 'week') { const m = mondayOf(c); return { from: dateKey(m), to: dateKey(addDays(m, 6)) }; }
  return { from: cursor, to: addDaysKey(cursor, AGENDA_DAYS - 1) };
}

/** The cursor moved by `n` periods of a mode (a month keeps the day of the month when it can). */
export function shiftCursor(mode: CalendarMode, cursor: string, n: number): string {
  const c = fromDateKey(cursor);
  if (mode === 'month') {
    const x = studioDate(studioParts(c).year, studioParts(c).month + n, 1, 12);
    return dateKey(studioDate(studioParts(x).year, studioParts(x).month, Math.min(studioParts(c).day, studioParts(studioDate(studioParts(x).year, studioParts(x).month + 1, 0)).day), 12));

  }
  return addDaysKey(cursor, n * (mode === 'week' ? 7 : AGENDA_DAYS));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Chip time: 24 h and no a. m. / p. m. so it fits a 7-column cell (the tooltip and the agenda keep formatTime). */
const clockFmt = new Map<Lang, Intl.DateTimeFormat>();
function clockOf(lang: Lang) { let f = clockFmt.get(lang); if (!f) { f = new Intl.DateTimeFormat(localeOf(lang), { hour: 'numeric', minute: '2-digit', hourCycle: 'h23', timeZone: STUDIO_TIMEZONE }); clockFmt.set(lang, f); } return f; }

/** Side-by-side columns for the timed rows of one day: overlapping rows share the width. */
function layoutDay<T>(evs: PlacedEvent<T>[]): Map<string, { col: number; cols: number }> {
  const out = new Map<string, { col: number; cols: number }>();
  const endOf = (e: PlacedEvent<T>) => Math.max(e.endMs ?? 0, e.startMs + 30 * MS.min);
  let cluster: PlacedEvent<T>[] = [], colEnds: number[] = [], clusterEnd = -Infinity;
  const flush = () => { for (const e of cluster) out.get(e.key)!.cols = colEnds.length; cluster = []; colEnds = []; };
  for (const e of [...evs].sort((a, b) => a.startMs - b.startMs)) {
    if (e.startMs >= clusterEnd) { flush(); clusterEnd = -Infinity; }
    let col = colEnds.findIndex((end) => end <= e.startMs);
    if (col === -1) { col = colEnds.length; colEnds.push(0); }
    colEnds[col] = endOf(e);
    clusterEnd = Math.max(clusterEnd, endOf(e));
    out.set(e.key, { col, cols: 1 });
    cluster.push(e);
  }
  flush();
  return out;
}

/**
 * 0046 · CalendarView (M-03 "Calendario"): any rows with a date as a month grid, a week with hour rows, or an agenda
 * list grouped by day. Monday first like the schedule pages; weekday and month names from Intl; today ringed.
 * Every chip is a button; arrows move the day, PageUp / PageDown the month, `t` goes to today, Enter opens.
 * Below 768 px the month and the week become 44 px day cells with tone dots above the day's list (the phone pattern
 * of SessionCalendar), and the agenda is the default the page picks.
 */
export function CalendarView<T>(props: CalendarViewProps<T>) {
  const { rows, onOpen, onCreate, getDetail, mode, onModeChange, cursor, onCursorChange, lang, ariaLabel, selectedKey } = props;
  const t = useT();
  const compact = !useMinWidth('tablet');
  const root = useRef<HTMLElement>(null);
  const focusCursor = useRef(false);
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const today = dateKey();
  const clock = (d: Date) => clockOf(lang).format(d);

  const events = useMemo(() => placeEvents(rows, props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, props.getDate, props.getEnd, props.getTitle, props.getTone, props.getMuted, props.rowKey]);
  const period = calendarPeriod(mode, cursor);
  const c = fromDateKey(cursor);
  // the visible span: the month grid runs Monday → Sunday around the month
  const monthFirst = studioDate(studioParts(c).year, studioParts(c).month, 1, 12);
  const gridStart = mode === 'month' ? mondayOf(monthFirst) : fromDateKey(period.from);
  const weeks = mode === 'month' ? Math.ceil((((studioParts(monthFirst).weekday + 6) % 7) + studioParts(studioDate(studioParts(c).year, studioParts(c).month + 1, 0)).day) / 7) : 1;
  const visibleFrom = dateKey(gridStart);
  const visibleTo = mode === 'month' ? dateKey(addDays(gridStart, weeks * 7 - 1)) : period.to;

  const byDay = useMemo(() => {
    const m = new Map<string, PlacedEvent<T>[]>();
    for (const ev of events) {
      if (ev.endKey < visibleFrom || ev.startKey > visibleTo) continue;
      const span = keysBetween(ev.startKey, ev.endKey);
      const days = span.length > MAX_SPAN_DAYS ? [ev.startKey] : span;
      for (const k of days) if (k >= visibleFrom && k <= visibleTo) { const list = m.get(k) ?? []; list.push(ev); m.set(k, list); }
    }
    // whole-day rows first, then by time
    for (const list of m.values()) list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.startMs - b.startMs);
    return m;
  }, [events, visibleFrom, visibleTo]);
  const onDay = (k: string) => byDay.get(k) ?? [];
  const inPeriod = events.filter((ev) => ev.endKey >= period.from && ev.startKey <= period.to);
  const { prev: prevEv, next: nextEv } = inPeriod.length === 0 ? nearestOutside(events, period.from, period.to) : { prev: undefined, next: undefined };

  useEffect(() => {
    if (!focusCursor.current) return;
    focusCursor.current = false;
    root.current?.querySelector<HTMLElement>(`[data-day="${cursor}"]`)?.focus();
  }, [cursor, mode]);
  useEffect(() => { setDayOpen(null); }, [mode]);

  const go = (k: string, focus = false) => { focusCursor.current = focus; onCursorChange(k); };
  const longDay = (k: string) => formatDate(k, lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDay = (k: string) => formatDate(k, lang, { day: 'numeric', month: 'short' });
  const dayLabel = (k: string) => {
    const n = onDay(k).length;
    const base = `${longDay(k)} · ${t('core.calendar.rows', { n })}`;
    return n === 0 && onCreate ? `${base} · ${t('core.calendar.create', { date: shortDay(k) })}` : base;
  };
  /** A day was picked (click or Enter): an empty one with onCreate makes a row, any other opens its list. */
  const pickDay = (k: string) => {
    go(k);
    if (onDay(k).length === 0 && onCreate && !compact) onCreate(k);
    else setDayOpen(k);
  };

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    const el = e.target as HTMLElement;
    if (el.closest('input, select, textarea, [role="tablist"]') || e.altKey || e.ctrlKey || e.metaKey) return;
    const inGrid = !!el.closest('[data-cal-grid]');
    let next: string | null = null;
    if (inGrid && e.key === 'ArrowLeft') next = addDaysKey(cursor, -1);
    else if (inGrid && e.key === 'ArrowRight') next = addDaysKey(cursor, 1);
    else if (inGrid && e.key === 'ArrowUp') next = addDaysKey(cursor, -7);
    else if (inGrid && e.key === 'ArrowDown') next = addDaysKey(cursor, 7);
    else if (inGrid && e.key === 'Home') next = dateKey(mondayOf(c));
    else if (inGrid && e.key === 'End') next = dateKey(addDays(mondayOf(c), 6));
    else if (e.key === 'PageUp') next = shiftCursor(mode === 'agenda' ? 'agenda' : 'month', cursor, -1);
    else if (e.key === 'PageDown') next = shiftCursor(mode === 'agenda' ? 'agenda' : 'month', cursor, 1);
    else if (e.key === 't' || e.key === 'T') next = today;
    if (next) { e.preventDefault(); go(next, inGrid); }
  };

  const title = mode === 'month'
    ? cap(formatDate(monthFirst, lang, { month: 'long', year: 'numeric' }))
    : `${shortDay(period.from)} – ${formatDate(period.to, lang, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const modeOptions: SegmentOption<CalendarMode>[] = [
    { value: 'month', label: t('core.calendar.month'), icon: 'calendar' },
    { value: 'week', label: t('core.calendar.week'), icon: 'calendar-range' },
    { value: 'agenda', label: t('core.calendar.agenda'), icon: 'list' },
  ];

  const when = (ev: PlacedEvent<T>) => {
    if (ev.allDay) return ev.hasEnd && ev.endKey !== ev.startKey ? `${shortDay(ev.startKey)} – ${shortDay(ev.endKey)}` : t('core.calendar.allDay');
    const from = formatTime(ev.start, lang);
    if (ev.endMs == null) return from;
    const end = new Date(ev.endMs);
    return ev.endKey === ev.startKey ? `${from} – ${formatTime(end, lang)}` : `${from} – ${shortDay(ev.endKey)} ${formatTime(end, lang)}`;
  };
  const chip = (ev: PlacedEvent<T>, extra = '', style?: Record<string, number>) => (
    <button key={ev.key} type="button" className={`cal-chip ${ev.allDay ? 'is-allday' : ''} ${ev.muted ? 'is-muted' : ''} ${selectedKey === ev.key ? 'is-selected' : ''} ${extra}`}
      {...eventTone(ev.tone)} style={style as CSSProperties | undefined} title={`${ev.title} · ${when(ev)}`} onClick={() => onOpen(ev.row)}>
      <span className="cal-chip-dot" aria-hidden />
      {!ev.allDay && <time className="cal-chip-time" dateTime={ev.start.toISOString()}>{clock(ev.start)}</time>}
      <span className="cal-chip-title">{ev.title}</span>
    </button>
  );
  const listRow = (ev: PlacedEvent<T>) => (
    <ListRow key={ev.key} className={`cal-row ${ev.muted ? 'is-muted' : ''} ${selectedKey === ev.key ? 'is-selected' : ''}`} onClick={() => onOpen(ev.row)}
      icon={<span className="cal-dot" {...eventTone(ev.tone)} />} title={ev.title} subtitle={when(ev)} trailing={getDetail?.(ev.row)} />
  );
  const dots = (k: string) => { const list = onDay(k); return <span className="cal-dots" aria-hidden>{list.slice(0, 3).map((ev) => <i key={ev.key} className={`cal-dot ${ev.muted ? 'is-muted' : ''}`} {...eventTone(ev.tone)} />)}{list.length > 3 && <small>+{list.length - 3}</small>}</span>; };
  const dayClass = (k: string, base: string) => `${base} ${k === today ? 'is-today' : ''} ${k === cursor ? 'is-cursor' : ''} ${mode === 'month' && k.slice(0, 7) !== cursor.slice(0, 7) ? 'is-outside' : ''}`;

  /** One day's rows as a list (the month's "+N más", a picked day, the phone views). */
  const dayList = (k: string, closable: boolean) => (
    <section className="cal-daylist" aria-labelledby={`cal-dl-${k}`}>
      <header className="cal-daylist-head">
        <h3 id={`cal-dl-${k}`} className="cal-daylist-title">{cap(longDay(k))}</h3>
        {k === today && <Badge tone="primary">{t('core.common.today')}</Badge>}
        <span className="grow" />
        {onCreate && <Button size="sm" variant="secondary" icon="plus" onClick={() => onCreate(k)}>{t('core.calendar.createHere')}</Button>}
        {closable && <button type="button" className="cal-iconbtn ctl-round" aria-label={t('core.common.close')} title={t('core.common.close')} onClick={() => setDayOpen(null)}><Icon name="close" size="sm" /></button>}
      </header>
      {onDay(k).length === 0 ? <p className="small muted">{t('core.calendar.noDay')}</p> : <div className="cal-list">{onDay(k).map(listRow)}</div>}
    </section>
  );

  const weekdays = Array.from({ length: 7 }, (_, i) => dateKey(addDays(gridStart, i)));

  /** Month, desktop: 7 columns, up to three chips a day. */
  const month = () => (
    <div className="cal-month" role="grid" aria-label={title} data-cal-grid>
      <div role="row" className="cal-weekdays">
        {weekdays.map((k) => <div key={k} role="columnheader" className="cal-weekday"><abbr title={formatDate(k, lang, { weekday: 'long' })}>{formatDate(k, lang, { weekday: 'short' })}</abbr></div>)}
      </div>
      {Array.from({ length: weeks }, (_, w) => (
        <div key={w} role="row" className="cal-weekrow">
          {Array.from({ length: 7 }, (_, i) => {
            const k = dateKey(addDays(gridStart, w * 7 + i));
            const list = onDay(k);
            return (
              <div key={k} role="gridcell" aria-selected={k === cursor} className={dayClass(k, 'cal-cell')} onClick={(e: MouseEvent) => { if (e.target === e.currentTarget) pickDay(k); }}>
                <button type="button" className="cal-daynum" data-day={k} tabIndex={k === cursor ? 0 : -1} aria-label={dayLabel(k)} title={dayLabel(k)} onClick={() => pickDay(k)}>
                  <span>{Number(k.slice(8, 10))}</span>{list.length === 0 && onCreate && <Icon name="plus" size="xs" className="cal-add" />}
                </button>
                {list.slice(0, MONTH_CHIPS).map((ev) => chip(ev))}
                {list.length > MONTH_CHIPS && <button type="button" className="cal-more" aria-label={t('core.calendar.moreLabel', { n: list.length, date: longDay(k) })} onClick={() => { go(k); setDayOpen(k); }}>{t('core.calendar.more', { n: list.length - MONTH_CHIPS })}</button>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  /** Week, desktop: 7 day columns, an all-day strip, hour rows from the first to the last timed row. */
  const week = () => {
    const days = keysBetween(period.from, period.to);
    const timed = (k: string) => onDay(k).filter((ev) => !ev.allDay && ev.startKey === ev.endKey && ev.startKey === k);
    const allDay = (k: string) => onDay(k).filter((ev) => !timed(k).includes(ev));
    const anyTimed = days.some((k) => timed(k).length > 0);
    const anyAllDay = days.some((k) => allDay(k).length > 0);
    let h0 = 24, h1 = 0;
    for (const k of days) for (const ev of timed(k)) { h0 = Math.min(h0, studioParts(ev.start).hour); h1 = Math.max(h1, Math.ceil((ev.endMs ? (ev.endMs - startOfDay(fromDateKey(k)).getTime()) / MS.hour : studioParts(ev.start).hour + 1))); }
    if (!anyTimed) [h0, h1] = DEFAULT_HOURS;
    h1 = Math.min(24, Math.max(h1, h0 + 1));
    const hours = Array.from({ length: h1 - h0 }, (_, i) => h0 + i);
    const nowH = (Date.now() - startOfDay(new Date()).getTime()) / MS.hour;
    const hourLabel = (h: number) => formatTime(studioDate(2000, 0, 1, h), lang);
    const createAt = (k: string, e: MouseEvent<HTMLDivElement>) => {
      if (!onCreate || e.target !== e.currentTarget) return;
      const r = e.currentTarget.getBoundingClientRect();
      const h = Math.min(h1 - 1, h0 + Math.floor(((e.clientY - r.top) / r.height) * (h1 - h0)));
      go(k); onCreate(k, `${String(h).padStart(2, '0')}:00`);
    };
    return (
      <div className={`cal-week ${anyTimed ? 'has-hours' : ''}`} role="grid" aria-label={title} data-cal-grid style={{ '--h0': h0, '--hours': h1 - h0 } as Record<string, number>}>
        <div role="row" className="cal-week-row cal-week-head">
          <span role="columnheader" className="cal-gutter" aria-hidden />
          {days.map((k) => (
            <div key={k} role="columnheader" className={dayClass(k, 'cal-wday')}>
              <button type="button" className="cal-wday-btn" data-day={k} tabIndex={k === cursor ? 0 : -1} aria-label={dayLabel(k)} title={dayLabel(k)} onClick={() => pickDay(k)}>
                <span className="cal-wday-name">{formatDate(k, lang, { weekday: 'short' })}</span><strong className="cal-wday-num">{Number(k.slice(8, 10))}</strong>
              </button>
            </div>
          ))}
        </div>
        {(anyAllDay || !anyTimed) && (
          <div role="row" className={`cal-week-row cal-allday ${anyTimed ? '' : 'is-tall'}`}>
            <span role="rowheader" className="cal-gutter small muted">{anyTimed ? t('core.calendar.allDay') : ''}</span>
            {days.map((k) => {
              const list = allDay(k);
              const shown = anyTimed ? list.slice(0, MONTH_CHIPS) : list;
              return (
                <div key={k} role="gridcell" className={dayClass(k, 'cal-allday-cell')} onClick={(e: MouseEvent) => { if (e.target === e.currentTarget) pickDay(k); }}>
                  {shown.map((ev) => chip(ev))}
                  {list.length > shown.length && <button type="button" className="cal-more" aria-label={t('core.calendar.moreLabel', { n: list.length, date: longDay(k) })} onClick={() => { go(k); setDayOpen(k); }}>{t('core.calendar.more', { n: list.length - shown.length })}</button>}
                </div>
              );
            })}
          </div>
        )}
        {anyTimed && (
          <div role="row" className="cal-week-row cal-hours">
            <div role="rowheader" className="cal-gutter cal-hourlabels" aria-hidden>{hours.map((h) => <span key={h} className="cal-hourlabel" style={{ '--s': h - h0 } as Record<string, number>}>{hourLabel(h)}</span>)}</div>
            {days.map((k) => {
              const list = timed(k);
              const lay = layoutDay(list);
              const dayStart = startOfDay(fromDateKey(k)).getTime();
              return (
                <div key={k} role="gridcell" className={dayClass(k, 'cal-daycol')} onClick={(e) => createAt(k, e)} title={onCreate ? t('core.calendar.create', { date: shortDay(k) }) : undefined}>
                  {list.map((ev) => {
                    const s = (ev.startMs - dayStart) / MS.hour - h0;
                    const len = Math.max(0.5, ((ev.endMs ?? ev.startMs + MS.hour) - ev.startMs) / MS.hour);
                    const l = lay.get(ev.key) ?? { col: 0, cols: 1 };
                    return chip(ev, 'is-timed', { '--s': s, '--len': Math.min(len, h1 - h0 - s), '--col': l.col, '--cols': l.cols });
                  })}
                  {k === today && nowH >= h0 && nowH <= h1 && <span className="cal-now" style={{ '--s': nowH - h0 } as Record<string, number>} aria-hidden />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  /** Phone month / week: 44 px day cells with tone dots; the picked day's list below. */
  const compactGrid = () => {
    const days = mode === 'month' ? Array.from({ length: weeks * 7 }, (_, i) => dateKey(addDays(gridStart, i))) : keysBetween(period.from, period.to);
    return (
      <>
        <div className={`cal-compact ${mode === 'week' ? 'is-strip' : ''}`} role="group" aria-label={title} data-cal-grid>
          {weekdays.map((k) => <span key={`h-${k}`} className="cal-weekday" aria-hidden>{formatDate(k, lang, { weekday: 'narrow' })}</span>)}
          {days.map((k) => (
            <button key={k} type="button" className={dayClass(k, 'cal-cday')} data-day={k} tabIndex={k === cursor ? 0 : -1} aria-pressed={k === cursor} aria-label={dayLabel(k)} onClick={() => go(k)}>
              <strong>{Number(k.slice(8, 10))}</strong>{dots(k)}
            </button>
          ))}
        </div>
        {dayList(cursor, false)}
      </>
    );
  };

  /** Agenda: the next AGENDA_DAYS days from the cursor, grouped by day, empty days skipped. */
  const agenda = () => {
    const days = keysBetween(period.from, period.to).filter((k) => onDay(k).length > 0);
    return (
      <div className="cal-agenda">
        {days.map((k) => (
          <section key={k} className="cal-aday" aria-labelledby={`cal-ad-${k}`}>
            <h3 id={`cal-ad-${k}`} className="cal-aday-head" data-day={k} tabIndex={-1}>
              <span>{cap(longDay(k))}</span>{k === today && <Badge tone="primary">{t('core.common.today')}</Badge>}
            </h3>
            <div className="cal-list">{onDay(k).map(listRow)}</div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <section ref={root} className={`cal cal-${mode} ${compact ? 'is-compact' : ''}`} aria-label={ariaLabel} onKeyDown={onKey}>
      <header className="cal-head">
        <div className="cal-nav">
          <button type="button" className="cal-iconbtn ctl-round" aria-label={t('core.calendar.prev')} title={t('core.calendar.prev')} onClick={() => go(shiftCursor(mode, cursor, -1))}><Icon name="chevron-left" size="sm" /></button>
          <Button size="sm" variant="secondary" onClick={() => go(today)}>{t('core.common.today')}</Button>
          <button type="button" className="cal-iconbtn ctl-round" aria-label={t('core.calendar.next')} title={t('core.calendar.next')} onClick={() => go(shiftCursor(mode, cursor, 1))}><Icon name="chevron-right" size="sm" /></button>
          <div className="cal-titlewrap">
            <h2 className="cal-title" aria-live="polite">{title}</h2>
            <span className="small muted">{t('core.calendar.count', { n: inPeriod.length })}</span>
          </div>
        </div>
        <SegmentedControl<CalendarMode> ariaLabel={t('core.calendar.mode')} options={modeOptions} value={mode} onChange={onModeChange} size="sm" compact />
      </header>

      {inPeriod.length === 0 && (
        <div className="cal-empty" role="status">
          <span className="small muted">{t('core.calendar.empty')}</span>
          {prevEv && <Button size="sm" variant="ghost" icon="chevron-left" onClick={() => go(prevEv.startKey)}>{t('core.calendar.jumpPrev', { date: shortDay(prevEv.startKey) })}</Button>}
          {nextEv && <Button size="sm" variant="ghost" icon="chevron-right" onClick={() => go(nextEv.startKey)}>{t('core.calendar.jumpNext', { date: shortDay(nextEv.startKey) })}</Button>}
        </div>
      )}

      {mode === 'agenda' ? agenda() : compact ? compactGrid() : mode === 'month' ? month() : week()}
      {!compact && mode !== 'agenda' && dayOpen && dayList(dayOpen, true)}
      <p className="xs muted cal-hint">{t('core.calendar.hint')}</p>
    </section>
  );
}
