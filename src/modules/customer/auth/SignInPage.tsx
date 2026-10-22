import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { demoUsers } from '../../../auth/demoUsers';
import { ROLE_HOME, ROLE_LABEL } from '../../../auth/roles';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Input } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Avatar } from '../../../components/atom/Avatar/Avatar';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { policy } from '../policy';
import { AuthShell } from './AuthShell';
import { canvasSpecs } from '../specs';
import { useActions } from '../../../actions';
import { need } from '../actions';

const spec = canvasSpecs['A-02'];
import { customerAuthLink, customerReturn } from './customerReturn';
import { MS } from '../../../i18n/format';

export const ATTEMPTS_KEY = 'hoyos.auth.attempts';
export const LOCK_KEY = 'hoyos.auth.lockUntil';
const readAttempts = () => { try { return Number(sessionStorage.getItem(ATTEMPTS_KEY) ?? 0); } catch { return 0; } };

/** A-02 Sign in — demo mode: pick a demo user, or type a demo email. Providers arrive with Supabase Auth. */
export function SignInPage() {
  const { t, bi } = useI18n();
  const nav = useNavigate();
  const { switchUser } = useSession();
  const [params] = useSearchParams();
  const next = params.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(readAttempts);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const people = demoUsers.filter((u) => u.role !== 'public');

  const enterAs = (id: string) => { const u = demoUsers.find((x) => x.id === id)!; switchUser(u.id); try { sessionStorage.removeItem(ATTEMPTS_KEY); } catch { /* ignore */ } nav(u.role === 'customer' && customerReturn(next) ? customerReturn(next)! : ROLE_HOME[u.role]); };

  // WebMCP (0025): auth.signIn enters as a demo user and follows ?next= exactly like a tap on the picker.
  const enterRef = useRef(enterAs); enterRef.current = enterAs;
  const handlers = useMemo(() => ({
    'auth.signIn': (p?: Record<string, string>) => {
      const id = need(p, 'user');
      const signable = demoUsers.filter((x) => x.role !== 'public');
      const u = signable.find((x) => x.id === id);
      if (!u) throw new Error(`unknown demo user "${id}" — one of ${signable.map((x) => x.id).join(', ')}`);
      enterRef.current(u.id);
      return `signed in as ${u.id} (${u.role})`;
    },
  }), []);
  useActions(spec, handlers);

  const submit = (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    setTimeout(() => {
      const u = demoUsers.find((x) => x.email && x.email.toLowerCase() === email.trim().toLowerCase());
      if (u && password.length > 0) { enterAs(u.id); return; }
      const n = attempts + 1;
      setAttempts(n);
      try { sessionStorage.setItem(ATTEMPTS_KEY, String(n)); } catch { /* ignore */ }
      if (n >= policy.lockoutAttempts) {
        try { sessionStorage.setItem(LOCK_KEY, new Date(Date.now() + policy.lockoutMinutes * MS.min).toISOString()); } catch { /* ignore */ }
        nav('/auth/locked'); return;
      }
      setError(t('customer.signin.wrong', { n: policy.lockoutAttempts - n }));
      setBusy(false);
    }, 500);
  };

  return (
    <AuthShell>
      <div className="auth-col">
        <div className="stack-sm auth-intro"><h1 className="cust-title">{t('customer.signin.title')}</h1><p className="muted small">{t('customer.signin.sub')}</p></div>

        <ListGroup title={t('customer.signin.demo')}>
          {people.map((u) => <ListRow key={u.id} icon={<Avatar name={u.name} initials={u.initials} size={32} />} title={u.name} subtitle={bi(u.blurb)} trailing={<Badge tone={u.role === 'customer' ? 'primary' : 'neutral'}>{bi(ROLE_LABEL[u.role])}</Badge>} onClick={() => enterAs(u.id)} />)}
        </ListGroup>

        <Card padding="lg" className="stack">
          <form className="stack" onSubmit={submit} noValidate>
            <Field label={t('customer.form.email')} hint={t('customer.signin.emailHint')}>{(id) => <Input id={id} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juliana@demo.hoyos.test" />}</Field>
            <Field label={t('customer.form.password')}>{(id) => <Input id={id} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />}</Field>
            {error && <Notice tone="danger">{error}</Notice>}
            <Button type="submit" block size="lg" loading={busy}>{t('customer.signin.cta')}</Button>
            <Link to="/auth/recover" className="small" style={{ textAlign: 'center' }}>{t('customer.signin.forgot')}</Link>
          </form>
          <div className="auth-divider"><span>{t('customer.signin.or')}</span></div>
          <div className="stack-sm">
            <Button block variant="secondary" disabled icon="">{t('customer.signin.apple')}</Button>
            <Button block variant="secondary" disabled icon="G">{t('customer.signin.google')}</Button>
            <Button block variant="secondary" disabled icon="biometric">{t('customer.signin.biometric')}</Button>
            <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.signin.providersNote')}</p>
          </div>
        </Card>
        <p className="small" style={{ textAlign: 'center' }}>{t('customer.signin.new')} <Link to={customerAuthLink('/auth/sign-up', params)}>{t('customer.signin.create')}</Link></p>
      </div>
    </AuthShell>
  );
}
