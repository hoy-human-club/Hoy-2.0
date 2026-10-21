# 0086 — Local problem-report drafts

version: 0.25.0
date: 2026-10-21
prompt: docs/prompts/0082-frontend-continuation.md

- Prompt intent: continue OT-03 with local form validation and screen/demo-user context while dispatch remains disconnected.
- Decision: reuse Drawer, Input, Field, Card, Notice and Button; add a documented ProblemReport organism and scoped component-local draft storage. Every state states that no report is sent.
- Alternative rejected: a success message implying report delivery, externally sending unapproved reports, persisting private URL queries, or losing the previous draft on cancel/storage failure.
- Files: `src/components/organism/ProblemReport/*`, Hub report import/control/strings, local-draft tests, HUB-01 report captures/page docs and batch-10 receipt.
- Validation: focused local-draft unit checks and real dev5191 EN/ES390/1280 11-role preview/failure/cancel/retry/idempotency/zero-dispatch checks passed; dark and responsive captures reviewed. Final production/release evidence follows in batch-10.
- Source acceptance: OT-03 Nov30 phase unchanged; source sends criterion remains unmet. No service, payment, database, permission or credential changes.
