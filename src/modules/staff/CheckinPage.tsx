import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, BookingRow, ClassLedgerRow, ClassSessionRow, PaymentRow } from '../../data/schema';
import { dateKey, formatDate, formatTime, isSameDay, MS } from '../../i18n/format';
import { useLayout } from '../../layout/useLayout';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Badge } from '../../components/atom/Badge/Badge';
import { CapacityMeter } from '../../components/molecule/CapacityMeter/CapacityMeter';
import { RosterRow } from '../../components/molecule/RosterRow/RosterRow';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useSessionsJoined } from '../website/hooks';
import { useSettings } from '../admin/settings';
import { useAudit } from './audit';
import { maskPhone, personMatches, usePeople, type Person } from './people';
import { S02 } from './specs';
import { tenant } from '../../tenant/tenant';
import { approvedPackageRows, packageState } from '../../data/packages';
import { bookWithPackage } from '../../data/deskBooking';
import './staff.css';
import { type Lang } from '../../i18n/types';

interface WaitlistRow extends BaseRow { user_id: string; session_id: string; position: number; status: string }

const MAIN = new Set(['TodayStrip (now / next / later)', 'MemberSearch + CapacityMeter', 'RosterList (expected / checked in / waitlist)']);

/** S-02 — the door board: today's strip, one roster, one search box, one-tap check-in, walk-ins and waitlist promotion. */
export function CheckinPage() {
  const { t, lang } = useI18n();
  const data = useData();
  const { can, user, role } = useSession();
  const audit = useAudit('front_desk');
  const { settings } = useSettings();
  const { sections, isVisible } = useLayout(S02);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const canWrite = can('checkin.write');
  const canBookAny = can('bookings.write_any');

  const allSessions = useSessionsJoined(useCallback((s: ClassSessionRow) => s.status !== 'cancelled', []));
  const todayAll = allSessions.filter(x => isSameDay(x.session.starts_at, new Date()));
  const futureSessions = allSessions.filter(x => x.session.status === 'scheduled' && Date.parse(x.session.starts_at) > Date.now());
  const { rows: ledger } = useTable<ClassLedgerRow>('class_ledger');
  const { rows: payments } = useTable<PaymentRow>('payments');
  const { rows: allBookings } = useTable<BookingRow>('bookings');
  const now = Date.now();
  const autoId = useMemo(() => {
    const live = todayAll.find((x) => new Date(x.session.starts_at).getTime() - 30 * MS.min <= now && new Date(x.session.ends_at).getTime() >= now);
    const next = todayAll.find((x) => new Date(x.session.starts_at).getTime() > now);
    return (live ?? next ?? todayAll[todayAll.length - 1])?.session.id;
  }, [todayAll, now]);
  const wanted = params.get('session');
  const selected = allSessions.find((x) => x.session.id === wanted) ?? todayAll.find((x) => x.session.id === autoId);
  const selectedId = selected?.session.id;

  const { rows: bookings, loading } = useTable<BookingRow>('bookings', { where: { session_id: selectedId ?? '__none__' } });
  const { rows: waitlist } = useTable<WaitlistRow>('waitlist', { where: { session_id: selectedId ?? '__none__', status: 'waiting' } });
  const { people, byId } = usePeople();

  const roster = useMemo(() => bookings.filter((b) => b.status !== 'cancelled').map((b) => ({ b, p: byId.get(b.user_id) })).filter((x) => !x.p || personMatches(x.p, q)), [bookings, byId, q]);
  const expected = roster.filter((x) => x.b.status === 'booked');
  const arrived = roster.filter((x) => x.b.status === 'checked_in');
  const missed = roster.filter((x) => x.b.status === 'no_show' || x.b.status === 'late_cancel');
  const onRoster = useMemo(() => new Set(bookings.filter((b) => b.status !== 'cancelled').map((b) => b.user_id)), [bookings]);
  const walkIns = useMemo(() => (q.trim().length < 2 ? [] : people.filter((p) => p.role === 'customer' && !onRoster.has(p.id) && personMatches(p, q)).slice(0, 6)), [people, onRoster, q]);
  const graceMs = settings.policies.lateGraceMin * MS.min;
  const isLate = (b: BookingRow) => !!selected && !!b.checked_in_at && new Date(b.checked_in_at).getTime() > new Date(selected.session.starts_at).getTime() + graceMs;

  const setStatus = async (b: BookingRow, status: BookingRow['status']) => {
    if (!canWrite) return;
    setBusy(b.id); setError(null);
    try {
      await data.update('bookings', b.id, { status, checked_in_at: status === 'checked_in' ? new Date().toISOString() : null });
      await audit(status === 'checked_in' ? 'booking.checkin' : status === 'no_show' ? 'booking.no_show' : 'booking.undo', 'bookings', b.id, { before: b.status, after: status, session_id: b.session_id, user_id: b.user_id });
    } catch (e) { setError(String(e)); } finally { setBusy(null); }
  };
  const commandError = (error: unknown) => {
    const code = error instanceof Error ? error.message : '';
    const known = ['session_full', 'session_unavailable', 'booking_exists', 'same_day_conflict', 'insufficient_classes', 'package_frozen', 'package_expired', 'disconnected'];
    return t(`staff.checkin.error.${known.includes(code) ? code : 'failed'}`);
  };
  const packageFor = (userId: string) => packageState(approvedPackageRows(ledger.filter(row => row.user_id === userId), payments));
  const unavailable = (userId: string) => {
    if (!selected || selected.session.status !== 'scheduled' || Date.parse(selected.session.starts_at) <= Date.now()) return t('staff.checkin.package.unavailable');
    if (selected.session.booked_count >= selected.session.capacity) return t('core.common.full');
    const state = packageFor(userId);
    if (state.frozen) return t('staff.checkin.package.frozen');
    if (state.balance < 1) return t('staff.checkin.package.empty');
    const atClass = packageState(approvedPackageRows(ledger.filter(row => row.user_id === userId), payments), dateKey(new Date(selected.session.starts_at)));
    if (atClass.balance < 1) return t('staff.checkin.package.expired');
    if (tenant.studio.perPersonPerDay === 1 && allBookings.some(b => b.user_id === userId && b.status !== 'cancelled' && b.status !== 'late_cancel' && allSessions.some(({ session: s }) => s.id === b.session_id && isSameDay(s.starts_at, selected.session.starts_at)))) return t('staff.checkin.error.same_day_conflict');
    return null;
  };
  const packageLabel = (userId: string) => {
    const state = packageFor(userId);
    return `${t('staff.checkin.package.balance', { n: state.balance })}${state.expiresAt ? ` · ${t('staff.checkin.package.expires', { date: formatDate(state.expiresAt, lang) })}` : ''}`;
  };
  const walkIn = async (p: Person, status: 'booked' | 'checked_in' = 'checked_in') => {
    if (!selected || (status === 'booked' ? !canBookAny : !canWrite) || busy) return;
    setBusy(p.id); setError(null);
    try {
      if (!data.atomic) throw new Error('disconnected');
      await data.atomic(async tx => {
        const b = await bookWithPackage(tx, { userId: p.id, sessionId: selected.session.id, status });
        await tx.insert('audit_log', { actor_id: user.id, action: status === 'booked' ? 'booking.create' : 'booking.walkin', entity: 'bookings', entity_id: b.id, ip: null, diff: { role, source: 'front_desk', after: status, session_id: selected.session.id, user_id: p.id } });
      });
      setQ('');
    } catch (e) { setError(commandError(e)); } finally { setBusy(null); }
  };
  const promote = async (w: WaitlistRow) => {
    if (!selected || !canBookAny || busy) return;
    setBusy(w.id); setError(null);
    try {
      if (!data.atomic) throw new Error('disconnected');
      await data.atomic(async tx => {
        const b = await bookWithPackage(tx, { userId: w.user_id, sessionId: selected.session.id, status: 'booked' });
        await tx.update('waitlist', w.id, { status: 'claimed' });
        await tx.insert('audit_log', { actor_id: user.id, action: 'waitlist.promote', entity: 'waitlist', entity_id: w.id, ip: null, diff: { role, source: 'front_desk', booking_id: b.id, session_id: selected.session.id, user_id: w.user_id } });
      });
    } catch (e) { setError(commandError(e)); } finally { setBusy(null); }
  };

  // keyboard: "/" focuses search; Enter checks in the first expected match (or the single walk-in candidate); Esc clears
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setQ(''); return; }
    if (e.key !== 'Enter' || !q.trim()) return;
    if (expected[0]) setStatus(expected[0].b, 'checked_in');
    else if (walkIns.length === 1) walkIn(walkIns[0]);
  };

  const full = !!selected && selected.session.booked_count >= selected.session.capacity;
  const phase = (s: ClassSessionRow) => (new Date(s.ends_at).getTime() < now ? 'past' : new Date(s.starts_at).getTime() - 30 * MS.min <= now ? 'now' : 'next');

  const SECTIONS: Record<string, () => ReactNode> = {
    'TodayStrip (now / next / later)': () => (
      <section className="stack-sm">
        <label className="stack-sm"><span className="small">{t('staff.checkin.future.label')}</span><Select aria-label={t('staff.checkin.future.label')} value={selectedId ?? ''} onChange={e => setParams({ session: e.target.value })}><option value="">{t('staff.checkin.future.choose')}</option>{futureSessions.map(({ session: s }) => <option key={s.id} value={s.id}>{formatDate(s.starts_at, lang)} · {formatTime(s.starts_at, lang)} · {s.title} ({s.booked_count}/{s.capacity})</option>)}</Select></label>
        <p className="xs muted">{t('staff.checkin.package.demo')}</p>
        <div className="row-between wrap"><div className="eyebrow">{t('staff.checkin.today')}</div><span className="xs muted">{t('staff.checkin.strip.hint')}</span></div>
        {todayAll.length === 0 ? <EmptyState compact title={t('staff.checkin.noClasses')} body={t('staff.checkin.noClasses.body')} /> : (
          <div className="checkin-strip" role="tablist" aria-label={t('staff.checkin.today')}>
            {todayAll.map(({ session: s, teacher: te, modality: m }) => {
              const ph = phase(s);
              return (
                <button key={s.id} type="button" role="tab" aria-selected={s.id === selectedId} className={`checkin-strip-item is-${ph} ${s.id === selectedId ? 'is-selected' : ''}`} onClick={() => setParams({ session: s.id })}>
                  <div className="row-between"><strong className="mono">{formatTime(s.starts_at, lang)}</strong><Badge tone={ph === 'now' ? 'success' : ph === 'past' ? 'neutral' : 'primary'}>{t(`staff.checkin.phase.${ph}`)}</Badge></div>
                  <span className="row"><span className={`classrow-dot mv-${m?.tone ?? 'river'}`} aria-hidden /><span className="small">{s.title}</span></span>
                  <span className="xs muted">{te?.display_name} · {s.booked_count}/{s.capacity}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    ),
    'MemberSearch + CapacityMeter': () => selected ? (
      <Card padding="sm" className="checkin-search">
        <div className="row-between wrap">
          <div>
            <div className="row wrap"><h2 className="checkin-title">{selected.session.title}</h2><span className="muted small">{formatTime(selected.session.starts_at, lang)} · {selected.teacher?.display_name}</span>{full && <Badge tone="danger">{t('core.common.full')}</Badge>}</div>
            <div className="xs muted">{t('staff.checkin.arrivals', { n: arrived.length, total: bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'late_cancel').length })} · {t('staff.checkin.grace', { n: settings.policies.lateGraceMin })}</div>
          </div>
          <div className="checkin-cap"><CapacityMeter booked={selected.session.booked_count} capacity={selected.session.capacity} /></div>
        </div>
        <div className="row wrap checkin-searchrow">
          <Input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onSearchKey} placeholder={t('staff.checkin.search.ph')} aria-label={t('core.common.search')} autoFocus />
          <kbd className="checkin-kbd" title={t('staff.checkin.kbd')}>/</kbd>
          {q && <Button size="sm" variant="ghost" onClick={() => setQ('')}>{t('core.common.cancel')}</Button>}
        </div>
        {!canWrite && <p className="xs muted">{t('staff.checkin.readonly')}</p>}
      </Card>
    ) : null,
    'RosterList (expected / checked in / waitlist)': () => selected ? (
      <div className="stack">
        {error && <EmptyState compact tone="error" title={t('core.common.error')} body={error} action={<Button size="sm" variant="secondary" onClick={() => setError(null)}>{t('core.common.retry')}</Button>} />}
        {loading && bookings.length === 0 && <EmptyState compact tone="loading" title={t('core.common.loading')} />}
        {!loading && roster.length === 0 && waitlist.length === 0 && <EmptyState compact title={q ? t('staff.checkin.noMatch') : t('staff.checkin.emptyRoster')} body={q ? t('staff.checkin.noMatch.body') : undefined} />}
        <Group title={t('staff.checkin.expected')} n={expected.length}>
          {expected.map(({ b, p }) => <RosterRow key={b.id} name={p?.name ?? b.user_id} initials={p?.initials} phone={maskPhone(p?.phone)} plan={planLabel(p, b, lang, t)} status="booked" showStatus={false} flag={p?.notes ?? undefined}
            actions={canWrite && <><Button size="sm" variant="tonal" loading={busy === b.id} onClick={() => setStatus(b, 'checked_in')} icon="check">{t('staff.checkin.checkin')}</Button><Button size="sm" variant="outline" onClick={() => setStatus(b, 'no_show')} icon="user-x">{t('staff.checkin.noShow')}</Button></>} />)}
        </Group>
        <Group title={t('staff.checkin.arrived')} n={arrived.length}>
          {arrived.map(({ b, p }) => <RosterRow key={b.id} name={p?.name ?? b.user_id} initials={p?.initials} phone={maskPhone(p?.phone)} plan={planLabel(p, b, lang, t)} status="checked_in" late={isLate(b)} time={b.checked_in_at ? formatTime(b.checked_in_at, lang) : undefined} flag={p?.notes ?? undefined}
            actions={canWrite && <Button size="sm" variant="outline" onClick={() => setStatus(b, 'booked')} icon="undo">{t('staff.checkin.undo')}</Button>} />)}
        </Group>
        {missed.length > 0 && <Group title={t('staff.checkin.missed')} n={missed.length}>
          {missed.map(({ b, p }) => <RosterRow key={b.id} name={p?.name ?? b.user_id} initials={p?.initials} plan={planLabel(p, b, lang, t)} status={b.status as 'no_show' | 'late_cancel'}
            actions={canWrite && b.status === 'no_show' && <Button size="sm" variant="tonal" onClick={() => setStatus(b, 'checked_in')} icon="check">{t('staff.checkin.checkin')}</Button>} />)}
        </Group>}
        {waitlist.length > 0 && <Group title={t('core.common.waitlist')} n={waitlist.length}>
          {waitlist.sort((a, b) => a.position - b.position).map((w) => { const p = byId.get(w.user_id); return <RosterRow key={w.id} name={p?.name ?? w.user_id} initials={p?.initials} phone={maskPhone(p?.phone)} plan={`${packageLabel(w.user_id)}${unavailable(w.user_id) ? ` · ${unavailable(w.user_id)}` : ''}`} status="waiting" showStatus={false} time={`#${w.position}`}
            actions={canBookAny && <Button size="sm" variant="tonal" disabled={!!unavailable(w.user_id) || !!busy} loading={busy === w.id} title={unavailable(w.user_id) ?? undefined} onClick={() => promote(w)} icon="promote">{t('staff.checkin.promote')}</Button>} />; })}
        </Group>}
      </div>
    ) : null,
    'TeachersInToday': () => (
      <Card title={t('staff.checkin.teachers')} padding="sm">
        {todayAll.length === 0 && <p className="small muted" style={{ padding: 'var(--sp-sm)' }}>—</p>}
        {[...new Map(todayAll.map((x) => [x.teacher?.id ?? x.session.teacher_id, x])).values()].map(({ session: s, teacher: te }) => (
          <div key={s.id} className="row-between checkin-teacher">
            <span className="small">{te?.display_name ?? s.teacher_id}</span>
            <span className="row"><span className="xs muted mono">{formatTime(s.starts_at, lang)}</span><Badge tone={new Date(s.starts_at).getTime() - 15 * MS.min <= now ? 'success' : 'neutral'}>{new Date(s.starts_at).getTime() - 15 * MS.min <= now ? t('staff.checkin.teacher.arrived') : t('staff.checkin.teacher.expected')}</Badge></span>
          </div>
        ))}
      </Card>
    ),
    'QuickSell (walk-in)': () => (
      <Card title={t('staff.checkin.walkin')} padding="sm">
        <div className="stack-sm" style={{ padding: 'var(--sp-xs)' }}>
          <p className="xs muted">{t('staff.checkin.walkin.body')}</p>
          {q.trim().length >= 2 && walkIns.length === 0 && <p className="small muted">{t('staff.checkin.walkin.none')}</p>}
          {walkIns.map((p) => <div key={p.id} className="stack-sm">
            <RosterRow name={p.name} initials={p.initials} phone={maskPhone(p.phone)} status="booked" showStatus={false} />
            <p className="xs muted">{packageLabel(p.id)}</p>
            {unavailable(p.id) && <p className="xs" role="status">{unavailable(p.id)}</p>}
            {selected && <div className="row wrap">{canBookAny && <Button variant="outline" disabled={!!unavailable(p.id) || !!busy} loading={busy === p.id} title={unavailable(p.id) ?? undefined} onClick={() => walkIn(p, 'booked')} icon="user-plus">{t('staff.checkin.package.book')}</Button>}{canWrite && <Button variant="tonal" disabled={!!unavailable(p.id) || !!busy} loading={busy === p.id} title={unavailable(p.id) ?? undefined} onClick={() => walkIn(p)} icon="check">{t('staff.checkin.walkin.add')}</Button>}</div>}
          </div>)}
          {can('payments.write') && <Link to={`/staff/register${selectedId ? `?session=${selectedId}` : ''}`}><Button block variant={walkIns.length ? 'ghost' : 'primary'} size="sm" icon="user-plus">{t('staff.checkin.walkin.register')}</Button></Link>}
        </div>
      </Card>
    ),
  };

  const visible = sections.filter(isVisible).filter((s) => SECTIONS[s]);
  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('staff.checkin.title')}</h1><p className="muted small">{t('staff.checkin.subtitle')}</p></div></div>
      <div className="checkin">
        <div className="checkin-main">{visible.filter((s) => MAIN.has(s)).map((s) => <Fragment key={s}>{SECTIONS[s]()}</Fragment>)}</div>
        <aside className="checkin-side">{visible.filter((s) => !MAIN.has(s)).map((s) => <Fragment key={s}>{SECTIONS[s]()}</Fragment>)}</aside>
      </div>
    </div>
  );
}

/** The roster's plan line: the person's package name, else how the booking was paid, translated (0051, was the raw value). */
function planLabel(p: Person | undefined, b: BookingRow, lang: Lang, t: (key: string) => string) {
  if (p?.plan) return lang === 'en' ? p.plan.name_en : p.plan.name_es;
  return b.paid_with ? t(`customer.paidWith.${b.paid_with}`) : '';
}

function Group({ title, n, children }: { title: string; n: number; children: ReactNode }) {
  if (n === 0) return null;
  return (
    <section className="checkin-group">
      <div className="row-between checkin-grouphead"><span className="eyebrow">{title}</span><span className="xs muted mono">{n}</span></div>
      <Card padding="none">{children}</Card>
    </section>
  );
}
