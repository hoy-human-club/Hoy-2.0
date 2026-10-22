import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { rateFor } from '../../data/payrollCalc';
import { useSettings } from '../admin/settings';
import { useData, useTable } from '../../data/DataContext';
import type { BookingRow, ClassSessionRow, RoomRow, SpaceBookingRow, SpecialChargeRow } from '../../data/schema';
import { formatCOP, formatDate, formatTime, isSameDay, MS, addDays, dateKey } from '../../i18n/format';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Badge } from '../../components/atom/Badge/Badge';
import { ClassRow } from '../../components/molecule/ClassRow/ClassRow';
import { ClassCard } from '../../components/organism/ClassCard/ClassCard';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useSessionsJoined } from '../website/hooks';
import { useSession } from '../../auth/SessionProvider';
import { Notice } from '../../components/molecule/Notice/Notice';
import { useSubstituteRequest } from './useSubstituteRequest';
import { KIND_LABEL, STATUS_LABEL } from '../staff/rooms';
import { useTeacherSelf } from './useTeacherSelf';
import { useStudioStats, useTeacherStats } from '../../data/useAnalytics';
import './teacher.css';

/** S-03 Teacher home: next class, today's rosters, the week, substitution request and the payroll estimate. */
export function TeacherHomePage() {
  const { t, lang, bi } = useI18n();
  const { settings: homeSettings } = useSettings();
  const nav = useNavigate();
  const data = useData();
  const {user,role}=useSession();
  const { me, linked, teachers, choose,canChoose } = useTeacherSelf();
  const now = new Date();
  const weekEnd = addDays(now, 7);
  const meId = me?.id;
  const mine = useSessionsJoined(useCallback((s: ClassSessionRow) => !!meId && s.teacher_id === meId && new Date(s.ends_at) >= new Date(Date.now() - MS.day * 7) && new Date(s.starts_at) <= weekEnd, [meId, weekEnd.getTime()]));
  const upcoming = mine.filter((x) => x.session.status === 'scheduled' && new Date(x.session.ends_at) >= now);
  const today = mine.filter((x) => isSameDay(x.session.starts_at, now) && x.session.status !== 'cancelled');
  const week = upcoming.filter((x) => !isSameDay(x.session.starts_at, now));
  const next = upcoming[0];
  const todayIds = useMemo(() => today.map((x) => x.session.id), [today]);
  const { rows: bookings } = useTable<BookingRow>('bookings', { where: { session_id: todayIds } });
  const arrived = (id: string) => bookings.filter((b) => b.session_id === id && b.status === 'checked_in').length;
  const monthTaught = mine.filter((x) => x.session.status === 'completed' && dateKey(new Date(x.session.starts_at)).slice(0, 7) === dateKey(now).slice(0, 7)).length;
  // Especiales (0017): rooms booked with this teacher outside the timetable, last 7 days and ahead.
  const { rows: mySpace } = useTable<SpaceBookingRow>('space_bookings', meId ? { where: { teacher_id: meId }, orderBy: { column: 'starts_at' } } : { limit: 0 });
  const { rows: mySpecials } = useTable<SpecialChargeRow>('special_charges', meId ? { where: { teacher_id: meId } } : { limit: 0 });
  const { rows: rooms } = useTable<RoomRow>('rooms');
  const roomName = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);
  const payoutOf = useMemo(() => new Map(mySpecials.filter((s) => s.space_booking_id).map((s) => [s.space_booking_id as string, s.teacher_payout])), [mySpecials]);
  const specials = mySpace.filter((b) => b.status !== 'cancelled' && new Date(b.ends_at) >= new Date(Date.now() - MS.day * 7));
  const sub=useSubstituteRequest(data,{userId:user.id,role,name:user.name},me?.id);

  return (
    <div className="container page stack teach">
      <div className="row-between wrap">
        <h1 className="teach-h1">{t('teacher.home.title')}</h1>
        {me && <span className="small muted">{me.display_name}</span>}
      </div>
      {!linked && canChoose && (
        <Card tone="muted">
          <p className="small muted" style={{ marginBottom: 'var(--sp-sm)' }}>{t('teacher.home.notLinked')}</p>
          <Field label={t('teacher.home.viewAs')}>{(id) => <Select id={id} value={me?.id ?? ''} onChange={(e) => choose(e.target.value || null)}><option value="">—</option>{teachers.map((x) => <option key={x.id} value={x.id}>{x.display_name}</option>)}</Select>}</Field>
        </Card>
      )}
      {!me&&!canChoose&&<EmptyState tone="error" title={t('teacher.access.unlinked')}/>}
      {me && (
        <>
          <section className="stack-sm">
            <div className="eyebrow">{t('teacher.home.next')}</div>
            {next
              ? <ClassCard variant="next" title={next.session.title} teacher={`${next.session.booked_count}/${next.session.capacity} · ${t('teacher.home.arrived', { n: arrived(next.session.id) })}`} startsAt={next.session.starts_at} endsAt={next.session.ends_at} tone={next.modality?.tone ?? 'river'} booked={next.session.booked_count} capacity={next.session.capacity} cta={{ label: t('teacher.home.openRoster'), onClick: () => nav(`/teach/class/${next.session.id}`) }} />
              : <EmptyState compact title={t('teacher.home.noNext')} body={t('teacher.home.noNext.body')} />}
          </section>

          <div className="grid grid-3">
            <StatTile label={t('teacher.home.today')} value={today.length} />
            <StatTile label={t('teacher.home.taughtMonth')} value={monthTaught} />
            <StatTile label={t('teacher.home.payroll')} value={formatCOP(monthTaught * rateFor(me.id, (me.specialties as string[] | undefined)?.[0] ?? null, [me], homeSettings.payroll.rateCard), lang)} hint={t('teacher.home.payroll.hint')} />
          </div>

          <MyNumbers teacherId={me.id} />

          <section className="stack-sm">
            <div className="row-between"><div className="eyebrow">{t('core.common.today')}</div><span className="xs muted">{formatDate(now.toISOString(), lang)}</span></div>
            <Card padding="sm">
              {today.length === 0 && <p className="muted small" style={{ padding: 'var(--sp-md)' }}>{t('teacher.home.emptyToday')}</p>}
              {today.map(({ session: s, modality: m }) => (
                <div key={s.id} className="teach-todayrow">
                  <ClassRow title={s.title} teacher={t('teacher.home.arrivedOf', { n: arrived(s.id), total: s.booked_count })} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} tone={m?.tone ?? 'river'} booked={s.booked_count} capacity={s.capacity} status={s.status} onClick={() => nav(`/teach/class/${s.id}`)} />
                </div>
              ))}
            </Card>
          </section>

          <section className="stack-sm">
            <div className="eyebrow">{t('teacher.home.specials')}</div>
            <Card padding="sm">
              {specials.length === 0 && <p className="muted small" style={{ padding: 'var(--sp-md)' }}>{t('teacher.home.specials.empty')}</p>}
              {specials.map((b) => {
                const payout = payoutOf.get(b.id);
                return (
                  <div key={b.id} className="teach-payline">
                    <span className="grow">
                      <span className="row wrap"><strong className="small">{b.title}</strong><Badge tone={b.status === 'done' ? 'success' : b.status === 'held' ? 'warn' : 'primary'}>{bi(STATUS_LABEL[b.status])}</Badge></span>
                      <span className="xs muted">{formatDate(b.starts_at, lang)} · {formatTime(b.starts_at, lang)}–{formatTime(b.ends_at, lang)} · {roomName.get(b.room_id)} · {bi(KIND_LABEL[b.kind])}</span>
                    </span>
                    <span className="xs mono">{payout ? t('teacher.home.specials.payout', { amount: formatCOP(payout, lang) }) : t('teacher.home.specials.unpaid')}</span>
                  </div>
                );
              })}
            </Card>
            <p className="xs muted">{t('teacher.home.specials.hint')}</p>
          </section>

          <section className="stack-sm">
            <div className="row-between"><div className="eyebrow">{t('teacher.home.week')}</div><Button size="sm" variant="ghost" onClick={sub.openDrawer}>{t('teacher.home.sub')}</Button></div>
            <Card padding="sm">
              {week.length === 0 && <p className="muted small" style={{ padding: 'var(--sp-md)' }}>{t('teacher.home.empty')}</p>}
              {week.map(({ session: s, modality: m }) => <ClassRow key={s.id} title={s.title} teacher={formatDate(s.starts_at, lang, { weekday: 'long', day: 'numeric' })} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} tone={m?.tone ?? 'river'} booked={s.booked_count} capacity={s.capacity} status={s.status} onClick={() => nav(`/teach/class/${s.id}`)} />)}
            </Card>
          </section>
        </>
      )}

      <Drawer open={sub.open} onClose={sub.close} side="bottom" title={t('teacher.home.sub')}>
        {sub.sent ? <EmptyState compact title={t('teacher.home.sub.sent')} body={t('teacher.home.sub.sent.body')} action={<Button size="sm" onClick={sub.close}>{t('core.common.close')}</Button>} /> : (
          <div className="stack-sm">
            <Notice>{t('teacher.home.sub.body')}</Notice>
            {sub.load==='loading'&&<Notice>{t('teacher.home.sub.loading')}</Notice>}
            {sub.load==='error'&&<Notice tone="danger">{t('teacher.home.sub.readError')} <Button variant="ghost" onClick={sub.retry}>{t('teacher.home.sub.retry')}</Button></Notice>}
            {sub.load==='ready'&&sub.choices.length===0&&<Notice>{t('teacher.home.sub.empty')}</Notice>}
            {sub.error&&<Notice tone="danger">{t('teacher.home.sub.error')}</Notice>}
            <Field label={t('teacher.home.sub.class')}>{(id) => <Select id={id} disabled={sub.busy||sub.load!=='ready'} value={sub.session} onChange={(e) => sub.change({session:e.target.value})}>{sub.choices.map((s) => <option key={s.id} value={s.id}>{formatDate(s.starts_at, lang)} {formatTime(s.starts_at, lang)} · {s.title}</option>)}</Select>}</Field>
            <Field label={t('teacher.home.sub.reason')}>{(id) => <textarea id={id} className="input" rows={3} disabled={sub.busy||sub.load!=='ready'} value={sub.reason} onChange={(e) => sub.change({reason:e.target.value})} />}</Field>
            <div className="row"><Badge tone="warn">{t('teacher.home.sub.rule')}</Badge></div>
            <Button block loading={sub.busy} disabled={sub.load!=='ready'||!sub.session||!sub.reason.trim()} onClick={()=>void sub.send()} icon="send">{t('teacher.home.sub.send')}</Button>
            <Button variant="ghost" onClick={sub.close}>{t('core.common.cancel')}</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}

/** Reviews below this count show no average (research §3: min n = 5 before a rating means anything). */
const MIN_REVIEWS = 5;

/**
 * S-03 "Mis números · 30 días": the teacher's own numbers from teacherStats() next to the studio average
 * from studioStats(). Never a list or ranking of colleagues — that table lives only in M-12 for staff.
 */
function MyNumbers({ teacherId }: { teacherId: string }) {
  const { t, lang } = useI18n();
  const me = useTeacherStats(teacherId, 30);
  const studio = useStudioStats(30);
  const nf = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-CO', { maximumFractionDigits: 1 });
  const studioAvg = studio.classesHeld ? Math.round((studio.seatsAttended / studio.classesHeld) * 10) / 10 : 0;
  const ret = me.firstTimerReturn;
  return (
    <section className="stack-sm" aria-labelledby="teach-numbers">
      <div className="row-between wrap">
        <div className="eyebrow" id="teach-numbers">{t('teacher.numbers.title')}</div>
        <span className="xs muted">{me.classesTaught === 1 ? t('teacher.numbers.classes.one') : t('teacher.numbers.classes', { n: me.classesTaught })}</span>
      </div>
      <div className="grid grid-3">
        <StatTile label={t('teacher.numbers.fill')} value={`${me.fillRate}%`} hint={t('teacher.numbers.fill.hint', { n: studio.fillRate })} />
        <StatTile label={t('teacher.numbers.avg')} value={t('teacher.numbers.avg.value', { n: nf.format(me.avgAttendance) })} hint={t('teacher.numbers.avg.hint', { n: nf.format(studioAvg) })} />
        <StatTile label={t('teacher.numbers.noShow')} value={`${me.noShowRate}%`} hint={t('teacher.numbers.noShow.hint', { n: studio.noShowRate })} />
        <StatTile label={t('teacher.numbers.newFaces')} value={me.newFaces} hint={t('teacher.numbers.newFaces.hint')} />
        <StatTile label={t('teacher.numbers.regulars')} value={me.regulars} hint={t('teacher.numbers.regulars.hint')} />
        <StatTile label={t('teacher.numbers.return')} value={ret.n ? `${ret.rate}%` : '—'} hint={ret.n ? t('teacher.numbers.return.hint', { returned: ret.returned, n: ret.n }) : t('teacher.numbers.return.none')} />
        <StatTile label={t('teacher.numbers.rating')} value={me.ratingCount >= MIN_REVIEWS && me.ratingAvg != null ? `${nf.format(me.ratingAvg)} / 5` : '—'} hint={me.ratingCount >= MIN_REVIEWS ? t('teacher.numbers.rating.hint', { n: me.ratingCount }) : t('teacher.numbers.rating.few', { n: me.ratingCount })} />
      </div>
      <p className="xs muted">{t('teacher.numbers.private')}</p>
    </section>
  );
}
