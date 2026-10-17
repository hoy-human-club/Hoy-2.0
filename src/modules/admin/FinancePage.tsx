import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, PaymentRow, PlanRow } from '../../data/schema';
import { formatCOP, formatDate, formatDateTime, MS } from '../../i18n/format';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Chip } from '../../components/atom/Chip/Chip';
import { Badge, toneForStatus } from '../../components/atom/Badge/Badge';
import { BarList } from '../../components/molecule/BarList/BarList';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useAudit } from '../staff/audit';
import { usePayroll } from './payouts';
import { expenseTotals, inRange as onOrAfter, payrollInRange, sinceDay, useExpenses } from './expenses';
import { usePeople } from '../staff/people';
import { useSettings } from './settings';
import './admin.css';

interface InvoiceRow extends BaseRow { payment_id: string; number: string; subtotal: number; tax: number; total: number; issued_at: string; dian_cufe: string | null }
// Colombian studios settle biweekly, so 15 days sits between the week and the month.
type Range = '7d' | '15d' | '30d' | '90d' | 'all';

/** M-09 — revenue by product and method, pending, refunds, the teacher-payroll roll-up (M-09a) and invoices with the DIAN reference. */
export function FinancePage() {
  const { t, lang, bi } = useI18n();
  const data = useData();
  const { can } = useSession();
  const audit = useAudit('admin');
  const { settings } = useSettings();
  const { rows: payments, loading } = useTable<PaymentRow>('payments', { orderBy: { column: 'created_at', dir: 'desc' } });
  const { rows: invoices } = useTable<InvoiceRow>('invoices', { orderBy: { column: 'issued_at', dir: 'desc' } });
  const { rows: plans } = useTable<PlanRow>('plans');
  const { byId } = usePeople();
  // 0018: the default window follows the M-08c payroll cadence (15 d when biweekly, 30 d when monthly) until the user picks one.
  const [picked, setPicked] = useState<Range | null>(null);
  const range: Range = picked ?? (settings.payroll.cadence === 'biweekly' ? '15d' : '30d');
  const setRange = (r: Range) => setPicked(r);
  const [invStatus, setInvStatus] = useState<'all' | 'approved' | 'pending' | 'refunded'>('all');
  const { runs, linesOf } = usePayroll();
  const since = range === 'all' ? 0 : Date.now() - Number(range.replace('d', '')) * MS.day;
  const inRange = useMemo(() => payments.filter((p) => new Date(p.paid_at ?? p.created_at).getTime() >= since), [payments, since]);
  const approved = inRange.filter((p) => p.status === 'approved');
  const revenue = approved.reduce((a, p) => a + p.amount, 0);
  const pending = inRange.filter((p) => p.status === 'pending');
  const refunded = inRange.filter((p) => p.status === 'refunded');
  const planMap = new Map(plans.map((p) => [p.id, p]));
  const byProduct = useMemo(() => { const m = new Map<string, number>(); for (const p of approved) { const k = p.plan_id ?? 'special'; m.set(k, (m.get(k) ?? 0) + p.amount); } return [...m.entries()].map(([id, value]) => ({ id, label: planMap.get(id) ? bi({ es: planMap.get(id)!.name_es, en: planMap.get(id)!.name_en }) : id === 'special' ? t('admin.finance.product.special') : id, value })).sort((a, b) => b.value - a.value); }, [approved, planMap, bi, t]);
  const byMethod = useMemo(() => { const m = new Map<string, number>(); for (const p of approved) m.set(p.method, (m.get(p.method) ?? 0) + p.amount); return [...m.entries()].map(([id, value]) => ({ id, label: t(`admin.finance.method.${id}`), value })).sort((a, b) => b.value - a.value); }, [approved, t]);
  const wompiShare = revenue ? Math.round((approved.filter((p) => p.provider === 'wompi').reduce((a, p) => a + p.amount, 0) / revenue) * 100) : 0;
  const canRefund = can('payments.refund');
  const invByPayment = new Map(invoices.map((i) => [i.payment_id, i]));
  // M-09a payroll roll-up: the three numbers that used to be an em dash.
  const nextRun = runs.find((r) => r.status === 'draft');
  const pendingRuns = runs.filter((r) => r.status === 'approved');
  const quarterAgo = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d; }, []);
  const paidQuarter = runs.filter((r) => r.status === 'paid' && r.paid_at && new Date(r.paid_at) >= quarterAgo);
  const payStatusOf = new Map(payments.map((p) => [p.id, p.status]));
  const invoicesInRange = invoices.filter((i) => new Date(i.issued_at).getTime() >= since && (invStatus === 'all' || payStatusOf.get(i.payment_id) === invStatus));
  // Balance of the range (0.6.1): Ingresos − Nómina − Gastos. Payroll and expenses are date-only tables, so they share one date-only lower bound.
  const { expenses } = useExpenses();
  const sinceD = sinceDay(range);
  const payrollRuns = useMemo(() => payrollInRange(runs, sinceD), [runs, sinceD]);
  const payrollCost = payrollRuns.reduce((a, r) => a + r.total, 0);
  const spend = useMemo(() => expenseTotals(expenses.filter((e) => onOrAfter(e.incurred_on, sinceD))), [expenses, sinceD]);
  const balance = revenue - payrollCost - spend.total;

  const refund = async (p: PaymentRow) => {
    if (!canRefund || !confirm(t('admin.finance.refund.confirm', { amount: formatCOP(p.amount, lang) }))) return;
    await data.update('payments', p.id, { status: 'refunded' });
    await audit('payment.refund', 'payments', p.id, { before: p.status, after: 'refunded', amount: p.amount, user_id: p.user_id });
  };

  const payCols: DataTableColumn<PaymentRow>[] = [
    { key: 'paid_at', label: t('admin.finance.col.when'), render: (p) => <span className="mono small">{formatDateTime(p.paid_at ?? p.created_at, lang)}</span> },
    { key: 'user_id', label: t('admin.finance.col.member'), render: (p) => (p.user_id ? byId.get(p.user_id)?.name ?? p.user_id : <span className="muted">{t('admin.finance.col.contact')}</span>) },
    { key: 'plan_id', label: t('admin.finance.col.product'), render: (p) => { const pl = planMap.get(p.plan_id ?? ''); return pl ? bi({ es: pl.name_es, en: pl.name_en }) : <span className="muted">{t('admin.finance.product.special')}</span>; } },
    { key: 'amount', label: t('admin.finance.col.amount'), align: 'right', render: (p) => formatCOP(p.amount, lang) },
    { key: 'method', label: t('admin.finance.col.method'), render: (p) => `${t(`admin.finance.method.${p.method}`)} · ${t(`admin.finance.provider.${p.provider}`)}` },
    { key: 'status', label: t('admin.finance.col.status'), render: (p) => <Badge tone={toneForStatus(p.status)}>{t(`admin.finance.status.${p.status}`)}</Badge> },
    { key: 'invoice', label: 'DIAN', sortable: false, render: (p) => { const inv = invByPayment.get(p.id); return inv ? <span className="xs mono" title={inv.dian_cufe ?? t('admin.finance.noCufe')}>{inv.number}{inv.dian_cufe ? ` · ${inv.dian_cufe.slice(0, 8)}…` : ''}</span> : <span className="muted">—</span>; } },
    ...(canRefund ? [{ key: 'actions', label: '', sortable: false, render: (p: PaymentRow) => p.status === 'approved' ? <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); refund(p); }}>{t('admin.finance.refund')}</Button> : null }] : []),
  ];
  const invCols: DataTableColumn<InvoiceRow>[] = [
    { key: 'number', label: t('admin.finance.col.invoice'), mono: true },
    { key: 'issued_at', label: t('admin.finance.col.when'), render: (i) => <span className="mono small">{formatDateTime(i.issued_at, lang)}</span> },
    { key: 'subtotal', label: t('core.common.subtotal'), align: 'right', render: (i) => formatCOP(i.subtotal, lang) },
    { key: 'tax', label: `IVA ${settings.tax.ivaPct}%`, align: 'right', render: (i) => formatCOP(i.tax, lang) },
    { key: 'total', label: t('core.common.total'), align: 'right', render: (i) => formatCOP(i.total, lang) },
    { key: 'dian_cufe', label: t('admin.finance.col.cufe'), render: (i) => i.dian_cufe ? <code className="xs">{i.dian_cufe}</code> : <Badge tone={settings.tax.eInvoicing ? 'warn' : 'neutral'}>{settings.tax.eInvoicing ? t('admin.finance.cufe.pending') : t('admin.finance.cufe.off')}</Badge> },
  ];

  return (
    <div className="stack">
      <Link to="/admin/finance/subscriptions">{t('admin.subscriptions.nav')} →</Link>
      <div className="page-head">
        <div><h1>{t('admin.finance.title')}</h1><p className="muted small">{t('admin.finance.subtitle')}</p></div>
        <div className="row wrap" role="tablist">{(['7d', '15d', '30d', '90d', 'all'] as Range[]).map((r) => <Chip key={r} selected={range === r} onClick={() => setRange(r)}>{t(`admin.finance.range.${r}`)}</Chip>)}</div>
      </div>
      {loading && payments.length === 0 && <EmptyState tone="loading" title={t('core.common.loading')} />}
      <div className="grid grid-4">
        <StatTile label={t('admin.finance.revenue')} value={formatCOP(revenue, lang)} hint={t('admin.finance.revenue.hint', { n: approved.length })} trend={revenue > 0 ? 'up' : 'flat'} />
        <StatTile label={t('admin.finance.pending')} value={formatCOP(pending.reduce((a, p) => a + p.amount, 0), lang)} hint={t('admin.finance.pending.hint', { n: pending.length })} />
        <StatTile label={t('admin.finance.refunded')} value={formatCOP(refunded.reduce((a, p) => a + p.amount, 0), lang)} hint={t('admin.finance.refunded.hint', { n: refunded.length })} trend={refunded.length ? 'down' : 'flat'} />
        <StatTile label={t('admin.finance.wompiShare')} value={`${wompiShare}%`} hint={t('admin.finance.wompiShare.hint')} />
      </div>
      <Card title={t('admin.finance.balance')} eyebrow={t('admin.finance.balance.eyebrow')} raised
        actions={<div className="row wrap"><Link to="/admin/finance/payouts"><Button size="sm" variant="ghost">{t('admin.finance.balance.openPayroll')}</Button></Link><Link to="/admin/finance/expenses"><Button size="sm" variant="ghost">{t('admin.finance.balance.openExpenses')}</Button></Link></div>}>
        <div className="grid grid-4">
          <StatTile label={t('admin.finance.balance.revenue')} value={formatCOP(revenue, lang)} hint={t('admin.finance.balance.revenue.hint', { n: approved.length })} />
          <StatTile label={t('admin.finance.balance.payroll')} value={`− ${formatCOP(payrollCost, lang)}`} hint={payrollRuns.length ? t('admin.finance.balance.payroll.hint', { n: payrollRuns.length }) : t('admin.finance.balance.payroll.none')} />
          <StatTile label={t('admin.finance.balance.expenses')} value={`− ${formatCOP(spend.total, lang)}`} hint={t('admin.finance.balance.expenses.hint', { fixed: formatCOP(spend.fixed, lang), variable: formatCOP(spend.variable, lang) })} />
          <StatTile label={t('admin.finance.balance.result')} value={`${balance < 0 ? '− ' : ''}${formatCOP(Math.abs(balance), lang)}`} hint={revenue > 0 ? t('admin.finance.balance.margin', { pct: Math.round((balance / revenue) * 100) }) : t('admin.finance.balance.noRevenue')} trend={balance > 0 ? 'up' : balance < 0 ? 'down' : 'flat'} />
        </div>
        <p className="xs muted" style={{ marginTop: 'var(--sp-md)' }}>{t('admin.finance.balance.body')}</p>
      </Card>
      <div className="grid grid-2">
        <Card title={t('admin.finance.byProduct')}><BarList items={byProduct} format={(v) => formatCOP(v, lang)} emptyText={t('admin.finance.emptyRange')} /></Card>
        <Card title={t('admin.finance.byMethod')}><BarList items={byMethod} format={(v) => formatCOP(v, lang)} emptyText={t('admin.finance.emptyRange')} /></Card>
      </div>
      <Card tone="muted" title={t('admin.finance.payouts')} eyebrow="M-09a"
        actions={<div className="row wrap"><Badge tone="warn">{t('admin.payouts.simulated')}</Badge><Link to="/admin/finance/payouts"><Button size="sm" variant="ghost">{t('admin.finance.payouts.open')}</Button></Link></div>}>
        <div className="grid grid-3">
          <StatTile label={t('admin.finance.payouts.next')} value={formatCOP(nextRun?.total ?? 0, lang)} hint={nextRun ? t('admin.finance.payouts.next.hint', { period: formatDate(nextRun.period_start, lang, { month: 'long' }), n: new Set(linesOf(nextRun.id).map((l) => l.teacher_id)).size }) : t('admin.finance.payouts.next.none')} />
          <StatTile label={t('admin.finance.payouts.pending')} value={formatCOP(pendingRuns.reduce((a, r) => a + r.total, 0), lang)} hint={t('admin.finance.payouts.pending.hint', { n: pendingRuns.length })} trend={pendingRuns.length ? 'up' : 'flat'} />
          <StatTile label={t('admin.finance.payouts.quarter')} value={formatCOP(paidQuarter.reduce((a, r) => a + r.total, 0), lang)} hint={t('admin.finance.payouts.quarter.hint', { n: paidQuarter.length })} />
        </div>
        <p className="xs muted" style={{ marginTop: 'var(--sp-md)' }}>{t('admin.finance.payouts.body')} <Link to="/admin/settings/payments">{t('core.nav.settings')}</Link></p>
      </Card>
      <section className="stack-sm">
        <div className="row-between wrap"><div className="eyebrow">{t('admin.finance.payments')}</div>{!canRefund && <span className="xs muted">{t('admin.finance.refund.noPermission')}</span>}</div>
        <DataTable columns={payCols} rows={inRange} rowKey={(p) => p.id} dense pageSize={25} emptyText={t('admin.finance.emptyRange')} />
      </section>
      <section className="stack-sm">
        <div className="row-between wrap">
          <div className="eyebrow">{t('admin.finance.invoices')}</div>
          <div className="row wrap" role="tablist" aria-label={t('admin.finance.invFilter')}>
            {(['all', 'approved', 'pending', 'refunded'] as const).map((s2) => <Chip key={s2} selected={invStatus === s2} onClick={() => setInvStatus(s2)}>{t(`admin.finance.invFilter.${s2}`)}</Chip>)}
            <span className="xs muted">{settings.tax.eInvoicing ? t('admin.finance.einv.on') : t('admin.finance.einv.off')}</span>
          </div>
        </div>
        <DataTable columns={invCols} rows={invoicesInRange} rowKey={(i) => i.id} dense pageSize={25} emptyText={t('admin.finance.emptyRange')} />
      </section>
    </div>
  );
}
