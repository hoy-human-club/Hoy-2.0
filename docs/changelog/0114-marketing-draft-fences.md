version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# OT-01 local marketing draft operation fences

Intent: repair the reproduced mutable-command hash race and missing lifecycle/replay acknowledgment guards in the future local marketing draft workbench. Preserve the original After Nov30/Low/Marketing/Not verified source criterion and all existing roles, calendar, public reference allowlist and linked-discard rules.

Decision: own the command and context synchronously before hashing; validate explicit create/edit or discard-kind expectations; verify current replay effects and persisted readback. An immediate operation latch and context/editor/route/provider fences prevent stale writes or callbacks. Pending work can be canceled; completed local commits remain complete. Unknown write acknowledgments retain the same intent with honest retry copy. The v1 namespace/documents and opaque-only request receipts remain; no new table, dependency, schema or permission.

Alternative rejected: adding another storage location, inferred publication stages, policy changes or a server/provider contract would exceed this bounded browser mock repair. No cross-tab transaction/durability, delivery, approval, art rights or commercial acceptance is claimed. Generic Content tools and other batches are untouched.

Files: marketing drafts.ts/strings; MarketingDraftBoard.tsx/meta; existing draft domain/UI tests; new fence domain/dev-state harness/scripts; M18 page/captures and batch33 evidence. Root owns shared manifests/kanban/spec metadata, Git/CI/merge/deployment. Validation: full build, existing domain, eleven new boundary-test groups, immutable production EN/ES390/1280light/dark/all11roles, actual lifecycle fault matrix and focused D02 preview/cancel smoke all passed. No suite retries or runtime changes after source457abda freeze. Exact source/bundle/checked-checkpoint distinctions, inspected renders and remaining integrated CI/deployment gates are recorded in batch33 and evidence/batch-33-build.json. No whole OT01 acceptance.
