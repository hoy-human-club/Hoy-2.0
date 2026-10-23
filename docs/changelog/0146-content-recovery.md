# 0146 — Atomic content recovery (M-02 / M-02b)

date: 2026-10-23
version: 0.25.0

- Version: 0.25.0; date: 2026-10-23.
- Prompt intent: bounded AD-01 / PL-07 / PL-10 content failure recovery and atomic FAQ reorder; keep current design/data and prepare a draft PR only.
- Decision: use the existing mock atomic API through a local content command. Preserve draft/basis and exact failed command; retry with the same nonce. Save only changed entity fields. FAQ section edits and reorder/audit commit together. Existing tied section positions normalize atomically.
- Alternative rejected: sequential writes with compensating rollback can leave partial rows/audit and repeat an acknowledged reorder. Resetting drafts on updated_at loses edits when publication changes.
- Files: ContentPage.tsx, FaqAdminPage.tsx, contentRecovery.ts, useContentRecovery.tsx; focused domain/browser scripts and scoped receipt/evidence.
- Verification and limitations: [receipt](../frontend-completion/content-recovery.md). Original feature phases/source acceptance stay unchanged; full rows remain partial. Shared kanban/readiness update belongs to integration owner.

## PR82 review repair — retained actor context

- Reproduced initial-head P1: quota-failed payroll edit retries as super admin after the live effective role changes to coordinator (`90111 !== 90000`).
- Require a live SessionProvider actor accessor in the local command; check current actor/role/permission before retries, queued work, awaited reads/writes and acknowledgement. Preserve the original command/nonce/draft without reattributing it to a new actor.
- Add 22 domain context groups and EN/ES responsive actual-page role/actor/lost-ack regression cases without removing existing assertions. Make the existing browser executable path configurable for CI.
- Prepare package/workflow wiring in a separate un-applied patch for the integration owner. Shared files remain untouched.
- [Repair evidence and CI handoff](../frontend-completion/content-recovery-context-repair.md). Browser-local only; whole feature rows and real server authorization remain unaccepted.

## Integration verification

- Applied the package-script and exact-head content CI handoff. The injected browser job uses the existing prepared-dependency QA launcher and retains all owner assertions. Production and injected artifacts stay separate.
- Reserved ordinal 0145 for the checked receipt candidate; this content entry and prompt move to 0146. No owner runtime source is changed by integration.
- Terminal checks and independent final-head review remain required before release.
