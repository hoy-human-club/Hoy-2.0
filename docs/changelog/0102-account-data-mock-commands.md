version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# 0102 — Fictional account preview and request commands

Intent: repair the bounded mock C-26 export and deletion-request/cancel slice of CU-06 without implementing deletion, changing legal/retention policy or accepting the complete criterion.

Decision: explicitly allowlist selected scalar own-user/tenant fields, scope invoices to owned payment IDs and prepare the complete fictional preview before any audit/download offer. A separate confirmation can discard it. Prepared audit/receipt stores only counts/IDs/hash. Request/cancel and audit commit through existing MockProvider atomic staging, with fresh ownership/required rows/status checks, open-request guard and scoped nonce/digest metadata replay. Replay now revalidates required owned account/profile shape and recorded target ownership before acknowledgement; final preview consumption repeats the scoped read. A postcommit read failure suppresses acknowledgement/download without pretending to undo the committed audit. Historical replay does not rewrite current request status. Page-local guards suppress immediate duplicate, stale, cancelled and wrong-context work; copy never guarantees a saved file, real processing or email.

Alternative rejected: whole-row dumps, unrestricted provider/nested payloads, partial downloads after read failures, separate row/audit writes, raw reason duplicated in audit, stale cancellation of processing requests, browser deletion/anonymisation, new roles/security/schema or a legal retention interpretation. Existing fifteen-business-day wording remains unchanged behind the fictional boundary.

Files: local accountData helper, AccountPage/strings and C-26 page documentation, focused domain/browser scripts, batch24 proof and fictional captures. Existing components/tokens reused. Marketing consent multiwrite/shared profile hooks remain outside scope and recorded as a gap. Root owns all global tracking, Git, exact-head CI and release operations.

Validation: batch24 records the completed local build/domain/rendered checks and immutable bundle fingerprint; no complete legal export or full CU-06 acceptance claimed.
