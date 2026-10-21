import { ensureFullDemoSession } from './seed/ensureFullDemoSession';
import { appendClassPayRule, defaultClassPayRule, type AppendClassPayRuleCommand, type ClassPayRuleRow } from './classPayRules';
import { dateKey } from '../i18n/format';
import { generateRecurrence, type GenerateRecurrence } from './classRecurrence';
import { applySessionEdit, type SessionEdit } from './sessionEditorial';
import { applyContentBatch, type ContentBatch, type ContentBatchResult } from './contentBatch';
import { upgradeTimetable } from './seed/upgradeTimetable';
import { executeVoucherCommand, voucherSeats, type VoucherCommand, type VoucherResult, type VoucherBookingRow } from './vouchers';
import { chooseMat, occupiesMat, usesMats } from './mats';
import type { BookingRow, ClassSessionRow, ModalityRow, RoomRow } from './schema';
import type { BaseRow } from './schema';
import { tableNames } from './schema';
import { applyQuery, type ChangeEvent, type DataProvider, type Query } from './types';
import { buildSeed } from './seed';
import { modalities as seedModalities } from './seed/catalog';
import { mediaAssets as seedMedia } from './seed/media';
import { tenant } from '../tenant/tenant';

const KEY = 'hoyos.db.v1';
/**
 * Bump when the seed or the schema changes shape (new columns an old localStorage copy would lack):
 * a stored db with another version is thrown away and reseeded, whatever day it was seeded on.
 *   1 · up to 0.7.1 · 2 · 0.8.0 message_log becomes the unified conversation record (direction, source, body, read_at…)
 *   3 · 0.13 main room at 16 mats · 4 · 0.15.0 modalities.movement / media_assets.movement become `tone`, the intentions table is gone (upgraded in place)
 *   5 · 0040 practice_goals + activity_events and the demo member's goal history (an ended 1 / week under the active 2 / week); a copy without the tables fails the table check and reseeds
 *   6 · 0.17.0 hours_overrides and api_keys tables, the google_business integration row, settings.openingHours seeded (0041);
 *       a v5 copy lacks the two tables, so it fails the table check and reseeds
 *   7 · 0044 table_views (M-03 saved views) with six default views; a v6 copy lacks the table, so it reseeds
 *   8 · 0046 table_views gains calendar / timeline views (config.dateColumn, endColumn, calendarMode, timelineZoom) and
 *       class_sessions opens on the week calendar; a v7 copy reseeds so the new default views appear
 *   9 · 0051 the studio's verified launch content: seven classes and their teachers, the launch price list, `credits`
 *       renamed `class_ledger` (with frozen_from / frozen_until), the new FAQ and terms v2.0; a v8 copy reseeds
 *  10 · 0055 email_templates gains audience + priority and the seed carries the whole email catalog (95 templates); a v9 copy reseeds
 */
export const SEED_VERSION = 10;

/** 0039: a v3 copy still carries `movement`; give each row its seed tone (or the old colour's tone) and drop intentions. */
const LEGACY_TONE: Record<string, string> = { enraiza: 'moss', fluye: 'river', arde: 'clay', libera: 'sun' };
function upgradeTones(db: Db) {
  const bySeed = (seed: { id: string; tone: string | null }[], row: BaseRow) => seed.find((s) => s.id === row.id)?.tone;
  for (const [table, seed, fallback] of [['modalities', seedModalities, 'river'], ['media_assets', seedMedia, null]] as const) {
    for (const row of (db[table] ?? []) as (BaseRow & { tone?: string | null; movement?: string | null })[]) {
      if (row.tone === undefined) row.tone = bySeed(seed, row) ?? (row.movement ? LEGACY_TONE[row.movement] : undefined) ?? fallback;
      delete row.movement;
    }
  }
  delete db.intentions;
}
type Db = Record<string, BaseRow[]>;
interface Stored { seededOn: string; version?: number; db: Db }

const newId = (prefix = 'row'): string => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

/**
 * In-browser database: seeded from src/data/seed, persisted to localStorage, emits change events
 * to simulate Supabase realtime. Reseeds when the seed day changes so "today" always has classes, and when
 * SEED_VERSION moves so a stored copy never lacks a column the code now reads.
 */
export class MockProvider implements DataProvider {
  readonly name = 'mock';
  private db: Db;
  private listeners = new Map<string, Set<(e: ChangeEvent) => void>>();

  constructor() {
    this.db = this.load();
    if (!(this.db.class_templates ?? []).some(row => row.id.startsWith('tpl_fixed_'))) upgradeTimetable(this.db, buildSeed());
    this.expandDemoCalendar();
    ensureFullDemoSession(this.db, Date.now());
    this.assignLegacyMats();
    // Cross-tab realtime: another tab's persist() fires `storage` here; reload and tell every subscriber.
    if (typeof window !== 'undefined') window.addEventListener('storage', (e) => this.onStorage(e));
  }

  private expandDemoCalendar() {
    // Demo-only publishing horizon from existing studio templates; no invented attendees.
    type Template = BaseRow & { active: boolean; weekday: number; start_time: string; duration_min: number; capacity: number; title: string; modality_id: string; teacher_id: string; room_id: string; level: string };
    const sessions = this.db.class_sessions as ClassSessionRow[];
    const now = new Date().toISOString();
    for (let day = 0; day <= 42; day++) {
      const date = new Date(); date.setDate(date.getDate() + day);
      for (const template of this.db.class_templates as Template[]) {
        if (!template.active || template.weekday !== date.getDay() || template.generation_mode === 'manual') continue;
        const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
        if (template.start_date && key < String(template.start_date) || template.end_date && key > String(template.end_date)) continue;
        const [h, m] = template.start_time.split(':').map(Number);
        const start = new Date(date); start.setHours(h, m, 0, 0);
        if (start <= new Date()) continue;
        if (sessions.some(s => s.template_id === template.id && s.starts_at === start.toISOString())) continue;
        const id = `demo_${template.id}_${start.getFullYear()}_${start.getMonth()}_${start.getDate()}`;
        if (sessions.some(s => s.id === id)) continue;
        // Snapshot the class limit only for new occurrences; existing bookings keep their session capacity.
        const room = (this.db.rooms as RoomRow[]).find(row => row.id === template.room_id);
        const capacity = Math.min(template.capacity, room?.capacity ?? template.capacity, template.room_id === 'room_main' ? tenant.studio.mats : Infinity);
        sessions.push({ id, tenant_id: tenant.id, created_at: now, updated_at: now, template_id: template.id, title: template.title, modality_id: template.modality_id, teacher_id: template.teacher_id, room_id: template.room_id, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + template.duration_min * 60000).toISOString(), capacity, booked_count: 0, level: template.level, status: 'scheduled', cancel_reason: null });
      }
    }
  }
  private assignLegacyMats() {
    const bookings = this.db.bookings as BookingRow[];
    for (const session of this.db.class_sessions as ClassSessionRow[]) {
      const modality = (this.db.modalities as ModalityRow[]).find(m => m.id === session.modality_id);
      if (!usesMats(modality)) continue;
      const active = bookings.filter(b => b.session_id === session.id && occupiesMat(b));
      for (const booking of active) if (booking.mat_number == null) booking.mat_number = chooseMat(active, Math.min(session.capacity, tenant.studio.mats));
    }
    this.persist();
  }
  private syncCapacity(sessionId: string) {
    const session = (this.db.class_sessions as ClassSessionRow[]).find(s => s.id === sessionId);
    if (!session) return;
    session.booked_count = (this.db.bookings as BookingRow[]).filter(b => b.session_id === sessionId && b.status !== 'cancelled' && b.status !== 'late_cancel').length + voucherSeats(this.db, sessionId);
    this.emit({ table: 'class_sessions', type: 'update', row: session, id: session.id });
  }
  private prepareBooking(row: BookingRow) {
    if (!occupiesMat(row)) return row;
    const session = (this.db.class_sessions as ClassSessionRow[]).find(s => s.id === row.session_id);
    if (!session || session.status !== 'scheduled' || new Date(session.starts_at).getTime() <= Date.now()) throw new Error('session_unavailable');
    const others = (this.db.bookings as BookingRow[]).filter(b => b.session_id === row.session_id && b.id !== row.id && occupiesMat(b));
    if (others.some(b => b.user_id === row.user_id) || (this.db.voucher_bookings as VoucherBookingRow[]).some(b => b.sessionId === session.id && b.status !== 'cancelled' && b.participants.some(p => p.userId === row.user_id))) throw new Error('booking_exists');
    if (others.length + voucherSeats(this.db, session.id) >= session.capacity) throw new Error('session_full');
    const modality = (this.db.modalities as ModalityRow[]).find(m => m.id === session.modality_id);
    return usesMats(modality) ? { ...row, mat_number: chooseMat([...others, ...(this.db.voucher_bookings as VoucherBookingRow[]).filter(b => b.sessionId === session.id && b.status !== 'cancelled').flatMap(b => b.mats.map(mat_number => ({ status: 'booked', mat_number } as BookingRow)))], Math.min(session.capacity, tenant.studio.mats), row.mat_number) } : { ...row, mat_number: null };
  }

  private onStorage(e: StorageEvent) {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue) as Stored;
      if (parsed.version !== SEED_VERSION || !tableNames.every((t) => Array.isArray(parsed.db[t]))) return;
      this.db = parsed.db;
      for (const t of Object.keys(this.db)) this.emit({ table: t, type: 'reset' });
    } catch { /* ignore a half-written value */ }
  }

  private load(): Db {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Stored;
        if (parsed.db && !parsed.db.class_pay_rules) parsed.db.class_pay_rules = [];
        if ((parsed.version === SEED_VERSION || parsed.version === 2 || parsed.version === 3) && parsed.seededOn === new Date().toDateString() && tableNames.every((t) => Array.isArray(parsed.db[t]))) {
          if (parsed.version === 2) {
            // Preserve same-day CMS edits, members and bookings when upgrading this demo.
            const sessions = parsed.db.class_sessions as ClassSessionRow[];
            for (const session of sessions) if (session.room_id === 'room_main' && session.capacity === 15) session.capacity = tenant.studio.mats;
          }
          if (parsed.version !== SEED_VERSION) { upgradeTones(parsed.db); this.persist(parsed.db); }
          return parsed.db;
        }
      }
    } catch { /* fall through to reseed */ }
    const db = buildSeed();
    this.persist(db);
    return db;
  }
  private persist(db = this.db, strict = false) {
    const stored: Stored = { seededOn: new Date().toDateString(), version: SEED_VERSION, db };
    try { localStorage.setItem(KEY, JSON.stringify(stored)); } catch (error) { if (strict) throw error; /* initial demo can still render in private mode */ }
  }
  private emit(e: ChangeEvent) {
    this.listeners.get(e.table)?.forEach((cb) => cb(e));
    this.listeners.get('*')?.forEach((cb) => cb(e));
  }
  private rows(table: string): BaseRow[] {
    if (!this.db[table]) this.db[table] = [];
    return this.db[table];
  }

  peek<T extends BaseRow>(table: string, query?: Query): T[] { return structuredClone(applyQuery(this.rows(table) as T[], query)); }
  /** Detached snapshots preserve immutable voucher history and keep subscriber memos fresh. */
  async list<T extends BaseRow>(table: string, query?: Query): Promise<T[]> { return [...this.peek<T>(table, query)]; }
  async get<T extends BaseRow>(table: string, id: string): Promise<T | null> { return structuredClone((this.rows(table).find((r) => r.id === id) as T) ?? null); }

  async insert<T extends BaseRow>(table: string, row: Partial<T>): Promise<T> {
    if (table === 'class_pay_rules') throw new Error('class_pay_atomic_command_required');
    if (['vouchers', 'voucher_bookings', 'voucher_events'].includes(table)) throw new Error('voucher_atomic_command_required');
    const now = new Date().toISOString();
    let full = { id: newId(table.slice(0, 3)), tenant_id: tenant.id, created_at: now, updated_at: now, ...row } as T;
    if (table === 'bookings') full = this.prepareBooking(full as unknown as BookingRow) as unknown as T;
    const previousDb = structuredClone(this.db);
    this.rows(table).push(full);
    if (table === 'class_templates' || table === 'class_sessions' && !full.template_id && Date.parse(String(full.starts_at)) > Date.now()) {
      const scope = table === 'class_templates' ? { templateId: full.id } : { sessionId: full.id };
      this.rows('class_pay_rules').push({ ...defaultClassPayRule(scope, dateKey()), id: `cpr_default_${full.id}`, tenant_id: full.tenant_id, created_at: now, updated_at: now });
    }
    if (table === 'bookings') this.syncCapacity((full as unknown as BookingRow).session_id);
    try { this.persist(this.db, true); } catch (error) { this.db = previousDb; throw error; }
    this.emit({ table, type: 'insert', row: full });
    return full;
  }
  async update<T extends BaseRow>(table: string, id: string, patch: Partial<T>): Promise<T> {
    if (table === 'class_pay_rules') throw new Error('class_pay_atomic_command_required');
    if (['vouchers', 'voucher_bookings', 'voucher_events'].includes(table)) throw new Error('voucher_atomic_command_required');
    const rows = this.rows(table);
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) throw new Error(`${table}/${id} not found`);
    if (table === 'class_templates' || table === 'rooms') {
      const checkedFields = ['capacity','room_id','teacher_id','modality_id','duration_min','weekday','start_time','level'];
      const checked = Object.fromEntries(Object.entries(patch).filter(([key]) => checkedFields.includes(key)));
      if (Object.keys(checked).length) applyContentBatch(this.db, { table, role: 'admin', actorId: 'validation', changes: [{ id, before: structuredClone(rows[i]), patch: checked }] }, tenant.id);
    }
    let next = { ...rows[i], ...patch, updated_at: new Date().toISOString() } as T;
    if (table === 'bookings' && ('mat_number' in patch || 'session_id' in patch || ((patch as Partial<BookingRow>).status === 'booked' && (rows[i] as BookingRow).status !== 'booked'))) next = this.prepareBooking(next as unknown as BookingRow) as unknown as T;
    const previousSession = table === 'bookings' ? (rows[i] as BookingRow).session_id : null;
    const previousDb = structuredClone(this.db);
    rows[i] = next;
    if (table === 'bookings') {
      if (previousSession) this.syncCapacity(previousSession);
      this.syncCapacity((next as unknown as BookingRow).session_id);
    }
    if (table === 'class_sessions' && 'booked_count' in patch) this.syncCapacity(id);
    try { this.persist(this.db, true); } catch (error) { this.db = previousDb; throw error; }
    this.emit({ table, type: 'update', row: next, id });
    return next;
  }
  async remove(table: string, id: string): Promise<void> {
    if (table === 'class_pay_rules') throw new Error('class_pay_atomic_command_required');
    if (['vouchers', 'voucher_bookings', 'voucher_events'].includes(table)) throw new Error('voucher_atomic_command_required');
    this.db[table] = this.rows(table).filter((r) => r.id !== id);
    this.persist();
    this.emit({ table, type: 'remove', id });
  }
  subscribe(table: string, cb: (e: ChangeEvent) => void): () => void {
    if (!this.listeners.has(table)) this.listeners.set(table, new Set());
    this.listeners.get(table)!.add(cb);
    return () => { this.listeners.get(table)?.delete(cb); };
  }
  async voucher(command: VoucherCommand): Promise<VoucherResult> {
    const transaction = executeVoucherCommand(this.db, command, { tenantId: tenant.id,
      usesMats: session => usesMats((this.db.modalities as ModalityRow[]).find(m => m.id === session.modality_id)), matCapacity: tenant.studio.mats });
    this.db = transaction.db;
    this.persist();
    for (const table of ['vouchers', 'voucher_bookings', 'voucher_events', 'class_sessions']) this.emit({ table, type: 'reset' });
    return transaction.result;
  }
  /** Refresh only synthetic sample fixtures when an already-open demo crosses a class start. */
  prepareDemoSamples(): void {
    if (!ensureFullDemoSession(this.db, Date.now())) return;
    this.assignLegacyMats();
    for (const table of ['class_sessions', 'bookings', 'waitlist']) this.emit({ table, type: 'reset' });
  }

  async appendClassPayRule(command: AppendClassPayRuleCommand): Promise<ClassPayRuleRow> {
    const next = structuredClone(this.db);
    const row = appendClassPayRule(next, command);
    if (row.tenant_id !== tenant.id) throw new Error('class_pay_scope_invalid');
    if (!(this.db.class_pay_rules ?? []).some(r => r.id === row.id)) {
      const now = new Date().toISOString();
      next.audit_log.push({ id: `audit_${row.id}`, tenant_id: tenant.id, created_at: now, updated_at: now, actor_id: command.actorId, action: 'class_pay.configure', entity: 'class_pay_rules', entity_id: row.id, ip: null, diff: { role: command.role, source: 'admin', scope: row.session_id ?? row.template_id } });
    }
    const previous = this.db; this.db = next;
    try { this.persist(this.db, true); } catch (error) { this.db = previous; throw error; }
    this.emit({ table: 'class_pay_rules', type: 'reset' }); this.emit({ table: 'audit_log', type: 'reset' });
    return row;
  }
  async generateRecurrence(command: GenerateRecurrence): Promise<{ created: number; skipped: number }> {
    const result = generateRecurrence(this.db, command, tenant.id);
    const previous = this.db; this.db = result.db;
    try { this.persist(this.db, true); } catch (error) { this.db = previous; throw error; }
    this.emit({ table: 'class_sessions', type: 'reset' }); this.emit({ table: 'audit_log', type: 'reset' });
    return { created: result.created, skipped: result.skipped };
  }
  async editSession(command: SessionEdit): Promise<ClassSessionRow> {
    const transaction = applySessionEdit(this.db, command, tenant.id);
    const previous = this.db;
    this.db = transaction.db;
    try { this.persist(this.db, true); } catch (error) { this.db = previous; throw error; }
    this.emit({ table: 'class_sessions', type: 'reset' });
    this.emit({ table: 'audit_log', type: 'reset' });
    return structuredClone(transaction.row);
  }
  async contentBatch(command: ContentBatch): Promise<ContentBatchResult> {
    const transaction = applyContentBatch(this.db, command, tenant.id);
    const previous = this.db;
    this.db = transaction.db;
    try { this.persist(this.db, true); } catch (error) { this.db = previous; throw error; }
    this.emit({ table: command.table, type: 'reset' });
    this.emit({ table: 'audit_log', type: 'reset' });
    return transaction.result;
  }
  async reset(): Promise<void> {
    this.db = buildSeed();
    this.expandDemoCalendar();
    ensureFullDemoSession(this.db, Date.now());
    this.assignLegacyMats();
    this.persist();
    for (const t of Object.keys(this.db)) this.emit({ table: t, type: 'reset' });
  }
}
