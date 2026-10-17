/** Portable contract. No provider credentials, seed bills, or implied live connections. */
export type Verification = { evidence: string; lastVerified: string | null };
export type AppDependency = Verification & {
  id: string; workspaceId: string; provider: string; product: string; purpose: string; category: string;
  officialUrl: string; manageUrl: string; relatedProjects: string[];
  connectionState: 'possible' | 'disconnected' | 'manual' | 'verified';
};
export type Subscription = Verification & {
  id: string; workspaceId: string; dependencyId: string; expectedAmount: number | null;
  currency: string; interval: 'monthly' | 'biweekly' | 'yearly'; anchorDay: number;
  nextChargeDate: string | null; paymentAccountLabel: string; status: 'unknown' | 'trial' | 'active' | 'paused' | 'cancelled'; owner: string;
};
export type ActualCharge = Verification & {
  id: string; workspaceId: string; subscriptionId: string; amount: number; currency: string;
  chargedOn: string; reference: string;
};
export type Directory = { version: 1; workspaceId: string; dependencies: AppDependency[]; subscriptions: Subscription[]; charges: ActualCharge[] };
export const disconnectedAdapters = { email: 'DISCONNECTED', bank: 'DISCONNECTED' } as const;
export const emptyDirectory = (workspaceId: string): Directory => ({ version: 1, workspaceId, dependencies: [], subscriptions: [], charges: [] });
export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value + 'T12:00:00Z').toISOString().slice(0,10) === value;
}
export function safeUrl(value: string): boolean {
  if (!value) return true;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash; } catch { return false; }
}
export function validateDirectory(d: Directory): void {
  const fail = (message: string) => { throw new Error(message); };
  if (d.version !== 1 || !d.workspaceId || !Array.isArray(d.dependencies) || !Array.isArray(d.subscriptions) || !Array.isArray(d.charges)) fail('Invalid directory format.');
  const rows = [...d.dependencies, ...d.subscriptions, ...d.charges];
  if (new Set(rows.map(r => r.id)).size !== rows.length) fail('Duplicate record ID.');
  for (const r of rows) {
    if (!r.id || r.workspaceId !== d.workspaceId) fail('Workspace mismatch.');
    if (r.lastVerified && (!validDate(r.lastVerified) || !r.evidence.trim() || r.lastVerified > new Date().toISOString().slice(0,10))) fail('Verification needs evidence and a valid past or current date.');
  }
  // Minimize accidental sensitive data entry; this is not a secret vault.
  const text = JSON.stringify(rows);
  if (/(?:\d[ -]?){13,19}/.test(text) || /(?:sk_live_|sk_test_|-----BEGIN|Bearer\s)/i.test(text)) fail('Do not store card numbers, credentials, or tokens. Use display labels only.');
  const money = (n: number | null, c: string) => {
    if (n !== null && (!Number.isFinite(n) || n < 0)) fail('Amount must be blank (unknown) or a non-negative number.');
    if (!/^[A-Z]{3}$/.test(c)) fail('Use a three-letter currency code.');
    try { new Intl.NumberFormat('en', {style:'currency',currency:c}); } catch { fail('Invalid currency.'); }
  };
  for (const a of d.dependencies) {
    if (!a.provider.trim() || !a.product.trim() || !a.purpose.trim()) fail('Provider, product and purpose are required.');
    if (!['possible','disconnected','manual','verified'].includes(a.connectionState)) fail('Invalid connection state.');
    if (a.connectionState === 'verified' && !a.lastVerified) fail('A verified connection needs dated evidence.');
    if (!safeUrl(a.officialUrl) || !safeUrl(a.manageUrl)) fail('Use HTTPS URLs without credentials, query strings or fragments.');
  }
  for (const s of d.subscriptions) {
    if (!d.dependencies.some(a => a.id === s.dependencyId)) fail('Subscription must link to an app in this workspace.');
    money(s.expectedAmount, s.currency);
    if (!['monthly','biweekly','yearly'].includes(s.interval) || !['unknown','trial','active','paused','cancelled'].includes(s.status)) fail('Invalid subscription state.');
    if (!Number.isInteger(s.anchorDay) || s.anchorDay < 1 || s.anchorDay > 31 || (s.nextChargeDate && !validDate(s.nextChargeDate))) fail('Invalid billing date.');
  }
  const references = new Set<string>();
  for (const c of d.charges) {
    if (!d.subscriptions.some(s => s.id === c.subscriptionId)) fail('Charge must link to a subscription in this workspace.');
    money(c.amount,c.currency);
    if (c.amount === null || !validDate(c.chargedOn) || !c.reference.trim() || !c.evidence.trim()) fail('A charge needs amount, date, unique reference and evidence.');
    const key = `${c.subscriptionId}|${c.reference.trim()}`;
    if (references.has(key)) fail('This charge reference has already been recorded.');
    references.add(key);
  }
}
export function nextRenewal(s: Pick<Subscription,'nextChargeDate'|'interval'|'anchorDay'>): string | null {
  if (!s.nextChargeDate) return null;
  const date = new Date(s.nextChargeDate + 'T12:00:00Z');
  if (s.interval === 'biweekly') date.setUTCDate(date.getUTCDate() + 14);
  else {
    const month = date.getUTCMonth() + (s.interval === 'yearly' ? 12 : 1);
    const last = new Date(Date.UTC(date.getUTCFullYear(),month + 1,0)).getUTCDate();
    date.setUTCDate(1); date.setUTCMonth(month); date.setUTCDate(Math.min(s.anchorDay,last));
  }
  return date.toISOString().slice(0,10);
}
export function monthlyEstimates(subscriptions: Subscription[]) {
  const totals: Record<string, { amount: number; unknown: number }> = {};
  for (const s of subscriptions.filter(s => s.status === 'active')) {
    const t = totals[s.currency] ??= {amount:0, unknown:0};
    if (s.expectedAmount === null) t.unknown++;
    else t.amount += s.expectedAmount * (s.interval === 'yearly' ? 1/12 : s.interval === 'biweekly' ? 26/12 : 1);
  }
  return totals;
}
export function chargeTotals(charges: ActualCharge[]) {
  const totals: Record<string,number> = {};
  for (const c of charges) totals[c.currency] = (totals[c.currency] ?? 0) + c.amount;
  return totals;
}
export const storageKey = (workspaceId: string) => `hub.app-subscriptions.v1:${workspaceId}`;
export function readDirectory(storage: Pick<Storage,'getItem'>, workspaceId: string): Directory {
  const raw = storage.getItem(storageKey(workspaceId));
  if (!raw) return emptyDirectory(workspaceId);
  const d = JSON.parse(raw) as Directory;
  if (d.workspaceId !== workspaceId) throw new Error('Workspace mismatch.');
  validateDirectory(d); return d;
}
export function saveDirectory(storage: Pick<Storage,'setItem'|'getItem'>, d: Directory, expectedRaw: string | null) {
  validateDirectory(d);
  if (storage.getItem(storageKey(d.workspaceId)) !== expectedRaw) throw new Error('Records changed in another tab. Reload before saving.');
  storage.setItem(storageKey(d.workspaceId), JSON.stringify(d));
}
