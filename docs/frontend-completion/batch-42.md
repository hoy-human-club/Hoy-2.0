# Batch42 — FI-04 local paid-expense deletion invariant

Original criterion: “Record fixed and variable expenses and services; a paid expense cannot be deleted.” Original phase **Nov 30 delivery**, Medium, Admin/Finanzas, FIN-11–14. Source implementation remains partial; real backend/owner acceptance remains unverified.

Basis: exact authorized0a09975aae2f581bd82e694b0654002466b79181. Existing schema212–213 defines paid_on:null as unpaid and paid corrections as a new noted row. No role/access-policy/RLS/schema changes, historical rewrites, actual accounting, payment or financial reversal workflow.

## Contract and provenance

Before runtime edits, copied the entire MockProvider byte-for-byte to scripts/fixtures/expense-ledger-original-provider.ts.txt; hash/commit/path in evidence/batch42-original-provider.json. Only the historical baseline harness loads that frozen provider. All five original defect assertions remain unchanged. Original handlers/generator retain ede03f3 provenance; provider provenance is separately0a09975. No claim that current provider still reproduces the old defect.

Current provider rejects direct/staged deletion when ANY matching expense ID has a truthy paid_on, matching existing source semantics. Rejects only clearing an already-paid marker; nonempty date changes and other fields keep existing behavior. Unpaid deletion uses strict persistence/rollback; a repeated missing expense removal is a no-write/no-event success. Non-expense remove behavior is unchanged.

Generic expense confirmation also captures its immutable full before-image and compares a fresh tenant-scoped unique target inside the same mock transaction. Changed/recreated/foreign/duplicate/now-paid rows reject. A retained confirmation nonce is scoped and hashed into the existing mock atomic technical receipt. It stores only version/status/scope/target IDs and hashes, never the before-image or expense terms. Committed replay freshly verifies actor ownership and current absence; any resurrected row (even exact byte-identical) rejects without another delete/write/event. A new explicit confirmation uses a new nonce. Fingerprint alone does not prove record identity. Other-table delete transaction behavior is unchanged.

Generic table drawer contains save/delete rejection, one synchronous action latch, scoped cancellation/context/unmount acknowledgement suppression, explicit post-write readback and honest uncertain acknowledgement copy. Cancel stops waiting; committed changes may remain. The paid row is visibly retained; existing tables.write/current route matrix is unchanged (super-only editable; finance/developer read-only). No new business audit policy; only existing mock.transaction technical idempotency metadata. No bulk API or server-security claim.

Atomic callbacks using staged remove are all-or-none; independent direct calls/Promise.all are not a bulk transaction. No generic expense bulk UI/API exists. Subscriptions remain a pure preview adapter.

## Checked local result

Final runtime fingerprint **`c51c2063a5b5203d9e4c583e1754a82e47418398a5b363f4c551f2d4b9c1b3c7`**, scoped four-file fingerprint `5c5a3413cdaa8359545dbf4b0073b14f271b3db95243bc25bbdcde6979e45f73`. Exact source/script/capture hashes and commands/exits are in [source proof](evidence/batch42-source.json); intended integration files are in [changed-file manifest](evidence/batch42-changed-files.json). This is base0a09975 plus uncommitted checked batch42, not live main.

| Gate | Actual result |
| --- | --- |
| Frozen original-provider counterexamples | PASS5, original assertions unchanged |
| Current provider/command domain | PASS39 groups |
| Actual RowDrawer controlled lifecycle | PASS11 cases |
| Existing expense ledger / subscription adapter | PASS10 groups / PASS |
| Strict TypeScript / full production build | EXIT0 / EXIT0 (build94973) |
| New M03 immutable production matrix | PASS24 cases: Super8 EN/ES390/1280 light/dark, finance/developer8 read-only, other8 roles denied |
| Existing M09c immutable production matrix | PASS8 EN/ES390/1280 light/dark plus existing role checks |
| Existing M09c actual development faults | PASS EN/ES |

The current domain tests exercise fresh exact-ID/active/tenant ownership at initial/staged/end/ack/replay reads; wrong returned IDs, foreign/missing/inactive accounts; stale, duplicate, freshly paid and recreated targets; each staged write/read failure; strict persistence quota rollback of memory/stored bytes/revision/events; mixed atomic deletion orders; concurrent same-nonce confirmation; changed-payload conflict; retained-nonce replay, lost acknowledgement and exact-byte resurrection; cancellation and receipt privacy. Controlled actual-drawer tests exercise immediate busy, readback failure/retry, cancel/unmount/context/selection/provider changes and withheld late Saved acknowledgement. A committed change may remain after cancelled/unconfirmed acknowledgement.

Real rendered production tests use only fictional fixtures at `/#/admin/tables/expenses?view=grid` and `&id=<fixture-id>`. They check paid-row retention, rejected marker clearing, save-quota no-Saved/no stored change, cancel with no writes, delete-quota rollback followed by retry, drawer footer viewport bounds, disabled read-only inputs and real denied routes. Only the exact two known Google Fonts CSS requests receive offline CSS fixtures; page/console errors and unexpected external/mutating requests must remain zero. No general network-error filtering.

[48 current M03 captures](evidence/batch42-source.json) include these inspected representatives: [ES390 dark delete quota](../screenshots/M-03/es-390-dark-expense-quota-error.jpg), [EN1280 read-only developer](../screenshots/M-03/en-1280-expense-usr_dev-readonly.jpg), [ES390 denied Admin](../screenshots/M-03/es-390-expense-usr_admin-denied.jpg). Existing M09c runners refreshed their scoped screenshots/results against current c51; those files are current regression evidence, not the old batch35 artifact. Original batch35 history remains in repository commit history.

The immutable local artifact is `/workspace/hoy-qa-artifacts/expense-delete-guard-c51c2063a5b5`, served for review at `http://127.0.0.1:5280`. Its full before/after digest is `6a1a0d0faa4bc930aaf21e5b9f03302bc5840627d5529ee1f1e7356ddbf17a59` (4512 files); assets digest `daab7247b4cfb3021562129bf0a2eebf77c47aa5698e69ef3f90870f2938a985` (3457 files). Source and artifact remained unchanged through final QA; HTTP sidecar/index/runtime/CSS matched disk. [Artifact proof](evidence/batch42-assets.json). All browser runners, compiler and dev5279 closed; static5280 remains read-only. Local `qa/*.log` files are supporting logs only: durable evidence records command exits, hashes and exact failure facts rather than implying ignored logs are committed.

## Preserved failure history

[Failure evidence](evidence/batch42-failures.json) retains two initial domain harness failures (duplicate variable declaration; attempted mutation of the actual readonly staged remove), corrected without weakening assertions. Initial runtime803 passed domain/build but rendered Save-quota found redundant nested alert semantics. The current c51 removes only the redundant wrapper; the actual warning remains accessible. Its first UI retry then found a test selecting both legitimate confirmation and failure alerts; the selector now matches the exact bilingual failure message, retaining all rollback/retry/bounds/timeouts. Final c51 full matrix passed. Both labelled failed captures/JSONs and old803 immutable artifact remain historical; no old failed runtime is reported as a final pass.

Static review clarification: `MockProvider.update` already strictly persists/restores previousDb before emit at base0a09975. Its implementation stays untouched except the narrow paid-marker check. Direct/staged expense-field quota and rendered Save-quota regressions verify that existing contract; no non-expense persistence behavior changes.

## Remaining gates and next step

Root owns integration with latest main, combined checked build/QA, exact-head CI and ordinary existing-demo deployment/receipt. This batch has no deployment receipt yet and does not claim owner/backend acceptance or a completion percentage. FI-04 remains partial in its original phase. Browser-day demo reset, cross-tab/device durability and real authorization are not guarantees.

Anu must enforce authenticated durable paid-history invariants across every API/database path, canonical history/idempotency and real concurrency/security. Any future reversal/adjustment workflow requires its own owner/backend contract; this batch introduces none. No real accounting, access policy, role, RLS, schema or historical paid-record rewrite occurs.

## Combined integration follow-up

The actual M03 drawer/session/provider timing harness is now copied into the next integration. Its prepared source receipt is `evidence/batch42-table-dev-prepared.json`; execution is pending. Earlier M09c dev results do not establish this new M03 matrix. The combined integration also addresses the independently measured shared danger-button dark-theme contrast failure; before/after proof remains separately gated.
