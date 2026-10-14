# Data model

_Generated from `src/data/schema.ts` by `npm run sql`. The TypeScript file is the source of truth; `supabase/schema.sql` is the Postgres draft; this page is the human view._

## Principles
- **Multi-tenant from day one.** Every table has `tenant_id`; RLS scopes every query to the JWT's tenant. No hardcoded studio outside `src/tenant/tenant.ts`.
- **Same interface, two providers.** Pages call `useData()` / `useTable()` (the `DataProvider` contract: list, get, insert, update, remove, subscribe). `MockProvider` (localStorage + change events) today; `SupabaseProvider` (PostgREST + realtime channels) later. Swapping is one line in `src/data/DataContext.tsx`.
- **Realtime by subscription.** `subscribe(table, cb)` is the seam for Supabase `postgres_changes`; the mock emits the same events on every write so UI already updates live.
- **Money is integer COP.** Columns named price/amount/total/etc. are integers.
- **Bilingual content is JSON.** `{ "es": …, "en": … }` in `jsonb` (descriptions, bios, subjects).

## Mapping Mock → Supabase
| Mock (today) | Supabase (later) |
| --- | --- |
| `localStorage['hoyos.db.v1']` | Postgres tables in `public` |
| `MockProvider.emit()` | `supabase.channel().on('postgres_changes')` |
| `demoUsers` + `SessionProvider` | `supabase.auth` + `user_roles` + JWT claim `tenant_id` |
| `tenant.id = 'ten_hoy'` | row in `tenants`, claim set at sign-in |
| `newId()` | `gen_random_uuid()` |

## Tables

### Core · Núcleo

#### `tenants`
Each studio using HoyOS. Today: HOY.  
_Cada estudio que usa HoyOS. Hoy: HOY._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `slug` | text |  |
| `name` | text |  |
| `legal_name` | text, null |  |
| `timezone` | text |  |
| `currency` | text |  |
| `default_locale` | text |  |
| `settings` | json |  |

#### `hours_overrides`
Dated exceptions to the M-08a weekly hours: holidays (closed), special days (other hours) and events. They win over the week for the dates they cover (inclusive range); M-08g edits them, the site, the app and Google Business Profile read them.  
_Excepciones con fecha al horario semanal de M-08a: festivos (cerrado), jornadas especiales (otro horario) y eventos. Ganan sobre la semana en las fechas que cubren (rango inclusivo); M-08g las edita, el sitio, la app y Google Business Profile las leen._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `start_date` | date |  |
| `end_date` | date | inclusive; equal to start_date for one day |
| `closed` | bool |  |
| `open` | time, null | empty = the weekly opening time |
| `close` | time, null | empty = the weekly closing time |
| `label` | json | {es,en} |
| `kind` | enum (holiday \| special \| event) |  |
| `source` | enum (manual \| colombia) | colombia = imported from the Ley Emiliani calendar (src/tenant/holidays.co.ts) |
| `note` | text, null |  |
| `google_synced_at` | timestamptz, null | last successful push to Google Business Profile (server-side, 0041: no server yet) |
| `created_by` | text, null |  |

**Who may read / write**
- everyone (anon included): read — the website and the app print them
- admin/super_admin/coordinator: insert, update, delete (M-08g, permission hours.write)
- google_synced_at is written by the server that pushes to Google Business Profile, never by the browser

#### `feature_flags`
Blocks and flows Admin → Features turns on or off per page.  
_Bloques y flujos que Admin → Features enciende o apaga por página._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `key` | text |  |
| `page_code` | text, null |  |
| `label` | text |  |
| `enabled` | bool |  |
| `audience` | enum (all \| staff \| customers \| beta) |  |

#### `legal_documents`
Terms, privacy, waiver, cancellation, refunds and house rules — bilingual and versioned.  
_Términos, privacidad, exoneración, cancelaciones, reembolsos y reglas de casa — bilingües y versionados._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `kind` | enum (terms \| privacy \| waiver \| cancellation \| refunds \| house-rules) |  |
| `slug` | text | kind + version, e.g. terms-1.0 |
| `version` | text | semver-ish, e.g. 1.0 |
| `status` | enum (draft \| published) |  |
| `effective_from` | date | the date the version governs from |
| `title` | json | {es,en} |
| `summary` | json | {es,en} one line |
| `body_md` | json | {es,en} markdown; {{policy.*}} tokens are resolved from M-08 at render time |
| `requires_acceptance` | bool | the member must accept this version (waiver, terms) |
| `published_at` | timestamptz, null |  |

**Who may read / write**
- anon + customer: read where status = published
- admin: write (a new version is a new row; a published row is never edited in place)
- counsel review: status stays draft until the owner publishes

#### `deletion_requests`
Every request to delete an account (Ley 1581 deletion right; App Store 5.1.1(v) and Google Play): who asked, through which channel, its status and who closed it. Anonymisation runs server-side; the app only records and tracks the case (C-26, W-09, M-11).  
_Cada petición de borrar una cuenta (Ley 1581 · supresión; App Store 5.1.1(v) · Google Play): quién la pidió, por dónde, en qué estado va y quién la cerró. La anonimización corre en el servidor; la app solo registra y sigue el caso (C-26, W-09, M-11)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid, null | → `users` null when it came from the public page (W-09) — email / phone identify the person |
| `email` | text, null |  |
| `phone` | text, null |  |
| `channel` | enum (app \| website \| front_desk) |  |
| `status` | enum (requested \| processing \| done \| cancelled) |  |
| `reason` | text, null |  |
| `requested_at` | timestamptz |  |
| `resolved_at` | timestamptz, null |  |
| `resolved_by` | uuid, null | → `users`  |
| `checklist` | json, null | M-11 anonymisation checklist: { step: true } per completed step |
| `note` | text, null | internal note for the admin who processes it |

**Who may read / write**
- customer: insert one row for self (user_id = auth.uid()) and read own rows; may set status = cancelled while still requested
- anon (public W-09): insert only, user_id null, through an edge function that rate-limits and never reads back
- admin/super_admin: read all, update status / resolved_* / checklist / note (M-11)
- never deleted: the request is the proof the right was honoured; the deletion itself is a server-side job that anonymises profiles + users and keeps payments / invoices for the retention period

#### `consents`
Which document version each user accepted.  
_Qué versión de cada documento aceptó cada usuario._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `legal_document_id` | uuid | → `legal_documents`  |
| `accepted_at` | timestamptz |  |
| `ip` | text, null |  |

#### `legal_acceptances`
Acceptance of one concrete document version (A-06): what the person signed and when.  
_Aceptación de una versión concreta de un documento (A-06): qué firmó la persona y cuándo._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `document_id` | uuid | → `legal_documents`  |
| `kind` | text | denormalised legal_documents.kind, so “did they sign the waiver?” is one query |
| `version` | text |  |
| `accepted_at` | timestamptz |  |
| `channel` | enum (app \| website \| front_desk \| import) |  |
| `ip` | text, null |  |

**Who may read / write**
- customer: insert + read own rows (user_id = auth.uid()); never update nor delete
- admin/finance: read all (proof of the signed waiver)
- append-only: a new acceptance is a new row, so the history survives a new version

#### `media_assets`
One art slot per place in the app and the site (M-02d): what is missing, in which ratio and with which brief.  
_Un cupo de arte por lugar de la app y la web (M-02d): qué falta, en qué proporción y con qué encargo._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `slot_key` | text | stable key a component asks for, e.g. class.hero |
| `kind` | enum (photo \| video \| illustration) |  |
| `ratio` | text | CSS aspect-ratio, e.g. 16 / 9 |
| `label` | json | {es,en} where the slot shows |
| `alt` | json | {es,en} alternative text |
| `brief` | json | {es,en} what to shoot |
| `tone` | enum (moss \| river \| clay \| sun \| sage \| slate \| plum), null | class-tone tint of the empty slot (D-01 classTones) |
| `url` | text, null |  |
| `credit` | text, null | photographer / licence |
| `status` | enum (pending \| ready) |  |
| `sort` | int |  |

**Who may read / write**
- anon + customer: read where status = ready
- coordinator/admin: write (M-02d media library)
- url points at storage; HoyOS never stores the binary in a row

#### `content_articles`
Club rules (C-13), about-HOY copy and guides, editable without a deploy.  
_Reglas del club (C-13), textos “sobre HOY” y guías, editables sin deploy._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `slug` | text |  |
| `section` | enum (rules \| faq \| about) |  |
| `icon` | text, null | Icon set name (src/components/atom/Icon, 0030), e.g. flame, clock; any other text renders as a literal glyph |
| `title` | json | {es,en} |
| `summary` | json | {es,en} |
| `body_md` | json | {es,en} markdown |
| `checklist` | json, null | [{es,en}] |
| `video_label` | json, null | {es,en} |
| `required` | bool | must be read (safety) |
| `sort` | int |  |
| `published` | bool |  |
| `publish_at` | timestamptz, null | scheduled publication; published + a future publish_at = scheduled (M-02a) |

**Who may read / write**
- customer + anon: read where published = true
- coordinator/admin: write (M-02 content CMS)

#### `faq_entries`
Questions and answers for C-14/C-15, grouped by section and page.  
_Preguntas y respuestas de C-14/C-15, agrupadas por sección y página._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `group_key` | text | section id, e.g. s1 (group/order are reserved words in SQL) |
| `group_title` | json | {es,en} |
| `group_lead` | json | {es,en} |
| `page` | int | 1 = C-14, 2 = C-15 |
| `question` | json | {es,en} |
| `answer` | json | {es,en} |
| `sort` | int |  |
| `published` | bool |  |

**Who may read / write**
- customer + anon: read where published = true
- coordinator/admin: write (M-02 content CMS)

### People · Personas

#### `users`
Login accounts (mirrors auth.users in Supabase).  
_Cuentas de acceso (espejo de auth.users en Supabase)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `email` | text |  |
| `phone` | text, null |  |
| `status` | enum (active \| invited \| locked \| disabled) |  |
| `last_sign_in_at` | timestamptz, null |  |
| `locale` | text, null |  |

#### `profiles`
Person data: name, photo, emergency contact, preferences.  
_Datos de la persona: nombre, foto, emergencia, preferencias._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `full_name` | text |  |
| `initials` | text, null |  |
| `photo_url` | text, null |  |
| `birthday` | date, null |  |
| `emergency_contact` | json, null |  |
| `marketing_optin` | bool |  |
| `whatsapp_verified` | bool |  |
| `notes` | text, null |  |

#### `user_roles`
Role assignments; a user may hold several.  
_Asignación de roles; un usuario puede tener varios._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `role` | enum (super_admin \| admin \| coordinator \| front_desk \| finance \| teacher \| maintenance \| marketing \| developer \| customer) |  |
| `granted_by` | uuid, null | → `users`  |

#### `teachers`
Public and contractual profile of each teacher.  
_Perfil público y contractual de cada profesor._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid, null | → `users`  |
| `display_name` | text |  |
| `bio` | json | {es,en} |
| `photo_url` | text, null |  |
| `specialties` | json | modality ids |
| `certifications` | json, null |  |
| `rate_per_class` | int, null | COP |
| `active` | bool |  |
| `rating_avg` | numeric, null |  |

### Schedule · Horario

#### `modalities`
Class types of the club, each with its colour tone.  
_Tipos de clase del club, cada uno con su tono de color._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `slug` | text |  |
| `name_es` | text |  |
| `name_en` | text |  |
| `tone` | enum (moss \| river \| clay \| sun \| sage \| slate \| plum) | colour tone (D-01 classTones), one per modality |
| `description` | json |  |
| `intensity` | int | 1–5 |
| `heated` | bool |  |
| `duration_min` | int |  |
| `active` | bool |  |

#### `rooms`
Physical rooms and their mat capacity.  
_Salas físicas y su capacidad en mats._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `name` | text |  |
| `capacity` | int |  |
| `heated` | bool |  |
| `notes` | text, null |  |

#### `class_templates`
Recurrence rules that generate sessions.  
_Reglas de recurrencia que generan sesiones._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `title` | text |  |
| `modality_id` | uuid | → `modalities`  |
| `teacher_id` | uuid | → `teachers`  |
| `room_id` | uuid | → `rooms`  |
| `weekday` | int | 0=Sun … 6=Sat |
| `start_time` | time |  |
| `duration_min` | int |  |
| `capacity` | int |  |
| `level` | enum (all \| beginner \| intermediate \| advanced) |  |
| `active` | bool |  |

#### `class_sessions`
Each concrete class on the calendar, with live capacity.  
_Cada clase concreta en el calendario, con cupos en vivo._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `template_id` | uuid, null | → `class_templates`  |
| `title` | text |  |
| `modality_id` | uuid | → `modalities`  |
| `teacher_id` | uuid | → `teachers`  |
| `room_id` | uuid | → `rooms`  |
| `starts_at` | timestamptz |  |
| `ends_at` | timestamptz |  |
| `capacity` | int |  |
| `booked_count` | int |  |
| `level` | enum (all \| beginner \| intermediate \| advanced) |  |
| `status` | enum (scheduled \| cancelled \| completed) |  |
| `cancel_reason` | text, null |  |

#### `space_bookings`
A room taken by something other than a class: private event, rental, private class, maintenance or a block (S-05). An Especial may pay for it.  
_Una sala ocupada por algo que no es una clase: evento privado, alquiler, clase privada, mantenimiento o bloqueo (S-05). Un Especial puede pagarla._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `room_id` | uuid | → `rooms`  |
| `kind` | enum (private_event \| rental \| private_class \| maintenance \| blocked) |  |
| `title` | text |  |
| `starts_at` | timestamptz |  |
| `ends_at` | timestamptz |  |
| `customer_id` | uuid, null | → `users`  |
| `contact_name` | text, null | who it is for when they are not a member (a company, a birthday host) |
| `teacher_id` | uuid, null | → `teachers` teacher booked with the room; their payout lives on the special charge |
| `special_charge_id` | uuid, null | → `special_charges` the Especial that paid for this window (S-04) |
| `status` | enum (held \| confirmed \| cancelled \| done) |  |
| `note` | text, null |  |
| `created_by` | uuid, null | → `users` staff user who booked it |

**Who may read / write**
- front_desk/coordinator/admin/finance/super_admin: full control
- teacher: read bookings whose teacher_id resolves to their teachers row (S-03)
- customer: read own bookings (customer_id = auth.uid())
- a booking in status cancelled frees the room; done is history and is never edited

#### `bookings`
One person’s spot in a session.  
_Un cupo de una persona en una sesión._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `session_id` | uuid | → `class_sessions`  |
| `status` | enum (booked \| checked_in \| cancelled \| no_show \| late_cancel) |  |
| `paid_with` | enum (package \| single \| trial \| guest \| comp \| membership) | package = one class of the person's 12-class package (class_ledger); membership is dormant since 0051 |
| `ledger_id` | uuid, null | → `class_ledger` the −1 row a package booking wrote |
| `checked_in_at` | timestamptz, null |  |
| `cancelled_at` | timestamptz, null |  |
| `rated` | bool |  |

#### `waitlist`
Waiting positions and claim window.  
_Posiciones en espera y ventana de reclamo._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `session_id` | uuid | → `class_sessions`  |
| `position` | int |  |
| `status` | enum (waiting \| offered \| claimed \| expired \| left) |  |
| `offered_at` | timestamptz, null |  |
| `claim_until` | timestamptz, null |  |

#### `reviews`
A class rating (C-10): stars, tags and comment.  
_Calificación de una clase (C-10): estrellas, etiquetas y comentario._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `class_session_id` | uuid | → `class_sessions`  |
| `teacher_id` | uuid | → `teachers`  |
| `rating` | int | 1–5 |
| `tags` | json | good/fix tag keys |
| `comment` | text, null |  |
| `visibility` | enum (anonymous \| named \| private) |  |

**Who may read / write**
- customer: insert + read own rows (user_id = auth.uid()), one per booking
- teacher: read rows for own sessions, without user_id when visibility = anonymous
- coordinator/admin: read all (M-06), never edit the rating

#### `events`
Workshops, sound baths and special events (C-23), published from M-02.  
_Talleres, baños de sonido y eventos especiales (C-23), publicados desde M-02._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `slug` | text |  |
| `title` | json | {es,en} |
| `kind` | json | {es,en} label |
| `description` | json | {es,en} |
| `bring` | json, null | [{es,en}] |
| `starts_at` | timestamptz |  |
| `ends_at` | timestamptz |  |
| `room_id` | uuid, null | → `rooms`  |
| `host_teacher_id` | uuid, null | → `teachers`  |
| `capacity` | int |  |
| `price_cop` | int | COP, public price |
| `member_price_cop` | int | COP, member price (0 = included) |
| `cover_key` | text, null | media key; placeholder until real imagery |
| `status` | enum (draft \| published \| cancelled) |  |

**Who may read / write**
- customer + anon: read where status = published
- coordinator/admin: write

#### `event_rsvps`
Who is going to an event and with which payment (C-23).  
_Quién va a un evento y con qué pago (C-23)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `event_id` | uuid | → `events`  |
| `user_id` | uuid | → `users`  |
| `status` | enum (going \| cancelled \| attended \| no_show) |  |
| `payment_id` | uuid, null | → `payments`  |
| `guests` | int | extra seats taken |

**Who may read / write**
- customer: insert + read + cancel own rows (user_id = auth.uid())
- front_desk/coordinator/admin: read all, mark attended

### Practice & analytics · Práctica y analítica

#### `practice_goals`
How many classes a week each person wants to take (C-01, C-27). One active row per person; history is kept.  
_Cuántas clases por semana quiere tomar cada persona (C-01, C-27). Una fila activa por persona; el historial se conserva._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `cadence` | enum (week) | only weekly today; a monthly cadence is reserved for a later pass and would extend this enum, never replace it |
| `target` | int | classes per week the member chose, 1–7; 0 = no goal, only tracking |
| `source` | enum (member \| suggested) | member = picked by hand · suggested = accepted the app’s suggestion from their own history |
| `starts_on` | date |  |
| `active` | bool |  |
| `note` | text, null | why, in the member’s words; optional |

**Who may read / write**
- customer: insert + read + update own rows (user_id = auth.uid())
- front_desk/coordinator/admin: read (M-06, M-12)
- one active row per person: setting a new goal ends the previous one (active = false), so history survives

#### `activity_events`
The member-facing moments the raw tables do not hold: a goal set, a milestone reached, a rest week that saved the streak… Bookings, check-ins and payments stay in their own tables and every metric is derived from them.  
_Los momentos que las tablas crudas no guardan: una meta fijada, un hito alcanzado, una semana de descanso que salvó la racha… Reservas, check-ins y pagos siguen en sus tablas y toda métrica se deriva de ellas._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid, null | → `users` null = studio-level event |
| `kind` | enum (goal.set \| milestone \| streak.saved \| streak.broken \| first.visit \| plan.purchased \| plan.renewed \| package.expiring) |  |
| `occurred_at` | timestamptz | when it happened, which may be earlier than when the app noticed (created_at) |
| `ref_table` | text, null | the row it points at (bookings, practice_goals, class_ledger…) |
| `ref_id` | text, null |  |
| `payload` | json, null | kind-specific: { target } for goal.set, { count } for milestone, { week } for streak.saved |

**Who may read / write**
- customer: read own rows (user_id = auth.uid()); inserts happen from the app on the member’s own actions
- coordinator/admin/front_desk: read all (M-12, M-06)
- append-only: never updated nor deleted; a correction is a new row

### Commerce · Comercio

#### `vouchers`
Demo contract only; production transactional RPCs and authorization are not connected. No real issuance, delivery or payment. Lifetime cap counts non-cancelled attendee seats across bookings; cancellation policy is explicitly selected. COP cost is a mock quotation, never client-authoritative in production.  
_Contrato de demostración; backend transaccional pendiente._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `title` | text |  |
| `code` | text |  |
| `source` | text |  |
| `benefitKind` | text |  |
| `benefitTotal` | int |  |
| `balance` | int |  |
| `participantCap` | int |  |
| `capScope` | text |  |
| `creditUnit` | text |  |
| `expiresAt` | timestamptz, null |  |
| `cancellationPolicy` | text |  |
| `recipientName` | text |  |
| `recipientContact` | text |  |
| `message` | text |  |
| `claimedBy` | text, null |  |
| `status` | text |  |
| `issuedBy` | text |  |

**Who may read / write**
- Default deny until authenticated scoped RPCs are implemented; audit must be append-only; guest details private to owner and authorized staff.

#### `voucher_bookings`
Demo contract only; production transactional RPCs and authorization are not connected. No real issuance, delivery or payment. Lifetime cap counts non-cancelled attendee seats across bookings; cancellation policy is explicitly selected. COP cost is a mock quotation, never client-authoritative in production.  
_Contrato de demostración; backend transaccional pendiente._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `voucherId` | uuid | → `vouchers`  |
| `sessionId` | uuid | → `class_sessions`  |
| `participants` | json |  |
| `cost` | int |  |
| `status` | text |  |
| `restored` | bool |  |
| `mats` | json |  |

**Who may read / write**
- Default deny until authenticated scoped RPCs are implemented; audit must be append-only; guest details private to owner and authorized staff.

#### `voucher_events`
Demo contract only; production transactional RPCs and authorization are not connected. No real issuance, delivery or payment. Lifetime cap counts non-cancelled attendee seats across bookings; cancellation policy is explicitly selected. COP cost is a mock quotation, never client-authoritative in production.  
_Contrato de demostración; backend transaccional pendiente._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `voucherId` | uuid | → `vouchers`  |
| `bookingId` | uuid, null | → `voucher_bookings`  |
| `kind` | text |  |
| `actorId` | text |  |
| `requestId` | text |  |
| `fingerprint` | text |  |
| `payload` | json |  |

**Who may read / write**
- Default deny until authenticated scoped RPCs are implemented; audit must be append-only; guest details private to owner and authorized staff.

#### `plans`
Launch list (0051): trial class, individual class, 12-class package, private classes and gift cards. Generated from src/tenant/pricing.ts.  
_Lista de lanzamiento (0051): clase de prueba, clase individual, paquete de 12 clases, clases privadas y tarjetas de regalo. Se genera desde src/tenant/pricing.ts._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `slug` | text |  |
| `family` | enum (bienvenida \| paquetes \| privadas \| regalos) |  |
| `name_es` | text |  |
| `name_en` | text |  |
| `description` | json |  |
| `price` | int | COP, integer |
| `period` | enum (once \| month \| year), null |  |
| `classes` | int, null | classes the plan gives (1, or 12 for the package) |
| `validity_days` | int, null |  |
| `is_from_price` | bool |  |
| `badge` | json, null |  |
| `active` | bool |  |
| `sort` | int |  |

#### `memberships`
A person’s recurring subscription to a plan. Unused since 0051: the launch list has no recurring plan; the table stays for post-launch pricing.  
_Suscripción recurrente de una persona a un plan. Sin uso desde 0051: la lista de lanzamiento no tiene plan recurrente; la tabla queda para los precios después del lanzamiento._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `plan_id` | uuid | → `plans`  |
| `status` | enum (active \| paused \| past_due \| cancelled \| expired) |  |
| `starts_at` | date |  |
| `renews_at` | date, null |  |
| `ends_at` | date, null |  |
| `paused_until` | date, null |  |

#### `class_ledger`
The classes of each package: bought (+), used (−), returned and expired. HOY has no credits (0051): the balance is in classes.  
_Las clases de cada paquete: compradas (+), usadas (−), devueltas y vencidas. HOY no maneja créditos (0051): el saldo es de clases._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `plan_id` | uuid, null | → `plans`  |
| `payment_id` | uuid, null | → `payments`  |
| `delta` | int | + purchase, − use |
| `reason` | enum (purchase \| booking \| refund \| expiry \| gift \| comp \| cancel_return \| reschedule) |  |
| `expires_at` | date, null |  |
| `frozen_from` | date, null | purchase rows: the day a package freeze started (once per package) |
| `frozen_until` | date, null | purchase rows: the last frozen day; expires_at moved by the same days |

#### `payments`
Each charge, via Wompi or manual.  
_Cada cobro, por Wompi o manual._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid, null | → `users` null only for an Especial sold to a non-member contact (special_charges.contact_name carries who paid) |
| `plan_id` | uuid, null | → `plans` null for an event RSVP or an Especial (special_charges) |
| `amount` | int | COP, integer |
| `amount_paid` | int, null | COP, integer — what the desk actually received; equals amount unless a note explains why |
| `currency` | text |  |
| `method` | enum (card \| pse \| qr \| cash \| transfer \| gift_card) | online: card, PSE or a Wompi QR code; at the desk: cash and the other desk methods (0051 — no Nequi, no Daviplata) |
| `provider` | enum (wompi \| manual) |  |
| `provider_ref` | text, null |  |
| `status` | enum (pending \| approved \| declined \| refunded \| voided) |  |
| `paid_at` | timestamptz, null |  |
| `taken_by` | uuid, null | → `users` staff user for manual payments |
| `note` | text, null | Why the received amount differs from the invoice (S-04 requires it when it does) |

#### `invoices`
Fiscal document per payment (DIAN later).  
_Documento fiscal por pago (DIAN más adelante)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `payment_id` | uuid | → `payments`  |
| `number` | text |  |
| `subtotal` | int | COP, integer |
| `tax` | int | COP, integer |
| `total` | int | COP, integer |
| `issued_at` | timestamptz |  |
| `pdf_url` | text, null |  |
| `dian_cufe` | text, null |  |

#### `gift_cards`
Vouchers bought to give away, with scheduled delivery.  
_Bonos comprados para regalar, con entrega programada._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `code` | text |  |
| `buyer_user_id` | uuid, null | → `users`  |
| `recipient_name` | text |  |
| `recipient_contact` | text |  |
| `amount` | int | COP, integer |
| `balance` | int | COP, integer |
| `deliver_at` | timestamptz, null |  |
| `redeemed_by` | uuid, null | → `users`  |
| `status` | enum (scheduled \| sent \| redeemed \| expired) |  |

#### `payment_methods`
Methods the person saved (C-05). The token belongs to Wompi; we never store the card.  
_Métodos que la persona guardó (C-05). El token es de Wompi; nunca guardamos la tarjeta._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `provider` | enum (wompi \| manual) |  |
| `kind` | enum (card \| pse \| transfer \| cash) |  |
| `brand` | text | Visa, Mastercard, Bancolombia… |
| `last4` | text, null |  |
| `token_ref` | text, null | Wompi token placeholder — never a real PAN or token in the mock |
| `is_default` | bool |  |
| `expires` | text, null | MM/YY |

**Who may read / write**
- customer: full control of own rows (user_id = auth.uid())
- front_desk: read brand/last4 only, to recognise a payment at the desk
- nobody: token_ref is never selectable from the client once Wompi is live (vault column)

#### `invites`
Invites members send (C-16) and the gift class once the guest joins.  
_Invitaciones enviadas por miembros (C-16) y la clase de regalo cuando el invitado entra._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `inviter_user_id` | uuid | → `users`  |
| `invitee_phone` | text, null |  |
| `invitee_email` | text, null |  |
| `invitee_user_id` | uuid, null | → `users`  |
| `channel` | enum (whatsapp \| email \| link) |  |
| `code` | text |  |
| `session_id` | uuid, null | → `class_sessions` class the invite was sent from |
| `status` | enum (sent \| opened \| joined \| rewarded) |  |
| `reward_ledger_id` | uuid, null | → `class_ledger`  |

**Who may read / write**
- customer: insert + read own rows (inviter_user_id = auth.uid())
- front_desk: read by code, to honour a pass at the desk
- admin/finance: write status and reward_ledger_id (the reward class is granted server-side)

#### `special_charges`
A charge whose concept and price were typed by hand at the desk (S-04): a private event, a rental, a group session, a special request. It may carry a manual teacher payout and a room booking.  
_Un cobro con concepto y precio escritos a mano en recepción (S-04): evento privado, alquiler, sesión de grupo, pedido especial. Puede llevar un pago manual al profesor y una reserva de sala._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `concept` | text | free text, e.g. "Cumpleaños de Mariana · sala + profe" |
| `amount` | int | COP, integer — the price agreed by hand (IVA handled by S-04 as for any sale) |
| `customer_id` | uuid, null | → `users`  |
| `contact_name` | text, null | who paid when they are not a member |
| `teacher_id` | uuid, null | → `teachers`  |
| `teacher_payout` | int, null | COP, integer — what the teacher is paid for this Especial; becomes a payroll_lines row of kind manual |
| `space_booking_id` | uuid, null | → `space_bookings`  |
| `payment_id` | uuid | → `payments`  |
| `source_item` | text, null | pricing.ts espacio item the concept started from (privada, taller, foto…), null when typed free |
| `note` | text, null |  |
| `created_by` | uuid, null | → `users`  |

**Who may read / write**
- front_desk/coordinator/admin/finance/super_admin: full control
- teacher: read rows where teacher_id resolves to their teachers row (the payout feeds their S-03 statement)
- customer: read own rows (customer_id = auth.uid())
- the money in is the linked payments row; the money out is the payroll_lines row of kind manual — this table joins the two

#### `payroll_runs`
One monthly teacher payroll run (M-09a): period, status, total and payout method.  
_Una liquidación mensual de profesores (M-09a): periodo, estado, total y medio de pago._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `period_start` | date |  |
| `period_end` | date |  |
| `status` | enum (draft \| approved \| paid) |  |
| `total` | int | COP, sum of payroll_lines.amount |
| `method` | enum (wompi \| transfer \| cash) |  |
| `approved_by` | uuid, null | → `users`  |
| `approved_at` | timestamptz, null |  |
| `paid_at` | timestamptz, null |  |
| `provider_ref` | text, null | Wompi payout reference (simulated today) |
| `notes` | text, null |  |

**Who may read / write**
- finance/admin: full control
- teacher: read runs that contain a line of their own (S-03)
- a run in status paid is immutable; a correction is a new adjustment line in the next run

#### `payroll_lines`
One class taught, bonus, adjustment or manual Especial payout inside a run (M-09b, S-03).  
_Una clase dictada, bono, ajuste o pago manual de un Especial dentro de una corrida (M-09b, S-03)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `run_id` | uuid | → `payroll_runs`  |
| `teacher_id` | uuid | → `teachers`  |
| `class_session_id` | uuid, null | → `class_sessions` null for a bonus, an adjustment or a month older than the session window |
| `kind` | enum (class \| bonus \| adjustment \| manual) | manual = a teacher payout agreed by hand on an Especial (special_charges.teacher_payout), pulled into the run by the draft generator |
| `special_charge_id` | uuid, null | → `special_charges` source of a manual line — the generator uses it to stay idempotent |
| `rate` | int | COP, teachers.rate_per_class at the time of the run |
| `amount` | int | COP, signed: an adjustment may be negative |
| `attendees` | int, null | checked-in students, for the statement |
| `paid_at` | timestamptz, null | set when this teacher is settled; a run may be paid teacher by teacher (M-09b) |
| `paid_method` | enum (wompi \| transfer \| cash), null |  |
| `note` | text, null |  |

**Who may read / write**
- finance/admin: full control while the run is draft
- teacher: read own lines (teacher_id resolves to their teachers row)
- nobody: lines of a paid run are read-only

#### `expense_templates`
Template for one fixed studio cost (rent, utilities, cleaning…) with its cadence; M-09c generates the period’s expenses from it.  
_Plantilla de un costo fijo del estudio (arriendo, servicios, aseo…) con su cadencia; M-09c genera de aquí los gastos del periodo._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `concept` | text |  |
| `category` | enum (rent \| utilities \| internet \| cleaning \| software \| insurance \| supplies \| maintenance \| marketing \| fees \| other) |  |
| `amount` | int | COP per occurrence |
| `cadence` | enum (biweekly \| monthly) |  |
| `anchor_day` | int | day of month it falls due (1–28); biweekly also falls due 15 days later |
| `vendor` | text, null |  |
| `active` | bool |  |
| `note` | text, null |  |

**Who may read / write**
- admin/finance: full control (M-09c)
- nobody else reads: expenses are studio-internal
- deactivate instead of delete once a template has generated rows, so history keeps its origin

#### `expenses`
Every studio expense, fixed (generated from a template) or variable (recorded by hand); it subtracts in the M-09 balance.  
_Cada gasto del estudio, fijo (generado de una plantilla) o variable (registrado a mano); resta en el balance de M-09._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `kind` | enum (fixed \| variable) |  |
| `category` | enum (rent \| utilities \| internet \| cleaning \| software \| insurance \| supplies \| maintenance \| marketing \| fees \| other) |  |
| `concept` | text |  |
| `amount` | int | COP, integer |
| `incurred_on` | date | the day the cost falls due or was incurred |
| `paid_on` | date, null | null = still to pay |
| `method` | enum (cash \| transfer \| card) |  |
| `vendor` | text, null |  |
| `note` | text, null |  |
| `template_id` | uuid, null | → `expense_templates` set when generated from a recurring template (kind = fixed) |
| `created_by` | uuid, null | → `users`  |

**Who may read / write**
- admin/finance: full control (M-09c)
- nobody else reads: expenses are studio-internal
- a paid row (paid_on set) is never deleted by the generator; corrections are a new row with a note

### Comms · Comunicaciones

#### `email_templates`
Versioned automated emails (M-04): to customers, teachers and the team.  
_Emails automáticos versionados (M-04): a clientes, profesores y equipo._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `key` | text |  |
| `name` | text |  |
| `audience` | enum (customer \| teacher \| studio) | who receives it (0055): a member or prospect, a teacher, or the studio team |
| `trigger` | text |  |
| `priority` | enum (launch \| first_60 \| later), null | when it has to exist (0055): before launch, first 60 days, later |
| `subject` | json |  |
| `body_mjml` | text |  |
| `version` | int |  |
| `active` | bool |  |

#### `wa_templates`
Meta-approved templates with variables.  
_Plantillas aprobadas por Meta con variables._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `key` | text |  |
| `name` | text |  |
| `category` | enum (utility \| marketing \| authentication) |  |
| `body` | json |  |
| `approval_status` | enum (draft \| pending \| approved \| rejected) |  |
| `active` | bool |  |

#### `automations`
Trigger → channel → template, with quiet hours.  
_Disparador → canal → plantilla, con horas de silencio._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `name` | text |  |
| `trigger` | text |  |
| `channel` | enum (whatsapp \| email \| push) |  |
| `template_key` | text |  |
| `delay_min` | int |  |
| `quiet_hours` | json, null |  |
| `enabled` | bool |  |

#### `message_log`
The whole conversation with each person: WhatsApp and email both ways (manual, automation, newsletter, system) plus internal staff notes. M-06 shows it per person; S-06 spreads it across the front-desk inbox.  
_La conversación completa con cada persona: WhatsApp y email en ambos sentidos (manual, automatización, newsletter, sistema) y las notas internas del equipo. M-06 la muestra por persona; S-06 la reparte en la bandeja de recepción._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid, null | → `users` the member this belongs to; null for team-only rows (a substitution request) |
| `channel` | enum (whatsapp \| email \| push \| note) | note = internal staff note, never delivered |
| `direction` | enum (inbound \| outbound \| internal) | inbound = from the member · outbound = to the member · internal = staff note (M-06 / S-06) |
| `source` | enum (manual \| automation \| newsletter \| system) | manual = typed by staff · automation = M-05/M-04 trigger · newsletter = campaign · system = receipts, substitution requests |
| `template_key` | text, null |  |
| `automation_id` | uuid, null | → `automations`  |
| `subject` | text, null | email subject / newsletter title |
| `body` | text, null | the message text as sent or received |
| `status` | enum (received \| queued \| sent \| delivered \| read \| failed) | received = inbound row · queued = waiting for quiet hours to end |
| `sent_at` | timestamptz, null |  |
| `sent_by` | uuid, null | → `users` staff author of an outbound or internal row; null for automations |
| `read_at` | timestamptz, null | staff read receipt for an inbound row; null drives the unread counts (bell, S-01, S-06) |
| `read_by` | uuid, null | → `users`  |
| `external_id` | text, null | provider message id (Meta wamid, email message-id) for the future webhook |
| `payload` | json, null | provider extras: template vars, test flag, invoice number |

**Who may read / write**
- front_desk/coordinator/admin: read every row of the tenant, insert outbound and internal rows, update read_at/read_by only (S-06, M-06)
- customer: read own inbound/outbound rows (user_id = auth.uid()); internal rows (channel note) are never visible to the member
- automation/webhook service role: insert inbound rows and update status/external_id from the provider callback
- retention: internal notes follow the member record (deleted with it, M-11); provider ids are kept for reconciliation

#### `notifications`
The C-24 inbox: what the studio sends, with read state and a deep link.  
_La bandeja de C-24: lo que el estudio envía, con estado de lectura y enlace profundo._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `kind` | enum (booking \| waitlist \| payment \| class \| event \| review \| invite \| studio) |  |
| `title` | json | {es,en} |
| `body` | json | {es,en} |
| `read_at` | timestamptz, null |  |
| `deep_link` | text, null | in-app route, e.g. /app/booking/:id |
| `sent_via` | enum (in_app \| whatsapp \| email \| push) |  |

**Who may read / write**
- customer: read own rows and update read_at only (user_id = auth.uid())
- front_desk/coordinator/admin: insert for a member (send)
- retention: rows older than 90 days are deleted by a scheduled job

#### `notification_prefs`
Channel × category each person accepts (C-24 / C-19). No row = enabled.  
_Canal × categoría que cada persona acepta (C-24 / C-19). Sin fila = activado._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `channel` | enum (whatsapp \| email \| push) |  |
| `category` | enum (bookings \| waitlist \| payments \| events \| marketing) |  |
| `enabled` | bool |  |

**Who may read / write**
- customer: full control of own rows (user_id = auth.uid())
- admin: read only, to respect a mute before sending
- marketing category is opt-out per channel; transactional categories always deliver in-app

### Manual & training · Manual y formación

#### `manual_progress`
Who marked which manual chapter (K-03) as read, and at which version: each person’s “read N of M”.  
_Quién marcó como leído qué capítulo del manual (K-03) y en qué versión: el «leído N de M» de cada persona._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `chapter_slug` | text | file name without .md, e.g. 04-recepcion-y-check-in (same in ES and EN) |
| `version` | text | chapter front-matter version read |
| `read_at` | timestamptz |  |

**Who may read / write**
- every staff role: insert + read own rows (user_id = auth.uid()); a re-read of a new version is a new row
- admin/coordinator/super_admin: read all (the K-03 “Equipo” view)
- never updated in place

#### `manual_training`
Each Day 1 / Week 1 / Month 1 checklist item (chapter 09) a person completed, and the stage sign-off by their trainer (item_key = __signoff).  
_Cada punto del checklist Día 1 / Semana 1 / Mes 1 (capítulo 09) que una persona completó, y la firma de etapa de quien la entrena (item_key = __signoff)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users` the person being trained |
| `role` | text | the checklist followed (a Role id) |
| `stage` | enum (day1 \| week1 \| month1) |  |
| `item_key` | text | src/modules/ops-manual/training.ts item key, or __signoff |
| `done_at` | timestamptz |  |
| `signed_by` | uuid, null | → `users` trainer who signed the stage (only on __signoff rows) |

**Who may read / write**
- every staff role: insert + delete own item rows (user_id = auth.uid()) while the stage is not signed
- coordinator/admin/super_admin: read all, insert the __signoff row for anyone (signed_by = auth.uid())
- a __signoff row is never deleted; a correction is a new row

#### `manual_overrides`
A manual section rewritten in the app by the owner or coordination (or suggested by an agent): shown instead of the repository text, with its history. The original markdown is never touched.  
_Una sección del manual reescrita desde la app por el owner o coordinación (o sugerida por un agente): se muestra en lugar del texto del repositorio, con su historial. El markdown original nunca se toca._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `chapter_slug` | text |  |
| `lang` | enum (es \| en) |  |
| `section_heading` | text | the ## heading text the override replaces (the section below it) |
| `body_md` | text | markdown of the section body, without the heading line |
| `edited_by` | uuid, null | → `users`  |
| `note` | text, null | why it changed |
| `version` | int | 1, 2, 3… per chapter + lang + section |
| `status` | enum (live \| reverted \| suggested \| dismissed) |  |

**Who may read / write**
- everyone who can read the manual: read rows with status live
- admin/super_admin: insert + update any section; coordinator: only sections marked {{editable:coordinator}}
- any staff role / agent: insert status suggested; only an editor turns it live or dismissed
- history is append-only: restoring sets status reverted, never deletes

#### `manual_requests`
“Request a change”: what someone on the team wants the manual to say. The owner answers it on K-04, or an agent picks it up through the actions registry.  
_«Pedir un cambio»: lo que alguien del equipo quiere que diga el manual. El owner lo responde en K-04, o un agente lo toma por el registro de acciones._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `chapter_slug` | text |  |
| `section_heading` | text, null |  |
| `lang` | enum (es \| en) |  |
| `request` | text |  |
| `requested_by` | uuid, null | → `users`  |
| `status` | enum (open \| done \| dismissed) |  |
| `answer` | text, null |  |

**Who may read / write**
- every staff role: insert + read own rows (requested_by = auth.uid())
- admin/coordinator/super_admin: read all, update status and answer

#### `studio_policies`
Text rules the manual quotes with {{studio:key}} and the owner or coordination adjust without touching the markdown (lost items, opening, closing…). Numeric policies stay in M-08.  
_Reglas de texto que el manual cita con {{studio:clave}} y que el owner o coordinación ajustan sin tocar el markdown (objetos perdidos, apertura, cierre…). Las políticas numéricas siguen en M-08._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `key` | text |  |
| `label` | json | {es,en} |
| `value_es` | text |  |
| `value_en` | text |  |
| `chapter` | text, null | chapter number where it is quoted, e.g. 21 |
| `editable_by` | enum (owner \| coordinator) |  |
| `updated_by` | uuid, null | → `users`  |

**Who may read / write**
- everyone who can read the manual: read
- admin/super_admin: update any row; coordinator: rows with editable_by = coordinator
- a new key is added in src/data/seed/studioPolicies.ts until Supabase lands

### System · Sistema

#### `integrations`
One row per external system (Wompi, WhatsApp, email, DIAN, maps, Supabase, Google Business Profile): status, non-secret fields ready to fill and notes for the dev (M-10). Keys live server-side, never here.  
_Una fila por sistema externo (Wompi, WhatsApp, correo, DIAN, mapas, Supabase, Google Business Profile): estado, campos no secretos listos para llenar y notas para el dev (M-10). Las llaves viven en el servidor, nunca aquí._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `key` | enum (wompi \| whatsapp \| email \| dian \| maps \| supabase \| google_business) |  |
| `status` | enum (simulated \| configured \| connected) | simulated = seam only · configured = ids filled, dev has not wired it · connected = live |
| `config` | json | non-secret fields per integration (merchant id, sender number, provider name, project URL…) |
| `notes` | text, null | what the dev must still finish, in the owner’s words |
| `updated_by` | uuid, null | → `users`  |

**Who may read / write**
- super_admin/admin: full control (M-10)
- finance: read (M-09a shows the Wompi status)
- nobody else reads; config holds public identifiers only — a secret in this table is a bug

#### `api_keys`
Keys HoyOS issues to developers to call its API (D-07). The SHA-256 hash and a visible prefix are stored; the full key is shown once. Verification is the server’s job (it does not exist yet).  
_Llaves que HoyOS entrega a desarrolladores para llamar su API (D-07). Se guarda el hash SHA-256 y un prefijo visible; la llave completa se muestra una sola vez. La verificación la hace el servidor (aún no existe)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `name` | text |  |
| `prefix` | text | first 13 characters, e.g. hoy_live_ab12 — what the list shows |
| `key_hash` | text | SHA-256 hex of the full key |
| `scopes` | json | string[] from API_KEY_SCOPES (classes.read, bookings.write, hours.read…) |
| `environment` | enum (live \| test) |  |
| `created_by` | uuid, null | → `users`  |
| `last_used_at` | timestamptz, null | written by the server on each verified request |
| `expires_at` | timestamptz, null |  |
| `revoked_at` | timestamptz, null |  |
| `replaces_id` | uuid, null | → `api_keys` set on the new key when it rotates an old one |

**Who may read / write**
- super_admin/developer: select, insert, update (D-07, permission api_keys.write)
- admin: select without key_hash (D-07 read-only, api_keys.read)
- nobody deletes: revoking sets revoked_at so the audit trail keeps the row
- the raw key is never stored — a raw key in this table is a bug

#### `audit_log`
Who did what, on which entity, when (M-07).  
_Quién hizo qué, sobre qué entidad, cuándo (M-07)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `actor_id` | uuid, null | → `users`  |
| `action` | text |  |
| `entity` | text |  |
| `entity_id` | text, null |  |
| `diff` | json, null |  |
| `ip` | text, null |  |

#### `table_views`
The table manager views (M-03): which table, which kind of view (grid, list, gallery, board, calendar, timeline, graph) and with which filters, sorts, grouping and columns. A shared view is visible to the whole team.  
_Las vistas del gestor de tablas (M-03): qué tabla, qué tipo de vista (cuadrícula, lista, galería, tablero, calendario, línea de tiempo, grafo) y con qué filtros, orden, agrupación y columnas. Una vista compartida la ve todo el equipo._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `table_name` | text | the table this view shows (a name from src/data/schema.ts) |
| `name` | json | {es,en} |
| `kind` | enum (grid \| list \| gallery \| kanban \| calendar \| timeline \| graph) |  |
| `config` | json | { filters: [{column, op, value}], sorts: [{column, dir}], groupBy, hiddenColumns, columnOrder, cardFields, kanbanColumn, pinned, dateColumn, endColumn, calendarMode, timelineZoom } |
| `is_default` | bool |  |
| `shared` | bool |  |
| `created_by` | uuid, null | → `users`  |

**Who may read / write**
- staff with tables.read: read shared rows and their own (created_by = auth.uid())
- staff with tables.write: insert; update and delete their own rows (super_admin: any)
- is_default marks the view a table opens with; one default per table_name

#### `docs_entries`
Index of docs/ for search and links (the .md files are the source).  
_Índice de docs/ para búsqueda y enlaces (los .md son la fuente)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `path` | text |  |
| `title` | text |  |
| `kind` | enum (prompt \| changelog \| rule \| guide \| manual) |  |
| `page_codes` | json, null |  |

### Design · Diseño

#### `components`
Index of the D-02 library (the .meta.ts files are the source).  
_Índice de la biblioteca D-02 (los .meta.ts son la fuente)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `name` | text |  |
| `tier` | enum (atom \| molecule \| organism \| template) |  |
| `states` | json, null |  |
| `used_by` | json, null |  |

#### `page_layouts`
Per-page section order saved from the drag-and-drop editor.  
_Orden de secciones por página guardado desde el editor drag-and-drop._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `page_code` | text |  |
| `sections` | json | ordered section names |
| `hidden` | json, null | section names hidden |
| `updated_by` | uuid, null | → `users`  |

## Seed data (`src/data/seed/`)
6 modalities, 2 rooms (the main room at 15 mats and a small meditation room), 8 teachers, 24 weekly templates (4/day Mon–Sat), sessions for −7…+7 days, 9 demo staff/users + 30 customers, memberships/credits/payments/invoices, bookings filling sessions, waitlists on full classes, feature flags from every spec toggle, legal docs + consents, 2 gift cards, 3 email templates, 3 WhatsApp templates, 3 automations, the unified message record (`seed/messages.ts`: 69 `message_log` rows — WhatsApp both ways, automated reminders and receipts, newsletters, one email exchange, internal notes — in 17 conversations, six inbound left unread), audit logs, three months of payroll runs, four space bookings with two Especiales (one with a manual teacher payout), and the practice record (0040): seven active `practice_goals` (the demo member's 2 / week over an ended 1 / week, so her first week is graded at 1 — rule 8), seven weeks of completed morning classes for the demo member so her weekly streak is real (6 met weeks, one saved by the rest-week rule), and her `activity_events` (goals set, milestones 1 · 5 · 10 at the visit that reached them, the saved week). Deterministic PRNG; reseeds daily so "today" always has classes.

## Adding a table
1. Add a `TableDef` to `src/data/schema.ts` (and a typed row interface if pages use it).
2. Seed it in `src/data/seed/index.ts`.
3. `npm run sql` → regenerates `supabase/schema.sql` and this file.
4. Reference it in the page's `PageSpec.data` so the inspector links to it.
