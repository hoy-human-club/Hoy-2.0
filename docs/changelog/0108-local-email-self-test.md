version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# NT-05 atomic local email self-test

M-04 previously wrote a message marked sent before its audit, without a provider, busy guard or contained read errors. The bounded self-test now previews the saved template/version and selected preview locale for the current account only, then atomically records an explicitly local simulation. It rejects disconnected adapters, stale/missing/foreign rows and conflicting requests. Unchanged retries replay once; cancellation/context changes fence pending writes and late callbacks. Audit receipts retain safe IDs/status and hashes without recipient/body copies. Existing template save/rollback and generic comms remain outside scope.

Domain tests cover both staged writes, quota/read failure, rollback/retry/replay/concurrency, scoping/roles, frozen locale/version and cancellation. Final full build, domain and production/dev lifecycle rendered matrices all passed; exact immutable build evidence is recorded in batch28. Visual QA additionally fixed M04 mobile grid overflow and inherited dark-theme paper text, retaining strict fit and adding a minimum4.5 contrast assertion. NT05 remains partial in its original Nov30 phase; this does not establish real email delivery, backend authorization or commercial acceptance. MVP clarification: docs/frontend-completion/source-reconciliation-2026-10-22.md.

Decision: keep the existing sent schema as an unmistakably labeled local simulation, and use one mock-only transaction. Alternative rejected: reusing generic comms would silently broaden the differing members.write contract and still lack atomic audit recording. No dependency, schema or access-policy change. Files: EmailsPage.tsx, emailTest.ts/useEmailTest.ts/emailTest.css, admin strings, three test scripts plus dev harness, M-04 page/evidence and batch28. Parent reconciles shared component/spec/kanban metadata in integration.
