version: 0.25.0
date: 2026-10-21
prompt: docs/prompts/0071-class-management.md
intent: Complete the preserved class-management request against current main.
decision: Integrate the reviewed browser-local command model and verify before release.
rejected: Reconstructing unspecified newer settings or importing private compensation.
files: src/modules/classSchedule; src/data; src/modules/admin/ContentPage.tsx; scripts/test-class-*.mjs

# 0067 · Class management

- Version: 0.24.0 feature iteration
- Date: 2026-10-15
- Intent: make Content editable in batches, give administrators a distinct class calendar, clarify recurrence and let individual class dates vary their theme/description.
- Decision: reuse SessionCalendar, DataTable, Card, Drawer and existing field controls; add atomic demo command seams for bulk changes, guarded undo, occurrence edits and reviewed recurrence generation. New classes default to 50 minutes; previous durations are preserved. Compensation is a separate protected configuration and never a public content field.
- Alternative rejected: directly overwriting selected rows in a loop, silently rescheduling a series, applying new defaults to history, or pretending the local provider is a connected booking/payment backend.
- Files touched: src/modules/classSchedule, admin/ContentPage, data/contentBatch, data/classRecurrence, data/sessionEditorial, data/MockProvider/types/schema, SessionEditorial component, customer class/checkout and website schedule previews, tenant defaults, generated SQL/data model, tests and screenshots.
- Verification: pure command tests cover atomicity, undo conflicts, references, occupied capacity, recurrence boundaries/duplicates/overlaps, immutable existing bookings and inherited/cleared/reset editorial copy. Final build and hosted UI QA are recorded in the pull request.

- Pay configuration: private class_pay_rules table, default-deny generated SQL, append-only effective-dated revisions and admin/finance-only M-14a. New class drafts get COP 100,000 flat rules; old classes and payroll history are not rewritten. Attendance formulas require explicit basis and inputs; no real payments.
