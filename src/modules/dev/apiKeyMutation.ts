/** Fictional D-07 commands only. No token verification, production credentials or server guarantees. */
import type { DataProvider } from '../../data/types';
import type { ApiKeyEnvironment, ApiKeyRow } from '../../data/schema';
import type { Role } from '../../auth/roles';
import { roleCan } from '../../auth/permissions';
import { tenant } from '../../tenant/tenant';
import { MS } from '../../i18n/format';
import { API_KEY_SCOPES, keyStatus, newKeyRow, ROTATION_GRACE_MS, sha256Hex } from './apiKeys';

export interface ApiKeyDraft { name: string; environment: ApiKeyEnvironment; scopes: string[]; expiryDays: number }
export interface ApiKeyActor { actorId: string; role: Role; tenantId: string }
export type ApiKeyIntent = { kind: 'create'; draft: ApiKeyDraft } | { kind: 'rotate' | 'revoke'; targetId: string };
export interface ApiKeyOutcome { requestId: string; fingerprint: string; actorId: string; role: Role; tenantId: string; kind: ApiKeyIntent['kind']; rowId: string; prefix: string; rotatedFrom?: string }
export interface ApiKeyResult extends ApiKeyOutcome { replayed: boolean }
export interface PreparedApiKeyMutation {
  readonly requestId: string;
  readonly intent: ApiKeyIntent;
  readonly fingerprint: string;
  execute(options?: { signal?: AbortSignal; currentActor?: () => ApiKeyActor; failAfterWrites?: number }): Promise<ApiKeyResult>;
  /** Only the first successful, acknowledged execution may reveal current-command material. */
  takeRaw(result: ApiKeyResult): string | null;
  discard(): void;
}
const fail = (code: string): never => { throw new Error(`api_key_${code}`); };
export function validateApiKeyDraft(d: ApiKeyDraft): ApiKeyDraft {
  if (!d || typeof d.name !== 'string' || !d.name.trim()) fail('name');
  if (!['test','live'].includes(d.environment)) fail('environment');
  if (!Array.isArray(d.scopes) || !d.scopes.length || d.scopes.some(s => !(API_KEY_SCOPES as readonly string[]).includes(s))) fail('scopes');
  // Preserve the action's numeric durations, including fractional days; UI options stay unchanged.
  if (typeof d.expiryDays !== 'number' || !Number.isFinite(d.expiryDays) || d.expiryDays < 0 || !Number.isFinite(new Date(Date.now() + d.expiryDays * MS.day).getTime())) fail('expiry');
  return { ...d, name: d.name.trim(), scopes: API_KEY_SCOPES.filter(s => d.scopes.includes(s)) };
}
export function apiKeyDraftFromAction(p?: Record<string,string>): ApiKeyDraft {
  return validateApiKeyDraft({ name:p?.name ?? '', environment:(p?.environment?.trim() || 'test') as ApiKeyEnvironment, scopes:(p?.scopes ?? '').split(',').map(s=>s.trim()).filter(Boolean), expiryDays:p?.expires_days?.trim() ? Number(p.expires_days) : 90 });
}
function authorize(data: DataProvider, actor: ApiKeyActor) {
  if (data.name !== 'mock' || !data.atomic) fail('disconnected');
  if (actor.tenantId !== tenant.id || !actor.actorId || !roleCan(actor.role,'api_keys.write')) fail('forbidden');
}
export async function findApiKey(data: DataProvider, actor: ApiKeyActor, idOrPrefix: string): Promise<ApiKeyRow> {
  authorize(data,actor);
  const rows=await data.list<ApiKeyRow>('api_keys',{where:{tenant_id:actor.tenantId}});
  const row=rows.find(k=>k.tenant_id===actor.tenantId && (k.id===idOrPrefix || k.prefix===idOrPrefix));
  if (!row) return fail('missing');
  return row;
}
const targetSnapshot = (k: ApiKeyRow) => JSON.stringify({id:k.id,tenant_id:k.tenant_id,name:k.name,environment:k.environment,scopes:k.scopes,created_at:k.created_at,expires_at:k.expires_at,revoked_at:k.revoked_at,replaces_id:k.replaces_id,key_hash:k.key_hash});
/** The idempotency receipt contains outcome metadata only. Raw material never crosses atomic(). */
export async function prepareApiKeyMutation(data: DataProvider, actor: ApiKeyActor, input: ApiKeyIntent, requestId = crypto.randomUUID()): Promise<PreparedApiKeyMutation> {
  authorize(data,actor);
  const identity={...actor};
  const intent: ApiKeyIntent = input.kind==='create' ? {kind:'create',draft:validateApiKeyDraft(input.draft)} : {kind:input.kind,targetId:input.targetId};
  if (!['create','rotate','revoke'].includes(intent.kind) || !requestId || requestId.length>160 || !/^[a-zA-Z0-9_-]+$/.test(requestId)) fail('request');
  const fingerprint=await sha256Hex(JSON.stringify({actor:identity,intent}));
  const receiptId=`mock_transaction_api_key_${requestId}`;
  const prior=(await data.list('audit_log',{where:{tenant_id:actor.tenantId,id:receiptId}})).find(r=>r.tenant_id===actor.tenantId && r.id===receiptId);
  const priorOutcome=prior && (prior.diff as {result?:ApiKeyOutcome} | null)?.result;
  if (prior && (!priorOutcome || priorOutcome.fingerprint!==fingerprint || priorOutcome.actorId!==actor.actorId || priorOutcome.role!==actor.role || priorOutcome.tenantId!==actor.tenantId)) fail('replay_conflict');
  let old: ApiKeyRow | null=null, generated: Awaited<ReturnType<typeof newKeyRow>> | null=null;
  if (!priorOutcome) {
    if (intent.kind!=='create') old=await findApiKey(data,identity,intent.targetId);
    if (intent.kind==='rotate' && old) {
      if (['revoked','expired'].includes(keyStatus(old))) fail('rotate_dead');
      if (keyStatus(old)==='invalid' || !Number.isFinite(Date.parse(old.created_at))) fail('invalid');
      const lifetime=old.expires_at ? Date.parse(old.expires_at)-Date.parse(old.created_at) : null;
      if (lifetime!==null && (!Number.isFinite(lifetime) || lifetime<=0 || !Number.isFinite(Date.now()+lifetime))) fail('expiry');
      validateApiKeyDraft({name:old.name,environment:old.environment,scopes:old.scopes,expiryDays:0});
      generated=await newKeyRow({name:old.name,environment:old.environment,scopes:old.scopes,expiresAt:lifetime===null?null:new Date(Date.now()+lifetime).toISOString(),createdBy:actor.actorId,replacesId:old.id});
    } else if (intent.kind==='create') generated=await newKeyRow({name:intent.draft.name,environment:intent.draft.environment,scopes:intent.draft.scopes,expiresAt:intent.draft.expiryDays?new Date(Date.now()+intent.draft.expiryDays*MS.day).toISOString():null,createdBy:actor.actorId});
  }
  let raw=generated?.raw ?? null;
  const row=generated?.row; generated=null;
  const snapshot=old?targetSnapshot(old):null;
  let discarded=false, acknowledged=false, lastResult: ApiKeyResult | null=null;
  const check=(signal?:AbortSignal,currentActor?:()=>ApiKeyActor)=>{
    authorize(data,identity);
    const current=currentActor?.() ?? identity;
    if (current.actorId!==identity.actorId || current.role!==identity.role || current.tenantId!==identity.tenantId) fail('context_changed');
    if (signal?.aborted || discarded) fail('cancelled');
  };
  return {
    requestId,intent,fingerprint,
    async execute(options={}) {
      check(options.signal,options.currentActor);
      let executed=false;
      const outcome=await data.atomic!(async stage=>{
        check(options.signal,options.currentActor);authorize(stage,identity);executed=true;
        let saved:ApiKeyRow;
        let current:ApiKeyRow | null=null;
        if (intent.kind!=='create') {
          const scoped=await stage.list<ApiKeyRow>('api_keys',{where:{tenant_id:identity.tenantId,id:intent.targetId}});
          current=scoped.find(k=>k.tenant_id===identity.tenantId && k.id===intent.targetId) ?? null;
          if (!current) return fail('missing');
          if (targetSnapshot(current)!==snapshot) fail('changed');
        }
        check(options.signal,options.currentActor);
        const stamp=new Date().toISOString();
        if (intent.kind==='revoke') {
          saved=current!;
          if (!saved.revoked_at) {
            saved=await stage.update<ApiKeyRow>('api_keys',saved.id,{revoked_at:stamp});
            check(options.signal,options.currentActor);
            await stage.insert('audit_log',{actor_id:identity.actorId,action:'api_key.revoke',entity:'api_keys',entity_id:saved.id,ip:null,diff:{role:identity.role,source:'admin',prefix:saved.prefix,revoked_at:stamp}});
          }
        } else {
          if (!row || row.expires_at && (!Number.isFinite(Date.parse(row.expires_at)))) fail('expiry');
          saved=await stage.insert<ApiKeyRow>('api_keys',row!);
          check(options.signal,options.currentActor);
          let oldExpires:string|null=null;
          if (intent.kind==='rotate') {
            if (keyStatus(current!)==='invalid' || ['revoked','expired'].includes(keyStatus(current!))) fail('rotate_dead');
            const grace=new Date(Date.now()+ROTATION_GRACE_MS).toISOString();oldExpires=current!.expires_at && current!.expires_at<grace?current!.expires_at:grace;
            await stage.update('api_keys',current!.id,{expires_at:oldExpires});check(options.signal,options.currentActor);
          }
          await stage.insert('audit_log',{actor_id:identity.actorId,action:`api_key.${intent.kind}`,entity:'api_keys',entity_id:saved.id,ip:null,diff:{role:identity.role,source:'admin',prefix:saved.prefix,...(intent.kind==='create'?{environment:saved.environment,scopes:saved.scopes,expires_at:saved.expires_at}:{replaces:current!.prefix,old_expires_at:oldExpires})}});
        }
        check(options.signal,options.currentActor);
        return {requestId,fingerprint,...identity,kind:intent.kind,rowId:saved.id,prefix:saved.prefix,...(intent.kind==='rotate'?{rotatedFrom:current!.prefix}:{})} satisfies ApiKeyOutcome;
      },{idempotencyKey:`api_key_${requestId}`,failAfterWrites:options.failAfterWrites});
      if (outcome.fingerprint!==fingerprint || outcome.actorId!==identity.actorId || outcome.role!==identity.role || outcome.tenantId!==identity.tenantId) fail('replay_conflict');
      lastResult={...outcome,replayed:!executed || acknowledged || !!priorOutcome};
      acknowledged=true;
      if(lastResult.replayed)raw=null;
      return lastResult;
    },
    takeRaw(result) {
      if (discarded || result!==lastResult || result.replayed || !acknowledged) return null;
      const once=raw;raw=null;return once;
    },
    discard(){discarded=true;raw=null;lastResult=null;},
  };
}
