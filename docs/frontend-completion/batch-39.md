# Batch39 — AD-06 fictional team proposals

Original requirement **AD-06**, Administration, **MVP Oct30 / Urgent / SAD-01**: “Administration invites users, assigns the role (Front desk or Administration), changes it and removes it; the change applies immediately.” Original criterion, phase and source status stay unchanged. This is partial frontend evidence; real membership/authentication and owner/backend acceptance remain unverified.

## Boundary and implementation

Authorized base e04afec218eab935debe57a1f6d8ad451b7b9a2f, isolated codex/team-proposals-mock. Existing M08a general settings contains the panel only for existing settings.write admin/super_admin. Coordinator/finance keep their existing settings access without this panel. No route/session/role/permission definition, provider database, real membership, users/user_roles, audit/message or Clerk changes. Existing commerce invites are referrals and are not reused.

The separate tenant/actor/effective-role local document admits only fixed fictional-team-* IDs, reserved example.invalid recipients and canonical front_desk/admin labels. A frozen proposal precedes one document write. Invitation preparation sends nothing; explicit fixture-only joining is separate. Label changes/removal read back immediately only in the fictional list. No account/token/link/message/permission/session/access is created or changed.

Self/last-admin, TTL/resend, existing account, multiple roles and real removal remain unresolved scenario previews. Last-admin pause is a frontend fixture safeguard, not approved production policy. Fixture removal implies no account deletion, disabling or session invalidation.

The helper snapshots context/payload while retaining live callback/signal controls, validates complete fixture scope, serializes same-process operations, checks revision/replay result and writes one document with safe hashed request metadata. Corrupt/foreign/duplicate documents fail closed. Replay cannot confirm an obsolete result. Cancellation/context changes reject acknowledgement; an already saved result may remain. No cross-tab/server/durable guarantee.

The hook provides scoped loading/read retry, immediate latch, unchanged retry, changed-form invalidation and cancel/unmount/actor-return/role/provider/storage fences. Only confirmed current acknowledgement resolves.

## Current522 presentation inventory and checks

TeamProposalPanel now supplies its real model to shared TeamProposalPresentation. D02 supplies twelve deterministic bilingual in-memory models through that same widget: empty, loading, read-error, draft, preview, busy, error/retry, stale, saved, replay/same-saved-view, cancelled/no-late-ack neutral view, unresolved/no-apply. Actual Drawer and inline D02 examples reuse the same preview body/actions. Fixture models call no actual team hook, provider, storage or session API; they do not simulate new business rules. The original empty-example interactive preview/cancel remains. Presentation coverage does not prove command/lifecycle/backend behavior; separate real-controller checks do.

Current runtime **522609719a05afe4642ba2e5cdfa82d8de74a447c442801926aa83b8bb46c00a** stayed identical before/after build and both UI suites. Fingerprint: sorted src relative path+bytes excluding generated captureDates, then Vite config bytes. No Git/source acceptance is implied by that hash.

- `test-team-presentation-fixtures.mjs`: EXIT0,24 actual shared-widget bilingual mappings; guarded storage/session/actual-hook access.
- `test-team-proposals.mjs`: EXIT0, reserved fixtures/two-role allowlist, one-document quota/replay/conflict/concurrent/stale, frozen payload/controls, cancellation/postcommit/lostack/readback, corrupt result/races, unresolved scenarios and byte-identical provider database.
- `test-team-proposal-hook.mjs`: EXIT0,22 real-hook loading/latch/retry/changed-draft/unconfirmed/cancel/unmount/actor-return/role/provider/storage cases.
- Type20772 and fullbuild67888: EXIT0. No source change during build.
- Production83787: EXIT0,8 EN/ES390/1280lightdark, all11existing roles, original failure/cancel/retry/stale/lostack/busy/unmount/corrupt-read assertions, unchanged provider/session and physical footer bounds.
- Expanded library97929: EXIT0,12 state views×8 language/theme/viewport combinations=96 state captures plus48 action captures; original interactive preview/cancel and allowed/denied actual-role addon retained. Exact state/control/bounds and no-document/provider/session-write assertions. Zero pageerrors, consoleerrors or unexpected requests. Only two exact previously observed Google Fonts CSS URLs receive offline/system-font stylesheets; real font-provider delivery is unverified.

Immutable `/workspace/hoy-qa-artifacts/team-proposals-522609719a05`, local5272. HTTP sidecar identifies base/checkpoint9d90759 plus uncommitted scoped source, not live main. Whole artifact4271files SHA **2a98b019af6711ea7e6735fcee56d88a1d2e0a5b8ede443aad60b255d7909201** and assets3216files SHA e891eb5feff7c049d8e67edd3c8ca35f1cbbec057b3902727b50e70f000c0c32 measured BEFORE production/library and unchanged AFTER both. HTTP entry/runtime chunk/CSS match immutable files. Exact source/script/248 current capture hashes,144 state/action captures and four canonical captures are in evidence/batch39-source.json and batch39-inventory-assets.json. Logs: qa/batch39-inventory-{fixtures,domain,hook,type,build,production-ui,library-ui}.log.

Inspected mobile draft/actions, loading, read-error, Spanish error/retry and unresolved/no-apply, plus desktop draft/actions and saved states. Controls fit and fictional boundaries are visible. Canonical EN/ES390/1280 now copy current522 actual superadmin settings images. All browsers/type/build processes closed. No hosted/deployment claim; root owns Git/integration/release.

## Historical failures and proof boundaries

c389 passed functional checks but **failed visual inspection**: Spanish390 Cancel was clipped. Only the private footer now wraps existing controls; no shared Drawer/CSS/role change. Exact old image/hash remains in batch39-footer-before-wrap.json and es-390-dark-team-footer-before-wrap.jpg. Physical footer bounds were added to both scripts.

77 passed production8/roles and **only its two then-current D02 usages** (default/read-error), interactive preview/cancel and role addon. It did not demonstrate all12 declared presentations. Historical proof is batch39-source-77-footer.json;108 exact prior captures were preserved before overwrite in qa/batch39-77-captures.zip, indexed by batch39-historical77-captures.json. That archive is local; root owns durable retention.

The original role-addon failure was proven to come from unconditional init resetting coordinator to superadmin on full navigation; a once-per-session fixture and actual actor assertion fixed that harness. A separate initial D02 selector timeout remains **cause unresolved**. Later passes and concurrent ENOSPC observations do not establish its cause. Historical diagnostic/harness JSONs remain unchanged.

## Remaining gates

Anu: authenticated invitation acceptance, tenant-scoped canonical membership commands, durable authorization/audit/idempotency and immediate permission/session invalidation. Jas/owner: self/last-admin, expiry/resend, existing identity, additive/replacement roles and removal semantics. Justin: approved Clerk environment/hostname/access-policy connection as a separate authorized security task. No external questions/messages. Original AD06 remains unaccepted; no production/commercial acceptance or completion percentage.
