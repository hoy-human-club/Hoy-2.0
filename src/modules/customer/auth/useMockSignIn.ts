import {useEffect,useRef,useState} from 'react';
import {policy} from '../policy';
import {MockSignIn} from './mockSignIn';
export function makeMockSignIn():MockSignIn{return new MockSignIn({validMinutes:policy.otpValidMinutes,resendSeconds:policy.otpResendSeconds,attempts:policy.lockoutAttempts,lockMinutes:policy.lockoutMinutes});}
/** The only session effect is the caller's existing demo-entry callback, once after completion. */
export function useMockSignIn(onComplete:()=>void,enabled:boolean,initial?:MockSignIn){
 const[machine]=useState(()=>initial??makeMockSignIn());
 const[state,setState]=useState(machine.state),[now,setNow]=useState(Date.now());
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),google=useRef<number|null>(null),mounted=useRef(false),done=useRef(onComplete),allowed=useRef(enabled);
 done.current=onComplete;allowed.current=enabled;
 const sync=()=>{if(mounted.current)setState(machine.state);};
 const stop=()=>{if(timer.current!==null)clearTimeout(timer.current);timer.current=null;};
 useEffect(()=>{
  mounted.current=true;
  const interval=setInterval(()=>{const current=Date.now();machine.tick(current);setNow(current);setState(machine.state);},1000);
  return()=>{mounted.current=false;clearInterval(interval);stop();machine.cancel();google.current=null;};
 },[machine]);
 useEffect(()=>{if(!enabled){stop();machine.cancel();google.current=null;sync();}},[enabled,machine]);
 const onCancel=()=>{stop();machine.cancel();google.current=null;sync();};
 const onSend=(fail=false)=>{
  if(!allowed.current)return;
  const token=machine.beginEmail(Date.now());if(token===null)return;google.current=null;sync();
  timer.current=setTimeout(()=>{timer.current=null;if(!mounted.current||!allowed.current)return;
   const number=new Uint32Array(1);crypto.getRandomValues(number);const code=String(100000+number[0]%900000);
   machine.finishEmail(token,fail?null:code,Date.now());setNow(Date.now());sync();
  },600);
 };
 const onVerify=(code:string)=>{if(!allowed.current||!mounted.current)return;const result=machine.verify(code,Date.now());sync();if(result==='complete')done.current();};
 const onGoogle=()=>{if(!allowed.current)return;const token=machine.beginGoogle(Date.now());if(token===null)return;stop();google.current=token;sync();};
 const onGoogleResult=(result:'continue'|'cancel'|'unavailable')=>{
  if(!allowed.current||!mounted.current||google.current===null)return;
  const finished=machine.finishGoogle(google.current,result);google.current=null;sync();if(finished&&result==='continue')done.current();
 };
 return{state,now,policy:machine.policy,disabled:!enabled,onSend,onVerify,onGoogle,onGoogleResult,onCancel};
}
