version: 0.25.0
date: 2026-10-23
prompt: docs/prompts/0142-voucher-frontend.md
intent: Implement missing class-voucher transfer/redeem frontend and clear invitation boundaries.
decision: Separate memory-only rehearsal reuses existing gift quotes; invitation display mirrors expiry and balance constraints; typed command errors explain recovery.
rejected: Editing shared payment/auth/provider/schema or treating a simulated settlement as an operational entitlement.
files: .github/workflows/voucher-qa.yml; src/components/template/AppShell/AppShell.css; src/app/captureDates.ts (generated); scripts/test-voucher-responsive-ui.mjs; src/modules/voucher-gifts/*; src/components/organism/VoucherGiftDemo/*; src/modules/vouchers/{availability.ts,actions.ts,pages.tsx,strings.ts}; src/hub/hubMap.data.ts; public/hub-map.json; public/actions.json (generated date); scripts/test-voucher-{gifts,gifts-ui,gifts-states,availability-ui}.mjs; docs/pages/C-{28,37}.md; docs/screenshots/C-{28,37}/*; docs/frontend-completion/voucher-gifts-integration.md; docs/frontend-completion/evidence/voucher-*.json; docs/kanban.md

C-37 [Spanish mobile](../screenshots/C-37/es-390.jpg), [English desktop](../screenshots/C-37/en-1280.jpg). C-28 [expired Spanish mobile](../screenshots/C-28/es-390-expired.jpg), [expired English desktop](../screenshots/C-28/en-1280-expired.jpg). Existing invitation layout retained with clearer status and hidden unavailable actions. D-02 registers interactive empty/error/pending/confirmed/mismatch/redeemed/expired states using the same screen component.

[Exact row scope, verification and proposed integration contract](../frontend-completion/voucher-gifts-integration.md). Backend/owner acceptance and production delivery remain separate.


## Integration-review repair

A fifth gift nav item exposed a resize interval where the desktop navbar remained mounted after the viewport became390px. AppShell now hides desktop navigation in the narrow CSS media query and hides a stale dock in the wide query, before React media-query callbacks commit. A focused test deliberately holds those callbacks and preserves immediate and settled overflow checks for12 forward/reverse ES/EN transitions. The previous production artifact failed the stale-nav assertion; the repaired production artifact passes. No overflow clipping or relaxed width threshold was introduced.

Voucher QA now watches the dedicated gift module/component and AppShell, and executes gift domain, purchase, availability, library/state and responsive-transition suites against a strict-port production preview. Only this batch's0140 prompt/changelog moved to0142 to leave PR78's0140/0141 untouched. Generated capture-date metadata follows the screenshots. Independent read-only review found no blocker and measured a390px document with stale desktop React DOM still mounted and its nav hidden.
