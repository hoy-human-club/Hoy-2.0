/**
 * 0041 — developer API keys (D-0018). HoyOS issues keys to developers (inbound); it never stores a raw key:
 * the list keeps the 13-character prefix people recognise (`hoy_live_ab12`) and a SHA-256 hash the server
 * compares against. The raw key exists once, in the browser memory of the person who created it, and is shown
 * to them one time. Verification (hash the bearer token, look up the row, check scope, expiry and revocation,
 * stamp last_used_at) is the server's job and does not exist yet.
 *
 * Format: `hoy_<live|test>_<24 chars base62>` — 24 × log2(62) ≈ 143 bits of entropy from crypto.getRandomValues,
 * rejection-sampled so every character is equally likely. Header: `Authorization: Bearer hoy_live_…`.
 */
import type { ApiKeyEnvironment, ApiKeyRow } from '../../data/schema';
import { MS } from '../../i18n/format';

export const API_KEY_SCOPES = ['classes.read', 'bookings.read', 'bookings.write', 'customers.read', 'hours.read', 'hours.write', 'webhooks.receive'] as const;
export type ApiKeyScope = typeof API_KEY_SCOPES[number];
export const API_KEY_PREFIX_LENGTH = 13;
/** How long a rotated key keeps working so the developer can deploy the new one. */
export const ROTATION_GRACE_MS = 24 * MS.hour;
/** A key that expires within this window shows as "expiring". */
export const EXPIRING_WINDOW_MS = 7 * MS.day;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** 24 unbiased base62 characters from the platform CSPRNG. */
function randomBase62(length = 24): string {
  const out: string[] = [];
  const buf = new Uint8Array(64);
  while (out.length < length) {
    crypto.getRandomValues(buf);
    // 248 = 4 × 62: bytes at or above it would favour the first characters, so they are dropped.
    for (const b of buf) if (b < 248 && out.length < length) out.push(ALPHABET[b % 62]);
  }
  return out.join('');
}

export const generateApiKey = (env: ApiKeyEnvironment) => `hoy_${env}_${randomBase62()}`;
export const keyPrefix = (raw: string) => raw.slice(0, API_KEY_PREFIX_LENGTH);

/** SHA-256 hex of the key, via Web Crypto (needs a secure context: https or localhost). */
export async function sha256Hex(raw: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is not available (open the app over https or localhost)');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type ApiKeyStatus = 'active' | 'expiring' | 'expired' | 'revoked' | 'invalid';

export function keyStatus(k: Pick<ApiKeyRow, 'revoked_at' | 'expires_at'>, now: Date = new Date()): ApiKeyStatus {
  if (k.revoked_at) return 'revoked';
  if (k.expires_at === null) return 'active';
  if (typeof k.expires_at !== 'string' || !Number.isFinite(Date.parse(k.expires_at))) return 'invalid';
  const left = new Date(k.expires_at).getTime() - now.getTime();
  if (left <= 0) return 'expired';
  return left <= EXPIRING_WINDOW_MS ? 'expiring' : 'active';
}

/** A row ready to insert, plus the raw key to show once. The raw key never goes into the row. */
export async function newKeyRow(input: { name: string; environment: ApiKeyEnvironment; scopes: string[]; expiresAt: string | null; createdBy: string | null; replacesId?: string | null }): Promise<{ raw: string; row: Partial<ApiKeyRow> }> {
  if (!input.name.trim() || !['test','live'].includes(input.environment) || !input.scopes.length || input.scopes.some(s=>!(API_KEY_SCOPES as readonly string[]).includes(s)) || input.expiresAt!==null && !Number.isFinite(Date.parse(input.expiresAt))) throw new Error('api_key_invalid');
  const raw = generateApiKey(input.environment);
  return {
    raw,
    row: {
      name: input.name.trim(), prefix: keyPrefix(raw), key_hash: await sha256Hex(raw),
      scopes: input.scopes.filter((s) => (API_KEY_SCOPES as readonly string[]).includes(s)), environment: input.environment,
      created_by: input.createdBy, last_used_at: null, expires_at: input.expiresAt, revoked_at: null, replaces_id: input.replacesId ?? null,
    },
  };
}
