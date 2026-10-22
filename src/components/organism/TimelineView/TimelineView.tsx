import { useEffect, useMemo, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { useT } from '../../../i18n/I18nProvider';
import type { Lang } from '../../../i18n/types';
import { addDays, dateKey, formatDate, formatTime, fromDateKey, MS, studioParts, studioDate, startOfDay } from '../../../i18n/format';
import { useMinWidth } from '../../../layout/useMinWidth';
import { SegmentedControl, type SegmentOption } from '../../molecule/SegmentedControl/SegmentedControl';
import { Button } from '../../atom/Button/Button';
import { Icon } from '../../atom/Icon/Icon';
import { eventTone, mondayOf, nearestOutside, placeEvents, type EventAccessors, type PlacedEvent } from '../CalendarView/events';
import './TimelineView.css';

export type TimelineZoom = 'day' | 'week' | 'month' | 'quarter';
export const TIMELINE_ZOOMS: readonly TimelineZoom[] = ['day', 'week', 'month', 'quarter'];
/** Width of one axis unit per zoom in rem — mirrors `--tl-col` in TimelineView.css; used to keep labels from colliding. */
const COL_REM: Record<TimelineZoom, number> = { day: 6, week: 9, month: 2.75, quarter: 4.5 };
/** A point marker's label takes about this much room (rem) — used when stacking rows so labels do not overlap. */
const POINT_REM = 12;
const MIN_BAR_REM = 2.75;
/** Bars narrower than this (rem) carry their label beside them, like a point marker. */
const NARROW_REM = 7;

export interface TimelineGroup { key: string; label: string }

export interface TimelineViewProps<T> extends EventAccessors<T> {
  rows: T[];
  onOpen: (row: T) => void;
  /** Lanes: the row's group (teacher, room, status…). Absent = one lane. */
  getGroup?: (row: T) => TimelineGroup | null;
  /** Lane order by key (an enum's order); lanes not in it follow, by label. */
  groupOrder?: string[];
  /** What the lanes are (the column's name), for the lane header. */
  groupLabel?: string;
  zoom: TimelineZoom;
  onZoomChange: (zoom: TimelineZoom) => void;
  /** A day inside the range shown, `YYYY-MM-DD`. */
  cursor: string;
  onCursorChange: (dateKey: string) => void;
  lang: Lang;
  ariaLabel: string;
  selectedKey?: string | null;
}

/** The range a zoom shows around a cursor: [from, to) as local moments, plus the tick marks. */
export function timelineRange(zoom: TimelineZoom, cursor: string): { from: Date; to: Date; ticks: Date[] } {
  const c = fromDateKey(cursor);
  const at0 = startOfDay;
  if (zoom === 'day') { const from = at0(c); return { from, to: addDays(from, 1), ticks: Array.from({ length: 24 }, (_, h) => studioDate(studioParts(from).year, studioParts(from).month, studioParts(from).day, h)) }; }
  if (zoom === 'week') { const from = at0(mondayOf(c)); return { from, to: addDays(from, 7), ticks: Array.from({ length: 7 }, (_, i) => addDays(from, i)) }; }
  if (zoom === 'month') {
    const from = studioDate(studioParts(c).year, studioParts(c).month, 1); const to = studioDate(studioParts(c).year, studioParts(c).month + 1, 1);
    return { from, to, ticks: Array.from({ length: Math.round((to.getTime() - from.getTime()) / MS.day) }, (_, i) => addDays(from, i)) };
  }
  const q = Math.floor(studioParts(c).month / 3) * 3;
  const from = studioDate(studioParts(c).year, q, 1); const to = studioDate(studioParts(c).year, q + 3, 1);
  const ticks: Date[] = [];
  for (let d = at0(mondayOf(from)); d < to; d = addDays(d, 7)) ticks.push(d < from ? from : d);
  return { from, to, ticks };
}

/** The cursor moved by `n` ranges of a zoom. */
export function shiftTimeline(zoom: TimelineZoom, cursor: string, n: number): string {
  const c = fromDateKey(cursor);
  if (zoom === 'day') return dateKey(addDays(c, n));
  if (zoom === 'week') return dateKey(addDays(c, 7 * n));
  return dateKey(studioDate(studioParts(c).year, studioParts(c).month + n * (zoom === 'month' ? 1 : 3), 1, 12));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Placed<T> { ev: PlacedEvent<T>; l: number; w: number | null; narrow: boolean; cutStart: boolean; cutEnd: boolean; row: number; group: TimelineGroup | null }

/**
 * 0046 · TimelineView (M-03 "Línea de tiempo"): rows as bars on a horizontal time axis from their start to their end
 * (a point marker when there is no end), in lanes by a group (teacher, room, status…) with sticky lane labels.
 * Zoom day · week · month · quarter (segmented control, `+` / `−`), prev / today / next, a today line, horizontal
 * scroll with snap and arrow keys, focusable bars that open the row. Overlapping bars stack inside their lane.
 * Below 768 px the lanes collapse into one and each bar carries its group as a chip. Nothing is drag-only: bars open, they do not move.
 */
export function TimelineView<T>(props: TimelineViewProps<T>) {
  const { rows, onOpen, getGroup, groupOrder, groupLabel, zoom, onZoomChange, cursor, onCursorChange, lang, ariaLabel, selectedKey } = props;
  const t = useT();
  const compact = !useMinWidth('tablet');
  const scroller = useRef<HTMLDivElement>(null);
  const events = useMemo(() => placeEvents(rows, props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, props.getDate, props.getEnd, props.getTitle, props.getTone, props.getMuted, props.rowKey]);
  const { from, to, ticks } = timelineRange(zoom, cursor);
  const span = to.getTime() - from.getTime();
  const units = zoom === 'day' ? 24 : zoom === 'week' ? 7 : zoom === 'month' ? ticks.length : span / (7 * MS.day);
  const trackRem = units * COL_REM[zoom];
  const pct = (ms: number) => ((ms - from.getTime()) / span) * 100;
  const now = Date.now();
  const nowPct = now >= from.getTime() && now < to.getTime() ? pct(now) : null;

  // lanes → rows stacked so bars (and point labels) never overlap
  const lanes = useMemo(() => {
    const visible = events.filter((ev) => (ev.endMs ?? ev.startMs) >= from.getTime() && ev.startMs < to.getTime());
    const byLane = new Map<string, { group: TimelineGroup | null; items: Placed<T>[] }>();
    for (const ev of visible) {
      const group = getGroup?.(ev.row) ?? null;
      const laneKey = compact || !getGroup ? '__all' : group?.key ?? '__none';
      const l = Math.max(0, pct(ev.startMs));
      const w = ev.endMs == null ? null : Math.min(100, pct(ev.endMs)) - l;
      const lane = byLane.get(laneKey) ?? { group: compact || !getGroup ? null : group, items: [] };
      lane.items.push({ ev, l, w, narrow: w != null && w < (NARROW_REM / trackRem) * 100, cutStart: ev.startMs < from.getTime(), cutEnd: ev.endMs != null && ev.endMs > to.getTime(), row: 0, group });
      byLane.set(laneKey, lane);
    }
    const pointPct = (POINT_REM / trackRem) * 100, minPct = (MIN_BAR_REM / trackRem) * 100;
    for (const lane of byLane.values()) {
      const ends: number[] = [];
      for (const p of lane.items) {
        const right = p.l + (p.w == null ? pointPct : p.narrow ? Math.max(p.w, minPct) + pointPct : Math.max(p.w, minPct));
        let r = ends.findIndex((e) => e <= p.l);
        if (r === -1) { r = ends.length; ends.push(0); }
        ends[r] = right + 0.2;
        p.row = r;
      }
    }
    const order = groupOrder ?? [];
    const rank = (k: string) => { const i = order.indexOf(k); return i === -1 ? order.length : i; };
    return [...byLane.entries()].map(([key, v]) => ({ key, ...v, rows: Math.max(1, ...v.items.map((p) => p.row + 1)) }))
      .sort((a, b) => (a.key === '__none' ? 1 : 0) - (b.key === '__none' ? 1 : 0) || rank(a.key) - rank(b.key) || (a.group?.label ?? '').localeCompare(b.group?.label ?? ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, from.getTime(), to.getTime(), getGroup, groupOrder, compact, trackRem]);
  const count = lanes.reduce((n, l) => n + l.items.length, 0);
  const { prev: prevEv, next: nextEv } = count === 0 ? nearestOutside(events, dateKey(from), dateKey(new Date(to.getTime() - 1))) : { prev: undefined, next: undefined };

  // bring today (or the first bar) into view when the range changes
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    // the leftmost of the first row and the now line, so a late "now" never hides the morning's rows
    const marks = [...el.querySelectorAll<HTMLElement>('.tl-item, .tl-now')].map((n) => n.getBoundingClientRect().left);
    const label = el.querySelector<HTMLElement>('.tl-corner')?.offsetWidth ?? 0;
    if (marks.length === 0) { el.scrollLeft = 0; return; }
    const x = Math.min(...marks) - el.getBoundingClientRect().left + el.scrollLeft - label;
    el.scrollLeft = Math.max(0, x - el.clientWidth * 0.1);
  }, [zoom, cursor, count]);

  const tickLabel = (d: Date, i: number) => {
    if (zoom === 'day') return formatTime(d, lang);
    if (zoom === 'week') return cap(formatDate(d, lang, { weekday: 'short', day: 'numeric' }));
    if (zoom === 'month') return String(studioParts(d).day);
    return i === 0 || studioParts(d).day <= 7 ? cap(formatDate(d, lang, { day: 'numeric', month: 'short' })) : String(studioParts(d).day);
  };
  const isMajor = (d: Date, i: number) => (zoom === 'day' ? studioParts(d).hour % 6 === 0 : zoom === 'month' ? studioParts(d).weekday === 1 : zoom === 'quarter' ? i === 0 || studioParts(d).day <= 7 : true);
  const title = zoom === 'day' ? cap(formatDate(from, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    : zoom === 'week' ? `${formatDate(from, lang, { day: 'numeric', month: 'short' })} – ${formatDate(addDays(to, -1), lang, { day: 'numeric', month: 'short', year: 'numeric' })}`
      : zoom === 'month' ? cap(formatDate(from, lang, { month: 'long', year: 'numeric' }))
        : `${cap(formatDate(from, lang, { month: 'long' }))} – ${formatDate(addDays(to, -1), lang, { month: 'long', year: 'numeric' })}`;
  const when = (ev: PlacedEvent<T>) => {
    const fmt = (ms: number, end = false) => {
      const d = new Date(ms);
      if (ev.allDay) return formatDate(end ? new Date(ms - 1) : d, lang, { day: 'numeric', month: 'short', year: 'numeric' });
      return `${formatDate(d, lang, { day: 'numeric', month: 'short' })} ${formatTime(d, lang)}`;
    };
    return ev.endMs == null ? fmt(ev.startMs) : `${fmt(ev.startMs)} – ${fmt(ev.endMs, true)}`;
  };

  const zoomOptions: SegmentOption<TimelineZoom>[] = TIMELINE_ZOOMS.map((z) => ({ value: z, label: t(`core.timeline.${z}`) }));
  const zoomBy = (d: number) => { const i = TIMELINE_ZOOMS.indexOf(zoom) + d; if (i >= 0 && i < TIMELINE_ZOOMS.length) onZoomChange(TIMELINE_ZOOMS[i]); };
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    const el = e.target as HTMLElement;
    if (el.closest('input, select, textarea, [role="tablist"]') || e.altKey || e.ctrlKey || e.metaKey) return;
    const sc = scroller.current;
    const step = sc ? Math.max(sc.clientWidth / 4, 48) : 0;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(-1); }
    else if (e.key === '-' || e.key === '_' || e.key === '−') { e.preventDefault(); zoomBy(1); }
    else if (e.key === 't' || e.key === 'T') { e.preventDefault(); onCursorChange(dateKey()); }
    else if (e.key === 'PageUp') { e.preventDefault(); onCursorChange(shiftTimeline(zoom, cursor, -1)); }
    else if (e.key === 'PageDown') { e.preventDefault(); onCursorChange(shiftTimeline(zoom, cursor, 1)); }
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && sc) { e.preventDefault(); sc.scrollBy({ left: e.key === 'ArrowLeft' ? -step : step, behavior: 'smooth' }); }
    else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && el.classList.contains('tl-bar')) {
      const bars = [...(sc?.querySelectorAll<HTMLElement>('.tl-bar') ?? [])];
      const i = bars.indexOf(el) + (e.key === 'ArrowUp' ? -1 : 1);
      if (bars[i]) { e.preventDefault(); bars[i].focus(); }
    }
  };

  const noneLabel = t('core.timeline.noGroup');
  return (
    <section className={`tl tl-z-${zoom} ${compact ? 'is-compact' : ''}`} aria-label={ariaLabel} onKeyDown={onKey}>
      <header className="tl-head">
        <div className="tl-nav">
          <button type="button" className="tl-iconbtn ctl-round" aria-label={t('core.calendar.prev')} title={t('core.calendar.prev')} onClick={() => onCursorChange(shiftTimeline(zoom, cursor, -1))}><Icon name="chevron-left" size="sm" /></button>
          <Button size="sm" variant="secondary" onClick={() => onCursorChange(dateKey())}>{t('core.common.today')}</Button>
          <button type="button" className="tl-iconbtn ctl-round" aria-label={t('core.calendar.next')} title={t('core.calendar.next')} onClick={() => onCursorChange(shiftTimeline(zoom, cursor, 1))}><Icon name="chevron-right" size="sm" /></button>
          <div className="tl-titlewrap">
            <h2 className="tl-title" aria-live="polite">{title}</h2>
            <span className="small muted">{t('core.calendar.count', { n: count })}</span>
          </div>
        </div>
        <div className="tl-zoom">
          <button type="button" className="tl-iconbtn ctl-round" aria-label={t('core.graph.zoomOut')} title={`${t('core.graph.zoomOut')} (−)`} disabled={zoom === 'quarter'} onClick={() => zoomBy(1)}><Icon name="zoom-out" size="sm" /></button>
          <SegmentedControl<TimelineZoom> ariaLabel={t('core.timeline.zoom')} options={zoomOptions} value={zoom} onChange={onZoomChange} size="sm" />
          <button type="button" className="tl-iconbtn ctl-round" aria-label={t('core.graph.zoomIn')} title={`${t('core.graph.zoomIn')} (+)`} disabled={zoom === 'day'} onClick={() => zoomBy(-1)}><Icon name="zoom-in" size="sm" /></button>
        </div>
      </header>

      {count === 0 && (
        <div className="tl-empty" role="status">
          <span className="small muted">{t('core.calendar.empty')}</span>
          {prevEv && <Button size="sm" variant="ghost" icon="chevron-left" onClick={() => onCursorChange(prevEv.startKey)}>{t('core.calendar.jumpPrev', { date: formatDate(prevEv.startKey, lang, { day: 'numeric', month: 'short', year: 'numeric' }) })}</Button>}
          {nextEv && <Button size="sm" variant="ghost" icon="chevron-right" onClick={() => onCursorChange(nextEv.startKey)}>{t('core.calendar.jumpNext', { date: formatDate(nextEv.startKey, lang, { day: 'numeric', month: 'short', year: 'numeric' }) })}</Button>}
        </div>
      )}

      <div ref={scroller} className="tl-scroll" tabIndex={0} role="group" aria-label={`${title} · ${t('core.timeline.hint')}`}>
        <div className="tl-grid" style={{ '--tl-units': units } as CSSProperties}>
          <div className="tl-corner">{compact || !getGroup ? t('core.timeline.all') : groupLabel ?? ''}</div>
          <div className="tl-axis" aria-hidden>
            {ticks.map((d, i) => (
              <span key={d.getTime()} className={`tl-tick ${isMajor(d, i) ? 'is-major' : ''} ${dateKey(d) === dateKey() && zoom !== 'day' ? 'is-today' : ''}`} style={{ '--l': pct(d.getTime()) } as CSSProperties}>{tickLabel(d, i)}</span>
            ))}
            {nowPct != null && <span className="tl-nowcap" style={{ '--l': nowPct } as CSSProperties}>{t('core.timeline.now')}</span>}
          </div>
          {lanes.map((lane) => (
            <div key={lane.key} className="tl-lane" role="list" aria-label={lane.group?.label ?? (lane.key === '__none' ? noneLabel : t('core.timeline.all'))}>
              <div className="tl-lanelabel" title={lane.group?.label}>
                <span className="tl-lanename">{lane.key === '__all' ? t('core.timeline.all') : lane.group?.label ?? noneLabel}</span>
                <span className="tl-lanecount">{lane.items.length}</span>
              </div>
              <div className="tl-track" style={{ '--rows': lane.rows } as CSSProperties}>
                {ticks.map((d, i) => <span key={d.getTime()} className={`tl-line ${isMajor(d, i) ? 'is-major' : ''}`} style={{ '--l': pct(d.getTime()) } as CSSProperties} aria-hidden />)}
                {nowPct != null && <span className="tl-now" style={{ '--l': nowPct } as CSSProperties} aria-hidden />}
                {lane.items.map(({ ev, l, w, narrow, cutStart, cutEnd, row, group }) => {
                  const label = `${ev.title} · ${when(ev)}${compact && group ? ` · ${group.label}` : ''}`;
                  return (
                    <div key={ev.key} role="listitem" className={`tl-item ${narrow ? 'is-narrow' : ''}`} style={{ '--l': l, '--w': w ?? 0, '--row': row } as CSSProperties}>
                      <button type="button" className={`tl-bar ${w == null ? 'is-point' : ''} ${cutStart ? 'is-cut-start' : ''} ${cutEnd ? 'is-cut-end' : ''} ${ev.muted ? 'is-muted' : ''} ${selectedKey === ev.key ? 'is-selected' : ''}`}
                        {...eventTone(ev.tone)} title={label} aria-label={label} onClick={() => onOpen(ev.row)}>
                        {w == null && <span className="tl-diamond" aria-hidden />}
                        {!narrow && <span className="tl-bar-title">{ev.title}</span>}
                        {!narrow && compact && group && <span className="tl-bar-group">{group.label}</span>}
                      </button>
                      {narrow && <span className="tl-outside" aria-hidden><span className="tl-bar-title">{ev.title}</span>{compact && group && <span className="tl-bar-group">{group.label}</span>}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="xs muted tl-hint">{t('core.timeline.hint')}</p>
    </section>
  );
}
