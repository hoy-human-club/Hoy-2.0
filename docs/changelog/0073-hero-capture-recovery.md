version: 0.25.0
date: 2026-10-21
prompt: docs/prompts/0073-hero-capture-recovery.md
intent: Complete PR44 against current main with truthful screenshot evidence.
decision: Reset English/light storage and assert document language/theme for every capture; regenerate the 19-case report.
rejected: Merging stale package metadata or treating historical CI as current-head verification.
files: scripts/test-studio-hero.mjs; docs/screenshots/W-01/studio-*; docs/pages/W-01.md; docs/kanban.md; docs/prompts/0073-hero-capture-recovery.md

# W-01 capture release receipt

Source baseline and rollback: `6354f5978baa5689c22d15a411433575d609d8a5` (v0.25.0, PR50 already released). This QA-only change preserves package metadata and release provenance generation.

Regenerated [344](../screenshots/W-01/studio-latest-en-344.jpg), [768](../screenshots/W-01/studio-latest-en-768.jpg), [3840](../screenshots/W-01/studio-latest-en-3840.jpg) English/light captures and [19-case report](../screenshots/W-01/studio-hero-qa.json). Existing historical misleading images remain available from the rollback commit.

Verification: local production build, fresh/cached clock regressions, nine sample routes and all 19 hero cases passed. Tablet capture visually inspected. Remaining photography/cached-navigation and exact-head CI pending. Merge and exact deployment evidence will be appended after checks complete. No runtime website change or private upload.
