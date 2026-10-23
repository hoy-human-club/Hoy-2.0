/** Fictional sign-in only. No identity provider, credentials, storage, grants or network. */
export interface DemoSignInPolicy { validMinutes:number; resendSeconds:number; attempts:number; lockMinutes:number }
export type DemoSignInStatus='idle'|'sending'|'active'|'expired'|'locked'|'google'|'failed'|'complete'|'unavailable';
export interface DemoSignInState { status:DemoSignInStatus; code:string|null; expiresAt:number|null; resendAt:number; wrong:number; lockedUntil:number|null }
export const DEMO_MEMBER_EMAIL='juliana@demo.hoyos.test';
export class MockSignIn {
 private generation=0;
 private value:DemoSignInState={status:'idle',code:null,expiresAt:null,resendAt:0,wrong:0,lockedUntil:null};
 readonly policy:Readonly<DemoSignInPolicy>;
 constructor(policy:DemoSignInPolicy){
  this.policy=Object.freeze({...policy});
  if(!Object.values(policy).every(Number.isFinite)||policy.validMinutes<=0||policy.resendSeconds<0||!Number.isInteger(policy.attempts)||policy.attempts<1||policy.lockMinutes<=0)this.value.status='unavailable';
 }
 get state():DemoSignInState{return {...this.value};}
 tick(now:number):void {
  if(!Number.isFinite(now))return;
  if(this.value.status==='locked'&&this.value.lockedUntil!==null&&now>=this.value.lockedUntil)this.value={...this.value,status:'idle',wrong:0,lockedUntil:null};
  if(this.value.status==='active'&&this.value.expiresAt!==null&&now>=this.value.expiresAt)this.value={...this.value,status:'expired',code:null};
 }
 private canStart(now:number):boolean{this.tick(now);return Number.isFinite(now)&&!['unavailable','locked','complete','sending'].includes(this.value.status);}
 beginEmail(now:number):number|null{
  if(!this.canStart(now)||now<this.value.resendAt)return null;
  this.value={...this.value,status:'sending',code:null,expiresAt:null};return ++this.generation;
 }
 finishEmail(token:number,code:string|null,now:number):boolean{
  if(token!==this.generation||this.value.status!=='sending'||!Number.isFinite(now))return false;
  if(code===null){this.value={...this.value,status:'failed'};return true;}
  if(!/^\d{6}$/.test(code))return false;
  this.value={...this.value,status:'active',code,expiresAt:now+this.policy.validMinutes*60_000,resendAt:now+this.policy.resendSeconds*1000};return true;
 }
 verify(code:string,now:number):'complete'|'wrong'|'locked'|'expired'|'unavailable'{
  this.tick(now);
  if(this.value.status==='locked'||this.value.status==='expired')return this.value.status;
  if(!Number.isFinite(now)||this.value.status!=='active'||!/^\d{6}$/.test(code))return 'unavailable';
  if(code===this.value.code){this.value={...this.value,status:'complete',code:null,expiresAt:null};++this.generation;return 'complete';}
  const wrong=this.value.wrong+1,locked=wrong>=this.policy.attempts;
  this.value={...this.value,wrong,status:locked?'locked':'active',code:locked?null:this.value.code,lockedUntil:locked?now+this.policy.lockMinutes*60_000:null};return locked?'locked':'wrong';
 }
 beginGoogle(now:number):number|null{
  if(!this.canStart(now))return null;
  this.value={...this.value,status:'google',code:null,expiresAt:null};return ++this.generation;
 }
 finishGoogle(token:number,result:'continue'|'cancel'|'unavailable'):boolean{
  if(token!==this.generation||this.value.status!=='google')return false;
  this.value={...this.value,status:result==='continue'?'complete':result==='cancel'?'idle':'failed'};++this.generation;return true;
 }
 cancel():void{
  ++this.generation;
  if(['complete','unavailable','locked'].includes(this.value.status))return;
  this.value={...this.value,status:'idle',code:null,expiresAt:null};
 }
}
