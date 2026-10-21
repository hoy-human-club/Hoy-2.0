/**
 * 0051 — the 12-class package, read from the `class_ledger` (pure: no React, no provider).
 *
 * Contents
 *   1. packageState() — balance, the package in use, its expiry and its freeze, from one person's ledger rows
 *   2. freezePatch() / resumePatch() — the row changes a freeze and an early resume write on the purchase row
 *
 * HOY sells classes, never credits: a purchase row adds the classes (+12, or +1 for a class bought ahead), a booking
 * takes one (−1), a cancellation outside the window gives it back (+1). The package lasts `validity_days` (3 months)
 * and can be frozen once for up to the M-08 `freezeMaxDays`; a freeze moves the expiry by the frozen days.
 */
import type { ClassLedgerRow, PaymentRow } from './schema';
import { addDaysKey, dateKey, fromDateKey, MS } from '../i18n/format';

// ── 1. packageState ────────────────────────────────────────────────────────────────────────────────

export interface PackageState {
  /** Classes the person can still book with (0 while the package is frozen). */
  balance: number;
  /** Classes left, frozen or not. */
  left: number;
  /** The live package purchase (more than one class), newest first; null without one. */
  purchase: ClassLedgerRow | null;
  /** The day the classes run out (the earliest live expiry). */
  expiresAt: string | null;
  /** Today falls inside the package's freeze. */
  frozen: boolean;
  frozenUntil: string | null;
  /** The package already used its freeze (frozen now or before). */
  freezeUsed: boolean;
}

/** Payment-backed purchases are usable only after confirmation. Unlinked historical grants retain their terms. */
export function approvedPackageRows(rows: ClassLedgerRow[], payments: PaymentRow[]): ClassLedgerRow[] {
  const approved = new Set(payments.filter(p => p.status === 'approved').map(p => p.id));
  return rows.filter(row => !(row.reason === 'purchase' && row.delta > 0 && row.payment_id) || approved.has(row.payment_id!));
}

export function packageState(rows: ClassLedgerRow[], today: string = dateKey()): PackageState {
  const live = rows.filter((c) => !c.expires_at || c.expires_at >= today || c.delta < 0);
  const left = Math.max(0, live.reduce((a, c) => a + c.delta, 0));
  const purchase = rows
    .filter((c) => c.reason === 'purchase' && c.delta > 1 && (!c.expires_at || c.expires_at >= today))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  const expiresAt = rows.filter((c) => c.delta > 0 && c.expires_at && c.expires_at >= today).map((c) => c.expires_at!).sort()[0] ?? null;
  const frozen = !!purchase?.frozen_from && !!purchase.frozen_until && purchase.frozen_from <= today && today <= purchase.frozen_until;
  return {
    balance: frozen ? 0 : left, left, purchase, expiresAt, frozen,
    frozenUntil: frozen ? purchase!.frozen_until ?? null : null,
    freezeUsed: !!purchase?.frozen_from,
  };
}

// ── 2. freeze / resume ─────────────────────────────────────────────────────────────────────────────

/** Freeze from today for `days` days: the expiry moves by the same days. */
export function freezePatch(purchase: ClassLedgerRow, days: number, today: string = dateKey()): Partial<ClassLedgerRow> {
  return {
    frozen_from: today,
    frozen_until: addDaysKey(today, days - 1),
    expires_at: purchase.expires_at ? addDaysKey(purchase.expires_at, days) : null,
  };
}

/** End a freeze early: the days not used come back off the expiry. The freeze still counts as used. */
export function resumePatch(purchase: ClassLedgerRow, today: string = dateKey()): Partial<ClassLedgerRow> {
  if (!purchase.frozen_until || today > purchase.frozen_until) return {};
  const unused = Math.round((fromDateKey(purchase.frozen_until).getTime() - fromDateKey(today).getTime()) / MS.day) + 1;
  return {
    frozen_until: addDaysKey(today, -1),
    expires_at: purchase.expires_at ? addDaysKey(purchase.expires_at, -unused) : null,
  };
}

// Contents (again): 1. packageState · 2. freezePatch, resumePatch
