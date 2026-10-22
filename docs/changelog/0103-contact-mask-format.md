version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# Mask accepted contact formats on existing shared views

Intent: repair space-formatted contacts passing through the existing staff masking regex unchanged, without changing stored values or authorized readership.

Decision: extract a pure display helper, retain the `people.ts` export/import contract and existing contiguous output, recognize common dial separators, and return the existing em dash for short/malformed/unrecognized text/extensions. No raw fallback, data join, search/editor/role/permission change or new UI component/state.

Alternative rejected: passing through unsupported text, silently rewriting contacts, guessing country codes, changing who sees full contacts or describing UI obscuring as server authorization.

Files: src/modules/staff/{people.ts,maskPhone.ts}; scripts/test-contact-mask{,-ui}.mjs; docs/frontend-completion/batch-25.md; masked-only M-06/S-04 capture variants/results. Shared manifest/kanban/metadata remain coordinator-owned.

Evidence: pure compatibility/format/search/source-value regressions, TypeScript and frozen full build passed. Before/after runtime fingerprint `0e4a7cc2511f2a1d5981aa15c5980ea36fae9b0b72b223ab3632b0f10e593740` unchanged; immutable5225 all8 EN/ES390/1280light/dark matrices and existing role checks passed, zero page errors, all40 masked-only captures visually sampled. Exact local evidence is in batch25; checked commit/CI/deployment remain root-owned and pending. Direct rendered source context AD-07/RC-05 (MVP Oct 30); related original phases and all acceptance statuses are unchanged. This narrow display repair does not establish privacy or backend acceptance.
