import { Notice } from '../../../components/molecule/Notice/Notice';
import { useCustomerRows } from '../useCustomerRows';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useWhatsappLink } from '../../admin/settings';
import { Button } from '../../../components/atom/Button/Button';
import { Card } from '../../../components/molecule/Card/Card';
import { Accordion } from '../../../components/molecule/Accordion/Accordion';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import type { FaqEntryRow } from '../../../data/schema';
import type { FaqGroup } from '../hooks';
import { PageHead } from '../ui';

/** C-14 / C-15 FAQ — questions come from `faq_entries`, grouped by section, two pages so the accordion stays short. */
export function FaqPage({ page }: { page: 1 | 2 }) {
  const { t, bi } = useI18n();
  // 0047: the concierge button is a `support` handoff; the message has no name here (the page does not know it).
  const wa = useWhatsappLink();
  const support = wa.resolve('support');
  const { rows, loading, error, retry } = useCustomerRows<FaqEntryRow>('faq_entries', { where: { published: true }, orderBy: { column: 'sort' } });
  const groups: FaqGroup[] = [];
  for (const row of rows.filter(r => r.page === page)) {
    const group = groups.find(g => g.key === row.group_key);
    if (group) group.items.push(row);
    else groups.push({key: row.group_key, title: row.group_title, lead: row.group_lead, items: [row]});
  }
  const totalPages = Math.max(1, ...rows.map(r => r.page));
  const hasNext = rows.some(r => r.page > page);
  return (
    <div className="container page cust-page">
      <PageHead back={page === 1 ? '/app/more' : '/app/faq'} title={t('customer.faq.title')} sub={t('customer.faq.page', { n: page, total: totalPages })} eyebrow={`C-1${page === 1 ? 4 : 5}`} />
      <div className="stack">
        {loading && groups.length === 0 && <EmptyState compact tone="loading" title={t('core.common.loading')} />}
        {error && <Notice tone="danger" action={<Button onClick={retry}>{t('customer.support.retry')}</Button>}>{t('customer.support.readError')}</Notice>}
        {!loading && !error && groups.length === 0 && <EmptyState icon="help" title={t('customer.faq.empty')} body={t('customer.faq.empty.body')} />}
        {groups.map((s) => (
          <section key={s.key} className="stack-sm">
            <div><h2 className="cust-h2">{bi(s.title)}</h2><p className="small muted">{bi(s.lead)}</p></div>
            <Accordion items={s.items.map((q) => ({ id: q.id, question: bi(q.question), answer: <>{bi(q.answer)}{/planes|plans|precio|price|cuesta|cost/i.test(bi(q.answer)) && <> <Link to="/app/plans">{t('customer.faq.plansLink')} →</Link></>}</> }))} />
          </section>
        ))}
        {page === 1 && hasNext
          ? <Link to="/app/faq/2"><Button block variant="secondary">{t('customer.faq.next')} →</Button></Link>
          : <Card tone="highlight" className="stack-sm"><div className="row-between wrap"><span className="small">{t('customer.faq.concierge')}</span><a href={wa.link('support', t('customer.more.whatsapp.textAnon'))} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary">WhatsApp →</Button></a></div>{support.note && <p className="xs muted">{bi(support.note)}</p>}</Card>}
      </div>
    </div>
  );
}
