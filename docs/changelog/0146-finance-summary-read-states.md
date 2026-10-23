version: 0.25.0
date: 2026-10-23
prompt: docs/prompts/0146-finance-summary-read-states.md
intent: Prevent plausible zero revenue/counts, empty-period charts and calculated balance while payment data is loading or unavailable.
decision: Gate payment-dependent Finance views on explicit report readiness, reuse existing D-02 EmptyState loading/error variants, and retain true zero/empty rendering only after successful reads. Offer retry at the summary as well as the CSV widget.
rejected: Treating an empty loader snapshot as successful zero figures or hiding independent payroll/unfiltered invoices would misrepresent data availability or regress unrelated behavior.
files: src/modules/admin/FinancePage.tsx; src/modules/admin/reportingStrings.ts; scripts/test-reporting-read-ui.mjs; docs/frontend-completion/pg10-export-repair.md; docs/pages/M-09.md; docs/kanban.md

M-09 / PG-10: source `75538481` was reproduced locally before edits. Captures remain in ignored QA/CI artifacts. No new component/variant, shared provider/schema change, financial write or independent merge/deployment. [Verification and remaining gates](../frontend-completion/pg10-export-repair.md).
