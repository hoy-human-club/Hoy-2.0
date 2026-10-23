import { useState } from 'react';
import {useI18n} from '../../../i18n/I18nProvider';
import type {DemoSignInPolicy,DemoSignInState} from '../../../modules/customer/auth/mockSignIn';
import {DEMO_MEMBER_EMAIL} from '../../../modules/customer/auth/mockSignIn';
import {Card} from '../../molecule/Card/Card';
import {Notice} from '../../molecule/Notice/Notice';
import {OtpInput} from '../../molecule/OtpInput/OtpInput';
import {Button} from '../../atom/Button/Button';
export interface DemoSignInPanelProps {
 state:DemoSignInState; policy:Readonly<DemoSignInPolicy>; now:number; disabled?:boolean;
 onSend:(fail?:boolean)=>void;onVerify:(code:string)=>void;onGoogle:()=>void;
 onGoogleResult:(result:'continue'|'cancel'|'unavailable')=>void;onCancel:()=>void;
}
/** Controlled fictional-account journey; never accepts a real address, password or OAuth grant. */
export function DemoSignInPanel({state,policy,now,disabled,onSend,onVerify,onGoogle,onGoogleResult,onCancel}:DemoSignInPanelProps){
 const{t}=useI18n();const[entered,setEntered]=useState('');
 const blocked=!!disabled||['unavailable','locked','complete','sending'].includes(state.status);
 const resend=Math.max(0,Math.ceil((state.resendAt-now)/1000));
 const verify=(code:string)=>{setEntered('');onVerify(code);};
 return <Card padding="lg" className="stack demo-signin" title={t('customer.signin.preview.title')}>
  <Notice tone="info">{t('customer.signin.preview.boundary')}</Notice>
  <p className="small">{t('customer.signin.preview.account')} <strong>{DEMO_MEMBER_EMAIL}</strong></p>
  {disabled||state.status==='unavailable'?<Notice tone="warn">{t('customer.signin.preview.unavailable')}</Notice>:<>
   <p className="xs muted">{t('customer.signin.preview.rules',{min:policy.validMinutes,sec:policy.resendSeconds,n:policy.attempts,lock:policy.lockMinutes})}</p>
   <div aria-live="polite" className="stack-sm">
    {state.status==='sending'&&<Notice tone="info">{t('customer.signin.preview.sending')}</Notice>}
    {state.status==='failed'&&<Notice tone="warn">{t('customer.signin.preview.failed')}</Notice>}
    {state.status==='expired'&&<Notice tone="warn">{t('customer.signin.preview.expired')}</Notice>}
    {state.status==='locked'&&<Notice tone="warn">{t('customer.signin.preview.locked',{sec:Math.max(0,Math.ceil(((state.lockedUntil??now)-now)/1000))})}</Notice>}
    {state.status==='complete'&&<Notice tone="success">{t('customer.signin.preview.complete')}</Notice>}
    {state.status==='active'&&<>
     <Notice tone="info">{t('customer.signin.preview.code',{code:state.code??'',sec:Math.max(0,Math.ceil(((state.expiresAt??now)-now)/1000))})}</Notice>
     {state.wrong>0&&<Notice tone="warn">{t('customer.signin.preview.wrong',{n:Math.max(0,policy.attempts-state.wrong)})}</Notice>}
    </>}
   </div>
   {state.status==='active'&&<OtpInput value={entered} onChange={setEntered} onComplete={verify} disabled={disabled} invalid={state.wrong>0} label={t('customer.signin.preview.enter')}/>}
   {state.status==='google'?<section className="stack" aria-label={t('customer.signin.preview.googleTitle')}>
    <Notice tone="info" title={t('customer.signin.preview.googleTitle')}>{t('customer.signin.preview.googleBody')}</Notice>
    <Button disabled={disabled} onClick={()=>onGoogleResult('continue')}>{t('customer.signin.preview.googleContinue')}</Button>
    <Button variant="secondary" disabled={disabled} onClick={()=>onGoogleResult('cancel')}>{t('customer.signin.preview.cancel')}</Button>
    <Button variant="ghost" disabled={disabled} onClick={()=>onGoogleResult('unavailable')}>{t('customer.signin.preview.googleUnavailable')}</Button>
   </section>:<>
    <Button disabled={blocked||resend>0} loading={state.status==='sending'} onClick={()=>{setEntered('');onSend();}}>{resend>0?t('customer.signin.preview.resendIn',{sec:resend}):t(state.status==='active'||state.status==='expired'?'customer.signin.preview.resend':'customer.signin.preview.send')}</Button>
    <Button variant="secondary" disabled={blocked} onClick={()=>{setEntered('');onGoogle();}}>{t('customer.signin.preview.google')}</Button>
    {state.status==='idle'&&<Button variant="ghost" disabled={blocked||resend>0} onClick={()=>onSend(true)}>{t('customer.signin.preview.deliveryError')}</Button>}
   </>}
   {['sending','active','expired','failed'].includes(state.status)&&<Button variant="ghost" disabled={disabled} onClick={()=>{setEntered('');onCancel();}}>{t('customer.signin.preview.cancel')}</Button>}
  </>}
 </Card>;
}
