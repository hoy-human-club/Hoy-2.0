version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# Unified fictional pending-payment queue

PG-05 (original MVP Oct30): S-09 now includes pending manual/provider payments without receipts alongside existing receipt requests, with tenant-scoped customer/product/amount/method/date/receipt visibility and explicit unknowns. Receipt-linked payments are deduplicated; receipt review remains unchanged. New `?payment=` details are read-only; `?receipt=` remains supported. Four dependent reads share contained loading/failure/retry and refresh subscriptions.

No timer/hold/approval/booking/grant is inferred from a missing receipt. Countdown policy, backend authorization/realtime and private cross-device storage remain unresolved. This is fictional browser-local frontend progress, not source acceptance. See [batch15](../frontend-completion/batch-15.md) for tests, captures and coordinator release receipt.
