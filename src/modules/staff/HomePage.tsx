import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { ROLE_LABEL } from '../../auth/roles';
import { useTable } from '../../data/DataContext';
import type { BaseRow, BookingRow, PaymentRow } from '../../data/schema';
import { isSameDay, formatCOP, formatTime } from '../../i18n/format';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Icon } from '../../components/atom/Icon/Icon';
import { ClassRow } from '../../components/molecule/ClassRow/ClassRow';
import { ClassCard } from '../../components/organism/ClassCard/ClassCard';
import { Timeline, type TimelineItem } from '../../components/organism/Timeline/Timeline';
import { ConversationList } from '../../components/organism/ConversationList/ConversationList';
import { toSummary, useConversations } from '../../data/comms';
import { useTodaySessions } from '../website/hooks';
import { usePeople } from './people';
import type { AuditRow } from './audit';
import './staff.css';
import { auditTitle } from './audit';

/** S-01 Role home: live numbers (next class, arrivals, open shifts, payments, unread messages), the counter actions and the latest conversations (→ S-06). */
export function StaffHomePage() {
  const { t, bi, lang, dict } = useI18n();
  const nav = useNavigate();
  const { role, can } = useSession();
  const today = useTodaySessions();
  const todayAll = useTodaySessions(true);
  const todayIds = useMemo(() => today.map((x) => x.session.id), [today]);
  const { rows: bookings } = useTable<BookingRow>('bookings', { where: { session_id: todayIds } });
  const { rows: waitlist } = useTable<BaseRow>('waitlist', { where: { status: 'waiting' } });
  const { rows: payments } = useTable<PaymentRow>('payments');
  const { rows: audit } = useTable<AuditRow>('audit_log', { orderBy: { column: 'created_at', dir: 'desc' }, limit: 8 });
  const { byId } = usePeople();
  const { conversations } = useConversations();
  const unreadMsgs = conversations.reduce((a, c) => a + c.unread, 0);
  const unreadThreads = conversations.filter((c) => c.unread > 0).length;
  const recent = useMemo(() => conversations.map(toSummary), [conversations]);
  const now = Date.now();
  const next = today.find((x) => new Date(x.session.ends_at).getTime() > now);
  const arrivals = bookings.filter((b) => b.status === 'checked_in').length;
  const expected = bookings.filter((b) => b.status === 'booked').length;
  const openShifts = today.filter((x) => new Date(x.session.starts_at).getTime() > now).length;
  const paidToday = payments.filter((p) => p.status === 'approved' && p.paid_at && isSameDay(p.paid_at, new Date())).reduce((a, p) => a + p.amount, 0);
  const pending = payments.filter((p) => p.status === 'pending').length;
  const quick = ([
    ['checkin.write', '/staff/checkin', 'checkin', 'staff.home.openCheckin'],
    ['payments.write', '/staff/register', 'register', 'staff.home.openRegister'],
    ['bookings.write_any', '/staff/rooms', 'rooms', 'staff.home.openRooms'],
    ['members.read', '/staff/inbox', 'inbox', 'staff.home.openInbox'],
    ['members.read', '/admin/crm', 'crm', 'staff.home.openCrm'],
    ['tables.read', '/admin/tables', 'table', 'staff.home.openTables'],
  ] as const).filter(([perm]) => can(perm));
  const activity: TimelineItem[] = audit.map((a) => ({ id: a.id, at: a.created_at, kind: a.action.startsWith('payment') ? 'payment' : a.action.startsWith('booking') ? 'booking' : a.action.includes('note') ? 'note' : 'system', title: auditTitle(a.action, t, dict), meta: `${byId.get(a.actor_id ?? '')?.name ?? t('staff.home.system')} · ${a.entity}${a.entity_id ? ` · ${a.entity_id}` : ''}` }));

  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('staff.home.title')}</h1><p className="muted small">{t('staff.home.role', { role: bi(ROLE_LABEL[role]) })}</p></div></div>
      <div className="grid grid-4">
        <StatTile label={t('staff.home.arrivals')} value={arrivals} hint={t('staff.home.arrivals.hint', { n: expected })} trend={arrivals > 0 ? 'up' : 'flat'} />
        <StatTile label={t('staff.home.openShifts')} value={openShifts} hint={t('staff.home.openShifts.hint', { n: today.length })} />
        <StatTile label={can('payments.read') ? t('staff.home.payments') : t('staff.home.waitlist')} value={can('payments.read') ? formatCOP(paidToday, lang) : waitlist.length} hint={can('payments.read') && pending ? t('staff.home.pending', { n: pending }) : undefined} />
        {/* 0168 · a role without payments and members saw "On waitlist" twice; the fourth tile is then the next class */}
        {can('members.read')
          ? <StatTile label={t('staff.home.unread')} value={unreadMsgs} hint={unreadThreads ? t('staff.home.unread.hint', { n: unreadThreads }) : undefined} trend={unreadMsgs > 0 ? 'down' : 'flat'} />
          : can('payments.read')
            ? <StatTile label={t('staff.home.waitlist')} value={waitlist.length} />
            : <StatTile label={t('staff.home.next')} value={next ? formatTime(next.session.starts_at, lang) : '—'} hint={next ? next.session.title : t('staff.home.next.empty')} />}
      </div>
      {/* 0165 · paired rows, each pair the same height: next class beside the quick actions, today's classes beside the
          messages (or the activity when the role cannot read members); the activity runs full width under them. */}
      <div className="home-rows">
        {/* 0168 · the day in one cell: the next class (when there is one) above today's list — no empty hero card
            saying "no classes left" */}
        <section className="home-cell stack-sm">
          <div className="eyebrow">{next ? t('staff.home.next') : t('staff.home.todayClasses')}</div>
          {next && <ClassCard variant="next" title={next.session.title} teacher={next.teacher?.display_name ?? ''} startsAt={next.session.starts_at} endsAt={next.session.ends_at} tone={next.modality?.tone ?? 'river'} booked={next.session.booked_count} capacity={next.session.capacity} cta={can('checkin.write') ? { label: t('staff.home.openCheckin'), onClick: () => nav(`/staff/checkin?session=${next.session.id}`) } : undefined} />}
          <Card padding="sm" className="home-today">
            {!next && <p className="xs muted home-today-note">{t('staff.home.next.empty')}</p>}
            {todayAll.length === 0 && <p className="muted small" style={{ padding: 'var(--sp-md)' }}>{t('staff.home.todayClasses.empty')}</p>}
            {todayAll.map(({ session: s, modality: m, teacher: te }) => <ClassRow key={s.id} title={s.title} teacher={te?.display_name ?? ''} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} tone={m?.tone ?? 'river'} booked={s.booked_count} capacity={s.capacity} onClick={can('checkin.write') ? () => nav(`/staff/checkin?session=${s.id}`) : undefined} />)}
          </Card>
        </section>
        {/* 0168 · a role with no quick actions gets no empty "Quick actions" column */}
        {quick.length > 0 && (
          <section className="home-cell stack-sm" aria-labelledby="home-quick">
            <div className="eyebrow" id="home-quick">{t('staff.home.quick')}</div>
            <nav className="home-quick" aria-labelledby="home-quick">
              {quick.map(([, to, icon, key]) => (
                <Link key={to} to={to} className="home-quick-tile" data-depth><span className="home-quick-icon" aria-hidden><Icon name={icon} size="md" /></span><span>{t(key)}</span></Link>
              ))}
            </nav>
          </section>
        )}
        {can('members.read') && (
          <Card title={t('staff.home.messages')} padding="sm" className="home-cell home-msgs" actions={<Link to="/staff/inbox" className="small">{t('core.common.viewAll')}</Link>}>
            {recent.length === 0 ? <p className="muted small" style={{ padding: 'var(--sp-md)' }}>{t('staff.home.messages.empty')}</p> : <ConversationList compact limit={5} conversations={recent} linkTo={(k) => `/staff/inbox/${k}`} />}
          </Card>
        )}
        <Card title={t('staff.home.activity')} padding="sm" className={`home-cell ${(quick.length > 0 ? 1 : 0) + (can('members.read') ? 1 : 0) === 1 ? 'is-wide' : ''}`} actions={can('audit.read') ? <Link to="/admin/activity" className="small">{t('core.common.viewAll')}</Link> : undefined}>
          <div style={{ padding: '0 var(--sp-sm)' }}><Timeline items={activity} limit={5} /></div>
          <p className="xs muted" style={{ padding: 'var(--sp-sm)' }}>{t('staff.home.activity.note')}</p>
        </Card>
      </div>
    </div>
  );
}
