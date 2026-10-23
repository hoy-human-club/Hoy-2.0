version: 0.25.0
date: 2026-10-23
prompt: docs/prompts/0145-launch-payment-receipts.md
intent: Keep simulated launch payment documents truthful while preserving historical records.
decision: Retain immutable browser receipt previews for approved checkout, transfer review, desk sale and settlement. Show saved facts in C-11; preserve legacy invoices, cache version and audit history without backfill. Label email and WhatsApp as previews without queue or delivery effects.
rejected: Deleting old invoices, inventing VAT policy, repricing old purchases or claiming real email delivery.
files: src/data/launchReceipts.ts; src/data/{MockProvider,schema}.ts; src/modules/{customer,staff,transfers,launch-receipts}; src/components/organism/{Receipt,LaunchPaymentReceipt}; scripts/*launch-receipts*; .github/workflows/launch-receipts-qa.yml

[Bounded PG-08 behavior, regression contract and remaining decisions](../frontend-completion/launch-payment-receipts.md). No whole-row or backend completion claim.

- Shared paid-event checkout retains its payment/audit/RSVP rollback contract with receipt-only assertions and matching truthful preview copy.
- CI teacher-state harness now prepares dependencies before browser startup and rejects unexpected document reloads. Original ownership/read/actor assertions remain; the earlier execution-context loss is retained as evidence, without a proven root-cause claim.
