import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getRoutes } from '../../app/registry';
import { ROLE_LABEL } from '../../auth/roles';
import { useSession } from '../../auth/SessionProvider';
import { useTheme } from '../../design/ThemeProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { useLayout } from '../../layout/useLayout';
import { Badge } from '../../components/atom/Badge/Badge';
import { Button } from '../../components/atom/Button/Button';
import { Icon, type IconName } from '../../components/atom/Icon/Icon';
import { Wordmark } from '../../components/atom/Wordmark/Wordmark';
import { Card } from '../../components/molecule/Card/Card';
import { LangToggle } from '../../components/molecule/LangToggle/LangToggle';
import { Notice } from '../../components/molecule/Notice/Notice';
import { PromotionPractice } from '../../components/organism/PromotionPractice/PromotionPractice';
import { promotionsGuideSpec } from './specs';
import './promotions-guide.css';

const WORKSPACES: { key: string; route: string; icon: IconName }[] = [
  { key: 'teacher', route: '/teach/promote', icon: 'share' },
  { key: 'recipient', route: '/app/vouchers', icon: 'gift' },
  { key: 'desk', route: '/staff/vouchers', icon: 'checkin' },
  { key: 'admin', route: '/admin/vouchers', icon: 'settings' },
];

export function PromotionsGuidePage() {
  const { t, bi } = useI18n();
  const { role, hasRole } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { sections, isVisible } = useLayout(promotionsGuideSpec);
  const routes = getRoutes();
  const content: Record<string, () => ReactNode> = {
    overview: () => <section className="promotions-guide-overview stack-sm" aria-labelledby="promotions-guide-title">
      <p className="eyebrow">{t('promotions.guide.eyebrow')}</p>
      <h1 id="promotions-guide-title">{t('promotions.guide.title')}</h1>
      <p className="promotions-guide-lead">{t('promotions.guide.lead')}</p>
      <p className="muted">{t('promotions.guide.everyone')}</p>
      <p className="small"><Badge tone="neutral">{t('promotions.guide.session', { role: bi(ROLE_LABEL[role]) })}</Badge></p>
    </section>,
    practice: () => <section aria-label={t('promotions.practice.title')}><PromotionPractice /></section>,
    workspaces: () => <section className="stack" aria-labelledby="promotions-workspaces-title">
      <header className="stack-sm"><h2 id="promotions-workspaces-title">{t('promotions.workspaces.title')}</h2><p className="muted">{t('promotions.workspaces.body')}</p></header>
      <div className="promotions-guide-workspaces">
        {WORKSPACES.map(workspace => {
          const route = routes.find(item => item.path === workspace.route);
          const allowed = !!route && hasRole(route.roles);
          return <Card key={workspace.key} title={t(`promotions.workspaces.${workspace.key}.title`)} icon={workspace.icon} className="promotions-guide-workspace">
            <p className="muted">{t(`promotions.workspaces.${workspace.key}.body`)}</p>
            {allowed ? <Link className="btn btn-secondary btn-md" to={workspace.route}>{t('promotions.workspaces.open')}<Icon name="arrow-right" size="sm" /></Link> : <p className="small">{t(route ? 'promotions.workspaces.restricted' : 'promotions.workspaces.unavailable')}</p>}
            {route && <p className="xs muted">{t('promotions.workspaces.roles', { roles: route.roles.map(item => bi(ROLE_LABEL[item])).join(' · ') })}</p>}
          </Card>;
        })}
      </div>
    </section>,
  };

  return <div className="promotions-guide">
    <header className="promotions-guide-topbar">
      <div className="promotions-guide-wrap promotions-guide-nav">
        <Link className="promotions-guide-brand" to="/hub" aria-label={t('promotions.guide.back')}><Wordmark height={28} /></Link>
        <div className="row">
          <LangToggle />
          <Button variant="ghost" icon={theme === 'dark' ? 'moon' : 'sun'} aria-label={t('core.theme.toggle')} onClick={toggleTheme} />
          <Link className="promotions-guide-back" to="/hub"><Icon name="arrow-left" size="sm" />{t('promotions.guide.back')}</Link>
        </div>
      </div>
    </header>
    <main className="promotions-guide-wrap promotions-guide-main">
      <div className="stack-sm">
        <div><Badge tone="highlight">{t('promotions.guide.preview')}</Badge></div>
        <Notice title={t('promotions.guide.sandbox.title')} icon="shield">{t('promotions.guide.sandbox.body')}</Notice>
      </div>
      {sections.map(section => isVisible(section) && content[section] ? <Fragment key={section}>{content[section]()}</Fragment> : null)}
    </main>
  </div>;
}
