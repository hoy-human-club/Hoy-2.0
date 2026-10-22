version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# 0092 — Teacher class ownership gate

Intent: repair PF-01 foreign class detail and unlinked stored-preview fallback without changing roles or launch attendance.

Decision: ownership gate before roster/review/note child mount; tenant/participant-scoped detail reads with defensive output filtering, stale actor/ID/request suppression, contained loading/read errors and Retry. Teacher identity requires own linkage; authorized reviewer selection remains. Existing note/complete commands freshly recheck ownership inside MockProvider atomic staging, with immediate UI in-flight guard. Attendance remains reception-only/read-only.

Alternative rejected: merely hiding write buttons while disclosing foreign rosters, treating a stored teacher pick as teacher identity, expanding route roles or silently enabling future attendance.

Files: `src/modules/teacher/ClassPage.tsx`, `classOwnership.ts`, `useTeacherSelf.ts`, HomePage/specs/strings; targeted ownership domain/production UI/dev-state tests; batch16 and S-03 evidence. No SQL, backend policy, credentials or permission-matrix changes.

Verification: TypeScript/domain checks passed. Bilingual responsive rendered and exact release checks are recorded in batch16/coordinator receipt when verified. Server authorization and source attendance acceptance remain separate.
