version: 0.25.0
date: 2026-10-23
codes: C-02 C-02b C-08 C-13 C-14 C-15 C-18 C-25

# 0142 — Schedule, booking detail and customer support

- Version: 0.25.0, dedicated customer slice; base 94fe5259 (PR78).
- Date: 2026-10-23.
- Prompt intent: close genuine RS-01/RS-08/RS-13 frontend gaps with fictional fixtures, preserving no-refunds/consent and concurrent owner boundaries.
- Decision: contain scoped customer reads; distinguish loading/error/empty; protect inactive teacher deep links; project only exact owned debit/payment links; show configured booking directions and keep changed-address map targets current. Existing filters/calendar/capacity behavior retained.
- Alternative rejected: duplicating calendars, inferring payment from paid_with/date/amount, treating cancelled as refunded/released, inventing a timeout or altering shared schema/provider/auth/payment/voucher/public-content files.
- Files: customer pages SchedulePage, BookedPage, RulesPage, FaqPage, TeachersPage, MorePage; scoped useCustomerRows, bookingPaymentStatus, directions, supportStrings + strings registration; existing Badge/Card/Notice/EmptyState metadata; dedicated schedule-support harness/domain/browser checks and workflow; frontend-completion/schedule-booking-support.md; page documentation and dedicated fictional captures/results; this changelog/prompt/kanban.
- Evidence: local build, domain checks, ES/EN 390/1280 real customer-shell fixture matrix and light/dark key captures, existing cancellation/reschedule/date regressions. Details and partial-row boundaries in the handoff. No live/backend/full-row acceptance asserted.
