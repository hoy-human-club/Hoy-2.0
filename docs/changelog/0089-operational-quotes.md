# 0089 — immutable dated quotes for fictional purchases

version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

Intent: advance PR-02/SW-02 beyond isolated preview while preserving original phase, purchased terms and disconnected production contracts.

Decision: known class products use one Bogotá-date quotation resolver across customer package/top-up/checkout and ordinary desk sales. Explicit published snapshots override only mapped new fictional sales; unknown/unpublished/withdrawn/gap/free-price offers stay blocked. A changed publication or studio day requires explicit review before submission. New local payments and grants retain price/name/revision/date/classes/validity/tax metadata; pending approval uses the submitted snapshot and never reprices historical purchases.

Gift purchases preserve giftOf equality and existing monetary draft status. Atomic/idempotent recording adds no delivery/redemption/activation. Truthful local draft copy replaces misleading delivery/individual-code hints on this route. Supported website actions explicitly lead to fictional existing customer flows; external shared links remain unavailable. QuoteNotice is registered in the component inventory.

Alternative rejected: reading current mutable prices during later approval, silently using unpublished draft values, selling arbitrary catalog definitions, or claiming a local gift result dispatched a card. Production charge/quote authentication, canonical immutable history and durable storage remain Anu contracts. MockProvider staged identity is retained without weakening mock-only guards; per-worktree Vite cache avoids dev server collisions.

Checks and exact evidence: see [batch13](../frontend-completion/batch-13.md). Domain and existing regressions passed; final immutable production quote UI passed9 checks with zero page errors, and pending/desk/publication UI suites passed. Generic gift intro and typed QuoteNotice ready/loading/stale/error examples are included. Post-inventory TypeScript passes; root owns final integrated build/library render and checked release. Operational versus metadata-only fingerprints are recorded separately there. No source/owner/backend acceptance or hosted deployment claim.
