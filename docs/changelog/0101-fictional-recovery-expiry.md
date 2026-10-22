version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# C-21 fictional recovery expiry and cancellation

Intent: repair the existing configured10-minute recovery-code expiry without implementing real credential recovery. CU-03 remains partial/MVP Oct30; CU-07 remains partial/After Nov30.

Decision: an isolated memory-only challenge helper enforces exact expiry,3wrong invalidation,45-second resend, consumed verification, prior-challenge revocation and synchronous operation tokens. Cancel/channel fallback/unmount clear simulated timers and revoke callbacks. Explicit bilingual notices state that no messages, password changes, other-session logout or completed sign-in occur. Only existing resend cooldown storage remains. Reuse existing input syntax/password length and existing Notice/Button/OtpInput library components; no new component/design token/dependency.

Alternative rejected: expiry copy without enforcement, delayed callbacks showing false success, treating a displayed mock code as provider authentication, logging/storing codes/passwords or inventing real recovery/security policy.

Files: customer/auth/{PasswordResetPage.tsx,mockRecovery.ts}; reset-only customer/strings.ts; scripts/test-recovery{,-ui}.mjs; docs/frontend-completion/batch-23.md; C-21 rendered screenshots/results. Shared manifest/kanban/global metadata and customer/hooks.ts are left to coordinator.

Verification: pure helper, TypeScript and full build passed; before/after runtime fingerprint `8faa549bf99ad6a8965a6a10a605a8908dc681777af5cf1cd36375132875a1b8` unchanged. All8 EN/ES390/1280light/dark public-route matrices passed against immutable5219, including failure/cancel/retry/replay/unmount and no credential/data/session effects; captures visually reviewed. Exact local proof is recorded in batch23; checked commit/CI/deployment remain coordinator-owned. This change proves only a bounded fictional frontend recovery slice.
