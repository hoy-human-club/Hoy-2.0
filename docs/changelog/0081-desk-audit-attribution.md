version: 0.25.0
date: 2026-10-21
prompt: docs/prompts/0081-desk-audit-attribution.md
intent: Preserve audit attribution while staging the authorized reception booking/sale/check-in writes.
decision: Record the session's effective role and the front-desk source in staged audit rows, matching the existing useAudit helper; verify both front-desk booking and administrator sale attribution. Reuse the existing bilingual booking.create audit label for desk reservations. No permission grants or financial rules changed.
rejected: Hardcoding every seller as front desk or omitting role/source, which breaks audit filters after an administrator sells or a desk booking is recorded.
files: src/modules/staff/{CheckinPage,RegisterPage}.tsx; scripts/test-desk-{package,sale}-ui.mjs; related evidence and frontend handoff.

The existing source acceptance and unresolved owner/backend queues remain unchanged. Release head/merge/deployment evidence is recorded on the associated checked PR.

Validation: full production build/TypeScript/spacing/manual lint passed; production-bundle desk booking and nine sale checks passed with zero browser errors, including administrator actor/effective role/source attribution and all existing rollback fixtures. EN/ES 390/1280 light/dark captures regenerated.
