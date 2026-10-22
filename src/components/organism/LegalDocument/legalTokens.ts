/** Values the {{token}}s in a legal body resolve against. */
export interface LegalTokens { tenant: Record<string, string | number>; policy: Record<string, string | number>; price?: Record<string, string | number> }

/**
 * Resolves `{{tenant.*}}`, `{{policy.*}}` and (0051) `{{price.<id>}}` in a legal body. Studio identity comes from
 * src/tenant/tenant.ts + M-08, policy numbers from usePolicy(), prices from src/tenant/pricing.ts, so the copy never repeats a number
 * that a screen can change. An unknown token is left visible as `⟨token⟩` rather than silently
 * dropped, the same way a missing i18n key behaves.
 */
export function resolveLegalTokens(body: string, tokens: LegalTokens): string {
  return body.replace(/\{\{(tenant|policy|price)\.([a-zA-Z0-9_]+)\}\}/g, (_m, ns: 'tenant' | 'policy' | 'price', key: string) => {
    const v = tokens[ns]?.[key];
    return v === undefined || v === null ? `⟨${ns}.${key}⟩` : String(v);
  });
}
