version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# CU-05 atomic own-profile save

Problem: C-19 wrote the profile and phone sequentially and could report success with a required row missing. A second write/storage failure could leave inconsistent details.

Change: a mock-only transaction validates the same editable fields, both tenant-scoped owned rows and their observed editable revision. It commits both changes and one safe hashed receipt, or preserves both original rows. Unchanged retries replay once; changed requests and stale editors conflict. A contained loader exposes missing/read errors with retry; the editor has an immediate save latch, busy fields and cancellation/unmount/account-context fencing. Birthday checks calendar validity without new age rules. Existing automatic locale failures are contained. Photo/verification/role/email/consent/payment behavior and CRM emergency-contact readership are untouched.

Validation: domain failure/rollback/quota/read/scoping/disconnected/retry/replay/conflict tests; rendered bilingual mobile/desktop light/dark, existing route roles, CRM supported readback and real-component delayed lifecycle states. Final full build and all three scripts passed. Immutable production5217 checked module fingerprint29ac614d5eab…; exact bundle and machine results are recorded in batch22. No real adapter or deployment acceptance; original Nov30 delivery phase and remaining CU05 access/backend criteria remain unresolved.
