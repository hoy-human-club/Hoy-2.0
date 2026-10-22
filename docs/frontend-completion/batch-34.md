# Batch 34 — NT-05 existing email template edit/rollback safeguards

Source requirement: **NT-05**, COO-04, original **Nov 30 delivery**: “Edit templates with variables, send a test and save versions.” Source classification stays **partial/unaccepted**. This batch repairs only existing M-04 edit/rollback; batch28 covers the separate fictional self-test. It does not expand catalog creation, generic communications, publishing, delivery or retention policy.

## Checked source and reproduced defects

Worktree `codex/email-edit-atomic`, authorized base `ede03f34190e06b5b4a9f502c9262036a76cb59f`. The exact old onSave callback is saved in `scripts/fixtures/email-edit-before.txt` and executed by `scripts/test-email-edit.mjs` against the real MockProvider. It proved that an audit failure after update leaves changed template/version without a corresponding version audit, and a stale captured editor overwrites a newer row while reusing its version number. This is application-source evidence, not an assumption from a timeout. A subsequent actual-Mock held template-read regression also proved that an actor reassigned to a foreign tenant before acknowledgement could receive an owned-row result. Public reads now synchronously snapshot the caller actor and recheck ownership after the template read, with a final write-ack ownership check after audit reads. Controlled caller mutation and final-ack reassignment regressions pass. The earlier local runtime `0b2100510dc7…` is superseded by this repair and must not be treated as final QA evidence.

## Bounded behavior

`emailEdit.ts` freezes edit or rollback intent, reads fresh own-account/template/history scopes, and atomically stages the existing template update and existing business audit. Each accepted change uses current version+1. A stale template or changed historical target blocks the command. Exact replay verifies scope, fingerprint and the actual current saved row/audit/history; a missing/reassigned account or missing/changed result cannot produce a current-success acknowledgement. The generic technical receipt contains safe identity/hash/version metadata, not raw name/subject/body content. Existing business audit before/after values retain the established version contract.

Rollback restores the recorded seven allowlisted fields as a new version, leaves old audit rows unchanged, and preserves raw legacy body text and omitted optional values. It does not backfill or migrate history. Existing Spanish-required/missing-English activation behavior applies to new edits, with historical rollback active/English fields preserved literally. Catalog fallback, variables, CTA/body serialization, designer, active flags and the same four content.write roles remain unchanged.

`useEmailEdit` and the actual editor add immediate busy fencing, stable unchanged retry, changed-draft retry invalidation, explicit scoped reload, contained errors and cancellation/context/unmount guards. A cancelled or lost acknowledgement can leave an already completed local version; it cannot announce late success or continue as a confirmed current command. The old unsaved draft stays visible after stale/error; explicit reload replaces it with the saved version. Read failure blocks editing until retry. Labels state fictional browser versions and no email/provider connection.

## Verification receipt

- `node scripts/test-email-edit.mjs`: PASS baseline reproductions plus staged write1/write2 failure, quota, no partial rows/events, literal rollback/history preservation, version increments, English safeguard, stale row/history, unsupported snapshot, concurrent requests, same-request replay/conflict, lost acknowledgement, fresh actor/result/audit/rollback-target replay checks, postcommit cancellation, scoped read failure/foreign data, four allowed/seven denied roles and nonmock refusal. No message writes.
- `node scripts/test-email-edit-hook.mjs`: PASS16 actual-hook controlled lifecycle cases: immediate latch, stable retry, changed-draft invalidation, edit/rollback cancel/unmount/actor/selection/provider after commit; only current confirmed acknowledgement resolves. Completed local effects remain honest.
- `npx tsc --noEmit`: PASS.
- Production and dev rendered matrices/build receipt: **pending**, scripts prepared; browser queued by coordinator. No deployed claim.

## Routes and evidence

Actual route/deeplink: `/#/admin/emails` (M-04); existing Versions tab exposes rollback. New production test `scripts/test-email-edit-ui.mjs`; dev-only actual-page/provider controlled fault harness `scripts/email-edit-harness.tsx` and `scripts/test-email-edit-states.mjs`, not imported by production. Screenshot/result filenames use `docs/screenshots/M-04/*email-edit*`. Final source fingerprint and immutable served-bundle receipt follow actual QA.

## Remaining gates and next action

Anu must provide real authenticated tenant/role enforcement, backend atomic compare-and-set/idempotency, durable scoped version/audit storage and the agreed retention contract. Browser obscuring and mock role checks are not server authorization. This batch sends no mail and does not satisfy production notifications. Source NT-05 remains partial until the full original criterion and provider/version requirements are verified. No new owner policy or external question was created. Root owns integration, exact-head CI, merge/deployment and final deployment receipt; no Git mutations in this worktree by this agent.
