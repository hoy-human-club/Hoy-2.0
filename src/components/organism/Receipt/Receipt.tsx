import { useI18n } from '../../../i18n/I18nProvider';
import { formatCOP, formatDateTime } from '../../../i18n/format';
import { Wordmark } from '../../atom/Wordmark/Wordmark';
import { Badge, toneForStatus } from '../../atom/Badge/Badge';
import { Button } from '../../atom/Button/Button';
import './Receipt.css';

export interface ReceiptLine { label: string; amount: number }

export interface ReceiptProps {
  documentMode?: 'future-invoice' | 'payment-preview';
  showTaxBreakdown?: boolean;
  amountReceived?: number;
  studio: string;
  number: string;
  issuedAt: string;
  customer: string;
  contact?: string;
  lines: ReceiptLine[];
  subtotal: number;
  tax: number;
  taxLabel: string;
  total: number;
  method: string;
  status?: string;
  takenBy?: string;
  /** DIAN e-invoice reference (CUFE) when issued. */
  dianRef?: string | null;
  note?: string;
  printLabel?: string;
}

/** Printable counter receipt: studio, number, lines, IVA, total, method and the DIAN reference slot. */
export function Receipt({ documentMode = 'future-invoice', showTaxBreakdown = true, amountReceived, studio, number, issuedAt, customer, contact, lines, subtotal, tax, taxLabel, total, method, status, takenBy, dianRef, note, printLabel }: ReceiptProps) {
  const { t, lang } = useI18n();
  return (
    <div className="receipt">
      <header className="receipt-head">
        <Wordmark height={20} />
        <div className="receipt-meta xs muted mono"><div>{studio}</div>{documentMode === 'payment-preview' && <div>{t('launchReceipt.reference')}</div>}<div>{number}</div><div>{formatDateTime(issuedAt, lang)}</div></div>
      </header>
      <div className="receipt-who">
        <strong>{customer}</strong>
        {contact && <div className="xs muted">{contact}</div>}
      </div>
      <table className="receipt-lines">
        <tbody>
          {lines.map((l, i) => <tr key={i}><td>{l.label}</td><td className="receipt-amt">{formatCOP(l.amount, lang)}</td></tr>)}
          {showTaxBreakdown && <><tr className="receipt-sub"><td>{t('core.common.subtotal')}</td><td className="receipt-amt">{formatCOP(subtotal, lang)}</td></tr>
          <tr className="receipt-sub"><td>{taxLabel}</td><td className="receipt-amt">{formatCOP(tax, lang)}</td></tr></>}
          <tr className="receipt-total"><td>{t('core.common.total')}</td><td className="receipt-amt">{formatCOP(total, lang)}</td></tr>
          {documentMode === 'payment-preview' && amountReceived !== undefined && <tr><td>{t('launchReceipt.received')}</td><td className="receipt-amt">{formatCOP(amountReceived, lang)}</td></tr>}
        </tbody>
      </table>
      <div className="receipt-foot small">
        <div className="row wrap"><span className="muted">{method}</span>{status && <Badge tone={toneForStatus(status)}>{status}</Badge>}</div>
        {takenBy && <div className="xs muted">{takenBy}</div>}
        {documentMode === 'payment-preview' ? <p className="xs muted">{t('launchReceipt.boundary')}</p> : <div className="xs muted mono">DIAN: {dianRef ?? '—'}</div>}
        {note && <p className="xs muted receipt-note">{note}</p>}
      </div>
      {printLabel && <div className="receipt-print"><Button variant="secondary" size="sm" onClick={() => window.print()}>{printLabel}</Button></div>}
    </div>
  );
}
