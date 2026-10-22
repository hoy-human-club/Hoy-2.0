import type { DataProvider } from '../../data/types';
import type { ProfileRow, UserRow } from '../../data/schema';
import { tenant } from '../../tenant/tenant';
import { isPhone } from '../../i18n/format';

export interface OwnProfile extends ProfileRow { birthday: string | null; emergency_contact: { name: string; phone: string } | null }
export interface OwnRows { profile: OwnProfile; account: UserRow }
export interface ProfileForm { full_name: string; phone: string; birthday: string; ec_name: string; ec_phone: string }
export function validBirthday(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d]=value.split('-').map(Number),date=new Date(0);
  date.setUTCFullYear(y,m-1,d);date.setUTCHours(0,0,0,0);
  return y>0 && date.getUTCFullYear()===y && date.getUTCMonth()===m-1 && date.getUTCDate()===d;
}
export function profileErrors(form: ProfileForm) {
  const errors: Record<string,string>={};
  if(form.full_name.trim().length<3)errors.full_name='customer.form.required';
  if(!isPhone(form.phone))errors.phone='customer.form.phone';
  if(form.ec_name&&!isPhone(form.ec_phone))errors.ec_phone='customer.form.phone';
  if(!validBirthday(form.birthday))errors.birthday='customer.profile.atomic.birthday';
  return errors;
}
export async function readOwnProfile(data: DataProvider, actorId: string): Promise<OwnRows> {
  const [profiles,users]=await Promise.all([
    data.list<OwnProfile>('profiles',{where:{tenant_id:tenant.id,user_id:actorId}}),
    data.list<UserRow>('users',{where:{tenant_id:tenant.id,id:actorId}}),
  ]);
  const ps=profiles.filter(p=>p.tenant_id===tenant.id&&p.user_id===actorId),us=users.filter(u=>u.tenant_id===tenant.id&&u.id===actorId);
  if(ps.length!==1||us.length!==1)throw Error('profile_missing');
  return {profile:ps[0],account:us[0]};
}
function owned(rows: OwnRows) {const p=rows.profile;return [p.id,p.full_name,p.initials,p.birthday??null,p.emergency_contact??null,rows.account.id,rows.account.phone];}
export async function profileRevision(rows: OwnRows) {return digest(owned(rows));}
async function digest(value: unknown) {const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function saveOwnProfile(data: DataProvider, input: {actorId:string;role:string;requestId:string;expected:string;form:ProfileForm}, cancelled:()=>boolean=()=>false) {
  if(data.name!=='mock')throw Error('profile_disconnected');
  if(!data.atomic)throw Error('profile_atomic_required');
  if(!['customer','teacher','super_admin'].includes(input.role))throw Error('profile_denied');
  if(Object.keys(profileErrors(input.form)).length)throw Error('profile_validation');
  const fingerprint=await digest(input),receipt=`profile_save:${encodeURIComponent(tenant.id)}:${encodeURIComponent(input.actorId)}:${encodeURIComponent(input.requestId)}`;
  const check=()=>{if(cancelled())throw Error('profile_cancelled');};check();
  return data.atomic(async tx=>{
    check();const prior=await tx.get('audit_log',receipt);
    if(prior){if(prior.tenant_id!==tenant.id||prior.actor_id!==input.actorId||(prior.diff as {fingerprint?:string}|null)?.fingerprint!==fingerprint)throw Error('profile_request_conflict');const current=await readOwnProfile(tx,input.actorId);check();if(current.profile.id!==prior.entity_id)throw Error('profile_missing');return {status:'saved' as const,profileId:current.profile.id};}
    const rows=await readOwnProfile(tx,input.actorId);check();
    if(await profileRevision(rows)!==input.expected)throw Error('profile_stale');
    const f=input.form,name=f.full_name.trim();
    await tx.update('profiles',rows.profile.id,{full_name:name,initials:name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase(),birthday:f.birthday||null,emergency_contact:f.ec_name?{name:f.ec_name.trim(),phone:f.ec_phone.trim()}:null});check();
    await tx.update('users',rows.account.id,{phone:f.phone.trim()});check();
    await tx.insert('audit_log',{id:receipt,tenant_id:tenant.id,actor_id:input.actorId,action:'profile.mock-save',entity:'profiles',entity_id:rows.profile.id,diff:{fingerprint,status:'saved',source:'fictional-own-profile',role:input.role}});check();
    return {status:'saved' as const,profileId:rows.profile.id};
  });
}
