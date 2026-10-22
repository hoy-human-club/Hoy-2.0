import {useI18n} from '../../../i18n/I18nProvider';
import {Card} from '../../molecule/Card/Card';
import {Notice} from '../../molecule/Notice/Notice';
import {EmailPreview} from '../EmailPreview/EmailPreview';
import './StudioCancellationReview.css';
import {studioStrings as copy} from '../../../modules/classSchedule/studioStrings';
/** Presentation only: counts and preview text, never provider/session/ledger business rows. */
export interface StudioReviewPresentation {
 activeCount:number;verifiedCount:number;voucherSeats:number;waitlistCount:number;cannotVerify:boolean;
 emails:{subject:string;body:string;cta?:{label:string;href:string};warnings:readonly string[]}[];
}
/** Review only: all commands stay in the scoped module controller. No email sender. */
export function StudioCancellationReview({review}:{review:StudioReviewPresentation}){
 const {bi}=useI18n();
 return <div className="stack" data-studio-review><Card title={bi(copy.summary)}><p>{review.activeCount} / {review.verifiedCount} / {review.voucherSeats} / {review.waitlistCount}</p><p className="small muted">{bi(copy.waitlist)}</p></Card>{review.cannotVerify&&<Notice tone="warn">{bi(copy.blocked)}</Notice>}{review.emails.map((email,n)=><section className="stack-sm" key={n}><h3>{bi(copy.preview)} {n+1}</h3>{email.warnings.length>0&&<Notice tone="warn">{bi(copy.warning)}</Notice>}{email.subject&&email.body&&<EmailPreview subject={email.subject} body={email.body} cta={email.cta} footer={bi(copy.ownEmail)}/>}</section>)}</div>;
}
