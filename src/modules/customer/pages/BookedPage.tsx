import {CustomerCancellationReview} from '../../../components/organism/CustomerCancellationReview/CustomerCancellationReview';
import {useCustomerCancellation} from '../useCustomerCancellation';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import type { BookingRow } from '../../../data/schema';
import { dateKey, formatDate, formatTime, MS } from '../../../i18n/format';
import { useLayout } from '../../../layout/useLayout';
import { tenant } from '../../../tenant/tenant';
import { Input } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { approvedPackageRows } from '../../../data/packages';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { ClassCard } from '../../../components/organism/ClassCard/ClassCard';
import { ClassRow } from '../../../components/molecule/ClassRow/ClassRow';
import { CountdownRing } from '../../../components/molecule/CountdownRing/CountdownRing';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { Skeleton } from '../../../components/atom/Skeleton/Skeleton';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { canvasSpecs } from '../specs';
import { SplitSections } from '../split';
import { useActions } from '../../../actions';
import { useAppNavHandlers } from '../actions';
import { useAllSessionsJoined, useBookingActions, useEntitlements, useMyBookings, useNow, useSessionJoined } from '../hooks';
import { cancelDeadline, insideCancelWindow, policy } from '../policy';
import { canReschedule, RESCHEDULE_CUTOFF_HOURS } from '../reschedule';
import { assertRescheduleValidity, reschedulePurchase } from '../rescheduleCommand';
import { PageHead, downloadIcs, toneOf, roomName, shareText, teacherName } from '../ui';
import { StudioCancelledBlock } from './blocks';

const spec = canvasSpecs['C-08'];

/** C-08 Booked class (+ C-08b change sheet at /app/booking/:id/change). */
export function BookedPage({ change = false }: { change?: boolean }) {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const { sections, isVisible } = useLayout(spec);
  useActions(spec, useAppNavHandlers());
  const { rows: myBookings, loading } = useMyBookings();
  const booking: BookingRow | null = useMemo(() => myBookings.find((b) => b.id === id) ?? [...myBookings].filter((b) => b.session_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null, [myBookings, id]);
  const { joined } = useSessionJoined(booking?.session_id);
  const now = useNow(15_000);
  const [flash, setFlash] = useState<{ tone: 'success' | 'warn'; text: string } | null>(null);

  if (!booking || !joined) {
    return (
      <div className="container page cust-page">
        <PageHead back="/app" title={loading ? <Skeleton width={180} height={28} /> : t('customer.booked.notFound')} />
        {loading ? <Skeleton shape="rect" height={200} /> : <EmptyState title={t('customer.booked.notFound')} body={t('customer.booked.notFound.body')} action={<Link to="/app/history"><Button variant="secondary">{t('core.nav.history')}</Button></Link>} />}
      </div>
    );
  }

  const s = joined.session;
  const startsMs = new Date(s.starts_at).getTime();
  const past = new Date(s.ends_at).getTime() < now;
  const started = startsMs <= now;
  const checkinOpen = !started && startsMs - now <= policy.checkinOpensMinutes * MS.min;
  const studioCancelled = s.status === 'cancelled';
  const myCancelled = booking.status === 'cancelled' || booking.status === 'late_cancel';
  const active = !past && !studioCancelled && !myCancelled && booking.status === 'booked';
  const deadline = cancelDeadline(s.starts_at);
  const inside = insideCancelWindow(s.starts_at, now);
  const bookingBase = `/app/booking/${booking.id}`;

  const addToCalendar = () => downloadIcs({ title: `${s.title} · ${tenant.name}`, startsAt: s.starts_at, endsAt: s.ends_at, location: `${tenant.name} · ${roomName(joined)}`, description: `${teacherName(joined)}${booking.mat_number ? ` · ${t('site.mat.confirmed', { n: booking.mat_number })}` : ''}` });
  const share = async () => { const r = await shareText(t('customer.booked.shareText', { title: s.title, when: `${formatDate(s.starts_at, lang)} ${formatTime(s.starts_at, lang)}`, name: tenant.name }), window.location.href); if (r !== 'failed') setFlash({ tone: 'success', text: r === 'copied' ? t('customer.class.linkCopied') : t('customer.class.shared') }); };

  const SECTIONS: Record<string, () => ReactNode> = {
    CountdownRing: () => {
      if (studioCancelled) return <StudioCancelledBlock joined={joined} booking={booking} />;
      if (myCancelled) return <Notice tone="warn" title={booking.status === 'late_cancel' ? t('customer.booked.lateCancelled') : t('customer.booked.cancelled')} action={<Link to="/app/schedule"><Button size="sm" variant="secondary">{t('customer.class.backToSchedule')}</Button></Link>}>{booking.status === 'late_cancel' ? t('customer.booked.lateCancelled.body') : t('customer.booked.cancelled.body')}</Notice>;
      if (past) return (
        <Card className="stack-sm" tone="muted">
          <div className="row wrap"><Badge tone={booking.status === 'checked_in' ? 'success' : booking.status === 'no_show' ? 'danger' : 'neutral'}>{t(`customer.history.status.${booking.status}`)}</Badge><span className="small muted">{formatDate(s.starts_at, lang)}</span></div>
          {!booking.rated && booking.status === 'checked_in' && <Button size="sm" onClick={() => nav(`/app/rate/${s.id}`)}>{t('customer.booked.rate')}</Button>}
        </Card>
      );
      return (
        <div className="cust-center stack-sm">
          {started
            ? <Card tone="primary" className="cust-center" padding="lg"><strong>{t('customer.booked.inProgress')}</strong></Card>
            : <CountdownRing until={s.starts_at} from={booking.created_at} size={180} tone={checkinOpen ? 'success' : 'primary'} label={checkinOpen ? t('customer.booked.checkin') : t('customer.booked.startsIn')} />}
          {checkinOpen && <p className="small muted">{t('customer.booked.checkin.body')}</p>}
        </div>
      );
    },
    ClassSummary: () => (
      <div className="stack-sm"><ClassCard title={s.title} teacher={teacherName(joined)} room={roomName(joined)} startsAt={s.starts_at} endsAt={s.ends_at} tone={toneOf(joined)} booked={s.booked_count} capacity={s.capacity} level={s.level} onClick={() => nav(`/app/class/${s.id}`)} />{booking.mat_number && !studioCancelled && !myCancelled && <p className="small" style={{ textAlign: 'center' }}>{t('site.mat.confirmed', { n: booking.mat_number })}</p>}</div>
    ),
    PrepReminder: () => active ? (
      <Card eyebrow={t('customer.class.prep')} padding="md">
        <p className="small">{joined.modality?.heated ? t('customer.class.prep.hot') : t('customer.class.prep.mat')} {t('customer.class.prep.arrive')}</p>
        <Link to="/app/rules" className="small">{t('customer.class.rulesLink')} →</Link>
      </Card>
    ) : null,
    'ActionRow (Change / Invite)': () => active ? (
      <div className="grid grid-2">
        <Button variant="secondary" size="lg" onClick={() => nav(`${bookingBase}/change`)}>{t('customer.booked.change')}</Button>
        <Button variant="secondary" size="lg" onClick={() => nav(`/app/invite?session=${s.id}`)}>{t('customer.home.quick.invite')}</Button>
      </div>
    ) : null,
    AddToCalendar: () => active ? (
      <div className="row" style={{ justifyContent: 'center' }}>
        <Button variant="ghost" size="sm" icon="calendar-plus" onClick={addToCalendar}>{t('customer.booked.addToCalendar')}</Button>
        <Button variant="ghost" size="sm" icon="share" onClick={share}>{t('customer.class.share')}</Button>
      </div>
    ) : null,
    PolicyNote: () => active ? (
      <p className="xs muted" style={{ textAlign: 'center' }}>
        {inside ? t('customer.booked.policy.inside', { h: policy.cancelWindowHours }) : t('customer.booked.policy.outside', { time: formatTime(deadline.toISOString(), lang), h: policy.cancelWindowHours })}
        {' · '}{t('customer.booked.paidWith', { with: t(`customer.paidWith.${booking.paid_with}`) })}
      </p>
    ) : null,
  };

  return (
    <div className="container page cust-page">
      <PageHead back="/app" title={<span className="sr-only">{s.title}</span>} />
      {flash && <Notice tone={flash.tone}>{flash.text}</Notice>}
      {/* ≥ 900 px: countdown + class on the left; reminder, actions, calendar and policy on the right. */}
      <SplitSections narrowClassName="stack" className="cust-booked" names={sections.filter(isVisible)} render={(n) => SECTIONS[n]?.() ?? null} side={(n) => n !== 'CountdownRing' && n !== 'ClassSummary'} />
      <ChangeSheet open={change && active} onClose={() => nav(bookingBase, { replace: true })} booking={booking} joined={joined} inside={inside} deadline={deadline} onResult={(f) => { setFlash(f); }} />
    </div>
  );
}

/** C-08b — cancel or reschedule sheet. Moving is offered first: it keeps the credit and the habit. */
function ChangeSheet({ open, onClose, booking, joined, inside, deadline, onResult }: { open: boolean; onClose: () => void; booking: BookingRow; joined: NonNullable<ReturnType<typeof useSessionJoined>['joined']>; inside: boolean; deadline: Date; onResult: (f: { tone: 'success' | 'warn'; text: string }) => void }) {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const { reschedule } = useBookingActions();
  const allSessions = useAllSessionsJoined();
  const { ledger, payments } = useEntitlements();
  const [day, setDay] = useState(() => dateKey(new Date(joined.session.starts_at)));
  const [mode, setMode] = useState<'menu' | 'move' | 'cancel'>('menu');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cancellation=useCustomerCancellation(booking.id,joined.session.id,mode==='cancel');
  const occupied=busy||cancellation.busy;
  const s = joined.session;
  const now = useNow(1_000);
  const moveAllowed = canReschedule(s.starts_at, now);
  const validity = useMemo(() => {
    try { return { purchase: reschedulePurchase(approvedPackageRows(ledger, payments), booking), unresolved: false }; }
    catch { return { purchase: null, unresolved: true }; }
  }, [ledger, payments, booking]);
  const entitlementUnresolved = validity.unresolved || (!validity.purchase && day !== dateKey(new Date(s.starts_at)));
  const alts = allSessions.filter(a => {
    if (entitlementUnresolved || a.session.id === s.id || a.session.status !== 'scheduled' || Date.parse(a.session.starts_at) <= now || a.session.booked_count >= a.session.capacity || dateKey(new Date(a.session.starts_at)) !== day) return false;
    try { assertRescheduleValidity(validity.purchase, a.session.starts_at); return true; } catch { return false; }
  });
  const close = () => { if(mode==='cancel')cancellation.stop(); setMode('menu'); setErr(null); onClose(); };

  const doCancel = async (retry=false) => {
    const result=await (retry?cancellation.retry():cancellation.confirm());
    if(result)onResult({tone:result.late?'warn':'success',text:result.late?t('customer.change.cancelled.late'):result.returned?t('customer.change.cancelled.creditBack'):t('customer.change.cancelled.ok')});
  };
  const doMove = async (toId: string) => {
    const to = alts.find((a) => a.session.id === toId)?.session; if (!to) return;
    setBusy(true); setErr(null);
    try { const next = await reschedule(booking, s, to); close(); nav(`/app/booking/${next.id}`, { replace: true }); }
    catch (e) {
      const key = e instanceof Error && e.message === 'reschedule_cutoff' ? 'customer.change.move.closed' : e instanceof Error && e.message === 'same_day_conflict' ? 'customer.change.move.conflict' : e instanceof Error && (e.message === 'package_expired' || e.message === 'package_frozen' || e.message === 'reschedule_entitlement_unresolved') ? 'customer.change.move.validity' : 'customer.change.move.failed';
      setErr(t(key, { h: RESCHEDULE_CUTOFF_HOURS }));
    }
    finally { setBusy(false); }
  };

  return (
    <Drawer open={open || (mode==='cancel'&&cancellation.hasCommand)} onClose={close} side="bottom" title={mode === 'cancel' ? t('customer.change.cancel.title') : mode === 'move' ? t('customer.change.move.title') : t('customer.change.title')}>
      <div className="stack">
        {mode!=='cancel'&&(inside
          ? <Notice tone="warn" title={t('customer.change.inside.title', { h: policy.cancelWindowHours })}>{t('customer.change.inside.body')}</Notice>
          : <p className="small muted">{t('customer.change.outside', { time: formatTime(deadline.toISOString(), lang) })}</p>)}
        <Card padding="sm"><ClassRow title={s.title} teacher={teacherName(joined)} startsAt={s.starts_at} durationMin={joined.modality?.duration_min ?? 60} tone={toneOf(joined)} booked={s.booked_count} capacity={s.capacity} booked_by_me={booking.status==='booked'&&cancellation.phase!=='success'} /></Card>

        {mode === 'menu' && (
          <ListGroup>
            <ListRow icon="move" title={t('customer.change.move')} subtitle={moveAllowed ? t('customer.change.move.sub') : t('customer.change.move.closed', { h: RESCHEDULE_CUTOFF_HOURS })} disabled={!moveAllowed || occupied} onClick={() => setMode('move')} />
            <ListRow icon="cancel" tone="danger" title={t('customer.change.drop')} subtitle={t('customer.cancel.atomic.menu')} disabled={occupied} onClick={() => setMode('cancel')} />
          </ListGroup>
        )}
        {mode === 'move' && (
          <section className="stack-sm">
            <Field label={t('customer.change.move.day')} hint={validity.purchase?.expires_at ? t('customer.change.move.expires', { date: formatDate(validity.purchase.expires_at, lang) }) : t('customer.change.move.day.hint')}>{id => <Input id={id} type="date" value={day} min={dateKey(new Date(now))} max={validity.purchase?.expires_at ?? undefined} disabled={occupied || !moveAllowed} onChange={e => { setDay(e.target.value); setErr(null); }} />}</Field>
            <div className="eyebrow">{t('customer.change.pick')}</div>
            {!moveAllowed ? (
              <Notice tone="warn">{t('customer.change.move.closed', { h: RESCHEDULE_CUTOFF_HOURS })}</Notice>
            ) : entitlementUnresolved ? (
              <Notice tone="warn">{t('customer.change.move.validity')}</Notice>
            ) : alts.length === 0 ? (
              <Notice tone="info" title={t('customer.change.noAlt')} action={<Link to="/app/schedule"><Button size="sm" variant="secondary">{t('customer.class.backToSchedule')}</Button></Link>}>{t('customer.change.noAlt.body')}</Notice>
            ) : (
              <Card padding="sm">{alts.map((a) => <ClassRow key={a.session.id} title={a.session.title} teacher={a.teacher?.display_name ?? ''} startsAt={a.session.starts_at} durationMin={a.modality?.duration_min ?? 60} tone={a.modality?.tone ?? 'river'} booked={a.session.booked_count} capacity={a.session.capacity} onClick={() => !busy && canReschedule(s.starts_at) && doMove(a.session.id)} />)}</Card>
            )}
            {err && <Notice tone="warn">{err}</Notice>}
            <p className="xs muted">{t('customer.change.move.note')}</p>
          </section>
        )}
        {mode === 'cancel' && <CustomerCancellationReview phase={cancellation.phase} review={cancellation.review} result={cancellation.result?{returned:cancellation.result.returned,offerRecorded:cancellation.result.waitlist==='offer_recorded'}:null} onConfirm={()=>void doCancel()} onRetry={cancellation.hasCommand?()=>void doCancel(true):undefined} onReload={cancellation.reload} onStop={cancellation.stop} onDone={close}/>}
        <Button block disabled={occupied} variant={mode === 'menu' ? 'secondary' : 'ghost'} onClick={mode === 'menu'||cancellation.hasCommand ? close : () => setMode('menu')}>{mode === 'menu' ? t('customer.change.keep') : t('core.nav.back')}</Button>
      </div>
    </Drawer>
  );
}
