import type { DataProvider } from '../../data/types';
import type { PaymentRow, SpecialChargeRow } from '../../data/schema';

export const paymentReportTables = ['payments', 'special_charges'] as const;
export interface PaymentReportSnapshot { status: 'loading' | 'ready' | 'error'; payments: PaymentRow[]; specialSales: SpecialChargeRow[] }
const empty = (status: PaymentReportSnapshot['status']): PaymentReportSnapshot => ({ status, payments: [], specialSales: [] });

/** Report-local reads: a cached provider peek never establishes a successfully loaded export. */
export function watchPaymentReport(data: DataProvider, tenantId: string, publish: (state: PaymentReportSnapshot) => void) {
  let active = true, generation = 0;
  async function refresh() {
    if (!active) return;
    const version = ++generation;
    publish(empty('loading'));
    try {
      const [payments, specialSales] = await Promise.all([
        data.list<PaymentRow>('payments', { where: { tenant_id: tenantId }, orderBy: { column: 'created_at', dir: 'desc' } }),
        data.list<SpecialChargeRow>('special_charges', { where: { tenant_id: tenantId } }),
      ]);
      if (!active || version !== generation) return;
      const scoped = [payments, specialSales].map(rows => {
        if (!Array.isArray(rows)) throw Error('report_shape');
        const own = rows.filter(row => row?.tenant_id === tenantId);
        if (own.some(row => typeof row.id !== 'string' || !row.id) || new Set(own.map(row => row.id)).size !== own.length) throw Error('report_shape');
        return own;
      });
      publish({ status: 'ready', payments: scoped[0] as PaymentRow[], specialSales: scoped[1] as SpecialChargeRow[] });
    } catch { if (active && version === generation) publish(empty('error')); }
  }
  const stops = paymentReportTables.map(table => data.subscribe(table, () => void refresh()));
  void refresh();
  return { retry: () => void refresh(), stop: () => { active = false; generation++; stops.forEach(stop => stop()); } };
}
