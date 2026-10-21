version: 0.25.0
date: 2026-10-21
prompt: docs/prompts/0079-clerk-development-contract.md
intent: Prepare the explicitly authorized Clerk development adapter and deterministic tests separately from live security integration.
decision: Pure disconnected observation boundary with explicit pending/email verification states, no roles/tokens/backend grant, and blocked production readiness. Existing demo auth remains the running provider.
rejected: Changing signup/security configuration, guessing production credentials/host, replacing the existing app, inferring email verification or backend authorization from frontend identity.
files: src/auth/clerkDevelopmentAdapter.ts; scripts/test-clerk-development-adapter.mjs; docs/frontend-completion/batch-05.md and manifest.

[Contract evidence and blockers](../frontend-completion/batch-05.md). No rendered auth changes or actual account operations.
