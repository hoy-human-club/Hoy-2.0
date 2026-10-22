import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import { formatDate, formatTime } from '../../../i18n/format';
import { useLayout } from '../../../layout/useLayout';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { ClassCard } from '../../../components/organism/ClassCard/ClassCard';
import { CountdownRing } from '../../../components/molecule/CountdownRing/CountdownRing';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { Skeleton } from '../../../components/atom/Skeleton/Skeleton';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { canvasSpecs } from '../specs';
import { useBookingActions, useEntitlements, useLocalPref, useMyBookings, useNow, useSessionJoined, useWaitlistFor } from '../hooks';
import { policy } from '../policy';
import { PageHead, toneOf, roomName, teacherName } from '../ui';

const spec = canvasSpecs['C-20'];

/** C-20 Waitlist & claim window. */
export function WaitlistPage() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const data = useData();
  const { devMode } = useSession();
  const { sections, isVisible } = useLayout(spec);
  const { joined, loading } = useSessionJoined(id);
  const { mine, active, position } = useWaitlistFor(id);
  const { rows: myBookings } = useMyBookings();
  const ent = useEntitlements();
  const { joinWaitlist, leaveWaitlist, claimWaitlist, promoteWaitlist } = useBookingActions();
  const [autoClaim, setAutoClaim] = useLocalPref('waitlist.autoClaim', true);
  const [busy, setBusy] = useState(false);
  const now = useNow(1000);

  const cancelled = joined?.session.status === 'cancelled';
  const offered = !cancelled && mine?.status === 'offered' && mine.claim_until && new Date(mine.claim_until).getTime() > now;
  const expired = !cancelled && mine?.status === 'offered' && mine.claim_until && new Date(mine.claim_until).getTime() <= now;
  const waiting = !cancelled && mine?.status === 'waiting';
  const alreadyBooked = myBookings.some((b) => b.session_id === id && b.status === 'booked');

  // An offer that ran out passes to the next person (C-20 rule).
  useEffect(() => {
    if (expired && mine && joined) { data.update('waitlist', mine.id, { status: 'expired' }).then(() => promoteWaitlist(joined.session.id)); }
  }, [expired, mine, joined, data, promoteWaitlist]);

  // Auto-claim consumes a credit the moment the spot is offered (C-20 rule).
  useEffect(() => {
    if (offered && autoClaim && mine && joined && ent.hasAnyEntitlement && !busy) {
      setBusy(true);
      claimWaitlist(mine, joined.session, ent.defaultKind).then((b) => nav(`/app/booking/${b.id}`, { replace: true })).catch(() => setBusy(false));
    }
  }, [offered, autoClaim, mine, joined, ent.hasAnyEntitlement, ent.defaultKind, claimWaitlist, nav, busy]);

  if (!joined) {
    return (
      <div className="container page cust-page">
        <PageHead back="/app/schedule" title={t('core.common.waitlist')} />
        {loading ? <Skeleton shape="rect" height={200} /> : <EmptyState title={t('customer.class.notFound')} action={<Link to="/app/schedule"><Button>{t('customer.class.backToSchedule')}</Button></Link>} />}
      </div>
    );
  }
  const s = joined.session;
  const started = new Date(s.starts_at).getTime() <= now;
  const left = s.capacity - s.booked_count;

  const claim = async () => {
    if (!mine || cancelled) return;
    if (!ent.hasAnyEntitlement || /yoga|vinyasa|flow|yin/.test(joined.modality?.slug ?? '')) { nav(`/app/checkout/${s.id}?claim=${mine.id}`); return; }
    setBusy(true);
    try { const b = await claimWaitlist(mine, s, ent.defaultKind); nav(`/app/booking/${b.id}`); } finally { setBusy(false); }
  };

  const SECTIONS: Record<string, () => ReactNode> = {
    'StatusCard (PositionRing + RuleExplainer)': () => {
      if (cancelled) return <Notice tone="warn" title={t('customer.cancelled.title')}>{lang === 'en' ? 'This class has been cancelled. Waitlist offers and claims are unavailable; no new place is offered.' : 'Esta clase fue cancelada. Las ofertas y los reclamos de la lista no están disponibles; no se ofrece un cupo nuevo.'}</Notice>;
      if (alreadyBooked) return <Notice tone="success" title={t('customer.home.booked')} action={<Button size="sm" variant="secondary" onClick={() => nav(`/app/booking/${s.id}`)}>{t('customer.class.viewBooking')}</Button>} />;
      if (started) return <Notice tone="info" title={t('customer.waitlist.started')}>{t('customer.waitlist.started.body')}</Notice>;
      if (waiting) return (
        <Card className="cust-center stack-sm" padding="lg">
          <div className="cust-posring" aria-label={t('customer.waitlist.position', { n: position, total: active.filter((w) => w.status === 'waiting').length })}><strong>{position}</strong><span className="xs muted">/ {active.filter((w) => w.status === 'waiting').length}</span></div>
          <strong>{t('customer.waitlist.joined')}</strong>
          <p className="small muted">{t('customer.waitlist.rule', { min: policy.claimWindowMinutes })}</p>
        </Card>
      );
      if (expired) return <Notice tone="warn" title={t('customer.waitlist.expired')} action={<Button size="sm" loading={busy} onClick={async () => { setBusy(true); try { await joinWaitlist(s); } finally { setBusy(false); } }}>{t('customer.waitlist.rejoin')}</Button>}>{t('customer.waitlist.expired.body')}</Notice>;
      if (offered) return null;
      if (left > 0) return <Notice tone="success" title={t('customer.waitlist.spotsOpen', { n: left })} action={<Button size="sm" onClick={() => nav(`/app/checkout/${s.id}`)}>{t('core.common.book')}</Button>} />;
      return (
        <Card className="cust-center stack-sm" padding="lg">
          <strong>{t('customer.waitlist.full', { n: active.filter((w) => w.status === 'waiting').length })}</strong>
          <p className="small muted">{t('customer.waitlist.rule', { min: policy.claimWindowMinutes })}</p>
          <Button size="lg" loading={busy} onClick={async () => { setBusy(true); try { await joinWaitlist(s); } finally { setBusy(false); } }}>{t('customer.class.joinWaitlist')}</Button>
        </Card>
      );
    },
    'ReleasedBanner (conditional, ClaimCountdown + ClaimButton)': () => offered && mine?.claim_until ? (
      <Card tone="highlight" className="stack-sm cust-center" padding="lg">
        <strong>{t('customer.waitlist.released')}</strong>
        <CountdownRing until={mine.claim_until} from={mine.offered_at ?? undefined} size={120} tone="warn" label={t('customer.waitlist.toClaim')} showHours={false} />
        <Button block size="lg" loading={busy} onClick={claim}>{ent.hasAnyEntitlement ? t('customer.waitlist.claim') : t('customer.waitlist.claimPay')}</Button>
      </Card>
    ) : null,
    AutoClaimToggle: () => waiting || offered ? (
      <Card padding="sm"><Toggle checked={autoClaim} onChange={setAutoClaim} label={t('customer.waitlist.autoClaim')} /><p className="xs muted" style={{ paddingLeft: 'var(--sp-xs)' }}>{t('customer.waitlist.autoClaim.body')}</p></Card>
    ) : null,
    LeaveWaitlistRow: () => waiting || offered ? (
      <ListGroup><ListRow tone="danger" icon="close" title={t('customer.waitlist.leave')} subtitle={t('customer.waitlist.leave.sub')} onClick={async () => { if (mine) { await leaveWaitlist(mine); } }} /></ListGroup>
    ) : null,
    PolicyNote: () => (
      <div className="stack-sm">
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.waitlist.policy', { min: policy.claimWindowMinutes })}</p>
        {devMode && waiting && position === 1 && <Button variant="ghost" size="sm" onClick={() => promoteWaitlist(s.id)}>{t('customer.waitlist.devRelease')}</Button>}
      </div>
    ),
  };

  return (
    <div className="container page cust-page">
      <PageHead back={`/app/class/${s.id}`} title={t('core.common.waitlist')} sub={`${s.title} · ${formatDate(s.starts_at, lang)} ${formatTime(s.starts_at, lang)}`} />
      <div className="stack">
        <ClassCard title={s.title} teacher={teacherName(joined)} room={roomName(joined)} startsAt={s.starts_at} endsAt={s.ends_at} tone={toneOf(joined)} booked={s.booked_count} capacity={s.capacity} onClick={() => nav(`/app/class/${s.id}`)} />
        {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
      </div>
    </div>
  );
}
