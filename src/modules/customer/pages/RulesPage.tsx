import { Notice } from '../../../components/molecule/Notice/Notice';
import { useCustomerRows } from '../useCustomerRows';
import { useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { ContentArticleRow } from '../../../data/schema';
import { Card } from '../../../components/molecule/Card/Card';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Button } from '../../../components/atom/Button/Button';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { useLocalPref } from '../hooks';
import { MediaPlaceholder, PageHead } from '../ui';
import { Icon } from '../../../components/atom/Icon/Icon';

/** C-13 Club rules & best practices — articles come from `content_articles` (M-02 edits them, no deploy). */
export function RulesPage() {
  const { t, bi } = useI18n();
  const { rows: articles, loading, error, retry } = useCustomerRows<ContentArticleRow>('content_articles', { where: { published: true }, orderBy: { column: 'sort' } });
  const [openId, setOpen] = useState<string | null>(null);
  const open = articles.find(a => a.id === openId) ?? null;
  // Read receipts stay per viewer (a convenience, not studio data): no table claims to own them.
  const [read, setRead] = useLocalPref<string[]>('rules.read', []);
  const tour = articles.find((a) => a.video_label);
  const markRead = (a: ContentArticleRow) => { if (!read.includes(a.slug)) setRead((r) => [...r, a.slug]); setOpen(null); };
  const paragraphs = (md: string) => md.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="container page cust-page">
      <PageHead back="/app/more" title={t('customer.rules.title')} sub={t('customer.rules.sub')} />
      <div className="stack">
        {tour && (
          <button type="button" className="cust-plainbtn" onClick={() => setOpen(tour.id)}>
            <MediaPlaceholder slotKey="studio.tour" label={bi(tour.video_label!)}><span className="cust-play" aria-hidden><Icon name="play" /></span></MediaPlaceholder>
          </button>
        )}
        {loading && articles.length === 0 && <EmptyState compact tone="loading" title={t('core.common.loading')} />}
        {error && <Notice tone="danger" action={<Button onClick={retry}>{t('customer.support.retry')}</Button>}>{t('customer.support.readError')}</Notice>}
        {!loading && !error && articles.length === 0 && <EmptyState title={t('customer.support.emptyRules')} />}
        {articles.length > 0 && (
          <ListGroup>
            {articles.map((a) => <ListRow key={a.id} icon={a.icon ?? 'info'} title={bi(a.title)} subtitle={bi(a.summary)} trailing={read.includes(a.slug) ? <Badge tone="success">{t('customer.rules.read')}</Badge> : a.required ? <Badge tone="danger">{t('customer.rules.required')}</Badge> : undefined} onClick={() => setOpen(a.id)} />)}
          </ListGroup>
        )}
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.rules.note')}</p>
      </div>
      <Drawer open={!!open} onClose={() => setOpen(null)} side="bottom" title={open ? bi(open.title) : ''} footer={open ? <Button onClick={() => markRead(open)}>{t('customer.rules.gotIt')}</Button> : undefined}>
        {open && (
          <div className="stack">
            {open.video_label && <MediaPlaceholder label={bi(open.video_label)}><span className="cust-play" aria-hidden><Icon name="play" /></span></MediaPlaceholder>}
            {paragraphs(bi(open.body_md)).map((p, i) => <p key={i} className="small">{p}</p>)}
            {open.checklist && open.checklist.length > 0 && <Card tone="muted" eyebrow={t('customer.rules.checklist')}><ul className="cust-checklist small">{open.checklist.map((c, i) => <li key={i}>{bi(c)}</li>)}</ul></Card>}
          </div>
        )}
      </Drawer>
    </div>
  );
}
