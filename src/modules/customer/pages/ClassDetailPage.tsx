import { SessionEditorial } from '../../../components/molecule/SessionEditorial/SessionEditorial';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useTable } from '../../../data/DataContext';
import type { ClassSessionRow } from '../../../data/schema';
import { formatDate, formatTime } from '../../../i18n/format';
import { useLayout } from '../../../layout/useLayout';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { CapacityMeter } from '../../../components/molecule/CapacityMeter/CapacityMeter';
import { TeacherCard } from '../../../components/organism/TeacherCard/TeacherCard';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { Skeleton } from '../../../components/atom/Skeleton/Skeleton';
import { canvasSpecs } from '../specs';
import { useBookingActions, useEntitlements, useMyBookings, useSessionJoined, useWaitlistFor } from '../hooks';
import { policy } from '../policy';
import {  PageHead, durationMin, roomName, shareText } from '../ui';
import { ClassThumbnail } from '../../../components/molecule/ClassThumbnail/ClassThumbnail';
import { StudioCancelledBlock } from './blocks';

const spec = canvasSpecs['C-03'];

/** C-03 Class detail. */
export function ClassDetailPage() {
  const { id } = useParams();
  const { t, bi, lang } = useI18n();
  const nav = useNavigate();
  const { sections, isVisible } = useLayout(spec);
  const { joined, loading } = useSessionJoined(id);
  const { rows: myBookings } = useMyBookings();
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions');
  const { sameDayConflict } = useBookingActions();
  const { mine: myWait } = useWaitlistFor(id);
  const ent = useEntitlements();
  const [shared, setShared] = useState<string | null>(null);

  const myBooking = useMemo(() => myBookings.find((b) => b.session_id === id && b.status === 'booked'), [myBookings, id]);
  const conflict = useMemo(() => joined ? sameDayConflict(myBookings, sessions, joined.session) : null, [joined, myBookings, sessions, sameDayConflict]);

  if (!joined) {
    return (
      <div className="container page cust-page">
        <PageHead back="/app/schedule" title={loading ? <Skeleton width={200} height={28} /> : t('customer.class.notFound')} />
        {loading ? <Skeleton shape="rect" height={180} /> : <EmptyState title={t('customer.class.notFound')} body={t('customer.class.notFound.body')} action={<Link to="/app/schedule"><Button>{t('customer.class.backToSchedule')}</Button></Link>} />}
      </div>
    );
  }

  const { session: s, modality: m, teacher: te } = joined;
  const left = s.capacity - s.booked_count;
  const past = new Date(s.ends_at).getTime() < Date.now();
  const cancelled = s.status === 'cancelled';
  const full = left <= 0;

  const share = async () => {
    const r = await shareText(`${s.title} · ${formatDate(s.starts_at, lang)} ${formatTime(s.starts_at, lang)} · ${tenant.name}`, window.location.href);
    setShared(r === 'copied' ? t('customer.class.linkCopied') : r === 'shared' ? t('customer.class.shared') : null);
    setTimeout(() => setShared(null), 2500);
  };

  const cta = (): ReactNode => {
    if (cancelled) return null;
    if (past) return <Button block size="lg" variant="secondary" disabled>{t('customer.class.past')}</Button>;
    if (myBooking) return <Button block size="lg" variant="secondary" onClick={() => nav(`/app/booking/${myBooking.id}`)}>{t('customer.class.viewBooking')}</Button>;
    if (full) return <Button block size="lg" onClick={() => nav(`/app/waitlist/${s.id}`)}>{myWait && (myWait.status === 'waiting' || myWait.status === 'offered') ? t('customer.class.viewWaitlist') : t('customer.class.joinWaitlist')}</Button>;
    if (conflict) return (
      <div className="stack-sm">
        <Button block size="lg" disabled>{t('core.common.book')}</Button>
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.book.oneADay')} <Link to={`/app/class/${conflict}`}>{t('customer.class.seeOther')}</Link></p>
      </div>
    );
    return <Button block size="lg" onClick={() => nav(`/app/checkout/${s.id}`)}>{ent.hasAnyEntitlement ? t('core.common.book') : ent.trialUsed ? t('customer.class.bookAndPay') : t('customer.class.bookTrial')}</Button>;
  };

  const SECTIONS: Record<string, () => ReactNode> = {
    'HeroImage (placeholder)': () => (
      <div style={{ aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: 'var(--r-lg)' }}><ClassThumbnail modality={m}/></div>
    ),
    'TitleBlock (time, duration, room)': () => (
      <div className="stack-sm">
        <div className="row wrap">
          <span className="eyebrow">{formatDate(s.starts_at, lang, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          {cancelled && <Badge tone="danger">{t('customer.schedule.cancelled')}</Badge>}
          {past && !cancelled && <Badge tone="neutral">{t('customer.schedule.done')}</Badge>}
          {myBooking && <Badge tone="primary">{t('customer.home.booked')}</Badge>}
        </div>
        <h1 className="cust-title">{s.title}</h1>
        <p className="cust-class-meta">
          <strong>{formatTime(s.starts_at, lang)} – {formatTime(s.ends_at, lang)}</strong> · {t('core.common.min', { n: durationMin(joined) })} · {roomName(joined)}{s.level !== 'all' ? ` · ${s.level}` : ` · ${t('customer.class.allLevels')}`}
        </p>
      </div>
    ),
    CapacityMeter: () => cancelled ? <StudioCancelledBlock joined={joined} /> : (
      <Card padding="sm" className="row-between wrap">
        <CapacityMeter booked={s.booked_count} capacity={s.capacity} />
        <span className="xs muted">{t('customer.class.capacityNote', { mats: tenant.studio.mats })}</span>
      </Card>
    ),
    AboutSection: () => (
      <section className="stack-sm">
        <h2 className="cust-h2">{t('customer.class.about')}</h2>
        <SessionEditorial session={s} />
        {m && <div className="row wrap small muted">
          <span>{t('customer.class.intensity')}: {'●'.repeat(m.intensity)}{'○'.repeat(5 - m.intensity)}</span>
          {m.heated && <Badge tone="warn">{t('customer.class.heated')}</Badge>}
        </div>}
      </section>
    ),
    'TeacherCard → TeacherProfile': () => te ? (
      <section className="stack-sm">
        <h2 className="cust-h2">{t('customer.class.teacher')}</h2>
        <TeacherCard name={te.display_name} bio={te.bio} photo={te.photo_url} rating={te.rating_avg} specialties={m ? [{ label: bi({ es: m.name_es, en: m.name_en }), tone: m.tone }] : []} onClick={() => nav(`/app/teachers/${te.id}`)} />
      </section>
    ) : null,
    'PrepList → Club rules': () => (
      <Card eyebrow={t('customer.class.prep')} padding="md">
        <ul className="cust-checklist">
          <li>{t('customer.class.prep.arrive')}</li>
          {m?.heated ? <li>{t('customer.class.prep.hot')}</li> : <li>{t('customer.class.prep.mat')}</li>}
          <li>{t('customer.class.prep.water')}</li>
        </ul>
        <Link to="/app/rules" className="small">{t('customer.class.rulesLink')} →</Link>
      </Card>
    ),
    'StickyCTA (Reserve / Waitlist)': () => (
      <div className="cust-sticky">
        {cta()}
        <div className="row" style={{ justifyContent: 'center' }}>
          <Button variant="ghost" size="sm" onClick={share} icon="share">{t('customer.class.share')}</Button>
          <Button variant="ghost" size="sm" onClick={() => nav(`/app/invite?session=${s.id}`)} icon="invite">{t('customer.home.quick.invite')}</Button>
        </div>
        {shared && <Notice tone="success">{shared}</Notice>}
      </div>
    ),
  };

  return (
    <div className="container page cust-page cust-has-sticky">
      <PageHead back="/app/schedule" title={<span className="sr-only">{s.title}</span>} />
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
      {!cancelled && !past && full && <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.class.fullNote', { min: policy.claimWindowMinutes })}</p>}
    </div>
  );
}
