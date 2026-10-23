# Voucher frontend batch — integration receipt

Base: remote main `c2c0f37fe5cb4e3ebb4abfba9d1f87759c661748` (includes PR77 consent). Branch: `codex/vouchers-mvp-20261023`. This is a bounded frontend implementation; no feature row is accepted as complete.

## Behavior and exact scope

| ID | Implemented or retained frontend slice | Remaining gate |
| --- | --- | --- |
| BO-01 | New C-37 class-gift rehearsal uses existing operational gift quotations (one or twelve classes), `.test` recipient validation, pending transfer reference and explicit simulated confirmation. Quotes rechecked before draft creation. Existing C-17 monetary gifts remain functioning. | Payment owner must connect approved transfer receipt/review flow. No bank details, real transfer, payment records or purchased voucher issuance. |
| BO-02 | After simulated confirmation, recipient email preview contains a unique tab-local link. Unknown/reloaded link has a recovery state. | Secure durable links, verified settlement, email outbox and delivery status. No email is sent. |
| BO-03 | Existing M-13 free invitation creation, configured class count/expiry/participant limit, preview, activation and booking lifecycle retained and regression-tested. Specific invalid-expiry and active-booking errors now displayed. | Verified email delivery, authenticated admin commands and approved studio rules. The optional existing contact field remains; not a full email-delivery criterion pass. |
| BO-04 | C-37 checks fictional recipient email and adds credits once to a separate rehearsal balance. Existing C-28 demo-account activation and provider-backed booking remain, verified by existing lifecycle suite. | Purchased-gift credits are NOT added to booking balance. Real sign-up/sign-in return, recipient verification and transactional entitlement grant await account/payment integration. |
| BO-05 | C-28 expired, invalid-expiry, revoked and exhausted vouchers hide activation/booking controls with explicit messages. Classes outside expiry filtered. Other-account claim explains already activated without exposing details. C-37 rejects repeat redemption and expiry at the exact boundary in domain tests. | Server clock, atomic claim uniqueness and cross-device enforcement. Invitation activation is distinct from spending: existing multi-class balance behavior retained. |
| BO-06 | C-37 buyer voucher-ready and voucher-used email previews follow their respective simulated transitions. No sent state or dispatch. | Authorized notification delivery and provider callbacks. NT-01 owner files untouched. |
| BO-07 | Existing referral implementation retained, original Nov30 phase unchanged; no new acceptance claim. | Referral source criterion not independently verified in this batch. |

All new state lives in component memory. Refresh deliberately loses the rehearsal; no new tables, provider methods, account writes, permissions, shared schema changes or auth modifications. The optional presentation fixtures in D-02 are fictional only. The new route registers through the module extension point; a single hub group entry makes its required catalog buildable.

## Proposed payment/account contract — integration owner review required

No changes to payment owner files or central providers are included. No shared-provider patch is needed to run this rehearsal. Connecting it requires a separate integration change:

1. Voucher frontend submits a reviewed gift quotation and recipient to the payment owner's existing transfer initiation surface. Suggested intent: `{ clientRequestId, quotedItemId, quoteSourceKey, classes, amountCop, recipientEmail }`. These are untrusted browser intent fields, never proof of price, identity or payment. Server derives tenant and buyer from authenticated session and re-quotes.
2. Payment owner returns `{ purchaseId, state: pending | rejected | settled, reference }` from the authorized payment contract. UI must not infer settlement from upload, navigation or browser simulation. No timeout has been invented here.
3. Only verified server settlement may fulfill a purchased voucher. Existing `PurchasedGiftBridge` defines server payment identity, settlement uniqueness and terms. An authenticated transactional operation must bind settled purchase, recipient, secure claim token and entitlement grant once. The rehearsal `advanceGift` function must never serve as that operation.
4. Account owner preserves the claim link through sign-up/sign-in and verifies recipient ownership before grant. Booking balance readback uses the canonical grant result, not the rehearsal balance.
5. Notification owner receives distinct fulfillment/claim events with idempotency keys; templates below are previews only. A delivery confirmation is required before saying sent.

No refunds is the supplied approved policy. Voucher expiry, ownership transfer and purchased-benefit terms remain studio decisions. Package quotation validity has not been converted into voucher expiry. No bank account, refund, resend timing, production permissions or policy answers are invented.

## Verification

- `npm run test:vouchers`: existing command identity, role, tenant, idempotency, atomic failure, balance/capacity, cancellation and delivery-preview tests passed.
- `node --experimental-strip-types scripts/test-voucher-gifts.mjs`: fictional email/numeric bounds, immutable transitions, pending blocking, recipient mismatch, single-use credit, event previews, exact expiry and display/error mapping passed.
- `node scripts/test-voucher-gifts-ui.mjs`: ES/EN at390/768/1280/3840, invalid email, pack12 quote, pending/confirmed transfer, recipient mismatch, unique-link redemption, no second action, no provider mutations, no overflow or missing strings/page errors, reload recovery passed. [Receipt](evidence/voucher-gifts-ui.json).
- `node scripts/test-voucher-ui.mjs`: existing admin issue/preview, demo claim, group booking, persistence, ES/EN390/1280 and dark screenshots, no overflow or page errors passed.
- `node scripts/test-voucher-availability-ui.mjs` against the production bundle: 48 ES/EN ×390/768/1280/3840 checks cover expired, invalid expiry, expired unclaimed, exhausted, revoked and other-account states; see [receipt](evidence/voucher-availability-ui.json).
- `node scripts/test-voucher-gifts-states.mjs` against the production bundle: light/dark empty state, unavailable quotation blocking, all seven actual D-02 usages and expired preview passed; see [receipt](evidence/voucher-gifts-states.json).
- Final `npm run build` passed (TypeScript, spacing report, hub/action/media catalogs, manual lint, Vite, screenshot budget). Existing Rollup circular-chunk and chunk-size warnings remain; these are not a zero-warning claim. Production tests use local preview port5174; no hosted deployment was performed.

The first build stopped at the hub catalog gate because the new route lacked its group and captures; both were added. Initial npm install could not write its default cache; a task-local `/tmp` cache succeeded. No approval denial or credential access occurred. Expanded invalid-expiry rendering initially failed because the date formatter threw; the screen now renders an explicit invalid-date label and expired state. D-02 harness initially reset the developer session on navigation; fixture initialization/full document navigation were corrected. The final receipts record passing reruns; earlier failures are not counted as passes.


## PR79 integration-review repair

- Renumbered this batch's prompt/changelog0140→0142; PR78's0140/0141 files are not changed.
- AppShell CSS media guards hide the stale desktop navbar/dock on opposite sides of the existing900px breakpoint without waiting for React. Existing nav and future features are retained.
- `scripts/test-voucher-responsive-ui.mjs` holds shell matchMedia callbacks to assert the actual stale DOM, immediate full-document width, settled width and reverse transition.12 ES/EN ×2 routes ×3 resize sequences pass. [Receipt](evidence/voucher-responsive-ui.json).
- Voucher CI now watches dedicated modules/components and shell changes, runs the gift domain test and all gift/availability/library/resize suites, and uploads their JSON/screenshots. Strict ports prevent accidental testing against a different server.
- Independent read-only reviewer found no blocking issues and separately measured stale desktop DOM at390px with hidden nav and document width390px. This review precedes final commit/CI; exact-head CI status is reported in the integration handoff.
- Previous head2ebeb0d9 had9 workflows pass and Frontend continuation QA fail (operational-quotes job120183456834). Other original passing workflows do not erase that failure. The repaired job and exact-head rerun remain required.

- Repaired local production rerun passed the entire previously failing operational-quotes job's UI sequence: operational quotes, catalog publication, pending package and desk sale. All gift/availability/library/resize production suites also passed after repair. Runtime CSS was built before these checks; later edits are CI/docs/evidence only.
