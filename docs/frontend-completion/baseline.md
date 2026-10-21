# Frontend baseline inventory

Baseline: `2d402751c5bee899d5adab62837d2b0e7e313025`, package v0.25.0, remote main fetched 2026-10-21. Coordinator owns integration; this inventory is a read-only source audit. No backend, credentials, permissions or production-data mutations.

**Resumen (ES):** 120 rutas y 103 códigos de página registrados. Los indicadores «built» no prueban aceptación; la verificación funcional, móvil/escritorio y de estados se registra por separado en el manifiesto de funcionalidades.

## Evidence and status meaning

The runtime manifest was read from a newly started local Vite app via `window.__hoyos.routes`; it has **120 routes, 103 distinct page codes, 0 declared stubs**. Its seven surfaces: admin 33, public 25, customer 34, dev 10, docs 6, teacher 5, staff 7. The full route list is below and the machine-readable snapshot is [routes.json](routes.json).

- **Implemented (source):** concrete render/logic path exists. This is a source finding, never acceptance.
- **Partial (source):** some intended frontend behavior exists, with an identified gap or a simulated external boundary.
- **Absent (source):** the specific requirement has no identified UI/logic path after reading the relevant module. This does not mean its whole module is absent.
- **Unverified:** required behavior, state, viewport or role has not been exercised freshly. This is the default for every route in this baseline snapshot.

`src/app/manifest.ts` marks a route built when its element is not directly a `PageStub`; it does not execute its screen. `src/specs/types.ts:specCompleteness` scores nonempty spec fields. Neither establishes the workbook's acceptance criteria. Historical screenshots, changelog claims and spec `checkedAt` are source evidence only, not fresh acceptance results. Most lazy wrappers cannot establish that all internal branches are complete.

No `AGENTS.md` was found in the repository/workspace ancestor search. [CLAUDE.md](../../CLAUDE.md), [ROADMAP.md](../../ROADMAP.md), [architecture](../architecture.md), and [documentation rules](../rules/documentation.md) provide the repository workflow and historical acceptance guidance. New workbook phases remain authoritative for this program; old roadmap phase labels must not silently overwrite them.

## Reusable UI and logic

`src/design/library.ts` collects **102 component metadata entries**: 11 atoms, 52 molecules, 35 organisms and 4 templates (source files under `src/components/**/*.meta.ts`). Examples used throughout the actual flows:

| Layer | Reused components | Source and responsibility |
| --- | --- | --- |
| Atoms | Button, Input/Select, Badge, Chip, Avatar, Icon, Skeleton, Toggle | `src/components/atom/`; control, display and basic loading states; strings through i18n |
| Molecules | Field, EmptyState, Notice, OrderSummary, StatTile, CheckboxField, RoleSwitcher, ClassRow | `src/components/molecule/`; validation presentation, error/empty/loading presentation, metrics and compact rows |
| Organisms | DataTable, CalendarView, TimelineView, MatPicker, RoomDayGrid, MediaLibrary, SharedImageField, PromotionPractice, MessageThread, MessageComposer, LegalDocument | `src/components/organism/`; shared interactive flows, schedule and content boundaries |
| Templates | AppShell, DesktopShell, ComingSoonLanding, PageStub | `src/components/template/`; responsive shells, launch landing, explicit placeholder |

Module route registration is `src/modules/*/index.ts` collected by `src/app/registry.ts`. Each route carries its spec, role list and surface; page code is not a stable workbook feature ID. `src/app/shells.tsx` selects shells; AppShell uses the 900 px responsive switch. Bilingual copy comes from module strings through `src/i18n`. `src/tenant/tenant.ts` and `pricing.ts` own studio facts and static launch prices.

Frontend logic seams: `src/data/packages.ts` computes ledger package balance/freeze/expiry; `mats.ts` + `sessionAvailability.ts` handle class availability; `classRecurrence.ts`, `sessionEditorial.ts`, `contentBatch.ts`, `classPayRules.ts` handle schedule/content/pay-rule commands; `vouchers.ts` + `promotions.ts` implement isolated demo benefit/claim workflows; `analytics.ts`, `expenseCalc.ts`, `payrollCalc.ts`, `subscriptionExpenses.ts` provide metrics and finance calculations. None establishes real server delivery, concurrency or authorization.

## Source findings and requirement gaps

| Feature IDs / area | Source state | Evidence and exact limit |
| --- | --- | --- |
| SW-01, RS-01, AD-01 website/schedule | Implemented UI; unverified acceptance | Website, customer schedule and classSchedule modules have concrete routes and components. Schedule/capacity commands have dedicated tests listed below. Content draft/save/publish behavior must remain explicit. |
| AD-07 customer list/balance (HALL-2) | Partial at baseline | `admin/CrmPage.tsx` displays `Person.plan` from `staff/people.ts` legacy membership join. Customer `useEntitlements()` reads `class_ledger` through `packages.ts`; these paths disagree. CRM lacks visible remaining/expiry/voucher columns at baseline. Coordinator's first independent repair batch targets this. |
| PR-01, PR-02 configurable product master/date-effective prices | Absent specialized UI; partial static catalog | `tenant/pricing.ts` is the static price source; `PlanRow` in `data/schema.ts` has price and validity_days, no effective start/end price dates. Generic table manager exists; no dedicated product master route is registered. Requires frontend design/data contract; do not invent confirmed prices. |
| CU-03 email-code/Google sign-in | Partial | `customer/auth/SignInPage.tsx` offers demo actor selection and accepts nonempty password for seeded email. It is explicitly demo authentication; no real email-code/Google backend. New specified frontend flow still needs reconciliation. |
| PG-01..PG-06 transfer receipt, pending payment queue and timed hold | Partial; specified flow unverified | `customer/pages/CheckoutPage.tsx` uses existing methods/recordPayment and mock pending statuses; `staff/RegisterPage.tsx` records simulated sales. No dedicated receipt-review/pending-payment route exists in inventory. Exact hold semantics PC-01/PC-02 remain decisions. |
| PF-03 teacher substitute request | Partial simulated flow, not absent | `teacher/HomePage.tsx:requestSub` writes `substitution.request` audit and a queued team-only `message_log` entry to coordinator. Delivery to Administration is unverified; no real WhatsApp send is implemented. |
| RS-15 events | Implemented UI, partial specified lifecycle | `admin/EventsAdminPage.tsx` has draft/publish/edit + RSVP list; customer EventPage exists. Event waitlist/attendance requirements need dedicated validation; older ROADMAP P1 gap claims are not assumed current. |
| OT-03 report a problem | Partial placeholder UI; absent submission flow | `hub/HubPage.tsx` wraps its report Button in `Placeholder`; no report submission screen/handler is identified. Needs fictional frontend report fixture with screen/user context and backend contract. |
| PL-02, PL-04 backend persistence/security | Absent backend integration; existing client demo | `DataContext.tsx` constructs `MockProvider`; `SupabaseProvider.ts` throws notReady for CRUD. Client RequireRole and permissions are demo UI controls, never server security. No scope to alter role permissions in this batch. |
| All asynchronous lists/rows | Partial error states | `DataContext.tsx:useTable/useRow` subscribes and resolves reads but has no catch/error/retry return path. Existing EmptyState component can show errors; shared data-hook failure support is not implemented. Existing mock synchronous peek hides most loading paths. |
| MK-01 / Content photos | Implemented local frontend; persistence blocked | `SharedImageField`, MediaLibrary and `localMediaStore.ts` provide catalog and private browser-local image selection. Cross-device durable storage remains issue #54, open; preserve drafts/publication boundaries and label local persistence clearly. |
| PG-13..PG-15, IN-01..IN-04 integrations | Partial future prototypes | Current payment, API-key and integration configuration screens are mock contracts. `SupabaseProvider`, integrationDefs and customer payments distinguish absent vendors. Keep After Nov 30 scope and never present prototypes as launch transactions. |

## Existing tests and verification coverage

These are **test files found at baseline**, not results of a fresh run. The coordinator's per-batch receipt records actual commands, outcome and screenshots. File names map to the implemented flows, and several tests include browser screenshots/assertions; passing one does not certify unrelated workbook rows.

| Flow | Existing domain/provider tests | Existing browser/route checks |
| --- | --- | --- |
| Dates, holidays, reception hours, contacts | `test-date-keys.mjs`, `test-holidays.mjs`, `test-hours.mjs`, `test-contacts.mjs` | Fresh Colombia timezone and actual screens still required |
| Schedule/availability/capacity/mats | `test-timetable.mjs`, `test-session-availability.mjs`, `test-class-capacity.mjs`, `test-mat-bookings.mjs`, `test-class-management.mjs`, `test-class-management-provider.mjs`, `test-class-pay-rules.mjs` | `test-timetable-ui.mjs`, `test-session-availability-ui.mjs`, `test-class-management-ui.mjs` |
| Demo dates and sample route fixtures | `test-sample-clock.mjs`, `test-cached-sample-clock.mjs`, `test-seed-samples.mjs` | `test-cached-sample-ui.mjs`, `check-sample-routes.mjs` |
| Content/editor/media/photos | `test-content-batch.mjs`, `test-media-model.mjs`, `test-media-access.mjs`, `test-private-capture-policy.mjs` | `test-media-library.mjs`, `test-media-access-ui.mjs`, `test-media-picker.mjs`, `test-content-photo-picker.mjs`, `test-photography-ui.mjs`, `test-studio-hero.mjs` |
| Vouchers/promotions | `test-vouchers.mjs`, `test-promotions.mjs` | `test-voucher-ui.mjs`, `test-promotion-ui.mjs`, `test-promotion-desk.mjs`, `test-promotions-guide.mjs` |
| Expenses/subscriptions/service directory | `test-subscriptions.mjs`, `test-subscription-expenses.mjs` | `test-subscriptions-ui.mjs`, `test-service-catalog-ui.mjs`, `test-subscriptions-live.mjs` |
| Analytics | `test-analytics.mjs` | No dedicated Dashboard-vs-Analytics-vs-CRM acceptance comparison test identified at baseline |
| Public entry/sidebar/website | No separate domain suite | `test-public-entry.mjs`, `test-clean-hub.mjs`, `test-sidebar-groups.mjs`, `test-website-preview.mjs` |
| Manual and all-route smoke | `manual-lint.mjs` | `manual-qa.mjs`, `screenshots.mjs --smoke`; smoke exercises render/console failures, not acceptance semantics |
| Account/profile/consent, email OTP, transfer receipt review, product effective pricing, report issue | No dedicated acceptance suite identified | Must be added/exercised per implemented frontend batch; real delivery stays backend-owned |

Tests live under `scripts/`. `npm run build` includes TypeScript and generator/lint checks, but does not run all domain or browser suites. `.github/workflows/pages.yml` builds and deploys main, then runs `test-subscriptions-live.mjs` for source-SHA provenance and selected current demo flows. PR workflows cover named feature areas with path filters. Deployment success does not imply all 124 acceptance rows passed.

## Route and role snapshot

Every row below has **fresh verification status: unverified** in this baseline. `sourceDeclaredStatus` in routes.json preserves the separate built/stub claim. Runtime role arrays are preserved exactly; `SessionProvider.hasRole` can allow super-admin behavior beyond those literal arrays. Do not infer production authorization from this table. Parameters are route templates; actual sample links must resolve fictional seeded IDs during verification.

| Route template | Page | Surface | Literal allowed roles | Source route module |
| --- | --- | --- | --- | --- |
| `/admin/finance/subscriptions` | M-09d | admin | super_admin, admin, finance | `src/modules/admin/index.ts` |
| `/admin` | M-01 | admin | super_admin, admin, coordinator, finance | `src/modules/admin/index.ts` |
| `/admin/analytics` | M-12 | admin | super_admin, admin, coordinator, finance | `src/modules/admin/index.ts` |
| `/admin/content` | M-02 | admin | super_admin, admin, coordinator, marketing | `src/modules/admin/index.ts` |
| `/admin/content/articles` | M-02a | admin | super_admin, admin, coordinator, marketing | `src/modules/admin/index.ts` |
| `/admin/content/faq` | M-02b | admin | super_admin, admin, coordinator, marketing | `src/modules/admin/index.ts` |
| `/admin/content/events` | M-02c | admin | super_admin, admin, coordinator, marketing | `src/modules/admin/index.ts` |
| `/admin/content/media` | M-02d | admin | super_admin, admin, coordinator, marketing | `src/modules/admin/index.ts` |
| `/admin/tables` | M-03 | admin | super_admin, finance, developer | `src/modules/admin/index.ts` |
| `/admin/tables/:table` | M-03 | admin | super_admin, finance, developer | `src/modules/admin/index.ts` |
| `/admin/emails` | M-04 | admin | super_admin, admin, coordinator, marketing | `src/modules/admin/index.ts` |
| `/admin/whatsapp` | M-05 | admin | super_admin, admin, coordinator, marketing, front_desk | `src/modules/admin/index.ts` |
| `/admin/crm` | M-06 | admin | super_admin, admin, coordinator, front_desk, finance, marketing | `src/modules/admin/index.ts` |
| `/admin/crm/deletions` | M-11 | admin | super_admin, admin | `src/modules/admin/index.ts` |
| `/admin/crm/:id` | M-06 | admin | super_admin, admin, coordinator, front_desk, finance, marketing | `src/modules/admin/index.ts` |
| `/admin/activity` | M-07 | admin | super_admin, admin, coordinator, finance | `src/modules/admin/index.ts` |
| `/admin/settings` | M-08a | admin | super_admin, admin, coordinator, finance | `src/modules/admin/index.ts` |
| `/admin/settings/hours` | M-08g | admin | super_admin, admin, coordinator | `src/modules/admin/index.ts` |
| `/admin/settings/features` | M-08b | admin | super_admin, admin, coordinator, finance | `src/modules/admin/index.ts` |
| `/admin/settings/payments` | M-08c | admin | super_admin, admin, finance | `src/modules/admin/index.ts` |
| `/admin/settings/communications` | M-08d | admin | super_admin, admin, coordinator | `src/modules/admin/index.ts` |
| `/admin/settings/branding` | M-08e | admin | super_admin, admin | `src/modules/admin/index.ts` |
| `/admin/settings/content` | M-08f | admin | super_admin, admin, coordinator | `src/modules/admin/index.ts` |
| `/admin/integrations` | M-10 | admin | super_admin, admin | `src/modules/admin/index.ts` |
| `/admin/integrations/google-business` | M-10a | admin | super_admin, admin | `src/modules/admin/index.ts` |
| `/admin/finance` | M-09 | admin | super_admin, admin, finance | `src/modules/admin/index.ts` |
| `/admin/finance/payouts` | M-09a | admin | super_admin, admin, finance | `src/modules/admin/index.ts` |
| `/admin/finance/payouts/:id` | M-09b | admin | super_admin, admin, finance | `src/modules/admin/index.ts` |
| `/admin/finance/expenses` | M-09c | admin | super_admin, admin, finance | `src/modules/admin/index.ts` |
| `/admin/class-pay` | M-14a | admin | super_admin, admin, finance | `src/modules/classSchedule/index.ts` |
| `/admin/class-schedule` | M-14 | admin | super_admin, admin | `src/modules/classSchedule/index.ts` |
| `/` | W-11 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/coming-soon/index.ts` |
| `/coming-soon` | W-11 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/coming-soon/index.ts` |
| `/app` | C-01 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/schedule` | C-02 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/schedule/week` | C-02b | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/class/:id` | C-03 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/checkout/:id` | C-04 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/payment-methods` | C-05 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/plans` | C-06 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/passes` | C-07 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/classes` | C-07b | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/booking/:id` | C-08 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/booking/:id/change` | C-08b | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/rate/:id` | C-10 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/history` | C-11 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/rules` | C-13 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/faq` | C-14 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/faq/2` | C-15 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/invite` | C-16 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/gift` | C-17 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/teachers` | C-18 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/teachers/:id` | C-18 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/profile` | C-19 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/waitlist/:id` | C-20 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/events` | C-23 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/events/:id` | C-23 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/notifications` | C-24 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/more` | C-25 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/account` | C-26 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/practice` | C-27 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/legal/:kind` | A-06 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/state/empty` | E-01 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/state/declined` | E-02 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/app/state/cancelled` | E-03 | customer | customer, teacher | `src/modules/customer/index.ts` |
| `/auth` | A-01 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/customer/index.ts` |
| `/auth/sign-in` | A-02 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/customer/index.ts` |
| `/auth/sign-up` | A-03 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/customer/index.ts` |
| `/auth/recover` | C-21 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/customer/index.ts` |
| `/auth/locked` | E-04 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/customer/index.ts` |
| `/dev` | D-03 | dev | super_admin, developer | `src/modules/dev/index.ts` |
| `/dev/tokens` | D-01 | dev | super_admin, developer | `src/modules/dev/index.ts` |
| `/dev/components` | D-02 | dev | super_admin, developer | `src/modules/dev/index.ts` |
| `/dev/specs` | D-03 | dev | super_admin, developer | `src/modules/dev/index.ts` |
| `/dev/layout` | D-04 | dev | super_admin, developer | `src/modules/dev/index.ts` |
| `/dev/layout/:pageCode` | D-04 | dev | super_admin, developer | `src/modules/dev/index.ts` |
| `/dev/knowledgebase` | K-01 | dev | super_admin, developer | `src/modules/dev/index.ts` |
| `/dev/canvas` | D-05 | dev | super_admin, developer | `src/modules/dev/index.ts` |
| `/dev/api-keys` | D-07 | dev | super_admin, developer, admin | `src/modules/dev/index.ts` |
| `/dev/simulator` | D-06 | dev | super_admin, developer | `src/modules/dev/index.ts` |
| `/docs` | K-02 | docs | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/docs/index.ts` |
| `/hub` | HUB-01 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/hub/index.ts` |
| `/no-access` | E-05 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/hub/index.ts` |
| `/manual` | K-03 | docs | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/ops-manual/index.ts` |
| `/manual/decisions` | K-04 | docs | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/ops-manual/index.ts` |
| `/manual/:chapter` | K-03 | docs | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/ops-manual/index.ts` |
| `/docs/source` | K-05 | docs | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer | `src/modules/ops-manual/index.ts` |
| `/teach/promote` | S-07 | teacher | super_admin, admin, teacher | `src/modules/promotions/index.ts` |
| `/promotions/:code` | C-29 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/promotions/index.ts` |
| `/promotions` | C-29 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/promotions/index.ts` |
| `/admin/promotions` | M-15 | admin | super_admin, admin, coordinator | `src/modules/promotions/index.ts` |
| `/hub/promotions` | P-02 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/promotions-guide/index.ts` |
| `/staff` | S-01 | staff | super_admin, admin, coordinator, front_desk, finance, maintenance, marketing, developer, teacher | `src/modules/staff/index.ts` |
| `/staff/inbox` | S-06 | staff | super_admin, admin, coordinator, front_desk | `src/modules/staff/index.ts` |
| `/staff/inbox/:id` | S-06 | staff | super_admin, admin, coordinator, front_desk | `src/modules/staff/index.ts` |
| `/staff/checkin` | S-02 | staff | super_admin, admin, coordinator, front_desk | `src/modules/staff/index.ts` |
| `/staff/register` | S-04 | staff | super_admin, admin, coordinator, front_desk | `src/modules/staff/index.ts` |
| `/staff/rooms` | S-05 | staff | super_admin, admin, coordinator, front_desk | `src/modules/staff/index.ts` |
| `/teach` | S-03 | teacher | teacher, coordinator, admin | `src/modules/teacher/index.ts` |
| `/teach/class/:id` | S-03 | teacher | teacher, coordinator, admin | `src/modules/teacher/index.ts` |
| `/teach/payroll` | S-03 | teacher | teacher, coordinator, admin, finance | `src/modules/teacher/index.ts` |
| `/teach/profile` | S-03 | teacher | teacher, coordinator, admin | `src/modules/teacher/index.ts` |
| `/staff/vouchers` | S-08 | staff | super_admin, admin, coordinator, front_desk | `src/modules/vouchers/index.ts` |
| `/admin/vouchers` | M-13 | admin | super_admin, admin | `src/modules/vouchers/index.ts` |
| `/app/vouchers` | C-28 | customer | super_admin, admin, customer, teacher | `src/modules/vouchers/index.ts` |
| `/app/vouchers/:id` | C-28 | customer | super_admin, admin, customer, teacher | `src/modules/vouchers/index.ts` |
| `/site` | W-01 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/website/index.ts` |
| `/site/about` | W-02 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/website/index.ts` |
| `/site/classes` | W-07 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/website/index.ts` |
| `/site/classes/:slug` | W-08 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/website/index.ts` |
| `/site/modalities` | W-03 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/website/index.ts` |
| `/site/schedule` | W-04 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/website/index.ts` |
| `/site/teachers` | W-05 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/website/index.ts` |
| `/site/plans` | P-01 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/website/index.ts` |
| `/site/faq` | W-10 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/website/index.ts` |
| `/site/contact` | W-06 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/website/index.ts` |
| `/site/delete-account` | W-09 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/website/index.ts` |
| `/site/legal/terms` | A-06 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/website/index.ts` |
| `/site/legal/privacy` | A-06 | public | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/website/index.ts` |
| `/docs/*` | K-02 | docs | super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, marketing, developer, customer, public | `src/modules/docs/index.ts` |

## Continue and reproduce

1. `git fetch origin` and record current remote head; this snapshot is only baseline 2d40275.
2. `npm ci --cache /tmp/hoy-npm-cache` (workspace cache avoids unwritable default home), then `npm run dev -- --host 127.0.0.1`.
3. Read `window.__hoyos.routes` in Chromium and compare with routes.json; route definitions live in the source modules above.
4. Reconcile the feature manifest against source workbook stable IDs. Preserve source acceptance independently from implementation assessment and fresh verification.
5. For each batch run required build/smoke plus focused behavior tests; review ES/EN at 390/1280, role variations and loading/empty/error/validation paths. Capture only fictional data. Keep protected private schedule/pay captures excluded from publication (`scripts/test-private-capture-policy.mjs`).
6. Record exact commit, checked deployment SHA, screenshots and blockers in the authoritative task manifest. Never mark a row done from this inventory alone.
