import { LaunchPaymentReceipt } from '../../../components/organism/LaunchPaymentReceipt/LaunchPaymentReceipt';
import { useCustomerRows } from '../useCustomerRows';
import { readLaunchReceipt } from '../../../data/launchReceipts';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import type { BaseRow, PaymentRow, PlanRow } from '../../../data/schema';
import { formatCOP, formatDate, formatTime, dateKey } from '../../../i18n/format';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge, toneForStatus } from '../../../components/atom/Badge/Badge';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { SegmentedControl } from '../../../components/molecule/SegmentedControl/SegmentedControl';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { SkeletonRows } from '../../../components/atom/Skeleton/Skeleton';
import { useAllSessionsJoined, useMyBookings } from '../hooks';
import { PageHead, downloadJson } from '../ui';
import { tenant } from '../../../tenant/tenant';

interface InvoiceRow extends BaseRow { payment_id: string; number: string; subtotal: number; tax: number; total: number; issued_at: string }
type Tab = 'classes' | 'payments';

/** C-11 History & payments — one ledger for the relationship. */
export function HistoryPage() {
  const { t, bi, lang } = useI18n();
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'payments' ? 'payments' : 'classes';
  const { rows: bookings, loading } = useMyBookings();
  const all = useAllSessionsJoined();
  const paymentRead = useCustomerRows<PaymentRow>('payments', { where: { user_id: user.id }, orderBy: { column: 'created_at', dir: 'desc' } });
  const payments = paymentRead.rows;
  const invoiceRead = useCustomerRows<InvoiceRow>('invoices', { where: { payment_id: payments.map(p => p.id) } });
  const invoices = invoiceRead.rows;
  const plansRead = useCustomerRows<PlanRow>('plans');
  const plans = plansRead.rows;
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const receipt = payments.find(p => p.id === receiptId) ?? null;
  const reads = [paymentRead, invoiceRead, plansRead];
  const paymentLoading = reads.some(r => r.loading), paymentError = reads.some(r => r.error);

  const classes = useMemo(() => {
    const now = Date.now();
    return bookings.map((b) => ({ b, j: all.find((x) => x.session.id === b.session_id) })).filter((x) => x.j && (new Date(x.j.session.ends_at).getTime() < now || x.b.status !== 'booked'))
      .sort((a, b) => b.j!.session.starts_at.localeCompare(a.j!.session.starts_at));
  }, [bookings, all]);
  const planName = (id: string | null) => { const p = plans.find((x) => x.id === id); return p ? bi({ es: p.name_es, en: p.name_en }) : t('customer.history.otherCharge'); };
  const inv = receipt ? invoices.find((i) => i.payment_id === receipt.id) : null;

  const exportAll = () => downloadJson(`${tenant.slug}-historial-${dateKey()}.json`, { user: user.name, exported_at: new Date().toISOString(), classes: classes.map(({ b, j }) => ({ date: j!.session.starts_at, title: j!.session.title, teacher: j!.teacher?.display_name, status: b.status, paid_with: b.paid_with })), payments: payments.map((p) => ({ date: p.paid_at ?? p.created_at, plan: planName(p.plan_id), amount: p.amount, method: p.method, provider: p.provider, status: p.status, invoice: invoices.find((i) => i.payment_id === p.id)?.number ?? null, receiptReference: readLaunchReceipt(p)?.reference ?? null })) });

  return (
    <div className="container page cust-page">
      <PageHead title={t('customer.history.title')} sub={t('customer.history.sub')} actions={<Button size="sm" variant="secondary" icon="download" onClick={exportAll}>{t('customer.history.export')}</Button>} />
      <div className="stack">
        <SegmentedControl block ariaLabel={t('customer.history.title')} value={tab} onChange={(v) => setParams(v === 'payments' ? { tab: 'payments' } : {}, { replace: true })} options={[{ value: 'classes', label: t('customer.history.classes'), count: classes.length }, { value: 'payments', label: t('customer.history.payments'), count: payments.length }]} />

        {tab === 'classes' && (
          <Card padding="sm" aria-busy={loading || undefined}>
            {loading && <SkeletonRows count={4} />}
            {!loading && classes.length === 0 && <EmptyState compact title={t('customer.history.empty')} body={t('customer.history.empty.body')} action={<Link to="/app/schedule"><Button size="sm">{t('customer.home.next.cta')}</Button></Link>} />}
            {!loading && classes.map(({ b, j }) => (
              <ListRow key={b.id} title={j!.session.title} subtitle={`${formatDate(j!.session.starts_at, lang)} · ${formatTime(j!.session.starts_at, lang)} · ${j!.teacher?.display_name ?? ''}`}
                trailing={<span className="stack-sm" style={{ alignItems: 'flex-end' }}><Badge tone={toneForStatus(b.status)}>{t(`customer.history.status.${b.status}`)}</Badge><span className="xs muted">{t(`customer.paidWith.${b.paid_with}`)}</span></span>}
                to={`/app/booking/${b.id}`} />
            ))}
          </Card>
        )}

        {tab === 'payments' && (
          <ListGroup>
            {paymentError && <Notice tone="danger" action={<Button onClick={() => reads.forEach(r => r.retry())}>{t('launchReceipt.retry')}</Button>}>{t('launchReceipt.readError')}</Notice>}
            {paymentLoading && <SkeletonRows count={3} />}
            {!paymentLoading && !paymentError && payments.length === 0 && <EmptyState compact title={t('customer.history.payments.empty')} />}
            {!paymentLoading && !paymentError && payments.map((p) => (
              <ListRow key={p.id} icon={p.provider === 'wompi' ? 'credit-card' : 'cash'} title={readLaunchReceipt(p)?.item ? bi(readLaunchReceipt(p)!.item!) : planName(p.plan_id)} subtitle={`${formatDate(p.paid_at ?? p.created_at, lang)} · ${t(`customer.pay.method.${p.method}`)} · ${p.provider === 'wompi' ? 'Wompi' : t('customer.pay.manual')}`}
                trailing={<span className="stack-sm" style={{ alignItems: 'flex-end' }}><strong>{formatCOP(p.amount, lang)}</strong><Badge tone={toneForStatus(p.status)}>{t(`customer.history.pay.${p.status}`)}</Badge></span>} onClick={() => setReceiptId(p.id)} />
            ))}
          </ListGroup>
        )}
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.history.note')}</p>
      </div>

      <Drawer open={!!receiptId} onClose={() => setReceiptId(null)} side="bottom" title={t('launchReceipt.title')}>
        {paymentError ? <Notice tone="danger" action={<Button onClick={() => reads.forEach(r => r.retry())}>{t('launchReceipt.retry')}</Button>}>{t('launchReceipt.readError')}</Notice> : paymentLoading ? <SkeletonRows count={3} /> : receipt ? <LaunchPaymentReceipt payment={receipt} customer={user.name} historicalReference={inv?.number} /> : <Notice>{t('launchReceipt.unknown')}</Notice>}
      </Drawer>
    </div>
  );
}
