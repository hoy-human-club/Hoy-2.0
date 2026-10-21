version: 0.25.0
date: 2026-10-21
prompt: docs/prompts/0075-promotion-recovery.md
intent: Finish preserved Hub promotion practice and reception confirmation safely against current main.
decision: Recover PR34 on PR52; use M-15 for promotion results and preserve current role routes, data migration, Content, schedule and pay rules.
rejected: Merging stale v0.25.0 metadata over the current release, duplicate M-14 identifiers, replacing cached sample repairs, real outreach/bookings/payments or backend changes.
files: src/modules/promotions*; src/components/organism/PromotionPractice; src/components/molecule/CheckboxField; src/modules/vouchers; src/data/{promotions,vouchers,MockProvider,schema,types}.ts; src/hub; scripts/test-promotion*; generated schema draft and docs; workflow

# Promotion practice release receipt

Baseline and rollback: `c7171fe9613b30061e33f9b17b36fbf362a5c5f5` (v0.25.0, checked PR52). This release preserves package version and source-SHA provenance.

HUB-01/P-02: direct bilingual guide and isolated sequential practice available to all 11 roles without identity/storage changes. S-07/C-29: teachers create unique invitation codes for approved fictional offers; public previews omit private context; each test customer gets a separate claim retaining first-promoter attribution. Copy/native handoff is distinguished from delivery; no real messages are sent. S-08: reception verifies code/full-link, holder and guests; eligible walk-up booking, separate confirmation, then attendance without second debit. M-15: campaign/promoter results.

M-14/M-14a remain the released Class Schedule/private pay pages; promotion results have a distinct spec and screenshots. Current community sidebar grouping and PR50 provider commands remain intact. Promotion-table migration preserves existing voucher balances, Content edits, private photo references and pay rules. Failed promotion persistence rolls back both share and audit rows. Supabase/schema.sql is an unapplied generated draft; new tables retain default deny and uniqueness declarations. No backend credentials, settings or live permission changes.

Historical build failure identified: website run38655956049 and voucher run38655956042 passed their browser checks, then hub-map rejected six missing-shot requirements (promotion experience/P-02 and S-07/C-29/old-M-14/S-08). Fresh fictional captures and P-02 thumbnails are now committed, with results moved to M-15; no weakening of screenshot/build checks.

Local checks passed: full production build/TypeScript/spacing/manual lint; promotion/voucher domain suites and voucher lifecycle; reception capacity/guest eligibility; UTC/Bogotá midday/evening/Sunday sample fixtures; same-day migration preservation of Content/private-photo/pay/voucher edits and failed-persist rollback; protected capture policy; Content batch and pay-provider regressions; website current/archive/Coming Soon flows; all-role guide and view-as/route guards; production-bundle sidebar behavior. Updated post-deploy checker passed locally against the production bundle, including isolated practice with zero provider writes, photo chooser and reception unavailable-code state. The public guide mobile capture was visually inspected. Final production-bundle promotion lifecycle, all-role practice guide and all ten Hub sample routes also passed. First current-head Session Availability CI exposed a stale capacity-test actor ID (`capacity-admin`) absent from the seeded users; the integrated voucher command correctly rejects it. The fixture now uses existing `usr_admin`, retaining identity validation and all capacity assertions. Exact-head hosted CI and deployment verification pending.

Captures: [public guide ES390](../screenshots/P-02/es-390.jpg), [public guide EN1280](../screenshots/P-02/en-1280.jpg), [teacher EN390](../screenshots/S-07/en-390.jpg), [reception ES1280](../screenshots/S-08/es-1280.jpg), [promotion results EN1280](../screenshots/M-15/en-1280.jpg). Captures contain only new-context fictional fixtures. Existing protected scheduling/pay screenshots remain excluded from publication.

Production remains disconnected: authenticated transactional authorization, cross-device claims, recipient verification, capacity concurrency, message delivery and real consent/payment integrations remain future backend prerequisites, not simulated completion. The unavailable newer settings candidate1306a59 remains unrecovered; exact preserved patch or original requirements are needed.
