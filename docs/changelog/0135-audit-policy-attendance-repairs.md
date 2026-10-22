version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0135-audit-policy-attendance-repairs.md
codes: S-02 M-09 M-02 C-02 W-04

# 0135 · Audit policy and reception repairs

Version: 0.25.0 (draft repair, not released) · 2026-10-22

Prompt intent: repair the unambiguous saved-main audit findings without touching concurrent email-readiness work, choosing unsettled cancellation/hold rules, merging or deploying.

Decision: remove Finance refund controls and refund permissions for every role under the approved permanent no-refunds rule. Historical payment statuses/records remain readable. Fresh fictional timetable slots begin at :00 and last 50 minutes, using the tenant duration default; the dependent fictional practice-history generator follows its new 08:00 slot. No version bump or migration rewrites an existing cached timetable, booking or historical record. New content creation already defaults to 07:00/50; its preview fallback now agrees.

Reception attendance now writes booking status and its existing attributed audit together through a local mock transaction. Fresh booking/session/actor reads, observed-state conflict detection and a stable request audit prevent stale commands and duplicate effects. Failures preserve the previous stored booking and audit; payments, entitlements, mats and existing occupancy semantics are not rewritten.

RC-02 literally requires staff to mark Arrived/No-show and undo, but gives no correction cutoff. The saved provider rejects checked-in→booked after start as a new admission. Do not infer a policy from that implementation detail: preserve the boundary and show an explicitly disabled undo with a visible policy-confirmation explanation. No new after-start admission, no-show undo or customer recovery rule is introduced. Payment-hold anchors, after-hours behavior and customer/studio cancellation policy remain dependencies.

Alternative rejected: globally relaxing prepareBooking, automatic migration of stored schedules, implementing the historical refund row, or treating mock transaction tests as backend/owner acceptance.

Files: auth permissions; Finance and content preview; seed timetable/catalog/practice lookup; new receptionAttendance command; Check-in strings/page/spec; focused policy/attendance/browser regressions; booking QA workflow; concise checkpoint/prompt/kanban note. Existing email panels and component-library files remain untouched.

Evidence and retained failures: see frontend-completion/audit-repair-checkpoint.md and its JSON receipt. Final tests/checkpoint recorded there. No deployment, merge or shared-sheet write.
