# 0094 — Isolated Vite worktree caches

version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

Parallel authorized repository worktrees share installed packages. Vite previously placed optimized dependencies beneath that shared node_modules directory, so one worktree could invalidate another worktree's dev imports during rendered QA. Keep the cache under each repository's ignored `.vite` directory instead. This changes development cache placement only; no application data, roles, access policy or vendor configuration changes.

Verification: full build and final rendered control-contract QA; dev-only ownership/loading harness reruns against a fresh server. Exact-head CI and deployment receipts live in the completion index. No new test duplicates this one configuration setting.
