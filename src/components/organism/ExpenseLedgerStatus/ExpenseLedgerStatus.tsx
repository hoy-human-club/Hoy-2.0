import { Notice } from '../../molecule/Notice/Notice';
import { Button } from '../../atom/Button/Button';
export interface ExpenseLedgerStatusProps {
 boundary:string;readError:boolean;error:string;notice:string;busy:boolean;blocked:boolean;retryable:boolean;
 readText:string;errorText:string;noticeText:string;retryText:string;cancelText:string;summary?:string;
 onRead:()=>void;onRetry:()=>void;onCancel:()=>void;
}
/** M09c command feedback only; never reveals or duplicates an expense's entered body. */
export function ExpenseLedgerStatus(p:ExpenseLedgerStatusProps){return <div className="stack-sm" data-expense-status>
 <Notice>{p.boundary}</Notice>
 {p.readError&&<Notice tone="danger" action={<Button size="sm" onClick={p.onRead}>{p.retryText}</Button>}>{p.readText}</Notice>}
 {p.error&&<Notice tone="danger" action={!p.readError&&p.retryable?<Button size="sm" disabled={p.blocked} onClick={p.onRetry}>{p.retryText}</Button>:undefined}>{p.errorText}</Notice>}
 {p.notice&&<Notice tone={p.notice==='saved'?'success':'warn'}>{p.noticeText}{p.notice==='saved'&&p.summary&&<p>{p.summary}</p>}</Notice>}
 {(p.busy||p.retryable)&&<div className="row"><Button size="sm" variant="ghost" onClick={p.onCancel}>{p.cancelText}</Button></div>}
 </div>;}
