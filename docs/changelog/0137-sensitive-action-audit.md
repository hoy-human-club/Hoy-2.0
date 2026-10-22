version: 0.25.0
date: 2026-10-22
codes: M-03 M-07 M-13 M-16 S-02 S-09

# Sensitive action Activity receipts

Intent: make the browser demo's sensitive actions visible and retain their audit history.

Decision: audit rows reject update/delete and duplicate identifiers. Voucher commands append compact Activity receipts without recipient contacts or messages and persist the staged result before publishing it to subscribers. Product revisions and their price-window audit receipt commit atomically; prior revisions and legacy checkout prices remain unchanged. Local publication/withdrawal also append receipts. Customer booking creation/rescheduling, transfer-created bookings and promotion-created vouchers append receipts inside their existing mock transactions. Simulated checkout results are explicitly logged as mock outcomes. Rescheduling, payment and voucher policy rules are unchanged. Generic table inspection remains available, while sensitive-record mutation uses the audited product, voucher, payment and reception flows instead of add/edit/delete or board movement.

Legacy corrupt-history regression fixtures use a test-only storage injection helper, preserving their replay assertions while the public provider API stays append-only. Existing email application/components are unchanged.

Alternative rejected: silently rely on separate voucher/product histories that never appear in Activity, or expose generic cells that bypass the audited role flows.

Verification: scripts/test-sensitive-audit.mjs and scripts/test-sensitive-audit-ui.mjs cover append-only guards, storage/write rollback, replay, stale product revisions, allowed/denied roles, actual product/voucher/transfer actions, Activity CSV, and bilingual responsive read-only table states. Existing voucher, product/publication, transfer, reception and quote checks also run. Production auth and durable server-side append-only storage remain separate integration work; browser data can still be reset as an explicit fictional demo.

Files: MockProvider, voucher command projection, catalog revision/publication commands, ProductsPage/spec, TablesPage/read-only copy, focused tests and sensitive audit QA workflow. No backend integration or real data changes.
