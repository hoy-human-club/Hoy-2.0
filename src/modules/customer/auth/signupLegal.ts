import type { DataProvider } from '../../../data/types';
import type { LegalDocumentRow, LegalKind } from '../../../data/schema';
import { dateKey, fromDateKey } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import {mergeSettings,type TenantRow} from '../../admin/settings';
import {resolvedLegalCopy} from '../legalContent';
export const SIGNUP_LEGAL_KINDS = ['terms','privacy'] as const;
export interface SignupLegalReference { id: string; kind: 'terms'|'privacy'; version: string; contentHash: string; copy?: {es:{title:string;summary:string;body:string};en:{title:string;summary:string;body:string}} }
/** Published, effective documents only. Ambiguous versions are never silently chosen. */
export function currentLegalDocument(rows: LegalDocumentRow[], kind: LegalKind, now = Date.now()): LegalDocumentRow | undefined {
  const today = dateKey(new Date(now));
  const eligible = rows.filter(r=>r.tenant_id===tenant.id&&r.kind===kind&&r.status==='published'&&/^\d{4}-\d{2}-\d{2}$/.test(r.effective_from)&&dateKey(fromDateKey(r.effective_from))===r.effective_from&&r.effective_from<=today&&r.version.trim());
  eligible.sort((a,b)=>b.effective_from.localeCompare(a.effective_from)||b.version.localeCompare(a.version,'en',{numeric:true}));
  const first=eligible[0];
  if(first&&eligible.some((r,i)=>i>0&&(r.id===first.id||r.effective_from===first.effective_from&&r.version===first.version)))return undefined;
  return first;
}
async function reference(row:LegalDocumentRow,settings:ReturnType<typeof mergeSettings>):Promise<SignupLegalReference>{
 const copy={es:resolvedLegalCopy(row,settings,'es'),en:resolvedLegalCopy(row,settings,'en')};
 const text=JSON.stringify({id:row.id,tenant:row.tenant_id,kind:row.kind,version:row.version,status:row.status,effective:row.effective_from,title:row.title,summary:row.summary,body:row.body_md,copy});
 const contentHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(v=>v.toString(16).padStart(2,'0')).join('');
 return {id:row.id,kind:row.kind as SignupLegalReference['kind'],version:row.version,contentHash,copy};
}
export async function readSignupLegal(data:DataProvider,now=Date.now()):Promise<SignupLegalReference[]>{
 const rows=await data.list<LegalDocumentRow>('legal_documents',{where:{tenant_id:tenant.id,status:'published'}});
 const tenantRow=await data.get<TenantRow>('tenants',tenant.id);
 if(!tenantRow||tenantRow.tenant_id!==tenant.id)throw Error('registration_legal_unavailable');
 const settings=mergeSettings(tenantRow.settings);
 return Promise.all(SIGNUP_LEGAL_KINDS.map(async kind=>{const row=currentLegalDocument(rows,kind,now);if(!row)throw Error('registration_legal_unavailable');return reference(row,settings);}));
}
export function validSignupLegal(value:unknown):value is SignupLegalReference[]{
 return Array.isArray(value)&&value.length===2&&SIGNUP_LEGAL_KINDS.every(kind=>value.filter(r=>r&&r.kind===kind&&typeof r.id==='string'&&r.id.length>0&&typeof r.version==='string'&&r.version.length>0&&/^[a-f0-9]{64}$/.test(r.contentHash)).length===1);
}
export const signupLegalKey=(rows:SignupLegalReference[])=>JSON.stringify([...rows].sort((a,b)=>a.kind.localeCompare(b.kind)));
