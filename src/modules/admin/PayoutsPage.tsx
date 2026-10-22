import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useTable } from '../../data/DataContext';
import type { ClassSessionRow, PayrollLineRow, PayrollRunRow, SpaceBookingRow, SpecialChargeRow } from '../../data/schema';
import { specialServiceDate } from '../../data/payrollCalc';
import { formatCOP, formatDate, formatDateTime, addMonths } from '../../i18n/format';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Chip } from '../../components/atom/Chip/Chip';
import { Badge } from '../../components/atom/Badge/Badge';
import { Select } from '../../components/atom/Input/Input';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { Notice } from '../../components/molecule/Notice/Notice';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useAudit } from '../staff/audit';
import { useSettings } from './settings';
import { useIntegrationStatus } from './integrations';
import { downloadCsv, monthPeriodFor, payrollCsv, periodLabel, periodsForMonth, statementOf, useGenerateDraft, usePayroll, type PayoutMethod, type TeacherStatement } from './payouts';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { usePayrollApproval } from './usePayrollApproval';
import { usePayrollSettlement } from './usePayrollSettlement';
import './admin.css';
import './PayoutsPage.css';

const STATUS_TONE = { draft: 'warn', approved: 'primary', paid: 'success' } as const;

/** M-09a — the payroll runs list: what the studio owes teachers, per month. */
export function PayoutsPage() {
  const { t, lang } = useI18n();
  const { can } = useSession();
  const nav = useNavigate();
  const { settings } = useSettings();
  const { runs, linesOf, loading } = usePayroll();
  const [offset, setOffset] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const canWrite = can('payroll.write');
  const cadence = settings.payroll.cadence;
  const wompiStatus = useIntegrationStatus('wompi');

  /** 0018: one period per month, or two (1–15 · 16–end) when M-08c says biweekly. */
  const periods = periodsForMonth(cadence, offset);
  const generate = useGenerateDraft(periods, settings.payroll.payoutMethod);
  const draft = runs.find((r) => r.status === 'draft');
  const pending = runs.filter((r) => r.status === 'approved');
  const quarterStart = addMonths(new Date(), -3);
  const paidQuarter = runs.filter((r) => r.status === 'paid' && r.paid_at && new Date(r.paid_at) >= quarterStart);

  const run = async (retry=false) => {
    setMsg(null);
    try {
      const made = await generate.execute(retry);
      const total = made.reduce((a,m)=>a+m.total,0), n=made.reduce((a,m)=>a+m.created,0);
      setMsg(`${made.length > 1 ? t('admin.payouts.generate.done.many', { runs: made.length, n, total: formatCOP(total, lang) }) : t('admin.payouts.generate.done', { n, total: formatCOP(total, lang) })}${made.some(m=>m.replacedOverlap) ? ` · ${t('admin.payouts.generate.replacedOverlap')}` : ''}`);
      if(made.length===1)nav(`/admin/finance/payouts/${made[0].id}`);
    } catch { /* Contained command state below; committed mock drafts may remain after lost acknowledgement. */ }
  };

  const cols: DataTableColumn<PayrollRunRow>[] = [
    { key: 'period_start', label: t('admin.payouts.col.period'), render: (r) => <strong className="small">{periodLabel({ start: r.period_start, end: r.period_end }, lang)}</strong> },
    { key: 'status', label: t('admin.payouts.col.status'), render: (r) => <Badge tone={STATUS_TONE[r.status]}>{t(`admin.payouts.status.${r.status}`)}</Badge> },
    { key: 'teachers', label: t('admin.payouts.col.teachers'), align: 'right', sortable: false, render: (r) => new Set(linesOf(r.id).map((l) => l.teacher_id)).size },
    { key: 'classes', label: t('admin.payouts.col.classes'), align: 'right', sortable: false, render: (r) => linesOf(r.id).filter((l) => l.kind === 'class').length },
    { key: 'total', label: t('admin.payouts.col.total'), align: 'right', render: (r) => formatCOP(r.total, lang) },
    { key: 'method', label: t('admin.payouts.col.method'), render: (r) => t(`admin.payouts.method.${r.method}`) },
    { key: 'paid_at', label: t('admin.payouts.col.settled'), render: (r) => r.paid_at ? <span className="xs mono">{formatDate(r.paid_at, lang)}</span> : r.approved_at ? <span className="xs muted">{t('admin.payouts.awaitingPayment')}</span> : <span className="muted">—</span> },
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{t('admin.payouts.title')}</h1>
          <p className="muted small">{t(cadence === 'biweekly' ? 'admin.payouts.subtitle.biweekly' : 'admin.payouts.subtitle')}</p>
        </div>
        <div className="row wrap">
          <Link to="/admin/finance"><Button size="sm" variant="ghost">{t('admin.payouts.backToFinance')}</Button></Link>
          <Badge tone={wompiStatus === 'connected' ? 'success' : 'warn'}>{wompiStatus === 'connected' ? t('admin.integrations.status.connected') : t('admin.payouts.simulated')}</Badge>
        </div>
      </div>

      <div className="grid grid-3">
        <StatTile label={t('admin.payouts.kpi.next')} value={formatCOP(draft?.total ?? 0, lang)} hint={draft ? t('admin.payouts.kpi.next.hint', { period: periodLabel({ start: draft.period_start, end: draft.period_end }, lang), n: new Set(linesOf(draft.id).map((l) => l.teacher_id)).size }) : t('admin.payouts.kpi.next.none')} />
        <StatTile label={t('admin.payouts.kpi.pending')} value={formatCOP(pending.reduce((a, r) => a + r.total, 0), lang)} hint={t('admin.payouts.kpi.pending.hint', { n: pending.length })} trend={pending.length ? 'up' : 'flat'} />
        <StatTile label={t('admin.payouts.kpi.quarter')} value={formatCOP(paidQuarter.reduce((a, r) => a + r.total, 0), lang)} hint={t('admin.payouts.kpi.quarter.hint', { n: paidQuarter.length })} />
      </div>

      <section className="stack-sm" data-payroll-draft-state>
        <Notice tone="info">{t('admin.draft.mock')}</Notice>
        {generate.status==='loading'&&<Notice>{t('admin.draft.loading')}</Notice>}
        {generate.error&&<Notice tone="warn" action={<Button size="sm" variant="secondary" onClick={()=>{if(generate.error==='save')void run(true);else void generate.reload();}}>{t(generate.error==='save'?'admin.draft.retry':'admin.draft.reload')}</Button>}>{t(`admin.draft.${generate.error}`)}</Notice>}
        {generate.saved&&<Notice tone="success">{t('admin.draft.saved')}</Notice>}
        {generate.busy&&<Notice action={<Button size="sm" variant="secondary" onClick={generate.cancel}>{t('admin.draft.cancel')}</Button>}>{t('admin.draft.saving')}</Notice>}
      </section>

      <Card tone="muted" title={t('admin.payouts.generate')} eyebrow="M-09a">
        <div className="row wrap" style={{ alignItems: 'flex-end', gap: 'var(--sp-md)' }}>
          <Select disabled={generate.busy} value={String(offset)} onChange={(e) => setOffset(Number(e.target.value))} aria-label={t('admin.payouts.generate.period')} style={{ maxWidth: 220 }}>
            {[0, 1, 2, 3].map((o) => {
              const p = monthPeriodFor(o);
              return <option key={o} value={o}>{formatDate(p.start, lang, { month: 'long', year: 'numeric' })}</option>;
            })}
          </Select>
          <Button size="sm" loading={generate.busy} disabled={!canWrite||generate.status!=='ready'||generate.busy} onClick={()=>void run()}>{t(cadence === 'biweekly' ? 'admin.payouts.generate.action.biweekly' : 'admin.payouts.generate.action')}</Button>
          <span className="xs muted">{t('admin.payouts.generate.hint')}</span>
        </div>
        <p className="xs muted" style={{ marginTop: 'var(--sp-sm)' }}>{periods.map((p) => periodLabel(p, lang)).join(' · ')} — {t('admin.payouts.generate.cadence', { cadence: t(`admin.settings.f.cadence.${cadence}`) })} <Link to="/admin/settings/payments">M-08c</Link></p>
        {msg && <p className="small" style={{ marginTop: 'var(--sp-md)' }}>{msg}</p>}
        {!canWrite && <p className="xs muted" style={{ marginTop: 'var(--sp-sm)' }}>{t('admin.payouts.noPermission')}</p>}
      </Card>

      {loading && runs.length === 0
        ? <EmptyState tone="loading" title={t('core.common.loading')} />
        : runs.length === 0
          ? <EmptyState title={t('admin.payouts.empty')} body={t('admin.payouts.empty.body')} />
          : <DataTable columns={cols} rows={runs} rowKey={(r) => r.id} dense onRowClick={(r) => nav(`/admin/finance/payouts/${r.id}`)} />}

      <p className="xs muted">{t('admin.payouts.seamNote')}</p>
    </div>
  );
}

/** M-09b — one run: the statement per teacher and the four things finance can do with it. */
export function PayoutRunPage() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const { can } = useSession();
  const audit = useAudit('admin');
  const { runs, linesOf, teacherName, loading } = usePayroll();
  const { settings: runSettings } = useSettings();
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions');
  const sessionById = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);
  const { rows: specials } = useTable<SpecialChargeRow>('special_charges');
  const { rows: spaceBookings } = useTable<SpaceBookingRow>('space_bookings');
  /** Service date of each Especial (its room window, else the sale day) — what a manual line prints as "when". */
  const specialWhen = useMemo(() => new Map(specials.map((sc) => [sc.id, specialServiceDate(sc, spaceBookings)])), [specials, spaceBookings]);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const canWrite = can('payroll.write');

  const approval = usePayrollApproval(id);
  const settlement = usePayrollSettlement(id);
  const run = runs.find((r) => r.id === id);
  const generate = useGenerateDraft(run?[{start:run.period_start,end:run.period_end}]:[],run?.method??'wompi');
  const lines = run ? linesOf(run.id) : [];
  const statement = useMemo(() => statementOf(lines), [lines]);

  if (!run) {
    return <div className="stack"><EmptyState tone={loading ? 'loading' : 'empty'} title={t(loading ? 'core.common.loading' : 'admin.payouts.notFound')} action={<Link to="/admin/finance/payouts"><Button size="sm" variant="ghost">{t('admin.payouts.title')}</Button></Link>} /></div>;
  }

  const periodText = `${formatDate(run.period_start, lang, { day: 'numeric', month: 'short' })} – ${formatDate(run.period_end, lang, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const approve = () => { setNotice(null); void approval.begin(); };

  const markPaid = (method: Exclude<PayoutMethod, 'wompi'>) => {
    setNotice(null); void settlement.begin({action:'run-manual',method});
  };
  const payTeacher = (group: TeacherStatement, method: PayoutMethod) => {
    setNotice(null); void settlement.begin({action:'teacher-mark',teacherId:group.teacherId,method});
  };
  const sendWompi = () => {
    setNotice(null); void settlement.begin({action:'wompi-rehearsal',method:'wompi',simulate:'accepted'});
  };

  const regenerate = async (retry=false) => {
    setNotice(null);
    try { const [res]=await generate.execute(retry);setNotice({tone:'ok',text:t('admin.payouts.generate.done',{n:res.created,total:formatCOP(res.total,lang)})}); }
    catch { /* Contained draft command state below. */ }
  };

  const exportCsv = () => {
    downloadCsv(`payroll-${run.period_start.slice(0, 7)}.csv`, payrollCsv(run, lines, teacherName));
    void audit('payroll.export', 'payroll_runs', run.id, { after: { rows: lines.length } });
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <Link to="/admin/finance/payouts" className="xs muted">‹ {t('admin.payouts.title')}</Link>
          <h1>{periodLabel({ start: run.period_start, end: run.period_end }, lang)}</h1>
          <p className="muted small">{periodText} · {t('admin.payouts.runOf', { n: statement.length, classes: lines.filter((l) => l.kind === 'class').length })}{lines.some((l) => l.kind === 'manual') ? ` · ${t('admin.payouts.runOf.manual', { n: lines.filter((l) => l.kind === 'manual').length })}` : ''}</p>
        </div>
        <div className="row wrap">
          <Badge tone={STATUS_TONE[run.status]}>{t(`admin.payouts.status.${run.status}`)}</Badge>
          <Badge tone="warn">{t('admin.payouts.simulated')}</Badge>
          {runSettings.payroll.signedBy && <span className="xs muted">{t('admin.payouts.signedBy', { name: runSettings.payroll.signedBy })}</span>}
        </div>
      </div>

      <div className="grid grid-3">
        <StatTile label={t('admin.payouts.kpi.runTotal')} value={formatCOP(run.total, lang)} hint={t('admin.payouts.kpi.runTotal.hint', { n: lines.length })} />
        <StatTile label={t('admin.payouts.col.method')} value={t(`admin.payouts.method.${run.method}`)} hint={run.provider_ref ? `ref ${run.provider_ref}` : t('admin.payouts.method.hint')} />
        <StatTile label={t('admin.payouts.kpi.state')} value={t(`admin.payouts.status.${run.status}`)} hint={run.paid_at ? formatDateTime(run.paid_at, lang) : run.approved_at ? t('admin.payouts.approvedOn', { date: formatDateTime(run.approved_at, lang) }) : t('admin.payouts.notApproved')} />
      </div>

      <section className="stack-sm" data-payroll-settlement-summary>
        <Notice tone="info">{t('admin.settlement.mock')}</Notice>
        {settlement.saved && <Notice tone={settlement.saved.kind==='rejected'?'warn':'success'}>{t(settlement.saved.kind==='rejected'?'admin.settlement.rejected':settlement.saved.action==='wompi-rehearsal'?'admin.settlement.rehearsed':settlement.saved.action==='teacher-mark'&&settlement.saved.method==='wompi'?'admin.settlement.teacherWompiSaved':'admin.settlement.saved')}</Notice>}
        {run.status==='paid'&&lines.some(l=>!l.paid_at||!l.paid_method)&&<Notice tone="warn">{t('admin.settlement.unresolved')}</Notice>}
      </section>

      {approval.saved && <section data-payroll-approval-saved><Notice tone="success">{t('admin.approval.saved')}</Notice></section>}

      {notice && <div className={`adm-notice ${notice.tone === 'bad' ? 'adm-notice-bad' : ''} small`}>{notice.text}</div>}

      {run.status==='draft'&&<>
      <section className="stack-sm" data-payroll-draft-state>
        <Notice tone="info">{t('admin.draft.mock')}</Notice>
        {generate.status==='loading'&&<Notice>{t('admin.draft.loading')}</Notice>}
        {generate.error&&<Notice tone="warn" action={<Button size="sm" variant="secondary" onClick={()=>{if(generate.error==='save')void regenerate(true);else void generate.reload();}}>{t(generate.error==='save'?'admin.draft.retry':'admin.draft.reload')}</Button>}>{t(`admin.draft.${generate.error}`)}</Notice>}
        {generate.saved&&<Notice tone="success">{t('admin.draft.saved')}</Notice>}
        {generate.busy&&<Notice action={<Button size="sm" variant="secondary" onClick={generate.cancel}>{t('admin.draft.cancel')}</Button>}>{t('admin.draft.saving')}</Notice>}
      </section>
      </>}

      <Card title={t('admin.payouts.actions')} tone="muted">
        <div className="row wrap">
          {run.status === 'draft' && <Button size="sm" variant="ghost" loading={generate.busy} disabled={!canWrite||generate.status!=='ready'||generate.busy||settlement.busy||approval.busy} onClick={()=>void regenerate()}>{t('admin.payouts.action.regenerate')}</Button>}
          {run.status === 'draft' && <Button data-payroll-approval-open loading={approval.busy} disabled={!canWrite||generate.busy||settlement.busy||approval.busy} onClick={approve}>{t('admin.payouts.action.approve')}</Button>}
          {run.status === 'approved' && <Button data-payroll-settlement-wompi disabled={!canWrite||settlement.busy} onClick={sendWompi}>{t('admin.settlement.action.wompi')}</Button>}
          {run.status === 'approved' && <Button variant="ghost" data-payroll-settlement-transfer disabled={!canWrite||settlement.busy} onClick={() => markPaid('transfer')}>{t('admin.settlement.action.transfer')}</Button>}
          {run.status === 'approved' && <Button variant="ghost" data-payroll-settlement-cash disabled={!canWrite||settlement.busy} onClick={() => markPaid('cash')}>{t('admin.settlement.action.cash')}</Button>}
          <Button size="sm" variant="ghost" onClick={exportCsv}>{t('admin.payouts.action.csv')}</Button>
          <Button size="sm" variant="ghost" onClick={() => window.print()}>{t('admin.payouts.action.print')}</Button>
        </div>
        <p className="xs muted" style={{ marginTop: 'var(--sp-md)' }}>{run.status === 'paid' ? t('admin.payouts.locked') : t('admin.payouts.flow')}</p>
        {run.notes && <p className="xs muted">{run.notes}</p>}
      </Card>

      <Drawer open={approval.open} onClose={approval.close} title={t('admin.approval.title')} side="bottom"
        footer={<div className="row wrap">
          <Button variant="secondary" onClick={approval.close}>{t('admin.approval.cancel')}</Button>
          {approval.error && <Button variant="secondary" disabled={approval.busy} onClick={()=>void approval.begin()}>{t('admin.approval.reload')}</Button>}
          {approval.canRetry && <Button disabled={approval.busy} onClick={()=>void approval.execute()}>{t('admin.approval.retry')}</Button>}
          {approval.phase==='ready' && <Button data-payroll-approval-confirm disabled={!canWrite||approval.busy} onClick={()=>void approval.execute()}>{t('admin.approval.confirm')}</Button>}
        </div>}>
        <section className="stack" data-payroll-approval-state aria-busy={approval.phase==='loading'||approval.phase==='saving'}>
          <Notice tone="info">{t('admin.approval.mock')}</Notice>
          {approval.phase==='loading' && <Notice>{t('admin.approval.loading')}</Notice>}
          {approval.phase==='saving' && <Notice>{t('admin.approval.saving')}</Notice>}
          {approval.error && <Notice tone="warn">{t(`admin.approval.${approval.error}`)}</Notice>}
          {approval.plan && <Card tone="muted" title={t('admin.approval.preview')}>
            <div className="stack-sm">
              <strong>{periodLabel({start:approval.plan.periodStart,end:approval.plan.periodEnd},lang)}</strong>
              <strong className="mono">{formatCOP(approval.plan.total,lang)}</strong>
              <span>{t('admin.approval.basis',{lines:approval.plan.lineCount,teachers:approval.plan.teacherCount})}</span>
            </div>
          </Card>}
        </section>
      </Drawer>

      <Drawer open={settlement.open} onClose={settlement.close} title={t('admin.settlement.title')} side="bottom"
        footer={<div className="row wrap">
          <Button variant="secondary" onClick={settlement.close}>{t('admin.settlement.cancel')}</Button>
          {settlement.error&&<Button variant="secondary" disabled={settlement.busy} onClick={()=>void settlement.reload()}>{t('admin.settlement.reload')}</Button>}
          {settlement.canRetry&&<Button disabled={settlement.busy} onClick={()=>void settlement.execute()}>{t('admin.settlement.retry')}</Button>}
          {settlement.phase==='ready'&&<Button data-payroll-settlement-confirm disabled={!canWrite||settlement.busy} onClick={()=>void settlement.execute()}>{t('admin.settlement.confirm')}</Button>}
        </div>}>
        <section className="stack" data-payroll-settlement-state aria-busy={settlement.phase==='loading'||settlement.phase==='saving'}>
          <Notice tone="info">{t('admin.settlement.mock')}</Notice>
          {settlement.phase==='loading'&&<Notice>{t('admin.settlement.loading')}</Notice>}
          {settlement.phase==='saving'&&<Notice>{t('admin.settlement.saving')}</Notice>}
          {settlement.error&&<Notice tone="warn">{t(`admin.settlement.${settlement.error}`)}</Notice>}
          {settlement.plan&&<Card tone="muted" title={t('admin.settlement.preview')}>
            <div className="stack-sm">
              <strong>{periodLabel({start:settlement.plan.periodStart,end:settlement.plan.periodEnd},lang)}</strong>
              <strong className="mono">{formatCOP(settlement.plan.total,lang)}</strong>
              <span>{t('admin.settlement.basis',{lines:settlement.plan.lines,teachers:settlement.plan.teachers})}</span>
              <span>{t(`admin.payouts.method.${settlement.plan.method}`)}</span>
              {settlement.plan.action==='teacher-mark'&&settlement.plan.method==='wompi'&&<Notice tone="warn">{t('admin.settlement.teacherWompi')}</Notice>}
              {settlement.plan.action==='wompi-rehearsal'&&<label className="stack-sm">{t('admin.settlement.outcome')}
                <Select disabled={settlement.busy} value={settlement.plan.simulate} onChange={event=>void settlement.begin({...settlement.plan!,simulate:event.target.value as 'accepted'|'rejected'})}>
                  <option value="accepted">{t('admin.settlement.acceptedOption')}</option>
                  <option value="rejected">{t('admin.settlement.rejectedOption')}</option>
                </Select>
              </label>}
            </div>
          </Card>}
        </section>
      </Drawer>

      <section className="stack-sm">
        <div className="eyebrow">{t('admin.payouts.statement')}</div>
        {statement.length === 0 && <EmptyState compact title={t('admin.payouts.noLines')} body={t('admin.payouts.noLines.body')} />}
        {run.status !== 'draft' && <p className="xs muted">{t('admin.payouts.perTeacherHint')}</p>}
        {lines.some((l) => l.kind === 'manual') && <p className="xs muted">{t('admin.payouts.manualHint')}</p>}
        {statement.map((g) => (
          <Card key={g.teacherId} padding="sm" title={teacherName.get(g.teacherId) ?? g.teacherId}
            actions={<div className="row wrap">
              <Badge tone={g.settled ? 'success' : 'warn'}>{t(run.status==='draft'?'admin.payouts.status.draft':g.settled ? 'admin.payouts.status.paid' : 'admin.payouts.awaitingPayment')}</Badge>
              <strong className="mono small">{formatCOP(g.subtotal, lang)}</strong>
            </div>}>
            <div className="row-between wrap">
              <span className="xs muted">
                {t('admin.payouts.teacherSummary', { classes: g.classes, method: t(`admin.payouts.method.${g.paidMethod ?? run.method}`) })}
                {' · '}
                {g.settled
                  ? t('admin.payouts.teacherPaid', { date: formatDate(g.paidAt!, lang), method: t(`admin.payouts.method.${g.paidMethod ?? run.method}`) })
                  : g.paidCount > 0
                    ? t('admin.payouts.teacherPartial', { n: g.paidCount, total: g.lines.length })
                    : t('admin.payouts.teacherUnpaid', { method: t(`admin.payouts.method.${run.method}`) })}
              </span>
              {!g.settled && run.status === 'approved' && canWrite && (
                <Button variant="ghost" data-payroll-settlement-teacher={g.teacherId} disabled={settlement.busy} onClick={() => payTeacher(g, run.method)}>{t('admin.settlement.action.teacher')}</Button>
              )}
            </div>
            <div className="adm-lines">
              {g.lines.map((l) => <LineRow key={l.id} line={l} session={l.class_session_id ? sessionById.get(l.class_session_id) : undefined} when={l.special_charge_id ? specialWhen.get(l.special_charge_id) : undefined} lang={lang} />)}
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}

function LineRow({ line, session, when: serviceAt, lang }: { line: PayrollLineRow; session: ClassSessionRow | undefined; when?: string; lang: 'es' | 'en' }) {
  const { t } = useI18n();
  const manual = line.kind === 'manual';
  const when = session ? formatDate(session.starts_at, lang) : manual ? formatDate(serviceAt ?? line.created_at, lang) : line.note?.slice(0, 10) ?? '—';
  // A manual line prints its source: "Especial: <concept>" is written into note by payrollCalc.manualLineNote.
  const what = session ? session.title : manual && line.note ? line.note : t(`admin.payouts.kind.${line.kind}`);
  return (
    <div className="adm-line payout-line" data-kind={line.kind}>
      <span className="xs mono adm-line-when">{when}</span>
      <span className="grow small">
        {what}
        {line.kind !== 'class' && <Chip>{t(`admin.payouts.kind.${line.kind}`)}</Chip>}
        {line.attendees != null && <span className="xs muted"> · {t('admin.payouts.attendees', { n: line.attendees })}</span>}
        {line.note && !session && !manual && <span className="xs muted"> · {line.note}</span>}
      </span>
      <span className="xs muted payout-line-money">{line.rate ? formatCOP(line.rate, lang) : ''}</span>
      <span className={`small mono payout-line-money ${line.amount < 0 ? 'adm-neg' : ''}`}>{formatCOP(line.amount, lang)}</span>
    </div>
  );
}

