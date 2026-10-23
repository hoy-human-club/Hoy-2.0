import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useTable } from '../../../data/DataContext';
import type { BookingRow, UserRow } from '../../../data/schema';
import { formatDate, formatTime } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { MemberCard } from '../../../components/molecule/MemberCard/MemberCard';
import { usePracticeStats } from '../../../data/useAnalytics';
import { useSessionsJoined } from '../../website/hooks';
import { useEntitlements } from '../hooks';
import { PageHead } from '../ui';
import '../pulso.css';

/**
 * C-28 — the member card (0158, Pulso Luxe). The card itself is identity only (name, since when); under it the facts
 * the member already sees elsewhere, from the same sources: classes left and expiry (useEntitlements, as C-01), the
 * goal streak (practiceStats, as C-27; hidden with no goal) and the next booked class (as C-01). No member number:
 * the data model has none.
 */
export function MemberCardPage() {
  const { t, bi, lang } = useI18n();
  const { user } = useSession();
  const { rows: users } = useTable<UserRow>('users', { where: { id: user.id } });
  const { rows: myBookings } = useTable<BookingRow>('bookings', { where: { user_id: user.id } });
  const ent = useEntitlements();
  const { stats } = usePracticeStats();
  const all = useSessionsJoined();
  const now = Date.now();
  const booked = useMemo(() => new Set(myBookings.filter((b) => b.status === 'booked').map((b) => b.session_id)), [myBookings]);
  const next = useMemo(() => all.filter((x) => booked.has(x.session.id) && x.session.status === 'scheduled' && new Date(x.session.ends_at).getTime() > now).sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at))[0], [all, booked, now]);
  const since = users[0]?.created_at;

  return (
    <div className="container page cust-page cust-pulso luxe-card-page">
      <PageHead back="/app/more" title={<span className="sr-only">{t('customer.card.title')}</span>} />
      <header className="luxe-head">
        <span className="luxe-eyebrow">{t('customer.card.eyebrow')}</span>
        <h1 className="luxe-title">{t('customer.card.title')}<span aria-hidden="true">.</span></h1>
      </header>
      <MemberCard name={user.name} label={t('customer.card.label', { name: user.name })} caption={[bi(tenant.tagline), tenant.city]}
        since={since ? t('customer.card.since', { date: formatDate(since, lang, { month: 'long', year: 'numeric' }) }) : undefined} />
      <dl className="luxe-facts">
        <div><dt>{t('customer.card.classes')}</dt><dd>{ent.pkg.left}</dd></div>
        {stats.hasGoal && <div><dt>{t('customer.card.streak')}</dt><dd>{stats.streak.count} <em>{t('customer.card.weeks')}</em></dd></div>}
        <div><dt>{t('customer.card.expires')}</dt><dd className="is-small">{ent.nextExpiry ? formatDate(ent.nextExpiry, lang, { day: 'numeric', month: 'short' }) : '—'}</dd></div>
      </dl>
      <section className="luxe-next" aria-labelledby="luxe-next-title">
        <h2 id="luxe-next-title" className="luxe-eyebrow">{t('customer.card.next')}</h2>
        {next ? (
          <Link to={`/app/class/${next.session.id}`} className="luxe-next-row" data-tone={next.modality?.tone ?? 'river'}>
            <span className="luxe-dot" aria-hidden="true" />
            <span>{next.session.title} · <em>{formatDate(next.session.starts_at, lang, { weekday: 'long' })}, <span className="time">{formatTime(next.session.starts_at, lang)}</span></em></span>
          </Link>
        ) : (
          <p className="luxe-muted">{t('customer.card.nextNone')} <Link to="/app/schedule">{t('customer.card.book')} →</Link></p>
        )}
        <p className="luxe-muted">{t('customer.card.desk')}</p>
      </section>
    </div>
  );
}
