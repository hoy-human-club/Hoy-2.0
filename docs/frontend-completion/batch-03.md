# Batch 3 — confirmed entitlement and atomic fictional desk commands

Baseline/rollback: `a5ddb29543efca8cc7412d44755085fdc58f02ba` (latest authorized main). Recovered only from repository checkpoints; no previous denied environment/private task files accessed. No AGENTS.md exists; CLAUDE.md governs engineering. Owner: one integration coordinator with non-overlapping customer activation, cutoff, desk UI and sale QA specialists.

Source: the 124-row manifest criteria PR-06 / RS-09 / RC-04 / RC-05 / RC-10 were read before code changes. English-first tracker is [the parent-owned private duplicate](https://docs.google.com/spreadsheets/d/19SWDF957P55Iw5QEPyVtoPDS50-eor0k76djVv1YyNU/edit). Source acceptance and phases are preserved, no full acceptance claim.

- PR-06: a pending payment records only a request; no classes, booking or capacity hold. Persisted approved payment activates a package once; replay retains the original purchased quantity/expiry. Legacy linked pending/missing-payment purchases are filtered from customer, CRM and desk balances; unlinked historical grants remain intact. Confirmed checkout atomically activates and debits one class.
- RS-09: separate source-defined 12h inclusive deadline, checked after rereading original booking/session; menu and already-open alternatives become unavailable after deadline. Cancellation credits and payment timers remain configurable draft assumptions. Current alternatives are same-day only; future-day selection with purchased-validity allocation and full atomic reschedule remain follow-ups.
- RC-04/05: future-session desk picker, confirmed package balance/expiry/frozen/full/insufficient previews; one shared staged command checks entitlement, class-date validity, duplicates, capacity and existing one-per-day configuration, inserts one debit linked to one booking. Waitlist uses the same command. Attendance undo/recheck does not debit again.
- RC-10: entire fictional new/existing customer sale stages customer/profile/role/consent/payment/invoice/ledger/attendance/audit/local queued receipt rows. Commit persists once, then emits snapshots. Full/duplicate/pending selected class, injected write and storage failure do not partially save. Browser-local transaction receipts deduplicate retries. Receipt messages are local queued records; no actual dispatch. Review found expired/frozen legacy packages could block a fresh paid class; sale check-in now allocates against its exact approved payment/purchase, retaining trial/single classification. Historical unlinked aggregate balance allocation remains a separate AD-07/PR-06 follow-up, never silently rewritten.

No backend, database, payment processor, credentials or permission/security configuration changed. The callback adapter is explicitly mock-only; production needs authorized atomic RPCs. It detects concurrent mutation during a stage and rejects, but is not a cross-device/cross-tab financial transaction or server authorization system. Historical purchased terms, public/draft publication controls, legal policies and role conflicts are not rewritten.

## Evidence

- `npm run build`: passed (final build 2026-10-21); TypeScript, generated inventories, spacing lint, manual lint and production bundle.
- `scripts/test-desk-transactions.mjs`: each staged write failure, persistence failure, zero intermediate events, simultaneous same-key retry, one booking/debit/capacity, duplicate/full/pending/declined/voided/refunded/frozen/expired rejection.
- `scripts/test-pending-package.mjs`: all non-approved states, approved activation/replay and unchanged historical terms, missing-payment filtering and user/plan scope.
- `scripts/test-reschedule-cutoff.mjs`: before, exact, after, invalid/timezone boundaries.
- Rendered EN/ES 390/1280: `test-desk-package-ui.mjs`, `test-desk-sale-ui.mjs`, `test-pending-package-ui.mjs`, `test-reschedule-ui.mjs`; screenshots/results in S-02, S-04, C-04, C-06 and C-08b. Final local production-bundle reruns passed at http://127.0.0.1:5187 with zero page errors. EN/ES desktop/mobile captures visually reviewed; key desk/cutoff screens include asserted light/dark modes. CI is required before merge.

Regression checks also passed: class capacity, mat bookings and product-catalog domain rules. Waitlist promotion shares the command but its click was not separately browser-tested.

## Release checkpoint

Initial implementation `3c40b95394814ace7b575c60c50b6d5c5c0653e0`, [PR56](https://github.com/imagine-os/hoy/pull/56). Review regression fix and final checked head/merge/deployment evidence are recorded below. Rollback remains the baseline above.

## Next dependency-safe work

Transfer-first QR, local receipt upload/review/queue (PG-02/04/05), then explicit catalog publication and shared quotes (PR-01/02/SW-02). Keep receipt-hold timing decisions draft; no external storage until Anu's approved integration. Independently usable website functionality including SW-07 map can proceed with source-verified location; Aleja owns final art. Clerk adapter/tests are authorized separately; no security changes or guessed production host/keys. Issue54 remains media follow-up.

Checked release checkpoint: final code head `cd3b9b014cc439735c5adc02c3a2c2b19792b9f8`, all eleven exact-head PR workflows passed, including [booking/payment QA](https://github.com/imagine-os/hoy/actions/runs/39689229897). [PR56](https://github.com/imagine-os/hoy/pull/56) merged as `2ecdaf8d09a6ca6743811fab8dee1eb94621552b`. [Normal Pages deployment](https://github.com/imagine-os/hoy/actions/runs/39689551507) passed build, deploy and hosted exact-source-SHA/selected-flow readback. New batch behavior was checked on the local production bundle and exact-head PR CI; the hosted checker verifies provenance and existing selected flows.

Final boundary refinement: checkout identifies the demo before payment, and printable desk receipts state that no real payments are processed. No financial behavior or stored purchased terms changed.

Audit follow-up0081 preserves effective role and front-desk source on staged booking/waitlist/sale audit rows, including administrator sales. It does not grant roles or change permissions. Associated PR records its final exact-head checks and release evidence.
