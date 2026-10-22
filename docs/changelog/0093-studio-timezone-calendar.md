# 0093 — Studio timezone calendars and display

version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

- Prompt intent: advance PL-09 using America/Bogota across device zones while retaining calendar labels, historical timestamps, purchased terms, the source timetable and whole-peso formatting.
- Decision: explicit studio parts/wall-clock helpers and coordinated dependent-calendar migration; legacy cache metadata migration preserves stored rows before the existing daily demo-reset policy resumes using studio dates. Shared calendars, operational date readers/inputs and new fictional generation use the studio zone.
- Alternative rejected: formatter-only patch that misplaces calendar cells; fixed current UTC offset for historical timestamps; blanket reseed/version bump; guessing offsetless persisted timestamp meaning; rewriting purchased terms or changing hours, schedules, policies or prices.
- Files: i18n formatter, tenant timezone reference, shared calendars/room grid/date strip and existing metadata demos, operational date readers and explicit wall-clock inputs, portable subscription validation clock with a HOY adapter, analytics/payroll/expenses/recurrence, fictional provider/seed generation, focused timezone/cache/rendered tests, representative page evidence and batch17 receipt. Vite gets the same worktree-local cache directory as the integration branch to prevent shared-node_modules development cache collisions.
- Verification: optional host clock preserves portable UTC defaults across validate/read/save/import; actual HOY production editor passes UTC/Tokyo save/read/import before/exact05Z with original-record preservation. Final full build/strict TS and four-zone domain/cache matrices passed; production Chromium passed32 bilingual responsive schedule cases and52 captures, with precise source fingerprints and the ownership-only cleanup boundary recorded in batch17. Focused existing regressions also passed. No new UI states, components or raw spacing.
- Remaining: historical unlinked-lot attribution and offsetless stored datetimes retain original parsing ambiguity; server consistency and owner acceptance remain unverified. Frozen website archive unchanged. No PR, merge or deployment by this branch.
