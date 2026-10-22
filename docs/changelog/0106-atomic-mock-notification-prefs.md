version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# Atomic fictional notification preferences

Intent: prevent partial C19 master-switch saves and captured-row duplicate inserts in C24 without changing notification policy or real delivery.

Decision: isolated mock-only fresh owned-account/preference reads, atomic targeted writes, scoped technical replay receipts, duplicate ambiguity guards, and contained loading/error/retry/cancel/context states. Existing channels/categories/defaults/roles remain; C26 marketing mirroring, inbox and outbox are excluded. No real email suppression, mandatory classification, new business audit policy or schema is implemented.

Alternative rejected: sequential partial writes, stale captured-row inserts, false email enforcement/success, deleting historical duplicates or guessing mandatory categories.

Files: customer/notificationPrefs.ts, useNotificationPrefs.ts, preference-only hooks.ts subsection, C19/C24 preference UI, preference strings; scripts/test-notification-prefs{,-ui}.mjs; batch27 handoff. Root owns shared metadata/Git/release.

Verification: domain tests passed. Executor recovered after inspected pending patch outcome; domain+TypeScript+full frozen build passed. Fingerprint0bff92fb275d474d6fab1c21a2627aefdbc8862f8baa68cb67c7a7a03809fb98 unchanged through build; immutable5229 HTTP proof verified. Dev and final immutable5229 rendered matrices exited0: EN/ES390/1280light/dark, immediate C19↔C24 readback, quota/retry/doubleclick/cancel/context/missing/duplicate flows, unchanged inbox/outbox/profile/consents; existing C24 roles, zero pageerrors. 64 final viewport captures and results JSON saved. Root-owned exact-head integration/CI/deployment pending; no deployed claim. See batch27 for exact saved state/blocker. NT-06 stays partial/Nov 30 delivery; no backend acceptance.
