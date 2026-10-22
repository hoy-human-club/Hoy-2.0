version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# 0113 — Future maintenance lifecycle and scope fences

Intent: fix reproduced OT-02 future mock actor-loss commits and stale foreign-target replay without adding operational or safety policy.

Decision: snapshot commands before async work; scoped required reads before/inside/after transaction/replay; fresh target revision/result digest and actor/context acknowledgement; hashed metadata-only new receipts with read-only legacy compatibility. Preserve existing four kinds/presets/roles/revisions/record+audit atomicity. Page/workbench contain read errors, immediate duplicate saves, retry, active cancellation/unmount/provider/actor changes and postcommit uncertainty.

Alternative rejected: cached actor/target trust, payload-duplicating new receipts, late success after unmount/cancel, false rollback claims after commit, cache reseed/history migration or inventing safety/assignment/threshold/procurement/alert behavior. Original After Nov30/Low/Not verified and all124 fields remain untouched.

Files: maintenance helper/Page/strings/spec, existing MaintenanceWorkbench/meta, focused domain/rendered scripts and local S-10/batch32 evidence. Root owns global metadata/Git/release. Full frozen build/domain/rendered outcomes and remaining gates are recorded in batch32.

Final verification: full build40257 PASS; original maintenance suite+9 fence groups PASS; immutable production78639 complete EN/ES390/1280 light/dark/11roles and serial actual dev-state22227 PASS with zero page errors/dispatch.60 fictional captures and exact source/asset hashes are receipted in batch32. Two retained test-mode selector corrections left runtime/assertion timeouts unchanged. No source/runtime defect was inferred from those harness failures; no Git/publication or production/owner acceptance claim.

Review repair: retain the original live actor callback, AbortSignal and injection value synchronously at both exported helper entries. Caller mutation during held digest/read cannot replace lifecycle fences. Added precommit and postcommit replacement regressions; all10 fence groups pass. Prior full-matrix runtime proof is explicitly historical/superseded for current source; repaired full build25320 and original suite+10 fence groups pass; affected rendered QA remains queued. Existing operational/role/phase exclusions stay unchanged.
