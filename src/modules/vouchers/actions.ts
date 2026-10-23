import {voucherErrorKey} from './availability';
import {useRef,useState} from 'react';
import {useData} from '../../data/DataContext';
import {useSession} from '../../auth/SessionProvider';
import type {VoucherCommand} from '../../data/vouchers';
export function useVoucherActions() {
  const data = useData(); const { user, role } = useSession();
  const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [error, setError] = useState<string|null>(null);
  async function run(command: Omit<VoucherCommand, 'requestId' | 'actorId' | 'role'> | Record<string, unknown>) {
    if (lock.current) return null;
    lock.current = true; setBusy(true); setError(null);
    try {
      if (!data.voucher) throw new Error('Unavailable');
      return await data.voucher({ ...command, requestId: crypto.randomUUID(), actorId: user.id, role } as VoucherCommand);
    } catch(e) { setError(voucherErrorKey(e)); return null; }
    finally { lock.current = false; setBusy(false); }
  }
  return { run, busy, error };
}
