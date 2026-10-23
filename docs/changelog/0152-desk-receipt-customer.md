# 0152 — Retain the customer on the desk receipt

date: 2026-10-23
version: 0.25.0
prompt: docs/prompts/0152-desk-receipt-customer.md

- Trigger: S09 resolved a named customer in the payment queue, then always rendered the settled receipt with the unknown-customer label.
- Decision: retain the existing tenant-scoped resolved name with the settled payment, actor and provider context. Use the existing localized fallback only when that name is missing; suppress old receipt state immediately after provider/persona changes.
- Rejected: re-reading a payment entry after it leaves the pending queue, persisting a new identity snapshot, or changing payment/fulfillment history.
- Files: TransferQueuePage.tsx; focused production/context fixtures and regression scripts; existing desk-settlement CI wiring.
- Verification contract and boundaries: [scoped repair](../frontend-completion/desk-receipt-customer.md). Existing receipt component states and bilingual copy are reused. No schema, monetary calculation, invoice/delivery policy or backend change.
