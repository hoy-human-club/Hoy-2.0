import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useContact } from '../../admin/settings';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import { useLayout } from '../../../layout/useLayout';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Avatar } from '../../../components/atom/Avatar/Avatar';
import { Input } from '../../../components/atom/Input/Input';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { LangToggle } from '../../../components/molecule/LangToggle/LangToggle';
import { Skeleton } from '../../../components/atom/Skeleton/Skeleton';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { canvasSpecs } from '../specs';
import { NOTIF_CHANNELS, useEntitlements, useNotificationPrefs } from '../hooks';
import { PageHead } from '../ui';
import { Icon } from '../../../components/atom/Icon/Icon';

import { useOwnProfile } from '../useOwnProfile';
import { profileErrors, profileRevision, saveOwnProfile } from '../profileSave';

const spec = canvasSpecs['C-19'];

/** C-19 Profile, settings and the 12-class package (0051: was membership). */
export function ProfilePage() {
  const { t, bi, lang } = useI18n();
  const contact = useContact();
  const nav = useNavigate();
  const data = useData();
  const { user, role, switchUser } = useSession();
  const { sections, isVisible } = useLayout(spec);
  const own = useOwnProfile(data,user.id);
  const { profile, account } = own;
  const ent = useEntitlements();
  const prefs = useNotificationPrefs();
  const [edit, setEdit] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: '', phone: '', birthday: '', ec_name: '', ec_phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [busy,setBusy]=useState(false);
  const [saveError,setSaveError]=useState<string|null>(null);
  const attempt=useRef<{cancelled:boolean}|null>(null);
  const expected=useRef('');
  const request=useRef('');
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const closeEdit=()=>{if(attempt.current)attempt.current.cancelled=true;attempt.current=null;setEdit(false);setBusy(false);setSaveError(null);};
  useEffect(()=>{setEdit(false);setSaved(null);setBusy(false);setSaveError(null);return()=>{if(attempt.current)attempt.current.cancelled=true;attempt.current=null;clearTimeout(timer.current);};},[data,user.id,role]);
  // Keep the existing automatic locale preference; contain storage failures.
  useEffect(() => { let active=true; if (account && account.locale !== lang) void data.update('users', account.id, { locale: lang }).catch(()=>{if(active)setSaveError('customer.profile.atomic.locale');}); return()=>{active=false;}; }, [lang, account, data]);
  const openEdit = async () => {
    if(!profile||!account||own.status!=='ready')return;
    if(attempt.current)attempt.current.cancelled=true;
    const context={cancelled:false};attempt.current=context;
    const revision=await profileRevision({profile,account});if(context.cancelled)return;
    expected.current=revision;request.current=crypto.randomUUID();
    setForm({full_name:profile.full_name,phone:account.phone??`${tenant.dialCode} `,birthday:profile.birthday??'',ec_name:profile.emergency_contact?.name??'',ec_phone:profile.emergency_contact?.phone??`${tenant.dialCode} `});setErrors({});setSaveError(null);setEdit(true);
  };
  const flash = (msg:string) => {clearTimeout(timer.current);setSaved(msg);timer.current=setTimeout(()=>setSaved(null),2500);};
  const save = async () => {
    if(busy||!attempt.current||attempt.current.cancelled)return;
    const e=profileErrors(form);setErrors(Object.fromEntries(Object.entries(e).map(([k,v])=>[k,t(v)])));if(Object.keys(e).length)return;
    const current=attempt.current;
    // Synchronous latch closes the double-click gap before React paints busy.
    if('saving' in current)return;
    Object.assign(current,{saving:true});setBusy(true);setSaveError(null);
    try {
      await saveOwnProfile(data,{actorId:user.id,role,requestId:request.current,expected:expected.current,form},()=>current.cancelled);
      if(current.cancelled||attempt.current!==current)return;
      setEdit(false);flash(t('customer.profile.saved'));
    }catch(error){if(!current.cancelled&&attempt.current===current)setSaveError(String(error).includes('stale')?'customer.profile.atomic.stale':'customer.profile.atomic.failure');}
    finally{delete (current as {saving?:boolean}).saving;if(!current.cancelled&&attempt.current===current)setBusy(false);}
  };
  const onPhoto = (file: File | undefined) => {
    if (!file || !profile) return;
    if (file.size > 1_500_000) { flash(t('customer.profile.photoTooBig')); return; }
    const reader = new FileReader();
    reader.onload = async () => { await data.update('profiles', profile.id, { photo_url: String(reader.result) }); flash(t('customer.profile.saved')); };
    reader.readAsDataURL(file);
  };
  const verifyWhatsapp = async () => { if (profile) { await data.update('profiles', profile.id, { whatsapp_verified: true }); flash(t('customer.profile.whatsapp.verified')); } };
  const signOut = () => { switchUser('public'); nav('/auth/sign-in'); };

  const name = profile?.full_name ?? user.name;

  const SECTIONS: Record<string, () => ReactNode> = {
    'Header (photo, name, membership badge)': () => (
      <Card className="row wrap" padding="lg">
        <label className="cust-photo">
          <Avatar name={name} initials={profile?.initials ?? user.initials} src={profile?.photo_url} size={72} />
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
          <span className="cust-photo-edit" aria-hidden><Icon name="edit" size="xs" /></span>
          <span className="sr-only">{t('customer.profile.changePhoto')}</span>
        </label>
        <div className="grow stack-sm">
          {profile ? <h1 className="cust-title" style={{ fontSize: 'var(--fs-xl)' }}>{name}</h1> : <Skeleton width={180} height={24} />}
          <div className="row wrap">
            {ent.plan ? <Badge tone={ent.membership?.status === 'paused' || ent.pkg.frozen ? 'warn' : 'success'}>{bi({ es: ent.plan.name_es, en: ent.plan.name_en })}</Badge> : <Badge tone="neutral">{t('customer.profile.noPlan')}</Badge>}
            {profile && !profile.whatsapp_verified && <button type="button" className="cust-linkbtn" onClick={verifyWhatsapp}><Badge tone="warn">{t('customer.profile.whatsapp.verify')}</Badge></button>}
          </div>
          <span className="small muted">{account?.email ?? user.email}{account?.phone ? ` · ${account.phone}` : ''}</span>
        </div>
      </Card>
    ),
    EditProfile: () => <Button block variant="secondary" disabled={own.status!=='ready'} onClick={()=>void openEdit()}>{t('customer.profile.edit')}</Button>,
    'MembershipRow → plan management': () => (
      <ListGroup title={t('customer.profile.account')}>
        <ListRow icon="coins" title={t('customer.classes.title')} subtitle={ent.pkg.purchase ? t('customer.checkout.package.sub', { n: ent.pkg.left }) : t('customer.profile.noPlan')} to="/app/classes" trailing={ent.pkg.frozen ? <Badge tone="warn">{t('customer.classes.frozen.badge')}</Badge> : undefined} />
        <ListRow icon="history" title={t('core.nav.history')} to="/app/history" />
        <ListRow icon="flame" title={t('customer.practice.title')} subtitle={t('customer.practice.more.sub')} to="/app/practice" />
      </ListGroup>
    ),
    PaymentMethods: () => <ListGroup><ListRow icon="credit-card" title={t('customer.pay.title')} subtitle={t('customer.profile.pay.sub')} to="/app/payment-methods" /></ListGroup>,
    'NotificationPrefs (push / email / WhatsApp)': () => (
      <section className="stack-sm" data-preference-surface="master" aria-label={t('customer.profile.notifications')}>
        <Notice tone="info">{t('customer.prefs.mock')}</Notice>
        {prefs.status==='loading'&&<Notice>{t('customer.prefs.loading')}</Notice>}
        {prefs.error&&<Notice tone="warn" action={<Button size="sm" variant="secondary" onClick={()=>void Promise.resolve(prefs.retry()).catch(()=>{})}>{t(prefs.error==='save'?'customer.prefs.retry':'customer.prefs.reload')}</Button>}>{t(`customer.prefs.${prefs.error}`)}</Notice>}
        {prefs.saved&&<Notice tone="success">{t('customer.prefs.saved')}</Notice>}
        <ListGroup title={t('customer.profile.notifications')}>
          {NOTIF_CHANNELS.map((k) => <ListRow key={k} icon={k === 'whatsapp' ? 'whatsapp' : k === 'push' ? 'bell' : 'mail'} title={t(`customer.profile.notif.${k}`)} subtitle={t(`customer.profile.notif.${k}.sub`)} trailing={<Toggle size="sm" disabled={prefs.status!=='ready'||prefs.busy} checked={prefs.channelOn(k)} onChange={(v) => { void prefs.setChannel(k, v).catch(()=>{}); }} label="" />} />)}
          <ListRow icon="sliders" title={t('customer.notifications.prefs.title')} subtitle={t('customer.notifications.prefs.byCategory')} to="/app/notifications" />
          <ListRow icon="bell" title={t('customer.notifications.title')} to="/app/notifications" />
        </ListGroup>
        {prefs.busy&&<Notice action={<Button size="sm" variant="secondary" onClick={prefs.cancel}>{t('customer.prefs.cancel')}</Button>}>{t('customer.prefs.saving')}</Notice>}
      </section>
    ),
    'LanguageToggle (EN / ES)': () => <ListGroup><ListRow icon="languages" title={t('customer.profile.language')} subtitle={t('customer.profile.language.sub')} trailing={<LangToggle size="sm" />} /></ListGroup>,
    'LeaveAReview → Google / Instagram': () => (
      <ListGroup title={t('customer.profile.review')}>
        <ListRow icon="star" title={t('customer.profile.review.google')} href={`https://www.google.com/search?q=${encodeURIComponent(`${tenant.legalName} ${tenant.city}`)}`} />
        <ListRow icon="at-sign" title={t('customer.profile.review.instagram')} subtitle={contact.instagram} href={contact.instagramUrl} />
      </ListGroup>
    ),
    'Legal links': () => (
      <ListGroup title={t('customer.profile.legal')}>
        <ListRow icon="user-cog" title={t('customer.account.title')} subtitle={t('customer.account.sub')} to="/app/account" />
        <ListRow title={t('customer.profile.legal.terms')} to="/app/legal/terms" />
        <ListRow title={t('customer.profile.legal.privacy')} subtitle={t('customer.profile.legal.law')} to="/app/legal/privacy" />
        <ListRow title={t('customer.legal.kind.waiver')} subtitle={t('customer.legal.kind.house-rules')} to="/app/legal/waiver" />
        <ListRow title={t('customer.faq.title')} to="/app/faq" />
      </ListGroup>
    ),
    'SignOut / DeleteAccount': () => (
      <ListGroup>
        <ListRow icon="log-out" title={t('customer.profile.signOut')} onClick={signOut} />
        <ListRow icon="trash" tone="danger" title={t('customer.profile.delete')} subtitle={t('customer.profile.delete.sub')} to="/app/account" />
      </ListGroup>
    ),
  };

  return (
    <div className="container page cust-page">
      <PageHead title={t('customer.profile.title')} />
      {own.status==='loading' && <Notice>{t('customer.profile.atomic.loading')}</Notice>}
      {own.status==='error' && <Notice tone="danger">{t('customer.profile.atomic.readError')} <Button variant="ghost" onClick={own.retry}>{t('customer.profile.atomic.retry')}</Button></Notice>}
      {!edit && saveError && <Notice tone="danger">{t(saveError)}</Notice>}
      {saved && <Notice tone="success">{saved}</Notice>}
      <div className="stack">
        {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
      </div>

      <Drawer open={edit} onClose={closeEdit} side="bottom" title={t('customer.profile.edit')} footer={<><Button variant="ghost" onClick={closeEdit}>{t('core.common.cancel')}</Button><Button disabled={busy} onClick={()=>void save()}>{t('core.common.save')}</Button></>}>
        <div className="stack" aria-busy={busy}>
          <Notice>{t('customer.profile.atomic.mock')}</Notice>
          {saveError && <Notice tone="danger">{t(saveError)}</Notice>}
          {busy && <Notice>{t('customer.profile.atomic.saving')}</Notice>}
          <Field label={t('customer.form.name')} required error={errors.full_name}>{(id) => <Input disabled={busy} id={id} value={form.full_name} onChange={(e) => (request.current=crypto.randomUUID(),setForm({ ...form, full_name: e.target.value }))} autoComplete="name" />}</Field>
          <Field label={t('customer.form.whatsapp')} required hint={t('customer.form.whatsapp.hint', { dial: tenant.dialCode })} error={errors.phone}>{(id) => <Input disabled={busy} id={id} value={form.phone} inputMode="tel" onChange={(e) => (request.current=crypto.randomUUID(),setForm({ ...form, phone: e.target.value }))} autoComplete="tel" />}</Field>
          <Field label={t('customer.form.birthday')} hint={t('customer.form.birthday.hint')} error={errors.birthday}>{(id) => <Input disabled={busy} id={id} type="date" value={form.birthday} onChange={(e) => (request.current=crypto.randomUUID(),setForm({ ...form, birthday: e.target.value }))} />}</Field>
          <div className="eyebrow">{t('customer.form.emergency')}</div>
          <Field label={t('customer.form.name')}>{(id) => <Input disabled={busy} id={id} value={form.ec_name} onChange={(e) => (request.current=crypto.randomUUID(),setForm({ ...form, ec_name: e.target.value }))} />}</Field>
          <Field label={t('customer.form.phone')} error={errors.ec_phone}>{(id) => <Input disabled={busy} id={id} value={form.ec_phone} inputMode="tel" onChange={(e) => (request.current=crypto.randomUUID(),setForm({ ...form, ec_phone: e.target.value }))} />}</Field>
        </div>
      </Drawer>
    </div>
  );
}
