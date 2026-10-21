version: 0.25.0
source: source-SHA provenance; package version unchanged for frontend correctness batch
date: 2026-10-21
prompt: docs/prompts/0077-confirmed-booking-transactions.md
intent: Continue frontend completion with confirmed entitlements, the source reschedule cutoff and coherent reception sale/check-in failures.
decision: Stage fictional commands in a detached mock provider, persist once and emit only committed state. Reuse existing Card, Field, Select, Notice, RosterRow and Button; keep purchased terms and source acceptance unchanged. Enforce RS-09 as its own 12h source rule, separate from draft cancellation/hold assumptions.
rejected: Activating pending payments, allowing partial sale writes, claiming browser gates secure backend data, inventing cancellation/hold decisions, changing permissions or actual backend services.
files: src/data/{MockProvider,types,packages,deskBooking}.ts; src/modules/customer/{hooks,payments,reschedule,specs,strings}.ts; src/modules/customer/pages/{CheckoutPage,PlansPage,BookedPage}.tsx; src/modules/staff/{CheckinPage,RegisterPage,specs,strings}; src/modules/admin/CrmPage.tsx; Notice.meta.ts; scripts/test-{desk*,pending-package*,reschedule*}; .github/workflows/booking-payment-qa.yml; docs/frontend-completion/*; related page docs/screenshots.

# Confirmed booking transactions

[Batch receipt](../frontend-completion/batch-03.md) records the exact scope, deterministic fixtures and remaining frontend/backend limitations. No overall completion or production financial/authentication claim.
