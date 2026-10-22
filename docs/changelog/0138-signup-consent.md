# 0138 — Exact-version signup consent

date: 2026-10-22
version: 0.25.0

Fictional account registration now links to the exact published, effective terms and privacy versions being accepted. It records both document IDs, versions and a shared acceptance time in the existing legal-acceptance table, alongside the compatibility consent records. Published document changes clear the checkbox and require review again. Missing, ambiguous or unreadable documents block submission and offer retry.

The mock registration transaction rechecks document content before writing and commits the account, customer role, consent evidence and Activity receipt together. A committed retry retains its original versions and time even after publication changes. Acceptance records are append-only; the generic table editor exposes consent evidence as read-only. Public version links retain the requested published version and never substitute another document for an unknown ID.

Verification includes staged-write and storage-quota rollback, duplicate requests, publication rollover, same-version edits, missing/ambiguous documents, read failure and cancellation. Browser checks exercise the actual signup form, selected-class return, denied guest checkout/waitlist, exact document links and component states in English/Spanish, light/dark and mobile/desktop. The focused workflow retains the test artifacts. Real identity verification, authentication, durable server storage and message delivery remain separate integrations; this flow creates fictional browser accounts only.
