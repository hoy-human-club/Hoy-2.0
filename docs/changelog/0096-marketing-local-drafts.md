version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# Marketing local drafts and planning calendar

OT-01 keeps its original After Nov30 phase and Not verified source status. New M-18 `/admin/marketing` adds fictional bilingual campaign/content drafts with explicit local preview/save/cancel/discard, an undated list and date-only planning calendar. Existing Content roles are retained. A fixed read-only public brand allowlist supplies references; no final artwork, rights or approval state is inferred.

The actor/role/tenant-scoped local adapter guards revisions and request replay, preserves state on failed reads/writes and refuses non-mock adapters. Existing provider rows/schema/permissions remain unchanged. Delivery, publishing, spend, shared persistence, customer data and storage provisioning are excluded. Reusing the complete media projection was rejected because it also includes local private photo copies; adding a mock database table was unnecessary for this actor-local draft contract. No dependencies added.

Files: new `src/modules/marketing/`, `MarketingDraftBoard` organism/meta/style, focused domain/rendered scripts, M-18 page and [batch19 evidence](../frontend-completion/batch-19.md). Root owns shared component usages, manifest/kanban, checked commit/CI and deployment receipt. Frontend progress is not acceptance of real marketing operations.
