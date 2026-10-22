import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Input } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { OtpInput } from '../../../components/molecule/OtpInput/OtpInput';
import { SegmentedControl } from '../../../components/molecule/SegmentedControl/SegmentedControl';
import { policy } from '../policy';
import { AuthShell } from './AuthShell';
import { passwordStrength } from './SignUpPage';
import { isPhone } from '../../../i18n/format';
import { MockRecovery } from './mockRecovery';
import { tenant } from '../../../tenant/tenant';

type Channel = 'whatsapp' | 'email';
const RESEND_KEY = 'hoyos.auth.otpResendAt';
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

/** C-21 Password recovery — six-digit WhatsApp code, email as fallback. Simulated: the demo code is shown on screen. */
export function PasswordResetPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [ident, setIdent] = useState(`${tenant.dialCode} `);
  const machine = useRef<MockRecovery | null>(null);
  if (!machine.current) {
    let cooldown = 0;
    try { cooldown = Number(sessionStorage.getItem(RESEND_KEY) ?? 0); } catch { /* Optional demo cooldown only. */ }
    machine.current = new MockRecovery(cooldown);
  }
  const recovery = machine.current;
  const [challenge, setChallenge] = useState(recovery.state);
  const [entered, setEntered] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [password, setPassword] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sync = () => setChallenge(recovery.state);
  const stopTimer = () => { if (timer.current !== null) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => {
    const id = setInterval(() => { const time = Date.now(); recovery.expire(time); setNow(time); setChallenge(recovery.state); }, 1000);
    return () => { clearInterval(id); stopTimer(); recovery.cancel(); };
  }, [recovery]);
  const busy = challenge.status === 'sending' || challenge.status === 'saving';
  const resendIn = Math.max(0, Math.ceil((challenge.resendAt - now) / 1000));
  const validIdent = channel === 'email' ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ident.trim()) : isPhone(ident, 12);
  const cancel = () => {
    stopTimer(); recovery.cancel(); setEntered(''); setPassword(''); setInvalid(false); setStep(1); sync();
  };
  const send = () => {
    if (!validIdent) return;
    const token = recovery.beginSend(Date.now());
    if (token === null) return;
    setEntered(''); setInvalid(false); sync();
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!recovery.finishSend(token, genCode(), Date.now(), policy.otpValidMinutes, policy.otpResendSeconds)) return;
      try { sessionStorage.setItem(RESEND_KEY, String(recovery.state.resendAt)); } catch { /* Cooldown persistence is optional, never a delivery. */ }
      setNow(Date.now()); setStep(2); sync();
    }, 600);
  };
  const verify = (value: string) => {
    const outcome = recovery.verify(value, Date.now());
    setInvalid(outcome === 'wrong'); setEntered('');
    if (outcome === 'verified') setStep(3);
    sync();
  };
  const save = () => {
    if (password.length < 8) return;
    const token = recovery.beginSave();
    if (token === null) return;
    sync();
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!recovery.finishSave(token)) return;
      setPassword(''); setStep(4); sync();
    }, 600);
  };
  const strength = passwordStrength(password);

  return (
    <AuthShell>
      <div className="auth-col">
        <Link to="/auth/sign-in" className="cust-back">‹ <span>{t('customer.reset.back')}</span></Link>
        <Notice tone="info">{t('customer.reset.boundary')}</Notice>
        <div className="auth-dots" aria-label={t('customer.signup.step', { n: Math.min(3, step), total: 3 })}>{[1, 2, 3].map((n) => <i key={n} className={step >= n ? 'is-on' : ''} />)}</div>

        {step === 1 && (
          <Card padding="lg" className="stack">
            <div className="stack-sm"><h1 className="cust-title">{t('customer.reset.title')}</h1><p className="muted small">{t('customer.reset.sub')}</p></div>
            <SegmentedControl block ariaLabel={t('customer.reset.channel')} value={channel} onChange={(c) => { if (busy) return; cancel(); setChannel(c); setIdent(c === 'whatsapp' ? `${tenant.dialCode} ` : ''); }} options={[{ value: 'whatsapp', label: 'WhatsApp', disabled: busy }, { value: 'email', label: 'Email', disabled: busy }]} />
            <Field label={channel === 'whatsapp' ? t('customer.form.whatsapp') : t('customer.form.email')}>{(id) => <Input id={id} disabled={busy} value={ident} onChange={(e) => setIdent(e.target.value)} inputMode={channel === 'whatsapp' ? 'tel' : 'email'} type={channel === 'email' ? 'email' : 'text'} />}</Field>
            <Button block size="lg" loading={busy} disabled={!validIdent || resendIn > 0} onClick={send}>{t('customer.reset.send')}</Button>
            <p className="xs muted">{resendIn > 0 && <>{t('customer.reset.resendIn', { s: resendIn })} · </>}{t('customer.reset.privacy')}</p>
          </Card>
        )}

        {step === 2 && (
          <Card padding="lg" className="stack">
            <div className="stack-sm"><h1 className="cust-title">{t('customer.reset.otp.title')}</h1><p className="muted small">{t('customer.reset.otp.sub', { to: ident, min: policy.otpValidMinutes })}</p></div>
            <Notice tone="info">{challenge.status === 'expired' ? t('customer.reset.expired') : challenge.status === 'invalidated' ? t('customer.reset.codeInvalidated') : challenge.code ? t('customer.reset.demoCode', { code: challenge.code }) : t('customer.reset.preparing')}</Notice>
            <OtpInput value={entered} onChange={(v) => { setEntered(v); setInvalid(false); }} label={t('customer.reset.otp.title')} invalid={invalid} disabled={busy || challenge.status !== 'active'} onComplete={verify} />
            {invalid && challenge.status === 'active' && <p className="small" style={{ color: 'var(--color-danger)', textAlign: 'center' }} role="alert">{t('customer.reset.wrong', { n: 3 - challenge.wrong })}</p>}
            <Button block variant="secondary" loading={busy} disabled={resendIn > 0} onClick={send}>{resendIn > 0 ? t('customer.reset.resendIn', { s: resendIn }) : t('customer.reset.resend')}</Button>
            <button type="button" className="cust-linkbtn small" disabled={busy} onClick={() => { cancel(); setChannel(channel === 'whatsapp' ? 'email' : 'whatsapp'); setIdent(channel === 'whatsapp' ? '' : `${tenant.dialCode} `); }}>{channel === 'whatsapp' ? t('customer.reset.useEmail') : t('customer.reset.useWhatsapp')}</button>
          </Card>
        )}

        {step === 3 && (
          <Card padding="lg" className="stack">
            <div className="stack-sm"><h1 className="cust-title">{t('customer.reset.new.title')}</h1><p className="muted small">{t('customer.form.password.hint')}</p></div>
            <Field label={t('customer.form.password')} required>{(id) => (
              <div className="stack-sm">
                <Input id={id} disabled={busy} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className={`auth-strength auth-strength-${strength}`} aria-hidden><i /><i /><i /></div>
                {password && <span className="xs muted">{t(`customer.form.strength.${strength}`)}</span>}
              </div>
            )}</Field>
            <Button block size="lg" loading={busy} disabled={password.length < 8} onClick={save}>{t('customer.reset.save')}</Button>
            <p className="xs muted">{t('customer.reset.signOutOthers')}</p>
          </Card>
        )}

        {step === 4 && (
          <Card padding="lg" className="stack">
            <Notice tone="success" title={t('customer.reset.done.title')}>{t('customer.reset.done.body')}</Notice>
            <Button block size="lg" onClick={() => nav('/auth/sign-in')}>{t('customer.signin.cta')}</Button>
          </Card>
        )}
        {step < 4 && <Button block variant="ghost" onClick={cancel}>{t('customer.reset.cancel')}</Button>}
      </div>
    </AuthShell>
  );
}
