import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useTable } from '../../data/DataContext';
import type { BaseRow, BookingRow, ClassSessionRow, MessageLogRow, PaymentRow, PlanRow } from '../../data/schema';
import { isConversationRow, useAuthorOf, useMessaging } from '../../data/comms';
import { formatCOP, formatDate, formatDateTime, formatTime } from '../../i18n/format';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Badge, toneForStatus } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { Avatar } from '../../components/atom/Avatar/Avatar';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { DataTable } from '../../components/organism/DataTable/DataTable';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { MessageThread, type ThreadEvent } from '../../components/organism/MessageThread/MessageThread';
import { MessageComposer } from '../../components/molecule/MessageComposer/MessageComposer';
import { useAudit } from '../staff/audit';
import { maskPhone, usePeople } from '../staff/people';
import { useMemberStats } from './CrmPage';
import { useMemberPractice } from '../../data/useAnalytics';
import { StreakBadge } from '../../components/molecule/StreakBadge/StreakBadge';
import { WeekDots } from '../../components/molecule/WeekDots/WeekDots';
import { MilestoneList } from '../../components/molecule/MilestoneList/MilestoneList';
import './admin.css';

interface ConsentRow extends BaseRow { user_id: string; legal_document_id: string; accepted_at: string }
type Tab = 'conversation' | 'bookings' | 'payments' | 'practice';
type Filter = 'all' | 'whatsapp' | 'email' | 'note' | 'system';
const FILTERS: Filter[] = ['all', 'whatsapp', 'email', 'note', 'system'];

/** M-06 detail — identity header, metric row, the unified conversation (WhatsApp, email, notes, system events) with its reply box, bookings, payments. */
export function MemberPage() {
  const { id } = useParams();
  const { t, lang, bi } = useI18n();
  const { can, user } = useSession();
  const audit = useAudit('admin');
  const { sendComposed, markConversationRead, quietUntil } = useMessaging('admin');
  const authorOf = useAuthorOf();
  const { byId, loading } = usePeople();
  const person = id ? byId.get(id) : undefined;
  const one = useMemo(() => (person ? [person] : []), [person]);
  const stats = useMemberStats(one).get(id ?? '');
  const { rows: bookings } = useTable<BookingRow>('bookings', { where: { user_id: id ?? '__none__' } });
  const { rows: payments } = useTable<PaymentRow>('payments', { where: { user_id: id ?? '__none__' }, orderBy: { column: 'created_at', dir: 'desc' } });
  const { rows: allMessages } = useTable<MessageLogRow>('message_log', { where: { user_id: id ?? '__none__' } });
  const { rows: consents } = useTable<ConsentRow>('consents', { where: { user_id: id ?? '__none__' } });
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions');
  const { rows: plans } = useTable<PlanRow>('plans');
  const [tab, setTab] = useState<Tab>('conversation');
  const [filter, setFilter] = useState<Filter>('all');
  const logged = useRef<string | null>(null);
  useEffect(() => { if (person && logged.current !== person.id) { logged.current = person.id; audit('member.view', 'users', person.id, { name: person.name }); } }, [person?.id]);

  const messages = useMemo(() => allMessages.filter(isConversationRow), [allMessages]);
  const unread = messages.filter((m) => m.direction === 'inbound' && !m.read_at).length;
  // Reading the conversation is the team's read receipt for what the member sent.
  useEffect(() => { if (id && tab === 'conversation' && unread > 0) void markConversationRead(id); }, [id, tab, unread, markConversationRead]);

  if (!person) return <div className="stack"><Link to="/admin/crm" className="small">← {t('admin.crm.title')}</Link><EmptyState tone={loading ? 'loading' : 'error'} title={loading ? t('core.common.loading') : t('admin.member.notFound')} body={loading ? undefined : t('admin.member.notFound.body')} /></div>;

  const sess = new Map(sessions.map((s) => [s.id, s]));
  const plan = new Map(plans.map((p) => [p.id, p]));
  const canPayments = can('payments.read');
  const canWrite = can('members.write');
  const ltv = payments.filter((p) => p.status === 'approved').reduce((a, p) => a + p.amount, 0);
  const active = bookings.filter((b) => b.status !== 'cancelled');

  const events: ThreadEvent[] = [
    ...(canPayments ? payments.map<ThreadEvent>((p) => ({ id: p.id, at: p.paid_at ?? p.created_at, kind: 'payment', title: `${t('admin.member.payment')} · ${plan.get(p.plan_id ?? '')?.name_es ?? ''}`, meta: `${formatCOP(p.amount, lang)} · ${p.method} · ${p.status}` })) : []),
    ...active.map<ThreadEvent>((b) => { const s = sess.get(b.session_id); return { id: b.id, at: b.checked_in_at ?? b.created_at, kind: 'booking', title: `${t(`admin.member.booking.${b.status}`)} · ${s?.title ?? ''}`, meta: s ? `${formatDate(s.starts_at, lang)} ${formatTime(s.starts_at, lang)} · ${b.paid_with}` : b.paid_with }; }),
    ...consents.map<ThreadEvent>((c) => ({ id: c.id, at: c.accepted_at ?? c.created_at, kind: 'system', title: t('admin.member.conversation.event.consent') })),
  ];
  const shownMessages = filter === 'all' ? messages : filter === 'system' ? [] : messages.filter((m) => m.channel === filter);
  const shownEvents = filter === 'all' || filter === 'system' ? events : [];

  const bookingCols = [
    { key: 'when', label: t('admin.member.col.when'), render: (b: BookingRow) => { const s = sess.get(b.session_id); return s ? <span className="small">{formatDate(s.starts_at, lang)} · {formatTime(s.starts_at, lang)}</span> : b.session_id; } },
    { key: 'class', label: t('admin.member.col.class'), render: (b: BookingRow) => sess.get(b.session_id)?.title ?? '—' },
    { key: 'status', label: t('admin.member.col.status'), render: (b: BookingRow) => <Badge tone={toneForStatus(b.status)}>{b.status}</Badge> },
    { key: 'paid_with', label: t('admin.member.col.paidWith') },
  ];
  const paymentCols = [
    { key: 'paid_at', label: t('admin.member.col.when'), render: (p: PaymentRow) => <span className="mono small">{formatDateTime(p.paid_at ?? p.created_at, lang)}</span> },
    { key: 'plan_id', label: t('admin.member.col.product'), render: (p: PaymentRow) => plan.get(p.plan_id ?? '')?.name_es ?? '—' },
    { key: 'amount', label: t('admin.member.col.amount'), align: 'right' as const, render: (p: PaymentRow) => formatCOP(p.amount, lang) },
    { key: 'method', label: t('admin.member.col.method'), render: (p: PaymentRow) => `${p.method} · ${p.provider}` },
    { key: 'status', label: t('admin.member.col.status'), render: (p: PaymentRow) => <Badge tone={toneForStatus(p.status)}>{p.status}</Badge> },
  ];

  return (
    <div className="stack">
      <Link to="/admin/crm" className="small">← {t('admin.crm.title')}</Link>
      <Card className="member-head">
        <Avatar name={person.name} initials={person.initials} size={64} />
        <div className="grow stack-sm">
          <div className="row wrap"><h1 className="member-name">{person.name}</h1>{stats?.pkg.purchase ? <Badge tone={stats.pkg.frozen ? 'warn' : 'success'}>{stats.packagePlan ? bi({ es: stats.packagePlan.name_es, en: stats.packagePlan.name_en }) : t('admin.crm.package')}{stats.pkg.frozen ? ` · ${t('admin.crm.frozen')}` : ''}</Badge> : person.plan ? <Badge tone={toneForStatus(person.membership?.status ?? '')}>{bi({ es: person.plan.name_es, en: person.plan.name_en })}</Badge> : <Badge>{t('admin.crm.noPlan')}</Badge>}</div>
          <div className="small muted">{t('admin.member.since', { date: formatDate(person.createdAt, lang, { month: 'long', year: 'numeric' }) })} · {maskPhone(person.phone)} · {person.email}</div>
          <div className="row wrap">
            <Badge tone={person.whatsappVerified ? 'success' : 'neutral'}>WhatsApp {person.whatsappVerified ? '✓' : '·'}</Badge>
            <Badge tone={person.marketingOptin ? 'success' : 'neutral'}>{t('admin.member.optin')} {person.marketingOptin ? '✓' : '·'}</Badge>
            <Badge tone={consents.length ? 'success' : 'warn'}>{t('admin.member.consent', { n: consents.length })}</Badge>
            {person.birthday && <Badge tone="highlight">🎂 {formatDate(person.birthday, lang, { day: 'numeric', month: 'short' })}</Badge>}
          </div>
        </div>
        {can('members.write') && <Link to={`/staff/inbox/${person.id}`}><Button size="sm" variant="secondary" icon="inbox">{t('admin.member.conversation.openInbox')}</Button></Link>}
      </Card>
      <Card><div className="row wrap">
        <span>{t('admin.crm.col.remaining')}: <strong>{stats?.pkg.left ?? 0}</strong></span>
        <span>{t('admin.crm.col.expires')}: {stats?.pkg.expiresAt ? formatDate(stats.pkg.expiresAt, lang) : '—'}</span>
        <span>{t('admin.crm.col.vouchers')}: {stats?.vouchers.length ?? 0}</span>
      </div><p className="small muted">{t('admin.crm.demo')}</p>
      {stats?.vouchers.map(v => <div key={v.id} className="row wrap small"><strong>{v.title}</strong><span>{v.balance} {v.benefitKind === 'classes' ? t('admin.crm.col.remaining') : 'COP'}</span><span>{v.expiresAt ? formatDate(v.expiresAt, lang) : '—'}</span><Badge>{t(`admin.crm.voucher.${v.status}`)}</Badge></div>)}
      </Card>
      <div className="grid grid-4">
        <StatTile label={t('admin.member.ltv')} value={canPayments ? formatCOP(ltv, lang) : '—'} />
        <StatTile label={t('admin.member.visits')} value={stats?.visits ?? 0} hint={person.membership ? undefined : t('admin.member.credits', { n: stats?.credits ?? 0 })} />
        <StatTile label={t('admin.member.lastVisit')} value={stats?.lastVisit ? formatDate(stats.lastVisit, lang) : '—'} />
        <StatTile label={t('admin.crm.col.risk')} value={t(`admin.crm.risk.${stats?.risk ?? 'low'}`)} trend={stats?.risk === 'high' ? 'down' : stats?.risk === 'medium' ? 'flat' : 'up'} hint={t('admin.member.risk.hint')} />
      </div>
      <div className="row wrap" role="tablist">
        {(['conversation', 'bookings', 'payments', 'practice'] as Tab[]).filter((x) => x !== 'payments' || canPayments).map((x) => <Chip key={x} selected={tab === x} onClick={() => setTab(x)}>{t(`admin.member.tab.${x}`)}{x === 'conversation' && unread > 0 ? ` · ${unread}` : ''}</Chip>)}
      </div>
      {tab === 'conversation' && (
        <Card padding="sm" className="member-conv">
          <div className="row wrap member-conv-filters" role="tablist" aria-label={t('admin.member.tab.conversation')}>
            {FILTERS.map((f) => <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>{t(`admin.member.conversation.filter.${f}`)}</Chip>)}
          </div>
          <MessageThread messages={shownMessages} events={shownEvents} personName={person.name} authorOf={authorOf} emptyText={t('admin.member.conversation.empty')} autoScroll={false} />
          {filter !== 'system' && (
            <MessageComposer
              onSend={(m) => sendComposed(person.id, m)} readOnly={!canWrite} author={user.name}
              whatsappBlocked={!person.whatsappVerified ? t('core.msg.compose.unverified') : undefined}
              quietUntil={quietUntil}
            />
          )}
        </Card>
      )}
      {tab === 'bookings' && <DataTable columns={bookingCols} rows={[...active].sort((a, b) => (sess.get(b.session_id)?.starts_at ?? '').localeCompare(sess.get(a.session_id)?.starts_at ?? ''))} rowKey={(r) => r.id} dense emptyText={t('admin.member.bookings.empty')} />}
      {tab === 'payments' && canPayments && <DataTable columns={paymentCols} rows={payments} rowKey={(r) => r.id} dense emptyText={t('admin.member.payments.empty')} />}
      {tab === 'practice' && <PracticeTab userId={person.id} />}
      <p className="xs muted">{t('admin.member.viewLogged')}</p>
    </div>
  );
}

const EN_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** M-06 Práctica tab — read-only: the member's own practiceStats() (streak, this week, counts, goal, milestones), as they see it in C-27. */
function PracticeTab({ userId }: { userId: string }) {
  const { t, lang } = useI18n();
  const { stats: p } = useMemberPractice(userId);
  const unit = (n: number) => t(n === 1 ? 'admin.member.practice.week' : 'admin.member.practice.weeks');
  const classes = (n: number) => (n === 1 ? t('admin.member.practice.classes.one') : t('admin.member.practice.classes', { n }));
  const days = p.daysSinceLastVisit;
  const lastHint = days == null ? t('admin.member.practice.last.never') : days === 0 ? t('admin.member.practice.last.today') : days === 1 ? t('admin.member.practice.last.one') : t('admin.member.practice.last.days', { n: days });
  return (
    <Card title={t('admin.member.tab.practice')}>
      <div className="stack">
        <div className="member-practice">
          <div className="stack-sm">
            <div className="eyebrow">{t('admin.member.practice.streak')}</div>
            <StreakBadge count={p.streak.count} unit={unit(p.streak.count)} state={p.streak.state} best={p.hasGoal ? p.streak.best : undefined} bestLabel={t('admin.member.practice.best')} hint={t(`admin.member.practice.state.${p.streak.state}`)} />
            <div className="eyebrow">{t('admin.member.practice.thisWeek')}</div>
            <WeekDots days={p.thisWeek.days} target={p.thisWeek.target} attended={p.thisWeek.attended} labels={lang === 'en' ? EN_DAYS : undefined}>
              {p.hasGoal ? t('admin.member.practice.thisWeek.goal', { n: p.thisWeek.attended, m: p.thisWeek.target }) : t('admin.member.practice.thisWeek.noGoal', { n: p.thisWeek.attended })}
            </WeekDots>
          </div>
          <div className="grid grid-2">
            <StatTile label={t('admin.member.practice.month')} value={p.attendedThisMonth} />
            <StatTile label={t('admin.member.practice.total')} value={p.attendedAllTime} />
            <StatTile label={t('admin.member.practice.last')} value={p.lastVisit ? formatDate(p.lastVisit, lang, { day: 'numeric', month: 'short' }) : '—'} hint={lastHint} />
            <StatTile label={t('admin.member.practice.goal')} value={p.hasGoal ? t('admin.member.practice.goal.value', { n: p.target }) : t('admin.member.practice.goal.none')} hint={t('admin.member.practice.goal.hint')} />
          </div>
        </div>
        {p.milestonesReached.length === 0 && !p.nextMilestone
          ? <p className="small muted">{t('admin.member.practice.noMilestones')}</p>
          : <MilestoneList reached={p.milestonesReached} next={p.nextMilestone} labels={{ reached: t('admin.member.practice.milestones'), next: t('admin.member.practice.next'), remaining: (n) => t('admin.member.practice.remaining', { n }), classes }} />}
        <p className="xs muted">{t('admin.member.practice.readOnly')}</p>
      </div>
    </Card>
  );
}
