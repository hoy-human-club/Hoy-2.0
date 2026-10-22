version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# FI-04 local paid-expense deletion safeguard

Generic local-provider/table deletion could bypass the existing paid-history invariant. Expense-only MockProvider guards now reject deletion of truthy paid markers and marker clearing. Unpaid deletion strictly persists or rolls back. The existing generic drawer uses an immutable fresh-scoped atomic confirmation with retained nonce, safe replay and exact-byte recreation rejection; it contains save/delete failure and cancelled/context-late acknowledgements without changing roles or other-table transaction behavior.

Files: MockProvider, admin RowDrawer/expenseDelete helper/strings; frozen original-provider fixture; historical/current domain, drawer lifecycle and rendered harnesses; M03 page/evidence/captures. Existing strict update persistence is preserved. Reused Notice warning now has one alert wrapper. Alternative rejected: hiding Delete alone, changing access policy/schema, or weakening historical defect assertions. No real accounting/reversal/backend/security action.

Checked local c51 source: baseline5, domain39, lifecycle11, ledger10, subscription adapter, TypeScript/fullbuild, M03prod24, M09cprod8 and actual devEN/ES faults passed. EN/ES390/1280 light/dark/role screenshots and exact source/artifact/script hashes are recorded in [batch42](../frontend-completion/batch-42.md). Initial803 nested-alert failure and test-only corrections remain explicit history. Root integration/exact-head CI/deployment pending; FI-04 original Nov 30 delivery/source criterion remains partial/unaccepted. Local logs are not claimed committed evidence.
