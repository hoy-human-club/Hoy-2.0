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

Verification: local production build, fresh/cached clock regressions, nine sample routes, all 19 hero cases, 30 photography cases and cached browser navigation passed. Tablet capture visually inspected.

Exact source head `53eefc14597270951ac1cd09469a38ca61469d69` passed [Photography QA39677413895](https://github.com/imagine-os/hoy/actions/runs/39677413895). [PR51](https://github.com/imagine-os/hoy/pull/51) merged as `8230e05e1436dbf7cad6bfeaca427397d9bc1a77`; superseded draft PR44 closed. [Pages39677829715](https://github.com/imagine-os/hoy/actions/runs/39677829715) passed build, deployment and hosted live Chromium verification, including exact `release.json` source SHA/version, live admin/public schedules and protected screenshot exclusion. Live: https://imagine-os.github.io/hoy/. No runtime website change or private upload.
