# 0084 — Future-day rescheduling with retained purchased terms

version: 0.25.0
date: 2026-10-21
prompt: docs/prompts/0082-frontend-continuation.md

- Version: 0.25.0; date: 2026-10-21.
- Prompt intent: continue unblocked RS-09 future-day atomic rescheduling from authorized repository handoff.
- Decision: reuse Input/Field, original class-ledger allocation and isolated mock `atomic`; stage replacement/cancellation/waitlist offer once, preserve original debit and purchased expiry/freeze.
- Alternative rejected: moving only within the same day, silently spending a newer package, or sequential partial rescheduling after storage failure.
- Files: customer `rescheduleCommand.ts`, `hooks.ts`, `pages/BookedPage.tsx`, `strings.ts`, `specs.ts`; Input/Field metadata; `scripts/test-reschedule-atomic.mjs`, `scripts/test-reschedule-future-ui.mjs`; batch-08 receipt and C-08b captures.
- Validation: atomic/injected-failure and cutoff unit checks passed; rendered dev5191 EN/ES desktop/mobile/light/dark cutoff/future-day/cancel-edit/storage-failure/retry checks passed; final production and release evidence follows in batch-08.
- Boundaries: mock browser persistence only. Server scope/atomicity and migration reconciliation remain Anu's work. No cancellation policy or role changes.
