import type { DataProvider } from './types';
import { quoteProduct, validateProduct, type CatalogDraft, type CatalogPlan, type ProductQuote } from './productCatalog';

export interface CatalogPublication {
  snapshot: CatalogDraft;
  revision: number;
  actorId: string;
  at: string;
  withdrawnAt: string | null;
  history: { action: 'publish' | 'withdraw'; actorId: string; at: string; catalogRevision: number }[];
}

/** Same dated quotation contract for the admin review and the local website preview. No checkout or network share. */
export function quotePublishedProduct(plan: CatalogPlan, purchaseDate: string): ProductQuote {
  const publication = plan.frontend_publication;
  if (!publication || publication.withdrawnAt) throw new Error('unpublished');
  return quoteProduct({ ...plan, frontend_catalog: publication.snapshot }, purchaseDate);
}

export function publicationPatch(plan: CatalogPlan, action: 'publish' | 'withdraw', expectedRevision: number, actorId: string, at: string): CatalogPublication {
  if (!actorId || !Number.isFinite(Date.parse(at))) throw new Error('actor');
  const prior = plan.frontend_publication;
  if (action === 'withdraw') {
    if (!prior || prior.withdrawnAt) return prior ?? (() => { throw new Error('unpublished'); })();
    if (prior.revision !== expectedRevision) throw new Error('conflict');
    return { ...structuredClone(prior), withdrawnAt: at, history: [...prior.history, { action, actorId, at, catalogRevision: prior.revision }] };
  }
  const draft = plan.frontend_catalog;
  if (!draft || validateProduct(draft.definition)) throw new Error('invalid');
  if (!draft.definition.active) throw new Error('inactive');
  if (draft.history.length !== expectedRevision) throw new Error('conflict');
  if (prior && !prior.withdrawnAt && JSON.stringify(prior.snapshot) === JSON.stringify(draft)) return structuredClone(prior);
  return { snapshot: structuredClone(draft), revision: draft.history.length, actorId, at, withdrawnAt: null,
    history: [...(prior?.history ?? []), { action, actorId, at, catalogRevision: draft.history.length }] };
}

/** Browser-only atomic publication. Production must provide a separately authorized publication/quote service. */
export async function changeLocalPublication(data: DataProvider, input: { planId: string; action: 'publish' | 'withdraw'; expectedRevision: number; actorId: string; expectedTenant: string }): Promise<CatalogPlan> {
  if (!data.atomic || data.name !== 'mock') throw new Error('disconnected');
  return data.atomic(async tx => {
    const plan = await tx.get<CatalogPlan>('plans', input.planId);
    if (!plan || plan.tenant_id !== input.expectedTenant) throw new Error('scope');
    const frontend_publication = publicationPatch(plan, input.action, input.expectedRevision, input.actorId, new Date().toISOString());
    if (JSON.stringify(frontend_publication) === JSON.stringify(plan.frontend_publication)) return plan;
    return tx.update<CatalogPlan>('plans', plan.id, { frontend_publication });
  });
}
