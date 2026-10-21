version: 0.25.0
date: 2026-10-21
prompt: docs/prompts/0082-frontend-continuation.md

# 0082 — Preserve historical purchased lots in frontend balances

Version:0.25.0. Date:2026-10-21. Intent: continue frontend completion from latest remote main, beginning with legacy unlinked allocation without rewriting purchases.

Decision: pure chronological, tenant/person-scoped fictional lot reconstruction and exact grant IDs on new debits. Expired historical usage cannot reduce a new package; the selected grant must cover the class date. Existing purchases are immutable. Alternative rejected: summing every debit forever against only unexpired credits, or silently migrating/repricing historical purchases. Legacy allocation remains explicitly provisional pending authoritative reconciliation.

Files: data/packages.ts, deskBooking.ts, customer/hooks.ts booking section, schema.ts draft contract, supabase/schema.sql draft only, docs/data-model.md; package-lot unit/desk+CRM rendered tests. No new component states. Build/QA/release evidence and gaps: [batch6](../frontend-completion/batch-06.md).

Correction before release: preserve existing same-day caches by adding empty new mock tables rather than reseeding, including old-tab storage events; regression asserts unchanged purchased terms/content. Release provenance now prefers actual checked-out Git HEAD over a synthetic PR merge event. Catalog width QA waits for stable responsive layout while keeping the overflow assertion and diagnostics. Final checks/release recorded in completion README.
