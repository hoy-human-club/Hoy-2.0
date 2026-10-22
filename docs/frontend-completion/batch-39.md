# Batch39 — AD-06 fictional team proposals

Original requirement **AD-06**, Administration, **MVP Oct30 / Urgent / SAD-01**: “Administration invites users, assigns the role (Front desk or Administration), changes it and removes it; the change applies immediately.” The original source Not verified/Not seen and criterion/phase stay unchanged. This is partial frontend evidence, not real membership/authentication or owner/backend acceptance.

## Source contract and boundary

Authorized base `e04afec218eab935debe57a1f6d8ad451b7b9a2f`, isolated `codex/team-proposals-mock`. M-08a's existing general settings renders a contained TeamProposalPanel for existing `settings.write` admin/super_admin only. No route, session, role or permission definition changes. Coordination/finance retain their existing settings access without this panel. Existing `users`/`user_roles` feed sign-in, so this workflow never reads or writes real membership rows. Existing commerce `invites` are referrals and are not reused. Clerk stays disconnected.

The separate local document is keyed by tenant/actor/effective role, using the existing demo session only as a namespace, not proof of authenticated identity. It admits only fixed `fictional-team-*` person IDs and reserved `example.invalid` recipients. Assignment choices are the canonical `front_desk` and `admin`, not all team roles. Every action reviews a frozen proposal before one document write. Preparing an invitation creates no member; an explicitly labeled fixture-only joining simulation is separate. Role-label changes and fixture removal update only the fictional list immediately. No invitation/token/link/message/account/session/access is created or changed.

Self-removal, last-admin changes, TTL/resend, existing-account behavior, multiple-role reconciliation and the meaning of production removal stay unresolved scenario previews. Pausing the last-admin fixture is a frontend simulation safeguard, not an approved production policy. Other fixture actions proceed without deciding those rules. A fixture removal state does not imply account deletion, disabling or session invalidation.

## Local safeguards

The helper snapshots command/context and retains live callback/signal references before awaits, validates the complete document/fixture scope, and serializes same-process commands. It checks expected revision and stable request fingerprint/result hash on replay. One setItem stores the complete next document plus safe request metadata; there are no separate partial row/audit writes. Corrupt/foreign/duplicate documents fail closed without automatic replacement. Replay cannot falsely confirm an older result after a later edit. Cancellation and context changes reject acknowledgement; an already completed local save can remain. This is not a cross-tab or backend transaction guarantee.

The contained hook provides scoped loading/read retry, immediate busy latch, stable unchanged retry, changed-form retry invalidation, cancel/unmount/actor/role/provider/storage fencing and no late success/continuation. The component reuses existing Button/Notice/Field/Card/Drawer/Badge; its new organism meta includes the actual usage and a contained read-failure usage.

## Verification

- `node scripts/test-team-proposals.mjs`: PASS reserved fixtures/two-role allowlist, one-document quota rollback/retry/replay/conflict/concurrent/stale, frozen payload/context/retained callbacks+signal, cancellation/postcommit/lostack/readback, corrupt request receipt and async result-race acknowledgement, lastadmin unresolved pause, corrupt/duplicate/foreign reads and byte-identical MockProvider database.
- `node scripts/test-team-proposal-hook.mjs`: PASS22 actual-hook loading/latch/retry/changed-form/unconfirmed/cancel/unmount/actor-return/role/provider/storage API cases; only current confirmation resolves. Final `npx tsc --noEmit`76947 EXIT0.
- Full `npm run build`8168 EXIT0; runtime before/after `c3899e89a6ce1beb35c572897c335650ba809fe06d17b7efd2efb87c713f8206`. Immutable `/tmp/hoy-team-proposals-qa-c3899e89a6ce`, local5272, sidecar explicitly base plus uncommitted batch39. Production Settings matrix PASS8 EN/ES390/1280lightdark, current all11roles, previewcancel/quota/retry/stale/lostack/busy/cancel/unmount/corruptread; provider database and session remain byte-identical across commands. D02 and bounded allowed/denied-role captures pending corrected harness rerun. No hosted/deployed claim.
- An initial D02 role-addon assertion observed panel1 for intended coordinator. Bounded actual-session diagnostic proved the harness reset coordinator to superadmin on every document via unconditional addInitScript. Once-per-sessionStorage retained coordinator and panel0. Only test initialization corrected with explicit actor assertion; source c389 stayed unchanged. Final D02 rerun remains queued; see `evidence/batch39-harness-correction.json` and `batch39-role-fixture-probe.json`.

## Remaining gates

Anu: authenticated staff invitation acceptance, tenant-scoped canonical membership/role commands, server authorization, immediate permission/session invalidation and durable audit/idempotency. Jas/owner decisions: self/last-admin protections, expiry/resend, existing identity and additive/replacement roles, removal semantics. Justin: approved production Clerk environment/host/access-policy connection as a separate authorized security task. No external questions or messages sent. Root owns shared tracker/integration/CI/Git/deployment; the original full AD-06 criterion remains unaccepted.
