import type { EventRsvpRow } from '../../../data/schema';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import { formatCOP, formatDate, formatTime, MS } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { CapacityMeter } from '../../../components/molecule/CapacityMeter/CapacityMeter';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { useEventRsvp } from '../hooks';
import { useEventSnapshot } from '../useEventSnapshot';
import { eventDue, eventPreview, eventRsvp, type EventCommand } from '../eventRsvp';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { recordPayment, wompiCheckout } from '../payments';
import { policy } from '../policy';
import { MediaPlaceholder, PageHead, downloadIcs } from '../ui';

/** C-23 Events list — rows from the `events` table (published only), with live RSVP counts. */
export function EventsListPage() {
  const { t, bi, lang } = useI18n();
  const { snapshot, loading, error, retry } = useEventSnapshot();
  const events=snapshot?.events??[];
  return (
    <div className="container page cust-page">
      <PageHead back="/app/more" title={t('customer.events.title')} sub={t('customer.events.sub')} />
      <div className="stack">
        <Notice tone="info">{t('customer.events.mock')}</Notice>
        {error && <Notice tone="danger" action={<Button onClick={retry}>{t('core.common.retry')}</Button>}>{t('customer.events.readError')}</Notice>}
        {loading && events.length === 0 && <EmptyState compact tone="loading" title={t('core.common.loading')} />}
        {!loading && !error && events.length === 0 && <EmptyState icon="ticket" title={t('customer.events.empty')} body={t('customer.events.empty.body')} />}
        {events.length > 0 && (
          <ListGroup>
            {events.map(({ event: e, taken, mine }) => (
              <ListRow key={e.id} icon="ticket" title={bi(e.title)}
                subtitle={`${formatDate(e.starts_at, lang, { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatTime(e.starts_at, lang)} · ${bi(e.kind)}`}
                trailing={mine ? <Badge tone="success">{t('customer.events.going')}</Badge> : <span className="small muted">{Math.max(0, e.capacity - taken)} {t('customer.events.spots')}</span>}
                to={`/app/events/${e.id}`} />
            ))}
          </ListGroup>
        )}
      </div>
    </div>
  );
}

/** C-23 Event detail & RSVP — `event_rsvps` row, paid through the same Wompi seam as a class. */
export function EventPage() {
  const { id } = useParams();
  const { t, bi, lang } = useI18n();
  const data = useData();
  const { user, role } = useSession();
  const { snapshot, loading, error: readError, retry } = useEventSnapshot();
  const { cancel } = useEventRsvp();
  const context=`${user.id}|${role}|${id}`;
  const contextRef=useRef({context,data});contextRef.current={context,data};
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const [busy,setBusy]=useState(false);
  const inFlight=useRef(false);
  const [failure,setFailure]=useState<{context:string;key:string}|null>(null);
  type Draft=Omit<EventCommand,'isCurrent'> & {context:string;active:boolean};
  const [draft,setDraft]=useState<Draft|null>(null);
  const draftRef=useRef<Draft|null>(null);
  const previousContext=useRef({context,data});
  if(previousContext.current.context!==context||previousContext.current.data!==data){
   if(draftRef.current)draftRef.current.active=false;
   draftRef.current=null;previousContext.current={context,data};
  }
  const close=()=>{if(draftRef.current)draftRef.current.active=false;draftRef.current=null;setDraft(null);};
  const open=(action:'join'|'cancel')=>{if(inFlight.current||!entry)return;const next:Draft={key:crypto.randomUUID(),userId:user.id,role,action,event:eventPreview(entry.event),rsvpId:action==='cancel'?entry.mine?.id:undefined,context,active:true};draftRef.current=next;setDraft(next);setFailure(null);};
  const execute=async()=>{
   const request=draftRef.current;if(!request||inFlight.current)return;
   inFlight.current=true;setBusy(true);setFailure(null);
   const same=()=>mounted.current&&contextRef.current.context===request.context&&contextRef.current.data===data&&draftRef.current===request&&request.active;
   try{await eventRsvp(data,{...request,isCurrent:same});if(same()){close();retry();}}
   catch(e){if(same())setFailure({context,key:e instanceof Error?e.message:'event_failed'});}
   finally{inFlight.current=false;if(mounted.current)setBusy(false);}
  };
  const entry=snapshot?.events.find(x=>x.event.id===id||x.event.slug===id);
  if(loading||readError)return <div className="container page cust-page"><PageHead back="/app/events" title={t('customer.events.title')} />{readError?<Notice tone="danger" action={<Button onClick={retry}>{t('core.common.retry')}</Button>}>{t('customer.events.readError')}</Notice>:<EmptyState tone="loading" title={t('core.common.loading')} />}</div>;
  if (!entry || !snapshot) return <div className="container page cust-page"><PageHead back="/app/events" title={t('customer.events.notFound')} /><EmptyState title={t('customer.events.notFound')} action={<Link to="/app/events"><Button>{t('customer.events.title')}</Button></Link>} /></div>;

  const ev = entry.event;
  const host = snapshot.teachers.find((x) => x.id === ev.host_teacher_id);
  const mine = entry.mine;
  const isMember = snapshot.member;
  const amount = eventDue(ev,isMember);
  const memberIncluded = ev.member_price_cop === 0;
  const soldOut = entry.taken >= ev.capacity && !mine;
  const durationMin = Math.round((new Date(ev.ends_at).getTime() - new Date(ev.starts_at).getTime()) / MS.min);

  const reserve = async () => {
    if(amount<=0){open('join');return;}
    if(inFlight.current)return;inFlight.current=true;
    setBusy(true);
    try {
      if (!data.atomic || data.name !== 'mock') throw Error('event_disconnected');
      const result = await wompiCheckout({ amount, method: 'card' }); // Fictional result only.
      const current = () => mounted.current && contextRef.current.context === context && contextRef.current.data === data;
      if (!current()) throw Error('event_cancelled');
      await data.atomic(async tx => {
        const payment = await recordPayment(tx, { userId: user.id, planId: null, amount, method: 'card', result, ivaRate: policy.ivaRate });
        if (!current()) throw Error('event_cancelled');
        if (result.status === 'approved') {
          const rsvp = await tx.insert<EventRsvpRow>('event_rsvps', { event_id: ev.id, user_id: user.id, status: 'going', payment_id: payment.id, guests: 0 });
          await tx.insert('audit_log', { actor_id: user.id, action: 'event.rsvp.paid_mock', entity: 'event_rsvps', entity_id: rsvp.id, ip: null,
            diff: { role, source: 'fictional-paid-event', event_id: ev.id, payment_id: payment.id, simulated: true } });
        }
        if (!current()) throw Error('event_cancelled');
      });
    } catch { if(mounted.current&&contextRef.current.context===context)setFailure({context,key:'event_paid_partial'}); } finally { inFlight.current=false;if(mounted.current)setBusy(false); }
  };

  return (
    <div className="container page cust-page cust-has-sticky">
      <PageHead back="/app/events" title={<span className="sr-only">{bi(ev.title)}</span>} />
      <div className="stack">
        <Notice tone="info">{t('customer.events.mock')}</Notice>
        {amount>0&&<Notice tone="warn">{t('customer.events.paidPartial')}</Notice>}
        {failure?.context===context&&!draft&&<Notice tone="danger">{t('customer.events.commandError')}</Notice>}
        <MediaPlaceholder slotKey="event.cover" label={t('customer.events.photo')} ratio="4 / 5" tone="sun" />
        <div className="stack-sm">
          <span className="eyebrow">{formatDate(ev.starts_at, lang, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(ev.starts_at, lang)} · {tenant.name}</span>
          <h1 className="cust-title">{bi(ev.title)}</h1>
          <p className="small muted">{host ? t('customer.events.host', { name: host.display_name }) : ''}</p>
          <div className="row wrap"><Chip tone="sun" dot>{bi(ev.kind)}</Chip><Chip>{t('core.common.min', { n: durationMin })}</Chip></div>
        </div>
        <p className="small">{bi(ev.description)}</p>
        <Card padding="sm" className="stack-sm">
          <div className="row-between"><span className="small">{t('customer.events.price.public')}</span><strong>{formatCOP(ev.price_cop, lang)}</strong></div>
          <div className="row-between"><span className="small">{t('customer.events.price.member')}</span><strong>{memberIncluded ? t('core.common.included') : formatCOP(ev.member_price_cop, lang)}</strong></div>
          <CapacityMeter booked={entry.taken} capacity={ev.capacity} />
        </Card>
        {ev.bring && ev.bring.length > 0 && <Card tone="muted" eyebrow={t('customer.events.bring')}><ul className="cust-checklist small">{ev.bring.map((b, i) => <li key={i}>{bi(b)}</li>)}</ul></Card>}
        <ListGroup>
          <ListRow icon="invite" title={t('customer.events.friend')} subtitle={t('customer.events.friend.sub')} to="/app/invite" />
          <ListRow icon="calendar-plus" title={t('customer.booked.addToCalendar')} onClick={() => downloadIcs({ title: `${bi(ev.title)} · ${tenant.name}`, startsAt: ev.starts_at, endsAt: ev.ends_at, location: tenant.name })} />
        </ListGroup>
        <div className="cust-sticky">
          {mine ? <Notice tone="success" title={t('customer.events.going')} action={<Button variant="ghost" disabled={busy} onClick={() => { if(mine.payment_id===null){open('cancel');return;}if(inFlight.current)return;inFlight.current=true;setBusy(true);void cancel(mine).catch(()=>{if(mounted.current&&contextRef.current.context===context)setFailure({context,key:'event_paid_partial'});}).finally(()=>{inFlight.current=false;if(mounted.current)setBusy(false);}); }}>{t('customer.events.cancel')}</Button>}>{t(mine.payment_id===null?'customer.events.localGoing':'customer.events.paidPartial')}</Notice>
            : soldOut ? <Button block size="lg" variant="secondary" disabled>{t('customer.events.soldOut')}</Button>
              : <Button block size="lg" loading={busy} onClick={reserve}>{amount > 0 ? t('customer.checkout.payWompi', { amount: formatCOP(amount, lang) }) : t('customer.events.rsvp')}</Button>}
          {isMember && memberIncluded && !mine && <p className="xs muted" style={{ textAlign: 'center' }}><Badge tone="success">{t('customer.events.memberIncluded')}</Badge></p>}
          <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.events.policy')}</p>
        </div>
      </div>
      <Drawer open={!!draft&&draft.active&&draft.context===context} onClose={close} side="bottom" title={t(draft?.action==='cancel'?'customer.events.cancelPreview':'customer.events.joinPreview')} footer={<><Button variant="ghost" onClick={close}>{t('core.common.cancel')}</Button><Button loading={busy} onClick={()=>void execute()}>{t('customer.events.confirmMock')}</Button></>}>
       <div className="stack"><Notice tone="info">{t('customer.events.mock')}</Notice><strong>{bi(ev.title)}</strong>
       <p>{t(draft?.action==='cancel'?'customer.events.cancelBody':'customer.events.joinBody')}</p>
       {failure?.context===context&&<Notice tone="danger">{t(failure.key==='event_cancelled'?'customer.events.cancelledOperation':failure.key==='event_started'||failure.key==='event_cancel_unresolved'||failure.key==='event_unresolved'?'customer.events.clarification':failure.key==='event_changed'||failure.key==='event_payment_required'?'customer.events.changed':'customer.events.commandError')}</Notice>}
       </div>
      </Drawer>
    </div>
  );
}
