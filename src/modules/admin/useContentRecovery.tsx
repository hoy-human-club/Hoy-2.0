import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../components/atom/Button/Button';

/** Retains the exact failed operation and nonce, including an uncertain acknowledgement. */
export function useContentRecovery() {
  const { bi, t } = useI18n();
  const lock = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const pending = useRef<null | { action: (id: string) => Promise<void>; id: string }>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(false);
  useEffect(() => { if (error) alertRef.current?.focus(); }, [error]);
  const execute = async () => {
    if (lock.current || !pending.current) return false;
    lock.current = true; setBusy(true); setError(false);
    try { await pending.current.action(pending.current.id); pending.current = null; return true; }
    catch { setError(true); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  const run = (action: (id: string) => Promise<void>) => {
    if (lock.current || pending.current) return Promise.resolve(false);
    pending.current = { action, id: crypto.randomUUID() };
    return execute();
  };
  const notice = error && <div ref={alertRef} tabIndex={-1} role="alert" className="stack-sm"><p>{bi({ es: 'No se confirmó el cambio. Se conserva tu borrador. Reintenta la misma operación; si los datos cambiaron, cierra y vuelve a abrir para revisarlos.', en: 'The change was not confirmed. Your draft is preserved. Retry the same operation; if the data changed, close and reopen to review it.' })}</p><Button variant="secondary" disabled={busy} onClick={() => execute()}>{t('core.common.retry')}</Button><Button variant="ghost" disabled={busy} onClick={() => { pending.current = null; setError(false); }}>{t('core.common.cancel')}</Button></div>;
  return { run, busy, blocked: busy || error, notice };
}
