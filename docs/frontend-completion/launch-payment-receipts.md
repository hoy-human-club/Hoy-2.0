# Launch payment receipt previews (PG-08 slice)

New fictional approved payments from customer checkout, transfer review and front-desk sale retain an immutable browser receipt snapshot instead of creating an invoice. Front-desk settlement retains the same representation. Pending/declined payments have no receipt. Selected email/WhatsApp channels are preview preferences only: these flows create no queued message or delivery claim.

C-11 displays the saved purchased wording and financial facts, not a recalculation from the current catalog. Charged and received amounts remain distinct. Missing, inconsistent and historical payments show a truthful unavailable state; an existing historical invoice reference remains visible without reclassifying or regenerating the document. Viewing, exporting and printing do not mutate history. Read failures are contained with retry.

The optional `payments.frontend_receipt` JSON is immutable in the mock provider and validated against current payment identity and facts. Existing v10 caches, invoice rows, audit entries and legacy settlement replay records are preserved without backfill or seed-version change. The generated SQL is a draft model artifact only; no database, policies or permissions are changed remotely.

## Verification contract

- `test-launch-receipts.mjs`: actual checkout, transfer review and desk settlement; replay, mutation protection, stale facts, pending/declined, write/quota rollback, v10 reload and exact historical invoice/audit preservation.
- `test-desk-sale-ui.mjs`: actual S-04 sale, consent, grant/debit/check-in, rollback and stronger no-invoice/no-outbox assertions.
- `test-launch-receipts-ui.mjs`: production C-11 in ES/EN, 390/1280, light/dark; retained wording, charged/received, print, historical/pending/inconsistent states, own scope and no writes/overflow.
- `test-launch-receipts-states.mjs`: actual C-11 payment/invoice/catalog read failures and retry in ES/EN.
- Existing transfer, desk settlement, trial, audit, signup consent, profile and reporting regressions remain applicable. Dedicated exact-head CI and independent final review gate release.

## Remaining decisions and backend work

PG-08 is partial. The owner must confirm final receipt/document semantics and applicable VAT presentation; recorded demo tax figures are retained, not legal tax advice or a new tax policy. Fiscal invoicing, durable storage, actual delivery, server idempotency and customer acceptance remain separate backend/owner work. No legal invoice, real payment or sent email is claimed.
