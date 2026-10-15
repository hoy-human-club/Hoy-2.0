// Proves the practice analytics: the weekly streak rules (research §5), session-dated month counts, week boundaries
// in America/Bogota, the goal suggestion and the studio arithmetic — then checks the seeded demo member's facts.
// Run: npm run test:analytics   (esbuild bundles the TS source into a scratch file, like test-mat-bookings.mjs)
process.env.TZ = 'America/Bogota';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); if (!ok) failed++; };

const scratch = await mkdtemp(join(tmpdir(), 'hoy-analytics-'));
try {
  const bundle = async (entry, name) => {
    const file = join(scratch, name);
    await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: file, define: { 'import.meta.env.BASE_URL': '"/"' }, logLevel: 'silent' });
    return import(pathToFileURL(file));
  };
  const A = await bundle('src/data/analytics.ts', 'analytics.mjs');
  const { practiceStats, weekStartKey, suggestGoal, studioStats, atRiskBand, DEFAULT_TARGET, MILESTONES } = A;

  // ---- fixtures: a tiny world with a session on any local date/time we ask for ----
  const NOW = new Date(2026, 8, 30, 10, 0, 0); // Wednesday 30 Sep 2026, 10:00 Bogotá
  const CURRENT_WEEK = '2026-09-28';
  let n = 0;
  const world = () => {
    const sessions = [], bookings = [];
    const session = (localDate, { teacher = 'tea_a', modality = 'mod_a', capacity = 10, status } = {}) => {
      const starts = new Date(localDate), ends = new Date(starts.getTime() + 60 * 60000);
      const s = { id: `s${n++}`, tenant_id: 't', created_at: starts.toISOString(), updated_at: starts.toISOString(), template_id: null, title: 'x', modality_id: modality, teacher_id: teacher, room_id: 'r', starts_at: starts.toISOString(), ends_at: ends.toISOString(), capacity, booked_count: 0, level: 'all', status: status ?? (ends < NOW ? 'completed' : 'scheduled'), cancel_reason: null };
      sessions.push(s); return s;
    };
    const book = (user, s, status = 'checked_in', createdAt = s.starts_at) => { const b = { id: `b${n++}`, tenant_id: 't', created_at: createdAt, updated_at: createdAt, user_id: user, session_id: s.id, status, paid_with: 'membership', ledger_id: null, checked_in_at: status === 'checked_in' ? s.starts_at : null, cancelled_at: null, rated: false }; bookings.push(b); return b; };
    /** Attend `count` classes in the week starting `weekKey` (Tue, Thu, Sat…). */
    const attendWeek = (user, weekKey, count) => { const [y, m, d] = weekKey.split('-').map(Number); for (let i = 0; i < count; i++) book(user, session(new Date(y, m - 1, d + 1 + i * 2, 8, 0))); };
    return { sessions, bookings, session, book, attendWeek };
  };
  const goal = (target) => ({ id: 'g', tenant_id: 't', created_at: '', updated_at: '', user_id: 'u', cadence: 'week', target, source: 'member', starts_on: '2026-08-01', active: true, note: null });
  const weeksBack = (k) => { const [y, m, d] = CURRENT_WEEK.split('-').map(Number); const dt = new Date(y, m - 1, d - 7 * k, 12); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; };

  // (a) 5 met weeks + current week in progress → count 5, alive
  {
    const w = world();
    for (let k = 5; k >= 1; k--) w.attendWeek('u', weeksBack(k), 2);
    w.book('u', w.session(new Date(2026, 8, 29, 8, 0))); // one class this week so far (not met at target 2)
    const st = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goal: goal(2), now: NOW });
    check('(a) five met weeks + current in progress → count 5, alive', st.streak.count === 5 && st.streak.state === 'alive' && st.streak.best === 5, JSON.stringify(st.streak));
    check('(a) this week 1 of 2, remaining 1, Mon..Sun days', st.thisWeek.attended === 1 && st.thisWeek.remaining === 1 && st.thisWeek.days.length === 7 && st.thisWeek.days[0].date === CURRENT_WEEK && st.thisWeek.days[1].attended && st.thisWeek.days[2].isToday);
    check('(a) weeks[] has 12 entries, current last', st.weeks.length === 12 && st.weeks[11].isCurrent && st.weeks[11].start === CURRENT_WEEK && st.weeks[6].met);
    check('(a) grace still available', st.streak.graceAvailable === true);
  }
  // (b) a single missed week between met weeks with prior attendance → saved, streak continues
  {
    const w = world();
    w.attendWeek('u', weeksBack(6), 2); w.attendWeek('u', weeksBack(5), 2);
    w.attendWeek('u', weeksBack(4), 1); // missed (1 < 2)
    w.attendWeek('u', weeksBack(3), 2); w.attendWeek('u', weeksBack(2), 2); w.attendWeek('u', weeksBack(1), 2);
    const st = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goal: goal(2), now: NOW });
    check('(b) one missed week is saved and does not add', st.streak.count === 5 && st.streak.savedWeeks.length === 1 && st.streak.savedWeeks[0] === weeksBack(4) && st.streak.state === 'alive', JSON.stringify(st.streak));
    check('(b) the saved week is flagged in weeks[]', st.weeks.find((x) => x.start === weeksBack(4))?.saved === true && st.weeks.find((x) => x.start === weeksBack(4))?.attended === 1);
    check('(b) grace available again (saved week is 4 weeks back)', st.streak.graceAvailable === true);
  }
  // (b2) a saved week in the last 3 weeks uses up the grace
  {
    const w = world();
    w.attendWeek('u', weeksBack(4), 2); w.attendWeek('u', weeksBack(3), 2); w.attendWeek('u', weeksBack(1), 2); // weeksBack(2) missed → saved
    const st = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goal: goal(2), now: NOW });
    check('(b2) recent saved week → count 3, grace used', st.streak.count === 3 && st.streak.savedWeeks[0] === weeksBack(2) && st.streak.graceAvailable === false, JSON.stringify(st.streak));
  }
  // (c) two missed weeks → reset, broken
  {
    const w = world();
    w.attendWeek('u', weeksBack(5), 2); w.attendWeek('u', weeksBack(4), 2); w.attendWeek('u', weeksBack(3), 2); // 3-week run, then two misses
    const st = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goal: goal(2), now: NOW });
    check('(c) two missed weeks reset the run → count 0, broken, best 3', st.streak.count === 0 && st.streak.state === 'broken' && st.streak.best === 3, JSON.stringify(st.streak));
    w.book('u', w.session(new Date(2026, 8, 29, 8, 0)));
    const st2 = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goal: goal(2), now: NOW });
    check('(c) one class this week after a break → building', st2.streak.state === 'building', st2.streak.state);
  }
  // (c2) at_risk on Saturday when the current week is not met
  {
    const w = world();
    w.attendWeek('u', weeksBack(2), 2); w.attendWeek('u', weeksBack(1), 2);
    const sat = new Date(2026, 9, 3, 9, 0); // Saturday 3 Oct, same week
    const st = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goal: goal(2), now: sat });
    check('(c2) Saturday, week not met, count > 0 → at_risk', st.streak.state === 'at_risk' && st.streak.count === 2, JSON.stringify(st.streak));
  }
  // (c3) a paused week is skipped
  {
    const w = world();
    w.attendWeek('u', weeksBack(3), 2); w.attendWeek('u', weeksBack(1), 2); // weeksBack(2) paused
    const pausedFrom = new Date(2026, 8, 13, 9); // Sunday before the paused week
    const memberships = [{ id: 'm', tenant_id: 't', created_at: pausedFrom.toISOString(), updated_at: pausedFrom.toISOString(), user_id: 'u', plan_id: 'p', status: 'paused', starts_at: '2026-08-01', renews_at: null, ends_at: null, paused_until: '2026-09-21' }];
    const st = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goal: goal(2), memberships, now: NOW });
    check('(c3) paused week neither counts nor breaks → count 2, no saved week', st.streak.count === 2 && st.streak.savedWeeks.length === 0 && st.weeks.find((x) => x.start === weeksBack(2))?.paused === true, JSON.stringify(st.streak));
  }
  // (d) target 0 → state none
  {
    const w = world();
    for (let k = 4; k >= 1; k--) w.attendWeek('u', weeksBack(k), 3);
    const st = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goal: null, now: NOW });
    check('(d) no goal → state none, count 0, weeks still counted', st.streak.state === 'none' && st.streak.count === 0 && !st.hasGoal && st.weeks.find((x) => x.start === weeksBack(2))?.attended === 3 && st.attendedAllTime === 12);
    const st0 = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goal: goal(0), now: NOW });
    check('(d) goal with target 0 behaves as no goal', st0.streak.state === 'none' && st0.target === 0);
  }
  // (e) attendedThisMonth uses the session date, not the booking created_at
  {
    const w = world();
    const s = w.session(new Date(2026, 8, 2, 8, 0)); // 2 Sep session
    w.book('u', s, 'checked_in', new Date(2026, 7, 25, 10, 0).toISOString()); // booked in August
    const aug = w.session(new Date(2026, 7, 28, 8, 0)); w.book('u', aug, 'checked_in', new Date(2026, 8, 1, 10, 0).toISOString()); // August session booked (oddly) in September
    const st = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goal: goal(2), now: NOW });
    check('(e) attendedThisMonth counts the September session, not the September booking', st.attendedThisMonth === 1 && st.minutesThisMonth === 60, `${st.attendedThisMonth} / ${st.minutesThisMonth} min`);
    check('(e) first/last visit and days since', st.firstVisit === '2026-08-28' && st.lastVisit === '2026-09-02' && st.daysSinceLastVisit === 28);
  }
  // (f) week boundaries at Sunday 23:30 local vs Monday 00:30 local
  {
    check('(f) Sunday 23:30 local belongs to the week of Mon 21 Sep', weekStartKey(new Date(2026, 8, 27, 23, 30)) === '2026-09-21', weekStartKey(new Date(2026, 8, 27, 23, 30)));
    check('(f) Monday 00:30 local starts the week of Mon 28 Sep', weekStartKey(new Date(2026, 8, 28, 0, 30)) === '2026-09-28', weekStartKey(new Date(2026, 8, 28, 0, 30)));
    check('(f) an ISO string in UTC (Mon 04:30Z = Sun 23:30 Bogotá) still lands on Sunday’s week', weekStartKey('2026-09-28T04:30:00.000Z') === '2026-09-21', weekStartKey('2026-09-28T04:30:00.000Z'));
    check('(f) a date key resolves at local noon', weekStartKey('2026-09-27') === '2026-09-21');
    const w = world();
    w.book('u', w.session(new Date(2026, 8, 27, 23, 30)), 'checked_in'); // Sunday night (session in the past relative to NOW)
    w.book('u', w.session(new Date(2026, 8, 28, 0, 30)), 'checked_in'); // Monday small hours
    const st = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goal: goal(1), now: NOW });
    check('(f) the two visits fall in different weeks', st.weeks.find((x) => x.start === '2026-09-21')?.attended === 1 && st.weeks.find((x) => x.start === '2026-09-28')?.attended === 1);
  }
  // (g) suggestGoal with < 2 weeks history → default 2; with history → median clamped 1–4
  {
    const w = world();
    check('(g) no history → default', suggestGoal(w.bookings, w.sessions, NOW).target === DEFAULT_TARGET && suggestGoal(w.bookings, w.sessions, NOW).basis === 'default');
    w.attendWeek('u', weeksBack(1), 3);
    check('(g) one full week → still default', suggestGoal(w.bookings, w.sessions, NOW).basis === 'default');
    const w2 = world();
    for (let k = 6; k >= 1; k--) w2.attendWeek('u', weeksBack(k), k % 2 ? 3 : 1); // 1,3,1,3,1,3 → median 2
    const s2 = suggestGoal(w2.bookings, w2.sessions, NOW);
    check('(g) six weeks 1/3 alternating → median 2 from history', s2.target === 2 && s2.basis === 'history', JSON.stringify(s2));
    const w3 = world();
    for (let k = 3; k >= 1; k--) w3.attendWeek('u', weeksBack(k), 6);
    check('(g) heavy history clamps to 4', suggestGoal(w3.bookings, w3.sessions, NOW).target === 4);
    const st = practiceStats({ userId: 'u', bookings: w2.bookings, sessions: w2.sessions, goal: null, now: NOW });
    check('(g) practiceStats.suggestedTarget agrees', st.suggestedTarget === 2);
  }
  // milestones
  {
    const w = world();
    for (let k = 5; k >= 1; k--) w.attendWeek('u', weeksBack(k), 2);
    w.book('u', w.session(new Date(2026, 8, 29, 8, 0)));
    const st = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goal: goal(2), now: NOW });
    check('milestones: 11 visits → 1, 5, 10 reached, next 25 in 14', JSON.stringify(st.milestonesReached) === '[1,5,10]' && st.nextMilestone?.at === 25 && st.nextMilestone.remaining === 14 && st.milestoneDates[2].on === weeksBack(1).replace(/\d+$/, (d) => String(Number(d) + 3)), JSON.stringify({ r: st.milestonesReached, d: st.milestoneDates }));
    check('MILESTONES ladder', JSON.stringify([...MILESTONES]) === '[1,5,10,25,50,100,250]');
  }
  // (h) studioStats fillRate / attendanceRate on a tiny fixture
  {
    const w = world();
    const s1 = w.session(new Date(2026, 8, 28, 8, 0), { capacity: 10, teacher: 'tea_a', modality: 'mod_a' });
    const s2 = w.session(new Date(2026, 8, 29, 8, 0), { capacity: 10, teacher: 'tea_b', modality: 'mod_b' });
    ['u1', 'u2', 'u3', 'u4'].forEach((u) => w.book(u, s1, 'checked_in'));
    w.book('u5', s1, 'no_show'); w.book('u6', s1, 'late_cancel'); w.book('u7', s1, 'cancelled');
    ['u1', 'u2', 'u8'].forEach((u) => w.book(u, s2, 'checked_in'));
    w.book('u9', s2, 'no_show'); w.book('u10', s2, 'booked');
    const teachers = [{ id: 'tea_a', display_name: 'A' }, { id: 'tea_b', display_name: 'B' }];
    const modalities = [{ id: 'mod_a', name_es: 'A', name_en: 'A' }, { id: 'mod_b', name_es: 'B', name_en: 'B' }];
    const st = studioStats({ bookings: w.bookings, sessions: w.sessions, memberships: [], profiles: [], ledger: [], goals: [], teachers, modalities, now: NOW, rangeDays: 7 });
    // seats taken: s1 → 4 checked in + 1 no-show = 5; s2 → 3 + 1 + 1 booked = 5 → 10 of 20 = 50 %; attended 7 of 10 = 70 %; no-shows 2 of 10 = 20 %; late cancels 1 of 11 = 9 %
    check('(h) classesHeld 2, seatsOffered 20, seatsBooked 10, seatsAttended 7', st.classesHeld === 2 && st.seatsOffered === 20 && st.seatsBooked === 10 && st.seatsAttended === 7, JSON.stringify({ c: st.classesHeld, o: st.seatsOffered, b: st.seatsBooked, a: st.seatsAttended }));
    check('(h) fillRate 50, attendanceRate 70, noShowRate 20, lateCancelRate 9', st.fillRate === 50 && st.attendanceRate === 70 && st.noShowRate === 20 && st.lateCancelRate === 9, JSON.stringify({ f: st.fillRate, a: st.attendanceRate, n: st.noShowRate, l: st.lateCancelRate }));
    check('(h) activeMembers 5, all new in range', st.activeMembers === 5 && st.newMembers === 5 && st.returningMembers === 0);
    check('(h) byTeacher / byModality / heatmap', st.byTeacher.length === 2 && st.byTeacher[0].id === 'tea_a' && st.byTeacher[0].fill === 50 && st.byTeacher[0].noShowRate === 20 && st.byModality.length === 2 && st.heatmap.length === 2 && st.heatmap[0].weekday === 1 && st.heatmap[0].hour === 8 && st.heatmap[0].fill === 50, JSON.stringify(st.heatmap));
    const empty = studioStats({ bookings: [], sessions: [], memberships: [], profiles: [], ledger: [], goals: [], teachers, modalities, now: NOW, rangeDays: 30 });
    check('(h) empty range → every rate 0, no division by zero', empty.fillRate === 0 && empty.attendanceRate === 0 && empty.visitsPerActiveMemberPerWeek === 0 && empty.secondVisitConversion.rate === 0);
  }
  // (i) atRisk band assignment
  {
    check('(i) 13 → none, 14 → 14, 45 → 30, 90 → 90, 200 → 90', atRiskBand(13) === null && atRiskBand(14) === 14 && atRiskBand(45) === 30 && atRiskBand(90) === 90 && atRiskBand(200) === 90);
    const w = world();
    const mk = (u, daysAgo) => { const d = new Date(NOW); d.setDate(d.getDate() - daysAgo); d.setHours(8, 0, 0, 0); w.book(u, w.session(d)); };
    mk('u13', 13); mk('u14', 14); mk('u45', 45); mk('u90', 90); mk('noplan', 60);
    const memberships = ['u13', 'u14', 'u45', 'u90'].map((u) => ({ id: `m_${u}`, tenant_id: 't', created_at: '', updated_at: '', user_id: u, plan_id: 'p', status: 'active', starts_at: '2026-01-01', renews_at: null, ends_at: null }));
    const profiles = [{ id: 'p', tenant_id: 't', created_at: '', updated_at: '', user_id: 'u45', full_name: 'Sara Díaz', initials: 'SD', photo_url: null, marketing_optin: false, whatsapp_verified: false }];
    const goals = [{ id: 'g', tenant_id: 't', created_at: '', updated_at: '', user_id: 'u45', cadence: 'week', target: 2, source: 'member', starts_on: '2026-08-01', active: true, note: null }];
    const st = studioStats({ bookings: w.bookings, sessions: w.sessions, memberships, profiles, ledger: [], goals, teachers: [], modalities: [], now: NOW, rangeDays: 90 });
    check('(i) atRisk lists entitled members ≥ 14 days, sorted by daysSince desc, with bands and names', st.atRisk.map((x) => `${x.userId}:${x.band}`).join(',') === 'u90:90,u45:30,u14:14' && st.atRisk[1].name === 'Sara Díaz' && st.atRisk[1].hadGoal === true && st.atRisk[0].hadGoal === false, JSON.stringify(st.atRisk));
    check('(i) a member without a live package is not listed', !st.atRisk.some((x) => x.userId === 'noplan'));
  }

  // (j) rule 8 — each week is graded by the goal it was lived under: goal 2 for weeks 1–4, goal 3 from week 5
  {
    const w = world();
    for (let k = 5; k >= 1; k--) w.attendWeek('u', weeksBack(k), 2); // weeks 1–5 (oldest first) at 2 attended; week 5 = weeksBack(1)
    const row = (id, target, startsOn, active, createdAt) => ({ id, tenant_id: 't', created_at: createdAt, updated_at: createdAt, user_id: 'u', cadence: 'week', target, source: 'member', starts_on: startsOn, active, note: null });
    // goal 2 starts two weeks AFTER the first visit (weeks 1–2 fall back to the earliest goal), goal 3 from week 5's Monday
    const goals = [row('g2', 2, weeksBack(3), false, '2026-09-01T10:00:00.000Z'), row('g3', 3, weeksBack(1), true, '2026-09-21T10:00:00.000Z')];
    const st = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goals, now: NOW });
    const wk = (k) => st.weeks.find((x) => x.start === weeksBack(k));
    check('(j) weeks 1–4 carry target 2 (weeks before the first goal use the earliest one) and are met at 2 attended', [5, 4, 3, 2].every((k) => wk(k).target === 2 && wk(k).met), JSON.stringify(st.weeks.map((x) => `${x.start}:${x.attended}/${x.target}${x.met ? '✓' : ''}`)));
    check('(j) week 5 carries target 3 and is not met at 2 attended; it is the rest week', wk(1).target === 3 && !wk(1).met && wk(1).saved, JSON.stringify(wk(1)));
    check('(j) top level: target 3 (active goal), streak 4 saved through week 5, current week 0 of 3', st.target === 3 && st.thisWeek.target === 3 && st.thisWeek.remaining === 3 && st.streak.count === 4 && st.streak.savedWeeks[0] === weeksBack(1) && st.weeks[11].target === 3, JSON.stringify(st.streak));
    const legacy = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goal: goals[1], now: NOW });
    check('(j) without `goals` the single goal still applies to every week (backward compatibility)', legacy.streak.count === 0 && legacy.weeks.every((x) => x.target === 3), JSON.stringify(legacy.streak));
  }
  // (k) raising the goal today keeps yesterday's streak count; clearing it reports none; a no-goal span in the past restarts the run quietly
  {
    const w = world();
    for (let k = 6; k >= 1; k--) w.attendWeek('u', weeksBack(k), 2);
    w.book('u', w.session(new Date(2026, 8, 29, 8, 0))); // one class this week (Tuesday)
    const row = (id, target, startsOn, active, createdAt) => ({ id, tenant_id: 't', created_at: createdAt, updated_at: createdAt, user_id: 'u', cadence: 'week', target, source: 'member', starts_on: startsOn, active, note: null });
    const before = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goals: [row('g2', 2, weeksBack(6), true, '2026-08-17T10:00:00.000Z')], now: NOW });
    const today = '2026-09-30';
    const raised = [row('g2', 2, weeksBack(6), false, '2026-08-17T10:00:00.000Z'), row('g3', 3, today, true, '2026-09-30T15:00:00.000Z')];
    const after = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goals: raised, now: NOW });
    check('(k) yesterday: streak 6 at target 2', before.streak.count === 6 && before.streak.state === 'alive' && before.target === 2, JSON.stringify(before.streak));
    check('(k) raising to 3 today keeps the 6 weeks; only the current week is graded at 3', after.streak.count === 6 && after.streak.best === 6 && after.streak.state === 'alive' && after.target === 3 && after.thisWeek.target === 3 && after.thisWeek.remaining === 2 && after.weeks[11].target === 3 && after.weeks.slice(5, 11).every((x) => x.target === 2 && x.met), JSON.stringify({ streak: after.streak, weeks: after.weeks.map((x) => `${x.attended}/${x.target}`) }));
    // two rows set the same day: created_at decides
    const twice = [...raised, row('g1', 1, today, true, '2026-09-30T15:05:00.000Z')].map((g) => (g.id === 'g3' ? { ...g, active: false } : g));
    const st2 = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goals: twice, now: NOW });
    check('(k) two goals on the same day → the later created_at wins (target 1, current week met → 7)', st2.target === 1 && st2.streak.count === 7, JSON.stringify(st2.streak));
    // cleared today → no run reported, history keeps its met flags
    const cleared = [raised[0], row('g0', 0, today, true, '2026-09-30T16:00:00.000Z')];
    const st0 = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goals: cleared, now: NOW });
    check('(k) clearing the goal today → state none, count 0, savedWeeks [], past weeks still read met at 2', st0.streak.state === 'none' && st0.streak.count === 0 && !st0.hasGoal && st0.weeks[10].met && st0.weeks[10].target === 2 && st0.weeks[11].target === 0, JSON.stringify(st0.streak));
    // a no-goal span in the middle of the history: weeks 4–3 back at target 0 → the run restarts after them, no break
    const gap = [row('g2', 2, weeksBack(6), false, '2026-08-17T10:00:00.000Z'), row('g0', 0, weeksBack(4), false, '2026-08-31T10:00:00.000Z'), row('g2b', 2, weeksBack(2), true, '2026-09-14T10:00:00.000Z')];
    const stg = practiceStats({ userId: 'u', bookings: w.bookings, sessions: w.sessions, goals: gap, now: NOW });
    check('(k) a past no-goal span restarts the run (count 2, alive, not broken); those weeks carry target 0', stg.streak.count === 2 && stg.streak.state === 'alive' && stg.weeks.find((x) => x.start === weeksBack(3)).target === 0 && stg.weeks.find((x) => x.start === weeksBack(2)).target === 2, JSON.stringify(stg.streak));
  }

  // ---- the seeded demo member (usr_cust, Juliana) ----
  {
    const { buildSeed } = await bundle('src/data/seed/index.ts', 'seed.mjs');
    const db = buildSeed();
    const goalRows = db.practice_goals.filter((g) => g.user_id === 'usr_cust');
    const goalRow = goalRows.find((g) => g.active);
    const st = practiceStats({ userId: 'usr_cust', bookings: db.bookings, sessions: db.class_sessions, goals: goalRows, memberships: db.memberships.filter((m) => m.user_id === 'usr_cust') });
    const cw = weekStartKey(new Date());
    const wk = (k) => { const [y, m, d] = cw.split('-').map(Number); const dt = new Date(y, m - 1, d - 7 * k, 12); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; };
    console.log(`     usr_cust: target ${st.target} · streak ${st.streak.count} (best ${st.streak.best}, ${st.streak.state}, saved ${JSON.stringify(st.streak.savedWeeks)}) · this week ${st.thisWeek.attended}/${st.target} · this month ${st.attendedThisMonth} · all time ${st.attendedAllTime} · milestones ${JSON.stringify(st.milestonesReached)} · suggested ${st.suggestedTarget}`);
    check('seed: usr_cust has one active goal (2 / week) over one ended goal (1 / week, from before her first class)', goalRow?.target === 2 && goalRows.length === 2 && goalRows.filter((g) => g.active).length === 1 && goalRows.find((g) => !g.active)?.target === 1 && goalRows.find((g) => !g.active).starts_on < st.firstVisit);
    check('seed: her first week is graded at 1 and the rest at 2 (rule 8), so the weeks[] targets read 1 then 2', st.weeks.find((x) => x.start === wk(7))?.target === 1 && [1, 2, 3, 4, 5, 6].every((k) => st.weeks.find((x) => x.start === wk(k))?.target === 2), JSON.stringify(st.weeks.map((x) => `${x.start}:${x.target}`)));
    check('seed: raising her goal to 3 preserves completed weeks and regrades only the current week', (() => { const s3 = practiceStats({ userId: 'usr_cust', bookings: db.bookings, sessions: db.class_sessions, goals: [...goalRows.map((g) => ({ ...g, active: false })), { ...goalRow, id: 'pgl_test', target: 3, starts_on: wk(0) > cw ? cw : (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(), created_at: new Date().toISOString(), active: true }], memberships: db.memberships.filter((m) => m.user_id === 'usr_cust') }); return s3.streak.count === st.streak.count - (st.thisWeek.remaining === 0 && s3.thisWeek.remaining > 0 ? 1 : 0) && s3.target === 3 && s3.weeks[11].target === 3 && s3.weeks[10].target === 2 && JSON.stringify(s3.weeks.slice(0, -1)) === JSON.stringify(st.weeks.slice(0, -1)); })());
    check('seed: ≥ 2 visits in each of the last 5 full weeks, 1 in the 6th, 2 in the 7th', [1, 2, 3, 4, 5].every((k) => st.weeks.find((x) => x.start === wk(k))?.attended >= 2) && st.weeks.find((x) => x.start === wk(6))?.attended === 1 && st.weeks.find((x) => x.start === wk(7))?.attended >= 2, JSON.stringify(st.weeks.map((x) => `${x.start}:${x.attended}`)));
    check('seed: streak ≥ 6 with the 6th week back saved', st.streak.count >= 6 && st.streak.savedWeeks.length === 1 && st.streak.savedWeeks[0] === wk(6) && (st.streak.state === 'alive' || st.streak.state === 'at_risk'), JSON.stringify(st.streak));
    check('seed: milestones 1, 5, 10 reached', st.milestonesReached.includes(10));
    const ev = db.activity_events.filter((e) => e.user_id === 'usr_cust');
    check('seed: events — 2 goal.set, milestones 1/5/10, one streak.saved', ev.filter((e) => e.kind === 'goal.set').length === 2 && ev.filter((e) => e.kind === 'milestone').map((e) => e.payload.count).join(',') === '1,5,10' && ev.filter((e) => e.kind === 'streak.saved').length === 1, ev.map((e) => e.kind).join(','));
    check('seed: milestone events are dated at the visit that reached them', ev.filter((e) => e.kind === 'milestone').every((e) => e.ref_table === 'bookings' && db.bookings.some((b) => b.id === e.ref_id && b.status === 'checked_in')));
    check('seed: seven customers hold an active goal', db.practice_goals.filter((g) => g.active).length === 7);
    // The base seed's own one-per-day guard slices starts_at in UTC (a known follow-up), so only the rows added here are held to the rule.
    check('seed: the added usr_cust bookings never share a local day with another of her bookings', (() => {
      const dayOf = (b) => { const s = db.class_sessions.find((x) => x.id === b.session_id); const d = new Date(s.starts_at); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
      const mine = db.bookings.filter((b) => b.user_id === 'usr_cust');
      const added = mine.filter((b) => b.id.startsWith('bk_pr_'));
      const others = new Set(mine.filter((b) => !b.id.startsWith('bk_pr_')).map(dayOf));
      return added.length > 0 && new Set(added.map(dayOf)).size === added.length && added.every((b) => !others.has(dayOf(b)));
    })());
    check('seed: booked_count matches non-cancelled bookings on every session', db.class_sessions.every((s) => s.booked_count === db.bookings.filter((b) => b.session_id === s.id && b.status !== 'cancelled' && b.status !== 'late_cancel').length));
    const studio = studioStats({ bookings: db.bookings, sessions: db.class_sessions, memberships: db.memberships, profiles: db.profiles, users: db.users, ledger: db.class_ledger, goals: db.practice_goals, teachers: db.teachers, modalities: db.modalities, rangeDays: 30 });
    console.log(`     studio 30d: ${studio.classesHeld} classes · fill ${studio.fillRate} % · attendance ${studio.attendanceRate} % · active ${studio.activeMembers} · at risk ${studio.atRisk.length} · goals ${studio.goals.withGoal} (${studio.goals.onTrackThisWeek} on track) · milestones ${studio.milestonesThisRange.length}`);
    check('seed: studio stats over 30 days have classes and members', studio.classesHeld > 0 && studio.activeMembers > 0 && studio.goals.withGoal === 7);
  }
} finally {
  await rm(scratch, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall analytics checks pass');
process.exit(failed ? 1 : 0);
