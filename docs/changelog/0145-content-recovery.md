# 0145 — Atomic content recovery (M-02 / M-02b)

date: 2026-10-23
version: 0.25.0

- Version: 0.25.0; date: 2026-10-23.
- Prompt intent: bounded AD-01 / PL-07 / PL-10 content failure recovery and atomic FAQ reorder; keep current design/data and prepare a draft PR only.
- Decision: use the existing mock atomic API through a local content command. Preserve draft/basis and exact failed command; retry with the same nonce. Save only changed entity fields. FAQ section edits and reorder/audit commit together. Existing tied section positions normalize atomically.
- Alternative rejected: sequential writes with compensating rollback can leave partial rows/audit and repeat an acknowledged reorder. Resetting drafts on updated_at loses edits when publication changes.
- Files: ContentPage.tsx, FaqAdminPage.tsx, contentRecovery.ts, useContentRecovery.tsx; focused domain/browser scripts and scoped receipt/evidence.
- Verification and limitations: [receipt](../frontend-completion/content-recovery.md). Original feature phases/source acceptance stay unchanged; full rows remain partial. Shared kanban/readiness update belongs to integration owner.
