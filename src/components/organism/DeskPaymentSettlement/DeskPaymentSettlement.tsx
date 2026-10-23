import { useEffect, useRef, useState } from 'react';
import { useData } from '../../../data/DataContext';
import { useSession } from '../../../auth/SessionProvider';
import { useI18n } from '../../../i18n/I18nProvider';
import type { PaymentRow } from '../../../data/schema';
import { trialErrorKey } from '../../../data/trialEligibility';
import { formatCOP } from '../../../i18n/format';
import { Button } from '../../atom/Button/Button';
import { Input, Select } from '../../atom/Input/Input';
import { Notice } from '../../molecule/Notice/Notice';
import { canSettleAtDesk, DESK_METHODS, settleAtDesk, type DeskMethod } from '../../../modules/transfers/deskSettlement';

export function DeskPaymentSettlement({ payment, onSettled }: { payment: PaymentRow; onSettled: (payment: PaymentRow) => void }) {
  const data = useData(), { user, role } = useSession(), { t, lang } = useI18n();
  const [method, setMethod] = useState<DeskMethod>('cash'), [amount, setAmount] = useState(''), [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const lock = useRef(false), operation = useRef(0), live = useRef({ data, actor: user.id, role, paymentId: payment.id, mounted: true });
  live.current = { data, actor: user.id, role, paymentId: payment.id, mounted: true };
  useEffect(() => { live.current.mounted = true; return () => { live.current.mounted = false; }; }, []);
  useEffect(() => {
    operation.current++; lock.current = false; setBusy(false); setError(null);
    setAmount(''); setNote(''); setMethod('cash'); setAcknowledged(false);
  }, [data, user.id, role, payment.id]);
  const eligible = canSettleAtDesk(payment) && data.name === 'mock' && ['super_admin', 'admin', 'front_desk'].includes(role);
  const valid = amount.trim() !== '' && Number.isSafeInteger(Number(amount)) && Number(amount) === payment.amount && note.trim() && acknowledged;
  async function confirm() {
    if (lock.current || !eligible || !valid) return;
    const context = live.current, version = ++operation.current;
    const cancelled = () => version !== operation.current || !live.current.mounted || live.current.data !== context.data || live.current.actor !== context.actor || live.current.role !== context.role || live.current.paymentId !== context.paymentId;
    lock.current = true; setBusy(true); setError(null);
    try {
      const result = await settleAtDesk(data, { paymentId: payment.id, actorId: user.id, role, method, amount: Number(amount), note }, cancelled);
      if (!cancelled()) onSettled(result);
    } catch (cause) { if (!cancelled()) setError(trialErrorKey(cause) ?? 'transfers.desk.error'); }
    finally { if (version === operation.current) { lock.current = false; if (!cancelled()) setBusy(false); } }
  }
  return <section className="stack" aria-label={t('transfers.desk.title')}>
    <h2>{t('transfers.desk.title')}</h2>
    <Notice tone="warn">{t('transfers.desk.boundary')}</Notice>
    {!eligible ? <Notice>{t('transfers.desk.unavailable')}</Notice> : <>
      <p>{t('transfers.desk.due')}: <strong>{formatCOP(payment.amount, lang)}</strong></p>
      <p>{t('transfers.desk.staff')}: <strong>{user.name}</strong></p>
      <label className="stack-sm"><span>{t('transfers.desk.method')}</span><Select disabled={busy} value={method} onChange={e => setMethod(e.target.value as DeskMethod)}>{DESK_METHODS.map(value => <option key={value} value={value}>{t(`transfers.desk.${value}`)}</option>)}</Select></label>
      <label className="stack-sm"><span>{t('transfers.amount')}</span><Input disabled={busy} type="number" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)} /></label>
      {amount !== '' && Number(amount) !== payment.amount && <Notice tone="warn">{t('transfers.desk.exact')}</Notice>}
      <label className="stack-sm"><span>{t('transfers.desk.note')}</span><Input disabled={busy} maxLength={500} value={note} onChange={e => setNote(e.target.value)} /></label>
      <label className="row" style={{ minHeight: 'var(--h-ctl)' }}><input disabled={busy} type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /><span>{t('transfers.desk.ack')}</span></label>
      <p className="small muted">{t('transfers.desk.noRefunds')}</p>
      {error && <Notice tone="danger">{t(error)}</Notice>}
      <Button loading={busy} disabled={busy || !valid} onClick={() => void confirm()}>{t('transfers.desk.confirm')}</Button>
    </>}
  </section>;
}
