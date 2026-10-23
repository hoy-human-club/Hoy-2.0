# Prompt — schedule, booking detail and customer support

Date: 2026-10-23

## Request (verbatim delegation)

Continue requested HOY MVP frontend implementation in imagine-os/hoy. Own a narrowly disjoint batch: RS-01 schedule day/week/method filters and availability states, RS-08 booking detail payment status/directions, RS-13 customer support content. Start from latest main (PR78 merged at94fe5259ba03519931afd7ce1b96abf31c9e5672; verify current). Read repository instructions and relevant .agents/skills. Inspect current implementation, fix genuine gaps rather than duplicate existing work. Source sheet https://docs.google.com/spreadsheets/d/19SWDF957P55Iw5QEPyVtoPDS50-eor0k76djVv1YyNU/edit . Criteria: customers see classes by day/week, filter method, see spots; booking detail date/time/room/teacher/payment pending-confirmed-released/directions; correct club rules/FAQ/teachers/directions. Test empty/error/started/full/inactive/missing booking at390/1280, ES/EN, timezone boundaries. No real backend, auth, notifications or customer data, fictional fixtures only. Preserve approved no-refunds and consent guards. Don't edit central provider/schema/auth or payment/voucher-owned components; propose needed shared interfaces separately. Public website owner branchcodex/public-content-launch-20261023 is unreleased and owns website public content/launch redirects. VoucherPR79 is in integration; paymentbranchcodex/payments-mvp-20261023 is held for PR approval. Integration owner01a165c4-48d8-717d-930c-99f658dec031 coordinates all merges. Save dedicated source/tests on unique branch, prepare draft PR only if permitted, no independent merge. Report actual row-level evidence and remaining gaps, don't claim fullrows done merely based on partial slices. Report exact denial/pending/uncertain outcome if blocked; don't bypass denials or duplicate uncertain actions.

Transcript evidence:
User: "Everything marked MVP needs full verified properly perfectly built front end. the features not due as MVP can be focused on UI Only. Unless they have ui on the front end portions that will go live, then they need to work proper."
User: "I really think you need to get better at running things in parallel. Maybe you need to be doing this on LLM Codex, or BMM Codex, cloud sessions, not local, and managing more than a couple sessions at a time."

## Response

Scoped customer read handling, empty support states, inactive teacher deep-link protection, exact linked payment display and configured booking directions; independent fixtures/tests and row-specific handoff. Shared data/provider/auth/payment/voucher/public content not changed. Full-row acceptance, authoritative payment-release lifecycle, live capacity and approved FAQ payment wording remain separate integration work.
