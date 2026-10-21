import type { CatalogPublication } from './catalogPublication';
import type { PlanRow } from './schema';

/** Frontend draft contract. Legacy plan/public pricing is deliberately not published by this prototype. */
export interface ProductPrice { id: string; amount: number; startsOn: string; endsOn: string | null }
export interface ProductDefinition { code: string; name: { es: string; en: string }; type: PlanRow['family']; classes: number; validityDays: number; active: boolean; prices: ProductPrice[] }
export interface ProductRevision { revision: number; actorId: string; at: string; definition: ProductDefinition }
export interface CatalogDraft { definition: ProductDefinition; history: ProductRevision[] }
export type CatalogPlan = PlanRow & { frontend_catalog?: CatalogDraft; frontend_publication?: CatalogPublication };
export interface ProductQuote { productId: string; code: string; name: { es: string; en: string }; priceId: string; amount: number; currency: 'COP'; purchaseDate: string; classes: number; validityDays: number; catalogRevision: number }

export function validProductDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function validateProduct(definition: ProductDefinition, peers: ProductDefinition[] = []): string | null {
  if (!/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(definition.code)) return 'code';
  if (peers.some(p => p.code.toUpperCase() === definition.code.toUpperCase())) return 'duplicate';
  if (!definition.name.es.trim() || !definition.name.en.trim() || definition.name.es.length > 100 || definition.name.en.length > 100) return 'name';
  if (!['bienvenida','paquetes','privadas','regalos'].includes(definition.type)) return 'type';
  if (!Number.isSafeInteger(definition.classes) || definition.classes < 1 || definition.classes > 1000 || !Number.isSafeInteger(definition.validityDays) || definition.validityDays < 1 || definition.validityDays > 3650) return 'quantity';
  if (!definition.prices.length) return 'price';
  const ordered = [...definition.prices].sort((a,b)=>a.startsOn.localeCompare(b.startsOn));
  const ids = new Set<string>();
  for (let i = 0; i < ordered.length; i++) {
    const price = ordered[i];
    if (!price.id || ids.has(price.id)) return 'price'; ids.add(price.id);
    if (!Number.isSafeInteger(price.amount) || price.amount < 0 || price.amount > 1_000_000_000) return 'price';
    if (!validProductDate(price.startsOn) || (price.endsOn !== null && (!validProductDate(price.endsOn) || price.endsOn < price.startsOn))) return 'dates';
    if (i && (!ordered[i-1].endsOn || ordered[i-1].endsOn! >= price.startsOn)) return 'overlap';
  }
  return null;
}
export function catalogDraft(plan: CatalogPlan): CatalogDraft | null { return plan.frontend_catalog ?? null; }
export function quoteProduct(plan: CatalogPlan, purchaseDate: string): ProductQuote {
  const draft = catalogDraft(plan);
  if (!draft || validateProduct(draft.definition)) throw new Error('invalid');
  if (!validProductDate(purchaseDate)) throw new Error('dates');
  if (!draft.definition.active) throw new Error('inactive');
  const price = draft.definition.prices.find(p => p.startsOn <= purchaseDate && (!p.endsOn || purchaseDate <= p.endsOn));
  if (!price) throw new Error('unpriced');
  return {productId:plan.id,code:draft.definition.code,name:{...draft.definition.name},priceId:price.id,amount:price.amount,currency:'COP',purchaseDate,classes:draft.definition.classes,validityDays:draft.definition.validityDays,catalogRevision:draft.history.length};
}
/** Append immutable history to the same mock row write. Server integration must make this transactional and append-only. */
export function reviseProduct(previous: CatalogDraft | null, definition: ProductDefinition, actorId: string, at: string): CatalogDraft {
  const problem = validateProduct(definition); if (problem) throw new Error(problem);
  if (!actorId || !Number.isFinite(new Date(at).getTime())) throw new Error('actor');
  const snapshot = structuredClone(definition);
  return {definition:snapshot,history:[...(previous?.history ?? []),{revision:(previous?.history.length ?? 0)+1,actorId,at,definition:structuredClone(snapshot)}]};
}
