# Reporting frontend verification

PG-10 provides a working read-only confirmed-payment CSV in Finance. Inclusive Bogotá dates select approved tenant/COP records. Recorded and received amounts are separate; unknown confirmers and received amounts stay blank. Invalid source facts are disclosed rather than inferred. Empty, invalid-range and download-failure states are implemented.

AD-10 uses one actor/area/date/search selection for count, table, detail and export. Search includes displayed actor, role, action, object and source. Download failure is announced and retryable. Tests execute a fictional reception check-in and verify its action/object in the activity CSV.

The reporting domain tests cover date endpoints, malformed records, money precision, timestamp ordering, CSV quoting, Unicode and formula protection. Browser checks decode actual downloads across EN/ES, 390/1280 widths and light/dark themes, including role restrictions and failure/retry. Seven widget examples are tested separately. Reports perform no provider writes.

Run npm run build, node scripts/test-reporting.mjs, then serve the production build on port 5331 and run scripts/test-reporting-baseline.mjs, scripts/test-reporting-ui.mjs and scripts/test-reporting-library.mjs. Set QA_BASE and CHROMIUM_PATH when needed. The reporting QA workflow runs these checks on pull requests.

Limits: high-volume browser performance, external spreadsheet applications, every activity producer and every date-filter combination are not exhaustively verified. Real authentication, canonical payment data, durable audit storage and server-side exports remain backend dependencies. These checks establish bounded frontend demo behavior, not production accounting readiness.
