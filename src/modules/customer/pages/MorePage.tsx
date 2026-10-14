import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { pendingSuffix, useContact, useOpeningHours, useWhatsappLink } from '../../admin/settings';
import { useSession } from '../../../auth/SessionProvider';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Avatar } from '../../../components/atom/Avatar/Avatar';
import { Badge } from '../../../components/atom/Badge/Badge';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { useEntitlements, useMyProfile } from '../hooks';
import { policy } from '../policy';
import { PageHead } from '../ui';
import { Icon } from '../../../components/atom/Icon/Icon';
import { useActions } from '../../../actions';
import type { ActionHandler } from '../../../actions/types';
import { CONTACT_INTENTS, type ContactIntent } from '../../../tenant/contacts';
import { canvasSpecs } from '../specs';

const spec = canvasSpecs['C-25'];

/** C-25 More — profile, rules, contact and everything one level down. */
export function MorePage() {
  const { t, bi, lang } = useI18n();
  const contact = useContact();
  // 0041: M-08a weekly hours + M-08g exceptions, with today's line in the studio's time zone.
  const hours = useOpeningHours();
  // 0047: the row is a `support` handoff (M-08a contacts; the front desk by default).
  const wa = useWhatsappLink();
  const support = wa.resolve('support');
  const nav = useNavigate();
  const { user, devMode, switchUser } = useSession();
  const { profile } = useMyProfile();
  const ent = useEntitlements();
  const name = profile?.full_name ?? user.name;
  const planLine = ent.plan ? bi({ es: ent.plan.name_es, en: ent.plan.name_en }) : t('customer.profile.noPlan');

  // 0047 WebMCP: `contact.whatsapp` answers the resolved number and link for a topic; it opens nothing.
  const impl = useMemo<Record<string, ActionHandler>>(() => ({
    'contact.whatsapp': (p) => {
      const intent = (p?.intent?.trim() || 'frontDesk') as ContactIntent;
      if (!CONTACT_INTENTS.includes(intent)) throw new Error(`intent must be one of ${CONTACT_INTENTS.join(', ')}`);
      const r = wa.resolve(intent);
      return `${r.resolvedIntent}${r.name ? ` (${r.name})` : ''} ${r.whatsapp} ${wa.link(intent, p?.text?.trim() || undefined)}${r.note ? ` — ${r.note.en}` : ''}`;
    },
  }), [wa]);
  useActions(spec, impl);

  return (
    <div className="container page cust-page">
      <PageHead title={t('core.nav.more')} />
      <div className="stack">
        <Card interactive onClick={() => nav('/app/profile')} className="row" padding="md">
          <Avatar name={name} initials={profile?.initials ?? user.initials} src={profile?.photo_url} size={52} />
          <div className="grow stack-sm">
            <strong>{name}</strong>
            <div className="row wrap small muted">{planLine}{ent.pkg.left > 0 && <span>· {t('customer.checkout.package.sub', { n: ent.pkg.left })}</span>}{!ent.pkg.purchase && !ent.membership && <Badge tone="highlight">{t('customer.more.planPrompt')}</Badge>}</div>
          </div>
          <span className="listrow-chevron" aria-hidden><Icon name="chevron-right" size="sm" /></span>
        </Card>

        <ListGroup>
          <ListRow icon="profile" title={t('core.nav.profile')} subtitle={`${t('customer.profile.edit')} · ${t('customer.classes.title')}`} to="/app/profile" />
          <ListRow icon="coins" title={t('customer.classes.title')} subtitle={t('customer.more.classes.sub')} to="/app/classes" />
          <ListRow icon="flame" title={t('customer.practice.title')} subtitle={t('customer.practice.more.sub')} to="/app/practice" />
          <ListRow icon="ticket" title={t('core.nav.plans')} subtitle={t('customer.more.plans.sub')} to="/app/plans" />
          <ListRow icon="policies" title={t('customer.rules.title')} subtitle={t('customer.more.rules.sub')} to="/app/rules" />
          <ListRow icon="whatsapp" title={t('customer.more.whatsapp')} subtitle={`${wa.display('support', lang)} · ${support.note ? bi(support.note) : bi(policy.replyWindow)}`} href={wa.link('support', t('customer.more.whatsapp.text', { name: name.split(' ')[0] }))} />
          <ListRow icon="mail" title={t('customer.more.email')} subtitle={`${contact.email}${pendingSuffix(contact, 'email', lang)}`} href={`mailto:${contact.email}`} />
          <ListRow icon="map-pin" title={t('customer.more.visit')} subtitle={`${contact.address}, ${contact.city}${pendingSuffix(contact, 'address', lang)}`} href={contact.location.link ?? `https://www.google.com/maps/search/?api=1&query=${contact.location.lat},${contact.location.lng}`} />
          <ListRow icon="clock" title={t('customer.more.hours')} subtitle={<><span>{bi(hours.sentence)}</span><br /><strong className="xs" data-testid="more-today">{bi(hours.today)}</strong></>} />
        </ListGroup>

        <ListGroup>
          <ListRow icon="invite" title={t('customer.invite.title')} to="/app/invite" />
          <ListRow icon="gift" title={t('customer.gift.title')} to="/app/gift" />
          <ListRow icon="ticket" title={t('vouchers.title')} to="/app/vouchers" />
          <ListRow icon="sparkle" title={t('customer.events.title')} to="/app/events" />
          <ListRow icon="users" title={t('customer.teachers.title')} to="/app/teachers" />
          <ListRow icon="help" title={t('customer.faq.title')} to="/app/faq" />
          <ListRow icon="credit-card" title={t('customer.pay.title')} to="/app/payment-methods" />
          <ListRow icon="bell" title={t('customer.notifications.title')} to="/app/notifications" />
          <ListRow icon="user-cog" title={t('customer.account.title')} subtitle={t('customer.account.sub')} to="/app/account" />
        </ListGroup>

        {devMode && (
          <ListGroup title={t('customer.more.states')}>
            <ListRow title="E-01 · " to="/app/state/empty" subtitle={t('customer.empty.title')} />
            <ListRow title="E-02" to="/app/state/declined" subtitle={t('customer.declined.title')} />
            <ListRow title="E-03" to="/app/state/cancelled" subtitle={t('customer.cancelled.title')} />
            <ListRow title="A-01 → A-03 · C-21 · E-04" to="/auth" subtitle={t('customer.more.authFlow')} />
          </ListGroup>
        )}

        <ListGroup>
          <ListRow icon="log-out" title={t('customer.profile.signOut')} onClick={() => { switchUser('public'); nav('/auth/sign-in'); }} />
        </ListGroup>
        <p className="xs muted" style={{ textAlign: 'center' }}>{tenant.legalName} · {contact.city}</p>
      </div>
    </div>
  );
}
