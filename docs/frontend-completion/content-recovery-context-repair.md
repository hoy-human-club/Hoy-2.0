# PR82 retained-actor retry repair

The integration report identified a P1 in initial PR82 head `9427338a60d31f3034c3233a3f35add14ca1f8f2`. No review submissions or inline threads were posted when checked. The scenario was independently reproduced against that built bundle: edit a fictional teacher's public name and rate, fail persistence with a quota fixture, change the super-admin's effective role to coordinator through the actual SessionProvider control, clear the quota fault, then click Retry. The old closure persisted rate `90111` from original `90000`, despite the current coordinator role. The regression test failed with `90111 !== 90000`.

## Repair

- The retained operation now also retains its initiating actor ID/effective role. The recovery hook reads the **current** SessionProvider context through a stable live accessor and refuses to execute a retry under a changed user or role. It keeps the draft, command and nonce intact and shows a bilingual context-change message.
- `writeContent` requires the live accessor. It rechecks exact actor/role and current content permission before execution, before queued transaction execution, around every awaited command read/write, and before returning a transaction acknowledgement. Unmounting the editor invalidates the accessor too, including when a denied role causes route redirection. Payroll authorization runs before receipt replay as well as inside the staged edit.
- A context change during a detached stage aborts that stage without publishing row or audit changes. A valid already-committed operation followed by a lost acknowledgement stays committed exactly once; changed-context retries cannot mutate or replay it, and restoring the original context retries the same receipt without a second edit/reorder/audit.
- Returning to the original user and role permits the unchanged request to retry once. Cancelling the pending operation and reopening the editor lets a new actor review the current data. No operation is silently reattributed to the new actor.

This is frontend/mock context enforcement, not real account authentication or server authorization. No shared provider, schema, account-security, package or workflow file was edited. Original AD-01/PL-07/PL-10 rows remain partial.

## Verification

- Existing 58 content recovery groups retained with all assertions; required live-context arguments added to their test caller only.
- 22 additional domain groups cover same-user role downgrade, different privileged admin actor, coordinator actor, changes while queued/after a staged write/after commit, payroll and FAQ lost-acknowledgement replay, original-context retry, denied current payroll permissions (including zero), and inactive-actor receipt refusal.
- Actual built pages: EN/ES at 390/1280 exercise quota failure, all three role/actor transitions, unchanged data/audit on blocked retry, preserved drafts, original-context retry once, and exact audit identity.
- Dev-only actual-page injection adds the same EN/ES role/actor cases after a transaction commits but its acknowledgement is lost. No runtime fault hook ships in the app.
- Full build/type/spacing checks and the existing content-batch and production-browser suite remain required; final results and source digests are stored beside this receipt.

## CI handoff — integration owner

Apply [content-recovery-ci.patch](patches/content-recovery-ci.patch) from the repository root. It adds **only** two package scripts and `.github/workflows/content-recovery-qa.yml`; it does not alter dependencies or lockfile. The patch is prepared separately and `git apply --check` passes. It has not been applied to the owned shared files.

The workflow checks out the exact PR head, runs both domain suites plus content-batch, builds, executes both browser suites against the built preview, then runs both against Vite with staged/lost-ack injections. `CHROMIUM_PATH` is supported by both suites, production and injected artifacts use separate roots, and context-suite artifacts use a nested `context/` directory to avoid overwriting the original suite's results. The integration owner must apply and run this wiring; no CI pass is claimed before that occurs.

Final local checks passed: full build/typecheck, unchanged spacing baseline, 58 original recovery groups, 22 new context groups, content-batch regression, both existing browser modes, six production context cases, and twelve injected context cases plus two denied-route queued-unmount cases. All browser runs reported zero page errors. [Exact source digests and verification](evidence/content-recovery/context-repair/verification.json), [production context results](evidence/content-recovery/context-repair/production-context-results.json), [injected context results](evidence/content-recovery/context-repair/injected-context-results.json).

Integration note: the separate CI handoff is now applied by the integration owner. Injected browser checks use the existing prepared-dependency launcher; package dependencies and lockfile remain unchanged. CI outcomes must be checked on the final remote head before release. Content prompt/changelog ordinal is 0146, preserving receipt-candidate ordinal 0145.
