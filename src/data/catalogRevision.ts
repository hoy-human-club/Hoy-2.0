import type { DataProvider } from './types';
import { tenant } from '../tenant/tenant';
import { reviseProduct, validateProduct, type CatalogPlan, type CatalogDraft, type ProductDefinition } from './productCatalog';

/** Browser-only revision and Activity receipt commit together. No legacy checkout price changes. */
export async function saveLocalProduct(data: DataProvider, input: { id: string | null; before: CatalogDraft | null; definition: ProductDefinition; actorId: string; role: string }): Promise<CatalogPlan> {
  if (data.name !== 'mock' || !data.atomic) throw Error('disconnected');
  if (!['admin','super_admin'].includes(input.role)) throw Error('forbidden');
  const intent = structuredClone(input);
  return data.atomic(async tx => {
    const actor = await tx.get('users', intent.actorId);
    const roles = await tx.list('user_roles', { where: { user_id: intent.actorId, tenant_id: tenant.id } });
    if (!actor || actor.tenant_id !== tenant.id || actor.status !== 'active' || !roles.some(r => r.tenant_id === tenant.id && (r.role === intent.role || r.role === 'super_admin'))) throw Error('forbidden');
    const current = intent.id ? await tx.get<CatalogPlan>('plans', intent.id) : null;
    if (intent.id && (!current || current.tenant_id !== tenant.id || JSON.stringify(current.frontend_catalog ?? null) !== JSON.stringify(intent.before))) throw Error('conflict');
    const peers = await tx.list<CatalogPlan>('plans', { where: { tenant_id: tenant.id } });
    const problem = validateProduct(intent.definition, peers.filter(r => r.id !== intent.id).flatMap(r => r.frontend_catalog ? [r.frontend_catalog.definition] : []));
    if (problem) throw Error(problem);
    const frontend_catalog = reviseProduct(current?.frontend_catalog ?? null, intent.definition, intent.actorId, new Date().toISOString());
    const row = current ? await tx.update<CatalogPlan>('plans', current.id, { frontend_catalog }) : await tx.insert<CatalogPlan>('plans', {
      slug: `draft-${intent.definition.code.toLowerCase()}`, family: intent.definition.type, name_es: intent.definition.name.es, name_en: intent.definition.name.en,
      description: {es:'Borrador ficticio; no publicado',en:'Fictional draft; unpublished'}, price: 0, period: 'once', classes: intent.definition.classes, validity_days: intent.definition.validityDays,
      is_from_price: false, badge: null, active: false, sort: 999, frontend_catalog });
    await tx.insert('audit_log', { actor_id: intent.actorId, action: current ? 'product.revise' : 'product.create', entity: 'plans', entity_id: row.id, ip: null,
      diff: { role: intent.role, source: 'fictional-product-catalog', revision: frontend_catalog.history.length, before: current?.frontend_catalog?.definition.prices ?? null, after: frontend_catalog.definition.prices } });
    return row;
  });
}
