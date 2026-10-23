import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { assertContentActor, type ContentActor } from './contentRecovery';
import { Button } from '../../components/atom/Button/Button';

/** Retains the exact failed operation and nonce, including an uncertain acknowledgement. */
export function useContentRecovery() {
  const { bi, t } = useI18n();
  const { user, role } = useSession();
  const actorRef = useRef<ContentActor>({ id: user.id, role });
  actorRef.current = { id: user.id, role };
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const currentActor = useCallback(() => { if (!mounted.current) throw Error('content_context_changed'); return { ...actorRef.current }; }, []);
  const lock = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const pending = useRef<null | { action: (id: string) => Promise<void>; id: string; actor: ContentActor }>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<false | 'save' | 'context'>(false);
  useEffect(() => { if (error) alertRef.current?.focus(); }, [error]);
  const execute = async () => {
    if (lock.current || !pending.current) return false;
    lock.current = true; setBusy(true); setError(false);
    try { assertContentActor(pending.current.actor, currentActor()); await pending.current.action(pending.current.id); pending.current = null; return true; }
    catch (failure) { setError(failure instanceof Error && failure.message === 'content_context_changed' ? 'context' : 'save'); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  const run = (action: (id: string) => Promise<void>) => {
    if (lock.current || pending.current) return Promise.resolve(false);
    pending.current = { action, id: crypto.randomUUID(), actor: currentActor() };
    return execute();
  };
  const notice = error && <div ref={alertRef} tabIndex={-1} role="alert" className="stack-sm"><p>{bi(error === 'context' ? { es: 'La sesión cambió. Se conserva tu borrador. Vuelve al usuario y rol originales para reintentar, o cancela y vuelve a abrir el editor.', en: 'The session changed. Your draft is preserved. Return to the original user and role to retry, or cancel and reopen the editor.' } : { es: 'No se confirmó el cambio. Se conserva tu borrador. Reintenta la misma operación; si los datos cambiaron, cierra y vuelve a abrir para revisarlos.', en: 'The change was not confirmed. Your draft is preserved. Retry the same operation; if the data changed, close and reopen to review it.' })}</p><Button variant="secondary" disabled={busy} onClick={() => execute()}>{t('core.common.retry')}</Button><Button variant="ghost" disabled={busy} onClick={() => { pending.current = null; setError(false); }}>{t('core.common.cancel')}</Button></div>;
  return { run, busy, blocked: busy || !!error, notice, currentActor };
}
