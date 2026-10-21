# Batch 2 — PR-01 / PR-02: draft product catalog

Source acceptance criteria (read from the authoritative feature manifest):

- PR-01: Administration creates and edits products with: code, name, type, number of classes, validity in days, price, price start date, price end date and active/inactive.
- PR-02: The system charges the price in force on the purchase date; a price change does not alter past purchases and the price history is kept.

Both are MVP Oct 30 / Urgent. This batch supplies a **disconnected frontend draft prototype**, not completed operational acceptance. [M-16 / Product master](https://imagine-os.github.io/hoy/#/admin/products), current admin/super-admin demo roles only. No existing role-permission matrix was changed.

## Behavior and boundary

Create a fictional product or prepare an explicitly inactive draft from a legacy plan; edit bilingual names, code, type, classes, validity, active status and inclusive price windows. Validation rejects duplicate draft codes, blank names, invalid dates, inverted ranges, overlapping windows, decimals/invalid counts and prices. Gaps are allowed but block quoting. Loading, empty, read failure/retry, saving, conflict and failed local persistence remain explicit.

MockProvider resets demo data when the local calendar day changes or demo data is reset; these drafts are not durable storage. The screen states this before saving.

Saving writes only `plans.frontend_catalog` for existing plans. A new local test plan has legacy `active=false` and `price=0`; its prototype active status lives only inside the draft. Existing public plan fields and static website/checkout prices are never published by this screen. A warning states this on the page. Every saved revision retains the previous definition, actor and timestamp inside the same mock row update. The client blocks an observed stale revision; a server-side atomic compare-and-save is still required.

The quote preview selects the price in force on a chosen purchase date, including each window's end date. A fictional example copies product/price IDs, COP amount, date, name, classes, validity and revision; later catalog edits cannot change it. Examples are session-only and clear on reload. They create no booking, payment, class entitlement or real purchase.

## Backend and integration contract for Anu

`src/data/productCatalog.ts` defines ProductDefinition, ProductPrice, ProductRevision, CatalogDraft and ProductQuote. Optional `plans.frontend_catalog` is a browser mock extension only, not an applied database column or production migration. Before persistence is connected, settle the canonical server schema (prefer normalized price revisions), authenticated tenant-scoped authorization, unique codes, integer COP rules, inclusive Bogotá business dates and transaction-level overlap rejection. Preserve immutable quote/order snapshots and history; enforce atomic optimistic revision checks and append-only audit server-side. Existing generic provider mutation cannot prove these guarantees.

Operational quote integration is **pending**: public plans, customer purchase, package checkout, staff register, voucher purchase and payment confirmation must consume the same authoritative quote and retain its snapshot, not reread mutable catalog price. Explicit publication of approved catalog revisions must precede this integration; no silent overwrite of the current launch catalog. No final unconfirmed prices were invented or approved. This is why PR-01 and PR-02 remain partial despite a working prototype.

## Evidence

- `node scripts/test-product-catalog.mjs`: deterministic date edges, overlaps, gaps, inactive, metadata validation, immutable quote and revision-history tests passed.
- `node scripts/test-product-catalog-ui.mjs`: isolated fictional admin create/edit/reload, validation, date quote, no-price block, preserved snapshots/history, local storage failure, unchanged legacy public price fields, front-desk/customer route denial, EN/ES at 390/1280 passed with zero runtime exceptions.
- `node scripts/test-product-catalog-states.mjs`: dev-only scoped provider injection for loading/empty/read failure/retry; separate receipt in screenshots.
- TypeScript check passed. Integrated production build and all-route smoke passed (120 exercised route templates (121 registered routes; wildcard excluded), no console errors). Production-bundle domain/UI checks also passed; exact-head CI, merge and deployment passed as recorded below.

[English phone](../screenshots/M-16/en-390.jpg) · [English editor phone](../screenshots/M-16/en-390-editor.jpg) · [English editor desktop](../screenshots/M-16/en-1280-editor.jpg) · [Spanish editor desktop](../screenshots/M-16/es-1280-editor.jpg) · [English quote](../screenshots/M-16/en-1280-quote.jpg) · [UI receipt](../screenshots/M-16/results.json) · [State receipt](../screenshots/M-16/state-results.json).

Rollback: remove the products module route or discard its local frontend_catalog metadata; legacy public prices were not changed. No service/database/storage/credential/production mutation or external message occurred.

Release receipt: checkpoints `955d067` / `8136c6f`, [PR55](https://github.com/imagine-os/hoy/pull/55), merged/deployed source `f0f72539afb7fabf50825bc8e33c4e658b9bacd0`. All 10 exact-head PR workflows passed, including [frontend QA](https://github.com/imagine-os/hoy/actions/runs/39685943071). [Pages run](https://github.com/imagine-os/hoy/actions/runs/39686441483) passed build, deployment and hosted source-SHA/selected-flow readback; [artifact](https://github.com/imagine-os/hoy/actions/runs/39686441483/artifacts/12385972674). New feature-specific flows were tested against the production bundle locally/CI, not separately against the live page from this execution environment (direct release GET returned HTTP 403). Rollback code baseline remains `2d402751c5bee899d5adab62837d2b0e7e313025`.
