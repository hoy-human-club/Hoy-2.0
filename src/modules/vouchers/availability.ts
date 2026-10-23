import type {VoucherRow} from '../../data/vouchers';
/** Mirrors command expiry boundaries for display only; commands remain authoritative. */
export function voucherAvailability(v:Pick<VoucherRow,'status'|'expiresAt'|'balance'>,now=Date.now()):'revoked'|'expired'|'exhausted'|'available'{
 if(v.status==='revoked')return 'revoked';
 if(v.expiresAt!==null&&(!Number.isFinite(Date.parse(v.expiresAt))||Date.parse(v.expiresAt)<=now))return 'expired';
 if(v.balance<=0)return 'exhausted';
 return 'available';
}
const errors:Record<string,string>={
 voucher_unavailable:'vouchers.unavailableReason',voucher_already_claimed:'vouchers.claimedOther',
 voucher_insufficient_balance:'vouchers.insufficient',voucher_participant_cap:'vouchers.capError',
 voucher_expiration_invalid:'vouchers.expiryError',session_full:'vouchers.fullError',
 session_unavailable:'vouchers.sessionError',voucher_active_bookings:'vouchers.activeError',
};
export const voucherErrorKey=(error:unknown)=>errors[error instanceof Error?error.message:'']??'vouchers.error';
