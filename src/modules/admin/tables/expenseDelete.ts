import type { BaseRow } from '../../../data/schema';
import type { DataProvider } from '../../../data/types';
import {ROLES,type Role} from '../../../auth/roles';
import {roleCan} from '../../../auth/permissions';
import { tenant } from '../../../tenant/tenant';

/** Local business safeguard; not authorization/server enforcement. Receipt stores hashes/IDs only. */
function fingerprint(row: unknown): string {
  const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)])) : value;
  return JSON.stringify(stable(row));
}
const hash = async (value: unknown) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint(value))))].map(n=>n.toString(16).padStart(2,'0')).join('');
export interface ExpenseDeleteIntent {requestId:string;actorId:string;role:Role}
export async function removeExpenseRow(data: DataProvider, selected: BaseRow, supplied: ExpenseDeleteIntent, isCurrent: () => boolean): Promise<void> {
  const before = structuredClone(selected), intent = {...supplied}, current = isCurrent, expected = fingerprint(before);
  const check = () => { if (!current()) throw Error('expense_delete_cancelled'); };
  if (data.name !== 'mock' || !data.atomic || typeof before.id!=='string' || !before.id || before.id.length>160 || before.tenant_id !== tenant.id || typeof intent.requestId !== 'string' || !intent.requestId || intent.requestId.length>160 || typeof intent.actorId!=='string' || !intent.actorId || intent.actorId.length>160 || !ROLES.includes(intent.role) || !roleCan(intent.role,'tables.write')) throw Error('expense_delete_scope');
  const actor = async (provider:DataProvider) => { check();const rows=await provider.list('users',{where:{id:intent.actorId}});check();if(rows.length!==1||rows[0].id!==intent.actorId||rows[0].tenant_id!==tenant.id||rows[0].status!=='active')throw Error('expense_delete_scope');const latest=await provider.get('users',intent.actorId);check();if(!latest||latest.id!==intent.actorId||latest.tenant_id!==tenant.id||latest.status!=='active')throw Error('expense_delete_scope'); };
  await actor(data);
  const scopeHash=await hash({tenantId:tenant.id,actorId:intent.actorId,role:intent.role,requestId:intent.requestId}),intentHash=await hash(before),key=`expense_delete_v1_${scopeHash}`,receiptId=`mock_transaction_${key}`;
  check();
  const result={version:1,status:'absent',tenantId:tenant.id,actorId:intent.actorId,role:intent.role,targetId:before.id,scopeHash,intentHash};
  const validate = (receipt:BaseRow|null) => {if(!receipt||receipt.id!==receiptId||receipt.tenant_id!==tenant.id||receipt.action!=='mock.transaction'||receipt.entity!=='mock'||receipt.entity_id!==receiptId||fingerprint((receipt.diff as {result?:unknown})?.result)!==fingerprint(result))throw Error('expense_delete_request_conflict');};
  const absent = async () => {const rows=await data.list('expenses',{where:{id:before.id}});check();if(rows.length)throw Error('expense_delete_unconfirmed');await actor(data);check();};
  // A committed nonce is a fence even if somebody recreates the exact same row bytes.
  const prior=await data.get('audit_log',receiptId);check();
  if(prior){validate(prior);await absent();return;}
  const outcome=await data.atomic(async tx => {
    await actor(tx);
    const rows = await tx.list('expenses', { where: { id: before.id } });check();
    if(rows.length){
      if(rows.length!==1||rows[0].tenant_id!==tenant.id)throw Error('expense_delete_scope');
      if(rows[0].paid_on)throw Error('expense_paid_delete_protected');
      if(fingerprint(rows[0])!==expected)throw Error('expense_delete_stale');
      await tx.remove('expenses',before.id);check();
    }
    // The first confirmed absence also receives a fence; later retries may never delete a new row.
    await actor(tx);return result;
  },{idempotencyKey:key});
  check();if(fingerprint(outcome)!==fingerprint(result))throw Error('expense_delete_request_conflict');
  const receipt=await data.get('audit_log',receiptId);check();validate(receipt);await absent();
}
