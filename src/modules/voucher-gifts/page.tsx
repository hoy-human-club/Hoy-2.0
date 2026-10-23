import {Fragment} from 'react';
import {useI18n} from '../../i18n/I18nProvider';
import {useLayout} from '../../layout/useLayout';
import {Notice} from '../../components/molecule/Notice/Notice';
import {VoucherGiftDemo} from '../../components/organism/VoucherGiftDemo/VoucherGiftDemo';
import {giftDemoSpec} from './spec';
export function VoucherGiftPage(){
 const {t}=useI18n(),{sections,isVisible}=useLayout(giftDemoSpec);
 const blocks={notice:<Notice tone="warn">{t('giftDemo.boundary')}</Notice>,rehearsal:<VoucherGiftDemo/>};
 return <div className="container page cust-page"><h1>{t('giftDemo.title')}</h1><div className="stack">{sections.filter(isVisible).map(s=><Fragment key={s}>{blocks[s as keyof typeof blocks]}</Fragment>)}</div></div>;
}
