version: 0.24.0
date: 2026-10-15
prompt: docs/prompts/0064-studio-photography.md
intent: Apply the supplied studio photography after the timetable update
decision: Add an opt-in photography preview; preserve Latest and Archive
rejected: Replacing the live default before the photo preview is reviewed
files: src/modules/website/**, src/components/molecule/SiteVersionSelect/**, public/images/studio-2026/**, scripts/test-photography-ui.mjs

# 0064 — Studio photography preview

Adds an opt-in `version=photos` website preview from the supplied studio photographs: split-layout group hero, movement/philosophy image, seven named teacher portraits, facilities gallery, and plans/booking imagery. Latest remains the default. Archive remains intact. Explicit teacher/CMS photographs retain priority. Unknown portraits are not assigned; no class or person is inferred from appearance.

Selected originals were converted to responsive WebP, metadata stripped, with original Drive files untouched. No low-resolution screenshot is enlarged. QA covers image decoding, phone/tablet/desktop overflow, no old concept-video replacement, navigation, version switching, reload, and unchanged default edition. The owner-approved 30 QA captures are published with the page documentation after visual inspection.

Release verification also exposed a clock-dependent demo waitlist fixture after the last class of the day. It now falls back to the next upcoming session, with frozen-clock regression checks across weekdays, weekends, and late evenings; public timetable content is unchanged.
