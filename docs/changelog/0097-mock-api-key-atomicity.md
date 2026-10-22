version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# 0097 — fictional API key command atomicity

Intent: finish the unblocked D-07 engineering follow-ups from batch14 while preserving the disconnected real API and existing role/scope/expiry contracts.

Decision: stage mock create/rotate/revoke and audit together, validate malformed drafts explicitly, share immediate duplicate flights and retain safe metadata-only idempotency receipts. Reveal only first acknowledged current-command material, never a replay. Surface retry/cancel/uncertain acknowledgement honestly, and guard pending work on actor/tenant/target changes. Preserve numeric fractional expiry action semantics and existing UI options. Add a visible browser-only fictional issuance boundary and invalid local expiry diagnosis.

Rejected: independent writes that leave partial rows, persisting/replaying raw material, a provider-identity bypass, arbitrary expiry limits, production verification in the browser, or resolving admin's generic table-editor sensitive-column policy conflict by changing roles.

Touched: D-07 page/helper/strings/spec/page documentation, coordinated one-line MockProvider staged identity fix, focused domain and actual rendered QA scripts, batch20 receipts and fictional screenshots. No new component/variant/styles, dependency, schema or access policy. Version remains0.25.0; root owns global tracking and release version/checkpoint.

Validation and limitations: [batch20](../frontend-completion/batch-20.md), tracked `evidence/batch-20-api-key-*.json`. Real API acceptance remains Not verified / After Nov30. Root owns integrated final CI and deployment.
