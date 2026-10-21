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
  /** The newest live package purchase with remaining classes; null without one. */
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
  return rows.filter(row => !(row.reason === 'purchase' && row.delta > 0 && row.payment_id) ||
    payments.some(p => p.id === row.payment_id && p.status === 'approved' && p.user_id === row.user_id && p.tenant_id === row.tenant_id));
}

export interface PackageLot {
  purchase: ClassLedgerRow;
  left: number;
  debits: { ledgerId: string; quantity: number }[];
}

/** Read-only mock reconstruction. Never rewrites historical grants or lets old debt consume a later purchase.
 * Explicit lot/payment references win. Legacy unlinked usage consumes eligible existing lots by earliest
 * expiry, then creation/id; this deterministic frontend fallback still needs Anu's migration reconciliation.
 */
export function packageLots(rows: ClassLedgerRow[]): PackageLot[] {
  const lots: PackageLot[] = [];
  const ordered = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at) ||
    (b.delta > 0 ? 1 : 0) - (a.delta > 0 ? 1 : 0) || a.id.localeCompare(b.id));
  const byExpiry = (a: PackageLot, b: PackageLot) =>
    (a.purchase.expires_at ?? '9999').localeCompare(b.purchase.expires_at ?? '9999') ||
    a.purchase.created_at.localeCompare(b.purchase.created_at) || a.purchase.id.localeCompare(b.purchase.id);
  for (const row of ordered) {
    if (row.delta > 0 && !row.purchase_ledger_id) {
      lots.push({ purchase: row, left: row.delta, debits: [] });
      continue;
    }
    const candidates = lots.filter(l => l.purchase.tenant_id === row.tenant_id && l.purchase.user_id === row.user_id &&
      (row.purchase_ledger_id ? l.purchase.id === row.purchase_ledger_id :
        row.payment_id ? l.purchase.payment_id === row.payment_id :
          (!row.plan_id || l.purchase.plan_id === row.plan_id) && (!l.purchase.expires_at || l.purchase.expires_at >= row.created_at.slice(0, 10))))
      .sort(byExpiry);
    if (row.delta > 0) {
      // A linked restoration retains the original lot's validity/freeze; it never becomes an immortal grant.
      if (candidates.length === 1) candidates[0].left = Math.min(candidates[0].purchase.delta, candidates[0].left + row.delta);
    } else {
      let remaining = -row.delta;
      for (const lot of candidates) {
        const quantity = Math.min(lot.left, remaining);
        if (quantity > 0) { lot.left -= quantity; remaining -= quantity; lot.debits.push({ ledgerId: row.id, quantity }); }
        if (remaining === 0) break;
      }
    }
  }
  return lots;
}

const frozenOn = (row: ClassLedgerRow, day: string) =>
  !!row.frozen_from && !!row.frozen_until && row.frozen_from <= day && day <= row.frozen_until;
const liveOn = (row: ClassLedgerRow, day: string) => !row.expires_at || row.expires_at >= day;

/** Select one remaining lot valid both now and on the class day. Used by every new package booking. */
export function selectPackagePurchase(rows: ClassLedgerRow[], today: string, classDay: string): ClassLedgerRow | undefined {
  return packageLots(rows).filter(l => l.left >= 1 && liveOn(l.purchase, today) && liveOn(l.purchase, classDay) &&
    !frozenOn(l.purchase, today) && !frozenOn(l.purchase, classDay))
    .sort((a, b) => (a.purchase.expires_at ?? '9999').localeCompare(b.purchase.expires_at ?? '9999') ||
      a.purchase.created_at.localeCompare(b.purchase.created_at) || a.purchase.id.localeCompare(b.purchase.id))[0]?.purchase;
}

export function packageState(rows: ClassLedgerRow[], today: string = dateKey()): PackageState {
  const live = packageLots(rows).filter(l => l.left > 0 && liveOn(l.purchase, today));
  const left = live.reduce((total, l) => total + l.left, 0);
  const balance = live.filter(l => !frozenOn(l.purchase, today)).reduce((total, l) => total + l.left, 0);
  const purchase = live.filter(l => l.purchase.reason === 'purchase' && l.purchase.delta > 1)
    .sort((a, b) => b.purchase.created_at.localeCompare(a.purchase.created_at))[0]?.purchase ?? null;
  const expiresAt = live.map(l => l.purchase.expires_at).filter((d): d is string => !!d).sort()[0] ?? null;
  const frozen = left > 0 && balance === 0;
  const frozenUntil = frozen ? live.map(l => l.purchase.frozen_until).filter((d): d is string => !!d).sort()[0] ?? null : null;
  return { balance, left, purchase, expiresAt, frozen, frozenUntil, freezeUsed: !!purchase?.frozen_from };
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
