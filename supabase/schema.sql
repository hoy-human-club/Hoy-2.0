-- HoyOS — Supabase / Postgres schema draft
-- GENERATED from src/data/schema.ts by scripts/gen-sql.mjs. Edit the TS, regenerate, review, then apply as a migration.
-- Conventions: every table has id, tenant_id, created_at, updated_at. RLS is on everywhere.
-- tenant_id is read from the JWT claim (auth.jwt() ->> 'tenant_id'); clients never send it.
-- tenants.tenant_id is a self-reference (a tenant row belongs to itself) so the base-column rule holds everywhere.

create extension if not exists pgcrypto;

-- helper: current tenant from the JWT
create or replace function public.current_tenant_id() returns uuid
language sql stable as $$ select nullif(auth.jwt() ->> 'tenant_id', '')::uuid $$;

-- helper: does the current user hold a role in this tenant?
create or replace function public.has_role(role_name text) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.tenant_id = public.current_tenant_id() and ur.role = role_name
  )
$$;

-- updated_at trigger
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- commerce · Demo contract only; production transactional RPCs and authorization are not connected. No real issuance, delivery or payment. Lifetime cap counts non-cancelled attendee seats across bookings; cancellation policy is explicitly selected. COP cost is a mock quotation, never client-authoritative in production.
-- access:
--   · Default deny until authenticated scoped RPCs are implemented; audit must be append-only; guest details private to owner and authorized staff.
create table if not exists public.vouchers (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  code text not null,
  source text not null,
  "benefitKind" text not null,
  "benefitTotal" integer not null,
  balance integer not null,
  "participantCap" integer not null,
  "capScope" text not null,
  "creditUnit" text not null,
  "expiresAt" timestamptz,
  "cancellationPolicy" text not null,
  "recipientName" text not null,
  "recipientContact" text not null,
  message text not null,
  "claimedBy" text,
  status text not null,
  "issuedBy" text not null
);
create index if not exists vouchers_tenant_idx on public.vouchers(tenant_id);
create trigger vouchers_touch before update on public.vouchers for each row execute function public.touch_updated_at();
alter table public.vouchers enable row level security;
-- DEFAULT DENY: no client policies until authenticated transactional voucher RPCs and scoped read policies exist.

-- commerce · Demo contract only; production transactional RPCs and authorization are not connected. No real issuance, delivery or payment. Lifetime cap counts non-cancelled attendee seats across bookings; cancellation policy is explicitly selected. COP cost is a mock quotation, never client-authoritative in production.
-- access:
--   · Default deny until authenticated scoped RPCs are implemented; audit must be append-only; guest details private to owner and authorized staff.
create table if not exists public.voucher_bookings (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  "voucherId" uuid not null references public.vouchers(id) on delete set null,
  "sessionId" uuid not null,
  participants jsonb not null,
  cost integer not null,
  status text not null,
  restored boolean not null default false,
  mats jsonb not null
);
create index if not exists voucher_bookings_tenant_idx on public.voucher_bookings(tenant_id);
create index if not exists voucher_bookings_voucherId_idx on public.voucher_bookings("voucherId");
create index if not exists voucher_bookings_sessionId_idx on public.voucher_bookings("sessionId");
create trigger voucher_bookings_touch before update on public.voucher_bookings for each row execute function public.touch_updated_at();
alter table public.voucher_bookings enable row level security;
-- DEFAULT DENY: no client policies until authenticated transactional voucher RPCs and scoped read policies exist.

-- commerce · Demo contract only; production transactional RPCs and authorization are not connected. No real issuance, delivery or payment. Lifetime cap counts non-cancelled attendee seats across bookings; cancellation policy is explicitly selected. COP cost is a mock quotation, never client-authoritative in production.
-- access:
--   · Default deny until authenticated scoped RPCs are implemented; audit must be append-only; guest details private to owner and authorized staff.
create table if not exists public.voucher_events (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  "voucherId" uuid not null references public.vouchers(id) on delete set null,
  "bookingId" uuid references public.voucher_bookings(id) on delete set null,
  kind text not null,
  "actorId" text not null,
  "requestId" text not null,
  fingerprint text not null,
  payload jsonb not null
);
create index if not exists voucher_events_tenant_idx on public.voucher_events(tenant_id);
create index if not exists voucher_events_voucherId_idx on public.voucher_events("voucherId");
create index if not exists voucher_events_bookingId_idx on public.voucher_events("bookingId");
create trigger voucher_events_touch before update on public.voucher_events for each row execute function public.touch_updated_at();
alter table public.voucher_events enable row level security;
-- DEFAULT DENY: no client policies until authenticated transactional voucher RPCs and scoped read policies exist.

-- core · Each studio using HoyOS. Today: HOY.
create table if not exists public.tenants (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null,
  name text not null,
  legal_name text,
  timezone text not null,
  currency text not null,
  default_locale text not null,
  settings jsonb not null
);
create index if not exists tenants_tenant_idx on public.tenants(tenant_id);
create trigger tenants_touch before update on public.tenants for each row execute function public.touch_updated_at();
alter table public.tenants enable row level security;
create policy "tenants: tenant read" on public.tenants for select using (tenant_id = public.current_tenant_id());
create policy "tenants: staff write" on public.tenants for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Dated exceptions to the M-08a weekly hours: holidays (closed), special days (other hours) and events. They win over the week for the dates they cover (inclusive range); M-08g edits them, the site, the app and Google Business Profile read them.
-- access:
--   · everyone (anon included): read — the website and the app print them
--   · admin/super_admin/coordinator: insert, update, delete (M-08g, permission hours.write)
--   · google_synced_at is written by the server that pushes to Google Business Profile, never by the browser
create table if not exists public.hours_overrides (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  start_date date not null,
  -- inclusive; equal to start_date for one day
  end_date date not null,
  closed boolean not null default false,
  -- empty = the weekly opening time
  open time,
  -- empty = the weekly closing time
  close time,
  -- {es,en}
  label jsonb not null,
  kind text not null check (kind in ('holiday', 'special', 'event')),
  -- colombia = imported from the Ley Emiliani calendar (src/tenant/holidays.co.ts)
  source text not null check (source in ('manual', 'colombia')),
  note text,
  -- last successful push to Google Business Profile (server-side, 0041: no server yet)
  google_synced_at timestamptz,
  created_by text
);
create index if not exists hours_overrides_tenant_idx on public.hours_overrides(tenant_id);
create trigger hours_overrides_touch before update on public.hours_overrides for each row execute function public.touch_updated_at();
alter table public.hours_overrides enable row level security;
create policy "hours_overrides: tenant read" on public.hours_overrides for select using (tenant_id = public.current_tenant_id());
create policy "hours_overrides: staff write" on public.hours_overrides for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Blocks and flows Admin → Features turns on or off per page.
create table if not exists public.feature_flags (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  key text not null,
  page_code text,
  label text not null,
  enabled boolean not null default false,
  audience text not null check (audience in ('all', 'staff', 'customers', 'beta'))
);
create index if not exists feature_flags_tenant_idx on public.feature_flags(tenant_id);
create trigger feature_flags_touch before update on public.feature_flags for each row execute function public.touch_updated_at();
alter table public.feature_flags enable row level security;
create policy "feature_flags: tenant read" on public.feature_flags for select using (tenant_id = public.current_tenant_id());
create policy "feature_flags: staff write" on public.feature_flags for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Terms, privacy, waiver, cancellation, refunds and house rules — bilingual and versioned.
-- access:
--   · anon + customer: read where status = published
--   · admin: write (a new version is a new row; a published row is never edited in place)
--   · counsel review: status stays draft until the owner publishes
create table if not exists public.legal_documents (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text not null check (kind in ('terms', 'privacy', 'waiver', 'cancellation', 'refunds', 'house-rules')),
  -- kind + version, e.g. terms-1.0
  slug text not null,
  -- semver-ish, e.g. 1.0
  version text not null,
  status text not null check (status in ('draft', 'published')),
  -- the date the version governs from
  effective_from date not null,
  -- {es,en}
  title jsonb not null,
  -- {es,en} one line
  summary jsonb not null,
  -- {es,en} markdown; {{policy.*}} tokens are resolved from M-08 at render time
  body_md jsonb not null,
  -- the member must accept this version (waiver, terms)
  requires_acceptance boolean not null default false,
  published_at timestamptz
);
create index if not exists legal_documents_tenant_idx on public.legal_documents(tenant_id);
create trigger legal_documents_touch before update on public.legal_documents for each row execute function public.touch_updated_at();
alter table public.legal_documents enable row level security;
create policy "legal_documents: tenant read" on public.legal_documents for select using (tenant_id = public.current_tenant_id());
create policy "legal_documents: staff write" on public.legal_documents for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Every request to delete an account (Ley 1581 deletion right; App Store 5.1.1(v) and Google Play): who asked, through which channel, its status and who closed it. Anonymisation runs server-side; the app only records and tracks the case (C-26, W-09, M-11).
-- access:
--   · customer: insert one row for self (user_id = auth.uid()) and read own rows; may set status = cancelled while still requested
--   · anon (public W-09): insert only, user_id null, through an edge function that rate-limits and never reads back
--   · admin/super_admin: read all, update status / resolved_* / checklist / note (M-11)
--   · never deleted: the request is the proof the right was honoured; the deletion itself is a server-side job that anonymises profiles + users and keeps payments / invoices for the retention period
create table if not exists public.deletion_requests (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- null when it came from the public page (W-09) — email / phone identify the person
  user_id uuid,
  email text,
  phone text,
  channel text not null check (channel in ('app', 'website', 'front_desk')),
  status text not null check (status in ('requested', 'processing', 'done', 'cancelled')),
  reason text,
  requested_at timestamptz not null,
  resolved_at timestamptz,
  resolved_by uuid,
  -- M-11 anonymisation checklist: { step: true } per completed step
  checklist jsonb,
  -- internal note for the admin who processes it
  note text
);
create index if not exists deletion_requests_tenant_idx on public.deletion_requests(tenant_id);
create index if not exists deletion_requests_user_id_idx on public.deletion_requests(user_id);
create index if not exists deletion_requests_resolved_by_idx on public.deletion_requests(resolved_by);
create trigger deletion_requests_touch before update on public.deletion_requests for each row execute function public.touch_updated_at();
alter table public.deletion_requests enable row level security;
create policy "deletion_requests: tenant read" on public.deletion_requests for select using (tenant_id = public.current_tenant_id());
create policy "deletion_requests: staff write" on public.deletion_requests for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Which document version each user accepted.
create table if not exists public.consents (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null,
  legal_document_id uuid not null references public.legal_documents(id) on delete set null,
  accepted_at timestamptz not null,
  ip text
);
create index if not exists consents_tenant_idx on public.consents(tenant_id);
create index if not exists consents_user_id_idx on public.consents(user_id);
create index if not exists consents_legal_document_id_idx on public.consents(legal_document_id);
create trigger consents_touch before update on public.consents for each row execute function public.touch_updated_at();
alter table public.consents enable row level security;
create policy "consents: tenant read" on public.consents for select using (tenant_id = public.current_tenant_id());
create policy "consents: staff write" on public.consents for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Acceptance of one concrete document version (A-06): what the person signed and when.
-- access:
--   · customer: insert + read own rows (user_id = auth.uid()); never update nor delete
--   · admin/finance: read all (proof of the signed waiver)
--   · append-only: a new acceptance is a new row, so the history survives a new version
create table if not exists public.legal_acceptances (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null,
  document_id uuid not null references public.legal_documents(id) on delete set null,
  -- denormalised legal_documents.kind, so “did they sign the waiver?” is one query
  kind text not null,
  version text not null,
  accepted_at timestamptz not null,
  channel text not null check (channel in ('app', 'website', 'front_desk', 'import')),
  ip text
);
create index if not exists legal_acceptances_tenant_idx on public.legal_acceptances(tenant_id);
create index if not exists legal_acceptances_user_id_idx on public.legal_acceptances(user_id);
create index if not exists legal_acceptances_document_id_idx on public.legal_acceptances(document_id);
create trigger legal_acceptances_touch before update on public.legal_acceptances for each row execute function public.touch_updated_at();
alter table public.legal_acceptances enable row level security;
create policy "legal_acceptances: tenant read" on public.legal_acceptances for select using (tenant_id = public.current_tenant_id());
create policy "legal_acceptances: staff write" on public.legal_acceptances for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · One art slot per place in the app and the site (M-02d): what is missing, in which ratio and with which brief.
-- access:
--   · anon + customer: read where status = ready
--   · coordinator/admin: write (M-02d media library)
--   · url points at storage; HoyOS never stores the binary in a row
create table if not exists public.media_assets (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- stable key a component asks for, e.g. class.hero
  slot_key text not null,
  kind text not null check (kind in ('photo', 'video', 'illustration')),
  -- CSS aspect-ratio, e.g. 16 / 9
  ratio text not null,
  -- {es,en} where the slot shows
  label jsonb not null,
  -- {es,en} alternative text
  alt jsonb not null,
  -- {es,en} what to shoot
  brief jsonb not null,
  -- class-tone tint of the empty slot (D-01 classTones)
  tone text check (tone in ('moss', 'river', 'clay', 'sun', 'sage', 'slate', 'plum')),
  url text,
  -- photographer / licence
  credit text,
  status text not null check (status in ('pending', 'ready')),
  sort integer not null
);
create index if not exists media_assets_tenant_idx on public.media_assets(tenant_id);
create trigger media_assets_touch before update on public.media_assets for each row execute function public.touch_updated_at();
alter table public.media_assets enable row level security;
create policy "media_assets: tenant read" on public.media_assets for select using (tenant_id = public.current_tenant_id());
create policy "media_assets: staff write" on public.media_assets for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Club rules (C-13), about-HOY copy and guides, editable without a deploy.
-- access:
--   · customer + anon: read where published = true
--   · coordinator/admin: write (M-02 content CMS)
create table if not exists public.content_articles (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null,
  section text not null check (section in ('rules', 'faq', 'about')),
  -- Icon set name (src/components/atom/Icon, 0030), e.g. flame, clock; any other text renders as a literal glyph
  icon text,
  -- {es,en}
  title jsonb not null,
  -- {es,en}
  summary jsonb not null,
  -- {es,en} markdown
  body_md jsonb not null,
  -- [{es,en}]
  checklist jsonb,
  -- {es,en}
  video_label jsonb,
  -- must be read (safety)
  required boolean not null default false,
  sort integer not null,
  published boolean not null default false,
  -- scheduled publication; published + a future publish_at = scheduled (M-02a)
  publish_at timestamptz
);
create index if not exists content_articles_tenant_idx on public.content_articles(tenant_id);
create trigger content_articles_touch before update on public.content_articles for each row execute function public.touch_updated_at();
alter table public.content_articles enable row level security;
create policy "content_articles: tenant read" on public.content_articles for select using (tenant_id = public.current_tenant_id());
create policy "content_articles: staff write" on public.content_articles for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Questions and answers for C-14/C-15, grouped by section and page.
-- access:
--   · customer + anon: read where published = true
--   · coordinator/admin: write (M-02 content CMS)
create table if not exists public.faq_entries (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- section id, e.g. s1 (group/order are reserved words in SQL)
  group_key text not null,
  -- {es,en}
  group_title jsonb not null,
  -- {es,en}
  group_lead jsonb not null,
  -- 1 = C-14, 2 = C-15
  page integer not null,
  -- {es,en}
  question jsonb not null,
  -- {es,en}
  answer jsonb not null,
  sort integer not null,
  published boolean not null default false
);
create index if not exists faq_entries_tenant_idx on public.faq_entries(tenant_id);
create trigger faq_entries_touch before update on public.faq_entries for each row execute function public.touch_updated_at();
alter table public.faq_entries enable row level security;
create policy "faq_entries: tenant read" on public.faq_entries for select using (tenant_id = public.current_tenant_id());
create policy "faq_entries: staff write" on public.faq_entries for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- people · Login accounts (mirrors auth.users in Supabase).
create table if not exists public.users (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  phone text,
  status text not null check (status in ('active', 'invited', 'locked', 'disabled')),
  last_sign_in_at timestamptz,
  locale text
);
create index if not exists users_tenant_idx on public.users(tenant_id);
create trigger users_touch before update on public.users for each row execute function public.touch_updated_at();
alter table public.users enable row level security;
create policy "users: tenant read" on public.users for select using (tenant_id = public.current_tenant_id());
create policy "users: staff write" on public.users for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- people · Person data: name, photo, emergency contact, preferences.
create table if not exists public.profiles (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  full_name text not null,
  initials text,
  photo_url text,
  birthday date,
  emergency_contact jsonb,
  marketing_optin boolean not null default false,
  whatsapp_verified boolean not null default false,
  notes text
);
create index if not exists profiles_tenant_idx on public.profiles(tenant_id);
create index if not exists profiles_user_id_idx on public.profiles(user_id);
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
alter table public.profiles enable row level security;
create policy "profiles: tenant read" on public.profiles for select using (tenant_id = public.current_tenant_id());
create policy "profiles: staff write" on public.profiles for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- people · Role assignments; a user may hold several.
create table if not exists public.user_roles (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  role text not null check (role in ('super_admin', 'admin', 'coordinator', 'front_desk', 'finance', 'teacher', 'maintenance', 'marketing', 'developer', 'customer')),
  granted_by uuid references public.users(id) on delete set null
);
create index if not exists user_roles_tenant_idx on public.user_roles(tenant_id);
create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists user_roles_granted_by_idx on public.user_roles(granted_by);
create trigger user_roles_touch before update on public.user_roles for each row execute function public.touch_updated_at();
alter table public.user_roles enable row level security;
create policy "user_roles: tenant read" on public.user_roles for select using (tenant_id = public.current_tenant_id());
create policy "user_roles: staff write" on public.user_roles for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- people · Public and contractual profile of each teacher.
create table if not exists public.teachers (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references public.users(id) on delete set null,
  display_name text not null,
  -- {es,en}
  bio jsonb not null,
  photo_url text,
  -- modality ids
  specialties jsonb not null,
  certifications jsonb,
  -- COP
  rate_per_class integer,
  active boolean not null default false,
  rating_avg numeric(12,2)
);
create index if not exists teachers_tenant_idx on public.teachers(tenant_id);
create index if not exists teachers_user_id_idx on public.teachers(user_id);
create trigger teachers_touch before update on public.teachers for each row execute function public.touch_updated_at();
alter table public.teachers enable row level security;
create policy "teachers: tenant read" on public.teachers for select using (tenant_id = public.current_tenant_id());
create policy "teachers: staff write" on public.teachers for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Class types of the club, each with its colour tone.
create table if not exists public.modalities (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null,
  name_es text not null,
  name_en text not null,
  -- colour tone (D-01 classTones), one per modality
  tone text not null check (tone in ('moss', 'river', 'clay', 'sun', 'sage', 'slate', 'plum')),
  description jsonb not null,
  -- 1–5
  intensity integer not null,
  heated boolean not null default false,
  duration_min integer not null,
  active boolean not null default false
);
create index if not exists modalities_tenant_idx on public.modalities(tenant_id);
create trigger modalities_touch before update on public.modalities for each row execute function public.touch_updated_at();
alter table public.modalities enable row level security;
create policy "modalities: tenant read" on public.modalities for select using (tenant_id = public.current_tenant_id());
create policy "modalities: staff write" on public.modalities for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Physical rooms and their mat capacity.
create table if not exists public.rooms (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  capacity integer not null,
  heated boolean not null default false,
  notes text
);
create index if not exists rooms_tenant_idx on public.rooms(tenant_id);
create trigger rooms_touch before update on public.rooms for each row execute function public.touch_updated_at();
alter table public.rooms enable row level security;
create policy "rooms: tenant read" on public.rooms for select using (tenant_id = public.current_tenant_id());
create policy "rooms: staff write" on public.rooms for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Recurrence rules that generate sessions.
create table if not exists public.class_templates (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  modality_id uuid not null references public.modalities(id) on delete set null,
  teacher_id uuid not null references public.teachers(id) on delete set null,
  room_id uuid not null references public.rooms(id) on delete set null,
  -- 0=Sun … 6=Sat
  weekday integer not null,
  start_time time not null,
  duration_min integer not null,
  capacity integer not null,
  level text not null check (level in ('all', 'beginner', 'intermediate', 'advanced')),
  active boolean not null default false
);
create index if not exists class_templates_tenant_idx on public.class_templates(tenant_id);
create index if not exists class_templates_modality_id_idx on public.class_templates(modality_id);
create index if not exists class_templates_teacher_id_idx on public.class_templates(teacher_id);
create index if not exists class_templates_room_id_idx on public.class_templates(room_id);
create trigger class_templates_touch before update on public.class_templates for each row execute function public.touch_updated_at();
alter table public.class_templates enable row level security;
create policy "class_templates: tenant read" on public.class_templates for select using (tenant_id = public.current_tenant_id());
create policy "class_templates: staff write" on public.class_templates for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Each concrete class on the calendar, with live capacity.
create table if not exists public.class_sessions (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  template_id uuid references public.class_templates(id) on delete set null,
  title text not null,
  modality_id uuid not null references public.modalities(id) on delete set null,
  teacher_id uuid not null references public.teachers(id) on delete set null,
  room_id uuid not null references public.rooms(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null,
  booked_count integer not null,
  level text not null check (level in ('all', 'beginner', 'intermediate', 'advanced')),
  status text not null check (status in ('scheduled', 'cancelled', 'completed')),
  cancel_reason text
);
create index if not exists class_sessions_tenant_idx on public.class_sessions(tenant_id);
create index if not exists class_sessions_template_id_idx on public.class_sessions(template_id);
create index if not exists class_sessions_modality_id_idx on public.class_sessions(modality_id);
create index if not exists class_sessions_teacher_id_idx on public.class_sessions(teacher_id);
create index if not exists class_sessions_room_id_idx on public.class_sessions(room_id);
create trigger class_sessions_touch before update on public.class_sessions for each row execute function public.touch_updated_at();
alter table public.class_sessions enable row level security;
create policy "class_sessions: tenant read" on public.class_sessions for select using (tenant_id = public.current_tenant_id());
create policy "class_sessions: staff write" on public.class_sessions for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · A room taken by something other than a class: private event, rental, private class, maintenance or a block (S-05). An Especial may pay for it.
-- access:
--   · front_desk/coordinator/admin/finance/super_admin: full control
--   · teacher: read bookings whose teacher_id resolves to their teachers row (S-03)
--   · customer: read own bookings (customer_id = auth.uid())
--   · a booking in status cancelled frees the room; done is history and is never edited
create table if not exists public.space_bookings (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  room_id uuid not null references public.rooms(id) on delete set null,
  kind text not null check (kind in ('private_event', 'rental', 'private_class', 'maintenance', 'blocked')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  customer_id uuid references public.users(id) on delete set null,
  -- who it is for when they are not a member (a company, a birthday host)
  contact_name text,
  -- teacher booked with the room; their payout lives on the special charge
  teacher_id uuid references public.teachers(id) on delete set null,
  -- the Especial that paid for this window (S-04)
  special_charge_id uuid,
  status text not null check (status in ('held', 'confirmed', 'cancelled', 'done')),
  note text,
  -- staff user who booked it
  created_by uuid references public.users(id) on delete set null
);
create index if not exists space_bookings_tenant_idx on public.space_bookings(tenant_id);
create index if not exists space_bookings_room_id_idx on public.space_bookings(room_id);
create index if not exists space_bookings_customer_id_idx on public.space_bookings(customer_id);
create index if not exists space_bookings_teacher_id_idx on public.space_bookings(teacher_id);
create index if not exists space_bookings_special_charge_id_idx on public.space_bookings(special_charge_id);
create index if not exists space_bookings_created_by_idx on public.space_bookings(created_by);
create trigger space_bookings_touch before update on public.space_bookings for each row execute function public.touch_updated_at();
alter table public.space_bookings enable row level security;
create policy "space_bookings: tenant read" on public.space_bookings for select using (tenant_id = public.current_tenant_id());
create policy "space_bookings: staff write" on public.space_bookings for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · One person’s spot in a session.
create table if not exists public.bookings (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  session_id uuid not null references public.class_sessions(id) on delete set null,
  status text not null check (status in ('booked', 'checked_in', 'cancelled', 'no_show', 'late_cancel')),
  -- package = one class of the person's 12-class package (class_ledger); membership is dormant since 0051
  paid_with text not null check (paid_with in ('package', 'single', 'trial', 'guest', 'comp', 'membership')),
  -- the −1 row a package booking wrote
  ledger_id uuid,
  checked_in_at timestamptz,
  cancelled_at timestamptz,
  rated boolean not null default false
);
create index if not exists bookings_tenant_idx on public.bookings(tenant_id);
create index if not exists bookings_user_id_idx on public.bookings(user_id);
create index if not exists bookings_session_id_idx on public.bookings(session_id);
create index if not exists bookings_ledger_id_idx on public.bookings(ledger_id);
create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();
alter table public.bookings enable row level security;
create policy "bookings: tenant read" on public.bookings for select using (tenant_id = public.current_tenant_id());
create policy "bookings: staff write" on public.bookings for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Waiting positions and claim window.
create table if not exists public.waitlist (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  session_id uuid not null references public.class_sessions(id) on delete set null,
  position integer not null,
  status text not null check (status in ('waiting', 'offered', 'claimed', 'expired', 'left')),
  offered_at timestamptz,
  claim_until timestamptz
);
create index if not exists waitlist_tenant_idx on public.waitlist(tenant_id);
create index if not exists waitlist_user_id_idx on public.waitlist(user_id);
create index if not exists waitlist_session_id_idx on public.waitlist(session_id);
create trigger waitlist_touch before update on public.waitlist for each row execute function public.touch_updated_at();
alter table public.waitlist enable row level security;
create policy "waitlist: tenant read" on public.waitlist for select using (tenant_id = public.current_tenant_id());
create policy "waitlist: staff write" on public.waitlist for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · A class rating (C-10): stars, tags and comment.
-- access:
--   · customer: insert + read own rows (user_id = auth.uid()), one per booking
--   · teacher: read rows for own sessions, without user_id when visibility = anonymous
--   · coordinator/admin: read all (M-06), never edit the rating
create table if not exists public.reviews (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  class_session_id uuid not null references public.class_sessions(id) on delete set null,
  teacher_id uuid not null references public.teachers(id) on delete set null,
  -- 1–5
  rating integer not null,
  -- good/fix tag keys
  tags jsonb not null,
  comment text,
  visibility text not null check (visibility in ('anonymous', 'named', 'private'))
);
create index if not exists reviews_tenant_idx on public.reviews(tenant_id);
create index if not exists reviews_user_id_idx on public.reviews(user_id);
create index if not exists reviews_class_session_id_idx on public.reviews(class_session_id);
create index if not exists reviews_teacher_id_idx on public.reviews(teacher_id);
create trigger reviews_touch before update on public.reviews for each row execute function public.touch_updated_at();
alter table public.reviews enable row level security;
create policy "reviews: tenant read" on public.reviews for select using (tenant_id = public.current_tenant_id());
create policy "reviews: staff write" on public.reviews for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Workshops, sound baths and special events (C-23), published from M-02.
-- access:
--   · customer + anon: read where status = published
--   · coordinator/admin: write
create table if not exists public.events (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null,
  -- {es,en}
  title jsonb not null,
  -- {es,en} label
  kind jsonb not null,
  -- {es,en}
  description jsonb not null,
  -- [{es,en}]
  bring jsonb,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  room_id uuid references public.rooms(id) on delete set null,
  host_teacher_id uuid references public.teachers(id) on delete set null,
  capacity integer not null,
  -- COP, public price
  price_cop integer not null,
  -- COP, member price (0 = included)
  member_price_cop integer not null,
  -- media key; placeholder until real imagery
  cover_key text,
  status text not null check (status in ('draft', 'published', 'cancelled'))
);
create index if not exists events_tenant_idx on public.events(tenant_id);
create index if not exists events_room_id_idx on public.events(room_id);
create index if not exists events_host_teacher_id_idx on public.events(host_teacher_id);
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
alter table public.events enable row level security;
create policy "events: tenant read" on public.events for select using (tenant_id = public.current_tenant_id());
create policy "events: staff write" on public.events for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Who is going to an event and with which payment (C-23).
-- access:
--   · customer: insert + read + cancel own rows (user_id = auth.uid())
--   · front_desk/coordinator/admin: read all, mark attended
create table if not exists public.event_rsvps (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  event_id uuid not null references public.events(id) on delete set null,
  user_id uuid not null references public.users(id) on delete set null,
  status text not null check (status in ('going', 'cancelled', 'attended', 'no_show')),
  payment_id uuid,
  -- extra seats taken
  guests integer not null
);
create index if not exists event_rsvps_tenant_idx on public.event_rsvps(tenant_id);
create index if not exists event_rsvps_event_id_idx on public.event_rsvps(event_id);
create index if not exists event_rsvps_user_id_idx on public.event_rsvps(user_id);
create index if not exists event_rsvps_payment_id_idx on public.event_rsvps(payment_id);
create trigger event_rsvps_touch before update on public.event_rsvps for each row execute function public.touch_updated_at();
alter table public.event_rsvps enable row level security;
create policy "event_rsvps: tenant read" on public.event_rsvps for select using (tenant_id = public.current_tenant_id());
create policy "event_rsvps: staff write" on public.event_rsvps for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- analytics · How many classes a week each person wants to take (C-01, C-27). One active row per person; history is kept.
-- access:
--   · customer: insert + read + update own rows (user_id = auth.uid())
--   · front_desk/coordinator/admin: read (M-06, M-12)
--   · one active row per person: setting a new goal ends the previous one (active = false), so history survives
create table if not exists public.practice_goals (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  -- only weekly today; a monthly cadence is reserved for a later pass and would extend this enum, never replace it
  cadence text not null check (cadence in ('week')),
  -- classes per week the member chose, 1–7; 0 = no goal, only tracking
  target integer not null,
  -- member = picked by hand · suggested = accepted the app’s suggestion from their own history
  source text not null check (source in ('member', 'suggested')),
  starts_on date not null,
  active boolean not null default false,
  -- why, in the member’s words; optional
  note text
);
create index if not exists practice_goals_tenant_idx on public.practice_goals(tenant_id);
create index if not exists practice_goals_user_id_idx on public.practice_goals(user_id);
create trigger practice_goals_touch before update on public.practice_goals for each row execute function public.touch_updated_at();
alter table public.practice_goals enable row level security;
create policy "practice_goals: tenant read" on public.practice_goals for select using (tenant_id = public.current_tenant_id());
create policy "practice_goals: staff write" on public.practice_goals for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- analytics · The member-facing moments the raw tables do not hold: a goal set, a milestone reached, a rest week that saved the streak… Bookings, check-ins and payments stay in their own tables and every metric is derived from them.
-- access:
--   · customer: read own rows (user_id = auth.uid()); inserts happen from the app on the member’s own actions
--   · coordinator/admin/front_desk: read all (M-12, M-06)
--   · append-only: never updated nor deleted; a correction is a new row
create table if not exists public.activity_events (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- null = studio-level event
  user_id uuid references public.users(id) on delete set null,
  kind text not null check (kind in ('goal.set', 'milestone', 'streak.saved', 'streak.broken', 'first.visit', 'plan.purchased', 'plan.renewed', 'package.expiring')),
  -- when it happened, which may be earlier than when the app noticed (created_at)
  occurred_at timestamptz not null,
  -- the row it points at (bookings, practice_goals, class_ledger…)
  ref_table text,
  ref_id text,
  -- kind-specific: { target } for goal.set, { count } for milestone, { week } for streak.saved
  payload jsonb
);
create index if not exists activity_events_tenant_idx on public.activity_events(tenant_id);
create index if not exists activity_events_user_id_idx on public.activity_events(user_id);
create trigger activity_events_touch before update on public.activity_events for each row execute function public.touch_updated_at();
alter table public.activity_events enable row level security;
create policy "activity_events: tenant read" on public.activity_events for select using (tenant_id = public.current_tenant_id());
create policy "activity_events: staff write" on public.activity_events for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Launch list (0051): trial class, individual class, 12-class package, private classes and gift cards. Generated from src/tenant/pricing.ts.
create table if not exists public.plans (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null,
  family text not null check (family in ('bienvenida', 'paquetes', 'privadas', 'regalos')),
  name_es text not null,
  name_en text not null,
  description jsonb not null,
  -- COP, integer
  price integer not null,
  period text check (period in ('once', 'month', 'year')),
  -- classes the plan gives (1, or 12 for the package)
  classes integer,
  validity_days integer,
  is_from_price boolean not null default false,
  badge jsonb,
  active boolean not null default false,
  sort integer not null
);
create index if not exists plans_tenant_idx on public.plans(tenant_id);
create trigger plans_touch before update on public.plans for each row execute function public.touch_updated_at();
alter table public.plans enable row level security;
create policy "plans: tenant read" on public.plans for select using (tenant_id = public.current_tenant_id());
create policy "plans: staff write" on public.plans for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · A person’s recurring subscription to a plan. Unused since 0051: the launch list has no recurring plan; the table stays for post-launch pricing.
create table if not exists public.memberships (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  plan_id uuid not null references public.plans(id) on delete set null,
  status text not null check (status in ('active', 'paused', 'past_due', 'cancelled', 'expired')),
  starts_at date not null,
  renews_at date,
  ends_at date,
  paused_until date
);
create index if not exists memberships_tenant_idx on public.memberships(tenant_id);
create index if not exists memberships_user_id_idx on public.memberships(user_id);
create index if not exists memberships_plan_id_idx on public.memberships(plan_id);
create trigger memberships_touch before update on public.memberships for each row execute function public.touch_updated_at();
alter table public.memberships enable row level security;
create policy "memberships: tenant read" on public.memberships for select using (tenant_id = public.current_tenant_id());
create policy "memberships: staff write" on public.memberships for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · The classes of each package: bought (+), used (−), returned and expired. HOY has no credits (0051): the balance is in classes.
create table if not exists public.class_ledger (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  payment_id uuid,
  -- + purchase, − use
  delta integer not null,
  reason text not null check (reason in ('purchase', 'booking', 'refund', 'expiry', 'gift', 'comp', 'cancel_return', 'reschedule')),
  expires_at date,
  -- purchase rows: the day a package freeze started (once per package)
  frozen_from date,
  -- purchase rows: the last frozen day; expires_at moved by the same days
  frozen_until date
);
create index if not exists class_ledger_tenant_idx on public.class_ledger(tenant_id);
create index if not exists class_ledger_user_id_idx on public.class_ledger(user_id);
create index if not exists class_ledger_plan_id_idx on public.class_ledger(plan_id);
create index if not exists class_ledger_payment_id_idx on public.class_ledger(payment_id);
create trigger class_ledger_touch before update on public.class_ledger for each row execute function public.touch_updated_at();
alter table public.class_ledger enable row level security;
create policy "class_ledger: tenant read" on public.class_ledger for select using (tenant_id = public.current_tenant_id());
create policy "class_ledger: staff write" on public.class_ledger for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Each charge, via Wompi or manual.
create table if not exists public.payments (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- null only for an Especial sold to a non-member contact (special_charges.contact_name carries who paid)
  user_id uuid references public.users(id) on delete set null,
  -- null for an event RSVP or an Especial (special_charges)
  plan_id uuid references public.plans(id) on delete set null,
  -- COP, integer
  amount integer not null,
  -- COP, integer — what the desk actually received; equals amount unless a note explains why
  amount_paid integer,
  currency text not null,
  -- online: card, PSE or a Wompi QR code; at the desk: cash and the other desk methods (0051 — no Nequi, no Daviplata)
  method text not null check (method in ('card', 'pse', 'qr', 'cash', 'transfer', 'gift_card')),
  provider text not null check (provider in ('wompi', 'manual')),
  provider_ref text,
  status text not null check (status in ('pending', 'approved', 'declined', 'refunded', 'voided')),
  paid_at timestamptz,
  -- staff user for manual payments
  taken_by uuid references public.users(id) on delete set null,
  -- Why the received amount differs from the invoice (S-04 requires it when it does)
  note text
);
create index if not exists payments_tenant_idx on public.payments(tenant_id);
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_plan_id_idx on public.payments(plan_id);
create index if not exists payments_taken_by_idx on public.payments(taken_by);
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();
alter table public.payments enable row level security;
create policy "payments: tenant read" on public.payments for select using (tenant_id = public.current_tenant_id());
create policy "payments: staff write" on public.payments for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Fiscal document per payment (DIAN later).
create table if not exists public.invoices (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payment_id uuid not null references public.payments(id) on delete set null,
  number text not null,
  -- COP, integer
  subtotal integer not null,
  -- COP, integer
  tax integer not null,
  -- COP, integer
  total integer not null,
  issued_at timestamptz not null,
  pdf_url text,
  dian_cufe text
);
create index if not exists invoices_tenant_idx on public.invoices(tenant_id);
create index if not exists invoices_payment_id_idx on public.invoices(payment_id);
create trigger invoices_touch before update on public.invoices for each row execute function public.touch_updated_at();
alter table public.invoices enable row level security;
create policy "invoices: tenant read" on public.invoices for select using (tenant_id = public.current_tenant_id());
create policy "invoices: staff write" on public.invoices for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Vouchers bought to give away, with scheduled delivery.
create table if not exists public.gift_cards (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  code text not null,
  buyer_user_id uuid references public.users(id) on delete set null,
  recipient_name text not null,
  recipient_contact text not null,
  -- COP, integer
  amount integer not null,
  -- COP, integer
  balance integer not null,
  deliver_at timestamptz,
  redeemed_by uuid references public.users(id) on delete set null,
  status text not null check (status in ('scheduled', 'sent', 'redeemed', 'expired'))
);
create index if not exists gift_cards_tenant_idx on public.gift_cards(tenant_id);
create index if not exists gift_cards_buyer_user_id_idx on public.gift_cards(buyer_user_id);
create index if not exists gift_cards_redeemed_by_idx on public.gift_cards(redeemed_by);
create trigger gift_cards_touch before update on public.gift_cards for each row execute function public.touch_updated_at();
alter table public.gift_cards enable row level security;
create policy "gift_cards: tenant read" on public.gift_cards for select using (tenant_id = public.current_tenant_id());
create policy "gift_cards: staff write" on public.gift_cards for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Methods the person saved (C-05). The token belongs to Wompi; we never store the card.
-- access:
--   · customer: full control of own rows (user_id = auth.uid())
--   · front_desk: read brand/last4 only, to recognise a payment at the desk
--   · nobody: token_ref is never selectable from the client once Wompi is live (vault column)
create table if not exists public.payment_methods (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  provider text not null check (provider in ('wompi', 'manual')),
  kind text not null check (kind in ('card', 'pse', 'transfer', 'cash')),
  -- Visa, Mastercard, Bancolombia…
  brand text not null,
  last4 text,
  -- Wompi token placeholder — never a real PAN or token in the mock
  token_ref text,
  is_default boolean not null default false,
  -- MM/YY
  expires text
);
create index if not exists payment_methods_tenant_idx on public.payment_methods(tenant_id);
create index if not exists payment_methods_user_id_idx on public.payment_methods(user_id);
create trigger payment_methods_touch before update on public.payment_methods for each row execute function public.touch_updated_at();
alter table public.payment_methods enable row level security;
create policy "payment_methods: tenant read" on public.payment_methods for select using (tenant_id = public.current_tenant_id());
create policy "payment_methods: staff write" on public.payment_methods for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Invites members send (C-16) and the gift class once the guest joins.
-- access:
--   · customer: insert + read own rows (inviter_user_id = auth.uid())
--   · front_desk: read by code, to honour a pass at the desk
--   · admin/finance: write status and reward_ledger_id (the reward class is granted server-side)
create table if not exists public.invites (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  inviter_user_id uuid not null references public.users(id) on delete set null,
  invitee_phone text,
  invitee_email text,
  invitee_user_id uuid references public.users(id) on delete set null,
  channel text not null check (channel in ('whatsapp', 'email', 'link')),
  code text not null,
  -- class the invite was sent from
  session_id uuid references public.class_sessions(id) on delete set null,
  status text not null check (status in ('sent', 'opened', 'joined', 'rewarded')),
  reward_ledger_id uuid references public.class_ledger(id) on delete set null
);
create index if not exists invites_tenant_idx on public.invites(tenant_id);
create index if not exists invites_inviter_user_id_idx on public.invites(inviter_user_id);
create index if not exists invites_invitee_user_id_idx on public.invites(invitee_user_id);
create index if not exists invites_session_id_idx on public.invites(session_id);
create index if not exists invites_reward_ledger_id_idx on public.invites(reward_ledger_id);
create trigger invites_touch before update on public.invites for each row execute function public.touch_updated_at();
alter table public.invites enable row level security;
create policy "invites: tenant read" on public.invites for select using (tenant_id = public.current_tenant_id());
create policy "invites: staff write" on public.invites for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · A charge whose concept and price were typed by hand at the desk (S-04): a private event, a rental, a group session, a special request. It may carry a manual teacher payout and a room booking.
-- access:
--   · front_desk/coordinator/admin/finance/super_admin: full control
--   · teacher: read rows where teacher_id resolves to their teachers row (the payout feeds their S-03 statement)
--   · customer: read own rows (customer_id = auth.uid())
--   · the money in is the linked payments row; the money out is the payroll_lines row of kind manual — this table joins the two
create table if not exists public.special_charges (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- free text, e.g. "Cumpleaños de Mariana · sala + profe"
  concept text not null,
  -- COP, integer — the price agreed by hand (IVA handled by S-04 as for any sale)
  amount integer not null,
  customer_id uuid references public.users(id) on delete set null,
  -- who paid when they are not a member
  contact_name text,
  teacher_id uuid references public.teachers(id) on delete set null,
  -- COP, integer — what the teacher is paid for this Especial; becomes a payroll_lines row of kind manual
  teacher_payout integer,
  space_booking_id uuid references public.space_bookings(id) on delete set null,
  payment_id uuid not null references public.payments(id) on delete set null,
  -- pricing.ts espacio item the concept started from (privada, taller, foto…), null when typed free
  source_item text,
  note text,
  created_by uuid references public.users(id) on delete set null
);
create index if not exists special_charges_tenant_idx on public.special_charges(tenant_id);
create index if not exists special_charges_customer_id_idx on public.special_charges(customer_id);
create index if not exists special_charges_teacher_id_idx on public.special_charges(teacher_id);
create index if not exists special_charges_space_booking_id_idx on public.special_charges(space_booking_id);
create index if not exists special_charges_payment_id_idx on public.special_charges(payment_id);
create index if not exists special_charges_created_by_idx on public.special_charges(created_by);
create trigger special_charges_touch before update on public.special_charges for each row execute function public.touch_updated_at();
alter table public.special_charges enable row level security;
create policy "special_charges: tenant read" on public.special_charges for select using (tenant_id = public.current_tenant_id());
create policy "special_charges: staff write" on public.special_charges for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · One monthly teacher payroll run (M-09a): period, status, total and payout method.
-- access:
--   · finance/admin: full control
--   · teacher: read runs that contain a line of their own (S-03)
--   · a run in status paid is immutable; a correction is a new adjustment line in the next run
create table if not exists public.payroll_runs (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null,
  status text not null check (status in ('draft', 'approved', 'paid')),
  -- COP, sum of payroll_lines.amount
  total integer not null,
  method text not null check (method in ('wompi', 'transfer', 'cash')),
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  -- Wompi payout reference (simulated today)
  provider_ref text,
  notes text
);
create index if not exists payroll_runs_tenant_idx on public.payroll_runs(tenant_id);
create index if not exists payroll_runs_approved_by_idx on public.payroll_runs(approved_by);
create trigger payroll_runs_touch before update on public.payroll_runs for each row execute function public.touch_updated_at();
alter table public.payroll_runs enable row level security;
create policy "payroll_runs: tenant read" on public.payroll_runs for select using (tenant_id = public.current_tenant_id());
create policy "payroll_runs: staff write" on public.payroll_runs for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · One class taught, bonus, adjustment or manual Especial payout inside a run (M-09b, S-03).
-- access:
--   · finance/admin: full control while the run is draft
--   · teacher: read own lines (teacher_id resolves to their teachers row)
--   · nobody: lines of a paid run are read-only
create table if not exists public.payroll_lines (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  run_id uuid not null references public.payroll_runs(id) on delete set null,
  teacher_id uuid not null references public.teachers(id) on delete set null,
  -- null for a bonus, an adjustment or a month older than the session window
  class_session_id uuid references public.class_sessions(id) on delete set null,
  -- manual = a teacher payout agreed by hand on an Especial (special_charges.teacher_payout), pulled into the run by the draft generator
  kind text not null check (kind in ('class', 'bonus', 'adjustment', 'manual')),
  -- source of a manual line — the generator uses it to stay idempotent
  special_charge_id uuid references public.special_charges(id) on delete set null,
  -- COP, teachers.rate_per_class at the time of the run
  rate integer not null,
  -- COP, signed: an adjustment may be negative
  amount integer not null,
  -- checked-in students, for the statement
  attendees integer,
  -- set when this teacher is settled; a run may be paid teacher by teacher (M-09b)
  paid_at timestamptz,
  paid_method text check (paid_method in ('wompi', 'transfer', 'cash')),
  note text
);
create index if not exists payroll_lines_tenant_idx on public.payroll_lines(tenant_id);
create index if not exists payroll_lines_run_id_idx on public.payroll_lines(run_id);
create index if not exists payroll_lines_teacher_id_idx on public.payroll_lines(teacher_id);
create index if not exists payroll_lines_class_session_id_idx on public.payroll_lines(class_session_id);
create index if not exists payroll_lines_special_charge_id_idx on public.payroll_lines(special_charge_id);
create trigger payroll_lines_touch before update on public.payroll_lines for each row execute function public.touch_updated_at();
alter table public.payroll_lines enable row level security;
create policy "payroll_lines: tenant read" on public.payroll_lines for select using (tenant_id = public.current_tenant_id());
create policy "payroll_lines: staff write" on public.payroll_lines for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Template for one fixed studio cost (rent, utilities, cleaning…) with its cadence; M-09c generates the period’s expenses from it.
-- access:
--   · admin/finance: full control (M-09c)
--   · nobody else reads: expenses are studio-internal
--   · deactivate instead of delete once a template has generated rows, so history keeps its origin
create table if not exists public.expense_templates (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  concept text not null,
  category text not null check (category in ('rent', 'utilities', 'internet', 'cleaning', 'software', 'insurance', 'supplies', 'maintenance', 'marketing', 'fees', 'other')),
  -- COP per occurrence
  amount integer not null,
  cadence text not null check (cadence in ('biweekly', 'monthly')),
  -- day of month it falls due (1–28); biweekly also falls due 15 days later
  anchor_day integer not null,
  vendor text,
  active boolean not null default false,
  note text
);
create index if not exists expense_templates_tenant_idx on public.expense_templates(tenant_id);
create trigger expense_templates_touch before update on public.expense_templates for each row execute function public.touch_updated_at();
alter table public.expense_templates enable row level security;
create policy "expense_templates: tenant read" on public.expense_templates for select using (tenant_id = public.current_tenant_id());
create policy "expense_templates: staff write" on public.expense_templates for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Every studio expense, fixed (generated from a template) or variable (recorded by hand); it subtracts in the M-09 balance.
-- access:
--   · admin/finance: full control (M-09c)
--   · nobody else reads: expenses are studio-internal
--   · a paid row (paid_on set) is never deleted by the generator; corrections are a new row with a note
create table if not exists public.expenses (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text not null check (kind in ('fixed', 'variable')),
  category text not null check (category in ('rent', 'utilities', 'internet', 'cleaning', 'software', 'insurance', 'supplies', 'maintenance', 'marketing', 'fees', 'other')),
  concept text not null,
  -- COP, integer
  amount integer not null,
  -- the day the cost falls due or was incurred
  incurred_on date not null,
  -- null = still to pay
  paid_on date,
  method text not null check (method in ('cash', 'transfer', 'card')),
  vendor text,
  note text,
  -- set when generated from a recurring template (kind = fixed)
  template_id uuid references public.expense_templates(id) on delete set null,
  created_by uuid references public.users(id) on delete set null
);
create index if not exists expenses_tenant_idx on public.expenses(tenant_id);
create index if not exists expenses_template_id_idx on public.expenses(template_id);
create index if not exists expenses_created_by_idx on public.expenses(created_by);
create trigger expenses_touch before update on public.expenses for each row execute function public.touch_updated_at();
alter table public.expenses enable row level security;
create policy "expenses: tenant read" on public.expenses for select using (tenant_id = public.current_tenant_id());
create policy "expenses: staff write" on public.expenses for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- comms · Versioned automated emails (M-04): to customers, teachers and the team.
create table if not exists public.email_templates (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  key text not null,
  name text not null,
  -- who receives it (0055): a member or prospect, a teacher, or the studio team
  audience text not null check (audience in ('customer', 'teacher', 'studio')),
  trigger text not null,
  -- when it has to exist (0055): before launch, first 60 days, later
  priority text check (priority in ('launch', 'first_60', 'later')),
  subject jsonb not null,
  body_mjml text not null,
  version integer not null,
  active boolean not null default false
);
create index if not exists email_templates_tenant_idx on public.email_templates(tenant_id);
create trigger email_templates_touch before update on public.email_templates for each row execute function public.touch_updated_at();
alter table public.email_templates enable row level security;
create policy "email_templates: tenant read" on public.email_templates for select using (tenant_id = public.current_tenant_id());
create policy "email_templates: staff write" on public.email_templates for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- comms · Meta-approved templates with variables.
create table if not exists public.wa_templates (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  key text not null,
  name text not null,
  category text not null check (category in ('utility', 'marketing', 'authentication')),
  body jsonb not null,
  approval_status text not null check (approval_status in ('draft', 'pending', 'approved', 'rejected')),
  active boolean not null default false
);
create index if not exists wa_templates_tenant_idx on public.wa_templates(tenant_id);
create trigger wa_templates_touch before update on public.wa_templates for each row execute function public.touch_updated_at();
alter table public.wa_templates enable row level security;
create policy "wa_templates: tenant read" on public.wa_templates for select using (tenant_id = public.current_tenant_id());
create policy "wa_templates: staff write" on public.wa_templates for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- comms · Trigger → channel → template, with quiet hours.
create table if not exists public.automations (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  trigger text not null,
  channel text not null check (channel in ('whatsapp', 'email', 'push')),
  template_key text not null,
  delay_min integer not null,
  quiet_hours jsonb,
  enabled boolean not null default false
);
create index if not exists automations_tenant_idx on public.automations(tenant_id);
create trigger automations_touch before update on public.automations for each row execute function public.touch_updated_at();
alter table public.automations enable row level security;
create policy "automations: tenant read" on public.automations for select using (tenant_id = public.current_tenant_id());
create policy "automations: staff write" on public.automations for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- comms · The whole conversation with each person: WhatsApp and email both ways (manual, automation, newsletter, system) plus internal staff notes. M-06 shows it per person; S-06 spreads it across the front-desk inbox.
-- access:
--   · front_desk/coordinator/admin: read every row of the tenant, insert outbound and internal rows, update read_at/read_by only (S-06, M-06)
--   · customer: read own inbound/outbound rows (user_id = auth.uid()); internal rows (channel note) are never visible to the member
--   · automation/webhook service role: insert inbound rows and update status/external_id from the provider callback
--   · retention: internal notes follow the member record (deleted with it, M-11); provider ids are kept for reconciliation
create table if not exists public.message_log (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- the member this belongs to; null for team-only rows (a substitution request)
  user_id uuid references public.users(id) on delete set null,
  -- note = internal staff note, never delivered
  channel text not null check (channel in ('whatsapp', 'email', 'push', 'note')),
  -- inbound = from the member · outbound = to the member · internal = staff note (M-06 / S-06)
  direction text not null check (direction in ('inbound', 'outbound', 'internal')),
  -- manual = typed by staff · automation = M-05/M-04 trigger · newsletter = campaign · system = receipts, substitution requests
  source text not null check (source in ('manual', 'automation', 'newsletter', 'system')),
  template_key text,
  automation_id uuid references public.automations(id) on delete set null,
  -- email subject / newsletter title
  subject text,
  -- the message text as sent or received
  body text,
  -- received = inbound row · queued = waiting for quiet hours to end
  status text not null check (status in ('received', 'queued', 'sent', 'delivered', 'read', 'failed')),
  sent_at timestamptz,
  -- staff author of an outbound or internal row; null for automations
  sent_by uuid references public.users(id) on delete set null,
  -- staff read receipt for an inbound row; null drives the unread counts (bell, S-01, S-06)
  read_at timestamptz,
  read_by uuid references public.users(id) on delete set null,
  -- provider message id (Meta wamid, email message-id) for the future webhook
  external_id text,
  -- provider extras: template vars, test flag, invoice number
  payload jsonb
);
create index if not exists message_log_tenant_idx on public.message_log(tenant_id);
create index if not exists message_log_user_id_idx on public.message_log(user_id);
create index if not exists message_log_automation_id_idx on public.message_log(automation_id);
create index if not exists message_log_sent_by_idx on public.message_log(sent_by);
create index if not exists message_log_read_by_idx on public.message_log(read_by);
create trigger message_log_touch before update on public.message_log for each row execute function public.touch_updated_at();
alter table public.message_log enable row level security;
create policy "message_log: tenant read" on public.message_log for select using (tenant_id = public.current_tenant_id());
create policy "message_log: staff write" on public.message_log for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- comms · The C-24 inbox: what the studio sends, with read state and a deep link.
-- access:
--   · customer: read own rows and update read_at only (user_id = auth.uid())
--   · front_desk/coordinator/admin: insert for a member (send)
--   · retention: rows older than 90 days are deleted by a scheduled job
create table if not exists public.notifications (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  kind text not null check (kind in ('booking', 'waitlist', 'payment', 'class', 'event', 'review', 'invite', 'studio')),
  -- {es,en}
  title jsonb not null,
  -- {es,en}
  body jsonb not null,
  read_at timestamptz,
  -- in-app route, e.g. /app/booking/:id
  deep_link text,
  sent_via text not null check (sent_via in ('in_app', 'whatsapp', 'email', 'push'))
);
create index if not exists notifications_tenant_idx on public.notifications(tenant_id);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create trigger notifications_touch before update on public.notifications for each row execute function public.touch_updated_at();
alter table public.notifications enable row level security;
create policy "notifications: tenant read" on public.notifications for select using (tenant_id = public.current_tenant_id());
create policy "notifications: staff write" on public.notifications for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- comms · Channel × category each person accepts (C-24 / C-19). No row = enabled.
-- access:
--   · customer: full control of own rows (user_id = auth.uid())
--   · admin: read only, to respect a mute before sending
--   · marketing category is opt-out per channel; transactional categories always deliver in-app
create table if not exists public.notification_prefs (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  channel text not null check (channel in ('whatsapp', 'email', 'push')),
  category text not null check (category in ('bookings', 'waitlist', 'payments', 'events', 'marketing')),
  enabled boolean not null default false
);
create index if not exists notification_prefs_tenant_idx on public.notification_prefs(tenant_id);
create index if not exists notification_prefs_user_id_idx on public.notification_prefs(user_id);
create trigger notification_prefs_touch before update on public.notification_prefs for each row execute function public.touch_updated_at();
alter table public.notification_prefs enable row level security;
create policy "notification_prefs: tenant read" on public.notification_prefs for select using (tenant_id = public.current_tenant_id());
create policy "notification_prefs: staff write" on public.notification_prefs for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- manual · Who marked which manual chapter (K-03) as read, and at which version: each person’s “read N of M”.
-- access:
--   · every staff role: insert + read own rows (user_id = auth.uid()); a re-read of a new version is a new row
--   · admin/coordinator/super_admin: read all (the K-03 “Equipo” view)
--   · never updated in place
create table if not exists public.manual_progress (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  -- file name without .md, e.g. 04-recepcion-y-check-in (same in ES and EN)
  chapter_slug text not null,
  -- chapter front-matter version read
  version text not null,
  read_at timestamptz not null
);
create index if not exists manual_progress_tenant_idx on public.manual_progress(tenant_id);
create index if not exists manual_progress_user_id_idx on public.manual_progress(user_id);
create trigger manual_progress_touch before update on public.manual_progress for each row execute function public.touch_updated_at();
alter table public.manual_progress enable row level security;
create policy "manual_progress: tenant read" on public.manual_progress for select using (tenant_id = public.current_tenant_id());
create policy "manual_progress: staff write" on public.manual_progress for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- manual · Each Day 1 / Week 1 / Month 1 checklist item (chapter 09) a person completed, and the stage sign-off by their trainer (item_key = __signoff).
-- access:
--   · every staff role: insert + delete own item rows (user_id = auth.uid()) while the stage is not signed
--   · coordinator/admin/super_admin: read all, insert the __signoff row for anyone (signed_by = auth.uid())
--   · a __signoff row is never deleted; a correction is a new row
create table if not exists public.manual_training (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- the person being trained
  user_id uuid not null references public.users(id) on delete set null,
  -- the checklist followed (a Role id)
  role text not null,
  stage text not null check (stage in ('day1', 'week1', 'month1')),
  -- src/modules/ops-manual/training.ts item key, or __signoff
  item_key text not null,
  done_at timestamptz not null,
  -- trainer who signed the stage (only on __signoff rows)
  signed_by uuid references public.users(id) on delete set null
);
create index if not exists manual_training_tenant_idx on public.manual_training(tenant_id);
create index if not exists manual_training_user_id_idx on public.manual_training(user_id);
create index if not exists manual_training_signed_by_idx on public.manual_training(signed_by);
create trigger manual_training_touch before update on public.manual_training for each row execute function public.touch_updated_at();
alter table public.manual_training enable row level security;
create policy "manual_training: tenant read" on public.manual_training for select using (tenant_id = public.current_tenant_id());
create policy "manual_training: staff write" on public.manual_training for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- manual · A manual section rewritten in the app by the owner or coordination (or suggested by an agent): shown instead of the repository text, with its history. The original markdown is never touched.
-- access:
--   · everyone who can read the manual: read rows with status live
--   · admin/super_admin: insert + update any section; coordinator: only sections marked {{editable:coordinator}}
--   · any staff role / agent: insert status suggested; only an editor turns it live or dismissed
--   · history is append-only: restoring sets status reverted, never deletes
create table if not exists public.manual_overrides (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  chapter_slug text not null,
  lang text not null check (lang in ('es', 'en')),
  -- the ## heading text the override replaces (the section below it)
  section_heading text not null,
  -- markdown of the section body, without the heading line
  body_md text not null,
  edited_by uuid references public.users(id) on delete set null,
  -- why it changed
  note text,
  -- 1, 2, 3… per chapter + lang + section
  version integer not null,
  status text not null check (status in ('live', 'reverted', 'suggested', 'dismissed'))
);
create index if not exists manual_overrides_tenant_idx on public.manual_overrides(tenant_id);
create index if not exists manual_overrides_edited_by_idx on public.manual_overrides(edited_by);
create trigger manual_overrides_touch before update on public.manual_overrides for each row execute function public.touch_updated_at();
alter table public.manual_overrides enable row level security;
create policy "manual_overrides: tenant read" on public.manual_overrides for select using (tenant_id = public.current_tenant_id());
create policy "manual_overrides: staff write" on public.manual_overrides for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- manual · “Request a change”: what someone on the team wants the manual to say. The owner answers it on K-04, or an agent picks it up through the actions registry.
-- access:
--   · every staff role: insert + read own rows (requested_by = auth.uid())
--   · admin/coordinator/super_admin: read all, update status and answer
create table if not exists public.manual_requests (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  chapter_slug text not null,
  section_heading text,
  lang text not null check (lang in ('es', 'en')),
  request text not null,
  requested_by uuid references public.users(id) on delete set null,
  status text not null check (status in ('open', 'done', 'dismissed')),
  answer text
);
create index if not exists manual_requests_tenant_idx on public.manual_requests(tenant_id);
create index if not exists manual_requests_requested_by_idx on public.manual_requests(requested_by);
create trigger manual_requests_touch before update on public.manual_requests for each row execute function public.touch_updated_at();
alter table public.manual_requests enable row level security;
create policy "manual_requests: tenant read" on public.manual_requests for select using (tenant_id = public.current_tenant_id());
create policy "manual_requests: staff write" on public.manual_requests for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- manual · Text rules the manual quotes with {{studio:key}} and the owner or coordination adjust without touching the markdown (lost items, opening, closing…). Numeric policies stay in M-08.
-- access:
--   · everyone who can read the manual: read
--   · admin/super_admin: update any row; coordinator: rows with editable_by = coordinator
--   · a new key is added in src/data/seed/studioPolicies.ts until Supabase lands
create table if not exists public.studio_policies (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  key text not null,
  -- {es,en}
  label jsonb not null,
  value_es text not null,
  value_en text not null,
  -- chapter number where it is quoted, e.g. 21
  chapter text,
  editable_by text not null check (editable_by in ('owner', 'coordinator')),
  updated_by uuid references public.users(id) on delete set null
);
create index if not exists studio_policies_tenant_idx on public.studio_policies(tenant_id);
create index if not exists studio_policies_updated_by_idx on public.studio_policies(updated_by);
create trigger studio_policies_touch before update on public.studio_policies for each row execute function public.touch_updated_at();
alter table public.studio_policies enable row level security;
create policy "studio_policies: tenant read" on public.studio_policies for select using (tenant_id = public.current_tenant_id());
create policy "studio_policies: staff write" on public.studio_policies for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- system · One row per external system (Wompi, WhatsApp, email, DIAN, maps, Supabase, Google Business Profile): status, non-secret fields ready to fill and notes for the dev (M-10). Keys live server-side, never here.
-- access:
--   · super_admin/admin: full control (M-10)
--   · finance: read (M-09a shows the Wompi status)
--   · nobody else reads; config holds public identifiers only — a secret in this table is a bug
create table if not exists public.integrations (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  key text not null check (key in ('wompi', 'whatsapp', 'email', 'dian', 'maps', 'supabase', 'google_business')),
  -- simulated = seam only · configured = ids filled, dev has not wired it · connected = live
  status text not null check (status in ('simulated', 'configured', 'connected')),
  -- non-secret fields per integration (merchant id, sender number, provider name, project URL…)
  config jsonb not null,
  -- what the dev must still finish, in the owner’s words
  notes text,
  updated_by uuid references public.users(id) on delete set null
);
create index if not exists integrations_tenant_idx on public.integrations(tenant_id);
create index if not exists integrations_updated_by_idx on public.integrations(updated_by);
create trigger integrations_touch before update on public.integrations for each row execute function public.touch_updated_at();
alter table public.integrations enable row level security;
create policy "integrations: tenant read" on public.integrations for select using (tenant_id = public.current_tenant_id());
create policy "integrations: staff write" on public.integrations for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- system · Keys HoyOS issues to developers to call its API (D-07). The SHA-256 hash and a visible prefix are stored; the full key is shown once. Verification is the server’s job (it does not exist yet).
-- access:
--   · super_admin/developer: select, insert, update (D-07, permission api_keys.write)
--   · admin: select without key_hash (D-07 read-only, api_keys.read)
--   · nobody deletes: revoking sets revoked_at so the audit trail keeps the row
--   · the raw key is never stored — a raw key in this table is a bug
create table if not exists public.api_keys (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  -- first 13 characters, e.g. hoy_live_ab12 — what the list shows
  prefix text not null,
  -- SHA-256 hex of the full key
  key_hash text not null,
  -- string[] from API_KEY_SCOPES (classes.read, bookings.write, hours.read…)
  scopes jsonb not null,
  environment text not null check (environment in ('live', 'test')),
  created_by uuid references public.users(id) on delete set null,
  -- written by the server on each verified request
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  -- set on the new key when it rotates an old one
  replaces_id uuid references public.api_keys(id) on delete set null
);
create index if not exists api_keys_tenant_idx on public.api_keys(tenant_id);
create index if not exists api_keys_created_by_idx on public.api_keys(created_by);
create index if not exists api_keys_replaces_id_idx on public.api_keys(replaces_id);
create trigger api_keys_touch before update on public.api_keys for each row execute function public.touch_updated_at();
alter table public.api_keys enable row level security;
create policy "api_keys: tenant read" on public.api_keys for select using (tenant_id = public.current_tenant_id());
create policy "api_keys: staff write" on public.api_keys for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- system · Who did what, on which entity, when (M-07).
create table if not exists public.audit_log (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  diff jsonb,
  ip text
);
create index if not exists audit_log_tenant_idx on public.audit_log(tenant_id);
create index if not exists audit_log_actor_id_idx on public.audit_log(actor_id);
create trigger audit_log_touch before update on public.audit_log for each row execute function public.touch_updated_at();
alter table public.audit_log enable row level security;
create policy "audit_log: tenant read" on public.audit_log for select using (tenant_id = public.current_tenant_id());
create policy "audit_log: staff write" on public.audit_log for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- system · The table manager views (M-03): which table, which kind of view (grid, list, gallery, board, calendar, timeline, graph) and with which filters, sorts, grouping and columns. A shared view is visible to the whole team.
-- access:
--   · staff with tables.read: read shared rows and their own (created_by = auth.uid())
--   · staff with tables.write: insert; update and delete their own rows (super_admin: any)
--   · is_default marks the view a table opens with; one default per table_name
create table if not exists public.table_views (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- the table this view shows (a name from src/data/schema.ts)
  table_name text not null,
  -- {es,en}
  name jsonb not null,
  kind text not null check (kind in ('grid', 'list', 'gallery', 'kanban', 'calendar', 'timeline', 'graph')),
  -- { filters: [{column, op, value}], sorts: [{column, dir}], groupBy, hiddenColumns, columnOrder, cardFields, kanbanColumn, pinned, dateColumn, endColumn, calendarMode, timelineZoom }
  config jsonb not null,
  is_default boolean not null default false,
  shared boolean not null default false,
  created_by uuid references public.users(id) on delete set null
);
create index if not exists table_views_tenant_idx on public.table_views(tenant_id);
create index if not exists table_views_created_by_idx on public.table_views(created_by);
create trigger table_views_touch before update on public.table_views for each row execute function public.touch_updated_at();
alter table public.table_views enable row level security;
create policy "table_views: tenant read" on public.table_views for select using (tenant_id = public.current_tenant_id());
create policy "table_views: staff write" on public.table_views for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- system · Index of docs/ for search and links (the .md files are the source).
create table if not exists public.docs_entries (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  path text not null,
  title text not null,
  kind text not null check (kind in ('prompt', 'changelog', 'rule', 'guide', 'manual')),
  page_codes jsonb
);
create index if not exists docs_entries_tenant_idx on public.docs_entries(tenant_id);
create trigger docs_entries_touch before update on public.docs_entries for each row execute function public.touch_updated_at();
alter table public.docs_entries enable row level security;
create policy "docs_entries: tenant read" on public.docs_entries for select using (tenant_id = public.current_tenant_id());
create policy "docs_entries: staff write" on public.docs_entries for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- design · Index of the D-02 library (the .meta.ts files are the source).
create table if not exists public.components (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  tier text not null check (tier in ('atom', 'molecule', 'organism', 'template')),
  states jsonb,
  used_by jsonb
);
create index if not exists components_tenant_idx on public.components(tenant_id);
create trigger components_touch before update on public.components for each row execute function public.touch_updated_at();
alter table public.components enable row level security;
create policy "components: tenant read" on public.components for select using (tenant_id = public.current_tenant_id());
create policy "components: staff write" on public.components for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- design · Per-page section order saved from the drag-and-drop editor.
create table if not exists public.page_layouts (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  page_code text not null,
  -- ordered section names
  sections jsonb not null,
  -- section names hidden
  hidden jsonb,
  updated_by uuid references public.users(id) on delete set null
);
create index if not exists page_layouts_tenant_idx on public.page_layouts(tenant_id);
create index if not exists page_layouts_updated_by_idx on public.page_layouts(updated_by);
create trigger page_layouts_touch before update on public.page_layouts for each row execute function public.touch_updated_at();
alter table public.page_layouts enable row level security;
create policy "page_layouts: tenant read" on public.page_layouts for select using (tenant_id = public.current_tenant_id());
create policy "page_layouts: staff write" on public.page_layouts for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- foreign keys to tables created later in this file (kept out of the create table so the order above stays by group)
alter table public.vouchers add constraint vouchers_tenant_id_fk foreign key (tenant_id) references public.tenants(id) on delete set null;
alter table public.voucher_bookings add constraint voucher_bookings_tenant_id_fk foreign key (tenant_id) references public.tenants(id) on delete set null;
alter table public.voucher_bookings add constraint voucher_bookings_sessionId_fk foreign key ("sessionId") references public.class_sessions(id) on delete set null;
alter table public.voucher_events add constraint voucher_events_tenant_id_fk foreign key (tenant_id) references public.tenants(id) on delete set null;
alter table public.deletion_requests add constraint deletion_requests_user_id_fk foreign key (user_id) references public.users(id) on delete set null;
alter table public.deletion_requests add constraint deletion_requests_resolved_by_fk foreign key (resolved_by) references public.users(id) on delete set null;
alter table public.consents add constraint consents_user_id_fk foreign key (user_id) references public.users(id) on delete set null;
alter table public.legal_acceptances add constraint legal_acceptances_user_id_fk foreign key (user_id) references public.users(id) on delete set null;
alter table public.space_bookings add constraint space_bookings_special_charge_id_fk foreign key (special_charge_id) references public.special_charges(id) on delete set null;
alter table public.bookings add constraint bookings_ledger_id_fk foreign key (ledger_id) references public.class_ledger(id) on delete set null;
alter table public.event_rsvps add constraint event_rsvps_payment_id_fk foreign key (payment_id) references public.payments(id) on delete set null;
alter table public.class_ledger add constraint class_ledger_payment_id_fk foreign key (payment_id) references public.payments(id) on delete set null;

-- ---------------------------------------------------------------------------------------------
-- RLS notes per role (refine per table when the real backend lands):
--   super_admin, admin   full read/write in their tenant (policy above)
--   coordinator          write on schedule, content, comms; read everything else
--   front_desk           write bookings, checkins (bookings.status), payments(manual), profiles; read classes
--   finance              read payments, invoices, memberships, credits; write refunds, payroll
--   teacher              read own class_sessions/bookings (teacher_id = own teachers.id); write attendance
--   maintenance          read rooms/class_sessions; write maintenance tables (future)
--   customer             read own rows (user_id = auth.uid()) in bookings, credits, memberships, payments,
--                        invoices, consents, waitlist; read public catalog (modalities, teachers,
--                        class_sessions, plans, legal_documents)
--   anon (public site)   read modalities, teachers(active), class_sessions(scheduled), plans(active), legal_documents(published)
-- Realtime: enable on class_sessions, bookings, waitlist, feature_flags, page_layouts.
-- Wompi webhooks write payments/invoices through an edge function with the service role, never from the client.
