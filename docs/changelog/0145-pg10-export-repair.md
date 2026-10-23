version: 0.25.0
date: 2026-10-23
prompt: docs/prompts/0145-pg10-export-repair.md
intent: Repair the reproduced PG-10 product completeness and source-read failure defects.
decision: Resolve special concepts through exact scoped payment linkage; require fresh report reads with error/retry and ignore stale/unmounted completions.
rejected: Guessing concepts, exporting cached data after failed reads, editing shared provider/schema or touching receipt-delivery work would hide uncertainty or broaden scope.
files: src/data/confirmedPaymentReport.ts; src/modules/admin/{FinancePage,paymentReportReads,usePaymentReport,reportingStrings}; src/components/organism/ConfirmedPaymentReport/*; scripts/test-reporting-{reads,read-ui,special-ui,library}.mjs; .github/workflows/reporting-qa.yml; docs/frontend-completion/pg10-export-repair.md; docs/frontend-completion/reporting-tranche.md; docs/pages/M-09.md; docs/kanban.md

M-09 / D-02: no financial writes, real customer data, service settings or permissions changed. [Checks and remaining gates](../frontend-completion/pg10-export-repair.md). Captures stay in QA/CI artifacts. No independent merge/deployment or entire-row acceptance.
