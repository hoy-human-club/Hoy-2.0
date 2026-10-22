version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# PF-03 atomic local substitute request

Intent: repair the existing teacher request's partial writes, duplicate retry and late drawer reopen without inventing substitution rules or claiming delivery.

Decision: stage the existing audit and team queue row in one mock transaction with fresh tenant/teacher/class ownership, safe hashed replay receipts and existing eligibility. Add contained scoped choices loading/read failure/empty/retry; synchronous busy/cancel/unmount/context guards; explicit browser-local queued copy. The private reason stays in the existing team row, outside audit/replay receipts. Existing Administration log reads the same row; it never enters a customer thread. No new roles, recipient, channel, queue, notice cutoff, approval or timetable action.

Alternative rejected: separate writes followed by "request sent", live WhatsApp integration without a recipient/channel contract, or treating closed-drawer late completion as a reason to reopen it.

Files: teacher HomePage, substitute request command/hook, bilingual strings, domain/production/dev-state tests and harness, S-03 page evidence and batch26. Root owns global metadata/manifest/kanban and all Git/release mutations. Final full build, domain, immutable production EN/ES390/1280 lightdark/roles and clean dev-state matrices passed; source d0b936…/bundle96149c… and exact receipts are recorded in batch26; original Nov30 delivery/sourceNotverified acceptance and backend/owner gates remain unchanged.
