import type { BaseRow } from './schema';
import { executeVoucherCommand, redemptionCodeExists, type VoucherDb, type VoucherRow, type VoucherTerms } from './vouchers';

/** Browser-local rehearsal only. Production must derive actors from authentication,
 * lock campaign/claim rows, enforce scoped RLS and expose only publicPromotionPreview.
 * All local demo rows remain inspectable; projection is not production access control.
 * Copy-on-write is atomic within one command, not safe concurrency across browser tabs. */
export interface PromotionCampaignRow extends BaseRow, Omit<VoucherTerms, 'recipientName' | 'recipientContact' | 'message'> {
  name: { es: string; en: string }; publicDescription: { es: string; en: string };
  status: 'draft' | 'approved' | 'paused'; published: boolean; approvedBy: string | null;
  startsAt: string | null; maxClaims: number | null;
}
export interface PromotionShareRow extends BaseRow {
  campaignId: string; code: string; createdBy: string;
  recipientLabel: string; privateContext: string; message: string;
}
export interface PromotionClaimRow extends BaseRow {
  campaignId: string; shareId: string; userId: string; voucherId: string; referrerId: string;
}
export interface PromotionEventRow extends BaseRow {
  campaignId: string; shareId: string | null; claimId: string | null;
  kind: PromotionCommand['type']; actorId: string; requestId: string; fingerprint: string;
  payload: Record<string, unknown>;
}
type Actor = { requestId: string; actorId: string; role: string };
export type PromotionCommand = Actor & (
  | { type: 'create_share'; campaignId: string; customCode?: string; recipientLabel?: string; privateContext?: string; message?: string }
  | { type: 'handoff'; shareId: string; channel: 'copy' | 'native' | 'whatsapp' | 'email' }
  | { type: 'claim_share'; shareId: string; userId: string }
  | { type: 'set_campaign_status'; campaignId: string; status: 'approved' | 'paused' }
);
export interface PromotionResult {
  campaign: PromotionCampaignRow; event: PromotionEventRow;
  /** Private share details are returned only to their author or authorized admin. */
  share?: PromotionShareRow; claim?: PromotionClaimRow; voucher?: VoucherRow;
}
const fail = (code: string): never => { throw new Error(code); };
const admin = (role: string) => ['super_admin', 'admin'].includes(role);
const sharer = (role: string) => admin(role) || role === 'teacher';
const CODE = /^[A-Z0-9][A-Z0-9-]{2,38}[A-Z0-9]$/;
const normalizedCode = (raw: string) => {
  const code = raw.trim().toUpperCase();
  if (!CODE.test(code)) fail('promotion_code_invalid');
  return code;
};
/** Accept one ASCII code or a same-origin full URL with exactly #/promotions/CODE.
 * Query strings, credentials, foreign origins, other routes and double encoding fail closed. */
export function parsePromotionCode(input: string, origin?: string): string {
  if (typeof input !== 'string' || input.length > 2048) return fail('promotion_code_invalid');
  const raw = input.trim();
  if (!raw.includes('://')) return normalizedCode(raw);
  try {
    const expected = origin ?? (typeof location === 'undefined' ? undefined : location.origin);
    if (!expected) return fail('promotion_code_invalid');
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== new URL(expected).origin || url.username || url.password || url.search) return fail('promotion_code_invalid');
    const match = /^#\/promotions\/([^/?#]+)$/.exec(url.hash);
    if (!match) return fail('promotion_code_invalid');
    const decoded = decodeURIComponent(match[1]);
    if (decoded !== decoded.trim()) return fail('promotion_code_invalid');
    return normalizedCode(decoded);
  } catch { return fail('promotion_code_invalid'); }
}
/** The URL intentionally contains only a code: never recipient details or private notes. */
export function promotionShareUrl(code: string, baseUrl: string): string {
  const url = new URL(baseUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return fail('promotion_code_invalid');
  url.search = ''; url.hash = `/promotions/${normalizedCode(code)}`;
  return url.toString();
}
function randomCode(): string {
  const bytes = new Uint8Array(10); crypto.getRandomValues(bytes);
  return `DEMO-${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
function terms(campaign: PromotionCampaignRow): VoucherTerms {
  return { title: campaign.title, benefitKind: campaign.benefitKind, benefitTotal: campaign.benefitTotal,
    participantCap: campaign.participantCap, capScope: campaign.capScope, creditUnit: campaign.creditUnit,
    expiresAt: campaign.expiresAt, cancellationPolicy: campaign.cancellationPolicy };
}
/** Allowlist projection. No private recipient label/context, actor identity, contact, claim or balance. */
export function publicPromotionPreview(campaign: PromotionCampaignRow, share: PromotionShareRow) {
  if (campaign.id !== share.campaignId || campaign.tenant_id !== share.tenant_id || !campaign.published || campaign.status === 'draft') return fail('promotion_not_found');
  return structuredClone({ campaignId: campaign.id, shareId: share.id, code: share.code,
    name: campaign.name, publicDescription: campaign.publicDescription, ...terms(campaign), message: share.message,
    status: campaign.status, published: campaign.published, startsAt: campaign.startsAt });
}

/** Add missing tables/campaigns in place without resetting existing vouchers or edits.
 * Called only by the mock provider; these are explicitly approved fictional demo offers. */
export function ensureDemoPromotions(db: VoucherDb, tenantId: string, now = new Date().toISOString()): void {
  for (const table of ['promotion_campaigns', 'promotion_shares', 'promotion_claims', 'promotion_events']) db[table] ??= [];
  const campaigns = db.promotion_campaigns as PromotionCampaignRow[];
  const expiresAt = new Date(Date.parse(now) + 45 * 86400000).toISOString();
  for (const group of [false, true]) {
    const id = group ? 'promo_demo_friends' : 'promo_demo_first';
    if (campaigns.some(c => c.id === id && c.tenant_id === tenantId)) continue;
    campaigns.push({ id, tenant_id: tenantId, created_at: now, updated_at: now,
      title: group ? 'Invitación para dos · demo' : 'Primera práctica · demo',
      name: group ? { es: 'Invitación para dos · demo', en: 'Invitation for two · demo' } : { es: 'Primera práctica · demo', en: 'First practice · demo' },
      publicDescription: group ? { es: 'Dos clases para compartir una práctica. Oferta ficticia de demostración.', en: 'Two class credits to share a practice. Fictional demo offer.' } : { es: 'Una clase para descubrir tu práctica. Oferta ficticia de demostración.', en: 'One class to discover your practice. Fictional demo offer.' },
      status: 'approved', published: true, approvedBy: 'usr_admin', startsAt: null, maxClaims: 50,
      benefitKind: 'classes', benefitTotal: group ? 2 : 1, participantCap: group ? 2 : 1,
      capScope: 'per_booking', creditUnit: 'per_person', expiresAt, cancellationPolicy: 'restore' });
  }
}

/** Atomic copy-on-write transaction. A share is an invitation, never a spendable voucher.
 * Claim deduplication is tenant + campaign + user, independent of which code they retry. */
export function executePromotionCommand(database: VoucherDb, command: PromotionCommand, context: { tenantId: string; now?: string; id?: () => string; code?: () => string }): { db: VoucherDb; result: PromotionResult } {
  let db = structuredClone(database); const c = command;
  const now = context.now ?? new Date().toISOString();
  const id = context.id ?? (() => crypto.randomUUID());
  const base = (): BaseRow => ({ id: id(), tenant_id: context.tenantId, created_at: now, updated_at: now });
  for (const table of ['promotion_campaigns', 'promotion_shares', 'promotion_claims', 'promotion_events']) db[table] ??= [];
  const campaigns = db.promotion_campaigns as PromotionCampaignRow[], shares = db.promotion_shares as PromotionShareRow[], claims = db.promotion_claims as PromotionClaimRow[];
  if (!c.requestId?.trim() || !c.actorId?.trim() || !(db.users ?? []).some(u => u.id === c.actorId && u.tenant_id === context.tenantId)) fail('promotion_identity_required');
  const fingerprint = JSON.stringify(c);
  const prior = (db.promotion_events as PromotionEventRow[]).find(e => e.tenant_id === context.tenantId && e.requestId === c.requestId);
  if (prior) {
    if (prior.actorId !== c.actorId || prior.fingerprint !== fingerprint) fail('promotion_request_conflict');
    return { db, result: structuredClone(prior.payload.result as unknown as PromotionResult) };
  }
  let share: PromotionShareRow | undefined, claim: PromotionClaimRow | undefined, voucher: VoucherRow | undefined;
  if ('shareId' in c) share = shares.find(s => s.id === c.shareId && s.tenant_id === context.tenantId) ?? fail('promotion_not_found');
  const campaignId = 'campaignId' in c ? c.campaignId : share!.campaignId;
  const campaign = campaigns.find(p => p.id === campaignId && p.tenant_id === context.tenantId) ?? fail('promotion_not_found');
  if (c.type === 'set_campaign_status') {
    if (!admin(c.role)) fail('promotion_forbidden');
    if (!campaign.published || !campaign.approvedBy || campaign.status === 'draft' || !['approved', 'paused'].includes(c.status)) fail('promotion_unavailable');
    campaign.status = c.status; campaign.updated_at = now;
  } else {
    if (c.type === 'claim_share') {
      if (c.role !== 'customer' || c.userId !== c.actorId) fail('promotion_identity_required');
      claim = claims.find(row => row.tenant_id === context.tenantId && row.campaignId === campaign.id && row.userId === c.userId);
      if (claim) voucher = (db.vouchers as VoucherRow[]).find(v => v.id === claim!.voucherId && v.tenant_id === context.tenantId && v.claimedBy === c.userId) ?? fail('promotion_claim_invalid');
    } else if (!sharer(c.role) || (share && share.createdBy !== c.actorId && !admin(c.role))) fail('promotion_forbidden');
    // Existing claims remain accessible after campaign pause/expiry; they cannot mint a second voucher.
    if (!claim && (campaign.status !== 'approved' || !campaign.published || !campaign.approvedBy ||
      (campaign.startsAt && (!Number.isFinite(Date.parse(campaign.startsAt)) || Date.parse(campaign.startsAt) > Date.parse(now))) ||
      (campaign.expiresAt && (!Number.isFinite(Date.parse(campaign.expiresAt)) || Date.parse(campaign.expiresAt) <= Date.parse(now))))) fail('promotion_unavailable');
    if (c.type === 'create_share') {
      const code = c.customCode === undefined ? normalizedCode((context.code ?? randomCode)()) : normalizedCode(c.customCode);
      if (redemptionCodeExists(db, context.tenantId, code)) fail('promotion_code_exists');
      const recipientLabel = c.recipientLabel?.trim() ?? '', privateContext = c.privateContext?.trim() ?? '', message = c.message?.trim() ?? '';
      if (recipientLabel.length > 120 || privateContext.length > 1000 || message.length > 1000) fail('promotion_text_too_long');
      share = { ...base(), campaignId: campaign.id, code, createdBy: c.actorId, recipientLabel, privateContext, message }; shares.push(share);
    }
    if (c.type === 'handoff' && !['copy', 'native', 'whatsapp', 'email'].includes(c.channel)) fail('promotion_channel_invalid');
    if (c.type === 'claim_share' && !claim) {
      if (campaign.maxClaims !== null && (!Number.isSafeInteger(campaign.maxClaims) || campaign.maxClaims < 1 || claims.filter(row => row.tenant_id === context.tenantId && row.campaignId === campaign.id).length >= campaign.maxClaims)) fail('promotion_claim_limit');
      if (!Number.isSafeInteger(campaign.benefitTotal) || campaign.benefitTotal < 1 || !Number.isSafeInteger(campaign.participantCap) || campaign.participantCap < 1 || !['classes', 'cop'].includes(campaign.benefitKind) || !['per_booking', 'lifetime'].includes(campaign.capScope) || !['per_person', 'per_booking'].includes(campaign.creditUnit) || !['restore', 'forfeit'].includes(campaign.cancellationPolicy)) fail('promotion_terms_invalid');
      voucher = { ...base(), ...terms(campaign), title: campaign.title, code: `VOUCHER-${id().replace(/-/g, '').toUpperCase()}`,
        recipientName: '', recipientContact: '', message: share!.message, source: 'promotion_claim',
        balance: campaign.benefitTotal, status: 'issued', claimedBy: null, issuedBy: campaign.approvedBy!,
        campaignId: campaign.id, shareId: share!.id, referrerId: share!.createdBy };
      if (redemptionCodeExists(db, context.tenantId, voucher.code)) fail('voucher_code_exists');
      (db.vouchers ??= []).push(voucher);
      const claimed = executeVoucherCommand(db, { type: 'claim', requestId: `promotion:${c.requestId}:claim`, actorId: c.actorId, role: 'customer', userId: c.userId, voucherId: voucher.id }, context);
      db = claimed.db; voucher = claimed.result.voucher;
      claim = { ...base(), campaignId: campaign.id, shareId: share!.id, userId: c.userId, voucherId: voucher.id, referrerId: share!.createdBy };
      db.promotion_claims.push(claim);
    }
  }
  const event: PromotionEventRow = { ...base(), campaignId: campaign.id, shareId: share?.id ?? null, claimId: claim?.id ?? null,
    kind: c.type, actorId: c.actorId, requestId: c.requestId, fingerprint,
    payload: c.type === 'handoff' ? { channel: c.channel, deliveryStatus: c.channel === 'copy' ? 'copied' : 'handoff', deliveryVerified: false } : c.type === 'claim_share' ? { originalShareId: claim!.shareId, referrerId: claim!.referrerId } : {} };
  const result: PromotionResult = structuredClone({ campaign, event, ...(share && c.type !== 'claim_share' ? { share } : {}), ...(claim ? { claim } : {}), ...(voucher ? { voucher } : {}) });
  event.payload = { ...event.payload, result }; db.promotion_events.push(event);
  return { db, result };
}
