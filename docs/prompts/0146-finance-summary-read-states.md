# Finance summary read states

Source: delegated PG-10 frontend correctness repair, 2026-10-23. Public-safe scope only; private correspondence omitted.

## Prompt

Distinguish loading and failed payment/concept reads from genuine zero values in Finance summaries and charts. Preserve report error/retry/export guards; verify EN/ES responsive initial loading, failure, empty success and recovery. Keep shared providers/schema untouched and update the existing draft branch without merging or deploying.

## Response

Reproduced zero KPIs, empty-period charts and an unsupported calculated deficit on prior PR84 source. Payment-dependent summary, balance, charts, history and status-filtered invoice results now render existing loading/unavailable states until reads succeed. Independent payroll and unfiltered invoices remain available. Extended the actual fault-injection suite for both languages and widths, true empty values, recovery and both retry entry points. [Evidence](../frontend-completion/pg10-export-repair.md), [changelog](../changelog/0146-finance-summary-read-states.md).
