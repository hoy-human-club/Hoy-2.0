version: 0.25.0
date: 2026-10-23
prompt: docs/prompts/0140-voucher-frontend.md
intent: Implement missing class-voucher transfer/redeem frontend and clear invitation boundaries.
decision: Separate memory-only rehearsal reuses existing gift quotes; invitation display mirrors expiry and balance constraints; typed command errors explain recovery.
rejected: Editing shared payment/auth/provider/schema or treating a simulated settlement as an operational entitlement.
files: src/modules/voucher-gifts/*; src/components/organism/VoucherGiftDemo/*; src/modules/vouchers/{availability.ts,actions.ts,pages.tsx,strings.ts}; src/hub/hubMap.data.ts; public/hub-map.json; public/actions.json (generated date); scripts/test-voucher-{gifts,gifts-ui,gifts-states,availability-ui}.mjs; docs/pages/C-{28,37}.md; docs/screenshots/C-{28,37}/*; docs/frontend-completion/voucher-gifts-integration.md; docs/frontend-completion/evidence/voucher-*.json; docs/kanban.md

C-37 [Spanish mobile](../screenshots/C-37/es-390.jpg), [English desktop](../screenshots/C-37/en-1280.jpg). C-28 [expired Spanish mobile](../screenshots/C-28/es-390-expired.jpg), [expired English desktop](../screenshots/C-28/en-1280-expired.jpg). Existing invitation layout retained with clearer status and hidden unavailable actions. D-02 registers interactive empty/error/pending/confirmed/mismatch/redeemed/expired states using the same screen component.

[Exact row scope, verification and proposed integration contract](../frontend-completion/voucher-gifts-integration.md). Backend/owner acceptance and production delivery remain separate.
