version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# 0117 — FI04 dedicated mock expense ledger transactions

Intent: repair confirmed existing M09c separate-write audit failures, stale paid deletion and cached partial/duplicate generation while preserving the current Finance source conflict and original phase.

Decision: one mock-only helper for all six existing ledger commands, fresh scoped actor/required rows inside staging and receipt replay/acknowledgement, immutable intent/original lifecycle controls, semantic stale comparisons, fresh paid-delete guard and existing fixed arithmetic against transaction rows. Audit action names/source remain; new scoped hashed metadata receipts omit entered bodies. Dedicated scoped reader and synchronous busy/cancel/unmount/context/retry lifecycle replaces cached page mutations; existing shared hooks/provider/schema/roles/subscription preview stay unchanged.

Alternative rejected: cosmetic disabled buttons over nonatomic writes, stale browser-only paid guard, cached generator dedupe, lost-ack retries with fresh IDs, caller-replaceable context controls, duplicated sensitive bodies in receipts, generic-provider policy/role changes, false postcommit rollback or production acceptance claims.

Files: own expense helper/hook/Page, removal of obsolete unsafe generator hook, admin expense strings/spec, own ExpenseLedgerStatus/meta, original source fixtures and baseline/domain/rendered scripts, batch35/M09c docs and safe evidence/captures. No global metadata or Git mutations. Source baseline5/current domain10/unchanged subscription-preview proof and final frozen build/rendered gates are recorded in batch35. Final fullbuild98898, baseline5/domain10/unchanged subscription-preview regression pass. Production91197 all8 EN/ES390/1280lightdark/all11roles and actual existing-provider dev72897 EN/ES pass, zero pageerrors/dispatch; both browsers closed.36 fictional captures/four inspected. Eight runtime/full source/full assets/served JS+CSS hashes stay unchanged; entry3cfe15a2…. Separate receipts retain test-injection correction and all remaining gates. No pass is inferred from compilation.

Limits: dedicated mock surface only; generic table/provider paid-delete bypass and owner Finance role conflict unresolved. No actual money movement, external dispatch, subscription import, arithmetic/date/pricing/paid-history/schema/security policy or phase changes. Root owns final exact-head CI/release and all Git actions.
