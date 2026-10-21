import { SessionEditorial } from '../../../components/molecule/SessionEditorial/SessionEditorial';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData, useTable } from '../../../data/DataContext';
import type { BookingRow, ClassSessionRow } from '../../../data/schema';
import { formatCOP, addDays, dateKey, MS } from '../../../i18n/format';
import { useLayout } from '../../../layout/useLayout';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { ClassCard } from '../../../components/organism/ClassCard/ClassCard';
import { OrderSummary } from '../../../components/molecule/OrderSummary/OrderSummary';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { Skeleton } from '../../../components/atom/Skeleton/Skeleton';
import { canvasSpecs } from '../specs';
import { PACKAGE_IDS, PASS_IDS, priceOf, useBookingActions, useEntitlements, useMyBookings, useSessionJoined, type EntitlementKind } from '../hooks';
import { PAYMENT_METHODS, recordPayment, wompiCheckout, type ElectronicMethod, type PayMethod, type WompiResult } from '../payments';
import { policy } from '../policy';
import { PageHead, durationMin, toneOf, roomName, teacherName } from '../ui';
import { MatPicker } from '../../../components/organism/MatPicker/MatPicker';
import { usesMats, occupiesMat, chooseMat } from '../../../data/mats';
import { tenant } from '../../../tenant/tenant';
import { DeclinedBlock, type DeclinedState } from './blocks';
import { SplitSections } from '../split';
import { useActions } from '../../../actions';
import { need, useAppNavHandlers } from '../actions';
import { Icon } from '../../../components/atom/Icon/Icon';

const spec = canvasSpecs['C-04'];
/** 0051: a class of the person's package, or something bought now — a trial or individual class, or a 12-class package. */
type Choice = 'package' | 'membership' | 'trial' | 'single' | 'pack12' | 'pack12_smtc';
const BUYABLE: readonly string[] = [...PASS_IDS, ...PACKAGE_IDS];
const isPass = (c: Choice): c is 'trial' | 'single' | 'pack12' | 'pack12_smtc' => BUYABLE.includes(c);

/** C-04 Reserve & checkout — one screen from intent to confirmed. */
export function CheckoutPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { t, bi, lang } = useI18n();
  const nav = useNavigate();
  const data = useData();
  const { user, devMode } = useSession();
  const { sections, isVisible } = useLayout(spec);
  const { joined, loading } = useSessionJoined(id);
  const ent = useEntitlements();
  const { book, sameDayConflict } = useBookingActions();
  const { rows: myBookings } = useMyBookings();
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions');

  const passParam = params.get('pass');
  const claimId = params.get('claim');
  const [mat, setMat] = useState<number | null>(() => Number(params.get('mat')) || null);
  const { rows: roomBookings } = useTable<BookingRow>('bookings', { where: { session_id: id ?? '' } });
  const yoga = usesMats(joined?.modality);
  const matValid = mat != null && Number.isInteger(mat) && mat >= 1 && mat <= Math.min(joined?.session.capacity ?? 0, tenant.studio.mats) && !roomBookings.some(b => occupiesMat(b) && b.mat_number === mat);
  const alreadyBooked = myBookings.some(b => b.session_id === id && occupiesMat(b));
  const [choice, setChoice] = useState<Choice | null>(() => {
    if (passParam && isPass(passParam as Choice)) return passParam as Choice;
    // A pass picked on C-07 before choosing a class (sessionStorage) becomes the default here.
    try { const pending = sessionStorage.getItem('hoyos.customer.pendingPass'); if (pending && isPass(pending as Choice)) { sessionStorage.removeItem('hoyos.customer.pendingPass'); return pending as Choice; } } catch { /* ignore */ }
    return null;
  });
  const kind: Choice = choice ?? (ent.defaultKind as Choice);
  const [method, setMethod] = useState<PayMethod>('card');
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'full' | 'unavailable' | 'conflict' | 'mat' | null>(null);
  const [declined, setDeclined] = useState<DeclinedState | null>(null);
  const [done, setDone] = useState<{ booking: BookingRow; pending: boolean } | null>(null);

  const conflict = useMemo(() => joined ? sameDayConflict(myBookings, sessions, joined.session) : null, [joined, myBookings, sessions, sameDayConflict]);
  const amount = isPass(kind) ? priceOf(kind).price ?? 0 : 0;
  const methodOpt = PAYMENT_METHODS.find((m) => m.id === method)!;

  const choices: { id: Choice; title: string; sub: string; price: string; available: boolean }[] = [
    { id: 'package', title: t('customer.checkout.package'), sub: ent.pkg.frozen ? t('customer.classes.frozen.title') : t('customer.checkout.package.sub', { n: ent.classBalance }), price: t('core.common.included'), available: ent.classBalance > 0 },
    ...BUYABLE.map((pid) => { const p = priceOf(pid); return { id: pid as Choice, title: bi(p.name), sub: bi(p.description), price: formatCOP(p.price ?? 0, lang), available: pid !== 'trial' || !ent.trialUsed }; }),
  ];

  /** Books (and pays, when a pass is chosen). Resolves the outcome so the WebMCP action can report it. */
  const confirm = async (): Promise<string> => {
    if (!joined) return 'unavailable';
    setBusy(true); setError(null);
    try {
      if (yoga) {
        if (!matValid) { setError('mat'); return 'mat'; }
        chooseMat(await data.list<BookingRow>('bookings', { where: { session_id: joined.session.id } }), Math.min(joined.session.capacity, tenant.studio.mats), mat);
      }
      if (alreadyBooked) throw new Error('booking_exists');
      if (joined.session.status !== 'scheduled' || new Date(joined.session.starts_at).getTime() <= Date.now()) throw new Error('session_unavailable');
      if (conflict) { setError('conflict'); return 'conflict'; }
      let paidWith: EntitlementKind = kind === 'package' ? 'package' : kind === 'membership' ? 'membership' : kind === 'trial' ? 'trial' : kind === 'single' ? 'single' : 'package';
      let packagePlanId: string | null = null;
      let pending = false;
      if (amount > 0 && isPass(kind)) {
        const item = priceOf(kind);
        let result: WompiResult | undefined;
        if (methodOpt.provider === 'wompi') result = await wompiCheckout({ amount, method: method as ElectronicMethod, simulate: simulateDecline ? 'declined' : 'approved' });
        const payment = await recordPayment(data, { userId: user.id, planId: `plan_${item.id}`, amount, method, result, ivaRate: policy.ivaRate });
        if (result?.status === 'declined') {
          setDeclined((d) => ({ reason: result?.reason ?? null, holdUntil: d?.holdUntil ?? new Date(Date.now() + policy.paymentHoldMinutes * MS.min).toISOString(), attempts: (d?.attempts ?? 0) + 1, method }));
          return 'declined';
        }
        pending = payment.status === 'pending';
        if (item.classes && item.classes > 1) {
          // A package bought with this booking: its classes open in the ledger and this class is the first one used.
          await data.insert('class_ledger', { user_id: user.id, plan_id: `plan_${item.id}`, payment_id: payment.id, delta: item.classes, reason: 'purchase', expires_at: dateKey(addDays(new Date(), item.validityDays ?? 90)), frozen_from: null, frozen_until: null });
          paidWith = 'package'; packagePlanId = `plan_${item.id}`;
        }
      }
      const booking = await book(joined.session, paidWith, { packagePlanId, matNumber: yoga ? mat : null });
      if (claimId) await data.update('waitlist', claimId, { status: 'claimed' });
      setDeclined(null);
      setDone({ booking, pending });
      return `booked ${booking.id}${pending ? ' (payment pending at the desk)' : ''}`;
    } catch (e) {
      const code = (e as Error).message.startsWith('mat_') ? 'mat' : (e as Error).message === 'session_full' ? 'full' : 'unavailable';
      setError(code);
      return code;
    } finally { setBusy(false); }
  };

  // WebMCP (0025). The handlers read the latest render through a ref so they are memoized once.
  // app.confirmReservation only books what costs nothing now (a class of the package); a charge stays a person's click.
  const live = useRef({ confirm, joined, yoga, matValid, amount, alreadyBooked, conflict, roomBookings });
  live.current = { confirm, joined, yoga, matValid, amount, alreadyBooked, conflict, roomBookings };
  const navHandlers = useAppNavHandlers();
  const handlers = useMemo(() => ({
    ...navHandlers,
    'app.pickMat': (p?: Record<string, string>) => {
      const { joined: j, yoga: y, roomBookings: taken } = live.current;
      if (!j) throw new Error('no class is open in checkout');
      if (!y) throw new Error('this class does not use mats');
      const n = Number(need(p, 'mat'));
      const max = Math.min(j.session.capacity, tenant.studio.mats);
      if (!Number.isInteger(n) || n < 1 || n > max) throw new Error(`mat must be 1–${max}`);
      if (taken.some((b) => occupiesMat(b) && b.mat_number === n)) throw new Error(`mat ${n} is taken`);
      setMat(n); setError(null);
      return `mat ${n} selected`;
    },
    'app.confirmReservation': async () => {
      const c = live.current;
      if (!c.joined) throw new Error('no class is open in checkout');
      if (c.alreadyBooked) throw new Error('already booked');
      if (c.conflict) throw new Error('one class a day: another booking that day');
      if (c.yoga && !c.matValid) throw new Error('pick a free mat first (app.pickMat)');
      if (c.amount > 0) throw new Error('this reservation charges a pass; payment needs a person to confirm');
      const out = await c.confirm();
      if (!out.startsWith('booked')) throw new Error(out);
      return out;
    },
  }), [navHandlers]);
  useActions(spec, handlers);

  if (!joined) {
    return (
      <div className="container page cust-page">
        <PageHead back="/app/schedule" title={t('customer.checkout.title')} />
        {loading ? <Skeleton shape="rect" height={160} /> : <EmptyState title={t('customer.class.notFound')} action={<Link to="/app/schedule"><Button>{t('customer.class.backToSchedule')}</Button></Link>} />}
      </div>
    );
  }

  const s = joined.session;
  const SECTIONS: Record<string, () => ReactNode> = {
    ClassSummary: () => <div className="stack"><ClassCard title={s.title} teacher={teacherName(joined)} room={roomName(joined)} startsAt={s.starts_at} endsAt={s.ends_at} tone={toneOf(joined)} booked={s.booked_count} capacity={s.capacity} level={s.level} /><SessionEditorial session={s} />{yoga && <MatPicker sessionId={s.id} capacity={s.capacity} value={mat} onChange={n => { setMat(n); setError(null); }} />}</div>,
    EntitlementPicker: () => declined ? null : (
      <section className="stack-sm">
        <h2 className="cust-h2">{t('customer.checkout.payWith')}</h2>
        <div className="cust-choices" role="radiogroup" aria-label={t('customer.checkout.payWith')}>
          {choices.filter((c) => c.available || c.id === kind).map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={kind === c.id} disabled={!c.available} className={`cust-choice ${kind === c.id ? 'is-active' : ''}`} onClick={() => setChoice(c.id)}>
              <span className="cust-choice-radio" aria-hidden />
              <span className="grow"><span className="cust-choice-title">{c.title}</span><span className="cust-choice-sub">{c.sub}</span></span>
              <span className="cust-choice-price">{c.price}</span>
            </button>
          ))}
        </div>
        {kind === 'trial' && <p className="xs muted">{t('customer.checkout.trialNote')}</p>}
        {(kind === 'pack12' || kind === 'pack12_smtc') && <p className="xs muted">{t('customer.checkout.packNote', { n: (priceOf(kind).classes ?? 12) - 1, months: Math.round((priceOf(kind).validityDays ?? 90) / 30) })}</p>}
        {kind === 'pack12_smtc' && <p className="xs muted">{t('customer.plans.benefit.affiliates')}</p>}
      </section>
    ),
    PaymentMethodRow: () => amount === 0 || declined ? null : (
      <section className="stack-sm">
        <div className="row-between"><h2 className="cust-h2">{t('customer.checkout.method')}</h2><Link to="/app/payment-methods" className="small">{t('customer.checkout.manageMethods')}</Link></div>
        <div className="row wrap">
          {PAYMENT_METHODS.map((m) => <button key={m.id} type="button" className={`cust-method ${method === m.id ? 'is-active' : ''}`} aria-pressed={method === m.id} onClick={() => setMethod(m.id)}><Icon name={m.glyph} size="sm" />{bi(m.label)}{m.provider === 'wompi' && <Badge tone="neutral">Wompi</Badge>}</button>)}
        </div>
        <p className="xs muted">{bi(methodOpt.hint)}</p>
        {devMode && methodOpt.provider === 'wompi' && <Toggle size="sm" checked={simulateDecline} onChange={setSimulateDecline} label={t('customer.checkout.simulateDecline')} />}
      </section>
    ),
    'OrderSummary (subtotal, IVA, total)': () => declined ? null : amount === 0 ? (
      <Notice tone="success" title={t('customer.checkout.noCharge')}>{t('customer.checkout.noCharge.package', { h: policy.cancelWindowHours })}</Notice>
    ) : (
      <OrderSummary lines={[{ label: bi(priceOf(kind as 'single').name), amount }]} taxRate={policy.ivaRate} subtotalLabel={t('customer.checkout.subtotal')} taxLabel={t('customer.checkout.iva')} totalLabel={t('customer.checkout.total')} note={t('customer.checkout.receiptNote')} />
    ),
    ConfirmButton: () => declined ? (
      <DeclinedBlock state={declined} amount={amount} onRetry={(m) => { setMethod(m); setDeclined(null); setSimulateDecline(false); }} onRelease={() => nav(`/app/class/${s.id}`)} onExpired={() => setDeclined(null)} />
    ) : (
      <div className="stack-sm cust-sticky">
        {error === 'mat' && <Notice tone="warn">{t('site.mat.error')}</Notice>}
        {alreadyBooked && <Notice tone="warn">{t('customer.home.booked')}</Notice>}
        {error === 'full' && <Notice tone="warn" title={t('customer.checkout.race.title')} action={<Button size="sm" onClick={() => nav(`/app/waitlist/${s.id}`)}>{t('core.common.waitlist')}</Button>}>{t('customer.checkout.race.body')}</Notice>}
        {error === 'unavailable' && <Notice tone="danger" title={t('core.common.error')}>{t('customer.checkout.unavailable')}</Notice>}
        {(error === 'conflict' || conflict) && <Notice tone="warn">{t('customer.book.oneADay')} {conflict && <Link to={`/app/class/${conflict}`}>{t('customer.class.seeOther')}</Link>}</Notice>}
        <Button block size="lg" loading={busy} disabled={!!conflict || alreadyBooked || (yoga && !matValid) || s.status !== 'scheduled' || new Date(s.starts_at).getTime() <= Date.now()} onClick={confirm}>
          {amount > 0 ? (methodOpt.provider === 'wompi' ? t('customer.checkout.payWompi', { amount: formatCOP(amount, lang) }) : t('customer.checkout.confirmManual', { amount: formatCOP(amount, lang) })) : t('customer.checkout.confirm')}
        </Button>
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.checkout.policy', { h: policy.cancelWindowHours })}</p>
      </div>
    ),
  };

  return (
    <div className="container page cust-page">
      <PageHead back={`/app/class/${s.id}`} title={t('customer.checkout.title')} sub={claimId ? t('customer.checkout.claiming') : undefined} />
      {/* ≥ 900 px: what you are booking (class + mat) on the left, how you pay + confirm on the right (D-0006). */}
      <SplitSections narrowClassName="stack" className="cust-checkout" names={sections.filter(isVisible)} render={(n) => SECTIONS[n]?.() ?? null} side={(n) => n !== 'ClassSummary'} />
      <Drawer open={!!done} onClose={() => done && nav(`/app/booking/${done.booking.id}`)} title={t('customer.book.ok')} side="bottom">
        {done && (
          <div className="stack">
            <ClassCard variant="next" title={s.title} teacher={teacherName(joined)} room={roomName(joined)} startsAt={s.starts_at} endsAt={s.ends_at} tone={toneOf(joined)} booked={s.booked_count} capacity={s.capacity} />
            {done.booking.mat_number && <p className="small">{t('site.mat.confirmed', { n: done.booking.mat_number })}</p>}
            {done.pending ? <Notice tone="warn" title={t('customer.checkout.pending.title')}>{t('customer.checkout.pending.body')}</Notice> : <p className="small muted">{t('customer.checkout.success.body', { min: durationMin(joined) })}</p>}
            <Button block size="lg" onClick={() => nav(`/app/booking/${done.booking.id}`)}>{t('customer.class.viewBooking')}</Button>
            <Button block variant="ghost" onClick={() => nav('/app/schedule')}>{t('customer.class.backToSchedule')}</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
