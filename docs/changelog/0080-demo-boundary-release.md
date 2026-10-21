version: 0.25.0
date: 2026-10-21
prompt: docs/prompts/0080-demo-boundary-release.md
intent: Keep fictional financial flows visibly non-production and finish the continuation release receipt.
decision: Add an explicit demo notice before checkout payment and a non-production note inside printed reception receipts. Replace a technical source-path message with plain simulation/no-real-charge wording. Preserve behavior, purchased terms, roles and integrations. Remove four obsolete unthemed receipt captures; current light/dark captures are regenerated with the demo note.
rejected: Leaving a realistic payment action or printable receipt without a visible demo boundary; exposing implementation paths to customers; claiming overall acceptance.
files: src/modules/customer/strings.ts; src/modules/customer/pages/CheckoutPage.tsx; src/modules/staff/RegisterPage.tsx; scripts/test-pending-package-ui.mjs; scripts/test-desk-sale-ui.mjs; related screenshots; docs/frontend-completion/*.

[Continuation handoff](../frontend-completion/README.md). Financial and map behavior were checked in fictional production-bundle fixtures; source acceptance remains unchanged.
