import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { SplitSections } from './split';
import { useActions } from '../../actions';
import { useAppNavHandlers } from './actions';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useTable } from '../../data/DataContext';
import type { ActivityEventRow, BookingRow, MembershipRow, PracticeGoalRow } from '../../data/schema';
import { formatDate, isSameDay, fromDateKey } from '../../i18n/format';
import { useLayout } from '../../layout/useLayout';
import { canvasSpecs } from './specs';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { ClassRow } from '../../components/molecule/ClassRow/ClassRow';
import { ClassCard } from '../../components/organism/ClassCard/ClassCard';
import { useSessionsJoined } from '../website/hooks';
import { EmptyHomeBlock } from './pages/blocks';
import { WeekDots } from '../../components/molecule/WeekDots/WeekDots';
import { usePracticeStats, useMilestoneRecorder } from '../../data/useAnalytics';
import type { PracticeStats } from '../../data/analytics';
import { toast } from '../../app/toast';
import { useEntitlements } from './hooks';
import { plural, weekInitials, PracticeGoalPicker, PracticeStreak, usePracticeHandlers, useSaveGoal } from './practice';
import './customer.css';
import { Icon } from '../../components/atom/Icon/Icon';

const spec = canvasSpecs['C-01'];
const HOME_SIDE = new Set(['MembershipNudge (if no plan)', 'AnnouncementCard (if active)', 'QuickActions ×4', 'StatsRow ×3', 'FeedbackPrompt (conditional)']);

/** C-01 Home. Sections come from the layout editor order; each block is independently toggleable later via feature_flags. */
export function CustomerHomePage() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const { user } = useSession();
  const { sections, isVisible } = useLayout(spec);
  const { stats, goal, loading: practiceLoading } = usePracticeStats();
  useMilestoneRecorder(stats);
  useMilestoneToast(stats, practiceLoading);
  const navHandlers = useAppNavHandlers();
  const practiceHandlers = usePracticeHandlers(stats.suggestedTarget);
  useActions(spec, useMemo(() => ({ ...navHandlers, ...practiceHandlers }), [navHandlers, practiceHandlers]));

  const { rows: myBookings, loading: bookingsLoading } = useTable<BookingRow>('bookings', { where: { user_id: user.id } });
  const { rows: memberships } = useTable<MembershipRow>('memberships', { where: { user_id: user.id, status: 'active' } });
  const ent = useEntitlements();
  const all = useSessionsJoined();
  const now = Date.now();

  const activeBookingIds = useMemo(() => new Set(myBookings.filter((b) => b.status === 'booked').map((b) => b.session_id)), [myBookings]);
  const next = useMemo(() => all.filter((x) => activeBookingIds.has(x.session.id) && new Date(x.session.ends_at).getTime() > now && x.session.status === 'scheduled').sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at))[0], [all, activeBookingIds, now]);
  const today = useMemo(() => {
    // 0030: plain start-time order (the A-05 intention sort is retired with the question)
    return all.filter((x) => isSameDay(x.session.starts_at, new Date()) && x.session.status === 'scheduled' && new Date(x.session.ends_at).getTime() > now);
  }, [all, now]);
  const membership = memberships[0];

  const book = (sessionId: string) => nav(`/app/checkout/${sessionId}`);

  const SECTIONS: Record<string, () => ReactNode> = {
    'TopBar (logo, avatar, bell)': () => <h1 className="cust-greeting">{t('customer.home.greeting', { name: user.name.split(' ')[0] })}</h1>,
    'FeedbackPrompt (conditional)': () => null,
    // 0051: the nudge reads the package (no membership at launch); a member with classes left sees nothing here.
    'MembershipNudge (if no plan)': () => membership
      ? <p className="small muted">{t('customer.home.membership.active', { date: formatDate(membership.renews_at ?? membership.starts_at, lang) })}</p>
      : ent.pkg.left > 0 ? null : <Card tone="highlight" className="row-between wrap"><span className="small">{t('customer.home.membership.nudge')}</span><Link to="/app/plans"><Button size="sm" variant="secondary">{t('customer.home.membership.cta')}</Button></Link></Card>,
    'AnnouncementCard (if active)': () => <Card tone="muted" eyebrow={t('customer.home.announcement')}><p className="small">{t('customer.home.announcement.body')}</p></Card>,
    'NextClassCard + countdown': () => (
      <section className="stack-sm">
        <div className="eyebrow">{t('customer.home.next')}</div>
        {next
          ? <ClassCard variant="next" title={next.session.title} teacher={next.teacher?.display_name ?? ''} room="Sala principal" startsAt={next.session.starts_at} endsAt={next.session.ends_at} tone={next.modality?.tone ?? 'river'} booked={next.session.booked_count} capacity={next.session.capacity} cta={{ label: t('customer.home.view'), onClick: () => nav(`/app/class/${next.session.id}`) }} />
          : <Card className="row-between wrap"><span className="muted small">{t('customer.home.next.empty')}</span><Link to="/app/schedule"><Button size="sm">{t('customer.home.next.cta')}</Button></Link></Card>}
      </section>
    ),
    'QuickActions ×4': () => (
      <div className="cust-quick">
        {([['/app/schedule', 'schedule', 'schedule'], ['/app/schedule', 'calendar-plus', 'book'], ['/app/plans', 'ticket', 'plans'], ['/app/invite', 'invite', 'invite']] as const).map(([to, icon, k]) => <Link key={k} to={to} className="cust-quick-btn"><span className="cust-quick-icon" aria-hidden><Icon name={icon} size="lg" /></span><span>{t(`customer.home.quick.${k}`)}</span></Link>)}
      </div>
    ),
    'TodayList': () => (
      <section className="stack-sm">
        <div className="eyebrow">{t('customer.home.today')}</div>
        <Card padding="sm">
          {today.length === 0 && <p className="muted small" style={{ padding: 'var(--sp-md)' }}>{t('customer.home.today.empty')}</p>}
          {today.map(({ session: s, modality: m, teacher: te }) => (
            <ClassRow key={s.id} title={s.title} teacher={te?.display_name ?? ''} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} tone={m?.tone ?? 'river'} booked={s.booked_count} capacity={s.capacity} booked_by_me={activeBookingIds.has(s.id)} onClick={() => (activeBookingIds.has(s.id) ? nav(`/app/class/${s.id}`) : s.booked_count >= s.capacity ? nav(`/app/waitlist/${s.id}`) : book(s.id))} />
          ))}
        </Card>
      </section>
    ),
    // 0040: the section keeps its name (stored layouts reference it); it renders the practice block.
    'StatsRow ×3': () => <PracticeBlock stats={stats} goal={goal} />,
    'EventsStrip → BottomNav': () => null,
  };

  // E-01: day one — no booking, no history — teaches the next step instead of empty containers.
  if (!bookingsLoading && myBookings.length === 0) return <div className="container page"><EmptyHomeBlock /></div>;

  return (
    <div className="container page cust-home">
      {/* ≥ 900 px: greeting across, next class + today on the left, membership / notice / quick actions / stats on the right. */}
      <SplitSections className="cust-home-split" names={sections.filter(isVisible)} render={(n) => SECTIONS[n]?.() ?? null}
        full={(n) => n === 'TopBar (logo, avatar, bell)'} side={(n) => HOME_SIDE.has(n)} />
    </div>
  );
}

/**
 * C-01 practice block (0040). Three tiles that each say what they count — classes attended this month (by session
 * date), weeks in a row on the goal, and the plan balance named by what it is — then the week as dots and a real
 * link to C-27. With no goal row yet the streak tile becomes the weekly-goal question; "sin meta" hides the streak.
 */
function PracticeBlock({ stats, goal }: { stats: PracticeStats; goal: PracticeGoalRow | null }) {
  const { t, lang } = useI18n();
  const ent = useEntitlements();
  const save = useSaveGoal(stats.suggestedTarget);
  const asked = goal != null;
  const m = ent.membership;
  const unlimited = !!m && ent.plan?.classes == null;
  const upcoming = stats.bookedUpcoming > 0 ? plural(t, 'customer.home.stats.upcoming', stats.bookedUpcoming) : t('customer.home.stats.upcoming.none');

  const planTile = m?.status === 'active' && unlimited
    ? <StatTile label={t('customer.home.stats.membership')} value={t('customer.home.stats.unlimited')} hint={t('customer.home.stats.renews', { date: formatDate(m.renews_at ?? m.starts_at, lang, { day: 'numeric', month: 'short' }) })} />
    : m?.status === 'paused' && unlimited
      ? <StatTile label={t('customer.home.stats.membership')} value={t('customer.home.stats.paused')} hint={m.paused_until ? t('customer.home.stats.pausedUntil', { date: formatDate(m.paused_until, lang, { day: 'numeric', month: 'short' }) }) : undefined} />
      : <StatTile label={t('customer.home.stats.package')} value={ent.pkg.left}
          hint={ent.pkg.frozen && ent.pkg.frozenUntil ? t('customer.home.stats.frozenUntil', { date: formatDate(ent.pkg.frozenUntil, lang, { day: 'numeric', month: 'short' }) }) : ent.pkg.left > 0 && ent.nextExpiry ? t('customer.home.stats.expires', { date: formatDate(ent.nextExpiry, lang, { day: 'numeric', month: 'short' }) }) : ent.pkg.left === 0 && !m ? t('customer.home.stats.noPlan') : undefined} />;

  return (
    <section className="stack-sm cust-practice" aria-labelledby="cust-practice-title">
      <div className="row-between wrap">
        <h2 className="eyebrow" id="cust-practice-title">{t('customer.home.stats.title')}</h2>
        <Link to="/app/practice" className="cust-practice-link">{t('customer.home.stats.more')} <Icon name="arrow-right" size="xs" /></Link>
      </div>
      <div className={`grid cust-practice-tiles ${stats.hasGoal ? '' : 'is-two'}`}>
        <StatTile label={t('customer.home.stats.classes')} value={stats.attendedThisMonth} hint={upcoming} />
        {stats.hasGoal && (
          <div className="stat cust-practice-streak">
            <div className="eyebrow stat-label">{t('customer.home.stats.streak')}</div>
            <PracticeStreak stats={stats} />
          </div>
        )}
        {planTile}
      </div>
      {!asked && (
        <Card tone="highlight" padding="md" className="stack-sm">
          <h3 className="cust-practice-q">{t('customer.home.goal.title')}</h3>
          <PracticeGoalPicker value={null} suggested={stats.suggestedTarget} onPick={(n) => { void save(n); }} />
        </Card>
      )}
      <Card padding="sm" className="cust-practice-week">
        <WeekDots days={stats.thisWeek.days} target={stats.target} attended={stats.thisWeek.attended} labels={weekInitials(t)} size="sm">
          {stats.hasGoal ? t('customer.home.stats.week', { attended: stats.thisWeek.attended, target: stats.target }) : plural(t, 'customer.home.stats.weekNoGoal', stats.thisWeek.attended)}
        </WeekDots>
      </Card>
    </section>
  );
}

/**
 * A one-time "¡Clase número N!" when useMilestoneRecorder has just written a milestone event this session: the
 * milestone events present on first load are the baseline; a reached milestone missing from it, recent (≤ 14 days,
 * so a member's old history is not celebrated on their first visit) and not toasted yet, is announced once.
 */
function useMilestoneToast(stats: PracticeStats, loading: boolean) {
  const { t } = useI18n();
  const { user } = useSession();
  const { rows: events, loading: evLoading } = useTable<ActivityEventRow>('activity_events', { where: { user_id: user.id, kind: 'milestone' } });
  const baseline = useRef<Set<number> | null>(null);
  const shown = useRef(new Set<number>());
  useEffect(() => {
    if (loading || evLoading) return;
    if (!baseline.current) { baseline.current = new Set(events.map((e) => Number(e.payload?.count))); return; }
    const recorded = new Set(events.map((e) => Number(e.payload?.count)));
    const since = Date.now() - 14 * 86_400_000;
    const fresh = stats.milestoneDates.filter((d) => recorded.has(d.at) && !baseline.current!.has(d.at) && !shown.current.has(d.at) && fromDateKey(d.on).getTime() >= since);
    for (const d of fresh) shown.current.add(d.at);
    const top = fresh.map((d) => d.at).sort((a, b) => b - a)[0];
    if (top) toast(t('customer.home.milestone', { n: top }), 'success', 6000);
  }, [events, loading, evLoading, stats.milestoneDates, t]);
}
