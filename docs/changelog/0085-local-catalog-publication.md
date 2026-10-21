# 0085 — explicit local catalog publication and quotations

version: 0.25.0
date: 2026-10-21
prompt: docs/prompts/0082-frontend-continuation.md

Intent: continue PR-01/PR-02/SW-02 without exposing draft data or inventing approved operational prices.

Decision: admin reviews a saved product revision and explicitly confirms publication into an isolated browser-local catalog preview. Later draft edits do not alter that immutable snapshot. Publication/withdrawal use the detached mock transaction, survive same-browser reload until demo reset, preserve event history, reject stale revision/tenant mismatch, and retain the review on local-storage failure for retry. Repeated publication/withdrawal of the same revision does not append duplicate events.

M-17 `/admin/products/preview` consumes the same `quotePublishedProduct` date contract as the publication domain. It selects inclusive effective dates, blocks gaps, retains session-only fictional quote snapshots and keeps purchase controls disconnected. No quote is sent and no public/shared link is generated. The same-browser demo website reads these explicit snapshots with a fictional local banner and disabled purchase controls. Other browsers retain the standard catalog; checkout, legacy prices, purchases and availability remain unchanged.

Alternative rejected: silently making draft prices operational on the public site while checkout still uses the approved static catalog. Real publication, checkout quote/order snapshots and authorized sharing remain separate backend/owner work; these stable IDs remain partial.

Files: `src/data/catalogPublication.ts`, `src/data/productCatalog.ts`, `src/modules/products/*`, website PlansPage local consumer, shared Card metadata, `scripts/test-catalog-publication*.mjs`, M-17 captures and batch09. No schema/database/policy/credential changes.

Validation and release receipt: see [batch09](../frontend-completion/batch-09.md). Source implementation is not owner acceptance.

Integrated local production-bundle QA passed at 5187 (zero page errors, bilingual responsive light/dark coverage, role denials and failure/retry/withdrawal). Visual review found and corrected the local website highlight heading’s dark-theme ink using the existing `--color-on-highlight` token; the QA script now asserts it. Final rebuilt capture is recorded in batch09/integration receipt. No hosted deployment claim.

Final catalog production rerun passed after the heading token correction, including computed highlight-ink checks, renewed EN/ES desktop/mobile light/dark captures, retained quote and denied-role screenshots. See `docs/screenshots/M-17/publication-results.json` (base5187, zero page errors) and batch09. No source edits after this correction.
