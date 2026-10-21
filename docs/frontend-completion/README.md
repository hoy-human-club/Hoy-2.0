# Frontend completion handoff index

Owner: one frontend integration coordinator. Baseline: remote main `2d402751c5bee899d5adab62837d2b0e7e313025`, v0.25.0, checked 2026-10-21. No AGENTS.md exists in the checkout/workspace; CLAUDE.md is the repository engineering contract. Original workbook was read only through connected Drive. Parent spreadsheet worker owns the English-first duplicate; link is pending.

- [Authoritative task manifest](features.json): all 124 source stable IDs, exact English acceptance criteria, scope/priority, separate source and fresh verification states. Unknowns stay unverified. Preserve IDs and phase labels when updating the duplicate.
- [Baseline source audit](baseline.md) and [all routes/roles](routes.json): 120 routes, 103 codes, 102 components. Source-level implemented/partial/absent findings; no overall acceptance claim.
- [Batch 2 / PR-01 and PR-02](batch-02.md): disconnected product drafts, effective date quotes and retained fictional snapshots.
- [Batch 1 / AD-07](batch-01.md): package balances and claimed vouchers in CRM.
- [Decision and owner queues](owner-queues.md): distinct Jas questions, Justin actions, Anu backend dependencies. No messages sent.

Next implementation batch: fix pending-payment entitlement activation (PR-06), reschedule cutoff (RS-09), package-aware desk bookings (RC-04/RC-05), and sale/check-in rollback on capacity/payment failure (RC-10). Use deterministic mock commands and failure fixtures before any backend integration. Then build transfer receipt upload/review/queue PG-02/PG-04/PG-05, explicit catalog publication/shared quotes PR-01/PR-02/SW-02, and PR-03 provisional launch catalog with unresolved prices visibly pending. Do not invent final prices, payment wait timing, cancellation outcomes or production authorizations. Continue other independent frontend rows while blocked decisions remain open.

Definitions: implemented = source behavior exists, partial = specific missing behavior/boundary identified, absent = no relevant implementation found, unverified = source or behavior has not been reconciled. A route's built badge detects PageStub only. A build proves compilation, not acceptance. Frontend pass and backend pass are separate gates. No row is fully accepted by this program; workbook acceptance remains the owner's decision.

Before each batch: refresh remote head, select stable IDs, preserve source scope, record contract and test cases. After each batch: update feature evidence, screenshots, commit, exact-head CI, deployment source SHA, public readback and rollback SHA here/in batch receipt. All tests use fictional isolated browser fixtures. Never commit private source correspondence, actual internal schedules or private pay captures. Existing publication controls remain authoritative.

Blocked environments are not silently worked around. Record exact target/action/reason and denied/pending/uncertain outcome. Issue [54](https://github.com/imagine-os/hoy/issues/54) remains open: private image copies are browser-local until approved durable storage is implemented by the backend team.

Current source reconciliation covers every one of the 124 IDs: 14 implemented in source, 94 partial, 11 absent specific flows, 5 unverified non-code/ownership/audit matters. These are source findings, **not** accepted feature counts. Fresh focused verification covers AD-07 and the PR-01/PR-02 prototype only; all 124 source acceptance statuses remain untouched. The manifest carries precise frontend gaps, separate backend prerequisites, actual route candidates and next action per row.

Code release: [PR55](https://github.com/imagine-os/hoy/pull/55), merged `f0f72539afb7fabf50825bc8e33c4e658b9bacd0`; source checkpoints `955d067` and `8136c6f`. All ten exact-head PR workflows passed. Runtime now registers 121 routes; the production smoke exercised 120 templates (wildcard excluded) with no console errors. [Deployment and source-SHA/selected-flow readback passed](https://github.com/imagine-os/hoy/actions/runs/39686441483); new-feature behavior was verified on the production bundle locally and in PR CI, while direct public release-file GET from this environment returned HTTP 403.
