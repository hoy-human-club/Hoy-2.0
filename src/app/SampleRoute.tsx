import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../data/DataContext';
import { useSession } from '../auth/SessionProvider';
import type { BookingRow, ClassSessionRow, PayrollRunRow } from '../data/schema';
import { resolveSampleRoute, sampleOf, SAMPLE_CUSTOMER_ID } from '../hub/sampleIds';

/**
 * Swaps a hub-map sample route (`/app/class/sample`, `pages[].sampleRoute`) for today's real record,
 * keeping the query (`?as=…&lang=…`), so a host embedding a detail page opens a full page. Renders nothing.
 */
export function SampleRoute() {
  const { pathname, search } = useLocation();
  const nav = useNavigate();
  const data = useData();
  const { user } = useSession();
  useEffect(() => {
    if (!sampleOf(pathname)) return;
    let live = true;
    data.prepareDemoSamples?.();
    Promise.all([data.list<ClassSessionRow>('class_sessions'), data.list<BookingRow>('bookings'), data.list<PayrollRunRow>('payroll_runs')])
      .then(([class_sessions, bookings, payroll_runs]) => {
        if (!live) return;
        const tables = { class_sessions, bookings, payroll_runs };
        const to = resolveSampleRoute(pathname, tables, user.id) ?? resolveSampleRoute(pathname, tables, SAMPLE_CUSTOMER_ID);
        if (to) nav(`${to}${search}`, { replace: true });
      });
    return () => { live = false; };
  }, [pathname, search, data, user.id, nav]);
  return null;
}
