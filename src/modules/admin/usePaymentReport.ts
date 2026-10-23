import { useEffect, useRef, useState } from 'react';
import { useData } from '../../data/DataContext';
import { useSession } from '../../auth/SessionProvider';
import { tenant } from '../../tenant/tenant';
import { watchPaymentReport, type PaymentReportSnapshot } from './paymentReportReads';

const loading: PaymentReportSnapshot = { status: 'loading', payments: [], specialSales: [] };
export function usePaymentReport() {
  const data = useData(), { user, role } = useSession();
  const context = `${tenant.id}:${user.id}:${role}`;
  const [result, setResult] = useState<{ data: typeof data; context: string; snapshot: PaymentReportSnapshot } | null>(null);
  const reader = useRef<ReturnType<typeof watchPaymentReport> | null>(null);
  useEffect(() => {
    const current = watchPaymentReport(data, tenant.id, snapshot => setResult({ data, context, snapshot }));
    reader.current = current;
    return () => { current.stop(); if (reader.current === current) reader.current = null; };
  }, [data, context]);
  const snapshot = result?.data === data && result.context === context ? result.snapshot : loading;
  return { ...snapshot, retry: () => reader.current?.retry() };
}
