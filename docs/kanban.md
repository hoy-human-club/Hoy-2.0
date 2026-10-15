# HoyOS kanban

## Completed · 0067 (v0.24.3 · 2026-10-15)

- W-01: use the approved Coming Soon studio hero for both regular Latest and Photos, with the same dark-blue veil, cream text and responsive source selection. [Details](changelog/0067-shared-studio-hero.md)

## Completed · 0066 (v0.24.2 · 2026-10-15)

- W-11: replace the pre-launch concept artwork with the approved real red-lit studio photograph, responsive image variants and bilingual accessible copy. Keep the independent landing and Login-coming-soon behavior. [Details](changelog/0066-coming-soon-studio-photo.md)

## Implemented · 0063 (2026-10-15; deployment verification pending)

- Apply the owner-selected provisional 30-class timetable and public instructor names; keep reception hours unconfirmed until staff saves them. [Details](changelog/0063-fixed-weekly-schedule.md)
- Studio follow-up: reconcile the four Monday/Tuesday evening assignments; preserve the selected version until told otherwise.

## Completed · 0061 (v0.24.0 patch · 2026-10-14)

- M-13/C-28: permit distinct guests with the same display name while retaining user-ID/email duplicate protection. [Details](changelog/0061-voucher-guest-identities.md)

## Completed · 0060 (v0.24.0 · 2026-10-14)

- M-13/C-28: free invitation sandbox with class/COP benefits, guest booking, attendance and traceable domain events. Production fulfillment remains pending the backend integration. [Details](changelog/0060-invitation-vouchers.md)

## Backend follow-up · invitation fulfillment

- Authenticated transactional RPCs, secure claim-token delivery, cross-device persistence and purchased-gift settlement. [Readiness contract](voucher-backend-readiness.md)

## Completed · 0059 (v0.23.2 · 2026-10-05)

- W-11/HUB-01: public Coming Soon root, separate clean /hub testing entry and accessible Login-coming-soon dialog. DNS/custom-domain activation is separate and unchanged. [Details](changelog/0059-public-landing-hub.md)

## Completed · 0058 (v0.23.1 · 2026-10-05)

- W-11: English preview and top-right Login / Entrar wired to the existing demo sign-in entry; no auth or default-language changes. [Details](changelog/0058-coming-soon-login.md)

## Completed · 0056 (v0.23.1 · 2026-10-05)

- W-01/W-02/W-03/W-05/W-07/W-08/P-01: selectable animated archive, explicit Latest default, restored historical loops and read-only preview boundaries. [Details](changelog/0056-animated-archive.md)

## Completed · 0055 (v0.23.0 · 2026-10-03)
- M-04: The 72 automated emails from Lore's three inventories (38 customer, 33 teacher, 1 team) in ES and EN, filtered by recipient and grouped by priority; `email_templates.audience` + `priority`; inventory and gaps in `docs/reference/automated-emails.md`.
- M-04: 23 proposed gap emails (badge Propuesto, incl. the team emails and the three reports), the "every email is a suggestion" notice and a per-email Nota para el admin; unsubscribe line on marketing previews (95 templates).

## Completed · 0054 (v0.22.3 · 2026-10-02)
- W-02: Removed Así hablamos and its five personality chips.


## Completed · 0053 (v0.22.2 · 2026-10-02)
- C-26: Removed data-controller contact card (W-14).
- S-03: Payroll question button already removed; cleaned its remaining paid-state contact copy (W-15).


## Completed · 0052 (v0.22.1 · 2026-10-02)
- W-02: Lorena’s new Sobre HOY copy in Spanish, with matching English translation.
- W-01: Removed “Tu próxima pausa empieza aquí.” and its subtitle element.


_Updated every turn. Codes reference `src/specs/canvasSpecs.ts` and the module `specs.ts` files; `/#/dev/specs` shows the live built/stub badge per code (v0.22.0 — **0051** the studio's verified content: seven classes and their seven teachers, the launch price list (no credits, no membership — `class_ledger`, the 12-class package freeze on C-07b, C-22 retired), the new **W-10 Preguntas frecuentes** with live prices, terms v2.0 with "Por definir" callouts, check-in only at reception, no Nequi / Daviplata, no payroll WhatsApp ask; ClassArch + PriceTable + FaqAnswer in D-02; ops manual ES + EN; v0.21.3 — **0050** manual read toggle, admin edits, phone figures: K-03 read state as a toggle in the head and a new ChapterFoot (Marcar como leído ↔ no leído, Siguiente →), `manual.markUnread` (60 actions), admin / super admin edit any `##` section in place (`canEditSection`), phone captures at 360 px and paired (`FigurePair`), `ReadToggle` + `ChapterFoot` + `FigurePair` in D-02; v0.21.2 — **0049** check-in row actions: S-02 and the S-03 attendance roster use one compact pair per row — tonal Check-in + outline No vino, 36 px visible with a 44 px hit area, no shadow — in the new `RowActions` slot; `Button` gains `tonal` and `outline`, D-01 gains `--h-ctl-sm`, the redundant Esperado chip is gone; v0.21.1 — **0048** hub card Mensajes transaccionales: a 16th hub experience in the team band after CRM, entering as the coordinator at M-04 (emails) with a secondary link to M-05 (WhatsApp automations), `hub.enterAs` gains `messages`; v0.21.0 — **0047** WhatsApp contact routing by intent: `tenants.settings.contacts` (nine intents, name · number · role · hours) edited in M-08a, `resolveContact()` with the hours / holiday fallback and the front desk as the universal fallback (D-0022), all 16 handoffs rewired (S-03 payroll and C-26 legal were misrouted), `settings.contacts.update` + `contact.whatsapp` (59 actions), the inventory in `docs/reference/whatsapp-handoffs.md`; v0.20.0 — **0046** tables calendar and timeline: M-03 calendar (month / week / agenda) and timeline (day to quarter zoom) views by a chosen date column, the Fecha / Hasta picker, rename and delete of saved views, six new `tables.*` actions (17), `?date=` `?mode=` `?zoom=`; v0.19.1 — **0045** developer brief (`docs/reference/developer-brief.md`); v0.19.0 — **0044** tables system redesign: M-03 with human labels, a toggleable sidebar, grid / list / gallery / kanban / graph views, filters, sorts, grouping, hidden columns and saved views as `table_views` rows; the schema is the ontology (D-0020); views are rows, realtime is Supabase first, Yjs only for documents (D-0021); plan `docs/plans/tables-system.md`; v0.18.0 — **0043** AI distribution: `actions.json` (schema `hoy.actions/1`, 40 actions) published on every build, the surfaces audit, `docs/reference/ai-distribution.md` and D-0019; v0.17.1 — **0042** quiet site cursor: ink dot + primary ring from theme tokens, tone as a ring tint only; v0.17.0 — **0041** hours, holidays, Google Business Profile, developer keys: the M-08a hours are finally read everywhere (`useOpeningHours()`, D-0016), `hours_overrides` + M-08g with the Colombian holidays, M-10a with the exact Google Business Profile body and the setup split platform / studio (D-0017), D-07 developer API keys hashed at rest and shown once (D-0018), the first admin actions; v0.16.0 — **0040** practice analytics: "Clases tomadas este mes", the weekly goal-based streak with a rest week per four, the goal picker, C-27 Tu práctica, M-12 Analítica de práctica, the M-06 Práctica tab, S-03 Mis números, five molecules, two tables (54), four actions, 103 routes / 89 codes; v0.15.0 — **0039** the four movements retired: modality filters (`?modality=`), class tones, D-0013; v0.14.0 — **0037** spacing and sizing standard: one 4 px rem scale + semantic tokens in D-01, `npm run lint:spacing` in the build (774 → 71 raw values), the `ui-spacing` skill, a sweep of every surface; v0.13.4 — **0038** manual QA: fresh captures, `lint:manual`, chapter 22 braces, provisional guest rule, P-01 corporate card; v0.13.2 — **0035** the theme toggle and the bell are true 44 px circles again (`.ctl-round`); v0.13.1 — **0036** the real WhatsApp and address (Santa María Tenis Club, El Poblado) with per-field confirmation in M-08a; v0.13.0 — **0031** the operations manual as a staff LMS: per-role lens, Tu manual, training sign-off, edits beside the markdown, change requests, K-05 source documents, stale-capture badges, chapter icons, marketing + developer roles. Earlier: v0.12.2 — **0034** the "¿Cómo quieres sentirte hoy?" section removed from the website; v0.12.1 — **0033** the hoy wordmark in website headings; v0.12.0 — **0030** icons: lucide behind the `Icon` atom, 135 names, settings and front-desk glyphs; A-05 retired. Earlier: v0.11.1 — **0028** page groups in the hub map (`pages[].group`: the customer app splits into Book / Pay / Account / Sign in, every other experience into its own groups), on top of v0.11.0's **0027** Hub map: `public/hub-map.json` (schema `hoy.hub-map/1`, `docs/reference/hub-map.md`) describes every role, experience, page and tool by device for aluzina, between-gigs and hoy's own hub, generated on every build from `src/hub/hubMap.data.ts` (which HUB-01 now renders from) plus the route registry, with its shots under `hub-map/shots/`; the `hub.map` action; on top of v0.10.1's **0026** Phone calendar views (`SessionCalendar` week strip + month grid under 900 px), teacher column `--w-teach`, room-width `MatPicker` rows; on top of v0.10.0's **0025** Responsive app shell: `AppShell` replaces `PhoneShell`, no phone frame on desktop (D-0006), the `--ui` band on every surface and one breakpoint list (D-0007), 44 px controls system-wide, desktop layouts for the reserve and register pages, seven `app.*` / `auth.*` WebMCP actions; on top of v0.9.4's **0024** website V2.1–V2.3 back-fill; on top of v0.9.0's **0022** Hub home redesign: HUB-01 rebuilt around real previews, `PagePreview` + `DeviceFrame` + the per-frame session, the actions registry (WebMCP), D-05 the page canvas and D-06 the device simulator; 101 routes, 87 codes, 0 stubs, 48 tables (21 with an access contract), 66 components in D-02, **933 capture files** (417 page captures + 488 thumbnails + 28 before/after); on top of v0.8.0's **0021** Conversación CRM y bandeja de mensajes: `message_log` as the unified communications record, the comms seam, the Conversación tab in M-06, the new S-06 inbox, the unread bell and the S-01 messages card; on top of v0.7.1's **0020** polish and code-quality pass — code splitting, local date keys, dead code, strings, tokens, the visual audit; on top of v0.7.0's two parallel tracks: **0018** owner decisions as settings — M-08a contact identity, M-08c payroll cadence + rate card, M-08f content decisions — plus M-10 Integraciones and ROADMAP §G; **0019** app-store readiness — StatTile fit, C-26 Cuenta y datos, W-09 public deletion page, M-11 deletion queue; 98 routes, 85 codes, 0 stubs, 48 tables (21 with an access contract), 61 components in D-02, 395 captures; on top of v0.6.2's Especiales, v0.6.1's expenses ledger and v0.6.0's three tracks). What is still missing is listed as a plain numbered list in `ROADMAP.md` §F._

## Backlog

### External (other repos)
- **0027 follow-up** · **between-gigs consumer** (Justin's company OS): hoy as one gig — lens `between-gigs`, one surface per experience with its `pageCodes`, plus the tools row Consumer guide: aluzina's `docs/tenant/hub-map-consumer.md` (imagine-os/aluzina); use `pages[].group` (0028) for the sub-mats.

### Product
- **0055 follow-up** · **Email decisions** (owner + Lore): membership vs package (`upcoming_charge`, website "Membership renewal"); email or WhatsApp for each of the 33 teacher messages (14 before launch); late-cancellation variant of "Reserva cancelada por ti" once the terms set the rule. See `docs/reference/automated-emails.md` §Decisions.
- **0055 follow-up** · **Review the 23 proposals** (Lore + admin): confirm or delete each Propuesto email in M-04 (team emails, reports, customer and teacher gaps); a permanent "no" also comes out of `src/data/emailCatalog.ts` so "Crear plantillas estándar" stops offering it. PILA reminder for teachers waits for finance (only if teachers are contractors).
- **0055 follow-up** · **Consent and unsubscribe** (Opus 5.5): marketing emails (`category: 'marketing'`) must check the email `notification_prefs` row and carry an unsubscribe link; the M-04 footer today only says "you have an account".
- **0055 follow-up** · **Email runner** (Opus 5.5, with Supabase): emit each catalog `trigger`, render the row with real variables, write `message_log`; attach the DIAN invoice (PDF + XML) to the receipt; verify SPF / DKIM / DMARC first.
- **0051 follow-up** · **Gift-card redemption at the desk** (model: Opus 5.5): a gift card (class or 12-class package) is redeemed today by selling its item in S-04 with amount paid 0 and the code in the note (manual 11 §3). Build a "Redimir tarjeta" step: look up `gift_cards.code`, credit the class or the package to the person's `class_ledger`, mark the card `redeemed`, audit `gift.redeem`.
- **0051 follow-up** · **Illness reschedule** (owner, then Opus 5.5): the FAQ says a missed class through illness is rescheduled; today coordination returns the class by hand. Needs the owner's rule for evidence (terms "Por definir") before an S-02 / M-06 action that returns the class with reason `comp` and a note.
- **0051 follow-up** · **Terms "Por definir"** (owner): late cancellation under 12 h, illness evidence, retracto / reversión, the PQR channel and response time, applicable law, jurisdiction, consumer-authority procedure. Each answer replaces its callout in `src/data/seed/legal.ts` (TERMS2) and bumps the version.
- **0051 follow-up** · **Class and teacher photos** (studio, then Sonnet 5.5): the arches and the teacher monograms wait for real photos — upload them in M-02d to `site.classes.<slug>` and `teachers.photo_url`; nothing else changes. The five supplied class stills (hot yoga, barre, pilates, meditación, respiración) stay unused until the studio maps them.
- **0051 follow-up** · **Package expiry automation** (Opus 5.5): M-05 / M-04 now ship the "Paquete por vencer" template on `package.expiring`, but nothing emits that trigger yet; emit it from the ledger (7 and 14 days before `expires_at`, the M-11 counts) in the automation runner when Supabase lands.
- **0050 follow-up** · **Phone figures: three in a row and the 1280 pair size** (model: Opus 5.5): pairs are two; a third adjacent phone capture stays alone, and at 1280 the reading column (~490 px between the docs sidebar, the manual sidebar and the outline) makes a pair ~234 px each; decide whether the outline collapses under 1440 or a pair spans the outline column, then capture chapters 10, 17, 19, 20
- **0050 follow-up** · **In-place edit for the intro above the first `##`** (model: Opus 5.5): `canEditSection` needs a heading (overrides are keyed by it), so the lead paragraph of a chapter is still edited in git; key it as `__intro` if the owner wants it
- **0050 follow-up** · **K-03 page doc captures of the foot and an admin chapter** (model: Sonnet 5.5): the standard K-03 captures are the cover and chapter 03 as the super admin; add `-admin` and `-desk` captures of chapter 04 (foot, Editar on every section) in ES / EN × 390 / 1280
- **0049 follow-up** · **Compact `sm` everywhere?** (model: Fable 5.1 to decide, Opus 5.5 to build): 0049 scoped the 36 px `sm` geometry to `RowActions`; the other 222 `size="sm"` buttons (card heads, toolbars, the customer app) are still 44 px visible. Decide whether `sm` becomes 36 visible / 44 hit app-wide, then sweep with captures
- **0049 follow-up** · **S-03 roster capture with attendance open** (model: Sonnet 5.5): the new `docs/screenshots/S-03/*-class.jpg` capture lands before the attendance window, so the rows show chips and no buttons; capture as the coordinator (override) or at T−15 min so the tonal / outline pair is documented
- **0048 follow-up** · **Hub card rows ragged at 1920+** (model: Opus 5.5): at 1920 the team-band cards already start their previews at different heights (two-line titles such as "Bandeja de mensajes", three-line leads, the Mensajes transaccionales meta line wrapping); align title / lead / foot / preview across a row with CSS subgrid (`grid-template-rows: subgrid`) instead of copy trimming; 768 and 1280 line up today
- **0048 follow-up** · **Report emails in M-04** (model: Fable 5.1 to scope, Opus 5.5 to build): 0055 proposed three (daily close, weekly owner, monthly payroll) as drafts; still to confirm with the owner and to compute from analytics; decide which reports (daily close for the front desk, weekly numbers for the owner, the monthly payroll statement) become `email_templates` rows with their triggers, then add them to M-04 and the hub card's purpose
- **0047 follow-up** · **`coordinator` route for substitution requests** (model: Opus 5.5): the S-01 "Pedir reemplazo" flow writes a `message_log` row with `payload.to = 'coordinator'` and the copy says coordination gets it on WhatsApp, but no wa.me link exists; wire it through `useWhatsappLink().link('coordinator', …)` once the owner names the coordinator in M-08a
- **0047 follow-up** · **Dark and 3840 captures of M-08a and S-03** (model: Sonnet 5.5): 390 / 1280 light were refreshed in 0047; the "Contactos de WhatsApp por tema" card and the "Tu pregunta llega a…" line still need dark and 3840, ES and EN, plus the M-08a thumbnails
- **0047 follow-up** · **Hours-aware reply promise on C-25** (model: Sonnet 5.5): the row shows the resolver's note when the contact is off duty, but the default "Respondemos en horario del estudio" is still the static `policy.replyWindow`; derive it from `useOpeningHours()` (today's line) so the promise matches the footer
- **0045 follow-up** · **Key scopes vs permissions** (model: Opus 5.5, with the 0043 action-schema card): `API_KEY_SCOPES` in `src/modules/dev/apiKeys.ts` has `customers.read`, `hours.read` and `webhooks.receive`, which are not `Permission` ids, while `docs/reference/ai-distribution.md` §3 says scopes are permissions 1:1 — map them (`members.read`; drop or define `hours.read`; define a webhook permission) and migrate the seeded `api_keys` rows
- **0045 follow-up** · **Empty D-02 captures** (model: Sonnet 5.5): `docs/screenshots/D-02/{es,en}-1280[-dark].jpg` are 0-byte files, so the hub map and the D-02 page doc link blank images; re-run `npm run screenshots -- --pages=D-02` and check the size
- **0046 follow-up** · M-03 calendar and timeline chips and bars show the raw value when `titleColumn` is a date or a slug; the readable titles belong to the B1 labels (Sonnet 5.5)
- **0046 follow-up** · M-03 toolbar wraps to three rows at 1280 with the Fecha / Hasta picker; build a compact toolbar (Opus 5.5)
- **0046 follow-up** · Rollup warns about a circular chunk between `src/actions/bus.ts` and `src/actions/index.ts` (`useActions` re-exported); check whether `main` shows it too and fix the import direction (Sonnet 5.5)
- **0046 follow-up** · M-03 capture script still cuts the sticky sidebar at viewport height (same card as the 0044 one; fix once) (Sonnet 5.5)
- **0046 note** · `time` columns cannot drive a calendar or timeline, by design (they carry no day); nothing to do
- **0044 follow-up · Pass B (tables polish)** · M-03 B1 bilingual `label` for every column of the 57 tables and enum value labels (Sonnet) — dep A1
- **0044 follow-up · Pass B** · M-03 B3 form view: public / staff data entry from a view (Opus) — dep A4
- **0044 follow-up · Pass B** · M-03 B4 inline cell editing + column resize / reorder by keyboard (Opus) — dep A4
- **0044 follow-up · Pass B** · M-03 B5 record-level graph polish: expand neighbours, path between two rows (Opus) — dep A5
- **0044 follow-up · Pass B** · M-03 B6 view sharing UI + per-role default views (Opus) — dep A3 (rename and delete of saved views done in 0046; sharing UI and per-role defaults remain)
- **0044 follow-up · Pass B** · M-03 B7 QA matrix 360 → 3840, all inputs: keyboard, mouse, trackpad, touch, pen (Sonnet) — dep B1–B6
- **0044 follow-up · Pass C (connection)** · M-03 C1 `version` column in BASE_COLUMNS + optimistic concurrency in `DataProvider.update`: reject stale writes, "someone changed this" Notice (Opus) — no dep
- **0044 follow-up · Pass C** · M-03 C2 `TableDef.rls` for the 26 tables missing it, reviewed; closes ROADMAP §F 25 (Sonnet + Fable review) — no dep
- **0044 follow-up · Pass C** · M-03 C3 auth model doc: Supabase Auth ↔ `users` / `user_roles`, `tenant_id` JWT claim, the role switcher becomes real sign-in with view-as kept for super_admin in dev mode (Fable) — no dep
- **0044 follow-up · Pass C** · M-03 C4 `SupabaseProvider`: PostgREST list / get / insert / update / remove, `postgres_changes` → `subscribe`, `peek` from a local cache (Opus) — dep C1, C2, C3 + a Supabase project and keys from Justin
- **0044 follow-up · Pass C** · M-03 C5 provider switch by env + a Connection panel in dev tools showing provider, tenant, realtime status (Opus) — dep C4
- **0044 follow-up · Pass C** · M-03 C6 presence on M-03 and the editors via Supabase Realtime presence: who is viewing / editing which row (Opus) — dep C4
- **0044 follow-up · Pass C** · M-03 C7 offline write queue (IndexedDB) replayed with the version check, conflict Notice (Opus) — dep C1, C4
- **0044 follow-up · Pass C** · M-03 C8 documents co-editing (manual pages, studio policies, page layouts) with Yjs only if the team edits text together; Yjs updates in Supabase, Liveblocks Yjs only if presence UX wins later — decide then (Fable) — dep C6
- **0044 follow-up · Pass C** · M-03 C9 `locations` table once `multipleLocations` is on (Opus) — dep C4
- **0044 follow-up** · full-page captures cut the sticky tables sidebar at viewport height: fix the capture script for M-03 (Sonnet 5.5)
- **0044 follow-up** · M-03 at 1280 with both sidebars: the view switcher shows labels only on the active option and the toolbar wraps; give it room or a compact mode (Opus 5.5)
- **0044 follow-up** · M-03 table-level graph: labels overlap around `users` (44 incoming foreign keys); add label-collision avoidance (Opus 5.5)
- **0044 follow-up** · M-03 enum badges use one Spanish gender form until per-column and per-enum labels land in B1 (Sonnet 5.5)
- **0044 follow-up** · decide whether default views should filter: the seeded `class_sessions` view "Próximas clases" is filtered to `scheduled`, so captures show a filtered grid (Fable 5.1)
- **0044 follow-up** · M-03 exports use raw column names and values; optional human-label export (Opus 5.5)
- **0044 external** · Supabase project + keys (Justin); decide whether hoy shares Between Gigs' Supabase Auth project — recommendation: hoy owns its own Supabase project and Postgres data, identity federation later through the hub map
- **0043 follow-up** · **Action schema for machines** (depends on: 0043; model: Opus 5.5): `ActionDef.surface` (`page | server | both`), JSON-Schema `params` beside the human description, the ai-distribution.md §3 server tools marked; `npm run actions` fails on a bad schema
- **0043 follow-up** · **Demo MCP server, phase 0** (depends on: action schema; model: Opus 5.5): Cloudflare Worker in `server/mcp/` or a sibling repo (ROADMAP §E 44), Streamable HTTP 2026-07-28 + 2025-11-25 compat, read-only seed tools for tenant `hoy`, `npm run mcp:dev` / `npm run test:mcp`; one URL works as a Claude custom connector and a Cursor deeplink
- **0043 follow-up** · **WebMCP adapter in the page** (depends on: 0043, parallel with the demo server; model: Opus 5.5): `src/actions/webmcp.ts` registers the mounted actions as `document.modelContext` tools calling `run()`; Chrome origin-trial token in `index.html`
- **0043 follow-up** · **Zero-cost listings** (depends on: demo MCP server; model: Sonnet 5.5): `server.json` in the official MCP Registry, `.claude-plugin/marketplace.json` + plugin bundle with skills, `gemini-extension.json`, "Add to Cursor" deeplink and "Add to Claude" steps on D-07; each install path screenshotted into `docs/screenshots/D-07/`
- **0043 follow-up** · **Key verification on the Worker** (depends on: demo MCP server + Supabase, ROADMAP P2; model: Opus 5.5): bearer hash → `api_keys.key_hash`, scope / expiry / revocation, `last_used_at`; D-07 "Try a request" unwrapped — **shared with the 0041 server card below**
- **0043 follow-up** · **OAuth 2.1 door** (depends on: Supabase Auth; model: Fable 5.1 design, Opus 5.5 build): PRM, CIMD + DCR fallback, PKCE, `resource`, a thin authorization server on the Worker; a Claude custom connector signs in as a demo member
- **0043 follow-up** · **Member and staff write tools** (depends on: key verification, OAuth door; model: Opus 5.5): server-side permission enforcement and `audit_log`; `bookings.create` books a free-now class from Claude, a charged pass answers ok:false
- **0043 follow-up** · **Directory submissions** (depends on: OAuth door for consumer listings, demo server for registry-style; model: Sonnet 5.5 packaging, Justin for accounts): Anthropic directory, OpenAI Plugin Directory, Grok Build PR, Meta Muse partner application, Cursor Marketplace only if open source (ROADMAP §E 45–46)
- **0043 follow-up** · **In-chat UI** (depends on: write tools; model: Opus 5.5): one widget bundle (schedule + booking card) as an MCP App (`io.modelcontextprotocol/ui`) plus the OpenAI UI adapter; renders in Claude and ChatGPT
- **0043 follow-up** · **System-wide gateway** (depends on: demo MCP server; model: Fable 5.1 design, Opus 5.5 build): `gen-actions.mjs` as a shared package, aluzina and Between Gigs publish `actions.json`, the Worker mounts `{product}/{tenant}`
- **0041 follow-up** · **Server for Google push + key verification** (Cloudflare Worker or Supabase Edge Function; the key-verification half is shared with the 0043 "Key verification on the Worker" card, D-0019): OAuth callback storing `GOOGLE_BUSINESS_REFRESH_TOKEN_<TENANT>`, `locations.patch` on save in M-08a / M-08g and nightly, `hours_overrides.google_synced_at`, nightly drift read-back on M-10a; `Authorization: Bearer hoy_…` verification against `api_keys.key_hash` with scope / expiry / revocation checks and `last_used_at`; then unwrap the M-10a Connect / Push and D-07 "Try a request" Placeholders (`docs/reference/surfaces.md` §3)
- **0041 follow-up** · **Google API access request (platform, once)**: Google Cloud project, enable My Business Business Information + Account Management APIs, submit the Business Profile API access form (quota 0 until approved), OAuth consent screen with `business.manage` (M-10a "Platform, once")
- **0041 follow-up** · **Hours polish**: hide `api_keys.key_hash` from M-03 for finance (done in 0044: hidden for roles without `tables.write`); a per-location hours set once `multipleLocations` is on; C-02/W-04 schedule days that fall on a closed override could show the holiday instead of classes
- **0040 follow-up** · **One at-risk rule** (ROADMAP §E 41): the M-06 / CRM segment rail flags "en riesgo" at 21 days (`useMemberStats`) while M-12 uses the 14 / 30 / 60 / 90 ladder (`AT_RISK_BANDS`); unify on the ladder once Justin answers, and drop the M-06 spec note
- **0040 follow-up** · **Member-declared pause** (ROADMAP §E 42): a `practice_pauses` table (or `paused_from` / `paused_until` on `practice_goals`) the member sets from C-27 for up to 4 weeks, instead of inferring the skipped week from the membership's `status paused` + `updated_at`
- **0040 follow-up** · **Milestone congratulations** (ROADMAP §E 43): a WhatsApp automation on `activity_events.kind = milestone` (M-05 template, quiet hours respected) and a check-in flag on S-02 ("clase número 25 hoy") so the desk can say it in person · until then the in-app toast and the M-12 "Logros recientes" list are the only surfaces
- **0040 follow-up** · **Components, second pass**: an `award` name in the `Icon` registry (`MilestoneList` uses `star` meanwhile) · a stacked-label `BarList` variant (M-12 `ByModality` overrides the row grid on phones in `admin.css`) · the `SegmentedControl` selected pill in dark mode (GoalPicker shares its track) · `StreakBadge` auto-shrink above 3 digits (the meta says "keep it short") · `Heatmap` natural width at 3840 (the table is capped at `cols × 4.5rem + 5rem` and floats left in the card)
- **0040 follow-up** · **Seed**: the one-class-per-day guard for `usr_cust` still uses UTC `s.starts_at.slice(0, 10)` (`src/data/seed/index.ts` ~117 and ~132) → `dateKey()` (the 0020 rule) · the payroll draft is built (line ~269) before the practice bookings are appended, so the seeded past classes of the demo member and her co-attendees are not in the teachers' lines
- **0040 follow-up** · **C-27 at 768**: the tablet band keeps the 560 px phone column (0025 contract); give `SplitSections` a two-column layout from 768 for Tu práctica, and add 768 to its `checkedAt` after the QA matrix
- **0038 follow-up** · **Manual QA leftovers** (`docs/qa/manual-2026-09-29.md` §1): live-block frames show `src/…` and table names in their eyebrows (show them only in dev mode) · a "Saltar al contenido" link and one "Colapsar menú" button instead of two on K-03 · delete `docs/screenshots/A-05/` · Lorena's review of tone (the one thing a script cannot check)
- **0032 follow-up** · **Experiencias Corporativas on the site**: `corporativo` exists in `pricing.ts` as a coming-soon family with `CORPORATE_FORMATS` (no prices); P-01 shows a small informative "En camino" card since 0038 (no link); W-01 does not, and the "Próximamente · Cuéntanos de tu equipo" card to WhatsApp (never a checkout), marked not wired in dev mode. `ClassicHomePage` keeps its own five-family list
- **0032 follow-up** · **Manual guidance media**: short photos and videos for the manual (artwork list item 11 in chapter 19), ; ~~a screenshot pass for the rewritten chapters (QA)~~ **done in 0038**
- **0034 follow-up** · ~~**The feeling question in the ops manual**~~ **done in 0032** (the rewrite drops the question and the A-05 step from every chapter; movements stay internal labels — retired entirely in 0039): chapters 01, 02 and 05 still name "¿Cómo quieres sentirte hoy?" as the studio's central question — keep it as brand language or rewrite now that neither the app nor the site asks it · the non-`--full` website captures draw `[data-reveal]` sections blank below the hero (run them with reduced motion like `--full`)
- **0031 follow-up** · ~~**Manual content pass (0032, parallel)**~~ **done in 0032**: replace the static §4 table in 00-index with `{{audience}}`, mark the owner-adjustable sections `{{editable:owner|coordinator}}`, move screen references into `> EN HOYOS:` boxes, add `{{studio:…}}` keys to `src/data/seed/studioPolicies.ts`, drop `{{source:<id>}}` where the documents belong, `{{training:<role>}}` in chapter 09
- **0035 follow-up** · **Crowded DesktopShell top bar for super admin at 1280** (pre-existing): with the RoleSwitcher (351 px), dev switch and spec chip, the wordmark and page title already squeezed to ~6 px before 0035 and now to 0 on D-01 / K-03 — give the RoleSwitcher a max width or move it into a menu from 1080–1440 px · short text pills (`Chip` "FAQ", one-letter `Button`, `SegmentedControl` at 390) are narrower than their 44 px height; give single-glyph pills a `min-inline-size: var(--h-ctl)`
- **0036 follow-up** · **NIT and the map link** (owner): email and Instagram were confirmed in 0051 (info@humanclub.com, @hoyhumanclub); still open: the NIT, and a Google Maps share link for the exact entrance (M-08a map link; the default is a search for Cl. 7B Sur # 29C-100) · consider printing the address and NIT on S-04 receipts once the NIT exists
- **0031 follow-up** · **Manual LMS, second pass**: fold accepted overrides back into the markdown (a content pass per quarter, recorded in the changelog); per-person assignment beyond "one demo person per role" once Supabase users exist; notify the requester when a request is answered (C-24 / WhatsApp); images and short videos per procedure (Justin: "later"); "Reescribir con IA" wired to a server-side agent (Placeholder today); a marketing kit page (the hub card is `comingSoon`); ~~CLAUDE.md "Roles" still lists nine roles~~ **done in 0038**
- **0031 follow-up** · ~~**Stale captures**~~ **done in 0038**: the full pass cleared 22 of 23 flagged codes; the one left is `A-05` (retired in 0030, its folder can be deleted)
- **0033 follow-up** · **Wordmark, owner decisions**: W-01's closing line "Lo que necesitas empieza hoy." could set the mark if the English also reads "starts HOY" · a vector trace of the full lockup (script + HUMAN CLUB) and the circular badge from the manual · the apps / emails still use the PNG colourways
- **0030 follow-up** · **Icons, second pass**: MediaSlot placeholder glyphs (◎ ▶ ✎), website (W-*) icons, the ♨ heated-room mark and the ✓ / · booleans in DataTable onto the `Icon` set; a full screenshot pass for the desktop pages whose sidebars changed
- **0030 follow-up** · **Legal text**: the privacy document lists "intention of the day" among studio activity; drop it in the next legal version (A-06, counsel review)
- **0027 follow-up** · **Hub map, second pass**: tablet shots (`device: tablet` has no capture key yet) · a `--full` pass for the long docs / manual sheets · a JSON Schema file next to the TS contract so non-TS hosts can validate · push-style updates (hosts poll `product.version` today)
- **0025 follow-up** · **Tablet band 768–899 px**: still the 560 px phone column with gutters (the 0025 contract kept it); design a real tablet layout (two columns or a rail) for `AppShell` pages
- **0025 follow-up** · **Website controls under 44 px** (W-*): ~~header links 34 px, the version select 38 px~~ **review round `9772100`: header controls are `--h-ctl` and scale with `--ui`** · still open: `.site .btn` in the page bodies (36 px) and P-01's `a.btn` links (18 px, QA I-17) — raise them to `--h-ctl` and recapture the site
- **0025 follow-up** · **Actions beyond the hub and the reserve / register flow**: check-in (S-02), selling (S-04), sending (M-04/M-05), waitlist and change-booking (C-20, C-08b), sign-up (A-03), plus a shell scope in `src/actions/` so `app.goHome` / `app.openSchedule` are declared once instead of on five specs; server-side enforcement of `ActionDef.permission`
- **0025 follow-up** · **Real auth (gated on Supabase)**: A-02/A-03 are still the demo-user picker; `auth.signIn` enters a demo user until Supabase Auth replaces it
- **0025 follow-up** · `DesktopShell`'s `useNarrow()` → `useMinWidth('shell')` (kept separate in 0025 to avoid an off-by-one at exactly 900 px) · `AppShell bare` hides the desktop nav with the top bar (no caller today) · ~~`MatPicker .mat-place` heights to rem~~ **done in 0026**
- **0025 follow-up** · ~~**Screenshot matrix 360 → 3840**~~ **landed 2026-09-28** (`docs/qa/responsive-2026-09-28.md`, 138 captures); still open: S-03 and the full 360…3840 `checkedAt` on the touched specs (0025 set `[390, 1280, 3840]`)
- **QA 2026-09-28 follow-up** · **Inline text links under 44 px** (G2): ~~`Elegir mi intención →`~~ (removed with A-05 in 0030), `Reglas del club →`, `Olvidé mi contraseña`, `Crear cuenta`, legal links, ~~`Hoy no, gracias`~~ (A-05, retired), site footer links — give inline links a padded 44 px hit area without changing their type
- **QA 2026-09-28 follow-up** · **Sanctuary body typography in rem** (G4 body): site body copy, footer captions and `.sanctuary-*` sizes are px and stay ~14 px at 3840; the 1360 px column fills a third of a 4K screen — move the site's type to rem tokens and widen the column with `--ui`
- **0026 follow-up** · **Calendar phone views, second pass**: the W-04 day strip at 360 is one snap wider than the 310 px site window (seventh chip needs a swipe; the app column fits all seven); a booked-by-me marker on the strip / month dots; a teacher-side calendar (S-03 lists its week as rows today, no `SessionCalendar`); a tablet (768–899) layout that uses the width instead of the phone strip
- **0026 follow-up** · **Teacher desktop layout**: the 60rem column fixes the stretch; a real two-column home (next class + today | stats, specials) and a sticky roster header on `/teach/class/:id` are the next step
- **0026 follow-up** · **Mat grid**: `matColumns()` unit test in `scripts/test-mat-bookings.mjs`; a room-shape setting per `rooms` row (today `tenant.studio.mats / matRows` is one room); S-05 rooms does not draw mats yet
- **QA 2026-09-28 follow-up** · **ES copy nits** (I-05b): title-cased `28 De Septiembre De 2026`, native date inputs in `mm/dd/yyyy`, `1 cupos`
- **QA 2026-09-28 follow-up** · **Large-screen polish** (I-10, I-11, I-12, I-13): C-01 fills the top 60 % of a 4K viewport; the C-08 countdown ring is a fixed px SVG (`EMPIEZA EN` wraps at 2560+); `Avatar` initials stay 12–14 px because the atom sizes text from its px diameter; the A-03 terms checkbox is 20x20 with no 44 px hit area — rem sizes for the ring, avatar and checkbox
- **Mat-booking data has no schema yet (from 0024)**: `bookings.mat_number` exists only as a TypeScript module augmentation in `src/data/mats.ts`, and the demo calendar horizon and mat assignment live in `MockProvider` (`SEED_VERSION = 3`). Nothing appears in `src/data/schema.ts`, `supabase/schema.sql` or `docs/data-model.md` (`rooms` only mentions capacity in mats). Close the gap: add the column (and a per-room mat layout if wanted), regenerate `npm run sql`, document it in `docs/data-model.md`, and make the double-booking rule server-side
- **P1 leftovers from 0007/0008** (numbered in ROADMAP §B/P1): M-02 editors for `content_articles` / `faq_entries` + an event publisher for `events` (M-03 edits them generically today) · server-side invite reward (`invites.status` only reaches `sent` from the client; `joined` / `rewarded` + `reward_credit_id` need the Supabase function that grants the credit) · staff-side `notifications` sending (front desk / M-04 / M-05 writing a C-24 in-app row — **not** closed by 0021, whose inbox writes `message_log`, the WhatsApp / email record; the two could be joined by one `useMessaging()` call later) and the 90-day retention job · event waitlist (`event_rsvps.status` has no `waitlist` value yet) and attendance marking from S-02 · real Wompi tokenisation behind `wompiTokenise()`
- **From Jas's review (0014), still open**: M-09c has no CSV export for the accountant yet (M-09b has one) · attach the invoice / receipt image to an expense row (needs Supabase Storage, like M-02d's upload) · ~~the "15 días" range stays as a filter until Sergio confirms fortnightly pay periods~~ **0018: the cadence is a switch in M-08c and the range default follows it — Sergio only has to pick**
- Real Supabase Auth behind A-02/A-03/C-21 (SessionProvider already accepts any `users` row)
- **App-store readiness, still open after 0019** (`docs/app-store-compliance.md` §4): the server-side deletion job that M-11's seven-step checklist specifies (anonymise `profiles` + `users`, delete the auth user, purge notifications, keep payments / invoices under the anonymous id, flip `deletion_requests` to done, send the confirmation) · the edge function behind the public W-09 insert (rate-limit, no read-back) · a "report this review" action + moderation queue for C-10 reviews if they go public (Apple 1.2 / Play UGC) · privacy nutrition labels and the Play Data safety form filled from `docs/data-model.md` · the native shell (Capacitor / TWA) and push delivery
- The `--only=/app$` exact-match form of `scripts/screenshots.mjs` skipped C-01 in the 0019 run — check the `$` handling (ROADMAP §F 35)
- PDF receipts (C-11)
- S-02/S-04 follow-ups: offline queue for check-ins, real Wompi link · M-04 MJML designer + real provider · M-05 Meta approval API · M-09 Wompi payouts + DIAN CUFE emission
- M-02d file upload (Supabase Storage — the row stores a URL today) + a server-side scheduled-publish job · M-06 duplicate merge · M-07 signed CSV
- Supabase provider (auth, realtime) · Wompi payments/payroll · ~~WhatsApp CRM~~ **0021: the CRM thread and the S-06 inbox exist over `message_log`; what is left is the Cloud API itself (below)** · email designer
- Live cursors / presence (nice to have)
- ~~**Lift design-system control heights to 44 px system-wide**~~ **0025: done** — `--h-ctl` (2.75rem) plus a global `button` / `input` / `select` floor; `Button`, `Input`, `Chip`, `Toggle`, `SegmentedControl`, `LangToggle`, `ClassRow`, `RoleSwitcher`, `SessionCalendar`, `DesktopShell` links raised. **Still open**: delete the `.hub`-scoped "pointer targets" override in `src/modules/hub/hub.css` (now redundant), and the website controls below (0025 follow-ups).
- **Left by 0022 (hub home redesign)**: ~~the `--ui` scale band applied to **every surface**, not only the hub~~ **0025: done, `--ui` on `:root` (D-0007 supersedes D-0004's deferral)** · `scripts/screenshots.mjs --state=` so a **live preview** and other interactive states can be captured (today `navigator.webdriver` switches live frames off, which is what makes the capture deterministic) · **remote / gamepad d-pad focus** on the hub (spatial navigation between cards, a visible focus ring readable from ten feet) · a **voice controller over `window.__hoyos.run`** using each action's `intent` as its vocabulary, plus actions declared beyond HUB-01 (~~booking~~ **0025: `app.reserve` / `app.pickMat` / `app.confirmReservation` / `app.choosePlan` / `auth.signIn`**; check-in, selling, sending still open) and server-side enforcement of `ActionDef.permission` · **in-product annotations**: the hub's "Reportar un problema" is a `Placeholder` today — testers should be able to comment, request and file a bug on the product itself, stored so an agent can triage from it
- **Left by the 0020 polish pass** (ROADMAP §F 25–32): `TableDef.rls` for the 27 tables without one (`message_log` got its contract in 0021) · spec `data:` overrides for M-03 / C-01 / D-01 / D-02 / K-01 / P-01 / A-06 · `useLayout(spec)` on the ~70 fixed-order pages · module layering (`admin/settings.ts` readers → `src/tenant/`, `staff/people.ts` + `audit.ts` → `src/data/`) · one `sessionPhase()` predicate · eslint + prettier, then stricter TS · slim `canvasSpecs.ts`, stop shipping 63 MB of screenshots in `dist/`, per-surface string tables
- **Add `remark-gfm`** (its own changelog entry, with the alternative rejected) and delete the pipe-table transform in `MarkdownViewer` (`preprocessMarkdown()` fences pipe tables into a ```table block because `react-markdown` alone cannot render them; the legal documents were written as lists for the same reason)
- **Left by 0021 (Conversación CRM y bandeja)**: the real **WhatsApp Cloud API webhook → `message_log`** (inbound rows with `direction inbound`, `external_id = wamid`, plus status callbacks sent → delivered → read → failed on the outbound rows; the queued rows released when quiet hours end) · **email inbound (IMAP or SES) → `message_log`** (`channel email`, `direction inbound`, threading by `In-Reply-To` onto the person's `user_id`) and the newsletter sender writing `source newsletter` rows per recipient · an **"Equipo" conversation** in S-06 for `user_id`-null rows (the teacher's substitution request lives only in M-05's log today) · **RLS for `message_log`** applied server-side from the `TableDef.rls` contract (desk roles read / insert / update `read_at`; the customer reads own non-internal rows; the webhook service role inserts inbound) · a per-conversation "assigned to" or "waiting on us" state once two people answer from the same number · `MessageComposer` templates (the M-05 approved templates as one-tap replies) · `scripts/screenshots.mjs --state=` so the open bell popover is captured by the pass (today `S-06/es-1280-popover.jpg` is a hand-made capture)

### Docs & content
- Visual pass follow-ups: per-screen density check of C-03, C-04, S-04, M-03 against their canvas artboards at real size; photography placeholders (`data-ph`) once real imagery exists; consider vendoring Inter/DM Sans woff2 for offline captures
- Canvas audit #9/#30: prune the 32 orphan dictionary keys (n_waiver, wv_sign, at_seg, at_nav, ph_qr, door_scan…) from `reference/canvas/strings.json` consumers
- Canvas audit #24/#25: register in D-02 the components screens use but the library lacks; fix D-02 copy counts (49 sections, 4-tab dock)
- Canvas audit #27: amend plan phase-3 text that still lists check-in and front desk (K-01) · #28: date the v0.1 decision entries · #33: add `data` and `roles` to the C-08b spec
- Resolve the owner decisions listed at `/#/manual/decisions` (ROADMAP §E) and update the chapters — **since 0018 the blocking ones are fields to fill in**: contact details (M-08a), rate card and cadence (M-08c), legal versions and map provider (M-08f), IVA on prices (M-08c); what remains a decision is pack validity, DIAN provider / legal issuer, the Wompi settlement account and the pause rules
- Remove the C-07b and 'C-14 / C-15' compatibility aliases from `scripts/gen-specs.mjs` (routes now use C-07b as the credits ledger and C-14/C-15 separately)
- Enrich `docs/pages/<code>.md` (generated skeletons) with the hand-written "Real vs mock" and section notes per page
- `scripts/screenshots.mjs` has no state parameter, so the collapsed sidebar / rail and the mobile drawer are not captured (0007 verified them by hand) — add `--state=` or a per-route hook
- Photography, video and the drawn contact map for the 12 `media_assets` slots (all `pending`) — the owner supplies these; the map provider is now a setting in M-08f (`none` until chosen) · decide 12 vs the 16 slots `docs/website-vision.md` plans (ROADMAP §F 34)
- **Visual follow-ups from the 0020 audit** (ROADMAP §F 32): one date / time format for admin tables · bilingual names for seed content shown as UI (template names, `cancel_reason`, expense concepts) · dark variant of the yellow accent surface · ~~HUB-01 card-grid composition~~ **0022: HUB-01 rebuilt around real previews, hue card families and the `--ui` scale band** · D-02 as per-tier routes · `scripts/screenshots.mjs --state=` for the rail and drawer
- `docs/screenshots/_before/0006/` (13 files linked from 0006): keep as history or delete per the documentation rule (ROADMAP §F 33)
- **ROADMAP §G — when nothing else is queued** (0018): SEO/OG + prerender · “next class in N minutes” widget · membership calculator · then the rest of `docs/website-vision.md`

### Decisions
- **0047 follow-up** · **Owner: the finance / payroll and legal WhatsApp numbers** (ROADMAP §E 48): M-08a → Contactos de WhatsApp por tema ships with roles and hours but no numbers, so payroll (S-03), the transfer receipt (C-05) and the Ley 1581 channel (C-26) still reach the front desk until Justin types who receives them (name, number, business days or always)
- **0047 follow-up** · **Owner: do Especiales get a direct coordination number?** Manual ch. 12 says reception does not quote and relays to coordination the same day; a `specials` number in M-08a would skip the relay (P-01, W-06, C-06). Also whether `sales` (the trial-class button on the classic home) stays with the front desk
- **0043 follow-up** · **Four owner decisions for AI distribution** (ROADMAP §E 44–47, `docs/reference/ai-distribution.md` §6): 44 server hostname and home (`server/` here or `imagine-os/mcp`) · 45 open-source the MCP server (Cursor Marketplace requires it) · 46 which accounts (paid Claude plan, OpenAI org verification, muse.ai/platform application, a DNS namespace) · 47 may an agent book when the pass would be charged, or does paying stay a person's click
- **0041 follow-up** · **Owner decision: exact hours / 6 vs 7 days (ROADMAP §E 8)** — the hours are now editable in M-08a and reach every screen (and Google, once connected); 06:00–20:00 Mon–Fri, 08:00–13:00 Sat, Sun closed are still assumptions
- **0032 follow-up** · **Three new owner decisions** (ROADMAP §E 37–39): is the Clase de Prueba free ("sin costo de entrada" vs 39,000 COP) · scope, prices and capacity rule of Experiencias Corporativas · drop "intención del día" from the next privacy-policy version
- **Open questions from Jas's review (0014), with Justin to forward** — recorded as ROADMAP §E 31–34:
  - **Sergio**: are teachers paid fortnightly or monthly? — **both are built since 0018**: the M-08c cadence switch drives M-09a (one or two runs per month), S-03 and the Finance range; Sergio picks
  - **Sergio**: does the Coordinator see the monthly total-revenue KPI in the admin panel?
  - **Lore**: do we need to store the customer's sex/gender? (no field today)
  - **Lore**: is there a group-session product for birthdays/events (book room + teacher + an add-on)? — **structurally answered in 0017**: a birthday or event group session is an **Especial** (room in S-05 + teacher + hand price in S-04, payout to payroll); whether it becomes a standard product with a fixed price is still Lore's call

### Spacing follow-ups (0037)
- Retire the legacy `--sp-1 … --sp-16` aliases in `tokens.ts` once no open branch uses them
- Lower the spacing baseline (63 since 0042): SessionCalendar and Timeline geometry, badge offsets onto tokens (~~ElementCursor art~~ done in 0042)
- Website `border-radius` px values in `sanctuary.css` (arch corners 2–5 px) to rem
- Run `npm run audit:spacing` across the remaining codes (C-03 … C-26, M-02 … M-11, D-*) and the full capture pass

### Repo hygiene
- empty10 placeholder: awaiting Justin's decision (reset to placeholder or delete)

## Doing

## Done

- **0057 · W-11 Coming Soon**: separate `/coming-soon` route and hub card, bilingual living brand artwork, motion control and confirmed Instagram link; full website/Latest default unchanged. Final integrated QA and deployment tracked with 0056.

### 2026-10-01 · The studio's verified content, FAQ and terms (0051 · v0.22.0)
- **0051 · Website verified content, W-10 FAQ, terms v2.0** (v0.22.0): Lorena's WEBSITE MODIF, FAQ and Términos y Condiciones, forwarded by Justin — "Please update the website … see if there's anywhere in the user manual or elsewhere this info applies to … make sure the FAQ section is beautiful" — hero, philosophy, classes band with seven `ClassArch` arches, "¿Cómo te quieres mover hoy?", About philosophy, W-07 / W-08 for the seven classes, W-05 the seven real teachers (monograms, no ratings), P-01 the launch price list, W-06 confirmed contact, **W-10 Preguntas frecuentes** (search, topic index, editorial accordion, live PriceTable), A-06 terms v2.0 with "Por definir" callouts.
- **Business model**: classes, never credits — `credits` → `class_ledger` with the 12-class package freeze (`frozen_from` / `frozen_until`, `src/data/packages.ts`), C-06 Paquetes, C-07 trial / individual, C-07b **Mis clases**, C-17 gift cards with quantity, C-22 retired; memberships dormant; policies in `src/tenant/policies.ts` (12 h, freeze 30 × 1).
- **Removed everywhere**: credits, self check-in (S-03 read-only roster + "Cerrar clase", `checkin.write` off the teacher role), Nequi / Daviplata, the payroll WhatsApp ask; rosters translate `paid_with` (closes the 0049 follow-up).
- **Docs**: ops manual 02, 03, 10, 11 rewritten and 19 more chapters (00, 01, 04–09, 13, 14, 16, 17, 19–21, 24–27) corrected, ES + EN, lint 0; prompt 0051, changelog 0051; page docs; `docs/website-assets.md`; reference uploads; schema.sql + data-model regenerated; seed v9.

### 2026-09-30 · Manual: read toggle, admin edits, phone figures (0050 · v0.21.3)
- **0050 · Read toggle top and foot, admin edits any section, phone figures at phone width** (v0.21.3): Justin's "need mark unread … top and bottom … Can a super admin edit right on the page … The mobile images are to big" — `ReadToggle` (new molecule) in the K-03 chapter head and in the new `ChapterFoot` (new molecule: "¿Terminaste este capítulo?", the toggle, "Siguiente →" in the role's list), `useMarkUnread()` + `manual.markUnread` (audit `manual.unread`), cover and team view update at once; `canEditSection`: admin / super admin every `##` section, coordinator its marked ones, no tag on unmarked sections, "{n} secciones editables por ti"; the request box links K-04 for leads and tells admins to edit directly; phone figures fixed (hashed build names defeated the `-390` check) at 360 px, centred, `--r-lg`, two adjacent ones in `FigurePair` (new organism) from 768 px; STYLE.md, surfaces, K-03 spec + page doc; before / after `docs/screenshots/_brand/manual-read-edit-figures-2026-09-30.jpg` (Opus 5.5: build)

### 2026-09-30 · Check-in row actions (0049 · v0.21.2)
- **0049 · Compact, clear row actions** (v0.21.2): Justin's "the button height for check in seems obnoxiously large, and novino isnt clear its a button" — S-02 Esperados rows now carry a tonal `check` "Check-in" and an outline `user-x` "No vino" of one height (36 px visible, 44 px hit area through a transparent `::before`, no shadow) in the new `RowActions` molecule; Llegaron outline "Deshacer", No vinieron tonal "Check-in", Lista de espera tonal "Dar cupo", walk-in tonal "Entrar"; the "Esperado" / "En espera" chips hidden where the section says it (`RosterRow showStatus`); the S-03 attendance roster gets the same pair; `Button` `tonal` + `outline` variants, `--h-ctl-sm` in D-01, the dense-row exception in the ui-spacing skill and `docs/design-system.md`, the audit counts `::before` hit areas; before / after `docs/screenshots/_brand/checkin-row-actions-2026-09-30.jpg` (Opus 5.5: build)

### 2026-09-30 · Hub card: Mensajes transaccionales (0048 · v0.21.1)
- **0048 · Mensajes transaccionales card** (v0.21.1): HUB-01 team band, after CRM — enters as Valentina (coordinator) at `/admin/emails` (M-04), secondary link "WhatsApp →" enters as the same user at `/admin/whatsapp`; mail icon on the inbox hue (page-only `CARD_UI.hue`, no new token); hub map 16 experiences (M-04 / M-05 moved from `admin` to `messages`, group "Mensajes"); `hub.enterAs` enum + surfaces.md; HUB-01 captures and thumbnails re-shot, which closes the 0045 card "Stale HUB-01 capture" (Opus 5.5 build, Fable 5.1 direction)

### 2026-09-30 · WhatsApp contact routing by intent (0047 · v0.21.0)
- **0047 · Contacts by topic** (v0.21.0): the 16-site inventory (`docs/reference/whatsapp-handoffs.md`; two misrouted: S-03 payroll, C-26 legal), `StudioSettings.contacts` with nine intents (name · WhatsApp · role · `always` / `studioHours` / `businessDays`), the pure `resolveContact()` in `src/tenant/contacts.ts` with the hours + holiday fallback and the "Respondemos el próximo día hábil (…)" note, `useWhatsappLink()` as the one reader, all 16 handoffs rewired by intent (W-02 / W-06 messages as string keys, the C-15 empty-name message fixed, S-03 says who receives the question, the manual's `{{tenant:contact}}` lists every configured contact), the M-08a card "Contactos de WhatsApp por tema" (five columns → two → one, live "ahora mismo llega a"), `settings.contacts.update` and `contact.whatsapp` (59 actions), `npm run test:contacts` (26 checks), D-0022, manual ch. 13 / 16, ROADMAP §E 48 (Fable 5.1: audit, shared code, docs)

### 2026-09-29 · Tables calendar and timeline (0046 · v0.20.0)
- **0046 · M-03 calendar and timeline views** (v0.20.0): `CalendarView` (month / week / agenda, keyboard, create on an empty day) and `TimelineView` (bars, lanes, zoom day to quarter, today line) organisms in D-02, the Fecha / Hasta date picker, six seeded calendar and timeline views (`SEED_VERSION` 8), rename and delete of saved views, six new `tables.*` actions (17 in all, 57 in `actions.json`), `?date=` `?mode=` `?zoom=`, and the `MockProvider.list()` copy fix; closes Pass B **B2**, the 0044 card "saved views cannot be renamed or deleted", and half of B6 (Opus 5.5 build, Sonnet 5.5 docs and integration, Fable 5.1 brief and review)

### 2026-09-29 · Developer brief (0045 · v0.19.1)
- **0045 · developer brief** (v0.19.1, docs only): `docs/reference/developer-brief.md` — the app and its deploy, extension points, roles and permissions, the 57-table data model and the provider seam, the multi-tenant rule, the machine surfaces (51 actions, `actions.json`, `hub-map.json`, the CLI, no HTTP API), MCP vs WebMCP, the integrations (Google Business Profile body, developer keys, hours and holidays, Supabase, Wompi, WhatsApp, email), the AI distribution plan, how we document, the quality bar, what is next and a screenshots table; plus a shareable report page with the captures (Opus 5.5)

### 2026-09-29 · Tables system redesign (0044 · v0.19.0)
- **0044 · M-03 tables system redesign** (v0.19.0): human labels (`src/data/labels.ts`, ES/EN), a toggleable sidebar (expanded / rail / phone sheet, pinned, recent, search), grid / list / gallery / kanban / graph views with filters, multi-sort, group by, hidden columns and JSON / CSV export, saved views as `table_views` rows (57 tables), row drawer with related rows, 11 `tables.*` actions, real `M03` spec; the schema is the ontology (D-0020), views are rows and realtime is Supabase first (D-0021); plan `docs/plans/tables-system.md`; calendar and timeline were Placeholders until B2, wired in 0046 (A1–A8 done: Opus 5.5 build, Sonnet 5.5 page doc and integration, Fable 5.1 plan and decisions)

### 2026-09-29 · Machine surfaces audit, actions.json, AI distribution plan (0043 · v0.18.0)
- **`public/actions.json`** (schema `hoy.actions/1`, 40 actions, 11 permissions, 16 declaring pages) written by `npm run actions` (`scripts/gen-actions.mjs`, Vite SSR loader) on every build; `window.__hoyos.actionsUrl`
- **Surfaces audit**: `docs/reference/surfaces.md` checked against the code and re-dated v0.18.0 (page column, route roles, merged actions table, `capture-dates` row, 92 pages)
- **AI distribution plan (D-0019)**: `docs/reference/ai-distribution.md` — MCP vs WebMCP, the marketplace landscape, abilities by audience, one multi-tenant MCP server over the actions vocabulary, twelve dependency-bound steps, four owner decisions

### 2026-09-29 · Quiet site cursor (0042 · v0.17.1)
- **ElementCursor rebuilt** (D-02 atom, mounted by `SiteShell` on W-01 … W-09, P-01, A-06): ink dot (`--color-ink`) + trailing primary ring (`--color-primary`, rAF lerp 0.22), ring 28 → 40 px over links / buttons, 22 px pressed, hidden over reading text; a class tone only tints the ring (60 % tone dot); glows, gradients and per-tone shapes removed; surface hairlines keep it visible in light and dark
- Meta: new description, states and real `usedBy`; `ElementCursor.css` out of the spacing baseline (71 → 63)

### 2026-09-29 · Hours, holidays, Google Business Profile, developer keys (0041 · v0.17.0)
- **Hours read everywhere (D-0016)**: `useOpeningHours()` (M-08a weekly + `hours_overrides` + tenant.ts fallback) feeds the site footer, W-06 (today line + next exceptions), C-25 (new hours row), the manual's `{{tenant:hours}}` and a `LocalBusiness` JSON-LD in the website shell; pure readers in `src/tenant/hours.ts`, `npm run test:hours`
- **M-08g Holidays & special hours** (`/admin/settings/hours`, admins + coordinator via `hours.write`): import the Colombian holidays (`src/tenant/holidays.co.ts`, Ley Emiliani, `npm run test:holidays` = the 18 dates of 2026), DataTable + Drawer with validation, 30-day preview, audited writes
- **M-08a**: today's line, links to M-08g / M-10a instead of the "holiday calendar arrives later" note, per-day time labels, Save blocked on close ≤ open
- **M-10a Google Business Profile (D-0017)**: status, the exact `locations.patch` body with Copy JSON, setup split "Platform, once" / "This studio, per location", Copy hours for Google + link; Connect / Push are Placeholders; M-10 gains the card, an Open button and the developer-keys notice
- **D-07 API keys (D-0018)**: `api_keys` table (prefix + SHA-256, never the key), create → shown once, rotate with 24 h grace, revoke, audited; `api_keys.read` / `.write`
- **Actions**: first admin actions (`settings.hours.*`, `integrations.google.*`) and `dev.apiKeys.*`; icons `copy`, `eye`, `eye-off`, `refresh-cw`, `store`; SEED_VERSION 6

### 2026-09-29 · Practice analytics (0040 · v0.16.0)
- **Research → proposal** (`docs/reference/analytics.md`): what members vs teachers vs the club track in on-location studios, with sources; one label per number, a weekly goal-based streak with slack, milestones, no comparison between members, teachers against the studio average; the thresholds M-12 uses; four open questions for Justin (ROADMAP §E 40–43); decisions D-0014 (derived from raw tables, events record moments) and D-0015 (the streak rules)
- **Analytics core**: `src/data/analytics.ts` (`practiceStats`, `studioStats`, `teacherStats`, `suggestGoal`, `atRiskBand`; visits dated by the session, Mon–Sun weeks in America/Bogota) + `useAnalytics.ts` hooks; `npm run test:analytics` (all checks pass) · **per-week goal history** (D-0015, rule 8): `usePracticeStats` passes every `practice_goals` row and each past week is graded against the goal in force when it closed (latest row with `starts_on` ≤ that Sunday; earlier weeks use the first goal), so raising a goal never rewrites the past — proven for raise / lower / same-day double change / clear
- **Two tables** in the new *Práctica y analítica* group (52 → 54): `practice_goals` (one active row per person, history kept, `cadence` reserves `month`) and `activity_events` (append-only: goal.set, milestone, streak.saved…); `supabase/schema.sql` and `docs/data-model.md` regenerated; `SEED_VERSION` 5; the demo member gets seven weeks of real morning classes (6 met, one rest week), an ended 1 / week goal under her active 2 / week one, six more members' goals, her events
- **Five molecules** with metas (75 → 80 in D-02): `WeekDots`, `StreakBadge`, `GoalPicker` (manual activation: arrows move focus, Enter / Space / tap save once), `Heatmap`, `MilestoneList`
- **C-01**: the `StatsRow ×3` section is the practice block — Clases tomadas este mes (+ reservadas próximas), Semanas seguidas (stamp), Membresía / Clases restantes en tu plan, the week as dots, the goal asked inline once, a one-time "¡Clase número N!" toast, link to C-27 · **C-27 Tu práctica** `/app/practice` (new): week ring + dots, the run and its rule, the month, "Últimas {n} semanas" from the first class (≤ 12), milestones, favourites, the goal, privacy notice · **C-22** shows the same month number · C-19 / C-25 link rows
- **M-12 Analítica de práctica** `/admin/analytics` (new; same roles as M-01, no revenue while §E 32 is open): fill / attendance / no-shows / active, weekday × hour heatmap, second visit, at-risk 14 / 30 / 60 / 90 as who-to-call → M-06, by modality, by teacher, recent milestones, credits expiring; range 7 / 30 / 90 · **M-06** read-only Práctica tab · **M-01** link · **S-03** "Mis números · 30 días" against the studio average, rating hidden under 5 reviews
- **Four actions**: `app.openPractice`, `app.setGoal`, `analytics.setRange`, `analytics.openMember` (`docs/reference/surfaces.md`, 0040 delta); routes 101 → 103, codes 87 → 89
- **Docs**: prompt 0040, changelog 0040, `reference/analytics.md`, D-0014 / D-0015, page docs C-27 and M-12 (new) + C-01, C-22, M-06, S-03, M-01, README, ROADMAP §A / §E 40–43, architecture "Analytics seam"; ops manual unchanged (no chapter describes the home stats card; `lint:manual` 0 violations) · screenshots and the QA matrix: the Sonnet 5.5 pass after this entry

### 2026-09-29 · The four movements retired (0039 · v0.15.0)
- **Decision**: D-0013 — Enraíza / Fluye / Arde / Libera are gone everywhere (not public, not internal, not as data keys); it supersedes the "internal label" resolution of ROADMAP §E 22 (0032) and the D-01 `movements` set
- **Customer app (C-02, C-02b, C-03, C-08b, C-13)**: the "Sobre HOY" article rewritten from the owner's source text; schedule chips and legend are the visible modalities ("Clases / Classes"); class rows and dots use the class tone
- **Website (W-01, W-02, W-03, W-04, W-07, W-08)**: hero "varias formas de moverte", gallery eyebrow "01", W-03 grouped by the five classes, W-04 `?modality=<slug>`, W-08 loses the "Movimiento" fact, the four stone images deleted
- **Data and tokens (D-01, D-02, M-02, M-02d, M-08f, S-05)**: `classTones` (moss, river, clay, sun, sage, slate, plum), `--tone-*`, `modalities.tone` and `media_assets.tone`, the `intentions` table dropped, the `publicNaming` setting removed
- **Manual (ES + EN)**: chapter 02 section 7 removed; chapters 05, 07, 17, 19 and 27 reworded; `lint:manual` 0 violations
- **Docs**: page docs, design system, ROADMAP §E 22 superseded and backlog 5 / 7 reworded, website assets / validation / vision, D-0013, `docs/changelog/0039-retire-movements.md`

### 2026-09-29 · Spacing and sizing standard (0037 · v0.14.0)
- **D-01**: one 4 px scale in rem (`--sp-2xs … --sp-5xl`), semantic tokens (`--gap-inline`, `--gap-control`, `--stack*`, `--block`, `--card-pad(-lg)`, `--section(-hero)`, `--gutter`, `--grid-gap`, `--row-pad`, `--btn-pad-x`, `--measure`) with 768 / 1280 steps, radii in rem; D-0012
- **Guard**: `npm run lint:spacing` in the build, baseline 71 (was 774); `npm run audit:spacing` measures a live page
- **Skill**: `.claude/skills/ui-spacing/SKILL.md`, pointed at from CLAUDE.md
- **Sweep**: website on tokens and rem (4K hero, one section apart), hub double scaling removed, S-02 aside at 3840, page head → first block 24, P-01 alignment, capacity meter gap, rows / buttons / chips / cards on one rhythm, M-08a hours on a phone
- **Evidence**: `docs/screenshots/_spacing/*-2026-09-29.jpg`; captures for 24 codes regenerated (reduced motion, so website sections render)

### 2026-09-29 · Manual QA pass (0038 · v0.13.4)
- **Screenshots out of date → done**: full `npm run screenshots` + `npm run thumbnails` dated today (840 refreshed, +9.2 MB); stale badges 23 → 1 (`A-05`, retired); 0 on the cover and chapters 01, 04, 09, 21, 24, ES and EN
- **`npm run lint:manual`**: STYLE.md as 12 mechanical rules over 28 chapters × 2 languages, report mode in the build; 0 violations, empty baseline
- **Small fixes**: chapter 22 no longer prints `{{policy.*}}` (`plainDescription()` in `LiveBlock`); `guest_allowance_note` is provisional and pending the owner; CLAUDE.md lists 11 roles; P-01 shows the "En camino" corporate card
- **QA record** `docs/qa/manual-2026-09-29.md` with "Para Lorena": role lenses (8 roles × 390 / 1280 × ES / EN), smoke (edit / restore / read / sign / request) and keyboard walk, all passing

### 2026-09-29 · Operations manual content (0032 · v0.13.3)
- **K-03 plain language**: all 28 chapters rewritten ES-first with an EN mirror (56 files) — tú, short sentences, qué hacer → qué decir → qué revisar; screen codes moved into 47 `EN HOYOS` / `IN HOYOS` boxes per language; every live block and figure kept
- **Style guide**: `docs/ops-manual/STYLE.md` (the register for hand and prompted edits)
- **Directives in place** (0031 contract): `{{audience}}` + a "Para:" row per chapter, 32 editable sections, 18 studio-rule cards (13 keys appended to `studioPolicies.ts`), 8 role passages, 6 source embeds, 8 training blocks (marketing and developer included)
- **Reconciled**: six revenue lines (`corporativo` coming soon in `pricing.ts`, no prices), 16 mats, disciplines public / movements internal, Pausas Ilimitadas stacks, guest included, brand manual (manifesto, 4 keywords, 5 traits, logo, palette, type) in 19–20, A-05 gone
- **K-04 decisions**: closed 2, narrowed 6, added 3 (27 → 28); ROADMAP §E 1 and 22 closed with source and date, 37–39 added

### 2026-09-29 · Round theme toggle (0035 · v0.13.2)
- **Regression**: the DesktopShell theme toggle (28 × 44) and the bell (32 × 44) were ovals since 0025's 44 px control floor stretched their height, not their width (not 0030)
- **Shared fix**: `.ctl-round` in `global.css` (width = height = `--h-ctl`, `aspect-ratio: 1`, `border-radius: 50%`) on every theme toggle (DesktopShell, website V1/V2 + motion button, AuthShell, hub band) and `NotificationBell`; the site hero's phone motion button too
- **Phone dev bar**: below 480 px the spec chip replaces the wordmark; below 380 px the dev switch leaves the bar
- **Evidence**: `docs/screenshots/_brand/theme-toggle-round-2026-09-29.jpg`; 44 × 44 measured at 390 + 1280, light + dark on W-01, S-02, HUB-01, K-03, A-02; captures regenerated

### 2026-09-29 · Real phone and address (0036 · v0.13.1)
- **tenant.ts**: WhatsApp +57 312 776 5000, address Cl. 7B Sur # 29C-100, El Poblado (Santa María Tenis Club, from the club's site), location 6.19281 / -75.56535 + Google Maps link
- **M-08a**: four per-field "confirmed" switches (WhatsApp, address on; email, Instagram off) and an "N por confirmar" badge; `pendingFields` / `pendingSuffix()` in `useContact()`
- **Consumers**: site footer (address links to the map), W-06, MapSlot, C-25 ("Cómo llegar" row), C-26 controller paragraph, A-06 legal tokens, M-04 email footer + envelope, manual `{{tenant:contact}}`
- **Evidence**: W-06 and M-08a recaptured ES + EN, 390 + 1280, light + dark

### 2026-09-29 · The operations manual as a staff LMS (0031 · v0.13.0)
- Roles `marketing` (Camila Herrera, `/admin/content`) and `developer` (Julián Mesa, `/dev`, dev mode); permissions `comms.write`, `manual.edit`, `manual.train`
- K-03: lens `?as=<role>`, "Tu manual" tiles + ProgressRing, dimmed grid, level chip, "Marcar como leído", Equipo view, `{{training:<role>}}` sign-off
- K-03: editable sections (`{{editable:…}}`, `manual_overrides`, history, restore, suggestions), `{{studio:…}}` text policies, "Pedir un cambio"; K-04 Decisiones y solicitudes
- K-05 Documentos fuente (`public/source/`, `docs/source/index.json`, `SourceEmbed`, `{{source:<id>}}`); `{{for}}`, `> EN HOYOS:`, `{{audience}}` directives; capture dates + stale badge on figures
- Icons per part and chapter (`chapterIcons.ts`); hub cards "Kit de marketing — próximamente" (`comingSoon`) and "Documentos fuente"; five new tables; ten `manual.*` actions

### 2026-09-29 · "How do you want to feel today" off the website (0034 · v0.12.2)
- **W-01**: the `Movements` section removed from V2 (heading "¿Cómo quieres sentirte hoy?", four stone links) and V1 ("Cuatro movimientos"); id retired from `siteSpecs.home.layout` (layout editor); chapter eyebrows renumbered 01 / 02
- **Cleanup**: `site.new.movements*`, `site.new.chapter1`, `site.movements.*`, `site.mv.*` strings and the `.sanctuary-stone*` CSS removed; movements stay as labels (class meta, W-04 legend filter, W-03, W-07, W-08)
- **Evidence**: W-01 recaptured ES + EN, 390 + 1280, light + dark, plus 390 full-page and thumbnails

### 2026-09-29 · Wordmark in website headings (0033 · v0.12.1)
- **Asset**: `public/brand/hoy-wordmark.svg`, the script traced from the brand manual's artwork (raster in the PDF) — one path, `currentColor`, `<symbol id="hoy">`; metrics in `tenant.brand.vector`
- **Atom**: `Wordmark` `vector` / `inline` + `tone`; `brandHeading(text)` swaps the standalone word HOY in a heading; D-01 `--wm-inline-h` 1.2em, `--wm-inline-gap` 0.12em, `--wm-min-w` 120px; baseline-aligned, `role="img"` `aria-label="HOY"`, prints blue
- **Places (V2)**: header + footer brand links (every `#/site` route) · W-02 h1 "Sobre HOY" · W-07 panel h2 "Todo empieza HOY." · W-08 panel h2 "La vida es HOY."; paragraphs, buttons, nav, eyebrows, the W-02 lead / pull-quote, `<title>` and the adverb "hoy" stay text
- **Evidence**: `docs/screenshots/_brand/wordmark-in-headings-2026-09-29.jpg` (before / after, light / dark, 1280 / 390); W-01/02/07/08 recaptured ES + EN, 390 + 1280, light + dark
### 2026-09-29 · Icons + the daily intention retired (0030 · v0.12.0)
- **Icon system** (D-0008): `lucide-react` behind `Icon` (29 → 135 names in five groups), D-01 `--icon-*` tokens, `renderIcon()` for the Button / ListRow / Card / EmptyState / Notice / NavBar slots, `nav.icon: IconName` (Opus 5.5 build, Fable 5.1 direction)
- **Dock + top bar** (C-*, S-03): distinct glyphs, active pill + heavier stroke + semibold label, 44 px targets, focus ring
- **Front desk / admin**: sidebar glyph per entry; labelled icons on S-01 quick actions, S-02 check-in / no-show / undo / promote / walk-in, S-04 charge, S-05 room actions, S-06 channels, M-06 inbox link; icon-only controls carry aria-label + title
- **Settings** (M-08a…f): rail glyph per group, glyph tile per section card (`Card icon`)
- **A-05 retired**: `/app/intention` → `/app` (module `redirects`), C-01 card + sort removed, sign-up lands on Home, C-02 link gone, A-05 flags no longer seeded (`src/specs/retired.ts`), `intentions` deprecated (history), strings deleted
- **Follow-ups (Backlog)**: legal privacy text still lists "intention of the day" (change with the next legal version) · MediaSlot placeholder glyphs and the website's own icons are not on the set yet · capture the remaining desktop pages (their sidebars changed) in the next full screenshot pass

### 2026-09-29 · Hub map sample routes (0029 · v0.11.2)
- **`pages[].sampleRoute`** (additive, contract stays `hoy.hub-map/1`) on the 9 template pages, from `HUB_SAMPLE_ROUTES` in `src/hub/hubMap.data.ts`; the generator fails the build on a template page without a sample
- **Live picks**: the seed reseeds daily with date-based ids, so class / checkout / booking / change / rate / waitlist / payout samples use the reserved `sample` segment, which `src/app/SampleRoute.tsx` resolves to today's record (`src/hub/sampleIds.ts`); legal `terms` and site `hot-yoga` are literal and seed-checked
- **`npm run hub-map:check`** (`scripts/check-sample-routes.mjs`): 9 / 9 samples open real pages in a same-origin iframe (resolved route, > 20 words, no not-found, no ⟨key⟩)
- **Host follow-up**: aluzina W-05 and between-gigs embed `sampleRoute ?? route`

### 2026-09-29 · Hub map page groups (0028 · v0.11.1)
- **aluzina client hub desk consumes hub-map** (imagine-os/aluzina, from the 0027 follow-ups): the W-05 desk at https://imagine-os.github.io/aluzina/#/founder/clients/hoy/hub lays hoy out on mats per client role from `hub-map.json` (three lenses, dev page D-16)
- **`pages[].group`** (additive, contract stays `hoy.hub-map/1`): `{ id, label, order }` from `HUB_GROUPS` + `HUB_GROUP_RULES` (route prefix → group, longest prefix wins) in `src/hub/hubMap.data.ts`; the generator fails the build if a page matches no rule
- **17 groups**: app book 10 / pay 9 / account 13 / auth 5; site 10; teach 1; desk 3 / inbox 1 / pos 1; admin 9 / content 7 / crm 2 / finance 4 / tables 1; dev 8 / docs 1 / manual 2

### 2026-09-29 · Hub map for aluzina, between-gigs and the standalone hub (0027 · v0.11.0)
- **Contract** `hoy.hub-map/1` (`src/hub/hubMap.types.ts`, `docs/reference/hub-map.md`): product, embed pattern, 9 roles, 13 experiences, 87 pages, 9 tools, 3 lens hints
- **One source**: `src/hub/hubMap.data.ts` (pure data); HUB-01 renders its bands, cards and tools from it and derives their strings from it; `hubMap.check.ts` guards the copied role facts
- **`npm run hub-map`** (first build step, Vite SSR loader, no browser, validated, deterministic) → `public/hub-map.json`; **`copy-shots.mjs`** (last build step) → `dist/hub-map/shots/` (854 files, 61.6 MB, under the 80 MB budget)
- **Tall website pages**: `npm run screenshots -- --full` → W-01…W-09 `{es,en}-390-full.jpg`
- **HUB-01**: `hub.map` action, `window.__hoyos.hubMap`; captures regenerated for v0.11.0

### 2026-09-28 · Phone calendar, teacher width, mat grid (0026 · v0.10.1)
- **Calendar on phones (C-02, C-02b, W-04)**: under 900 px the Week is a snap-scrolling strip of seven 44 px day chips with movement dots and the Month a compact 7-column grid of 44 px cells, both above the selected day's `ClassRow` list; no horizontal scroll region (QA I-05). C-02 movement chips wrap under 480 px of column (QA I-04). Desktop grids unchanged
- **Teacher app (S-03)**: no horizontal overflow at 390 · 768 · 1280 · 1920 · 3840; the "too wide" was the 75rem app container from 900 px — new D-01 `--w-teach` (60rem) caps the teacher column
- **Mat grid (`MatPicker`, C-04 / W-04)**: columns from the room's measured width and the tenant row length (`matColumns()`: 8, 4 or 2 per line), one grid per physical row with a "Fila n · mats a–b" label when it wraps, rem mat heights that beat the global button floor; 4 × 4 at 360–768, 2 × 8 from 1280, never clipped
- Captures for the five codes at 360 · 390 · 768 · 1280 · 1920 · 3840 (ES + EN); `checkedAt` on C-02, C-02b, C-04, W-04, S-03

### 2026-09-28 · Responsive app shell (0025 · v0.10.0)
- **No phone mockup on desktop (D-0006)**: `AppShell` (customer + teacher) replaces `PhoneShell` — content column + sticky bottom dock below 900 px, full-viewport page from 900 px with the primary nav in the top bar (`NavBar variant="top"`), content in a centred `--w-app` container, document scroll, no bezel. `withShell()` honours `RouteDef.layout`. The bezel survives only in the hub's `DeviceFrame` (HUB-01 previews, D-06 simulator)
- **One flow site → sign-in → app**: `AuthShell` (A-01…A-03, C-21, E-04) on the same `TopBar`, 480 → 576 px column; `Drawer side="bottom"` is a centred dialog from 900 px (W-04 reserve, C-04 success, C-06 confirm, C-08b change, C-02 filters)
- **Desktop pass on the reserve and register pages**: `SplitSections` two-column layouts on C-01 (greeting across; next class + today | membership, notice, quick actions, stats), C-04 (class + mat | payment + confirm), C-08 (countdown + class | reminder, actions, calendar, policy); C-06 shows both cycles side by side and reads `?plan=` from W-05; A-05 four columns; C-02 filter chips wrap
- **`--ui` band on every surface (D-0007)** and one `BREAKPOINTS` list (360 · 390 · 768 · 900 · 1280 · 1920 · 2560 · 3840) for CSS, `useMinWidth()` and `PageSpec.checkedAt`; spacing and layout tokens in rem
- **44 px control floor** (`--h-ctl`) on every interactive control in the app, auth, staff and hub shells
- **Website fonts via `<link>`**: the Sanctuary `@import` that blanked the website when Google Fonts was unreachable is gone
- **WebMCP actions**: `app.reserve` (C-02), `app.pickMat` + `app.confirmReservation` (C-04), `app.choosePlan` (C-06), `app.goHome` + `app.openSchedule` (C-01, C-02, C-04, C-06, C-08), `auth.signIn` (A-02) — declared in the specs, mounted with `useActions()`, listed in `docs/reference/surfaces.md`
- **Docs**: prompt + changelog 0025, D-0006 / D-0007, page docs for C-01, C-02, C-04, C-06, C-08, A-02, A-03, A-05, W-04, S-03 (≥ 900 px layout), README / ROADMAP §A / kanban at v0.10.0, surfaces re-dated
- **Screenshot matrix 360 → 3840** (`scripts/screenshots.mjs --widths --pages --dark`, 138 captures) and the QA matrix `docs/qa/responsive-2026-09-28.md`
- **Review and QA fixes** (`c62033e` … `9772100`): chip dot colours restored (blocker); D-01 `m-deep` (opaque dark top bar) and `fs-floor` (captions ≥ 16 px from 1920 px); 44 px brand link and ES/EN; Drawer focus trap + scroll lock + stable close; C-04 confirm bar static from 900 px and opaque below, 44 px mats (rows wrap 8 → 4 under 380 px); one calendar on C-02; `SplitSections` renders no empty column; site header fits at 360 / 390, scales with `--ui`, 44 px controls; W-05 teacher grid whole-word wrapping. Deferred QA items are the "QA 2026-09-28 follow-up" cards above

### Website V2.1 to V2.3 back-fill (0024 · v0.9.4)
- Docs back-fill only, written 2026-09-28: prompt and changelog 0024 for the four commits that shipped without one (`fc2d1d3` V2.1, `89b8375` V2.2, `6465f8a` V2.3, `d4c567e` calendar polish); the prompt text was never recorded, so the entry quotes the commit messages and says so
- Shipped by those commits (already live): elemental cursor, membership cards (P-PLANS), shared day/week/month `SessionCalendar` and CMS class photos (P-SCHEDULE, C-02), 16-mat checkout and booking confirmation (C-03, C-04, C-08), 19 sample videos (3 ambient + 16 living) and 8 portraits (W-01, W-02, W-04, W-07, W-08), calendar typography and upcoming-week default

### Hub home redesign (0022 · v0.9.0)
- **HUB-01 rebuilt around real previews**: brand band (wordmark, `v0.9.0` badge, language, theme, wireframe + dev toggles, cream focus ring) with the hero (eyebrow · h1 · lead · brand tagline · `BreathingRings` under a radial mask); a floating session bar over the band edge (`RoleSwitcher`, "Reportar un problema" as a `Placeholder`, the `Ctrl + .` hint); four 3fr/9fr bands — Fuera del estudio (customer app featured with a phone preview, website, teacher app) · El equipo (recepción, bandeja, caja, admin, CRM, finanzas) · Construcción y pruebas on a tinted lane (manual, docs, kanban, dev tools) · Hub de pruebas (nine tool cards); a live `<dl>` stat strip (101 routes, 87 codes, 48 tables, 66 components, 8 actions, 28 chapters)
- **`PagePreview` (organism)** — the thing Justin asked for: a hue-tinted idle tile, the real capture from `docs/screenshots/<code>/thumb-*` (eager, `object-fit: cover`, hidden on error), and the running page on top; `LivePreviewBudget` gives six live slots in document order to cards an `IntersectionObserver` reports on screen, and live frames are off inside a frame, with `live=0`, and under `navigator.webdriver` so a capture is deterministic
- **`DeviceFrame` (organism)**: the real route in a same-origin iframe at phone 390×844 / tablet 768×1024 / desktop 1280×800 / TV 3840×2160, scaled by a `ResizeObserver`, never wider than the device, `maxScale` for 4K
- **`frameSession.ts`**: a framed page runs as the role, language and theme its hash asks for by shadowing `hoyos.session` / `hoyos.lang` / `hoyos.theme` and swallowing writes — a preview never touches the tester's session
- **Actions registry `src/actions/`** (the WebMCP surface): `PageSpec.actions` declares, `useActions()` mounts, `listActions()` lists every declared action across all routes with a live `mounted`, `run(id, params)` → `{ ok, message }`; published as `window.__hoyos.actions` (getter) and `window.__hoyos.run`; HUB-01 declares and wires eight; the inspector shows them as "Acciones (WebMCP)"
- **Components** (61 → 66, all with metas): `Icon` (29 inline stroke glyphs — the literal ◎ ✦ ▦ are gone), `Placeholder` (the "not wired yet" rule as a component: tooltip, `aria-describedby`, click / Enter blocked in capture, toast, dashed outline in dev mode), `Toast` + the `src/app/toast.ts` bus and one `<Toasts/>` in `App.tsx`, `DeviceFrame`, `PagePreview`
- **D-05 `/dev/canvas`** (new): 83 pages as capture tiles grouped by surface, name + code + route, four-step zoom driving the grid's minimum track, click or Enter opens the page, static captures only
- **D-06 `/dev/simulator`** (new): device `SegmentedControl`, route / role selects, language and theme, one big `DeviceFrame`, "Abrir en pestaña", the whole view in the hash query
- **Scale and inputs**: hub-scoped `--ui` (1 · 1.125 ≥1920 · 1.375 ≥2560 · 1.75 ≥3840) multiplied into type, medallions, padding and grid width; breakpoints 1280 / 1100 / 900 / 700 / 600 / 480; hover lift only on fine pointers; every control ≥ 44 px with a visible focus ring, DOM order = tab order
- **Tokens**: `hues` (13 families) → `--hue-*` plus `--hue-sat` / `--hue-lum` per theme, mixed into the shared surfaces with `color-mix()`; no colour invented off D-01
- **Bundle**: the ~490 thumbnail URLs live in `src/app/thumbnailMap.ts` and are imported dynamically (31.7 kB chunk); `__COMPONENT_COUNT__` is a `vite.config.ts` define instead of a lazy glob that made 86 chunks. Entry chunk 829 → 889 kB
- **Docs**: prompt + changelog 0022, **`docs/decisions.md` (new, append-only)** with D-0001…D-0005, **`docs/reference/surfaces.md` (new)** — WebMCP / CLI / API, `docs/pages/{HUB-01,D-05,D-06}.md`, README map, architecture (Actions registry · Frame session), README + ROADMAP §A + version 0.9.0
- **Thumbnails**: `npm run thumbnails` (`screenshots.mjs --thumbs`) writes `thumb-<lang>-desktop[-dark].jpg` 640×400 and `thumb-<lang>-phone[-dark].jpg` 195×422 at q64, one route per page code

### Conversación CRM y bandeja de mensajes (0021 · v0.8.0)
- **`message_log` is the unified communications record**: `direction` inbound · outbound · internal, `source` manual · automation · newsletter · system, `subject`, `body`, `sent_by`, `read_at` / `read_by` (the team's read receipt), `external_id` (provider id for the webhook); `channel` + `note`, `status` + `received`; bilingual description and a `TableDef.rls` contract (21 of 48 tables); `npm run sql` regenerated; `MockProvider.SEED_VERSION = 2` reseeds an old browser copy
- **Seam** `src/data/comms.ts`: `useMessaging()` (WhatsApp / email / note / mark read; WhatsApp `queued` during M-08 quiet hours, email never), `useConversations()`, `useUnreadInbound()`, `useAuthorOf()`, `toSummary()`; `formatRelative()` in `format.ts`; notes moved from `audit_log member.note` rows into the thread (the audit trail keeps the action without content)
- **Components** (56 → 61, all with metas): `ChatBubble` (member left · studio right · automation dashed · email card with source badge · internal note · unread ring · queued / failed), `MessageComposer` (WhatsApp · Email · Nota, subject, Ctrl+Enter, blocked WhatsApp, quiet-hours hint, read-only), `InboxPopover` (bell + dialog with five unread threads → S-06), `MessageThread` (day separators, system lines, scroll pane), `ConversationList` (search, filters, unread first, compact); `NotificationBell` `expanded` / `controls`; `Timeline` exports `TIMELINE_ICON`
- **M-06 CRM**: tabs Conversación (default, unread count) · Reservas · Pagos; filter chips Todo · WhatsApp · Email · Notas · Sistema; the thread merges messages with bookings, payments and consents as system lines; composer gated by `members.write`; opening the tab marks inbound read; **Abrir en bandeja** → S-06; the drawer, the Notes tab and the audit-note reader are gone
- **S-06 `/staff/inbox[/:id]` Bandeja de mensajes** (new code, desk roles, nav order 1.5): conversation list (search, Todos · No leídos · WhatsApp · Email, unread first) + thread pane with the person's header (plan, WhatsApp verified, masked phone, **Ver ficha CRM** → M-06), the scrolling thread and the composer; the URL is the selection; selecting marks read; list-then-thread below 900 px
- **Bell**: counts inbound rows with `read_at` null for every role that can open S-06 and opens the popover (was: own rows, WhatsApp roles only). **S-01**: "Mensajes sin leer · en N conversaciones" tile, "Mensajes recientes" card (five, unread first, Ver todo), "Abrir bandeja de mensajes" quick action
- **Insert sites** write the new shape: M-05 / M-04 test sends (`outbound · manual`, rendered body, `payload.test`), S-04 receipt (`outbound · system`, invoice number), teacher substitution request (`inbound · system`, `user_id` null — stays out of the inbox)
- **Seed** `seed/messages.ts`: 57 fixed rows + 12 automation rows = 69 messages, 17 conversations, six unread inbound across five people within 48 h, anchored to local clock hours; Juliana has the richest thread
- **Docs**: prompt + changelog 0021, `docs/pages/S-06.md` (new) and M-06 / S-01 / M-04 / M-05 updated, manual 13 rewritten around the thread, the composer and the inbox (+ 04, 24, 26) in ES and EN, `docs/architecture.md` "Communications seam", flow map regenerated, full screenshot pass (98 routes) with before / after pairs for M-06 and S-01
- **Verified**: `npm run build` clean · `npm run sql` no drift · full screenshot pass 0 console errors · smoke exit 0 · `npm run test:dates` 10 / 10 · ES / EN manual chapters section-count check

### Polish pass (0020 · v0.7.1)
- **Bundle**: every module's pages behind `src/app/lazyPage.ts` (`React.lazy`, one `<Suspense>` in `App.tsx`); `docs/**/*.md` indexed at build time by `scripts/lib/docmeta.mjs` (`?docmeta` Vite plugin) with bodies as on-demand `?raw` chunks — main chunk **2 549 kB → 796 kB**, 235 chunks
- **Dates**: `dateKey()` / `fromDateKey()` / `addDays` / `addMonths` / `addDaysKey` / `MS` in `src/i18n/format.ts`; 14 `toISOString().slice(0, 10)` sites and 11 `T12:00:00` workarounds replaced; `formatDate()` accepts a date key; `npm run test:dates` proves 20:00 Bogotá still names today
- **Dead code**: 13 unused exports, 3 unused barrels, 40 unused string keys, `.adm-line-manual`, 7 `eslint-disable` comments; 25 single-file symbols un-exported; `tsconfig` `noImplicitReturns` + `noImplicitOverride`
- **Dedupe**: one `formatCOP` (`$` in both languages), one IVA split (`src/data/tax.ts` `splitIva`, `DEFAULT_IVA_PCT`), one `waLink`, one `fakeRef`, `digitsOf` / `parseDigits` / `isPhone`, `localeOf`
- **Strings**: TopBar / NavBar / LangToggle / ClassRow / RosterRow / Receipt / PageStub / shells (`titleKey`) / SiteShell / TablesPage / SettingsPage / EmailsPage / WhatsAppPage / RegisterPage / ManualPage through `useT()`; `PAYMENT_METHODS.label` and email template names as `Bi`; LiveBlock's ~60 ternaries → `manual.live.*`; `admin.flag.*` (160 Spanish switch labels), `admin.audit.*` (60 action titles), `admin.finance.status.*`
- **Tokens**: 4 hex, 6 rgba, 22 px font sizes, 8 radii, 5 inline styles → `--fs-*` / `--r-*` / `rgba(var(--m-*))`; `--r-2xs` added to D-01; `--color-text-faint` .55 → .72 (eyebrows ≥ 4.5:1)
- **Tenant**: `tenant.dialCode`, `tenant.invoicePrefix`, structured `tenant.openingHours` deriving the hours sentence (`DEFAULT_SETTINGS.openingHours` reads it), neutral address placeholder; `{{studio}}` in email subjects; C-05 reads `settings.payments.bankName`
- **Visual audit**: M-09 tiles fit and statuses / products / providers translated, card headers wrap (M-09 mobile, S-04 390 overflow), M-09c status cells on one line, C-06 single card fills the row, C-02 / S-02 strips fade, S-05 short blocks and upcoming list, single active sidebar item + nav-label breadcrumb, W-01 / S-01 "day is over" states, M-08b Spanish switch labels, K-04 plain decisions, `○` empty icon, membership renewals in the future, role-gated links (M-01 check-in, S-01 quick actions, bell, HUB-01 dev card), `document.title` per route
- **Screenshots**: captured as each surface's demo user with real ids for the seven param routes and a labelled K-03 cover; `npm run flow-map` regenerates `docs/flow-map.md`; prompts 0009 / 0013 reconstructed; every count re-measured
- **Verified**: build clean with the two new flags · `npm run sql` no drift · full screenshot pass 0 console errors · smoke exit 0 · audits: 0 unused exports, 0 unused keys, 0 raw hex / rgba, 0 hardcoded literals in shared components · overflow at 390: S-04 fixed

### Decisions as settings · Integraciones · §G (0018 · v0.7.0)
- **M-08a General**: contact identity as fields — address, city (Medellín), WhatsApp, email, Instagram handle + URL, map lat/lng, map label, Google Maps link — with a **“Datos confirmados”** switch; `useContact()` / `contactOf()` is the one reader (M-08a first, `tenant.ts` as default) and the site footer, W-06, `MapSlot`, the legal `{{tenant.*}}` tokens, the email footer, C-25/C-06/C-16/A-02 contact rows and `{{tenant:contact}}` all label values as pending until it is on
- **M-08c Payments**: `pricesIncludeIva` documented as the driver of S-04 / C-04 / P-01 · **payroll cadence `monthly | biweekly` programmed both ways** (`payrollCalc.periodsFor()`, `periodAt()`; M-09a generates one or two runs per month and replaces an overlapping draft of the other cadence; S-03 navigates by period; Finance default range 30 d / 15 d; `{{policy:payroll_cadence}}`) · **rate card** by modality + per-teacher override (`payrollCalc.rateFor()`: teacher → modality → `rate_per_class`; the seed's 80–110k moved to the seeded settings row) · default payout method · who signs · withholding flag
- **M-08f Content** (new code): public naming `disciplines | movements` (`classDisplay()` on C-03 / W-04) · **Respiración as its own class** (new `respiracion` modality row; `visibleModalities()` hides it on W-03 / W-07 / W-08 / C-03 while off) · map provider `none | osm | google` read by `MapSlot` with a preview · **legal versions** publish toggle per `legal_documents` row (audited `legal.publish` / `legal.unpublish`)
- **M-10 Integraciones** (new code, `/admin/integrations`, super_admin/admin): one card per Wompi · WhatsApp Business · email · DIAN · maps · Supabase with non-secret fields, `simulated → configured → connected` chip, “keys live server-side” notice naming the env vars, dev checklist, notes, manual link; new **`integrations` table** (46 → 47 on its branch; 48 on `main` after the 0019 merge), seeded simulated; `integration.update` audited; M-08a's Integrations section is a pointer; M-09a's badge reads the Wompi row
- **ROADMAP**: §A 0.7.0 · §E items 2 / 11 / 21 / 22 / 27 / 30 / 31 marked “→ setting in M-08x (fill in)” · §F 15 and 20 updated · new **§G — When nothing else is queued** (SEO/OG + prerender, next-class widget, membership calculator, then the vision doc)
- **Manual** ES + EN: `26` rewritten around M-10, `16` cadence switch + rate card, `01` pointer to M-08a
- **Verified**: 27 / 27 Playwright checks — biweekly September = 2.240.000 + 885.000 = the monthly 3.125.000; a Hot Vinyasa rate edit moves the S-03 estimate; a WhatsApp edit moves the site footer and W-06; M-10 renders ES / EN and its save is audited; `npm run build` clean; smoke exit 0

### App-store readiness and stat-tile fit (0019 · v0.7.0)
- **StatTile never wraps**: the value is measured after layout and shrinks (`--stat-fit`, down to 50 %) to the tile width, re-fitting on resize; label and hint clamp to two lines; meta state `long-value`. The phone frame is a named CSS container (`container: phone / inline-size`) so `.grid-3` / `.grid-4` collapse inside it like on a real 390 px phone — the actual cause of Justin's "COP 440,000" on three lines. Sweep of every KPI tile (13 routes, ES + EN, 390 viewport + 1280 frame): **8 wrapped → 0**; two other wrapping figures fixed (OrderSummary amount, C-06 plan price)
- **`deletion_requests`** (46 → 47): who asked (member or public contact), channel app / website / front_desk, status requested → processing → done | cancelled, reason, checklist json, resolved_by; RLS contract; rows never deleted
- **C-26 `/app/account` Cuenta y datos** (new): data controller from M-08, marketing consent per channel (`notification_prefs`), privacy version accepted, download my data (JSON of 20 tables), legal links, two-step delete-account request that says what is kept (invoices, anonymised) and what ends; pending state with cancel; C-19 / C-25 link to it; the old client-side "disable" is gone
- **W-09 `/site/delete-account`** (new): the public URL Google Play requires — email or WhatsApp, reason, retention explanation, no sign-in; footer link on every site page; privacy policy §7 points at both paths
- **M-11 `/admin/crm/deletions`** (new, admin / super_admin): queue with status actions, seven-step anonymisation checklist gating "Marcar hecha", internal note, M-06 link, audit row per move; nav under CRM
- **`docs/app-store-compliance.md`**: Apple + Google Play rows marked done / pending / needs dev, the settings the app already provides, the ordered pre-submission list; rendered in `/#/docs`
- **Manual 23** ES + EN: the real deletion flow (member, public page, desk, admin queue, retention) with figures of the three screens
- Verified: build clean, 47 tables, smoke exit 0, tile sweep 8 → 0, Playwright flow 26 / 26 (member request → public request → admin done → audit trail)

### Especiales (0017 · v0.6.2)
- **Named**: Especiales / Specials — the edge cases handled by hand, living inside the `espacio` family whose "desde" prices already end in a conversation (manual `12`)
- **Two tables** (42 → 44): `special_charges` (concept, hand price, customer or contact, teacher + `teacher_payout`, `space_booking_id`, `payment_id`, `source_item`) and `space_bookings` (room, kind private_event / rental / private_class / maintenance / blocked, window, status held → confirmed → done / cancelled); `payroll_lines.kind` gains `manual` + `special_charge_id`; `payments.user_id` nullable for a non-member payer
- **S-04** "Qué compra" gained **Espacio · Especiales**: the five "desde" items + a free Especial row open the Especial card (concept, agreed amount, teacher + payout, room + window with the S-05 conflict check, note); "Quién" gained **Solo contacto**; one sale writes payment + invoice + `special_charges` + confirmed `space_bookings`, each audited; `?booking=` preloads an S-05 booking and confirms it
- **Payroll**: `payrollCalc.ts` `manualLinesFor` / `draftLinesFor` — M-09a's draft includes one "Especial: <concept>" line per payout, idempotently (delete + recompute, sourced by `special_charge_id`); M-09b, S-03 and the CSV print it; verified run total = classes + manual lines
- **S-05 `/staff/rooms`** (new code): `RoomDayGrid` organism (rooms × hours, classes by movement, bookings by kind, held dashed, "now" line), 14-day strip + any date, booking form that **refuses an overlapping window** and lists what is in the way, confirm / done / cancel, "Cobrar (S-04)"; linked from S-01 and the nav; the teacher's S-03 home lists their own bookings with the payout
- **Website copy** in the brand voice: P-01 "Especiales · Lo que no cabe en un plan", W-06 card, C-06 line — all to WhatsApp from `tenant.contact`, nothing sold online
- **Manual** ES + EN: `12` §3 books in S-05 with the conflict rule, new §7 Especiales; `10` pointer; `16` manual lines
- Seed: second room **Sala de meditación** (demo capacity — real room list is the owner's), four bookings and two Especiales, the delivered birthday being the manual line of the current draft; `gen-sql.mjs` defers forward / circular FKs to an `alter table` block
- Jas's item 34 for Lore answered structurally (see Decisions)


### Expenses ledger (0016 · v0.6.1)
- **Two tables**, additive, bilingual, `commerce` group, with `TableDef.rls` (admin / finance read + write): `expense_templates` (recurring fixed cost: concept, category, amount, cadence `biweekly` | `monthly`, anchor day, vendor, active) and `expenses` (kind `fixed` | `variable`, category, concept, amount, `incurred_on`, `paid_on`, method cash | transfer | card, vendor, note, `template_id`, `created_by`) — 42 → **44**; `npm run sql` regenerated `supabase/schema.sql` and `docs/data-model.md`
- **One arithmetic**: `src/data/expenseCalc.ts` (`dueDatesFor`, `fixedExpensesFor`, no React) is what the seed and M-09c's generator both call — a monthly template falls due on its anchor day, a biweekly one also fifteen days later (the quincena), one due day = one fixed row, an existing row is skipped
- **M-09c `/admin/finance/expenses`** (Jas's point 9): the same 7 / 15 / 30 / 90 días / Todo chips as M-09, tiles for fijos / variables / pagado / por pagar, by-category `BarList`, an add-expense form, the recurring-templates panel with an **idempotent "Generar gastos fijos del periodo"** (regenerating never duplicates a row; a paid row is never deleted), activate / deactivate, a new-template form, and **Marcar pagado** per unpaid row; every write is an `audit_log` row (`expense.*`); new `expenses.read` / `expenses.write` permissions; nav entry "Gastos" next to Finanzas and Nómina; existing components only
- **M-09 Balance del periodo** card: Ingresos (approved payments) − Nómina (payroll runs whose period overlaps the range, at their current total) − Gastos (rows dated in the range, paid or not) = Balance, with the margin and links to M-09a / M-09c; existing cards intact
- **Seed**: six Medellín-realistic templates (arriendo 4.800.000, EPM 1.150.000, internet 189.900, aseo 700.000 / quincena, software 240.000, póliza 380.000), three months of fixed rows generated from them and fifteen variable expenses over 90 days, appended after every other pass so no other page's data shifts
- **Docs**: ops-manual chapter 14 ES + EN "Gastos y balance" with the M-09c and M-09 figures, `docs/pages/M-09c.md`, `docs/pages/M-09.md` updated, finance screenshots retaken (M-09, M-09a, M-09b, M-09c), ROADMAP §A 0.6.1 / §F 21 done, README, `package.json` 0.6.1

### Integration (v0.6.0)
- Merged `work/site` → `work/depth` → `work/manual` onto `main`, `--no-ff` each, build green between merges, **no conflicts** (the three tracks touched disjoint files)
- `MediaSlot` and `MapSlot` gained an optional `slotKey` and read `media_assets` (M-02d) the way `MediaPlaceholder` already did; explicit `src` still wins. Five `site.classes.*` rows added to the seed and `site.hero` made a video slot, so the library covers all **12** places art is owed (W-01, W-02, W-05, W-06, W-07, W-08, C-03, C-13, C-18, C-23)
- `{{pricing:<family>}}` in the manual dropped its private `FAMILY_ROLE` copy and reads `FAMILY_ROLE` / `FAMILY_RATIONALE` from `src/tenant/pricing.ts`, printing the family's role, subtitle and "why it exists" above the price table
- City settled: the app says **Medellín** everywhere; the manual's decision blockquote is narrowed to the real address and contact details, `EmailPreview`'s meta reads `tenant.city`, and every surviving "Bogot" in the repo is the `America/Bogota` timezone
- Manual chapter 16 rewritten in ES and EN against the routes that exist (M-09a, M-09b, per-teacher settle, the self-closing run, the 15-day range, S-03 reading the run); the last two `[screenshot: …]` per language replaced — **64 figures per language, zero placeholders**
- Jas's two items: "Planes claros" → **Planes** / **Plans**, and dark-mode card titles verified readable in the W-01 dark capture
- `package.json` **0.1.0 → 0.6.0** (it had been stale through all of v0.5.0); README, ROADMAP §A/§E/§F and this board updated
- `scripts/screenshots.mjs`: `--only=…$` exact-path matching (so `/manual` can be captured without the chapter route that shares its K-03 code) and `:chapter` → `03-modelo-de-valor`
- Full screenshot pass: **89 routes, 369 captures, 58 MB**, no console errors; six new page docs generated (M-02a…M-02d, M-09a, M-09b), K-03 and S-03 docs now name their labelled captures

### Ops manual, visual and live (0013 · v0.6.0)
- 11 flat chapters became **28 ES + 28 EN in seven parts** (HOY · Operación diaria · Clientes y planes · Dinero · Contenido y marca · Legal y políticas · Sistema); nothing dropped, `LEGACY_SLUGS` keeps old links resolving
- `/manual` is a cover: wordmark, tagline, version, chapter/reading/figure/decision counts, a search box, "start here by role" and a part-by-part grid of `ChapterCard`s; a chapter adds its part eyebrow, role chip, reading time and a sticky `Toc`
- **Live data instead of copied numbers**: `{{pricing[:family]}}`, `{{tenant:hours|contact|capacity}}`, `{{policy[:field]}}`, `{{tables}}` / `{{table:<name>}}`, `{{roles}}`, `{{routes:<surface>}}`, `{{stats}}` / `{{kpi:<name>}}` render through the new `LiveBlock` organism, reading `pricing.ts`, `tenant.ts`, M-08, `tableRegistry`, `roles.ts` and the module registry. An unknown kind degrades into an explanation
- **Real screenshots**: a titled markdown image renders through the new `Figure` organism (framed, captioned, page-code chip, clickable to the live screen) — 64 per language after the integration pass
- New components with metas: `LiveBlock`, `Figure` (organisms), `ChapterCard`, `Toc` (molecules); `MarkdownViewer` gained three additive props (`directive`, `figure`, `headingIds`) so `/#/docs` and the knowledgebase are unchanged
- Pipe tables render again everywhere `MarkdownViewer` is used: `preprocessMarkdown()` fences them into a ```table block (a workaround for the missing `remark-gfm` — see Backlog)
- 27 `DECISIÓN PENDIENTE` flags across the 28 chapters (17 pre-existing + 10 new), each flagged once and cross-referenced, feeding K-04 and ROADMAP §E

### Thin-screen depth (0012 · v0.6.0)
- **Five tables**: `media_assets`, `payroll_runs`, `payroll_lines`, `legal_acceptances`, with `legal_documents` rewritten for versions and bilingual bodies — 38 → **42**
- **M-02 is a family**: M-02a articles (bilingual markdown with a live preview, slug, category, `publish_at`, "publish now"; status is derived, not stored), M-02b FAQ (sections from `group_key`, ↑/↓ ordering, page 1 = C-14 / page 2 = C-15), M-02c events (capacity capped by `tenant.studio.mats`, never below RSVPs taken), M-02d the media library as a checklist of the artwork the studio owes
- **M-09 payouts are real rows**: M-09a `/admin/finance/payouts` generates a period's draft **idempotently** (regenerating deletes and recomputes; approved or paid runs are refused with a reason), M-09b `/admin/finance/payouts/:id` is the per-teacher statement with approve, send via Wompi, mark paid by transfer or cash, per-teacher settle, CSV and print — and the run closes itself as paid once the last teacher is settled. A 15-day range in M-09 because Colombian studios settle biweekly
- **One arithmetic**: `src/data/payrollCalc.ts` has no React and no provider; the seed, M-09a and S-03 all call it, so the three screens cannot disagree. A payout is **not** a `payments` row — money out lives on the run and its lines, with an `audit_log` entry per action and `wompiPayout()` as the dispersion seam
- **S-03 reads the run**: live estimate before finance generates it, `payroll_lines` after, with run status, per-class breakdown, run history, payout method, print and a prefilled WhatsApp link to finance. The placeholder badge is gone
- **A-06 is a versioned bilingual legal library**: six kinds, seven versions, every number a `{{policy.*}}` token and every studio fact a `{{tenant.*}}` token resolved from M-08 at render time, Colombian framing throughout (Ley 1581/2012 + Decreto 1377/2013, Ley 1480/2011 arts. 47 and 51, Ley 527/1999); `legal_acceptances` is append-only; one `LegalDocument` organism serves the site and the new `/app/legal/:kind`
- New components with metas: `MarkdownEditor` (molecule), `LegalDocument` (organism)

### Website and brand content (0011 · v0.6.0)
- `src/tenant/brand.ts` (new) is the only place the manifesto, the "Sobre HOY" and philosophy paragraphs, the five class essays and the taglines are written — every field `{es,en}`, transcribed from the owner's brand PDF. Each class carries `eyebrow`, `summary`, `movement`, `heated`, an art `brief`, `bring` keys and `modalitySlugs`, the join to live duration/intensity/heat
- `src/tenant/pricing.ts` gained `FAMILY_ROLE`, `FAMILY_RATIONALE` and `DISCIPLINE` (additive; no price changed), so P-01 explains the value model instead of listing prices
- `src/tenant/tenant.ts`: `city: 'Medellín'`, new `location` and `social`, and `contact.pending` so screens label the placeholder phone/email/address instead of presenting them as fact
- Two new codes: **W-07** `/site/classes` and **W-08** `/site/classes/:slug`; every site page now renders through `useLayout(spec)`, so `/#/dev/layout/W-xx` works for all of them
- New components with metas: `MediaSlot` and `MapSlot` (molecules). `MapSlot` defaults to `provider="none"` — a branded frame with the address and a Google Maps deep link, no network request, so captures stay offline-safe
- Two rendering bugs fixed while verifying: the mobile side gutter (a `padding` shorthand on the same element as `.container` wiped it at 390) and dark-theme heading contrast on the movement and class cards
- `docs/website-vision.md` (new) carries the shot list for the artwork the owner will supply

### Tenant city (0015 · v0.5.1)
- **Tenant** `city` is **Medellín** (was Bogotá) — C-05's "Medellín · COP" subtitle, the auth-shell footer and the M-04 email footer all follow from `src/tenant/tenant.ts`; `timezone` stays `America/Bogota` (Colombia's IANA zone), README fixed, and the `EmailPreview` D-02 usage now reads the city from the tenant config instead of hardcoding it

### Jas design review (0014 · v0.5.1)
- **C-06** "Tu plan" card shows **Inicio del plan** / **Fin del plan** ("Plan start" / "Plan end") from the existing `memberships.starts_at` and `ends_at ?? renews_at`, through `formatDate()` with the year — no new columns
- **C-02 / C-01** a class with no spots left shows a **Sin cupos** / **Full** pill (danger `Badge`, in place of the capacity meter) and can no longer be booked: the row leads to the waitlist (C-20). `core.common.full` ES is now "Sin cupos"; `ClassRow.meta.ts` documents and renders the `full` state
- **Seed** always has one upcoming class today at capacity (deterministic, applied after the random pass so no other page's data shifts) with a waitlist row behind it
- **S-04** Resumen gained **Valor pagado** (defaults to the invoiced total, untouched = one-click sale) and, when it differs, the difference plus a required **Observación** that blocks "Completar venta" until filled; both persist as `payments.amount_paid` / `payments.note` (schema.ts + supabase/schema.sql + docs/data-model.md) and land in the audit entry
- **C-05** subtitle is "Medellín · COP" — the "IVA 19%" fragment is gone in both languages; receipt and POS maths untouched
- **W-01 / P-01** (dark-mode "Cuatro movimientos" titles, "Planes claros" → "Planes") — handed to the concurrent website workstream, which holds `src/modules/website/**`; both landed in v0.6.0 (`site.plans.title` is now "Planes" / "Plans" and the dark heading inks were fixed and verified in the W-01 dark capture)

### Final integration (0010 · v0.5.0)
- `src/modules/customer/policy.ts` reads `usePolicy()` (`src/modules/admin/settings.ts`): its own `attachPolicy()` peek/fetch/subscribe loop is deleted, `toPolicyValues()` is the one M-08 → `PolicyValues` mapper, and `usePolicyValues()` is exported for new components. `<PolicySync/>` stays (it bridges the hook to the 18 plain `policy.*` readers and the non-React helpers) but now assigns during render, above the router, so the first paint shows stored values
- 0007 and 0008 both keep version 0.5.0 — they shipped together; recorded in ROADMAP §A so the duplicate is not read as an error
- Full screenshot pass: 80 routes, 308 `.jpg` captures retaken, 109 changed — the nine pages 0008 rewired (C-05, C-10, C-13, C-14/C-15, C-16, C-19, C-23, C-24, S-03) and the pages the containment pass shifted; M-08a…M-08e byte-identical to 0007. No console errors, `docs/screenshots` 39 MB. Collapsed-sidebar state skipped — the script has no state parameter
- `gen-page-doc.mjs --all` wrote M-08a…M-08e page docs; `docs/pages/M-08.md` is now the family index and its retired single-page captures were removed
- ROADMAP: §A rewritten for 0.5.0, Data lane done, six numbered P1 leftovers, and new **§F "What remains after this pass (for Justin)"** — 18 numbered items in four groups (mocked integrations, thin screens, owner decisions, repo hygiene). 265 lines
- README at 0.5.0

### Data depth (0008 · v0.5.0)
- Nine new tables, additive, with bilingual labels, `TableGroup` (so M-03 lists them) and a new `TableDef.rls` access contract: `notifications`, `notification_prefs`, `reviews`, `invites`, `events`, `event_rsvps`, `payment_methods`, `content_articles`, `faq_entries` (29 → 38)
- `scripts/gen-sql.mjs` emits `TableDef.rls` as `-- access:` comments per table in `supabase/schema.sql` and as a "Who may read / write" list in `docs/data-model.md`; `docs/roles.md` carries the same matrix per role
- Seed: 6 rule/about articles, 17 FAQ entries (6 sections, 2 pages), 3 upcoming events with RSVPs, a review for every past class marked rated (+ `teachers.rating_avg` recomputed), 2–4 notifications per customer derived from their own bookings/payments, the demo customer's full 3 × 5 preference matrix, saved methods for electronic payers, 5 invites incl. one rewarded with a real `credits` row
- C-24 lists `notifications` (mark one / all read) and owns the channel × category preference matrix (no row = enabled); C-19's three toggles are the per-channel master switch
- C-10 inserts `reviews` (anonymous by default) and updates `teachers.rating_avg`; `/teach/class/:id` shows the session's average, count and top tags read-only
- C-16 writes `invites` with the member's referral code; C-23 lists published `events`, writes `event_rsvps` and pays through the existing Wompi seam (`payments` + `invoices`, `plan_id = null`)
- C-05 manages `payment_methods` (add via the new `wompiTokenise()` seam, remove, make default); `token_ref` is visibly a placeholder and the PAN never reaches HoyOS
- C-13 and C-14/C-15 read `content_articles` / `faq_entries`; `src/modules/customer/content.ts` deleted and the 23 dictionary keys of the derived inbox pruned
- New component `RatingSummary` (molecule, `.meta.ts`, states) — D-02 stays current in the same turn

### Admin shell (0007 · v0.5.0)
- `DesktopShell`: 240 px lane ⇄ 56 px icon rail with tooltips (footer chevron + `[`), collapsed state per surface in localStorage; nav groups fold with a caret (state per group, active route's group forced open); off-canvas drawer with scrim below 900 px, opened from the top bar
- Top bar for staff/admin/dev: sidebar toggle · wordmark · page name + code chip · global search (routes by name/code, members by name, `/` to focus, ↑↓, Enter) · ES/EN · theme · unread bell (`message_log`) · role switcher · dev-mode toggle · spec chip
- New molecules `GlobalSearch` and `NotificationBell` (with metas); `TopBar` gained `leading`, `code` and `center` slots; `RouteDef.nav` gained `group` as an i18n key and `to`
- Feature switches left M-01 for M-08b; M-08 is now M-08a General · M-08b Features · M-08c Payments (payout account, NIT, IVA/DIAN, Wompi env, "keys never stored here") · M-08d Communications · M-08e Branding, each a route with its own spec and an audited section save
- M-01 gained "Today at a glance" (today's classes, occupancy, who is already checked in) in the freed space
- `usePolicy()` exported from `src/modules/admin/settings.ts` — M-08 saves reach consumers immediately
- Design system reachable from the admin sidebar for a super admin (`core.nav.group.design` → tokens, components, specs, layout editor at C-01, knowledgebase); dev surface keeps its own shell and lists the admin group too
- Containment pass: no card-like element lets text escape at 390 or 1280 px (Playwright: 17 real overflows before, 0 after) — `min-width: 0` on flex/grid children, `overflow-wrap: anywhere` for codes/emails/IDs, media and `pre` capped
- D-01 gained `--w-rail: 56px`

### Visual fidelity (0006 · v0.4.0)
- D-01 rewritten from the canvas hoy-brand tokens: `--hoy-c*` palette, `--m-*` RGB triplets, semantic surfaces (frame paper / sand tiles / cream lane / sand ground), Depth shadow scale verbatim, Texture layer as CSS (`--tex-*`), materials (`--mat-*`), surface scale, movements from `movSets.hoy`, radii 4/8/11/16/18/24/32/34, breathe 7 s + spin 1.1 s
- Accent split: `--color-primary` (text, dark → `--cat`) vs `--color-accent-fill` (fills, constant deep blue)
- ~~PhoneShell = canvas phone frame from 900 px (430 × 34 px radius, frame gradient + grain, dock inside the frame, sand ground)~~ **superseded in 0025 (D-0006): `AppShell` is full-viewport from 900 px; the bezel lives only in the hub's `DeviceFrame` simulator**; DesktopShell = cream lane sidebar with accent pill; top bars cream .9 + blue hairline
- Cards, chips, buttons, segmented, date strip, stat tiles, inputs, toggles, avatars, nav bar, badges, notices, lists, tables on the surface/shadow/texture tokens; no hairline borders in the styled skin (wireframe restores them)
- Inter/DM Sans metric fallbacks (`@font-face size-adjust`), headings in ink with -0.02em, 11 px .14em eyebrows
- `/#/dev/tokens` shows palette, triplets, surfaces, textures, materials and the shadow scale live; `docs/design-system.md` mapping table canvas var → token
- Before/after pairs + `docs/screenshots/_before/0006/comparison.jpg`; full screenshot pass regenerated; smoke green

### Final integration (0005 · v0.3.0)
- `WIRED` += S-02 M-01 C-02 C-02b C-03 C-19 (layout editor badge)
- Hub "Customer app" card, website sign-in button, schedule sign-in prompt and plans "buy" → `/auth/sign-in` (with `?next=`); staff/teacher cards still switch demo users
- SessionProvider accepts any `users` row id (profile + user_roles resolved from the data layer); A-03 signs in as the created account; `useTable`/`useRow` re-peek synchronously on query change
- MockProvider cross-tab realtime: `storage` listener reloads the db and emits `reset` (verified with two Playwright pages)
- Customer policy values read from M-08 `tenants.settings` (`policyFromSettings`, `<PolicySync/>`); M-08 gains payment hold, charge notice and lockout fields; default cancellation window aligned to the canvas (2 h)
- `core.nav.history` shared key · seed: demo customer ≤ 1 booking/day, birthdays on ~30 % of profiles (half this month)
- Screenshot tooling reads the app's own route manifest (`window.__hoyos.routes` → `docs/screenshots/routes.json`), saves JPEG q72; `gen-page-doc.mjs --all`
- Canvas audit #22 (S-04 IVA from pricing + M-08 tax) and #26 (scanner dropped from the S-02 spec) closed
- Full screenshot pass (es/en × 390/1280, dark for key pages) and `docs/pages/<code>.md` for every routed code

### Staff & admin (0003 · v0.2.0)
- S-01 role home with live numbers (next class, arrivals, open shifts, payments, recent activity)
- S-02 front desk check-in: today strip, roster, search, one-tap check-in, walk-in, late/no-show, waitlist promote, `useLayout` wired
- S-04 register & take payment: who · what (pricing.ts) · how, IVA from M-08, receipt, auto check-in
- S-03 teacher app: home, `/teach/class/:id` attendance + notes, `/teach/payroll` (placeholder until Wompi), `/teach/profile`
- M-01 dashboard: KPI row, occupancy chart, audited feature switches, audit trail, `useLayout` wired
- M-02 content CMS (templates, teachers, modalities, rooms) · M-04 email studio · M-05 WhatsApp automations
- M-06 CRM member 360 · M-07 activity log · M-08 settings & policies (`tenants.settings`) · M-09 finance (new code)
- Components: EmptyState, RosterRow, BarList, PhoneBubble, Timeline, EmailPreview, Receipt (with metas)
- Every staff write appends to `audit_log` via `useAudit`

### Customer (0002 · v0.2.0)
- Booking flow: C-02 schedule + C-02b week · C-03 class detail · C-04 checkout (entitlements, IVA computed, Wompi seam, E-02 inline) · C-05 payment methods · C-08 booked + C-08b change sheet · C-20 waitlist (30-min claim) · E-01 E-02 E-03 demo routes + inline states
- Account & plans: C-06 · C-07 · C-07b · C-22 (pause ≤ 30 d, cancel at period end) · C-11 · C-19 (photo, WhatsApp, emergency contact, LangToggle → users.locale) · C-24 · C-25 · C-13 · C-14/C-15 · C-16 · C-17 · C-18 (+ profile) · C-23 · C-10 · A-05
- Auth: A-01 splash · A-02 sign-in (demo picker, lockout → E-04) · A-03 create account · C-21 OTP recovery · E-04 locked
- Components: Skeleton · Notice · ListRow/ListGroup · SegmentedControl · DateStrip · CountdownRing · EmptyState · Accordion · RatingScale · OtpInput · OrderSummary · BreathingRings (all with metas)

### Docs & content (0004)
- Operations manual: 11 ES + 11 EN chapters in `docs/ops-manual/`, bilingual viewer with chapter sidebar, callouts, placeholders, prev/next, print (K-03)
- Decisions pending page auto-extracted from the manual (K-04)
- Canvas v1.5 installed; `CANVAS-AUDIT.md`; `scripts/extract-canvas.mjs`; specs/strings regenerated; C-02b, C-14, C-15 separate; C-07b retired with alias (D-03)
- `docs/flow-map.md` with routes per code
- Docs viewer: grouped sidebar, kanban lanes × columns, changelog newest first, prompt | response, screenshot gallery, mobile picker (K-02); knowledgebase reuses the renderers (K-01)
- MarkdownViewer: callouts, screenshot placeholders, `components` prop (D-02)
- Screenshot rules rewritten; `screenshots.mjs` naming, `--only`, `--label`; `docs/pages` template + generator
- ROADMAP.md (P1–P7, DoD, how-to, open decisions) and README.md (seven perspectives)

### Scaffold (0001 · v0.1.0)
- Repo bootstrap: rules (`CLAUDE.md`), reference material, docs skeleton, Pages workflow
- D-01 design tokens (light/dark, wireframe skin) · ThemeProvider
- i18n core (`useT`, ES/EN, fallback, LangToggle)
- Roles, demo users, SessionProvider, `RequireRole`, dev mode + view-as
- Inspector panel + spec chip + `Ctrl+.` · `/#/dev/specs` index
- Data layer: schema + tableRegistry + MockProvider (localStorage, change events) + Supabase stub + `supabase/schema.sql`
- M-03 Table manager · Layout editor (`/#/dev/layout/:code`) + `useLayout`
- Docs viewer (`/#/docs`), knowledgebase (`/#/dev/knowledgebase`), ops-manual viewer (`/#/manual`)
- Public website scaffold (home, about, modalities, schedule, teachers, plans, contact, legal) · Testing hub (`/#/`)


## Website · Sanctuary 2.0 (0023)

### Done
- W-01: cinematic architectural hero, tactile movement links, arched class imagery, connected schedule/teachers, material pricing and closing scene.
- W-01–W-09 / P-01: website-only design, Aleja imagery, preserved CMS/data seam, ES/EN and light/dark, version dropdown with V1 preserved.
- D-01 / D-02: additive editorial/motion/stone tokens, AmbientScene and SiteVersionSelect metadata, MediaSlot fallback asset support.
- Website release history, exact video sources, prompts, costed three-loop handoff and asset provenance.

### Backlog
- Generate and inspect the three approved environmental loops; Magnific catalog unavailable at check, fal budget documented.
- Confirm real studio photography, teacher portraits, final copy, contact values and pricing before replacing demo content.


### Timetable evidence · 0063
- Timetable, Website preview and Voucher hosted QA passed on eca9067a. Twenty approved public built-demo screenshots are linked from W-04, W-05, W-06 and C-03.

## Studio photography

### Done
- W-01 / W-02 / W-04 / W-05 / P-01: responsive studio-photo preview; Photography, Timetable and Website preview QA passed on 31739e1. Thirty approved public screenshots are linked from the page documentation. Latest remains the default.

## Media library · 0065

### Implemented · release verification
- M-02d: searchable 68-asset catalog, responsive variants and linked per-placement live/draft/inactive/archive states; browser-local assignments remain explicitly demo-only.
- W-02 photo preview: four approved equipment photographs with optional 40-second blue/warm dissolve, shared pause and reduced-motion support. [Details](changelog/0065-media-library.md)
- Shared Content photo picker is a separate pending integration (PR39); it is not part of this release.
