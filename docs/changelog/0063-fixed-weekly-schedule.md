version: 0.24.0 patch
date: 2026-10-15
prompt: docs/prompts/0063-fixed-weekly-schedule.md
intent: Reflect the supplied class timetable while the studio resolves conflicting evening assignments.
decision: Use Horario fijo provisionally, with a typed 30-slot fixture and public instructor names only.
rejected: Importing compensation/private availability; conflating Andrea with Andre; inferring reception hours from class times.
files: src/data/seed/timetable.ts; src/data/seed/upgradeTimetable.ts; src/data/seed/catalog.ts; src/data/seed/index.ts; src/data/MockProvider.ts; src/tenant/tenant.ts; src/tenant/pricing.ts; src/modules/admin/settings.ts; src/modules/admin/SettingsPage.tsx; src/modules/admin/strings.ts; src/modules/website/strings.ts; src/modules/website/jsonLd.ts; src/modules/ops-manual/strings.ts; scripts/test-timetable.mjs; scripts/test-timetable-ui.mjs; scripts/test-analytics.mjs; .github/workflows/timetable-qa.yml; docs/kanban.md; docs/data-model.md

# 0063 · Provisional weekly class timetable

- Pages: W-04, W-05, W-06, C-03, M-02, M-08a
- 30 weekly classes: five each weekday, three Saturday, two Sunday. Start times are :10.
- Monday evenings: Raghu, Híbrido / Power Yoga. Tuesday evenings: Jennifer Varela, Sólido / Dance Fitness. These four choices remain provisional, not a claim that the source disagreement is settled.
- Public profile additions: Andrea, Jennifer Varela, Clara Zuluaga and Leandro Valencia. Bios state assigned class families only. No inferred credentials, portraits, private availability or actual pay terms.
- “Andrea” and the existing “Andre Cardona” are separate records. Existing public profiles are retained, including people not assigned in this timetable.
- Capacity 16 and duration 60 minutes remain demo defaults. No live booking, payroll, database, message or payment operations.
- Default reception hours remain explicitly unconfirmed. Public footer/contact/app copy does not say Sunday is closed, and unconfirmed hours are omitted from JSON-LD. Saving reception hours in M-08a marks them confirmed, as explained by the form.
- Untouched legacy demo templates migrate in place. Staff-edited templates are left alone. Bookings, booked sessions, old attendance, pay settings and staff-written profiles survive; booked legacy sessions remain exceptions, not silently moved. Repeat loads do not duplicate timetable occurrences.
- Corrected the analytics test's assumption that a just-met current week must stay met after raising its target: completed weeks are preserved, while the current week is correctly regraded.

## Verification

Local focused checks: typecheck, timetable/migration, analytics, opening-hours, contacts and vouchers. Full local aggregate build was resource-killed; Chromium launch is restricted by the cloud execution sandbox. Hosted Timetable QA runs the full build and built-screen checks with 20 real captures: ES/EN at 390/1280, plus dark desktop for W-04, W-05, W-06 and C-03. Hosted timetable QA passed on fb89764d, including the full build, sample routes, all 20 captures and core tests. Timetable, Website preview (including static entry) and Voucher QA all passed on eca9067a.


## Real preview captures

Twenty built-demo captures were produced and reviewed: ES/EN at 390/1280 plus EN dark desktop for W-04, W-05, W-06 and C-03. They show simulated bookings and availability, not a live operational database. See the [verified QA run](https://github.com/imagine-os/hoy/actions/runs/38690365989). The approved public evidence set is stored under docs/screenshots/{W-04,W-05,W-06,C-03}/schedule-*.jpg and linked from each page document.

### Visual references

Existing repository baseline captures are retained; each page document links all five new capture variants.

- W-04: [prior repository baseline](../screenshots/W-04/es-1280.jpg) · [updated timetable](../screenshots/W-04/schedule-es-1280.jpg) · [all variants](../pages/W-04.md#provisional-timetable-qa--0063)
- W-05: [prior repository baseline](../screenshots/W-05/es-1280.jpg) · [updated timetable](../screenshots/W-05/schedule-es-1280.jpg) · [all variants](../pages/W-05.md#provisional-timetable-qa--0063)
- W-06: [prior repository baseline](../screenshots/W-06/es-1280.jpg) · [updated timetable](../screenshots/W-06/schedule-es-1280.jpg) · [all variants](../pages/W-06.md#provisional-timetable-qa--0063)
- C-03: [prior repository baseline](../screenshots/C-03/es-1280.jpg) · [updated timetable](../screenshots/C-03/schedule-es-1280.jpg) · [all variants](../pages/C-03.md#provisional-timetable-qa--0063)
