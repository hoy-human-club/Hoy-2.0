/** Scoped browser-demo commands for M-02/M-02b. A real provider needs an authorized RPC. */
import type { DataProvider } from '../../data/types';
import type { BaseRow, FaqEntryRow, UserRow } from '../../data/schema';
import type { Role } from '../../auth/roles';
import { roleCan } from '../../auth/permissions';
import { tenant } from '../../tenant/tenant';

type Table = 'class_templates' | 'teachers' | 'modalities' | 'rooms' | 'faq_entries';
export type ContentIntent =
  | { kind: 'create'; table: Table; patch: Record<string, unknown> }
  | { kind: 'update' | 'delete'; table: Table; before: BaseRow; patch?: Record<string, unknown> }
  | { kind: 'reorder'; table: 'faq_entries'; entries: FaqEntryRow[]; id: string; dir: -1 | 1 };
export interface ContentActor { id: string; role: Role }
export interface ContentExecution {
  /** Live SessionProvider context, never the retained action closure's actor. */
  currentActor: () => ContentActor;
  failAfterWrites?: number;
}
export function assertContentActor(expected: ContentActor, current: ContentActor) {
  if (expected.id !== current.id || expected.role !== current.role) throw Error('content_context_changed');
  if (!current.id || !roleCan(current.role, 'content.write')) throw Error('content_denied');
}
/** Check both sides of every awaited read/write so a context change aborts the detached stage. */
function withCurrentContext(data: DataProvider, check: () => void): DataProvider {
  return new Proxy({} as DataProvider, { get(_target, key) {
    const value = Reflect.get(data, key);
    if (typeof value !== 'function') return value;
    if (!['get','list','insert','update','remove'].includes(String(key))) return value.bind(data);
    return async (...args: unknown[]) => { check(); const result = await value.apply(data, args); check(); return result; };
  } });
}
const allowed: Record<Table, string[]> = {
  class_templates: ['generation_mode','start_date','end_date','title','theme','description','modality_id','teacher_id','room_id','weekday','start_time','duration_min','capacity','level','active'],
  teachers: ['user_id','display_name','bio','photo_url','specialties','certifications','rate_per_class','active','rating_avg'],
  modalities: ['slug','name_es','name_en','tone','description','intensity','heated','duration_min','active'],
  rooms: ['name','capacity','heated','notes'],
  faq_entries: ['group_key','group_title','group_lead','page','question','answer','sort','published'],
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
async function actorGuard(data: DataProvider, actor: ContentActor) {
  if (data.name !== 'mock' || !data.atomic || !roleCan(actor.role, 'content.write')) throw Error('content_denied');
  const user = await data.get<UserRow>('users', actor.id);
  if (!user || user.tenant_id !== tenant.id || user.status !== 'active') throw Error('content_denied');
}
function validate(table: Table, patch: Record<string, unknown>, actor: ContentActor) {
  if (!allowed[table] || !Object.keys(patch).length || Object.keys(patch).some(k => !allowed[table].includes(k))) throw Error('content_invalid');
  if ('rate_per_class' in patch && !roleCan(actor.role, 'payroll.write') && patch.rate_per_class !== 0) throw Error('content_denied');
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === 'string' && value.length > 10000) throw Error('content_invalid');
    if (['active','heated','published'].includes(key) && typeof value !== 'boolean') throw Error('content_invalid');
    if (['capacity','duration_min','intensity','weekday','page','sort','rate_per_class'].includes(key) && (!Number.isSafeInteger(value) || Number(value) < 0)) throw Error('content_invalid');
    if (key === 'weekday' && Number(value) > 6 || key === 'page' && ![1,2].includes(Number(value)) || ['capacity','duration_min','intensity'].includes(key) && Number(value) < 1 || key === 'intensity' && Number(value) > 5) throw Error('content_invalid');
    if (key === 'start_time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value))) throw Error('content_invalid');
    if (['title','display_name','name_es','name','group_key'].includes(key) && (typeof value !== 'string' || !value.trim() || value.length > 500)) throw Error('content_invalid');
    if (['bio','theme','description','question','answer','group_title','group_lead'].includes(key) && value != null) {
      const bi = value as Record<string, unknown>;
      if (typeof bi.es !== 'string' || bi.es.length > 10000 || bi.en !== undefined && (typeof bi.en !== 'string' || bi.en.length > 10000)) throw Error('content_invalid');
    }
  }
  // New unpublished drafts deliberately start blank; create validates keys/types separately below.
}
async function current(data: DataProvider, table: Table, before: BaseRow) {
  const row = await data.get(table, before.id);
  if (!row || row.tenant_id !== tenant.id || before.tenant_id !== tenant.id || !same(row, before)) throw Error('content_conflict');
  return row;
}
export async function writeContent(data: DataProvider, actor: ContentActor, intent: ContentIntent, requestId: string, options: ContentExecution) {
  actor = { ...actor }; intent = structuredClone(intent);
  const check = () => assertContentActor(actor, options.currentActor());
  check();
  data = withCurrentContext(data, check);
  await actorGuard(data, actor);
  check();
  // Replays bypass the staged callback; permission checks must run before receipt lookup too.
  if (intent.kind === 'update') {
    validate(intent.table, intent.patch ?? {}, actor);
    if ('rate_per_class' in (intent.patch ?? {}) && !roleCan(actor.role, 'payroll.write')) throw Error('content_denied');
  }
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(requestId) || !allowed[intent.table]) throw Error('content_invalid');
  const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([actor, intent])))), b => b.toString(16).padStart(2, '0')).join('');
  check();
  const result = await data.atomic!(async suppliedStage => {
    check();
    const stage = withCurrentContext(suppliedStage, check);
    await actorGuard(stage, actor);
    const table = intent.table;
    const audit = async (action: string, id: string, ids: string[], fields: string[]) => {
      await stage.insert('audit_log', { id: `content_action_${requestId}`, actor_id: actor.id, action, entity: table, entity_id: id, ip: null, diff: { role: actor.role, source: 'admin', ids, fields } });
    };
    let id: string;
    if (intent.kind === 'create') {
      // Empty fields are valid only in a new, unpublished draft.
      const checked = Object.fromEntries(Object.entries(intent.patch).filter(([k,v]) => !(v === '' && ['title','display_name','name_es','name'].includes(k))));
      validate(table, checked, actor);
      if (intent.patch.active === true || intent.patch.published === true) throw Error('content_invalid');
      const row = await stage.insert(table, intent.patch); id = row.id;
      await audit('content.create', id, [id], Object.keys(intent.patch));
    } else if (intent.kind === 'reorder') {
      const entries = intent.entries;
      if (entries.length < 2 || new Set(entries.map(e => e.id)).size !== entries.length || ![-1,1].includes(intent.dir)) throw Error('content_invalid');
      const actual = await stage.list<FaqEntryRow>(table, { where: { group_key: entries[0].group_key, tenant_id: tenant.id } });
      if (actual.length !== entries.length || entries.some(e => e.group_key !== entries[0].group_key)) throw Error('content_conflict');
      for (const entry of entries) await current(stage, table, entry);
      const ordered = [...entries].sort((a,b) => a.sort - b.sort || a.id.localeCompare(b.id));
      const index = ordered.findIndex(e => e.id === intent.id), other = index + intent.dir;
      if (index < 0 || !ordered[other]) throw Error('content_conflict');
      [ordered[index], ordered[other]] = [ordered[other], ordered[index]];
      // Normalize only this section, including legacy tied sort values, in one commit.
      for (let i = 0; i < ordered.length; i++) await stage.update(table, ordered[i].id, { sort: i + 1 });
      id = intent.id; await audit('content.reorder', id, ordered.map(e => e.id), ['sort']);
    } else {
      const row = await current(stage, table, intent.before); id = row.id;
      if (intent.kind === 'delete') { await stage.remove(table, id); await audit('content.delete', id, [id], []); }
      else {
        const patch = intent.patch ?? {}; validate(table, patch, actor);
        if ('rate_per_class' in patch && !roleCan(actor.role, 'payroll.write')) throw Error('content_denied');
        await stage.update(table, id, patch);
        const ids = [id];
        if (table === 'faq_entries') {
          const shared = Object.fromEntries(['group_title','group_lead','page'].filter(k => k in patch).map(k => [k,patch[k]]));
          if (Object.keys(shared).length) for (const sibling of await stage.list(table, { where: { tenant_id: tenant.id, group_key: patch.group_key ?? row.group_key } })) {
            if (sibling.id !== id && Object.keys(shared).some(k => !same(sibling[k], shared[k]))) { await stage.update(table, sibling.id, shared); ids.push(sibling.id); }
          }
        }
        const flag = table === 'faq_entries' ? 'published' : 'active';
        await audit(Object.keys(patch).length === 1 && flag in patch ? patch[flag] ? 'content.publish' : 'content.unpublish' : 'content.update', id, ids, Object.keys(patch));
      }
    }
    check();
    return { id, fingerprint };
  }, { idempotencyKey: `content_v1_${requestId}`, failAfterWrites: options.failAfterWrites });
  check();
  if (result.fingerprint !== fingerprint) throw Error('content_request_mismatch');
  return result.id;
}
