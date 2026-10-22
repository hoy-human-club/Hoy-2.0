version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# 0109 — Coupled fictional account marketing save

Intent: repair the C-26 preference/profile/audit partial-save defect previously excluded from batch24, without changing existing consent rules or production acceptance.

Decision: use a dedicated mock-only staged command for selected WhatsApp/email marketing preference, any-of-two profile mirror (missing preference stays enabled), and existing consent.marketing audit. Fresh owned required rows, duplicate ambiguity, selected revision, scoped nonce/digest replay and postcommit readback fences contain retry/concurrency/ownership failures. C-26 gets independent busy/error/retry/cancel/unmount/context controls; batch24 account-data commands and shared preference hook remain untouched.

Alternative rejected: chained independent writes, stale cached other-channel mirror, swallowed/cancelled preference success followed by profile/audit, receipt replay without required rows, new legal/urgency/delivery/role/schema rules. No real message dispatch or legal consent claim.

Files: marketingConsent.ts, local useMarketingConsent.ts, C-26 Page composition, token-based local accessible-label presentation and bilingual strings; focused domain/rendered scripts, batch29 evidence and C-26 docs/captures. Root owns global tracking and all Git/release mutations. Verification and immutable fingerprint are recorded in batch29.

Root-reviewed presentation correction: the existing C-26 open-request block uses the existing surface Card tone so dark body/retention/Cancel text stays readable. Status badge, legal/15-day strings, export/deletion logic and drawers remain unchanged; no global component change. Actual UI contrast>=4.5 is checked in every language/width/theme combination.

Final validation: full build1066 PASS, marketing domain8+unchanged account6/replay4 groups PASS, immutable production7277 and serial actual dev-state76796 PASS with zero page errors. Final source/assets and44 fictional captures are receipted in batch29. Prior full passes were superseded only by the scoped visual refinements. No Git/release or production/commercial acceptance claim.
