// Generates supabase/schema.sql and docs/data-model.md from src/data/schema.ts.
// Run: npm run sql   (Node 22 type stripping). Commit both outputs.
import { writeFileSync } from 'node:fs';
const { tables, BASE_COLUMNS, TABLE_GROUPS } = await import('../src/data/schema.ts');

const PG = { uuid: 'uuid', text: 'text', int: 'integer', numeric: 'numeric(12,2)', bool: 'boolean', timestamptz: 'timestamptz', date: 'date', time: 'time', json: 'jsonb', enum: 'text' };
const columnName = (name) => /[A-Z]/.test(name) ? `"${name}"` : name;
const col = (c) => {
  const parts = [`  ${columnName(c.name)} ${PG[c.type]}`];
  if (c.name === 'id') parts.push('primary key default gen_random_uuid()');
  else if (!c.nullable) parts.push('not null');
  if (c.name === 'created_at' || c.name === 'updated_at') parts.push('default now()');
  if (c.type === 'bool') parts.push('default false');
  if (c.enum) parts.push(`check (${columnName(c.name)} in (${c.enum.map((e) => `'${e}'`).join(', ')}))`);
  // A reference to a table created later (or a circular pair such as special_charges ⇄ space_bookings)
  // cannot be inline: it is emitted as `alter table … add constraint` once every table exists.
  if (c.references && !c.deferFk) parts.push(`references public.${c.references}(id)${c.name === 'tenant_id' ? '' : ' on delete set null'}`);
  const line = parts.join(' ');
  return c.description ? `  -- ${c.description}\n${line}` : line;
};

let sql = `-- HoyOS — Supabase / Postgres schema draft
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

`;
const order = new Map(tables.map((t, i) => [t.name, i]));
const deferred = [];
for (const t of tables) {
  const cols = [...BASE_COLUMNS, ...t.columns].map((c) => {
    const later = c.references && c.references !== t.name && (order.get(c.references) ?? -1) > order.get(t.name);
    if (later) deferred.push(`alter table public.${t.name} add constraint ${t.name}_${c.name}_fk foreign key (${columnName(c.name)}) references public.${c.references}(id) on delete set null;`);
    return col(later ? { ...c, deferFk: true } : c);
  });
  if (t.name === 'class_pay_rules') {
    cols.push('  check ((template_id is null) <> (session_id is null))');
    cols.push("  check ((mode = 'flat' and flat_amount is not null and flat_amount >= 0) or (mode = 'attendance' and base_amount is not null and base_amount >= 0 and per_attendee is not null and per_attendee >= 0 and attendance_basis is not null))");
  }
  // enum check for tenant reference: tenants.tenant_id references itself; keep as plain uuid
  const rls = (t.rls ?? []).map((n) => `--   · ${n}`).join('\n');
  sql += `-- ${t.group} · ${t.description.en}\n${rls ? `-- access:\n${rls}\n` : ''}create table if not exists public.${t.name} (\n${cols.join(',\n')}\n);\n`;
  sql += `create index if not exists ${t.name}_tenant_idx on public.${t.name}(tenant_id);\n`;
  for (const c of t.columns.filter((c) => c.references)) sql += `create index if not exists ${t.name}_${c.name}_idx on public.${t.name}(${columnName(c.name)});\n`;
  sql += `create trigger ${t.name}_touch before update on public.${t.name} for each row execute function public.touch_updated_at();\n`;
  sql += `alter table public.${t.name} enable row level security;\n`;
  if (t.name === 'class_pay_rules') {
    sql += '-- DEFAULT DENY: private compensation needs authenticated tenant-scoped admin/super_admin/finance read and append-only RPCs. No client UPDATE/DELETE.\n\n';
    continue;
  }
  if (['vouchers', 'voucher_bookings', 'voucher_events', 'promotion_campaigns', 'promotion_shares', 'promotion_claims', 'promotion_events'].includes(t.name)) {
    sql += '-- DEFAULT DENY: no client policies until authenticated transactional voucher/promotion RPCs and scoped read policies exist.\n\n';
    continue;
  }
  sql += `create policy "${t.name}: tenant read" on public.${t.name} for select using (tenant_id = public.current_tenant_id());\n`;
  sql += `create policy "${t.name}: staff write" on public.${t.name} for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));\n\n`;
}
sql += `-- Promotion uniqueness belongs in the eventual transactional backend, never only UI checks.
create unique index if not exists promotion_share_code_unique on public.promotion_shares (tenant_id, upper(code));
create unique index if not exists promotion_claim_user_campaign_unique on public.promotion_claims (tenant_id, "campaignId", "userId");
create unique index if not exists promotion_claim_voucher_unique on public.promotion_claims (tenant_id, "voucherId");
create unique index if not exists promotion_request_unique on public.promotion_events (tenant_id, "requestId");
create unique index if not exists voucher_request_unique on public.voucher_events (tenant_id, "requestId");

`;
if (deferred.length) sql += `-- foreign keys to tables created later in this file (kept out of the create table so the order above stays by group)\n${deferred.join('\n')}\n\n`;
sql += `-- ---------------------------------------------------------------------------------------------
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
`;
writeFileSync(new URL('../supabase/schema.sql', import.meta.url), sql);

let md = `# Data model

_Generated from \`src/data/schema.ts\` by \`npm run sql\`. The TypeScript file is the source of truth; \`supabase/schema.sql\` is the Postgres draft; this page is the human view._

## Principles
- **Multi-tenant from day one.** Every table has \`tenant_id\`; RLS scopes every query to the JWT's tenant. No hardcoded studio outside \`src/tenant/tenant.ts\`.
- **Same interface, two providers.** Pages call \`useData()\` / \`useTable()\` (the \`DataProvider\` contract: list, get, insert, update, remove, subscribe). \`MockProvider\` (localStorage + change events) today; \`SupabaseProvider\` (PostgREST + realtime channels) later. Swapping is one line in \`src/data/DataContext.tsx\`.
- **Realtime by subscription.** \`subscribe(table, cb)\` is the seam for Supabase \`postgres_changes\`; the mock emits the same events on every write so UI already updates live.
- **Money is integer COP.** Columns named price/amount/total/etc. are integers.
- **Bilingual content is JSON.** \`{ "es": …, "en": … }\` in \`jsonb\` (descriptions, bios, subjects).

## Mapping Mock → Supabase
| Mock (today) | Supabase (later) |
| --- | --- |
| \`localStorage['hoyos.db.v1']\` | Postgres tables in \`public\` |
| \`MockProvider.emit()\` | \`supabase.channel().on('postgres_changes')\` |
| \`demoUsers\` + \`SessionProvider\` | \`supabase.auth\` + \`user_roles\` + JWT claim \`tenant_id\` |
| \`tenant.id = 'ten_hoy'\` | row in \`tenants\`, claim set at sign-in |
| \`newId()\` | \`gen_random_uuid()\` |

## Tables
`;
for (const g of TABLE_GROUPS) {
  md += `\n### ${g.label.en} · ${g.label.es}\n`;
  for (const t of tables.filter((x) => x.group === g.id)) {
    md += `\n#### \`${t.name}\`\n${t.description.en}  \n_${t.description.es}_\n\n| column | type | notes |\n| --- | --- | --- |\n`;
    for (const c of [...BASE_COLUMNS, ...t.columns]) md += `| \`${c.name}\` | ${c.type}${c.enum ? ` (${c.enum.join(' \\| ')})` : ''}${c.nullable ? ', null' : ''} | ${c.references ? `→ \`${c.references}\` ` : ''}${c.description ?? ''} |\n`;
    if (t.rls?.length) md += `\n**Who may read / write**\n${t.rls.map((n) => `- ${n}`).join('\n')}\n`;
  }
}
md += `\n## Seed data (\`src/data/seed/\`)
6 modalities, 2 rooms (the main room at ${'15'} mats and a small meditation room), 8 teachers, 24 weekly templates (4/day Mon–Sat), sessions for −7…+7 days, 9 demo staff/users + 30 customers, memberships/credits/payments/invoices, bookings filling sessions, waitlists on full classes, feature flags from every spec toggle, legal docs + consents, 2 gift cards, 3 email templates, 3 WhatsApp templates, 3 automations, the unified message record (\`seed/messages.ts\`: 69 \`message_log\` rows — WhatsApp both ways, automated reminders and receipts, newsletters, one email exchange, internal notes — in 17 conversations, six inbound left unread), audit logs, three months of payroll runs, four space bookings with two Especiales (one with a manual teacher payout), and the practice record (0040): seven active \`practice_goals\` (the demo member's 2 / week over an ended 1 / week, so her first week is graded at 1 — rule 8), seven weeks of completed morning classes for the demo member so her weekly streak is real (6 met weeks, one saved by the rest-week rule), and her \`activity_events\` (goals set, milestones 1 · 5 · 10 at the visit that reached them, the saved week). Deterministic PRNG; reseeds daily so "today" always has classes.

## Adding a table
1. Add a \`TableDef\` to \`src/data/schema.ts\` (and a typed row interface if pages use it).
2. Seed it in \`src/data/seed/index.ts\`.
3. \`npm run sql\` → regenerates \`supabase/schema.sql\` and this file.
4. Reference it in the page's \`PageSpec.data\` so the inspector links to it.
`;
writeFileSync(new URL('../docs/data-model.md', import.meta.url), md);
console.log(`wrote supabase/schema.sql (${tables.length} tables) and docs/data-model.md`);
