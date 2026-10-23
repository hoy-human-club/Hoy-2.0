import type { PaymentRow } from '../../../data/schema';
import { readLaunchReceipt } from '../../../data/launchReceipts';
import { useI18n } from '../../../i18n/I18nProvider';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../molecule/Card/Card';
import { Notice } from '../../molecule/Notice/Notice';
import { Receipt } from '../Receipt/Receipt';

/** A saved local payment document, never a fiscal invoice or delivery acknowledgement. */
export function LaunchPaymentReceipt({ payment, customer, historicalReference }: { payment: PaymentRow; customer: string; historicalReference?: string }) {
  const { t, bi } = useI18n();
  const receipt = readLaunchReceipt(payment);
  if (!receipt) return <Card className="stack-sm"><Notice>{t(payment.status === 'approved' ? 'launchReceipt.unknown' : 'launchReceipt.pending')}</Notice>{historicalReference && <p className="small" style={{ overflowWrap: 'anywhere' }}>{t('launchReceipt.legacy')}: {historicalReference}</p>}</Card>;
  const facts = receipt.facts, tax = receipt.recordedTax;
  const methodKey = `customer.pay.method.${facts.method}`;
  return <section className="stack-sm" data-launch-receipt={receipt.reference}>
    <Receipt documentMode="payment-preview" studio={tenant.legalName} number={receipt.reference} issuedAt={facts.confirmedAt!} customer={customer}
      lines={[{ label: receipt.item ? bi(receipt.item) : t('launchReceipt.item'), amount: facts.amountCharged }]}
      subtotal={tax?.subtotal ?? facts.amountCharged} tax={tax?.tax ?? 0} taxLabel={t('launchReceipt.tax')} showTaxBreakdown={!!tax}
      total={facts.amountCharged} amountReceived={facts.amountReceived!} method={t(methodKey)} status={t('launchReceipt.approved')} note={t('launchReceipt.mock')} printLabel={t('launchReceipt.print')} />
  </section>;
}
