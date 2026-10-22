# 0139 — Preserve published legal text and resolved signup evidence

date: 2026-10-22
version: 0.25.0
intent: Repair exact-version consent review findings in A-03, A-06 and M-03.
decision: Published legal rows reject updates, deletion and duplicate identities in the mock provider. The generic editor displays published rows read-only and creates editable drafts. Signup and legal pages share one text resolver; fingerprints include resolved bilingual tenant, policy and contact copy. Settings changes clear checked consent, the transaction rejects stale copy, and the append-only acceptance receipt retains both languages.
rejected: Hashing templates alone, or relying solely on disabled editor fields, leaves historical evidence vulnerable.
files: src/data/MockProvider.ts; src/modules/admin/{TablesPage.tsx,settings.ts}; src/modules/customer/{legal.tsx,legalContent.ts,auth/}; src/components/organism/LegalDocument/; scripts/test-signup-consent*; .github/workflows/signup-consent-qa.yml

Regression fixtures cover published/draft writes, resolved policy/contact/branding changes, stale submissions, replay and bilingual evidence. Browser checks cover EN/ES at 390/1280, signup light/dark, library states including 3840, selected-class return and asynchronous failure/cancellation. Fictional browser behavior only; real identity, server storage and integrations remain separate.

Cancellation QA follow-up: the shared-debit fixture copied an occupied mat into a date-dependent seeded class. It now uses an isolated synthetic future class and real provider mat allocation; shared-debit rejection assertions remain intact. The failure reproduces on the unchanged signup baseline.

A-06 now distinguishes the recorded acceptance version/date from the live-resolved text below it in both languages. Regression checks change policy/contact after signup, verify current values and this distinction, and verify the original signup audit snapshot is unchanged. Legacy acceptance rows are not presented as saved text snapshots.
