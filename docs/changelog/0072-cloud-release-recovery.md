version: 0.25.0
date: 2026-10-21
prompt: docs/prompts/0072-cloud-release-recovery.md
intent: Finish unambiguous preserved scheduling feedback and verify the release.
decision: Integrate PR38 and PR40 against main 4c90a67; retain existing draft/publication and access controls.
rejected: Guessing newer unpreserved settings changes, rewriting historical pay/bookings, or publishing protected-screen captures.
files: scheduling/content command and UI files; domain/browser tests; build capture policy; package metadata; docs

# Cloud recovery and release

The repository is imagine-os/hoy, originally package 0.24.5 at `4c90a67fe553f6fc27722e8c47fa35c3b5cd95cb`. PR38 preserves the inactive-calendar/capacity request. PR40 preserves Class Schedule, Content batch preview/apply/undo, visible recurrence, 50-minute defaults for new classes, per-date themes/descriptions and explicit prospective pay rules. Their prompt logs retain the original user requests. Existing edited templates, booked dates, reception-hour confirmation and historical payroll remain intact.

Integration fixes: valid changelog build metadata; current-main media/sample-clock behavior retained; customer calendars disable inactive classes while Admin can inspect read-only history; displayed session duration follows its dated start/end. Capacity regression now checks both the stronger edit guard and preservation of older stored bookings. Protected M-14/M-14a captures remain local and are excluded from the public hub-map publication plan even if present on disk. No private image uploads or social-library content are added.

Newer settings/default choices cannot be established from this checkout. The preserved local checkpoint is not in the cloud object store or remote refs. It has not been accessed, discarded, replaced or claimed recovered. The old work/settings branch is already contained in main. PR34, PR39 and PR44 remain separate preserved workstreams; this release does not claim their completion.

## Verification and release status

Local checks passed: aggregate production build (including TypeScript), spacing/manual lint, content batch, provider rollback/migration, recurrence/editorial/pay rules, capacity and private capture policy; date/holiday/hours/contact/analytics/voucher/subscription/timetable/mat/cache/media-access regressions. Cloud Chromium passed calendar/list/table, bulk preview/apply/undo/cancel, new duration/pay defaults, explicit publication and recurrence generation, attendance-basis validation and revision saving, one-date theme in the customer view with template preservation, marketing restrictions, bilingual 390/1280 layout checks, inactive calendar/waitlist transitions, 30-slot timetable and subscription UI. Nine sample routes resolved. No private screenshots are committed. Only the public synthetic W-04 availability captures are included.

PR and deployment evidence will be recorded in the release receipt after remote checks. The build now emits a minimal release.json containing package version and source SHA. Post-deployment QA asserts both against the workflow commit, checks released scheduling routes and capture exclusions, then opens admin/public schedules. Direct public Pages access from this cloud network returns HTTP 403; hosted post-deployment browser verification remains the live check. Browser-local demo only; production booking/payment/compensation backend remains disconnected.

**Resumen (ES).** Se recuperan las solicitudes guardadas de horario y edición de contenido. No se inventan ajustes faltantes ni se publican capturas privadas.
