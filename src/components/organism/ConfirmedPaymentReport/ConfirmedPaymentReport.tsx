import { useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { addDaysKey, dateKey, formatCOP } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import type { PaymentRow } from '../../../data/schema';
import { confirmedPaymentReport } from '../../../data/confirmedPaymentReport';
import { downloadCsv } from '../../../data/reportCsv';
import { Card } from '../../molecule/Card/Card';
import { Field } from '../../molecule/Field/Field';
import { Input } from '../../atom/Input/Input';
import { Button } from '../../atom/Button/Button';
import { EmptyState } from '../../molecule/EmptyState/EmptyState';
export interface ConfirmedPaymentReportProps { payments: PaymentRow[]; productName: (id: string) => string; personName: (id: string) => string; loading?: boolean; initialFrom?: string; initialTo?: string }
/** Local read-only accounting export; backend data authority is a separate gate. */
export function ConfirmedPaymentReport({ payments, productName, personName, loading = false, initialFrom, initialTo }: ConfirmedPaymentReportProps) {
  const { t, lang } = useI18n();
  const [from,setFrom] = useState(initialFrom ?? addDaysKey(dateKey(),-30));
  const [to,setTo] = useState(initialTo ?? dateKey());
  const [downloadState,setDownloadState] = useState<'idle'|'prepared'|'failed'>('idle');
  const report = useMemo(() => confirmedPaymentReport(payments,{tenantId:tenant.id,from,to,productName,personName}),[payments,from,to,productName,personName]);
  const exportCsv = () => { try { downloadCsv(report.csv,`confirmed_payments_${from}_${to}.csv`); setDownloadState('prepared'); } catch { setDownloadState('failed'); } };
  const dateChanged = (change: () => void) => { change(); setDownloadState('idle'); };
  return <section className="confirmed-report" aria-label={t('admin.reporting.title')}><Card title={t('admin.reporting.title')}>
    <div className="stack">
      <p className="small muted">{t('admin.reporting.scope')}</p>
      <div className="row wrap">
        <Field label={t('admin.reporting.from')}>{id=><Input id={id} type="date" value={from} onChange={e=>dateChanged(()=>setFrom(e.target.value))}/>}</Field>
        <Field label={t('admin.reporting.to')}>{id=><Input id={id} type="date" value={to} onChange={e=>dateChanged(()=>setTo(e.target.value))}/>}</Field>
      </div>
      {loading ? <EmptyState compact tone="loading" title={t('core.common.loading')}/> : report.error ? <p role="alert">{t(`admin.reporting.${report.error}`)}</p> : <>
        <p role="status">{t('admin.reporting.summary',{n:report.rows.length,total:report.total===null?t('admin.reporting.totalUnavailable'):formatCOP(report.total,lang)})}</p>
        {!report.rows.length&&<EmptyState compact title={t('admin.reporting.empty')}/>}
        {report.skipped>0&&<p className="small" role="status">{t('admin.reporting.skipped',{n:report.skipped})}</p>}
        {report.rows.some(r=>!r.confirmerId||r.amountReceived===null)&&<p className="xs muted">{t('admin.reporting.missing')}</p>}
      </>}
      <Button variant="secondary" disabled={loading||!!report.error||!report.rows.length} onClick={exportCsv}>{t('admin.reporting.download')}</Button>
      {downloadState==='failed'&&<p role="alert">{t('admin.reporting.failed')}</p>}
      {downloadState==='prepared'&&<p role="status">{t('admin.reporting.prepared')}</p>}
    </div>
  </Card></section>;
}
