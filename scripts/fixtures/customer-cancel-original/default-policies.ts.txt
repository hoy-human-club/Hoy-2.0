/**
 * The studio's booking and package rules as defaults (0051) — a pure module (no React), so the seed, the settings
 * screen (M-08b) and the legal tokens read one source. The live values are what the owner saves in M-08
 * (`tenants.settings.policies`, read through `usePolicy()`); these are only where they start.
 *
 * Source: the verified FAQ and Términos y Condiciones (2026-10-01): cancel up to 12 hours before the class; the
 * 12-class package can be frozen once, for up to 30 days; no minimum time to book while there are spots; a no-show
 * is not refunded, and a class missed through illness is rescheduled (a text rule, see `studio_policies`).
 */
export const DEFAULT_POLICIES = {
  /** Free cancellation until this many hours before the class; inside it the class counts as used. */
  cancellationHours: 12,
  /** A released spot is offered to the next person on the waitlist for this long. */
  waitlistClaimMin: 30,
  /** Arriving this late still counts as on time at the desk. */
  lateGraceMin: 15,
  /** No fee is charged for a no-show: the class is simply used. */
  noShowFee: 0,
  /** The 12-class package: the longest freeze, in days … */
  freezeMaxDays: 30,
  /** … and how many freezes one package allows. */
  freezesPerPackage: 1,
  /** A declined payment keeps the spot held this long. */
  paymentHoldMin: 10,
  /** Days of notice before a recurring charge (no recurring plan at launch; kept for later). */
  chargeNoticeDays: 3,
  lockoutAttempts: 5,
  lockoutMinutes: 15,
};
