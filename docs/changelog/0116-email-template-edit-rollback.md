version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# Existing template edits and rollback save one fictional version atomically

M-04 now freezes each existing template edit/rollback, validates fresh scoped source/history, and saves the template and its existing version audit together through MockProvider. Stale editors cannot overwrite a newer version, while unchanged retries verify the actual saved result without a duplicate version. Errors keep the draft for review; cancellation and context changes cannot produce late confirmation. Existing roles, editor fields, missing-English activation rule and literal historical rollback values remain unchanged. No email is sent.

Requirement NT-05 remains original Nov30 partial/unaccepted. This is a fictional browser safeguard; durable backend version history, server authorization, provider delivery and retention remain gates. See `docs/frontend-completion/batch-34.md` for actual baseline reproductions, tests, local QA/deployment limits and final passing immutable production/dev receipt. Domain, actual-hook16, typecheck, fullbuild and EN/ES390/1280lightdark/current-role production plus controlled dev fault matrices passed;42 fictional state images saved. Exact runtime a1e273db618c… remains unchanged; test-only Notice selector/framing corrections retain all assertions. Root owns release; this source is not claimed deployed.

Decision: use existing MockProvider atomic staging and immutable intent; preserve historical business audit/rollback semantics. Alternative rejected: separately retrying a template update and audit would retain the reproduced partial-write/stale-version defect.

Files: `src/modules/admin/{EmailsPage.tsx,strings.ts,emailEdit.ts,useEmailEdit.ts}`; `scripts/test-email-edit{,-hook,-ui,-states}.mjs`, `scripts/email-edit-harness.tsx`, `scripts/fixtures/email-edit-before.txt`; batch34/proof JSON and M-04 fictional captures. No new component or visual variant; existing Notice/Button/Field/editor library primitives are reused. Root records shared tracker/integration/release metadata.
