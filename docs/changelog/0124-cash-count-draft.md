version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# PG12 fictional local daily count draft

Intent: progress the dependency-safe count/preview frontend while daily-close accounting and confirmation rules remain unresolved.

Decision: reuse S04's existing payments.write guard and exact own taken_by references, with independent created_at/paid_at day attribution and amount/amount_paid groups. Keep neutral counts in a scoped browser-only draft with explicit preview/save/cancel/discard, strict immutable revision/replay/current-effect and uncertain acknowledgement guards. All expected/net/reconciled/closed totals remain withheld; no provider writes or customer/expense joins.

Alternative rejected: treating all cards as terminal, pending amount_paid as settlement, substituting missing timestamps, defaulting missing money to zero, exposing Finance/expenses to Reception, netting refunds or cash outflows, or marking a local draft as an actual close. No role/policy/schema/backend changes.

Files: private staff cash-count domain, DailyCountDraft shared presentation/controller/meta, small S04 insertion, bilingual staff strings, focused domain/rendered/dev/library tests and source audit/batch40/S04 evidence. Parent owns global metadata/Git/CI/release.

Verification: historical domain/TypeScript pass before latest reference-ack hardening; exact current-source reruns plus frozen build/rendered/CI/deployment gates pending until exact evidence is recorded. Original PG12 Nov 30 delivery / High criterion remains Not verified and unaccepted.
