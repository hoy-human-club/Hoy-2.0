import {useI18n} from '../../../i18n/I18nProvider';
import {Card} from '../../molecule/Card/Card';
import {Notice} from '../../molecule/Notice/Notice';
import {Button} from '../../atom/Button/Button';
export type CustomerCancellationPhase='loading'|'read_error'|'ready'|'busy'|'stopped'|'unconfirmed'|'stale'|'unavailable'|'success';
export interface CancellationPresentation {late:boolean;returnsClass:boolean;verifiable:boolean;deadline:string;expiresAt:string|null;frozen:boolean;waitlistBookable:boolean}
export interface CustomerCancellationReviewProps {
 phase:CustomerCancellationPhase;review?:CancellationPresentation|null;result?:{returned:boolean;offerRecorded:boolean}|null;
 onConfirm?:()=>void;onRetry?:()=>void;onReload?:()=>void;onStop?:()=>void;onDone?:()=>void;
}
/** Provider-free view of an own-booking review; never receives user, ledger, receipt or waiter rows. */
export function CustomerCancellationReview({phase,review,result,onConfirm,onRetry,onReload,onStop,onDone}:CustomerCancellationReviewProps){
 const {t}=useI18n(),key=(name:string)=>t('customer.cancel.atomic.'+name);
 return <div className="stack" data-customer-cancellation data-phase={phase} aria-busy={phase==='busy'}><p className="small muted">{key('boundary')}</p>
 {phase==='loading'&&<p role="status">{key('loading')}</p>}
 {phase==='read_error'&&<Notice tone="danger">{key('readError')}</Notice>}
 {phase==='busy'&&<Notice>{key('busy')}</Notice>}
 {['stopped','unconfirmed','stale','unavailable'].includes(phase)&&<Notice tone="warn">{key(phase)}</Notice>}
 {review&&phase!=='success'&&<Card><div className="stack-sm">{!review.verifiable?<Notice tone="warn">{key('unverifiable')}</Notice>:review.late?<><strong>{key('late')}</strong><p>{key('lateBody')}</p></>:review.returnsClass?<><strong>{key('free')}</strong><p>{key('terms')}</p><p>{review.expiresAt?`${key('expiry')}: ${review.expiresAt}`:key('noExpiry')}</p>{review.frozen&&<p>{key('frozen')}</p>}</>:<><strong>{key('nonpackage')}</strong><p>{key('nonpackageBody')}</p></>}<p className="small muted">{key('deadline')}: {review.deadline}</p><p className="small muted">{key(review.waitlistBookable?'waitlist':'noOffer')}</p></div></Card>}
 {phase==='success'&&result&&<Notice tone="success" title={key('success')}><p>{key(result.returned?'returned':'noReturn')}</p>{result.returned&&<p>{key('terms')}</p>}{result.offerRecorded&&<p>{key('offerRecorded')}</p>}</Notice>}
 <div className="row wrap">{phase==='ready'&&review&&<Button variant="danger" disabled={!review.verifiable||!onConfirm} onClick={onConfirm}>{key('confirm')}</Button>}{phase==='busy'&&<Button variant="secondary" disabled={!onStop} onClick={onStop}>{key('stop')}</Button>}{['stopped','unconfirmed','stale','unavailable'].includes(phase)&&<Button disabled={!onRetry} onClick={onRetry}>{key('retry')}</Button>}{['read_error','ready','stopped','unconfirmed','stale','unavailable'].includes(phase)&&<Button variant="secondary" disabled={!onReload} onClick={onReload}>{key('reload')}</Button>}{phase==='success'&&<Button disabled={!onDone} onClick={onDone}>{key('done')}</Button>}</div>
 </div>;
}
