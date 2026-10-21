import { useEffect, useState, type ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { addDays, dateKey, formatDate, formatTime, fromDateKey, isSameDay } from '../../../i18n/format';
import { useMinWidth } from '../../../layout/useMinWidth';
import type { ClassSessionRow, ModalityRow, TeacherRow } from '../../../data/schema';
import { classDisplay } from '../../../modules/admin/settings';
import { ClassRow } from '../../molecule/ClassRow/ClassRow';
import { ClassThumbnail } from '../../molecule/ClassThumbnail/ClassThumbnail';
import './SessionCalendar.css';
import { sessionUnavailableReason } from '../../../data/sessionAvailability';
export type CalendarView = 'day' | 'week' | 'month';
export interface CalendarSession { session: ClassSessionRow; modality?: ModalityRow; teacher?: TeacherRow; templateActive?: boolean }
export interface SessionCalendarProps { sessions: CalendarSession[]; onPick: (s: ClassSessionRow) => void; mine?: Set<string>; initialView?: CalendarView; allowUnavailable?: boolean }
/** Dots a compact day cell shows: one per class (capped) coloured by the modality tone; cancelled / completed classes are dimmed. */
const MAX_DOTS = 4;
/**
 * Photo calendar with day, week and month views. From 900 px (`shell` breakpoint) the week and month are the seven-column
 * card grids. Below 900 px (0026) they are phone views: the week is a snap-scrolling day strip and the month a compact
 * 7-column grid of 44 px day cells with class-tone dots, both above the selected day's class list — no horizontal
 * scroll region, no clipped columns.
 */
export function SessionCalendar({ sessions, onPick, mine, initialView = 'week', allowUnavailable = false }: SessionCalendarProps) {
  const { t, lang, bi } = useI18n();
  const [now, setNow] = useState(Date.now);
  // Refresh at the next start/end boundary, including a resumed background tab.
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const boundary = sessions.flatMap(x => [Date.parse(x.session.starts_at), Date.parse(x.session.ends_at)]).filter(at => at > now).sort((a, b) => a - b)[0];
    const timer = window.setTimeout(refresh, Math.min(boundary ? Math.max(1, boundary - Date.now() + 1) : 60000, 60000));
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [sessions, now]);
  const reason = (x: CalendarSession) => sessionUnavailableReason(x, now);
  const pick = (x: CalendarSession) => { if (allowUnavailable || !sessionUnavailableReason(x)) onPick(x.session); };
  const compact = !useMinWidth('shell');
  const [view, setView] = useState<CalendarView>(initialView);
  const [date, setDate] = useState(() => { const next = sessions.find(x => x.session.status === 'scheduled' && new Date(x.session.starts_at).getTime() > Date.now()); return initialView === 'week' && next ? fromDateKey(dateKey(new Date(next.session.starts_at))) : fromDateKey(dateKey()); });
  const monday = addDays(date, -((date.getDay() + 6) % 7));
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const gridStart = addDays(monthStart, -((monthStart.getDay() + 6) % 7));
  const days = Array.from({ length: view === 'month' ? 42 : view === 'week' ? 7 : 1 }, (_, i) => addDays(view === 'month' ? gridStart : view === 'week' ? monday : date, i));
  const onDay = (d: Date) => sessions.filter(x => isSameDay(x.session.starts_at, d));
  const move = (n: number) => setDate(view === 'month' ? new Date(date.getFullYear(), date.getMonth() + n, 1, 12) : addDays(date, n * (view === 'week' ? 7 : 1)));
  const name = (x: CalendarSession) => classDisplay({ title: x.session.title, modalityName: x.modality ? bi({ es: x.modality.name_es, en: x.modality.name_en }) : null, teacher: x.teacher?.display_name ?? '' });
  const openDay = (d: Date) => { setDate(d); setView('day'); };
  const today = new Date();
  const longDay = (d: Date) => formatDate(d, lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const cellLabel = (d: Date) => `${longDay(d)} · ${t('site.calendar.classes', { n: onDay(d).length })}`;
  const cellClass = (d: Date, base: string) => `${base} ${isSameDay(d, date) ? 'is-selected' : ''} ${isSameDay(d, today) ? 'is-today' : ''} ${view === 'month' && d.getMonth() !== date.getMonth() ? 'is-outside' : ''}`;
  const dots = (d: Date) => { const list = onDay(d); return <span className="calendar-dots" aria-hidden>{list.slice(0, MAX_DOTS).map(x => <i key={x.session.id} className={`calendar-dot ${reason(x) ? 'is-off' : ''}`} data-tone={x.modality?.tone ?? 'river'} />)}{list.length > MAX_DOTS && <small>+{list.length - MAX_DOTS}</small>}</span>; };
  /** The selected day's classes as rows — the day view, and the list under the compact week strip and month grid. */
  const dayList = (d: Date, full: boolean): ReactNode => <>
    <div className="calendar-day-heading"><span className="eyebrow">{full ? longDay(d) : formatDate(d, lang, { weekday: 'long' })}</span><span className="small muted">{t('site.calendar.classes', { n: onDay(d).length })}</span></div>
    {onDay(d).length === 0 && <p className="calendar-empty">{t('site.calendar.empty')}</p>}
    {onDay(d).map(x => <ClassRow key={x.session.id} {...name(x)} thumbnail={<ClassThumbnail modality={x.modality}/>} startsAt={x.session.starts_at} durationMin={Math.round((Date.parse(x.session.ends_at) - Date.parse(x.session.starts_at)) / 60000)} tone={x.modality?.tone ?? 'river'} booked={x.session.booked_count} capacity={x.session.capacity} status={x.session.status} booked_by_me={mine?.has(x.session.id)} disabled={!allowUnavailable && !!reason(x)} availabilityLabel={reason(x) ? t(`site.calendar.status.${reason(x)}`) : undefined} onClick={() => pick(x)} />)}
  </>;
  return <section className={`session-calendar ${compact ? 'is-compact' : ''}`}>
    <div className="calendar-toolbar">
      <div className="calendar-period"><div className="calendar-arrows"><button type="button" aria-label={t('site.calendar.prev')} onClick={() => move(-1)}>‹</button><button type="button" aria-label={t('site.calendar.next')} onClick={() => move(1)}>›</button></div><h2 aria-live="polite">{view === 'day' ? formatDate(date, lang, { day: 'numeric', month: 'long', year: 'numeric' }) : view === 'week' ? `${formatDate(days[0], lang, { day: 'numeric', month: 'short' })} — ${formatDate(days[6], lang, { day: 'numeric', month: 'short', year: 'numeric' })}` : formatDate(date, lang, { month: 'long', year: 'numeric' })}</h2></div>
      <div className="calendar-controls"><button className="calendar-today" type="button" onClick={() => setDate(fromDateKey(dateKey()))}>{t('core.common.today')}</button><div className="calendar-views" role="group" aria-label={t('site.calendar.view')}>{(['day','week','month'] as CalendarView[]).map(v => <button key={v} type="button" aria-pressed={v === view} onClick={() => setView(v)}>{t(`site.calendar.${v}`)}</button>)}</div><label className="calendar-date-label"><span className="sr-only">{t('site.calendar.date')}</span><input type="date" value={dateKey(date)} aria-label={t('site.calendar.date')} onChange={e => { if (e.target.value) setDate(fromDateKey(e.target.value)); }} /></label></div>
    </div>
    <div className={`calendar-window calendar-${view}`}>
      {view === 'day' ? dayList(date, false) : compact && view === 'week' ? <>
        <div className="calendar-strip" role="group" aria-label={t('site.calendar.weekStrip')}>{days.map(d => <button key={dateKey(d)} type="button" className={cellClass(d, 'calendar-strip-day')} aria-pressed={isSameDay(d, date)} aria-label={cellLabel(d)} onClick={() => setDate(d)}><span>{formatDate(d, lang, { weekday: 'short' })}</span><strong>{d.getDate()}</strong>{dots(d)}</button>)}</div>
        {dayList(date, true)}
      </> : compact && view === 'month' ? <>
        <div className="calendar-month-compact" role="group" aria-label={t('site.calendar.monthGrid')}>
          {days.slice(0, 7).map(d => <span key={`h-${dateKey(d)}`} className="calendar-weekday" aria-hidden>{formatDate(d, lang, { weekday: 'short' })}</span>)}
          {days.map(d => <button key={dateKey(d)} type="button" className={cellClass(d, 'calendar-cell')} aria-pressed={isSameDay(d, date)} aria-label={cellLabel(d)} onClick={() => setDate(d)}><strong>{d.getDate()}</strong>{dots(d)}</button>)}
        </div>
        {dayList(date, true)}
      </> : <>
        <div className="calendar-grid">{days.map(d => <div key={dateKey(d)} className={`calendar-column ${isSameDay(d, today) ? 'is-today' : ''} ${view === 'month' && d.getMonth() !== date.getMonth() ? 'is-outside' : ''}`}>
          <button className="calendar-day-head" type="button" onClick={() => openDay(d)} aria-label={longDay(d)}><span>{formatDate(d, lang, { weekday: 'short' })}</span><strong>{d.getDate()}</strong><small>{t('site.calendar.classes', { n: onDay(d).length })}</small></button>
          {onDay(d).length === 0 && <p className="calendar-empty small">{t('site.calendar.noClasses')}</p>}
          {onDay(d).slice(0, view === 'month' ? 2 : undefined).map(x => <button key={x.session.id} type="button" className={`calendar-session ${reason(x) ? 'is-off' : ''}`} data-tone={x.modality?.tone ?? 'river'} disabled={!allowUnavailable && !!reason(x)} onClick={() => pick(x)}>
            <ClassThumbnail modality={x.modality}/><span className="calendar-session-copy"><time>{formatTime(x.session.starts_at, lang)}</time><strong>{name(x).title}</strong>{view === 'week' && <span>{x.teacher?.display_name}</span>}<small>{reason(x) ? t(`site.calendar.status.${reason(x)}`) : mine?.has(x.session.id) ? t('core.status.booked') : x.session.booked_count >= x.session.capacity ? t('core.common.full') : t('core.common.spots', { n: x.session.capacity - x.session.booked_count })}</small></span>
          </button>)}
          {view === 'month' && onDay(d).length > 2 && <button type="button" className="calendar-more" onClick={() => openDay(d)}>{t('site.calendar.more', { n: onDay(d).length - 2 })}</button>}
        </div>)}</div>
      </>}
    </div>
    <p className="calendar-footnote small muted">{t('site.calendar.note')}</p>
  </section>;
}
