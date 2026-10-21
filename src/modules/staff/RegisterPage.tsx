import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { ClassSessionRow, MessageLogRow, PaymentRow, ProfileRow, RoomRow, SpaceBookingKind, SpaceBookingRow, SpecialChargeRow, TeacherRow, UserRow } from '../../data/schema';
import { formatCOP, formatTime } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { FAMILY_LABEL, priceItem, pricing, type PlanFamily, type PriceItem } from '../../tenant/pricing';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Chip } from '../../components/atom/Chip/Chip';
import { Badge } from '../../components/atom/Badge/Badge';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Avatar } from '../../components/atom/Avatar/Avatar';
import { PriceRow } from '../../components/molecule/PriceRow/PriceRow';
import { Receipt } from '../../components/organism/Receipt/Receipt';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useTodaySessions } from '../website/hooks';
import { splitTax, useSettings } from '../admin/settings';
import { bookWithPackage } from '../../data/deskBooking';
import { maskPhone, personMatches, usePeople } from './people';
import { BOOKING_KINDS, KIND_FOR_ITEM, KIND_LABEL, dateInputValue, findConflicts, localIso, timeInputValue } from './rooms';
import './staff.css';
import { addDays, dateKey, digitsOf, parseDigits } from '../../i18n/format';
import { fakeRef } from '../customer/payments';

/** 0051: the desk's methods — cash, the card terminal, a transfer, the Wompi QR shown at the desk, and a Wompi payment link. No Nequi. */
type Method = 'cash' | 'datafono' | 'transfer' | 'qr' | 'wompi';
const METHODS: Method[] = ['cash', 'datafono', 'transfer', 'qr', 'wompi'];
const METHOD_DB: Record<Method, { method: string; provider: 'wompi' | 'manual' }> = {
  cash: { method: 'cash', provider: 'manual' }, datafono: { method: 'card', provider: 'manual' }, transfer: { method: 'transfer', provider: 'manual' }, qr: { method: 'qr', provider: 'wompi' }, wompi: { method: 'card', provider: 'wompi' },
};
/** What the desk sells from the list: the trial and individual class, and the 12-class package (0051). */
const SELLABLE: PlanFamily[] = ['bienvenida', 'paquetes'];
/** A desk sale: a priced item, or an Especial typed by hand (a private class, a rental, a corporate session). */
type DeskItem = Omit<PriceItem, 'family'> & { family: PlanFamily };
type Mode = 'new' | 'existing' | 'contact';

interface Sale { payment: PaymentRow; number: string; subtotal: number; tax: number; total: number; customer: string; contact: string; item: DeskItem; checkedIn?: string; isNew: boolean; booking?: string; payout?: { name: string; amount: number } }

/**
 * Especiales (0017): the one item whose concept and price are typed by hand. Started from the private class
 * (0051: 250.000 for one person + 60.000 per additional person, max 3 — prefilled from pricing.ts) or free. Optional teacher + payout, optional
 * room window; `bookingId` is set when S-05 sent the desk here to charge an existing booking.
 */
interface Special { on: boolean; source: string | null; people: number; concept: string; amountRaw: string; teacherId: string; payoutRaw: string; roomId: string; kind: SpaceBookingKind; date: string; start: string; end: string; note: string; bookingId: string | null }
const NO_SPECIAL: Special = { on: false, source: null, people: 1, concept: '', amountRaw: '', teacherId: '', payoutRaw: '', roomId: '', kind: 'private_event', date: '', start: '', end: '', note: '', bookingId: null };

/** S-04 — who · what · how, then a printable receipt. Prices from pricing.ts, IVA from M-08. */
export function RegisterPage() {
  const { t, lang, bi } = useI18n();
  const data = useData();
  const { user, role, can } = useSession();
  const saleKey = useRef(crypto.randomUUID());
  const saleBusy = useRef(false);
  const { settings } = useSettings();
  const [params] = useSearchParams();
  const { people } = usePeople();
  const today = useTodaySessions();
  const { rows: rooms } = useTable<RoomRow>('rooms', { orderBy: { column: 'created_at' } });
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true }, orderBy: { column: 'display_name' } });
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions');
  const { rows: spaceBookings } = useTable<SpaceBookingRow>('space_bookings');

  const [mode, setMode] = useState<Mode>('new');
  const [contactName, setContactName] = useState('');
  const [special, setSpecial] = useState<Special>(NO_SPECIAL);
  const [form, setForm] = useState({ first: '', last: '', phone: '', email: '', birthday: '', emergency: '', consent: false });
  const [existingQ, setExistingQ] = useState('');
  const [personId, setPersonId] = useState<string | null>(null);
  const [itemId, setItemId] = useState('trial');
  const [method, setMethod] = useState<Method>('cash');
  const [receipt, setReceipt] = useState({ wa: true, email: true });
  const [paidRaw, setPaidRaw] = useState<string | null>(null); // null = untouched, so it follows the invoiced total
  const [note, setNote] = useState('');
  const [sessionId, setSessionId] = useState(params.get('session') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Sale | null>(null);

  const canWrite = can('payments.write');
  const specialAmount = parseDigits(special.amountRaw);
  // An Especial is a PriceItem whose name and price were typed by hand; everything downstream (IVA, receipt, "Valor pagado") treats it like any other item.
  const item: DeskItem = special.on
    ? { id: 'especial', family: special.source === 'private' ? 'privadas' : 'espacio', name: { es: special.concept.trim() || t('staff.register.especial.title'), en: special.concept.trim() || t('staff.register.especial.title') }, description: { es: '', en: '' }, price: specialAmount }
    : (priceItem(itemId) ?? pricing[0]);
  const totals = splitTax(item.price ?? 0, settings.tax);
  const specialTeacher = special.teacherId ? teachers.find((x) => x.id === special.teacherId) : undefined;
  const payout = parseDigits(special.payoutRaw);
  const bookingStart = localIso(special.date, special.start);
  const bookingEnd = localIso(special.date, special.end);
  const windowOk = !!special.roomId && !!bookingStart && !!bookingEnd && bookingStart < bookingEnd;
  const conflicts = useMemo(() => (special.on && special.roomId ? findConflicts({ roomId: special.roomId, startsAt: bookingStart, endsAt: bookingEnd, excludeBookingId: special.bookingId }, sessions, spaceBookings) : []), [special.on, special.roomId, special.bookingId, bookingStart, bookingEnd, sessions, spaceBookings]);
  const linkedBooking = special.bookingId ? spaceBookings.find((b) => b.id === special.bookingId) : undefined;
  const specialOk = !special.on || (special.concept.trim().length > 0 && specialAmount > 0 && (!special.roomId || (windowOk && conflicts.length === 0)));

  /** The private-class price for `people` people: the class plus each additional person (pricing.ts). */
  const privatePrice = (people: number) => (priceItem('private')?.price ?? 0) + Math.max(0, people - 1) * (priceItem('private_extra')?.price ?? 0);
  /** Start an Especial from the private class (concept and price prefilled for one person) or free. */
  const startSpecial = (source: string | null) => {
    const src = source ? priceItem(source) : undefined;
    setSpecial({ ...NO_SPECIAL, on: true, source, concept: src ? bi(src.name) : '', amountRaw: source === 'private' ? String(privatePrice(1)) : src?.price ? String(src.price) : '', kind: source ? (KIND_FOR_ITEM[source] ?? 'private_event') : 'private_event', date: dateInputValue(new Date()) });
    setPaidRaw(null);
  };
  const setPeople = (people: number) => { setSpecial((sp) => ({ ...sp, people, amountRaw: String(privatePrice(people)) })); setPaidRaw(null); };
  const pickItem = (id: string) => { setItemId(id); setSpecial(NO_SPECIAL); if (mode === 'contact') setMode('new'); setPaidRaw(null); };

  // S-05 sent the desk here to charge an existing booking: load it once, into an Especial.
  const bookingParam = params.get('booking');
  useEffect(() => {
    if (!bookingParam || special.bookingId === bookingParam) return;
    const b = spaceBookings.find((x) => x.id === bookingParam);
    if (!b) return;
    const source = b.kind === 'private_class' ? 'private' : null;
    setSpecial({ on: true, source, people: 1, concept: b.title, amountRaw: source === 'private' ? String(privatePrice(1)) : '', teacherId: b.teacher_id ?? '', payoutRaw: '', roomId: b.room_id, kind: b.kind, date: dateInputValue(new Date(b.starts_at)), start: timeInputValue(b.starts_at), end: timeInputValue(b.ends_at), note: b.note ?? '', bookingId: b.id });
    if (b.customer_id) { setMode('existing'); setPersonId(b.customer_id); } else { setMode('contact'); setContactName(b.contact_name ?? ''); }
  }, [bookingParam, spaceBookings, special.bookingId]);
  const person = personId ? people.find((p) => p.id === personId) : undefined;
  const candidates = useMemo(() => (existingQ.trim().length < 2 ? [] : people.filter((p) => p.role === 'customer' && personMatches(p, existingQ)).slice(0, 6)), [people, existingQ]);
  const session = today.find((x) => x.session.id === sessionId);
  const upcoming = today.filter((x) => new Date(x.session.ends_at).getTime() > Date.now());
  const items = pricing.filter((p) => p.price != null && SELLABLE.includes(p.family));

  // Jas review: the desk can record a different amount received, but only with an observation attached.
  const amountPaid = paidRaw === null || paidRaw.trim() === '' ? totals.total : Math.max(0, Math.round(Number(paidRaw.replace(/[^\d]/g, '')) || 0));
  const paidDiffers = amountPaid !== totals.total;
  const noteOk = !paidDiffers || note.trim().length > 0;
  const who = mode === 'existing' ? !!person : mode === 'contact' ? special.on && contactName.trim().length > 0 : form.first.trim() && form.phone.trim() && form.consent;
  const valid = who && noteOk && specialOk;
  const displayName = mode === 'existing' ? person?.name ?? '' : mode === 'contact' ? contactName.trim() : `${form.first.trim()} ${form.last.trim()}`.trim();

  const complete = async () => {
    if (!canWrite || !valid || saleBusy.current) return;
    saleBusy.current = true;
    setBusy(true); setError(null);
    try {
      if (!data.atomic) throw new Error('mock_atomic_adapter_required');
      const result = await data.atomic<Sale>(async data => {
      const audit = (action: string, entity: string, entityId: string, diff: Record<string, unknown>) => data.insert('audit_log', { actor_id: user.id, action, entity, entity_id: entityId, diff: { role, source: 'front_desk', ...diff }, ip: null });
      const now = new Date();
      if (sessionId && (!session || method === 'wompi')) throw new Error(method === 'wompi' ? 'payment_confirmation_required' : 'session_unavailable');
      let userId: string | null = person?.id ?? null;
      let isNew = false;
      if (!userId && mode !== 'contact') {
        isNew = true;
        const u = await data.insert<UserRow>('users', { email: form.email.trim() || `${digitsOf(form.phone)}@sin-email.hoyos.test`, phone: form.phone.trim(), status: 'active', last_sign_in_at: null, locale: lang });
        userId = u.id;
        const initials = displayName.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
        await data.insert<ProfileRow>('profiles', { user_id: u.id, full_name: displayName, initials, photo_url: null, birthday: form.birthday || null, emergency_contact: form.emergency ? { name: form.emergency } : null, marketing_optin: receipt.wa, whatsapp_verified: false, notes: null } as Partial<ProfileRow>);
        await data.insert('user_roles', { user_id: u.id, role: 'customer', granted_by: user.id });
        await data.insert('consents', { user_id: u.id, legal_document_id: 'leg_terms_es', accepted_at: now.toISOString(), ip: null });
        await audit('user.create', 'users', u.id, { after: { name: displayName, phone: form.phone }, consent: 'leg_terms_es' });
      }
      const db = METHOD_DB[method];
      const pending = method === 'wompi';
      const payment = await data.insert<PaymentRow>('payments', { user_id: userId, plan_id: special.on ? null : `plan_${item.id}`, amount: totals.total, amount_paid: amountPaid, note: paidDiffers ? note.trim() : null, currency: tenant.currency, method: db.method, provider: db.provider, provider_ref: pending ? fakeRef('wmp_link') : null, status: pending ? 'pending' : 'approved', paid_at: pending ? null : now.toISOString(), taken_by: user.id } as Partial<PaymentRow>);
      const number = `${tenant.invoicePrefix}-${1000 + (await data.list('invoices')).length + 1}`;
      await data.insert('invoices', { payment_id: payment.id, number, subtotal: totals.subtotal, tax: totals.tax, total: totals.total, issued_at: now.toISOString(), pdf_url: null, dian_cufe: null });
      await audit('payment.take', 'payments', payment.id, { amount: totals.total, amount_paid: amountPaid, note: paidDiffers ? note.trim() : null, method, item: item.id, invoice: number, status: payment.status, contact: mode === 'contact' ? contactName.trim() : undefined });

      // Especial: the room window (new or the one S-05 sent us) and the special_charges row that joins money in, teacher payout and booking.
      let bookingTitle: string | undefined;
      let payoutDone: Sale['payout'];
      if (special.on) {
        const concept = special.concept.trim();
        const contact = mode === 'contact' ? contactName.trim() : null;
        let bookingId: string | null = null;
        if (special.roomId && windowOk) {
          if (linkedBooking) {
            await data.update('space_bookings', linkedBooking.id, { status: linkedBooking.status === 'held' ? 'confirmed' : linkedBooking.status, customer_id: userId, contact_name: userId ? null : contact, teacher_id: special.teacherId || null });
            await audit('space_booking.confirmed', 'space_bookings', linkedBooking.id, { before: linkedBooking.status, after: 'confirmed', via: 'S-04' });
            bookingId = linkedBooking.id;
          } else {
            const b = await data.insert<SpaceBookingRow>('space_bookings', { room_id: special.roomId, kind: special.kind, title: concept, starts_at: bookingStart, ends_at: bookingEnd, customer_id: userId, contact_name: userId ? null : contact, teacher_id: special.teacherId || null, special_charge_id: null, status: 'confirmed', note: special.note.trim() || null, created_by: user.id } as Partial<SpaceBookingRow>);
            await audit('space_booking.create', 'space_bookings', b.id, { after: { kind: special.kind, room_id: special.roomId, starts_at: bookingStart, ends_at: bookingEnd, status: 'confirmed', title: concept }, via: 'S-04' });
            bookingId = b.id;
          }
          bookingTitle = `${concept} · ${formatTime(bookingStart, lang)}–${formatTime(bookingEnd, lang)}`;
        }
        const sc = await data.insert<SpecialChargeRow>('special_charges', { concept, amount: totals.total, customer_id: userId, contact_name: userId ? null : contact, teacher_id: special.teacherId || null, teacher_payout: special.teacherId && payout > 0 ? payout : null, space_booking_id: bookingId, payment_id: payment.id, source_item: special.source, note: special.note.trim() || null, created_by: user.id } as Partial<SpecialChargeRow>);
        if (bookingId) await data.update('space_bookings', bookingId, { special_charge_id: sc.id });
        await audit('special.create', 'special_charges', sc.id, { concept, amount: totals.total, teacher_id: special.teacherId || null, teacher_payout: sc.teacher_payout, booking: bookingId, payment: payment.id, source: special.source });
        if (specialTeacher && sc.teacher_payout) payoutDone = { name: specialTeacher.display_name, amount: sc.teacher_payout };
      }

      if (special.on) {
        // no package, no class check-in: an Especial is its own thing
      } else if (item.classes && payment.status === 'approved') {
        // 0051: the classes open in the ledger (12 for the package, 1 for a class bought ahead) with their validity.
        const c = await data.insert('class_ledger', { user_id: userId, plan_id: `plan_${item.id}`, payment_id: payment.id, delta: item.classes, reason: 'purchase', expires_at: item.validityDays ? dateKey(addDays(now, item.validityDays)) : null, frozen_from: null, frozen_until: null });
        await audit('classes.purchase', 'class_ledger', c.id, { delta: item.classes, user_id: userId });
      }

      let checkedIn: string | undefined;
      if (session && settings.features.autoCheckinOnSale && userId && !special.on) {
        const b = await bookWithPackage(data, { userId, sessionId: session.session.id, status: 'checked_in', now: now.toISOString(), paymentId: payment.id, paidWith: item.id === 'trial' ? 'trial' : (item.classes ?? 0) > 1 ? 'package' : 'single' });
        await audit('booking.checkin', 'bookings', b.id, { after: 'checked_in', session_id: session.session.id, user_id: userId, source_sale: payment.id });
        checkedIn = `${session.session.title} · ${formatTime(session.session.starts_at, lang)}`;
      }
      for (const ch of [receipt.wa ? 'whatsapp' : null, receipt.email ? 'email' : null] as const) {
        if (ch && userId) await data.insert<MessageLogRow>('message_log', { user_id: userId, channel: ch, direction: 'outbound', source: 'system', template_key: 'receipt', automation_id: null, subject: ch === 'email' ? `${tenant.name} · ${number}` : null, body: `${number} · ${formatCOP(totals.total, 'es')}`, status: 'queued', sent_at: null, sent_by: user.id, read_at: null, read_by: null, external_id: null, payload: { invoice: number, amount: totals.total } });
      }
      const contact = mode === 'existing' ? maskPhone(person?.phone) : mode === 'contact' ? '—' : maskPhone(form.phone);
      return { payment, number, subtotal: totals.subtotal, tax: totals.tax, total: totals.total, customer: displayName, contact, item, checkedIn, isNew, booking: bookingTitle, payout: payoutDone };
      }, { idempotencyKey: saleKey.current });
      setDone(result);
    } catch (e) { const code = e instanceof Error ? e.message : ''; setError(['payment_confirmation_required','session_unavailable','session_full','booking_exists','same_day_conflict','insufficient_classes','package_frozen','package_expired','mock_atomic_adapter_required'].includes(code) ? code : 'failed'); } finally { setBusy(false); saleBusy.current = false; }
  };

  const reset = () => { saleKey.current = crypto.randomUUID(); setDone(null); setForm({ first: '', last: '', phone: '', email: '', birthday: '', emergency: '', consent: false }); setPersonId(null); setExistingQ(''); setMode('new'); setItemId('trial'); setMethod('cash'); setPaidRaw(null); setNote(''); setSpecial(NO_SPECIAL); setContactName(''); };

  if (!canWrite) return <div className="stack"><div className="page-head"><h1>{t('staff.register.title')}</h1></div><EmptyState tone="error" title={t('staff.register.noPermission')} body={t('staff.register.noPermission.body')} /></div>;

  if (done) {
    return (
      <div className="stack">
        <div className="page-head"><div><h1>{t('staff.register.done')}</h1><p className="muted small">{done.isNew ? t('staff.register.done.new', { name: done.customer }) : t('staff.register.done.existing', { name: done.customer })}{done.checkedIn ? ` · ${t('staff.register.done.checkedIn', { cls: done.checkedIn })}` : ''}{done.booking ? ` · ${t('staff.register.done.booking', { title: done.booking })}` : ''}{done.payout ? ` · ${t('staff.register.done.payout', { name: done.payout.name, amount: formatCOP(done.payout.amount, lang) })}` : ''}</p></div></div>
        <div className="register-done">
          <Receipt studio={tenant.legalName} number={done.number} issuedAt={done.payment.created_at} customer={done.customer} contact={done.contact} lines={[{ label: bi(done.item.name), amount: done.total }]} subtotal={done.subtotal} tax={done.tax} taxLabel={t('staff.register.iva', { pct: settings.tax.ivaPct })} total={done.total} method={t(`staff.register.method.${method}`)} status={done.payment.status} takenBy={`${user.name}`} dianRef={null} note={`${t('staff.booking.mock')}${done.checkedIn ? ` · ${t('staff.register.done.checkedIn', { cls: done.checkedIn })}` : done.booking ? ` · ${t('staff.register.done.booking', { title: done.booking })}` : ''}`} printLabel={t('staff.register.print')} />
          <div className="stack-sm">
            {done.payment.status === 'pending' && <Card tone="highlight"><p className="small">{t('staff.register.wompi.pending')}</p></Card>}
            <Button onClick={reset} icon="sell">{t('staff.register.newSale')}</Button>
            {done.booking && <Link to="/staff/rooms"><Button block variant="secondary" icon="rooms">{t('staff.home.openRooms')}</Button></Link>}
            <Link to={`/staff/checkin${sessionId ? `?session=${sessionId}` : ''}`}><Button block variant="secondary" icon="checkin">{t('staff.home.openCheckin')}</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('staff.register.title')}</h1><p className="muted small">{t('staff.register.subtitle')}</p></div></div>
      <p className="xs muted">{t('staff.booking.mock')}</p>
      <div className="register">
        <div className="register-steps">
          <Card eyebrow={t('staff.register.step1')} title={t('staff.register.who')} actions={<div className="row wrap" role="tablist"><Chip selected={mode === 'new'} onClick={() => setMode('new')}>{t('staff.register.new')}</Chip><Chip selected={mode === 'existing'} onClick={() => setMode('existing')}>{t('staff.register.existing')}</Chip><Chip selected={mode === 'contact'} disabled={!special.on} title={special.on ? undefined : t('staff.register.contact.only')} onClick={() => setMode('contact')}>{t('staff.register.contact')}</Chip></div>}>
            {mode === 'contact' ? (
              <div className="stack-sm">
                <Field label={t('staff.register.contact.name')} required hint={t('staff.register.contact.hint')}>{(id) => <Input id={id} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={t('staff.rooms.f.contact.ph')} autoFocus />}</Field>
              </div>
            ) : mode === 'new' ? (
              <div className="grid grid-2 register-form">
                <Field label={t('staff.register.f.first')} required>{(id) => <Input id={id} value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} autoFocus />}</Field>
                <Field label={t('staff.register.f.last')}>{(id) => <Input id={id} value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} />}</Field>
                <Field label={t('staff.register.f.whatsapp')} required hint={t('staff.register.f.whatsapp.hint')}>{(id) => <Input id={id} inputMode="tel" placeholder={`${tenant.dialCode} 300 000 0000`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}</Field>
                <Field label={t('staff.register.f.email')}>{(id) => <Input id={id} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
                <Field label={t('staff.register.f.emergency')}>{(id) => <Input id={id} value={form.emergency} onChange={(e) => setForm({ ...form, emergency: e.target.value })} placeholder={t('staff.register.f.emergency.ph')} />}</Field>
                <Field label={t('staff.register.f.birthday')}>{(id) => <Input id={id} type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />}</Field>
                <div className="register-consent"><Toggle checked={form.consent} onChange={(on) => setForm({ ...form, consent: on })} label={t('staff.register.consent')} /><p className="xs muted">{t('staff.register.consent.hint', { staff: user.name })}</p></div>
              </div>
            ) : (
              <div className="stack-sm">
                {person ? (
                  <div className="register-found">
                    <Avatar name={person.name} initials={person.initials} size={44} />
                    <div className="grow"><strong>{person.name}</strong><div className="xs muted">{maskPhone(person.phone)} · {person.email}</div><div className="row wrap" style={{ marginTop: 'var(--sp-xs)' }}>{person.plan ? <Badge tone="success">{bi({ es: person.plan.name_es, en: person.plan.name_en })}</Badge> : <Badge>{t('staff.checkin.noPlan')}</Badge>}{person.whatsappVerified && <Badge tone="primary">WhatsApp ✓</Badge>}</div></div>
                    <Button size="sm" variant="ghost" onClick={() => setPersonId(null)}>{t('core.common.edit')}</Button>
                  </div>
                ) : (
                  <>
                    <Input value={existingQ} onChange={(e) => setExistingQ(e.target.value)} placeholder={t('staff.register.search.ph')} autoFocus aria-label={t('core.common.search')} />
                    {candidates.map((p) => <button key={p.id} type="button" className="register-candidate" onClick={() => setPersonId(p.id)}><Avatar name={p.name} initials={p.initials} size={32} /><span className="grow"><span className="small">{p.name}</span><span className="xs muted"> · {maskPhone(p.phone)}</span></span>{p.plan && <Badge tone="success">{bi({ es: p.plan.name_es, en: p.plan.name_en })}</Badge>}</button>)}
                    {existingQ.trim().length >= 2 && candidates.length === 0 && <p className="small muted">{t('staff.register.search.none')} <button type="button" className="register-link" onClick={() => setMode('new')}>{t('staff.register.new')}</button></p>}
                  </>
                )}
              </div>
            )}
          </Card>

          <Card eyebrow={t('staff.register.step2')} title={t('staff.register.what')}>
            <p className="xs muted" style={{ marginBottom: 'var(--sp-md)' }}>{t('staff.register.what.hint')}</p>
            {SELLABLE.map((fam) => (
              <div key={fam} className="register-family">
                <div className="eyebrow">{bi(FAMILY_LABEL[fam])}</div>
                {items.filter((p) => p.family === fam).map((p) => <div key={p.id} className={`register-item ${!special.on && p.id === itemId ? 'is-selected' : ''}`}><PriceRow item={p} onSelect={() => pickItem(p.id)} /></div>)}
              </div>
            ))}
            <div className="register-family">
              <div className="eyebrow">{t('staff.register.especial.family')}</div>
              <p className="xs muted" style={{ marginBottom: 'var(--sp-sm)' }}>{t('staff.register.especial.family.hint')}</p>
              {pricing.filter((p) => p.id === 'private').map((p) => <div key={p.id} className={`register-item ${special.on && special.source === p.id ? 'is-selected' : ''}`}><PriceRow item={p} onSelect={() => startSpecial(p.id)} /></div>)}
              <div className={`register-item ${special.on && special.source === null ? 'is-selected' : ''}`}>
                <button type="button" className="register-custom" onClick={() => startSpecial(null)} aria-pressed={special.on && special.source === null}>
                  <span className="grow"><strong className="small">{t('staff.register.especial.custom')}</strong><span className="xs muted" style={{ display: 'block' }}>{t('staff.register.especial.custom.hint')}</span></span>
                  <Badge tone="highlight">{t('staff.register.especial.title')}</Badge>
                </button>
              </div>
            </div>
          </Card>

          {special.on && (
            <Card eyebrow="Especial" title={t('staff.register.especial.title')} tone="highlight" data-testid="especial-card">
              <p className="xs muted" style={{ marginBottom: 'var(--sp-md)' }}>{t('staff.register.especial.body')}</p>
              {linkedBooking && <p className="small" style={{ marginBottom: 'var(--sp-md)' }}><Badge tone="primary">S-05</Badge> {t('staff.register.especial.fromBooking', { title: linkedBooking.title })}</p>}
              <div className="register-special">
                <div className="register-full"><Field label={t('staff.register.especial.concept')} required>{(id) => <Input id={id} value={special.concept} onChange={(e) => setSpecial({ ...special, concept: e.target.value })} placeholder={t('staff.register.especial.concept.ph')} invalid={!special.concept.trim()} autoFocus={!linkedBooking} />}</Field></div>
                {special.source === 'private' && <Field label={t('staff.register.especial.people')} hint={t('staff.register.especial.people.hint', { max: priceItem('private')?.maxPeople ?? 3, extra: formatCOP(priceItem('private_extra')?.price ?? 0, lang) })}>{(id) => <Select id={id} value={special.people} onChange={(e) => setPeople(Number(e.target.value))}>{Array.from({ length: priceItem('private')?.maxPeople ?? 3 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{t('staff.register.especial.peopleN', { n })}</option>)}</Select>}</Field>}
                <Field label={t('staff.register.especial.amount')} required hint={t('staff.register.especial.amount.hint')}>{(id) => <Input id={id} inputMode="numeric" value={special.amountRaw} onChange={(e) => { setSpecial({ ...special, amountRaw: e.target.value }); setPaidRaw(null); }} invalid={specialAmount <= 0} />}</Field>
                <Field label={t('staff.register.especial.teacher')}>{(id) => <Select id={id} value={special.teacherId} onChange={(e) => setSpecial({ ...special, teacherId: e.target.value })}><option value="">{t('staff.register.especial.teacher.none')}</option>{teachers.map((x) => <option key={x.id} value={x.id}>{x.display_name}</option>)}</Select>}</Field>
                {specialTeacher && <div className="register-full"><Field label={t('staff.register.especial.payout')} hint={t('staff.register.especial.payout.hint', { rate: formatCOP(specialTeacher.rate_per_class ?? 0, lang) })}>{(id) => <Input id={id} inputMode="numeric" value={special.payoutRaw} onChange={(e) => setSpecial({ ...special, payoutRaw: e.target.value })} placeholder={String(specialTeacher.rate_per_class ?? '')} />}</Field></div>}
                <Field label={t('staff.register.especial.room')}>{(id) => <Select id={id} value={special.roomId} onChange={(e) => setSpecial({ ...special, roomId: e.target.value })} disabled={!!linkedBooking}><option value="">{t('staff.register.especial.room.none')}</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name} · {t('core.common.capacity', { n: r.capacity })}</option>)}</Select>}</Field>
                {special.roomId && (
                  <>
                    <Field label={t('staff.register.especial.kind')}>{(id) => <Select id={id} value={special.kind} onChange={(e) => setSpecial({ ...special, kind: e.target.value as SpaceBookingKind })} disabled={!!linkedBooking}>{BOOKING_KINDS.filter((k) => k !== 'maintenance' && k !== 'blocked').map((k) => <option key={k} value={k}>{bi(KIND_LABEL[k])}</option>)}</Select>}</Field>
                    <Field label={t('staff.register.especial.date')} required>{(id) => <Input id={id} type="date" value={special.date} onChange={(e) => setSpecial({ ...special, date: e.target.value })} disabled={!!linkedBooking} />}</Field>
                    <Field label={t('staff.register.especial.start')} required>{(id) => <Input id={id} type="time" step={900} value={special.start} onChange={(e) => setSpecial({ ...special, start: e.target.value })} disabled={!!linkedBooking} />}</Field>
                    <Field label={t('staff.register.especial.end')} required>{(id) => <Input id={id} type="time" step={900} value={special.end} onChange={(e) => setSpecial({ ...special, end: e.target.value })} disabled={!!linkedBooking} invalid={!!special.start && !!special.end && !windowOk} />}</Field>
                    <div className="register-full">
                      {windowOk && conflicts.length > 0 && (
                        <div className="staff-notice staff-notice-bad small" role="alert" data-testid="especial-conflict">
                          <strong>{t('staff.rooms.conflict', { room: rooms.find((r) => r.id === special.roomId)?.name ?? '' })}</strong>
                          <ul className="xs" style={{ margin: 'var(--sp-sm) 0 0', paddingLeft: 'var(--sp-lg)' }}>{conflicts.map((c) => <li key={c.id}>{formatTime(c.starts_at, lang)}–{formatTime(c.ends_at, lang)} · {c.title}</li>)}</ul>
                        </div>
                      )}
                      {windowOk && conflicts.length === 0 && <p className="xs rooms-free">{t('staff.rooms.free', { room: rooms.find((r) => r.id === special.roomId)?.name ?? '' })}</p>}
                      {special.start && special.end && !windowOk && <p className="xs register-diff">{t('staff.rooms.badWindow')}</p>}
                    </div>
                  </>
                )}
                <div className="register-full"><Field label={t('staff.register.especial.note')}>{(id) => <Input id={id} value={special.note} onChange={(e) => setSpecial({ ...special, note: e.target.value })} placeholder={t('staff.register.especial.note.ph')} />}</Field></div>
              </div>
            </Card>
          )}

          <Card eyebrow={t('staff.register.step3')} title={t('staff.register.how')}>
            <div className="register-methods" role="radiogroup">
              {METHODS.map((m) => <button key={m} type="button" role="radio" aria-checked={method === m} className={`register-method ${method === m ? 'is-selected' : ''}`} onClick={() => setMethod(m)}><strong className="small">{t(`staff.register.method.${m}`)}</strong><span className="xs muted">{t(`staff.register.method.${m}.hint`)}</span></button>)}
            </div>
            {method === 'wompi' && <p className="xs muted" style={{ marginTop: 'var(--sp-sm)' }}>{t('staff.register.wompi.note')}</p>}
            <div className="row wrap" style={{ marginTop: 'var(--sp-lg)' }}>
              <Toggle size="sm" checked={receipt.wa} onChange={(on) => setReceipt({ ...receipt, wa: on })} label={t('staff.register.receipt.wa')} />
              <Toggle size="sm" checked={receipt.email} onChange={(on) => setReceipt({ ...receipt, email: on })} label={t('staff.register.receipt.email')} />
            </div>
          </Card>
        </div>

        <aside className="register-rail">
          <Card title={t('staff.register.summary')} raised>
            <div className="stack-sm">
              <div className="row-between"><span className="small">{displayName || <span className="muted">{t('staff.register.summary.noone')}</span>}</span>{mode === 'new' && form.first && <Badge tone="primary">{t('core.common.new')}</Badge>}</div>
              <div className="row-between register-line"><span>{bi(item.name)}{special.on && <Badge tone="highlight" className="register-badge">{t('staff.register.especial.title')}</Badge>}</span><strong>{formatCOP(item.price ?? 0, lang)}</strong></div>
              {special.on && specialTeacher && payout > 0 && <div className="row-between register-line xs muted"><span>{t('staff.register.done.payout', { name: specialTeacher.display_name, amount: formatCOP(payout, lang) })}</span></div>}
              <div className="row-between register-line small muted"><span>{t('core.common.subtotal')}</span><span>{formatCOP(totals.subtotal, lang)}</span></div>
              <div className="row-between register-line small muted"><span>{t('staff.register.iva', { pct: settings.tax.ivaPct })}{settings.tax.pricesIncludeIva ? ` · ${t('staff.register.iva.included')}` : ''}</span><span>{formatCOP(totals.tax, lang)}</span></div>
              <div className="row-between register-total"><span>{t('staff.register.total')}</span><span>{formatCOP(totals.total, lang)}</span></div>
              <Field label={t('staff.register.paid')} hint={t('staff.register.paid.hint')}>
                {(id) => <Input id={id} inputMode="numeric" value={paidRaw ?? String(totals.total)} onChange={(e) => setPaidRaw(e.target.value)} onFocus={() => setPaidRaw((v) => v ?? String(totals.total))} />}
              </Field>
              {paidDiffers && (
                <>
                  <p className="xs register-diff">{t('staff.register.paid.diff', { amount: formatCOP(amountPaid - totals.total, lang) })}</p>
                  <Field label={t('staff.register.note')} required hint={t('staff.register.note.hint')}>
                    {(id) => <Input id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('staff.register.note.ph')} invalid={!note.trim()} />}
                  </Field>
                </>
              )}
              <Field label={t('staff.register.checkinTo')} hint={settings.features.autoCheckinOnSale ? t('staff.register.checkinTo.hint') : t('staff.register.checkinTo.off')}>
                {(id) => <Select id={id} value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={!settings.features.autoCheckinOnSale || special.on || mode === 'contact'}><option value="">{t('staff.register.checkinTo.none')}</option>{upcoming.map(({ session: s, teacher: te }) => <option key={s.id} value={s.id}>{formatTime(s.starts_at, lang)} · {s.title} · {te?.display_name} ({s.booked_count}/{s.capacity})</option>)}</Select>}
              </Field>
              {error && <EmptyState compact tone="error" title={t('core.common.error')} body={t(`staff.booking.error.${error}`)} />}
              <Button block size="lg" disabled={!valid} loading={busy} onClick={complete} icon={method === 'wompi' ? 'link' : 'payment'}>{method === 'wompi' ? t('staff.register.cta.link') : t('staff.register.cta')}</Button>
              <p className="xs muted">{t('staff.register.audit', { staff: user.name })}</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
