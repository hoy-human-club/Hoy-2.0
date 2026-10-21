# Batch 6 — historical package allocation

Baseline/rollback: `b73c13a` (latest remote main, PR59; contains PR58/e1758bf). Recovered from repository documentation only; no earlier task/environment files accessed. No AGENTS.md exists; CLAUDE.md and its UI spacing skill govern engineering.

Requirements: AD-07 / PR-06 / RC-04 / RC-05. Original source criteria, phase and owner acceptance remain unchanged. This extends earlier frontend evidence; it does not fully accept those rows.

Outcome: read-only package lots reconstruct unlinked historical usage in chronological order against then-existing eligible grants, ordered by expiry/creation/id within tenant/person and optional plan. Explicit grant and payment references take priority. Old spent/expired packages no longer subtract classes from a new purchase; frozen packages do not block unrelated available classes. New customer/reception booking debits keep `purchase_ledger_id`; purchased rows/quantity/expiry are never rewritten. Future class date must fit the selected grant's expiry and freeze. Draft schema contract only; no database migrations or policy changes applied.

This deterministic fictional legacy allocation is a frontend fallback, not an approved production migration rule. Anu must reconcile ambiguous unlinked historical records against authoritative purchase/booking history. Unmatched old debits never consume future grants. Unlinked historical returns remain existing standalone grants; ambiguous return/cancellation policy and atomic cancellation remain separate follow-ups. This batch introduces no cancellation outcome or refund entitlement.

Acceptance checks: old expired/fully used lot plus fresh purchase; unlinked excess usage; exact grant/payment precedence and invalid linkage; plan/member/tenant separation; input order/same timestamp; expiry/freeze today and class date; exhausted lot selection; linked restoration validity; pending payment exclusion; no purchase mutations. Staged booking failure/storage/cancelled-stage and concurrent retry/idempotency checks reuse the desk transaction suite. There is no new UI/control requiring a component meta entry.

Routes/roles: `/#/admin/crm` and member detail (admin/front desk); `/#/staff/checkin` (front desk); customer package booking shares selection logic. Browser fixtures and screenshot/result paths: M-06 balances/detail and S-02 package-booking, EN/ES at390/1280; key desk views light/dark. Exact tests/results, checked commit and deployment receipt are recorded after integration. Source implementation is not acceptance.

Tests: `scripts/test-package-lots.mjs`, `test-pending-package.mjs`, `test-desk-transactions.mjs`, `test-crm-balances-ui.mjs`, `test-desk-package-ui.mjs`; full build required before commit. No live backend/payment/storage requests. Production server consistency, authorization and cross-device verification remain Anu's work.

Next: transfer receipt queue (batch7), future-day atomic reschedule (batch8), explicit catalog publication/local quotes (batch9). Owner question queues remain separate; none sent externally.
