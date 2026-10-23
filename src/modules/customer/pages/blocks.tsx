/**
 * State blocks shared between the flow pages and the /app/state/* demo routes:
 * E-01 empty home, E-02 payment declined, E-03 class cancelled by the studio.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import type { BookingRow } from '../../../data/schema';
import { formatCOP, formatDate, formatTime, isSameDay } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { ClassRow } from '../../../components/molecule/ClassRow/ClassRow';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { CountdownRing } from '../../../components/molecule/CountdownRing/CountdownRing';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { useAllSessionsJoined, type JoinedSession } from '../hooks';
import { PAYMENT_METHODS, type PayMethod } from '../payments';
import { useData } from '../../../data/DataContext';
import { readOwnStudioReturn, type OwnStudioReturn } from '../../classSchedule/studioCancellation';
import { studioStrings as studioCopy } from '../../classSchedule/studioStrings';
import { policy } from '../policy';

/** Same-day replacements for a session: scheduled, not full, in the future; same modality (class) first, then nearest time. */
export function useAlternatives(j: JoinedSession | null, limit = 3) {
  const all = useAllSessionsJoined();
  return useMemo(() => {
    if (!j) return [];
    const now = Date.now();
    return all
      .filter((x) => x.session.id !== j.session.id && x.session.status === 'scheduled' && isSameDay(x.session.starts_at, j.session.starts_at) && new Date(x.session.starts_at).getTime() > now && x.session.booked_count < x.session.capacity)
      .sort((a, b) => (Number(b.session.modality_id === j.session.modality_id) - Number(a.session.modality_id === j.session.modality_id)) || Math.abs(new Date(a.session.starts_at).getTime() - new Date(j.session.starts_at).getTime()) - Math.abs(new Date(b.session.starts_at).getTime() - new Date(j.session.starts_at).getTime()))
      .slice(0, limit);
  }, [all, j, limit]);
}

/** E-03 — cancelled class with scoped linked-return verification. */
export function StudioCancelledBlock({ joined, booking }: { joined: JoinedSession; booking?: BookingRow | null }) {
  const { t, lang, bi } = useI18n();
  const nav = useNavigate();
  const data=useData(),{user,role}=useSession();
  const current=useRef({data,actorId:user.id,role,bookingId:booking?.id});current.current={data,actorId:user.id,role,bookingId:booking?.id};
  const [verification,setVerification]=useState<OwnStudioReturn>({status:'unverified'}),[checking,setChecking]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{let alive=true,generation=0;const controller=new AbortController();
    const refresh=async()=>{const id=++generation;setVerification({status:'unverified'});if(!booking?.id){setChecking(false);return;}setChecking(true);try{const value=await readOwnStudioReturn(data,{actorId:user.id,role},booking.id,{signal:controller.signal,currentActor:()=>({actorId:current.current.data===data&&current.current.bookingId===booking.id?current.current.actorId:'',role:current.current.role})});if(alive&&id===generation)setVerification(value);}catch{if(alive&&id===generation)setVerification({status:'unverified'});}finally{if(alive&&id===generation)setChecking(false);}};
    void refresh();const off=data.subscribe('*',e=>{if(['users','bookings','class_sessions','class_ledger','payments'].includes(e.table)||e.type==='reset')void refresh();});return()=>{alive=false;generation++;controller.abort();off();};
  },[data,user.id,role,booking?.id,retry]);
  const alts = useAlternatives(joined);
  const s = joined.session;
  return (
    <div className="stack">
      <Notice tone="danger" title={t('customer.cancelled.title')}>{s.cancel_reason ? t('customer.cancelled.reason', { reason: s.cancel_reason }) : t('customer.cancelled.body')} · {s.title} · {formatDate(s.starts_at, lang)} {formatTime(s.starts_at, lang)}</Notice>
      <Notice tone={verification.status==='verified'?'success':'warn'} title={bi(verification.status==='verified'?studioCopy.ownVerified:studioCopy.unverified)} action={booking?.id?<Button size="sm" variant="secondary" loading={checking} onClick={()=>setRetry(v=>v+1)}>{bi(studioCopy.reload)}</Button>:undefined}>{verification.status==='verified'?<><p>{bi(studioCopy.ownTerms)} {verification.balance}</p>{verification.expiresAt&&<p>{bi(studioCopy.expiry)}: {verification.expiresAt}</p>}{verification.frozen&&<p>{bi(studioCopy.frozen)}</p>}</>:bi(studioCopy.ownUnknown)}</Notice>
      <section className="stack-sm">
        <h2 className="cust-h2">{t('customer.cancelled.alternatives')}</h2>
        {alts.length === 0 ? (
          <Card padding="sm"><EmptyState compact title={t('customer.cancelled.noAlt')} body={t('customer.cancelled.noAlt.body')} action={<Link to="/app/schedule"><Button size="sm" variant="secondary">{t('customer.class.backToSchedule')}</Button></Link>} /></Card>
        ) : (
          <Card padding="sm">
            {alts.map((x) => <ClassRow key={x.session.id} title={x.session.title} teacher={x.teacher?.display_name ?? ''} startsAt={x.session.starts_at} durationMin={x.modality?.duration_min ?? 60} tone={x.modality?.tone ?? 'river'} booked={x.session.booked_count} capacity={x.session.capacity} onClick={() => nav(`/app/class/${x.session.id}`)} />)}
          </Card>
        )}
        {alts[0] && <Button block size="lg" onClick={() => nav(`/app/checkout/${alts[0].session.id}`)}>{t('customer.cancelled.cta')}</Button>}
        <p className="xs muted" style={{ textAlign: 'center' }}>{bi(studioCopy.ownEmail)}</p>
      </section>
    </div>
  );
}

export interface DeclinedState { reason: { es: string; en: string } | null; holdUntil: string; attempts: number; method: PayMethod }

/** E-02 — payment declined: nothing charged, spot held, a way through. */
export function DeclinedBlock({ state, amount, onRetry, onRelease, onExpired }: { state: DeclinedState; amount: number; onRetry: (m: PayMethod) => void; onRelease: () => void; onExpired?: () => void }) {
  const { t, bi, lang } = useI18n();
  const preferManual = state.attempts >= 3;
  const methods = PAYMENT_METHODS.filter((m) => m.id !== state.method).sort((a, b) => (preferManual ? Number(b.provider === 'manual') - Number(a.provider === 'manual') : 0));
  return (
    <div className="stack">
      <Notice tone="danger" title={t('customer.declined.title')}>
        {t('customer.declined.body', { amount: formatCOP(amount, lang) })}
        {state.reason && <><br /><span className="xs">{t('customer.declined.gateway')}: {bi(state.reason)}</span></>}
      </Notice>
      <Card className="row wrap" padding="md">
        <CountdownRing until={state.holdUntil} tone="danger" size={96} label={t('customer.declined.hold')} showHours={false} onDone={onExpired} />
        <div className="grow stack-sm">
          <strong>{t('customer.declined.hold.title')}</strong>
          <span className="small muted">{t('customer.declined.hold.body', { min: policy.paymentHoldMinutes })}</span>
        </div>
      </Card>
      <ListGroup title={t('customer.declined.retry')}>
        {methods.map((m) => <ListRow key={m.id} icon={m.glyph} title={bi(m.label)} subtitle={bi(m.hint)} onClick={() => onRetry(m.id)} />)}
      </ListGroup>
      {preferManual && <p className="xs muted">{t('customer.declined.threeStrikes')}</p>}
      <Button variant="ghost" size="sm" onClick={onRelease}>{t('customer.declined.release')}</Button>
    </div>
  );
}

/** E-01 — home on day one: teach the next step instead of empty containers. */
export function EmptyHomeBlock() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { user } = useSession();
  return (
    <div className="stack cust-home">
      <h1 className="cust-greeting">{t('customer.home.greeting', { name: user.name.split(' ')[0] })}</h1>
      <Card padding="sm">
        <EmptyState icon="sun" title={t('customer.empty.title')} body={t('customer.empty.body', { name: tenant.name })}
          action={<Button size="lg" onClick={() => nav('/app/schedule')}>{t('customer.empty.cta')}</Button>}
          secondary={<Link to="/app/rules" className="small">{t('customer.empty.tour')} →</Link>} />
      </Card>
      <Card tone="muted" eyebrow={t('customer.empty.stats')}><p className="small muted">{t('customer.empty.stats.body')}</p></Card>
      <Notice tone="info" action={<Link to="/app/passes"><Button size="sm" variant="secondary">{t('customer.empty.trial')}</Button></Link>}>{t('customer.home.membership.nudge')}</Notice>
      <Card tone="muted" eyebrow={t('customer.home.announcement')}><p className="small">{t('customer.home.announcement.body')}</p></Card>
    </div>
  );
}
