# PR72 audit repairs · draft checkpoint

Base: saved main e30a4d21b158bdfcbe9cf37ae7026cbdf6ccd579 (PR72, 2026-10-22 10:45:12 UTC). Branch: codex/frontend-audit-repairs-pr72. Isolated worktree; earlier implementation work untouched. Draft only; parent review required before merge. Original 124 criteria/phases/statuses retained.

## Bounded changes

- PG-11/PL-05: approved permanent no refunds governs new actions. Finance no longer offers a refund handler/control; no role has payments.refund permission. Historical records/status filters remain for readback. This does not establish server enforcement.
- AD-01/RS-01: fresh fictional fixtures use :00 starts and 50-minute durations; content creation and preview use tenant defaults. Existing same-day cache, historical sessions, booked occurrences and staff edits retain bytes; no seed-version bump or new migration. Existing old demos require an explicit reset/new demo day to show new fixture defaults.
- RC-02/PL-10: attendance status and attributed audit commit atomically in the mock adapter. Same request retries once, stale/foreign/role/context changes fail closed, and staged/storage failures do not partly save. No ledger/payment mutation.
- RC-02 boundary: the original criterion permits undo without a stated cutoff. Saved provider rejects checked-in→booked after start. Until attendance correction policy is confirmed, current ineligible undo is visibly disabled and explained rather than silently changing admission rules. No-show→booked, no-show occupancy, customer class recovery and studio cancellation remain separate policy issues.
- PG-03/06: duration/anchor/after-hours decisions remain open. No timed-hold mechanics are invented in this patch.

## Verification

See evidence/audit-repairs-pr72.json for the final command outcomes, source hash and retained failure paths. Focused policy tests first failed on saved main (refund permissions, :10/60 timetable and 60-minute preview fallback), then passed. Existing-cache byte preservation passes. Original audit independently reproduced reception partial-commit/after-start failures before implementation.

The new command suite verifies both staged failures, quota rollback, no partial events, same-intent concurrency, audit attribution, stale/foreign/role/context denial, eligible undo, no-show/arrived, original mat/capacity/financial protection and unchanged after-start boundary. Eight EN/ES × 390/1280 × light/dark rendered matrices verify no refund action, fresh timetable, quota failure/retry, double-click, eligible undo and visible disabled after-start policy state. Existing desk/package/sale/receipt/timetable regression suites run separately. Full npm build includes typecheck and repository spacing/manual gates.

Preserved failures: baseline-policy.log; attendance-domain-first-fixture-failure.log (non-mat fixture wrongly expected mat 1; corrected fixture modality, no runtime repair); repair-ui-initial.log (server served 404 before initial build finished; rerun only after bundle ready); analytics-fixture-slot-regression.log (dependent seed-history lookup still 08:10; corrected to 08:00). Initial failures are never overwritten or relabeled as application passes.

## Remaining gates and blocker

Library save attempted through its required multi-file workflow; service discovery failed with `hosted apps tools/list request failed: network`, before preparation/upload/finalization. Same workflow with network access explicitly enabled also failed at discovery. No Library file was created; no alternate upload path was used. Original audit report and JSON remain at /workspace/hoy-independent-audit/REPORT.md and feature-acceptance.json for parent handling.

Real identity/authorization, private storage, payments/settlement, email delivery, cross-device locks and owner acceptance remain Anu/owner gates. No new permissions, integrations, publishing, deployment or spreadsheet writes. Component-library/email-readiness files were not edited. Local evidence and draft source checkpoint are returned for parent review.

Acceptance clarification: functional, meaningfully tested demo behavior is the frontend delivery track; mocked services are disclosed separately rather than automatically blocking frontend acceptance. Backend-connected readiness and final polish form the separate later track. This repair remains a bounded draft for parent-coordinated merge/deploy. Unknown policy choices remain explicit owner gates, not silently chosen financial behavior.
