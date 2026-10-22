import {useI18n} from '../../../i18n/I18nProvider';
import {Notice} from '../Notice/Notice';
import {Button} from '../../atom/Button/Button';
import type {useOperationalCatalog,useReviewedQuote} from '../../../modules/quotes/hooks';
/** A visible review boundary for a frozen fictional purchase quote. */
export function QuoteNotice({catalog,review}:{catalog:ReturnType<typeof useOperationalCatalog>;review:ReturnType<typeof useReviewedQuote>}){
 const {t}=useI18n();
 return <Notice tone={review.stale||!review.available?'warn':'info'}><div className="stack-sm"><p>{t('quotes.mock')}</p>{review.stale?<p>{t('quotes.stale')}</p>:!review.available?<p>{t('quotes.unavailable')}</p>:null}{review.quote&&<p className="small">{t('quotes.summary',{date:review.quote.purchaseDate,revision:review.quote.catalogRevision,classes:review.quote.classes,days:review.quote.validityDays??review.quote.fallbackValidityDays??t('quotes.noExpiry')})}</p>}{catalog.failed?<Button variant="secondary" onClick={catalog.retry}>{t('quotes.retry')}</Button>:review.stale?<Button variant="secondary" disabled={catalog.loading} onClick={review.review}>{t('quotes.review')}</Button>:null}</div></Notice>;
}
