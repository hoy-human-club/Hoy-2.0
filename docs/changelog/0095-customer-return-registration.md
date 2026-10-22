version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# 0095 — Selected-class return and fictional registration

Intent: close SW-03/CU-01 chosen-class navigation loss and partial browser mock account creation without activating real auth or changing required fields/roles/legal policy.

Decision: shared validator for existing website customer destinations, preserved sign-in/sign-up interlinks and selected-class/mat return. Mock-only registration stages user/profile/customer role/two exact consents with a nonce and digest-only receipt; unchanged retry deduplicates, changed replay conflicts. Immediate submit guard, contained failure/retry, cancel/unmount prevent late session/navigation. Visible fictional-browser boundary; password stays out of command/digest/persistence. Existing noncustomer sign-in homes and Clerk disconnection remain.

Alternative rejected: trusting arbitrary slash-prefixed return values, sequential partial registration, persisting the form/password in audit receipts, changing account requirements or silently activating real signup.

Files: customer auth `customerReturn.ts`, `mockRegistration.ts`, SignInPage/SignUpPage; customer strings/specs; focused domain/UI/dev-state tests and harness; A-02/A-03 and batch18 evidence. No schema, SDK, credentials or access-policy changes.

Verification: domain, TypeScript, full build, final immutable production EN/ES390/1280 light/dark and dev async-state QA passed with zero page errors; exact checked-commit/release receipt remains the coordinator checkpoint in batch18. Source phases/status/acceptance remain unchanged; backend identity/email-code/legal version contracts remain pending.
