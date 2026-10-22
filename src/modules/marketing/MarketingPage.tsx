import {useLayout} from '../../layout/useLayout';
import {MarketingDraftBoard} from '../../components/organism/MarketingDraftBoard/MarketingDraftBoard';
import {marketingSpec} from './specs';
export function MarketingPage(){const {isVisible}=useLayout(marketingSpec);return isVisible('MarketingDraftBoard')?<MarketingDraftBoard/>:null;}
