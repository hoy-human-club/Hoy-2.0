/**
 * Booking and payment policy for the customer app. Numbers the canvas cites (C-04, C-07b, C-08, C-08b, C-20, E-02, E-04, C-21).
 *
 * Source of truth: M-08 Studio settings (`tenants.settings`). Since 0.5.0 this module no longer keeps its own
 * provider subscription: it reads `usePolicy()` from src/modules/admin/settings.ts (the live reader that follows
 * `tenants` through useTable()), so an M-08 save reaches the customer app the same way it reaches the admin.
 * `policy.*` stays a plain read (no hook) so helpers such as cancelDeadline() keep working from any call site;
 * <PolicySync/> (mounted once in src/app/App.tsx, above the router) is what feeds that snapshot from the hook.
 * Prices never live here — see src/tenant/pricing.ts.
 */
import { useMemo } from 'react';
import { DEFAULT_SETTINGS, usePolicy, type StudioSettings } from '../admin/settings';
import { MS } from '../../i18n/format';

export interface PolicyValues {
  /** Free cancellation until this many hours before start; inside, the class counts as used (late_cancel). */
  cancelWindowHours: number;
  /** A released spot is offered to the next waitlisted person for this long. */
  claimWindowMinutes: number;
  /** A declined payment keeps the spot held this long (E-02). */
  paymentHoldMinutes: number;
  /** IVA rate as a fraction. Prices in pricing.ts are IVA-inclusive by default; the tax is always computed, never typed. */
  ivaRate: number;
  /** The 12-class package: longest freeze in days, and how many freezes one package allows (C-07b, 0051). */
  freezeMaxDays: number;
  freezesPerPackage: number;
  /** Days before a renewal charge the member is notified. */
  chargeNoticeDays: number;
  /** Sign-in lockout (A-02 / E-04). */
  lockoutAttempts: number;
  lockoutMinutes: number;
  /** WhatsApp OTP (C-21). */
  otpLength: number;
  otpResendSeconds: number;
  otpValidMinutes: number;
  /** Invites expire after this many days (C-16). */
  inviteValidityDays: number;
  /** Countdown switches to "check in at the front desk" inside this window (C-08); check-in itself is only at reception. */
  checkinOpensMinutes: number;
  /** Gift card message length (C-17). */
  giftMessageMax: number;
  /** Studio reply window shown on outbound contact rows (C-25). */
  replyWindow: { es: string; en: string };
}

/** Product constants the settings screen does not expose (yet). */
const FIXED = {
  otpLength: 6,
  otpResendSeconds: 45,
  otpValidMinutes: 10,
  inviteValidityDays: 30,
  checkinOpensMinutes: 60,
  giftMessageMax: 250,
  replyWindow: { es: 'Respondemos en horario del estudio', en: 'We reply during studio hours' },
} as const;

function toPolicyValues(p: StudioSettings['policies'], tax: StudioSettings['tax']): PolicyValues {
  return {
    cancelWindowHours: p.cancellationHours,
    claimWindowMinutes: p.waitlistClaimMin,
    paymentHoldMinutes: p.paymentHoldMin,
    ivaRate: tax.ivaPct / 100,
    freezeMaxDays: p.freezeMaxDays,
    freezesPerPackage: p.freezesPerPackage,
    chargeNoticeDays: p.chargeNoticeDays,
    lockoutAttempts: p.lockoutAttempts,
    lockoutMinutes: p.lockoutMinutes,
    ...FIXED,
  };
}

/** Full settings → policy values. Kept for tests, docs and any non-React caller. */
function policyFromSettings(s: StudioSettings): PolicyValues {
  return toPolicyValues(s.policies, s.tax);
}

let current: PolicyValues = policyFromSettings(DEFAULT_SETTINGS);

/** Live view of the current policy. Property reads always return the latest synced value. */
export const policy: Readonly<PolicyValues> = new Proxy({} as PolicyValues, {
  get: (_t, k) => current[k as keyof PolicyValues],
  ownKeys: () => Object.keys(current),
  getOwnPropertyDescriptor: (_t, k) => ({ enumerable: true, configurable: true, value: current[k as keyof PolicyValues] }),
});

/** Snapshot (for tests and docs). */

/** The policy values as a hook — re-renders the caller on every M-08 save. Preferred in new components. */
function usePolicyValues(): PolicyValues {
  const live = usePolicy();
  return useMemo(() => toPolicyValues(live, live.tax), [live]);
}

/**
 * Mount once inside DataProviderRoot (above the router) so M-08 edits reach the customer app and the
 * A-02 lockout live. It keeps the `policy` snapshot in step with `usePolicy()`; the assignment happens
 * during render, before the routed pages below it render, so the first paint already reads stored values.
 */
export function PolicySync(): null {
  current = usePolicyValues();
  return null;
}

export function cancelDeadline(startsAt: string): Date {
  return new Date(new Date(startsAt).getTime() - policy.cancelWindowHours * MS.hour);
}
export function insideCancelWindow(startsAt: string, now = Date.now()): boolean {
  return now > cancelDeadline(startsAt).getTime();
}
