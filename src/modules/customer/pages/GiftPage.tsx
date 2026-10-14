import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import { formatCOP, dateKey, isPhone } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Input } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Wordmark } from '../../../components/atom/Wordmark/Wordmark';
import { OrderSummary } from '../../../components/molecule/OrderSummary/OrderSummary';
import { priceOf } from '../hooks';
import { recordPayment, wompiCheckout } from '../payments';
import { policy } from '../policy';
import { PageHead } from '../ui';

const DESIGNS = ['cream', 'blue', 'yellow', 'sand'] as const;
type Design = (typeof DESIGNS)[number];
/** 0051: the two gift cards, at the class prices (pricing.ts `regalos`). */
const GIFTS = ['gift_single', 'gift_pack12'] as const;
const MAX_QTY = 10;

/** C-17 Gift card — which card and how many, recipient, delivery date, message, design, then pay. */
export function GiftPage() {
  const { t, bi, lang } = useI18n();
  const data = useData();
  const { user } = useSession();
  const [amountId, setAmountId] = useState<string>('gift_single');
  const [qty, setQty] = useState(1);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [date, setDate] = useState(() => dateKey());
  const [message, setMessage] = useState('');
  const [design, setDesign] = useState<Design>('cream');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const item = priceOf(amountId);
  const amount = (item.price ?? 0) * qty;
  const label = qty > 1 ? `${qty} × ${bi(item.name)}` : bi(item.name);
  const today = dateKey();

  const buy = async () => {
    const e: Record<string, string> = {};
    if (qty < 1 || qty > MAX_QTY) e.amount = t('customer.gift.qty.err', { max: MAX_QTY });
    if (name.trim().length < 2) e.name = t('customer.form.required');
    if (!contact.includes('@') && !isPhone(contact)) e.contact = t('customer.gift.contact.err');
    if (date < today) e.date = t('customer.gift.date.past');
    setErrors(e); if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const result = await wompiCheckout({ amount, method: 'card' }); // INTEGRATION SEAM: Wompi
      await recordPayment(data, { userId: user.id, planId: `plan_${amountId}`, amount, method: 'card', result, ivaRate: policy.ivaRate });
      if (result.status !== 'approved') return;
      const code = `${tenant.invoicePrefix}-REGALO-${Math.floor(1000 + Math.random() * 9000)}`;
      const deliver = new Date(`${date}T08:00:00`);
      await data.insert('gift_cards', { code, buyer_user_id: user.id, recipient_name: name.trim(), recipient_contact: contact.trim(), amount, balance: amount, deliver_at: deliver.toISOString(), redeemed_by: null, status: 'draft' });
      setDone(code);
    } finally { setBusy(false); }
  };

  return (
    <div className="container page cust-page">
      <PageHead back="/app/more" title={t('customer.gift.title')} sub={t('customer.gift.sub')} />
      <div className="stack">
        <Notice tone="warn" title={t('vouchers.demo')}>{t('vouchers.demoBody')}</Notice>
        <Link to="/app/vouchers">{t('vouchers.giftLink')}</Link>
        <p className="small muted">{t('vouchers.giftSeparate')}</p>
        <div className={`cust-giftcard cust-giftcard-${design}`} role="img" aria-label={t('customer.gift.preview')}>
          <Wordmark variant={design === 'blue' ? 'cream' : 'blue'} height={28} />
          <strong>{formatCOP(amount, lang)}</strong>
          <span className="small">{name ? t('customer.gift.for', { name }) : t('customer.gift.preview')}</span>
          {message && <em className="xs">“{message}”</em>}
        </div>

        {done ? (
          <Notice tone="success" title={t('vouchers.saved')}>{t('vouchers.giftSimulated', { code: done })}</Notice>
        ) : (
          <>
            <Field label={`1 · ${t('customer.gift.amount')}`} error={errors.amount}>{() => (
              <div className="stack-sm">
                <div className="row wrap">
                  {GIFTS.map((id) => <Chip key={id} selected={amountId === id} onClick={() => setAmountId(id)}>{formatCOP(priceOf(id).price ?? 0, lang)} · {bi(priceOf(id).name)}</Chip>)}
                </div>
                <div className="row wrap" role="group" aria-label={t('customer.gift.qty')}>
                  <span className="small">{t('customer.gift.qty')}</span>
                  <Button size="sm" variant="secondary" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label={t('customer.gift.qty.less')}>−</Button>
                  <strong className="cust-pass-price" aria-live="polite">{qty}</strong>
                  <Button size="sm" variant="secondary" onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} disabled={qty >= MAX_QTY} aria-label={t('customer.gift.qty.more')}>+</Button>
                </div>
                <p className="xs muted">{t('customer.gift.qty.hint')}</p>
              </div>
            )}</Field>
            <div className="eyebrow">2 · {t('customer.gift.to')}</div>
            <Field label={t('customer.form.name')} required error={errors.name}>{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
            <Field label={t('customer.gift.contact')} required hint={t('customer.gift.contact.hint')} error={errors.contact}>{(id) => <Input id={id} value={contact} onChange={(e) => setContact(e.target.value)} />}</Field>
            <div className="eyebrow">3 · {t('customer.gift.delivery')}</div>
            <Field label={t('customer.gift.date')} hint={t('customer.gift.date.hint')} error={errors.date}>{(id) => <Input id={id} type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
            <Field label={t('customer.gift.message')} hint={`${message.length} / ${policy.giftMessageMax}`}>{(id) => <textarea id={id} className="input cust-textarea" maxLength={policy.giftMessageMax} value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />}</Field>
            <Field label={t('customer.gift.design')}>{() => <div className="row wrap">{DESIGNS.map((d) => <button key={d} type="button" className={`cust-swatch cust-giftcard-${d} ${design === d ? 'is-active' : ''}`} aria-label={d} aria-pressed={design === d} onClick={() => setDesign(d)} />)}</div>}</Field>
            <OrderSummary lines={[{ label: `${t('customer.gift.title')} · ${label}`, amount }]} taxRate={policy.ivaRate} subtotalLabel={t('customer.checkout.subtotal')} taxLabel={t('customer.checkout.iva')} totalLabel={t('customer.checkout.total')} note={t('customer.gift.note', { studio: tenant.name })} />
            <Card padding="sm"><Button block size="lg" loading={busy} onClick={buy}>{t('customer.gift.cta', { amount: formatCOP(amount, lang) })}</Button></Card>
            <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.pay.wompi.seam')}</p>
          </>
        )}
      </div>
    </div>
  );
}
