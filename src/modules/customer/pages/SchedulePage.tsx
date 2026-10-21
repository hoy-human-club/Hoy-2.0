import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useTable } from '../../../data/DataContext';
import type { ClassSessionRow, ModalityRow, TeacherRow } from '../../../data/schema';
import { useLayout } from '../../../layout/useLayout';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Button } from '../../../components/atom/Button/Button';
import { Select } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { SessionCalendar } from '../../../components/organism/SessionCalendar/SessionCalendar';
import { canvasSpecs } from '../specs';
import { useAllSessionsJoined, useMyBookings } from '../hooks';
import { PageHead } from '../ui';
import { useActions } from '../../../actions';
import { sessionUnavailableReason } from '../../../data/sessionAvailability';
import { need, useAppNavHandlers } from '../actions';

const specDay = canvasSpecs['C-02'];
const specWeek = canvasSpecs['C-02b'];
type View = 'today' | 'week';
export interface SchedulePageProps { view?: View }
type TimeOfDay = 'all' | 'morning' | 'evening';
interface Filters { modality: string; teacher: string; time: TimeOfDay }
const DEFAULT: Filters = { modality: 'all', teacher: 'all', time: 'all' };
const FKEY = 'hoyos.customer.scheduleFilters';
/** Reads the persisted filters, keeping only today's keys: an older shape (pre-0039, with a colour-group key) loses its unknown keys, anything unreadable is DEFAULT. */
function loadFilters(): Filters {
  try {
    const raw = sessionStorage.getItem(FKEY);
    const s = raw ? JSON.parse(raw) as Record<string, unknown> : null;
    if (!s || typeof s !== 'object') return DEFAULT;
    const str = (v: unknown, d: string) => (typeof v === 'string' && v ? v : d);
    const time = s.time === 'morning' || s.time === 'evening' ? s.time : 'all';
    return { modality: str(s.modality, DEFAULT.modality), teacher: str(s.teacher, DEFAULT.teacher), time };
  } catch { return DEFAULT; }
}

/** C-02 Class schedule; with `view="week"` it is C-02b at /app/schedule/week (`?view=week` redirects there). */
export function SchedulePage({ view: routeView }: SchedulePageProps) {
  const { t, bi } = useI18n();
  const nav = useNavigate();
  const { user } = useSession();
  const [params] = useSearchParams();
  const view: View = routeView ?? 'today';
  const { sections, isVisible } = useLayout(view === 'week' ? specWeek : specDay);

  // Deep link from the website: /app/schedule?session=<id> → class detail.
  useEffect(() => { const s = params.get('session'); if (s) nav(`/app/class/${s}`, { replace: true }); else if (params.get('view') === 'week') nav('/app/schedule/week', { replace: true }); }, [params, nav]);

  const [sheet, setSheet] = useState(false);
  const [filters, setFilters] = useState<Filters>(loadFilters);
  useEffect(() => { try { sessionStorage.setItem(FKEY, JSON.stringify(filters)); } catch { /* ignore */ } }, [filters]);

  const all = useAllSessionsJoined();
  const { rows: modalities } = useTable<ModalityRow>('modalities', { where: { active: true } });
  const visibleMods = modalities;
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true } });
  const { rows: myBookings } = useMyBookings();
  const mine = useMemo(() => new Set(myBookings.filter((b) => b.status === 'booked').map((b) => b.session_id)), [myBookings]);

  const matches = (x: (typeof all)[number]) => {
    const h = new Date(x.session.starts_at).getHours();
    return (filters.modality === 'all' || x.session.modality_id === filters.modality)
      && (filters.teacher === 'all' || x.session.teacher_id === filters.teacher)
      && (filters.time === 'all' || (filters.time === 'morning' ? h < 12 : h >= 12));
  };
  // 0039: one chip per visible class type in its tone; the bar and the filter sheet share it, so they never disagree.
  const pickModality = (id: string) => setFilters((f) => ({ ...f, modality: f.modality === id ? 'all' : id }));
  const classChips = visibleMods.map((m) => <Chip key={m.id} tone={m.tone} dot selected={filters.modality === m.id} onClick={() => pickModality(m.id)}>{bi({ es: m.name_es, en: m.name_en })}</Chip>);
  const activeFilters = Object.entries(filters).filter(([, v]) => v !== 'all').length;
  const filtered = useMemo(() => all.filter(matches), [all, filters]);

  // WebMCP (0025): app.reserve opens checkout for a session id; the id must be a bookable session in the schedule.
  const allRef = useRef(all); allRef.current = all;
  const navHandlers = useAppNavHandlers();
  const handlers = useMemo(() => ({
    ...navHandlers,
    'app.reserve': (p?: Record<string, string>) => {
      const id = need(p, 'session');
      const x = allRef.current.find((j) => j.session.id === id);
      if (!x) throw new Error(`unknown session "${id}"`);
      if (sessionUnavailableReason(x)) throw new Error(`session "${id}" is not bookable (${x.session.status})`);
      nav(`/app/checkout/${id}`);
      return `opened /app/checkout/${id}`;
    },
  }), [navHandlers, nav]);
  useActions(specDay, handlers);
  const isFull = (s: ClassSessionRow) => s.status === 'scheduled' && s.booked_count >= s.capacity;
  // A class with no spots left cannot be booked: the row leads to the waitlist (C-20) instead of the booking screen.
  const open = (s: ClassSessionRow) => nav(isFull(s) && !mine.has(s.id) ? `/app/waitlist/${s.id}` : `/app/class/${s.id}`);

  const SECTIONS: Record<string, () => ReactNode> = {
    'ViewSwitch (Today / Week)': () => <PageHead title={t('customer.schedule.title')} sub={t('customer.schedule.sub')} />,
    DateStrip: () => null,
    'FilterBar → FilterSheet': () => (
      <div className="cust-filters">
        <div className="cust-filters-scroll">
          <Chip selected={filters.modality === 'all'} onClick={() => setFilters((f) => ({ ...f, modality: 'all' }))}>{t('core.common.all')}</Chip>
          {classChips}
        </div>
        <Button size="sm" variant={activeFilters > 0 ? 'primary' : 'secondary'} onClick={() => setSheet(true)} icon="filter">{t('core.common.filter')}{activeFilters > 0 ? ` · ${activeFilters}` : ''}</Button>
      </div>
    ),
    'ClassList → ClassRow': () => view === 'today' ? <SessionCalendar sessions={filtered} mine={mine} initialView="day" onPick={open} /> : null,
    // The Today page renders one calendar (its toolbar already switches Day / Week / Month); the week route is C-02b.
    WeekGrid: () => view === 'week' ? <SessionCalendar sessions={filtered} mine={mine} initialView="week" onPick={open} /> : null,
    'WeekGrid (Mon–Sat columns → DayChip)': () => <SessionCalendar sessions={filtered} mine={mine} initialView="week" onPick={open} />,
    Legend: () => (
      <div className="row wrap cust-legend">
        <span className="eyebrow">{t('customer.schedule.legend')}</span>
        {visibleMods.map((m) => <Chip key={m.id} tone={m.tone} dot>{bi({ es: m.name_es, en: m.name_en })}</Chip>)}
      </div>
    ),
  };

  return (
    <div className="container page cust-page">
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
      {user.role === 'public' && null}
      <Drawer open={sheet} onClose={() => setSheet(false)} title={t('customer.schedule.filters')} side="bottom"
        footer={<><Button variant="ghost" onClick={() => setFilters(DEFAULT)}>{t('customer.schedule.clearFilters')}</Button><Button onClick={() => setSheet(false)}>{t('customer.schedule.apply')}</Button></>}>
        <div className="stack">
          <Field label={t('customer.schedule.filter.time')}>{(id) => (
            <div className="row wrap" id={id}>{(['all', 'morning', 'evening'] as TimeOfDay[]).map((k) => <Chip key={k} selected={filters.time === k} onClick={() => setFilters((f) => ({ ...f, time: k }))}>{t(`customer.schedule.filter.time.${k}`)}</Chip>)}</div>
          )}</Field>
          <Field label={t('customer.schedule.filter.modality')}>{(id) => (
            <div className="row wrap" id={id} role="group"><Chip selected={filters.modality === 'all'} onClick={() => setFilters((f) => ({ ...f, modality: 'all' }))}>{t('core.common.all')}</Chip>{classChips}</div>
          )}</Field>
          <Field label={t('customer.schedule.filter.teacher')}>{(id) => (
            <Select id={id} value={filters.teacher} onChange={(e) => setFilters((f) => ({ ...f, teacher: e.target.value }))}>
              <option value="all">{t('core.common.all')}</option>
              {teachers.map((te) => <option key={te.id} value={te.id}>{te.display_name}</option>)}
            </Select>
          )}</Field>
        </div>
      </Drawer>
    </div>
  );
}
