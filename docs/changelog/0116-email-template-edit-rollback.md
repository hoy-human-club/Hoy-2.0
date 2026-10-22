version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# Existing template edits and rollback save one fictional version atomically

M-04 now freezes each existing template edit/rollback, validates fresh scoped source/history, and saves the template and its existing version audit together through MockProvider. Stale editors cannot overwrite a newer version, while unchanged retries verify the actual saved result without a duplicate version. Errors keep the draft for review; cancellation and context changes cannot produce late confirmation. Existing roles, editor fields, missing-English activation rule and literal historical rollback values remain unchanged. No email is sent.

Requirement NT-05 remains original Nov30 partial/unaccepted. This is a fictional browser safeguard; durable backend version history, server authorization, provider delivery and retention remain gates. See `docs/frontend-completion/batch-34.md` for actual baseline reproductions, tests, local QA/deployment limits and pending rendered receipt. Root owns release; this source is not claimed deployed.
