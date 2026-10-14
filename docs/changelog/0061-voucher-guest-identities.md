version: 0.24.0
date: 2026-10-14
prompt: docs/prompts/0061-voucher-guest-identities.md
intent: Allow distinct voucher guests sharing a display name.
decision: Match only namespaced user IDs and normalized emails, checking all supplied identifiers.
rejected: Names as identity or mandatory new guest contact collection.
files: src/data/vouchers.ts; scripts/test-vouchers.mjs; docs/kanban.md; docs/prompts/0061-voucher-guest-identities.md

# 0061 · Voucher guest identity matching

- Version: 0.24.0 patch
- Date: 2026-10-14
- Pages: M-13 / C-28
- Intent: fix false duplicate-guest rejection for unrelated people sharing a display name
- Decision: compare only namespaced user IDs and normalized emails, checking all supplied identifiers within a group and across active bookings
- Alternative rejected: requiring guest contact details or synthesizing identity from names; neither is needed for this sandbox correction
- Files: src/data/vouchers.ts, scripts/test-vouchers.mjs, docs/prompts/0061-voucher-guest-identities.md, docs/changelog/0061-voucher-guest-identities.md, docs/kanban.md
- Verification: regression coverage permits repeated names within and across bookings, including distinct emails; repeated user IDs and normalized emails remain rejected atomically, including mixed ID/email records
- Screenshots: existing M-13/C-28 captures remain representative; no rendering, layout or copy changes
- Boundary: no production backend, permissions, additional personal data collection or live delivery changes
