import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData } from '../../data/DataContext';
import { EXPENSE_CATEGORIES, type ExpenseCategory, type ExpenseRow, type ExpenseTemplateRow } from '../../data/schema';
import { dueDatesFor, monthlyCost } from '../../data/expenseCalc';
import {  } from '../../data/payrollCalc';
import { formatCOP, formatDate, dateKey } from '../../i18n/format';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Chip } from '../../components/atom/Chip/Chip';
import { Badge } from '../../components/atom/Badge/Badge';
import { Input, Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { SegmentedControl } from '../../components/molecule/SegmentedControl/SegmentedControl';
import { BarList } from '../../components/molecule/BarList/BarList';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useAudit } from '../staff/audit';
import { monthPeriodFor } from './payouts';
import { FINANCE_RANGES, expenseTotals, inRange, sinceDay, useExpenses, useGenerateFixed, type FinanceRange } from './expenses';
import './admin.css';

type ListFilter = 'all' | 'fixed' | 'variable' | 'unpaid';
const METHODS = ['transfer', 'cash', 'card'] as const;
const day = (d: string, lang: 'es' | 'en') => formatDate(d, lang, { day: 'numeric', month: 'short' });

/** M-09c — the expenses ledger: fixed costs generated from recurring templates, variable costs typed by hand, paid / to-pay, by category. */
export function ExpensesPage() {
  const { t, lang } = useI18n();
  const data = useData();
  const { can, user } = useSession();
  const audit = useAudit('admin');
  const { templates, expenses, templateById, loading } = useExpenses();
  const generate = useGenerateFixed();
  const [range, setRange] = useState<FinanceRange>('30d');
  const [filter, setFilter] = useState<ListFilter>('all');
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const canWrite = can('expenses.write');

  const since = sinceDay(range);
  const rows = useMemo(() => expenses.filter((e) => inRange(e.incurred_on, since)), [expenses, since]);
  const totals = useMemo(() => expenseTotals(rows), [rows]);
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of rows) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return [...m.entries()].map(([id, value]) => ({ id, label: t(`admin.expenses.cat.${id}`), value })).sort((a, b) => b.value - a.value);
  }, [rows, t]);
  const listed = rows.filter((e) => filter === 'all' || (filter === 'unpaid' ? !e.paid_on : e.kind === filter));
  const period = monthPeriodFor(offset);
  const activeTemplates = templates.filter((x) => x.active);
  const periodDue = activeTemplates.reduce((a, x) => a + dueDatesFor(x, period).length * x.amount, 0);

  const markPaid = async (e: ExpenseRow) => {
    if (!canWrite) return;
    setBusy(e.id);
    try {
      const today = dateKey(new Date());
      await data.update('expenses', e.id, { paid_on: today });
      await audit('expense.pay', 'expenses', e.id, { before: null, after: today, amount: e.amount, concept: e.concept, method: e.method });
    } finally { setBusy(null); }
  };
  const remove = async (e: ExpenseRow) => {
    if (!canWrite || e.paid_on || !confirm(t('admin.expenses.remove.confirm', { concept: e.concept, amount: formatCOP(e.amount, lang) }))) return;
    await data.remove('expenses', e.id);
    await audit('expense.delete', 'expenses', e.id, { before: { concept: e.concept, amount: e.amount, incurred_on: e.incurred_on, kind: e.kind } });
  };
  const add = async (draft: ExpenseDraft) => {
    const row = await data.insert<ExpenseRow>('expenses', { ...draft, template_id: null, created_by: user.id } as Partial<ExpenseRow>);
    await audit('expense.create', 'expenses', row.id, { after: { concept: draft.concept, amount: draft.amount, kind: draft.kind, category: draft.category, incurred_on: draft.incurred_on, paid_on: draft.paid_on } });
    setMsg({ tone: 'ok', text: t('admin.expenses.msg.added', { concept: draft.concept, amount: formatCOP(draft.amount, lang) }) });
  };
  const addTemplate = async (draft: TemplateDraft) => {
    const row = await data.insert<ExpenseTemplateRow>('expense_templates', { ...draft, active: true, note: null } as Partial<ExpenseTemplateRow>);
    await audit('expense.template.create', 'expense_templates', row.id, { after: draft });
    setShowTemplateForm(false);
    setMsg({ tone: 'ok', text: t('admin.expenses.msg.templateAdded', { concept: draft.concept }) });
  };
  const toggleTemplate = async (x: ExpenseTemplateRow) => {
    if (!canWrite) return;
    await data.update('expense_templates', x.id, { active: !x.active });
    await audit('expense.template.toggle', 'expense_templates', x.id, { before: x.active, after: !x.active, concept: x.concept });
  };
  const runGenerate = async () => {
    setBusy('generate'); setMsg(null);
    try {
      const res = await generate(period, user.id);
      await audit('expense.generate', 'expenses', null, { after: { period: `${period.start}…${period.end}`, created: res.created.length, skipped: res.skipped, total: res.total } });
      setMsg({ tone: 'ok', text: res.created.length ? t('admin.expenses.generate.done', { n: res.created.length, total: formatCOP(res.total, lang), skipped: res.skipped }) : t('admin.expenses.generate.nothing', { skipped: res.skipped }) });
    } finally { setBusy(null); }
  };

  const cols: DataTableColumn<ExpenseRow>[] = [
    { key: 'incurred_on', label: t('admin.expenses.col.date'), render: (e) => <span className="mono small">{day(e.incurred_on, lang)}</span> },
    { key: 'concept', label: t('admin.expenses.col.concept'), render: (e) => <div><strong className="small">{e.concept}</strong>{e.vendor && <div className="xs muted">{e.vendor}</div>}</div> },
    { key: 'category', label: t('admin.expenses.col.category'), render: (e) => t(`admin.expenses.cat.${e.category}`) },
    { key: 'kind', label: t('admin.expenses.col.kind'), render: (e) => <Badge tone={e.kind === 'fixed' ? 'primary' : 'neutral'}>{t(`admin.expenses.kind.${e.kind}`)}</Badge> },
    { key: 'method', label: t('admin.expenses.col.method'), render: (e) => t(`admin.expenses.method.${e.method}`) },
    { key: 'amount', label: t('admin.expenses.col.amount'), align: 'right', render: (e) => <strong>{formatCOP(e.amount, lang)}</strong> },
    { key: 'paid_on', label: t('admin.expenses.col.status'), render: (e) => e.paid_on
      ? <Badge tone="success">{t('admin.expenses.paidOn', { date: day(e.paid_on, lang) })}</Badge>
      : <div className="row adm-status-actions">
          <Badge tone="warn">{t('admin.expenses.unpaid')}</Badge>
          {canWrite && <Button size="sm" variant="ghost" loading={busy === e.id} onClick={(ev) => { ev.stopPropagation(); markPaid(e); }}>{t('admin.expenses.markPaid')}</Button>}
          {canWrite && <Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); remove(e); }} aria-label={t('core.common.delete')}>×</Button>}
        </div> },
  ];
  const tplCols: DataTableColumn<ExpenseTemplateRow>[] = [
    { key: 'concept', label: t('admin.expenses.col.concept'), render: (x) => <div><strong className="small">{x.concept}</strong>{x.vendor && <div className="xs muted">{x.vendor}</div>}</div> },
    { key: 'category', label: t('admin.expenses.col.category'), render: (x) => t(`admin.expenses.cat.${x.category}`) },
    { key: 'cadence', label: t('admin.expenses.col.cadence'), render: (x) => `${t(`admin.expenses.cadence.${x.cadence}`)} · ${t(x.cadence === 'biweekly' ? 'admin.expenses.dueTwice' : 'admin.expenses.dueOnce', { d: x.anchor_day, d2: Math.min(x.anchor_day + 15, 30) })}` },
    { key: 'amount', label: t('admin.expenses.col.amount'), align: 'right', render: (x) => formatCOP(x.amount, lang) },
    { key: 'monthly', label: t('admin.expenses.col.monthly'), align: 'right', sortable: false, render: (x) => <span className="muted">{formatCOP(monthlyCost(x), lang)}</span> },
    { key: 'active', label: t('admin.expenses.col.active'), render: (x) => <div className="row adm-status-actions"><Badge tone={x.active ? 'success' : 'neutral'}>{t(x.active ? 'admin.expenses.active' : 'admin.expenses.inactive')}</Badge>{canWrite && <Button size="sm" variant="ghost" onClick={() => toggleTemplate(x)}>{t(x.active ? 'admin.expenses.deactivate' : 'admin.expenses.activate')}</Button>}</div> },
  ];

  return (
    <div className="stack">
      <Link to="/admin/finance/subscriptions">{t('admin.subscriptions.nav')} →</Link>
      <div className="page-head">
        <div><h1>{t('admin.expenses.title')}</h1><p className="muted small">{t('admin.expenses.subtitle')}</p></div>
        <div className="row wrap">
          <div className="row wrap" role="tablist" aria-label={t('admin.expenses.rangeLabel')}>{FINANCE_RANGES.map((r) => <Chip key={r} selected={range === r} onClick={() => setRange(r)}>{t(`admin.finance.range.${r}`)}</Chip>)}</div>
          <Link to="/admin/finance"><Button size="sm" variant="ghost">{t('admin.payouts.backToFinance')}</Button></Link>
        </div>
      </div>
      {loading && expenses.length === 0 && <EmptyState tone="loading" title={t('core.common.loading')} />}

      <div className="grid grid-4">
        <StatTile label={t('admin.expenses.kpi.fixed')} value={formatCOP(totals.fixed, lang)} hint={t('admin.expenses.kpi.fixed.hint', { n: totals.counts.fixed })} />
        <StatTile label={t('admin.expenses.kpi.variable')} value={formatCOP(totals.variable, lang)} hint={t('admin.expenses.kpi.variable.hint', { n: totals.counts.variable })} />
        <StatTile label={t('admin.expenses.kpi.paid')} value={formatCOP(totals.paid, lang)} hint={t('admin.expenses.kpi.paid.hint', { n: totals.counts.paid })} trend={totals.counts.paid ? 'down' : 'flat'} />
        <StatTile label={t('admin.expenses.kpi.unpaid')} value={formatCOP(totals.unpaid, lang)} hint={t('admin.expenses.kpi.unpaid.hint', { n: totals.counts.unpaid })} trend={totals.counts.unpaid ? 'up' : 'flat'} />
      </div>

      {msg && <div className={`adm-notice small ${msg.tone === 'bad' ? 'adm-notice-bad' : ''}`} role="status">{msg.text}</div>}

      <div className="grid grid-2">
        <Card title={t('admin.expenses.byCategory')} eyebrow={t(`admin.finance.range.${range}`)}>
          <BarList items={byCategory} format={(v) => formatCOP(v, lang)} emptyText={t('admin.finance.emptyRange')} />
          <p className="xs muted" style={{ marginTop: 'var(--sp-md)' }}>{t('admin.expenses.byCategory.hint', { total: formatCOP(totals.total, lang) })}</p>
        </Card>
        <Card title={t('admin.expenses.add')} eyebrow="M-09c">
          {canWrite ? <ExpenseForm onSave={add} /> : <p className="small muted">{t('admin.expenses.noPermission')}</p>}
        </Card>
      </div>

      <Card tone="muted" title={t('admin.expenses.templates')} eyebrow={t('admin.expenses.templates.eyebrow')}
        actions={canWrite ? <Button size="sm" variant="ghost" onClick={() => setShowTemplateForm((v) => !v)}>{showTemplateForm ? t('core.common.cancel') : t('admin.expenses.templates.new')}</Button> : undefined}>
        <div className="stack">
          <div className="row wrap" style={{ alignItems: 'flex-end', gap: 'var(--sp-md)' }}>
            <Select value={String(offset)} onChange={(e) => setOffset(Number(e.target.value))} aria-label={t('admin.payouts.generate.period')} style={{ maxWidth: 220 }}>
              {[0, 1, 2, 3].map((o) => { const p = monthPeriodFor(o); return <option key={o} value={o}>{formatDate(p.start, lang, { month: 'long', year: 'numeric' })}</option>; })}
            </Select>
            <Button size="sm" loading={busy === 'generate'} disabled={!canWrite || activeTemplates.length === 0} onClick={runGenerate}>{t('admin.expenses.generate.action')}</Button>
            <span className="xs muted">{t('admin.expenses.generate.hint', { n: activeTemplates.length, total: formatCOP(periodDue, lang) })}</span>
          </div>
          {showTemplateForm && canWrite && <TemplateForm onSave={addTemplate} />}
          {templates.length === 0
            ? <EmptyState compact title={t('admin.expenses.templates.empty')} body={t('admin.expenses.templates.empty.body')} />
            : <DataTable columns={tplCols} rows={templates} rowKey={(x) => x.id} dense />}
          <p className="xs muted">{t('admin.expenses.generate.idempotent')}</p>
        </div>
      </Card>

      <section className="stack-sm">
        <div className="row-between wrap">
          <div className="eyebrow">{t('admin.expenses.list')}</div>
          <div className="row wrap" role="tablist" aria-label={t('admin.expenses.filterLabel')}>
            {(['all', 'fixed', 'variable', 'unpaid'] as ListFilter[]).map((f) => <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>{t(`admin.expenses.filter.${f}`)}</Chip>)}
          </div>
        </div>
        {listed.length === 0 && !loading
          ? <EmptyState compact title={t('admin.expenses.empty')} body={t('admin.expenses.empty.body')} />
          : <DataTable columns={cols} rows={listed} rowKey={(e) => e.id} dense pageSize={25} emptyText={t('admin.finance.emptyRange')} />}
        <p className="xs muted">{t('admin.expenses.footnote', { n: templateById.size })}</p>
      </section>
    </div>
  );
}

interface ExpenseDraft { kind: ExpenseRow['kind']; category: ExpenseCategory; concept: string; amount: number; incurred_on: string; paid_on: string | null; method: ExpenseRow['method']; vendor: string | null; note: string | null }

/** The add-expense form: concept, category, amount, day, paid or not, method, vendor, note. Resets after a save. */
function ExpenseForm({ onSave }: { onSave: (d: ExpenseDraft) => Promise<void> }) {
  const { t } = useI18n();
  const today = dateKey(new Date());
  const blank = (): ExpenseDraft => ({ kind: 'variable', category: 'supplies', concept: '', amount: 0, incurred_on: today, paid_on: today, method: 'transfer', vendor: null, note: null });
  const [d, setD] = useState<ExpenseDraft>(blank);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof ExpenseDraft>(k: K, v: ExpenseDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const conceptError = d.concept.trim() ? undefined : t('admin.expenses.required');
  const amountError = d.amount > 0 ? undefined : t('admin.expenses.amount.positive');
  const valid = !conceptError && !amountError && !!d.incurred_on;
  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try { await onSave({ ...d, concept: d.concept.trim(), vendor: d.vendor?.trim() || null, note: d.note?.trim() || null }); setD(blank()); setTouched(false); } finally { setSaving(false); }
  };
  return (
    <div className="stack-sm">
      <SegmentedControl size="sm" ariaLabel={t('admin.expenses.col.kind')} value={d.kind} onChange={(v) => set('kind', v)} options={[{ value: 'variable', label: t('admin.expenses.kind.variable') }, { value: 'fixed', label: t('admin.expenses.kind.fixed') }]} />
      <Field label={t('admin.expenses.col.concept')} required error={touched ? conceptError : undefined}>
        {(id) => <Input id={id} value={d.concept} placeholder={t('admin.expenses.concept.placeholder')} onBlur={() => setTouched(true)} onChange={(e) => set('concept', e.target.value)} />}
      </Field>
      <div className="grid grid-2">
        <Field label={t('admin.expenses.col.category')}>
          {(id) => <Select id={id} value={d.category} onChange={(e) => set('category', e.target.value as ExpenseCategory)}>{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`admin.expenses.cat.${c}`)}</option>)}</Select>}
        </Field>
        <Field label={t('admin.expenses.col.amount')} required error={d.amount ? amountError : undefined} hint={t('admin.expenses.amount.hint')}>
          {(id) => <Input id={id} type="number" min={0} step={1000} value={d.amount || ''} onChange={(e) => set('amount', Math.max(0, Math.round(Number(e.target.value) || 0)))} />}
        </Field>
        <Field label={t('admin.expenses.col.date')}>
          {(id) => <Input id={id} type="date" value={d.incurred_on} onChange={(e) => set('incurred_on', e.target.value)} />}
        </Field>
        <Field label={t('admin.expenses.col.status')}>
          {(id) => <Select id={id} value={d.paid_on ? 'paid' : 'unpaid'} onChange={(e) => set('paid_on', e.target.value === 'paid' ? today : null)}><option value="paid">{t('admin.expenses.form.paidToday')}</option><option value="unpaid">{t('admin.expenses.unpaid')}</option></Select>}
        </Field>
        <Field label={t('admin.expenses.col.method')}>
          {(id) => <Select id={id} value={d.method} onChange={(e) => set('method', e.target.value as ExpenseRow['method'])}>{METHODS.map((m) => <option key={m} value={m}>{t(`admin.expenses.method.${m}`)}</option>)}</Select>}
        </Field>
        <Field label={t('admin.expenses.col.vendor')}>
          {(id) => <Input id={id} value={d.vendor ?? ''} onChange={(e) => set('vendor', e.target.value)} />}
        </Field>
      </div>
      <Field label={t('admin.expenses.col.note')}>
        {(id) => <Input id={id} value={d.note ?? ''} onChange={(e) => set('note', e.target.value)} />}
      </Field>
      <div className="row-between wrap">
        <span className="xs muted">{t('admin.expenses.form.hint')}</span>
        <Button size="sm" loading={saving} disabled={!valid} onClick={submit}>{t('admin.expenses.form.save')}</Button>
      </div>
    </div>
  );
}

interface TemplateDraft { concept: string; category: ExpenseCategory; amount: number; cadence: ExpenseTemplateRow['cadence']; anchor_day: number; vendor: string | null }

/** A new recurring fixed cost: what, how much, how often and on which day. */
function TemplateForm({ onSave }: { onSave: (d: TemplateDraft) => Promise<void> }) {
  const { t } = useI18n();
  const [d, setD] = useState<TemplateDraft>({ concept: '', category: 'rent', amount: 0, cadence: 'monthly', anchor_day: 1, vendor: null });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof TemplateDraft>(k: K, v: TemplateDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const valid = d.concept.trim().length > 0 && d.amount > 0 && d.anchor_day >= 1 && d.anchor_day <= 28;
  return (
    <div className="stack-sm adm-inset">
      <div className="grid grid-2">
        <Field label={t('admin.expenses.col.concept')} required>{(id) => <Input id={id} value={d.concept} onChange={(e) => set('concept', e.target.value)} />}</Field>
        <Field label={t('admin.expenses.col.category')}>{(id) => <Select id={id} value={d.category} onChange={(e) => set('category', e.target.value as ExpenseCategory)}>{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`admin.expenses.cat.${c}`)}</option>)}</Select>}</Field>
        <Field label={t('admin.expenses.col.amount')} required hint={t('admin.expenses.template.amount.hint')}>{(id) => <Input id={id} type="number" min={0} step={1000} value={d.amount || ''} onChange={(e) => set('amount', Math.max(0, Math.round(Number(e.target.value) || 0)))} />}</Field>
        <Field label={t('admin.expenses.col.cadence')}>{(id) => <Select id={id} value={d.cadence} onChange={(e) => set('cadence', e.target.value as TemplateDraft['cadence'])}><option value="monthly">{t('admin.expenses.cadence.monthly')}</option><option value="biweekly">{t('admin.expenses.cadence.biweekly')}</option></Select>}</Field>
        <Field label={t('admin.expenses.col.anchorDay')} hint={t('admin.expenses.anchorDay.hint')}>{(id) => <Input id={id} type="number" min={1} max={28} value={d.anchor_day} onChange={(e) => set('anchor_day', Math.min(28, Math.max(1, Number(e.target.value) || 1)))} />}</Field>
        <Field label={t('admin.expenses.col.vendor')}>{(id) => <Input id={id} value={d.vendor ?? ''} onChange={(e) => set('vendor', e.target.value)} />}</Field>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button size="sm" loading={saving} disabled={!valid} onClick={async () => { setSaving(true); try { await onSave({ ...d, concept: d.concept.trim(), vendor: d.vendor?.trim() || null }); } finally { setSaving(false); } }}>{t('admin.expenses.templates.save')}</Button>
      </div>
    </div>
  );
}
