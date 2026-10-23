# Content recovery — scoped frontend evidence

Basis: fresh remote main `455843fda97c7a0c9979b3331d11690d9653f5e7` (includes PR81). Owner scope: M-02 `ContentPage.tsx`, M-02b `FaqAdminPage.tsx`, local command/hook and focused tests. No AGENTS.md or .agents/skills exists in this checkout; CLAUDE.md and .claude/skills/ui-spacing/SKILL.md were read. No schema/provider/package/workflow changes.

| Requirement | Scoped result | Acceptance boundary |
| --- | --- | --- |
| AD-01 (MVP Oct30) | Content create/edit/publish/unpublish/delete and FAQ create/edit/section updates/reorder use existing detached mock transactions. Row mutation and attributed audit persist together. Failed saves retain drafts; refreshes do not overwrite them. Exact retry uses the retained command/nonce, including lost acknowledgement. Same-render repetition is locked. FAQ order normalizes only its section, including legacy ties. | Full AD-01 remains **partial**: schedule/recurrence, website/app/front-desk propagation, all consuming surfaces and owner acceptance are not completed by this slice. |
| PL-07 (MVP Oct30) | Literal script/HTML fixtures remain text in fields/previews, with no execution. Scoped command validates permitted fields, text bounds, required names on edits, booleans and numeric/time bounds; stale snapshots fail closed. | Broader platform forms and all validation requirements remain **partial**. |
| PL-10 (MVP Oct30) | These content commands append existing audit_log entries inside the same transaction, recording actor, role, source, affected IDs/fields and provider timestamps. Technical retry receipts store a digest, not copies of content text. | Payments/bookings/vouchers/price history and real server append-only enforcement remain **partial**, outside this slice. |

## Verification

- `npm run build` and `npm run typecheck`.
- `node scripts/test-content-recovery.mjs`: 58 focused groups, including failures at data/audit/sibling/reorder writes, quota failures, no partial rows/events, lost acknowledgements for new drafts and reorder, duplicate exact requests, stale/foreign/denied requests, literal text, length bound and tied ordering.
- `node scripts/test-content-batch.mjs`: existing batch apply/audit/undo/conflict/reference/permission/capacity regression.
- `QA_INJECT=1 node scripts/test-content-recovery-ui.mjs`: actual pages on Vite, with second-write and lost-ack injections around the existing MockProvider. Browser failure injections are test-only; no fault hooks ship in the app.
- `QA_BASE=http://127.0.0.1:5218 node scripts/test-content-recovery-ui.mjs`: built bundle, real EN/ES pages at 390/1280, all four content entities, failed storage writes/retained drafts/exact retries, publication refresh while dirty, stale-save refusal, FAQ reorder/section recovery and one-draft creation, dark FAQ capture. Browser results identify actual completed runs.

All fixtures are fictional and browser-local. No credentials, real authentication, payments, email, external messages, services, merge or deployment. No claim of cross-tab/device or server transaction/security acceptance. Bulk apply now retains its preview after failure and has an immediate lock; existing bulk transaction domain regression passes. Lost-ack undo reconstruction for the legacy bulk API and recurrence generation are not newly verified here.

## Integration handoff

Integration owner should add this bounded evidence to the shared kanban/readiness tracker without marking full AD-01/PL-07/PL-10 complete. Shared tracker files were left to that owner per delegated ownership. Reuse existing Button/alert/Drawer states and design tokens; no new component variant. Draft PR only; integration owner owns final merges/releases.
