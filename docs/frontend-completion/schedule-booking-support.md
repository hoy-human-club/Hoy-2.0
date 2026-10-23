# Customer schedule, booking detail and support slice — 2026-10-23

Base: `94fe5259ba03519931afd7ce1b96abf31c9e5672` (PR78), fetched and verified at task start. Branch: `codex/schedule-booking-support-20261023`. Integration/merge owner: `01a165c4-48d8-717d-930c-99f658dec031`. Draft PR: [#80](https://github.com/imagine-os/hoy/pull/80). No independent merge or live release. Main advanced to `7834d655` (PR79) after the starting baseline; a read-only merge-tree check identified only competing appended kanban notes. This branch moved its own note to a dedicated section, preserving the voucher owner's content and leaving integration to the designated owner.

Source: [HOY Front End Dev Log](https://docs.google.com/spreadsheets/d/19SWDF957P55Iw5QEPyVtoPDS50-eor0k76djVv1YyNU/edit#gid=105), live-read `Feature Specs!A35:J55` on 2026-10-23. Relevant rows: RS-01 row39, RS-08 row46, RS-13 row51. All remain source status **Not verified**. No spreadsheet writes or full-row completion claims.

| Row | Implemented and exercised slice | Remaining gap / owner |
| --- | --- | --- |
| RS-01 | Existing day/week and method filters retained. Scoped tenant reads now contain errors and offer retry instead of unhandled rejection/false emptiness. ES/EN 390/1280 actual customer shell: method filter and clear, empty results, full row navigation, disabled started/inactive rows; UTC-midnight class remains on Bogota's date with the browser in Tokyo. | Live capacity, provider authorization and backend concurrency are separate. Full-row owner acceptance remains pending. |
| RS-08 | Date/time/teacher/room retained. Booking detail shows owned exact debit-to-payment pending/approved/released projections, unknown linkage, missing booking and contained read failures. Configured directions now appear on booking details. | Legacy bookings often lack an exact payment relationship; they say unavailable. `released` is a fictional display fixture only; main has no authoritative reservation-hold/release lifecycle. Payment owner must define and integrate it. No refund, release command, timer or notification introduced. |
| RS-13 | Published rules/FAQ and active teacher reads have explicit empty/error/retry states; inactive teacher deep links are hidden. Both booking detail and More use current configured directions, avoiding the old default map when the address changes. Existing no-refunds FAQ and legal/consent content preserved. | Final content correctness is not accepted from fixtures. The shared FAQ seed still describes Wompi/PSE/QR while the launch sheet describes manual Bancolombia/Bre-B; public-content/payment owners must reconcile approved wording. No shared seed, public website or legal text rewritten by this slice. |

## Verification

- `npm run build`: passed locally, including typecheck, spacing and manual gates; existing circular-chunk/bundle-size warnings only.
- `node scripts/test-schedule-support.mjs`: exact user/tenant/debit/payment linkage, unsupported/missing/foreign links, cancellation not implying refund/release, started/ended/inactive boundaries, Bogota UTC midnight, configured map overrides and changed address fallback.
- `node scripts/test-schedule-support-ui.mjs`: actual page components inside the real customer AppShell with deterministic fictional MockProvider fixtures, ES/EN, 390/1280, Tokyo browser timezone and Bogota studio time. Light matrix plus dark schedule/booking captures. Source [results](../screenshots/schedule-booking-support/results.json). No external network; no real customer/payment actions.
- `node scripts/test-schedule-support-content.mjs`: ES/EN 390/1280 article open/unpublish closes stale drawer; existing no-refunds FAQ answer; active teacher profile hides unpublished sessions and uses actual 50-minute duration; changed configured address updates the map with a 44px link target. [Results](../screenshots/schedule-booking-support/content-results.json).
- `QA_BASE=http://127.0.0.1:5218 node scripts/test-schedule-support-routes.mjs`: local production bundle boots all seven target customer routes, including both FAQ pages; ES/EN 390/1280 have no missing translation keys or horizontal overflow; finance role is denied schedule by the existing route guard. [Results](../screenshots/schedule-booking-support/routes-results.json).
- Dedicated `.github/workflows/schedule-support-qa.yml` checks the exact PR head and uploads fixture captures with seven-day retention. Remote CI status is separate from these completed local checks.
- Existing regressions: `test-customer-cancel.mjs` (11 groups), `test-reschedule-atomic.mjs`, `test-reschedule-cutoff.mjs`, `npm run test:dates` pass.
- First browser attempts exposed test locator wording and retained-mount screenshot contamination; those captures were regenerated after isolating mounts/resetting fixtures. Final complete run is the evidence; partial attempts are not acceptance.

Representative captures: [ES phone schedule](../screenshots/schedule-booking-support/es-390-day.jpg), [EN desktop week](../screenshots/schedule-booking-support/en-1280-week.jpg), [EN phone booking](../screenshots/schedule-booking-support/en-390-booking-confirmed.jpg), [ES desktop payment error](../screenshots/schedule-booking-support/es-1280-booking-payment-error.jpg), [EN phone rules empty](../screenshots/schedule-booking-support/en-390-content_articles-empty.jpg). All other states/locales live in that dedicated directory. These are local fixture captures, not a deployed release.

## Proposed shared interface — unapplied, for integration/payment owner review

The current authoritative chain available for some bookings is `bookings.ledger_id → class_ledger.payment_id → payments.id`, with exact customer and tenant checks. Never infer it from payment date/amount, latest payment, `paid_with`, a URL, or a cancelled booking. A pending manual purchase without a booking is not an existing confirmed reservation.

A separately reviewed read contract should return an owned booking/payment summary with explicit provenance/revision:

```ts
interface BookingPaymentSummary {
  tenantId: string;
  userId: string;
  bookingId: string;
  paymentId: string | null;
  paymentState: 'pending' | 'confirmed' | 'released' | 'unknown';
  reservationState: 'held' | 'confirmed' | 'released' | 'cancelled' | 'unknown';
  holdUntil: string | null;
  revision: string;
}
```

This is a proposal, not a schema/provider addition. Payment release, reservation release, credit return and refund must remain distinct. PC-01/PC-02 timing decisions, retained immutable purchase intent, actor authorization, capacity recheck and event provenance belong to the payment/integration owner. Do not manufacture an elapsed timeout or refund from the UI clock. The next integration must render this authoritative read model while preserving unknown legacy records; this batch does not fulfill the whole RS-08 lifecycle.

Central provider/schema/auth, payment/voucher components and public website files remain untouched. No backend, authentication, notification, release, real customer data or financial operation is added.
