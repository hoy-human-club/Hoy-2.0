import { formatDate } from '../../i18n/format';
// The manual as a staff LMS (0031): the lens selector, the per-role cover ("Tu manual"), the level chip and
// the read toggle and foot of a chapter, the audience matrix directive, the training sign-off and the team view.
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { ROLE_LABEL, ROLES, type Role } from '../../auth/roles';
import { demoUserByRole, demoUsers } from '../../auth/demoUsers';
import { useTable } from '../../data/DataContext';
import type { TrainingStage } from '../../data/schema';
import { Badge } from '../../components/atom/Badge/Badge';
import { Icon, type IconName } from '../../components/atom/Icon/Icon';
import { Button } from '../../components/atom/Button/Button';
import { Select } from '../../components/atom/Input/Input';
import { ProgressRing } from '../../components/molecule/ProgressRing/ProgressRing';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { ReadToggle } from '../../components/molecule/ReadToggle/ReadToggle';
import { ChapterFoot } from '../../components/molecule/ChapterFoot/ChapterFoot';
import { AUDIENCE, AUDIENCE_COLUMNS, LENS_ROLES, START_PATHS, chaptersForRole, levelFor, rolesFor, type Level } from './audience';
import { chaptersFor, decisionsFor, type Chapter } from './manualIndex';
import { MANUAL_ICON, chapterIcon } from './chapterIcons';
import { SOURCES } from './sources';
import { STAGES, SIGNOFF, trainingFor } from './training';
import { TEAM_PEOPLE, isLead, isTeam, useMarkRead, useMarkUnread, useNames, useProgress, useRequests, useTraining, useTrainingWrites } from './manualData';
import { useLens, type Lens } from './lens';
import { useManualCtx } from './context';

const isRole = (s: string): s is Role => (ROLES as readonly string[]).includes(s);
const shortDate = (iso: string | undefined, lang: string) => (iso ? formatDate(iso, lang === 'en' ? 'en' : 'es', { day: 'numeric', month: 'short' }) : '');

export function useRoleName() {
  const { bi } = useI18n();
  return (r: string) => (isRole(r) ? bi(ROLE_LABEL[r]) : r);
}

/** "Ver el manual como…" — every team role plus the whole manual; persisted as ?as=<role>. */
export function LensSelect({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const roleName = useRoleName();
  const { lens, setLens } = useLens();
  const id = `manual-lens-${compact ? 'c' : 'f'}`;
  return (
    <div className={`manual-lens ${compact ? 'is-compact' : ''}`}>
      <label className="eyebrow" htmlFor={id}>{t('manual.lens.label')}</label>
      <Select id={id} value={lens} onChange={(e) => setLens(e.target.value as Lens)}>
        <option value="all">{t('manual.lens.all')}</option>
        {LENS_ROLES.map((r) => <option key={r} value={r}>{roleName(r)}</option>)}
      </Select>
    </div>
  );
}

/** Whose progress a lens shows: the signed-in person for their own role, otherwise that role's demo person. */
export function useLensSubject(lens: Lens): { id: string; name: string; own: boolean } | undefined {
  const { user, role } = useSession();
  if (lens === 'all') return undefined;
  if (lens === role || (lens === user.role)) return { id: user.id, name: user.name, own: true };
  const d = demoUserByRole(lens);
  return d.role === lens ? { id: d.id, name: d.name, own: false } : undefined;
}

/** "Obligatorio / Recomendado / No aplica para <rol>" for one chapter under the current lens. */
export function LevelChip({ chapter }: { chapter: Chapter }) {
  const { t } = useI18n();
  const roleName = useRoleName();
  const { lens } = useLens();
  if (lens === 'all') return <AudienceChips slug={chapter.slug} />;
  const level = levelFor(chapter, lens);
  const tone = level === 'required' ? 'warn' : level === 'recommended' ? 'primary' : 'neutral';
  return <Badge tone={tone}>{t(`manual.level.${level ?? 'na'}`, { role: roleName(lens) })}</Badge>;
}

/** `{{audience:<slug>}}` — "Para: …" chip row for one chapter (required first, then recommended). */
export function AudienceChips({ slug }: { slug: string }) {
  const { t } = useI18n();
  const roleName = useRoleName();
  const { required, recommended } = rolesFor(slug);
  if (!required.length && !recommended.length) return null;
  return (
    <span className="manual-aud" aria-label={t('manual.aud.label')}>
      <span className="manual-aud-k">{t('manual.aud.for')}</span>
      {required.map((r) => <span key={r} className="manual-aud-chip is-req">{roleName(r)}</span>)}
      {recommended.map((r) => <span key={r} className="manual-aud-chip" title={t('manual.aud.recommended')}>{roleName(r)} ○</span>)}
    </span>
  );
}

/** `{{audience}}` — the "who reads what" matrix, from audience.ts, with the marketing and developer columns. */
export function AudienceMatrix() {
  const { t, lang } = useI18n();
  const roleName = useRoleName();
  const { link } = useLens();
  const list = chaptersFor(lang).filter((c) => AUDIENCE[c.number]);
  const mark = (l?: Level) => (l === 'required' ? '●' : l === 'recommended' ? '○' : '–');
  return (
    <section className="live manual-matrix" aria-label={t('manual.aud.title')}>
      <header className="live-head"><div className="grow"><div className="eyebrow">src/modules/ops-manual/audience.ts</div><h4 className="live-title">{t('manual.aud.title')}</h4></div><Badge>{t('manual.live.badge')}</Badge></header>
      <div className="live-body mdv-table-wrap">
        <table className="live-table">
          <thead><tr><th>{t('manual.aud.chapter')}</th>{AUDIENCE_COLUMNS.map((r) => <th key={r} className="manual-matrix-role">{roleName(r)}</th>)}</tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.slug}>
                <td><Link to={link(`/manual/${c.slug}`)}><span className="manual-num">{c.number}</span>{c.title}</Link></td>
                {AUDIENCE_COLUMNS.map((r) => { const l = AUDIENCE[c.number][r]; return <td key={r} className={`manual-matrix-cell ${l ? `is-${l}` : ''}`} aria-label={t(`manual.level.${l ?? 'na'}`, { role: roleName(r) })}>{mark(l)}</td>; })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="live-foot"><span>{t('manual.aud.legend')}</span><span className="live-source">{t('manual.aud.source')}</span></footer>
    </section>
  );
}

/** Chapter read state as a toggle (0050): "Marcar como leído" ↔ "Leído el … · Marcar como no leído" (team roles only). */
export function ReadButton({ chapter }: { chapter: Chapter }) {
  const { t, lang } = useI18n();
  const { user, role } = useSession();
  const { readOf } = useProgress(user.id);
  const markRead = useMarkRead();
  const markUnread = useMarkUnread();
  const [busy, setBusy] = useState<'mark' | 'unmark'>();
  if (!isTeam(role)) return null;
  const read = readOf(user.id, chapter.slug);
  const outdated = !!read && !!chapter.version && read.version !== chapter.version;
  const run = (kind: 'mark' | 'unmark') => async () => {
    setBusy(kind);
    try { if (kind === 'mark') await markRead(chapter.slug, chapter.version); else await markUnread(chapter.slug); }
    finally { setBusy(undefined); }
  };
  return (
    <ReadToggle
      state={!read ? 'unread' : outdated ? 'outdated' : 'read'}
      readLabel={read ? t('manual.read.done', { date: shortDate(read.read_at, lang) }) : undefined}
      labels={{ mark: t('manual.read.mark'), unmark: t('manual.read.unmark'), newVersion: t('manual.read.newVersion') }}
      onMark={run('mark')} onUnmark={run('unmark')} busy={busy}
    />
  );
}

/**
 * The next chapter for the reader (0050): the next one, by number, in the role's list (required + recommended) —
 * the lens role when one is chosen, else the signed-in role; past the end of that list, the next chapter overall.
 */
export function useNextChapter(chapter: Chapter): Chapter | undefined {
  const { lang } = useI18n();
  const { role } = useSession();
  const { lens } = useLens();
  return useMemo(() => {
    const all = chaptersFor(lang);
    const who = lens !== 'all' ? lens : role;
    const { required, recommended } = chaptersForRole(lang, who);
    const mine = new Set([...required, ...recommended].map((c) => c.slug));
    const after = all.slice(all.findIndex((c) => c.slug === chapter.slug) + 1);
    return after.find((c) => mine.has(c.slug)) ?? after[0];
  }, [lang, role, lens, chapter.slug]);
}

/** The foot of a chapter body (0050): "¿Terminaste este capítulo?", the read toggle and "Siguiente: …" (team roles only). */
export function ChapterFootBlock({ chapter }: { chapter: Chapter }) {
  const { t } = useI18n();
  const { role } = useSession();
  const { link } = useLens();
  const next = useNextChapter(chapter);
  if (!isTeam(role)) return null;
  return (
    <ChapterFoot
      title={t('manual.foot.title')}
      next={next ? { to: link(`/manual/${next.slug}`), label: t('manual.next'), title: `${next.number} · ${next.title}`, icon: <Icon name={chapterIcon(next.number)} size={16} /> } : undefined}
    >
      <ReadButton chapter={chapter} />
    </ChapterFoot>
  );
}

function ChapterList({ list, subject, link, empty }: { list: Chapter[]; subject?: string; link: (p: string) => string; empty: string }) {
  const { t, lang } = useI18n();
  const { readOf } = useProgress(subject);
  if (!list.length) return <p className="muted small">{empty}</p>;
  return (
    <ol className="manual-lms-list">
      {list.map((c) => {
        const r = subject ? readOf(subject, c.slug) : undefined;
        return (
          <li key={c.slug} className={r ? 'is-read' : ''}>
            <Link to={link(`/manual/${c.slug}`)}>
              <span className="manual-lms-check" aria-hidden>{r ? '✓' : ''}</span>
              <span className="manual-lms-icon" aria-hidden><Icon name={chapterIcon(c.number)} size={18} /></span>
              <span className="manual-num">{c.number}</span>
              <span className="grow">{c.title}</span>
              {r && <span className="xs muted">{shortDate(r.read_at, lang)}</span>}
              <span className="sr-only">{r ? t('manual.read.done', { date: shortDate(r.read_at, lang) }) : t('manual.read.pending')}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** Training progress of one person in one role: "Día 1 ✓ · Semana 1 2/5 · Mes 1 0/4". */
export function TrainingSummary({ userId, role }: { userId: string; role: Role }) {
  const { t } = useI18n();
  const plan = trainingFor(role);
  const { has, signoff } = useTraining(userId);
  if (!plan) return null;
  const planRole = role === 'super_admin' ? 'admin' : role;
  return (
    <ul className="manual-train-sum" aria-label={t('manual.train.title')}>
      {STAGES.map((s) => {
        const items = plan[s];
        const done = items.filter((i) => has(userId, planRole, s, i.key)).length;
        const signed = signoff(userId, planRole, s);
        return (
          <li key={s} className={signed ? 'is-signed' : ''}>
            <span className="eyebrow">{t(`manual.train.stage.${s}`)}</span>
            <strong>{signed ? `✓ ${t('manual.train.signedShort')}` : `${done}/${items.length}`}</strong>
          </li>
        );
      })}
    </ul>
  );
}

/** One dashboard tile of the manual home: icon medallion, label, value; a link when it leads somewhere. */
export function Tile({ icon, label, value, hint, to, children }: { icon: IconName; label: string; value?: ReactNode; hint?: string; to?: string; children?: ReactNode }) {
  const body = (
    <>
      <span className="manual-tile-icon" aria-hidden><Icon name={icon} size={20} /></span>
      <span className="manual-tile-text">
        <span className="manual-tile-label">{label}</span>
        {value !== undefined && <span className="manual-tile-value">{value}</span>}
        {hint && <span className="manual-tile-hint">{hint}</span>}
        {children}
      </span>
    </>
  );
  return to ? <Link className="manual-tile is-link" to={to}>{body}</Link> : <div className="manual-tile">{body}</div>;
}

/** Decisions, requests and sources — the tiles every lens shows. */
function CommonTiles() {
  const { t, lang } = useI18n();
  const { link } = useLens();
  const { role } = useSession();
  const requests = useRequests();
  const decisions = decisionsFor(lang).length;
  const open = requests.filter((r) => r.status === 'open').length;
  return (
    <>
      <Tile icon={MANUAL_ICON.decisions} label={t('manual.tile.decisions')} value={decisions} hint={t('manual.tile.decisionsHint')} to={link('/manual/decisions')} />
      {isTeam(role) && <Tile icon={MANUAL_ICON.requests} label={t('manual.tile.requests')} value={open} hint={t('manual.tile.requestsHint')} to={link('/manual/decisions')} />}
      <Tile icon={MANUAL_ICON.sources} label={t('manual.tile.sources')} value={SOURCES.length} hint={t('manual.tile.sourcesHint')} to="/docs/source" />
    </>
  );
}

/** The dashboard for the whole manual (no lens): chapters, reading time, decisions, requests, sources. */
export function ManualTiles({ chapters: n, minutes }: { chapters: number; minutes: number }) {
  const { t } = useI18n();
  return (
    <div className="manual-tiles">
      <Tile icon={MANUAL_ICON.home} label={t('manual.tile.chapters')} value={n} hint={t('manual.tile.minutes', { min: minutes })} />
      <CommonTiles />
    </div>
  );
}

/** The cover block of a lens: "Tu manual" — the dashboard tiles, then start here, required and recommended. */
export function LmsCover() {
  const { t, lang } = useI18n();
  const roleName = useRoleName();
  const { lens, link } = useLens();
  const subject = useLensSubject(lens);
  const { readOf } = useProgress(subject?.id);
  const { role } = useSession();
  const byNumber = useMemo(() => new Map(chaptersFor(lang).map((c) => [c.number, c])), [lang]);
  if (lens === 'all') return null;
  const { required, recommended } = chaptersForRole(lang, lens);
  const readN = subject ? required.filter((c) => readOf(subject.id, c.slug)).length : 0;
  const readRec = subject ? recommended.filter((c) => readOf(subject.id, c.slug)).length : 0;
  const start = (START_PATHS[lens] ?? []).map((n) => byNumber.get(n)).filter((c): c is Chapter => !!c);
  const own = subject?.own && lens === role;
  const hasPlan = !!trainingFor(lens);
  return (
    <section className="manual-lms" aria-labelledby="manual-lms-title">
      <div className="manual-lms-intro">
        <div className="eyebrow">{own ? t('manual.lms.eyebrowOwn') : t('manual.lms.eyebrow', { role: roleName(lens) })}</div>
        <h2 id="manual-lms-title" className="manual-h2">{own ? t('manual.lms.titleOwn') : t('manual.lms.title', { role: roleName(lens) })}</h2>
        <p className="muted small">{t('manual.lms.lead', { req: required.length, rec: recommended.length })}{subject && !own ? ` ${t('manual.lms.progressOf', { name: subject.name })}` : ''}</p>
      </div>
      <div className="manual-tiles">
        <Tile icon={MANUAL_ICON.required} label={t('manual.lms.required')} hint={t('manual.tile.progress')}>
          <ProgressRing value={readN} max={required.length} size={80} ariaLabel={t('manual.lms.ringAria', { n: readN, m: required.length })} />
        </Tile>
        <Tile icon={MANUAL_ICON.recommended} label={t('manual.lms.recommended')} value={`${readRec}/${recommended.length}`} hint={t('manual.tile.readHint')} />
        {hasPlan && subject && (
          <Tile icon={MANUAL_ICON.training} label={t('manual.train.title')} to={link('/manual/09-checklists-de-entrenamiento')}>
            <TrainingSummary userId={subject.id} role={lens} />
          </Tile>
        )}
        <CommonTiles />
      </div>
      <div className="manual-lms-cols">
        <div className="manual-lms-stack">
          <div className="manual-lms-col">
            <h3 className="manual-h3"><Icon name={MANUAL_ICON.start} size={18} /> {t('manual.lms.start')}</h3>
            <ChapterList list={start} subject={subject?.id} link={link} empty={t('manual.lms.none')} />
          </div>
          <div className="manual-lms-col">
            <h3 className="manual-h3"><Icon name={MANUAL_ICON.recommended} size={18} /> {t('manual.lms.recommended')} <Badge tone="primary">{recommended.length}</Badge></h3>
            <ChapterList list={recommended} subject={subject?.id} link={link} empty={t('manual.lms.none')} />
          </div>
        </div>
        <div className="manual-lms-col">
          <h3 className="manual-h3"><Icon name={MANUAL_ICON.required} size={18} /> {t('manual.lms.required')} <Badge tone="warn">{required.length}</Badge></h3>
          <ChapterList list={required} subject={subject?.id} link={link} empty={t('manual.lms.none')} />
        </div>
      </div>
    </section>
  );
}

interface TeamRow extends Record<string, unknown> { id: string; name: string; role: string; roleName: string; read: number; required: number; pct: number; stage: string; stageRank: number }

/** "Equipo" on the K-03 home (coordination and up): per person, % of required chapters read and training stage. */
export function TeamView() {
  const { t, lang } = useI18n();
  const roleName = useRoleName();
  const { role } = useSession();
  const { readOf } = useProgress();
  const { has, signoff } = useTraining();
  const rows = useMemo<TeamRow[]>(() => TEAM_PEOPLE.map((p) => {
    const { required } = chaptersForRole(lang, p.role);
    const read = required.filter((c) => readOf(p.id, c.slug)).length;
    const plan = trainingFor(p.role);
    const planRole = p.role === 'super_admin' ? 'admin' : p.role;
    let stage = t('manual.team.noPlan'), stageRank = -1;
    if (plan) {
      const signedN = STAGES.filter((s) => signoff(p.id, planRole, s)).length;
      const nextStage = STAGES[signedN];
      if (!nextStage) { stage = `✓ ${t('manual.team.trained')}`; stageRank = 99; }
      else {
        const items = plan[nextStage];
        const done = items.filter((i) => has(p.id, planRole, nextStage, i.key)).length;
        stage = `${t(`manual.train.stage.${nextStage}`)} · ${done}/${items.length}`; stageRank = signedN * 10 + done;
      }
    }
    return { id: p.id, name: p.name, role: p.role, roleName: roleName(p.role), read, required: required.length, pct: required.length ? Math.round((read / required.length) * 100) : 0, stage, stageRank };
  }), [lang, readOf, has, signoff, t, roleName]);
  if (!isLead(role)) return null;
  const avg = rows.length ? Math.round(rows.reduce((n, r) => n + r.pct, 0) / rows.length) : 0;
  const trained = rows.filter((r) => r.stageRank === 99).length;
  const started = rows.filter((r) => r.read > 0).length;
  const columns: DataTableColumn<TeamRow>[] = [
    { key: 'name', label: t('manual.team.person'), render: (r) => <span><strong>{r.name}</strong><span className="xs muted manual-team-role">{r.roleName}</span></span> },
    { key: 'pct', label: t('manual.team.read'), align: 'right', render: (r) => <span className="manual-team-pct"><span className="manual-team-bar" aria-hidden><span style={{ width: `${r.pct}%` }} /></span><span className="mono">{r.read}/{r.required}</span></span> },
    { key: 'stageRank', label: t('manual.team.stage'), render: (r) => r.stage },
  ];
  return (
    <section className="manual-block manual-team" aria-labelledby="manual-team-title">
      <div className="manual-part-head">
        <div className="eyebrow">{t('manual.team.eyebrow')}</div>
        <h2 id="manual-team-title" className="manual-h2 manual-h2-icon"><span className="manual-part-icon" aria-hidden><Icon name={MANUAL_ICON.team} size={20} /></span>{t('manual.team.title')}</h2>
        <p className="muted small">{t('manual.team.lead')}</p>
      </div>
      <div className="manual-team-stats">
        <StatTile label={t('manual.team.stat.people')} value={rows.length} />
        <StatTile label={t('manual.team.stat.avg')} value={`${avg} %`} />
        <StatTile label={t('manual.team.stat.started')} value={`${started}/${rows.length}`} />
        <StatTile label={t('manual.team.stat.trained')} value={`${trained}/${rows.filter((r) => r.stageRank >= 0).length}`} />
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} dense stickyHeader={false} />
    </section>
  );
}

/** `{{training:<role>}}` — the Day 1 / Week 1 / Month 1 checklist of a role, live, with the stage sign-off. */
export function TrainingBlock({ role: roleArg }: { role?: string }) {
  const { t, lang, bi } = useI18n();
  const roleName = useRoleName();
  const names = useNames();
  const { user, role: myRole } = useSession();
  const { lens } = useManualCtx();
  const role = (roleArg && isRole(roleArg) ? roleArg : lens !== 'all' ? lens : undefined) as Role | undefined;
  const plan = role ? trainingFor(role) : undefined;
  const planRole = role === 'super_admin' ? 'admin' : role;
  const lead = isLead(myRole);
  const { rows: userRoles } = useTable<{ id: string; user_id: string; role: string; tenant_id: string; created_at: string; updated_at: string }>('user_roles');
  const roster = useMemo(() => {
    if (!planRole) return [];
    const ids = new Set(userRoles.filter((r) => r.role === planRole).map((r) => r.user_id));
    for (const d of demoUsers) if (d.role === planRole) ids.add(d.id);
    return [...ids];
  }, [userRoles, planRole]);
  const ownPlan = myRole === role || (myRole === 'super_admin' && role === 'admin') || user.role === role;
  const [picked, setPicked] = useState<string>();
  const subject = picked ?? (ownPlan ? user.id : roster[0]);
  const { has, signoff } = useTraining(subject);
  const { toggle, sign } = useTrainingWrites();
  if (!role || !plan || !planRole) {
    return <div className="live live-unknown"><p><code>{`{{training${roleArg ? `:${roleArg}` : ''}}}`}</code> {t('manual.train.unknown')}</p><p className="muted small">{t('manual.live.available')} {Object.keys(AUDIENCE_COLUMNS.reduce((o, r) => (trainingFor(r) ? { ...o, [r]: 1 } : o), {})).join(', ')}</p></div>;
  }
  const canTick = (stageSigned: boolean) => !!subject && ((subject === user.id && !stageSigned) || lead);
  return (
    <section className="live manual-train" aria-label={t('manual.train.titleRole', { role: roleName(role) })}>
      <header className="live-head">
        <div className="grow"><div className="eyebrow">{t('manual.train.eyebrow')}</div><h4 className="live-title">{t('manual.train.titleRole', { role: roleName(role) })}</h4></div>
        <Badge>{t('manual.live.badge')}</Badge>
      </header>
      <div className="live-body">
        <div className="manual-train-who">
          {lead ? (
            <label className="manual-train-roster">
              <span className="eyebrow">{t('manual.train.person')}</span>
              <Select value={subject ?? ''} onChange={(e) => setPicked(e.target.value)}>
                {roster.map((id) => <option key={id} value={id}>{names(id)}{id === user.id ? ` (${t('manual.train.you')})` : ''}</option>)}
              </Select>
            </label>
          ) : (
            <p className="small muted">{subject ? (subject === user.id ? t('manual.train.yours') : t('manual.train.readOnly', { name: names(subject) })) : t('manual.train.nobody')}</p>
          )}
        </div>
        <div className="manual-train-stages">
          {STAGES.map((s) => {
            const signed = subject ? signoff(subject, planRole, s) : undefined;
            const items = plan[s];
            const done = subject ? items.filter((i) => has(subject, planRole, s, i.key)).length : 0;
            return (
              <div key={s} className={`manual-train-stage ${signed ? 'is-signed' : ''}`}>
                <div className="manual-train-stagehead">
                  <strong>{t(`manual.train.stage.${s}`)}</strong>
                  <span className="xs muted">{done}/{items.length}</span>
                </div>
                <ul className="manual-train-items">
                  {items.map((it) => {
                    const on = !!subject && has(subject, planRole, s, it.key);
                    const id = `tr-${role}-${s}-${it.key}`;
                    return (
                      <li key={it.key}>
                        <input id={id} type="checkbox" checked={on} disabled={!canTick(!!signed)} onChange={(e) => subject && toggle(subject, planRole, s, it.key, e.target.checked)} />
                        <label htmlFor={id}>{bi(it.text).replace(/`/g, '')}</label>
                      </li>
                    );
                  })}
                </ul>
                {signed ? (
                  <p className="manual-train-signed xs">✓ {t('manual.train.signed', { name: names(signed.signed_by), date: shortDate(signed.done_at, lang) })}</p>
                ) : lead && subject ? (
                  <Button variant="secondary" size="md" onClick={() => sign(subject, planRole, s as TrainingStage)}>{t('manual.train.sign')}</Button>
                ) : (
                  <p className="xs muted">{t('manual.train.unsigned')}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <footer className="live-foot"><span>{t('manual.train.foot')}</span><span className="live-source">manual_training · {SIGNOFF}</span></footer>
    </section>
  );
}

/** Small "Para: …" frame around a `{{for:…}}` passage; collapsed into <details> when the lens does not match. */
export function ScopedBlock({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { t } = useI18n();
  const roleName = useRoleName();
  const { lens } = useManualCtx();
  const names = roles.map(roleName).join(', ');
  const match = lens === 'all' || roles.includes(lens) || (lens === 'super_admin' && roles.includes('admin'));
  if (match) return <div className="manual-for"><div className="manual-for-label">{t('manual.for.label', { roles: names })}</div>{children}</div>;
  return (
    <details className="manual-for is-other">
      <summary>{t('manual.for.only', { roles: names })}</summary>
      {children}
    </details>
  );
}

