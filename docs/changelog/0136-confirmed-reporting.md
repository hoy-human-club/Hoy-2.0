version: 0.25.0
date: 2026-10-22
codes: M-09 M-07

# Confirmed-payment report and consistent activity export

Finance adds a read-only confirmed-payment CSV with inclusive Bogotá dates, tenant/COP validation, method/product and recorded confirmer. Recorded and received amounts remain separate. Unknown facts stay blank; malformed records are excluded with a visible count. CSV quoting, Unicode and formula protection apply. Download failures are retryable.

Activity uses the same actor/area/date/search-selected rows for count, table, detail and CSV. A reception check-in is exercised through the activity export. Reports never modify source records.

Verification: domain regressions, actual decoded browser downloads, eight language/viewport/theme combinations, role boundaries, seven widget-library examples and existing repair regressions. See docs/frontend-completion/reporting-tranche.md. Real backend authorization, durable accounting and server exports remain separate integration work.
