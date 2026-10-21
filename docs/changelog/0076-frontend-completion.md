version: 0.25.0
source: source-SHA provenance; package version unchanged for this frontend batch
date: 2026-10-21
prompt: docs/prompts/0076-frontend-completion.md
intent: Establish auditable frontend completion coverage and fix AD-07/HALL-2 CRM balances.
decision: Preserve all 124 source stable IDs and phases; distinguish source acceptance from runtime verification. Reuse packageState and existing Card/Badge/DataTable rather than new components. Join vouchers only by verified claim identity.
rejected: Treating 120 non-stub routes as accepted, replacing proposed permissions, associating vouchers by contact/name, claiming backend persistence, or publishing private source correspondence.
files: src/modules/products/*; src/data/productCatalog.ts; scripts/test-product-catalog*.mjs; docs/pages/M-16.md; docs/screenshots/M-16/*; .github/workflows/crm-balances-qa.yml; docs/frontend-completion/*; src/modules/admin/{CrmPage,MemberPage,specs,strings,admin.css}; scripts/test-crm-balances-ui.mjs; docs/screenshots/M-06/*balances* and *package-detail*; docs/pages/M-06.md

# Frontend completion batch 1

[Handoff index](../frontend-completion/README.md) · [batch receipt](../frontend-completion/batch-01.md) · [124-row manifest](../frontend-completion/features.json). Baseline source `2d402751c5bee899d5adab62837d2b0e7e313025`. No full acceptance claim. Existing durable photo-storage follow-up issue54 remains open.

PR-01/PR-02 independent batch: M-16 adds explicitly disconnected browser-local product drafts, date-effective quote previews, validation, revision history and immutable fictional quote examples. Operational website/checkout prices remain unchanged; these source acceptance rows remain partial. [Batch 2](../frontend-completion/batch-02.md). Reuses existing components; no dependency/schema/backend changes.
