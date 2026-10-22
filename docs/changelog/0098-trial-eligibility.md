version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# 0098 — Fictional trial eligibility safeguards

Intent: repair PR-04 active-package trial offers and stale approval paths while preserving original requirement/status/phase and historical purchased terms.

Decision: shared scoped pure assessment/fresh atomic assertion; clear approved remaining unexpired nonfrozen multi-class purchase excludes trial, existing once-only history retained. Frozen/historical/gift/future/malformed ambiguities visibly pause fictional testing as an explicit mock safeguard, without approving a production eligibility/refund policy. Customer, desk and receipt offers share contained loading/error/retry and stale actor/result suppression. Pending requests remain unchanged when approval is blocked; rejection and completed idempotent replay remain available.

Alternative rejected: using raw class balance as package identity, offering trial despite active package, rewriting ledger quantities/expiry, treating ambiguous frozen/history data as an approved business rule, or relying only on disabled buttons.

Pages: C-07, C-04, S-04, S-09.

Files: `src/data/trialEligibility.ts`; customer `useTrialAssessment.ts`, hooks/payments/PassesPage/CheckoutPage/strings/specs; staff RegisterPage/specs; transfers receipt command/queue/specs; focused domain/actual UI/dev-state tests, batch21 and page evidence. No schema, credentials, real payment, roles or access-policy changes.

Verification: corrected full build, trial domain/immutable production EN/ES390/1280 light/dark/dev-state tests, and existing receipt/quote domain plus desk/receipt production regressions passed. Browser JSON receipts have zero errors. Exact checked-head/release receipt remains root’s coordinator checkpoint in batch21. Real-person identity and production active/frozen/history contracts remain open.
