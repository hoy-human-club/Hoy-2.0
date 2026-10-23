/** PC-01 / PC-02 remain owner decisions. Null means unresolved, never an automatic 15/60-minute rule. */
export interface PaymentWindows { transferMinutes: number | null; frontDeskMinutes: number | null }
export const UNRESOLVED_PAYMENT_WINDOWS: Readonly<PaymentWindows> = Object.freeze({ transferMinutes: null, frontDeskMinutes: null });
export type PaymentWindow = { state: 'unresolved' | 'invalid'; deadline: null; remainingMs: null }
  | { state: 'waiting' | 'elapsed'; deadline: string; remainingMs: number };
/** Pure boundary projection only. No reservation release, notification, timer or financial command. */
export function paymentWindow(createdAt: string, method: 'transfer' | 'frontDesk', policy: Readonly<PaymentWindows> = UNRESOLVED_PAYMENT_WINDOWS, now = Date.now()): PaymentWindow {
  const minutes = method === 'transfer' ? policy.transferMinutes : policy.frontDeskMinutes;
  if (minutes === null) return { state: 'unresolved', deadline: null, remainingMs: null };
  const created = Date.parse(createdAt), deadline = created + minutes * 60_000;
  if (!Number.isSafeInteger(minutes) || minutes <= 0 || !Number.isFinite(created) || !Number.isFinite(now) || !Number.isSafeInteger(deadline) || Math.abs(deadline) > 8.64e15 || created > now) return { state: 'invalid', deadline: null, remainingMs: null };
  return { state: now >= deadline ? 'elapsed' : 'waiting', deadline: new Date(deadline).toISOString(), remainingMs: Math.max(0, deadline - now) };
}
