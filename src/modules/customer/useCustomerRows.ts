import { useCallback, useEffect, useState } from 'react';
import { useData } from '../../data/DataContext';
import { useSession } from '../../auth/SessionProvider';
import type { BaseRow } from '../../data/schema';
import { tenant } from '../../tenant/tenant';
import type { Query } from '../../data/types';

/** Scoped customer read: failed reads never masquerade as empty or leave stale actionable rows. */
export function useCustomerRows<T extends BaseRow>(table: string, query?: Query) {
  const data = useData(), { user } = useSession();
  const serialized = JSON.stringify(query ?? {});
  const key = `${user.id}|${table}|${serialized}`;
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(n => n + 1), []);
  const [state, setState] = useState<{data: typeof data; key: string; rows: T[]; error: boolean} | null>(null);
  useEffect(() => {
    let alive = true, generation = 0;
    const load = async () => {
      const request = ++generation;
      setState(null);
      try {
        const q = JSON.parse(serialized) as Query;
        const rows = await data.list<T>(table, { ...q, where: { ...q.where, tenant_id: tenant.id } });
        if (alive && request === generation) setState({data, key, rows, error: false});
      } catch { if (alive && request === generation) setState({data, key, rows: [], error: true}); }
    };
    void load();
    const stop = data.subscribe(table, () => void load());
    return () => { alive = false; stop(); };
  }, [data, key, serialized, table, revision]);
  const current = state?.data === data && state.key === key ? state : null;
  return { rows: current?.rows ?? [], loading: !current, error: current?.error ?? false, retry };
}
