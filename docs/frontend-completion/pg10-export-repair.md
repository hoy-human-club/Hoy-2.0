# PG-10 confirmed-payment export repair

## Finance summary correctness follow-up

Reproduced locally from PR84 source `75538481412fe476a29d2b340138c3567ca24b83`: held initial reads and a rejected special-concept read rendered zero payment KPIs, “No activity” charts and a balance deficit calculated from unloaded revenue. Baseline screenshots/observations are in ignored `qa/reporting/summary-baseline/`; no evidence from another executor was needed.

Finance now renders payment-dependent summary/counts, balance and revenue charts only after the report reads succeed. Existing D-02 EmptyState loading/unavailable variants describe pending/failed loads; no new shared component or variant was introduced. Summary retry uses the same report-local reader as the CSV widget. Payment history and status-filtered invoices also show unavailable/loading rather than false empty results. Independent payroll figures and unfiltered invoice data retain their existing behavior.

The actual dev fault suite now covers EN/ES at390/1280: initial held reads; both payment and concept failures; absent KPI/balance values and absent empty-period chart labels during unavailable states; genuine zero/empty rendering after a successful empty read; restored nonzero figures/charts on recovery; retry from both summary and widget; independent payroll still visible; stale/unmounted completion and export guards unchanged. These are bounded frontend availability checks, not validation of separate payroll/expense/backend reads. Local source remains free of shared provider/schema edits. Captures stay in the reporting CI artifact.

Base: remote main `455843fda97c7a0c9979b3331d11690d9653f5e7`. Branch: `codex/pg10-export-repair-20261023`. Two reproduced frontend defects, fictional fixtures only. No shared provider/schema or PG-08 receipt/settlement source changes.

## Behavior

Planless confirmed payments now export their unique same-tenant linked `special_charges.concept`, with `product_id=special_charge:<id>`. Catalog-plan labels remain primary. Missing, blank, foreign or ambiguous special linkage is never guessed: a localized “not recorded” label appears in the CSV and the widget discloses the unresolved count. Existing CSV quoting and formula protection apply to concepts.

Finance's payment read now uses dedicated `watchPaymentReport`/`usePaymentReport` helpers. Both payments and special concepts must load successfully; cached provider `peek` data cannot establish export readiness. Loading and failure clear export rows, disable download and hide old prepared-download feedback. Source errors have EN/ES announcements and working retry. Both tables subscribe for refresh. Generation and unmount guards ignore late responses; provider/effective-user/role changes invalidate the hook snapshot. No read helper writes data.

D-02 now has ten real usages, adding a recoverable read-error preview, special concept and missing linkage. The original date filters, money fields, statuses, roles, activity export and browser-download error/retry remain.

## Verification

- `npm run build`: passed locally; existing Rollup circular-chunk and size warnings remain.
- `test-reporting.mjs`: retained inclusive Bogotá date endpoints, malformed source facts, COP/money precision, recorded/received distinction, immutable input and CSV/BOM/formula rules.
- `test-reporting-reads.mjs`: scoped fresh reads/subscriptions, both source failures, retry/empty success, stale success/rejection, stop/unmount, duplicate IDs and unique/missing/foreign/blank/ambiguous special linkage, catalog priority and formula/CSV escaping.
- `test-reporting-read-ui.mjs`: actual dev provider read faults in EN/ES; held loading, newer success over old results, both error/retry/empty paths, blocked old export, unmount completion, no data writes, uncaught errors or document reloads during injection.
- `test-reporting-special-ui.mjs`: actual parsed production CSVs in EN/ES390/1280 light/dark, concept identity, unresolved linkage labels, preserved catalog plans, comma/quote/CRLF/Unicode/formula handling and no provider writes/overflow.
- Existing production reporting UI passed eight language/width/theme matrices, date-bound downloads, empty/invalid/download-failure/retry, role access and reception-to-activity export. Existing library suite passed with ten usages and a working read-retry preview.

New captures/downloads remain in ignored `qa/reporting/`, uploaded by the reporting workflow as `reporting-<head SHA>` artifacts for14 days. No protected payment captures are added to public source. Exact final-head CI and combined review remain separate from local verification.

These are bounded PG-10 frontend repairs, not full accounting acceptance. Authenticated production permissions, authoritative payment/staff/product data, bank settlement, receipt email, high-volume/server export and external spreadsheet-engine behavior remain independent integration gates. No refunds or timing decision is introduced.

Resumen: el CSV incluye conceptos de ventas especiales y señala vínculos no verificables. Las lecturas fallidas bloquean la descarga con reintento; las respuestas antiguas o posteriores al desmontaje no se aplican. Backend, emails y aceptación contable siguen aparte.
