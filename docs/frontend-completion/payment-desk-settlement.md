# Payment frontend batch — receipt-free front-desk settlement

Source: remote `main` `c2c0f37fe5cb4e3ebb4abfba9d1f87759c661748` (PR77 consent retained), branch `codex/payments-mvp-20261023`. Date: 2026-10-23. This is an isolated frontend implementation and draft PR handoff; no merge/deployment or owner acceptance is claimed.

Existing behavior was inspected first: C-04 already validates/upload-previews fictional transfer receipts, S-09 already reviews them atomically, all pending payment methods already appear in the queue, and M-09 already has confirmed-payment CSV projection. Receipt-free S-09 details had no settlement command. This batch fills that bounded gap without replacing functioning future payment screens.

S-09 now offers a dedicated form for receipt-free manual front-desk requests. It requires retained supported class-purchase terms, the exact amount, cash/card-terminal/transfer method, a note and explicit fictional-collection acknowledgement. It records the staff ID, payment time and method, grants the retained class quantity and expiry, and audits the operation in one mock transaction. Replays with identical details reconcile an already committed outcome; changed details conflict. Missing/foreign/inactive customers or actors, expired/missing terms, linked receipts and pre-existing grants remain pending for review. The existing trial guard runs before a new trial grant. Cancellation before commit rolls back staged writes.

Permanent no-refunds copy is shown. The new command emits neither an invoice nor an email, and creates no booking: the existing pending front-desk payment has no retained session/mat intent. The form and saved outcome state those limits. Unsupported/historical/online payment details remain read-only. No real money, credentials, account permissions, customer records, messages or backend resources were used.

## Exact row boundaries

| ID | Verified in this batch | Remaining gate; no whole-row acceptance |
| --- | --- | --- |
| PG-01 | Existing amount/destination-unconfigured UI inspected only. | Approved destination/account/fixed QR/Bre-B data and actual bank integration absent; no fictional scannable destination added. |
| PG-02 | Existing domain regression: signature/type/size validation, pending request without entitlement/hold, duplicate submission, write/storage rollback/retry. | Browser upload/decode suite was not rerun in this batch; durable private storage and cross-device booking status remain separate. |
| PG-03 | New pure configurable boundary projection tests: unresolved defaults, proposed transfer boundary minus/exact/plus 1 ms, alternate duration, invalid values. | PC-01 unresolved. Helper is a disconnected contract, not a runtime hold/release/email implementation. |
| PG-04 | Existing domain regression: review validation, exact approval once, rejection without grant, trial guard and atomic rollback. | Actual bank notification, authenticated review and rendered receipt-review regression remain separate. |
| PG-05 | Existing production EN/ES queue suite: method coverage, receipt/frozen-quote preference, missing data, tenant scope, read-only unsupported details, 3 permitted/8 denied roles; dev four-read loading/error/retry/empty suite. | Runtime countdown depends on approved timing and backend reservation model. |
| PG-06 | Existing pending front-desk request inspected. Pure boundary tests accept an explicit proposed front-desk duration and check minus/exact/plus 1 ms. | PC-02 unresolved. No one-hour default, active booking, capacity hold or auto-release added. |
| PG-07 | New mock command: cash/card-terminal/transfer, desk/admin/super-admin roles, exact amount, staff attribution, retained terms, atomic grant/payment/audit; production form tested EN/ES. | Booking confirmation requires a retained session/mat intent that existing pending cash payments lack. Real settlement/authenticated server persistence remain separate. |
| PG-08 | New saved result explicitly says no email sent; no invoice is emitted by the new command. | Receipt-by-email delivery/outbox/provider integration not implemented. |
| PG-09 | New command tests: concurrent same-request replay, lost acknowledgement reconciliation, changed-command conflict; actual double click produces one grant and audit. Existing transfer duplicate submission regression passes. | Guarantees are limited to one MockProvider transaction queue/browser. Server idempotency, cross-tab/device and all other checkout paths are not accepted. |
| PG-10 | Existing confirmed-payment report source inspected only; payment method and `taken_by` fields remain compatible. | Report export regression not rerun; accounting acceptance separate. |
| PG-11 | Permanent no-refunds copy preserved and exposed in the new form. | Old refund criterion is superseded. No refund command introduced. |
| PG-12 | Existing future cash-close work retained, untouched. | No new reconciliation acceptance. Original Nov 30 phase unchanged. |
| PG-13 | Existing Wompi simulator retained, untouched. | Real online payments/webhooks remain disconnected; original After Nov 30 phase unchanged. |
| PG-14 | Existing saved-method simulator retained, untouched. | Tokenization/security/provider acceptance not tested; original future phase unchanged. |
| PG-15 | No invoice/DIAN action added by the new command. | Future invoicing integration untouched and unaccepted. |
| PG-16 | No tax decision or VAT calculation introduced. | PC-12 unresolved; receipt VAT criterion not accepted. |

`paymentWindows.ts` accepts explicit nullable transfer/front-desk durations. Both app-independent defaults are `null` (unresolved). Proposed 15/60 values appear only in tests. The helper projects boundaries and causes no release, notification or financial effect. An integration owner can wire approved configuration later; this batch does not silently equate the existing declined-Wompi hold setting with either manual-payment policy.

## Verification receipt

- `npm run build`: passed; existing circular-chunk and bundle-size warnings. This is a local working-tree build, not a deployed release.
- `node scripts/test-desk-settlement.mjs`: passed, including all three payment/grant/audit write-failure points, storage failure, cancellation, repriced catalog with unchanged purchased terms, missing/expired terms, foreign tenant, wrong provider/method, invalid amount/note/actor, linked receipt and trial guard. No booking or invoice side effects.
- `node scripts/test-pending-payments.mjs` and `node scripts/test-transfer-receipts.mjs`: passed existing scoped regressions.
- `QA_BASE=http://127.0.0.1:5189 node scripts/test-desk-settlement-ui.mjs`: production-bundle EN/ES, 390/768/1280, light/dark, empty/missing terms, under/over amount, cancel/reset/no writes, quota error/rollback/retry, staff attribution, double click, stale deep link and denied roles passed, no page errors.
- `QA_BASE=http://127.0.0.1:5189 node scripts/test-pending-payments-ui.mjs`: existing production EN/ES 390/1280 light/dark queue/detail/role suite passed.
- `QA_BASE=http://127.0.0.1:5187 node scripts/test-pending-payments-states.mjs`: actual dev four-table loading/error/retry/empty suite passed in both languages.
- Local captures are under ignored `qa/desk-settlement-production/`; they are not public source. Dedicated draft-PR CI uploads `desk-settlement-<head SHA>` artifacts with 7-day retention. Exact-head CI remains pending until the draft runs. The first local UI attempt used an overly strict select-label locator, which was corrected to the actual combobox accessible name; the succeeding complete run is the evidence above. A new pending-grant rejection fixture initially contaminated the trial-history fixture; running that independent rejection after the trial guard restored the intended isolated assertion, and the complete domain rerun passed.

## Integration handoff

No central provider/auth/shared schema edits are applied; the separate optional interface proposal below is unimplemented. Account/profile, teacher and notification/image-loading ownership is untouched. Current `PaymentRow` extension fields and `DataProvider.atomic` are reused only behind `name === 'mock'`.

Read-only reviewed voucher draft PR79 at `2ebeb0d920f75801d6760e1a1c65c7aa2b2abbee`, specifically its `voucher-gifts-integration.md` payment transition contract, and the existing canonical `PurchasedGiftBridge`. Gift quotes are deliberately ineligible for this class settlement command. The voucher rehearsal and `advanceGift` are never invoked by payments.

For the integration owner, [separate unapplied interface patch](patches/payment-fulfillment-contract.patch) proposes `DataProvider.beginManualPurchase` and `fulfillSettledPayment` plus typed class/gift intent/results. `git apply --check` passes against this base; it has not been applied or implemented. It preserves the voucher's proposed purchase transition fields and requires authenticated server-derived identity/re-quotation, immutable retained intent, verified settlement, unique fulfillment, capacity recheck where applicable, audit and an independent receipt outbox. Applying it would require the shared-provider owner's review and compatible provider implementations; no central runtime file is changed here.

The next booking integration needs a separately reviewed immutable intent tied to payment and customer: session ID, optional mat number, intended entitlement/payment reference and an idempotency key. The integration owner must define the authoritative stored contract and capacity recheck/release semantics after PC-01/PC-02 are resolved. Do not reconstruct it from the current URL or select an arbitrary class. Backend work must replace the browser transaction with authenticated authorization, durable idempotency/fulfillment and a separate email receipt outbox. No central patch is applied by this batch.

Resumen: se implementó el cobro demo de solicitudes de recepción sin comprobante, con monto exacto, responsable y clases retenidas, sin duplicados locales. Reservas, plazos aprobados, emails y backend siguen pendientes; ninguna fila completa se declara aceptada.

## Integration review repair

Review reproduced committed replay acknowledging an altered payment customer or missing class grant. The immutable audit receipt now records the original customer/grant IDs and hashes of the paid terms and grant. Replay freshly checks active owned customer, the exact single matching grant, unchanged payment/quote/grant facts and absence of a competing receipt. Mismatch returns a conflict without changing history or issuing another grant. Successful lost-acknowledgement replay remains unchanged.

Ten domain regressions cover customer/quote changes, missing/changed/duplicate grants, changed payment time and a newly linked receipt. Existing rollback, quota, cancellation, trial, gift-exclusion and no-booking/invoice assertions remain intact. These deliberately corrupted histories run after the independent trial fixture, preserving its original active-package assertion. Main was reconciled without changing its kanban; this batch's prompt/changelog ordinal is 0144. Combined local checks and exact-head CI must finish before release.
