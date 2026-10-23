/** UI rehearsal only. Never passed to DataProvider, payments, auth, or delivery. */
export interface GiftDraft {
  id: string; email: string; classes: number; amount: number;
  status: 'pending' | 'confirmed' | 'redeemed';
  expiresAt: string | null; balance: number; previews: ('ready' | 'used')[];
}
export function demoEmail(value: string): boolean {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.test$/i.test(value.trim()) && value.trim().length <= 160;
}
export function createGiftDraft(input: {id:string;email:string;classes:number;amount:number}):GiftDraft {
  if(!input.id || !demoEmail(input.email) || !Number.isSafeInteger(input.classes) || input.classes<1 || input.classes>1000 || !Number.isSafeInteger(input.amount) || input.amount<1) throw Error('invalid');
  return {...input,email:input.email.trim().toLowerCase(),status:'pending',expiresAt:null,balance:0,previews:[]};
}
export function giftStatus(gift:GiftDraft, now=Date.now()):'pending'|'ready'|'redeemed'|'expired' {
  if(gift.status==='redeemed')return 'redeemed';
  if(gift.expiresAt!==null&&(!Number.isFinite(Date.parse(gift.expiresAt))||Date.parse(gift.expiresAt)<=now))return 'expired';
  return gift.status==='pending'?'pending':'ready';
}
export function advanceGift(gift:GiftDraft, action:'confirm'|'redeem', email?:string, now=Date.now()):GiftDraft {
  const status=giftStatus(gift,now);
  if(action==='confirm') {
    if(status!=='pending')throw Error(status);
    return {...gift,status:'confirmed',previews:['ready']};
  }
  if(status!=='ready')throw Error(status);
  if(!email||email.trim().toLowerCase()!==gift.email)throw Error('recipient');
  return {...gift,status:'redeemed',balance:gift.classes,previews:[...gift.previews,'used']};
}
