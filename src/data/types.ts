import type { AppendClassPayRuleCommand, ClassPayRuleRow } from './classPayRules';
import type { GenerateRecurrence } from './classRecurrence';
import type { SessionEdit } from './sessionEditorial';
import type { ClassSessionRow } from './schema';
import type { ContentBatch, ContentBatchResult } from './contentBatch';
import type { PromotionCommand, PromotionResult } from './promotions';
import type { VoucherCommand, VoucherResult } from './vouchers';
import type { BaseRow } from './schema';

export interface Query {
  where?: Record<string, unknown>;
  orderBy?: { column: string; dir?: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
}

export interface ChangeEvent<T extends BaseRow = BaseRow> {
  table: string;
  type: 'insert' | 'update' | 'remove' | 'reset';
  row?: T;
  id?: string;
}

/**
 * The data contract every page talks to. MockProvider today, SupabaseProvider tomorrow —
 * same interface, so pages never know which one is behind useData().
 */
export interface DataProvider {
  /** Optional local-demo fixture refresh; production providers never synthesize bookings. */
  prepareDemoSamples?: () => void;
  readonly name: string;
  appendClassPayRule?(command: AppendClassPayRuleCommand): Promise<ClassPayRuleRow>;
  generateRecurrence?(command: GenerateRecurrence): Promise<{ created: number; skipped: number }>;
  editSession?(command: SessionEdit): Promise<ClassSessionRow>;
  contentBatch?(command: ContentBatch): Promise<ContentBatchResult>;
  /** Atomic demo transaction; absent until real backend RPCs are implemented. */
  voucher?(command: VoucherCommand): Promise<VoucherResult>;
  /** Approved campaign share and explicit claim, mock-only until authenticated RPCs exist. */
  promotion?(command: PromotionCommand): Promise<PromotionResult>;
  list<T extends BaseRow = BaseRow>(table: string, query?: Query): Promise<T[]>;
  get<T extends BaseRow = BaseRow>(table: string, id: string): Promise<T | null>;
  insert<T extends BaseRow = BaseRow>(table: string, row: Partial<T>): Promise<T>;
  update<T extends BaseRow = BaseRow>(table: string, id: string, patch: Partial<T>): Promise<T>;
  remove(table: string, id: string): Promise<void>;
  /** Realtime-style change feed. Pass '*' for every table. */
  subscribe(table: string | '*', cb: (e: ChangeEvent) => void): () => void;
  /** Synchronous snapshot when the provider has one (mock). Used for first render without flicker. */
  peek?<T extends BaseRow = BaseRow>(table: string, query?: Query): T[] | undefined;
  /** Wipes and reseeds (mock only). */
  reset?(): Promise<void>;
}

export function applyQuery<T extends BaseRow>(rows: T[], q?: Query): T[] {
  if (!q) return rows;
  let out = rows;
  if (q.where) {
    const entries = Object.entries(q.where);
    out = out.filter((r) => entries.every(([k, v]) => (Array.isArray(v) ? v.includes(r[k]) : r[k] === v)));
  }
  if (q.orderBy) {
    const { column, dir = 'asc' } = q.orderBy;
    out = [...out].sort((a, b) => {
      const av = a[column] as string | number | null, bv = b[column] as string | number | null;
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av < bv ? -1 : 1) * (dir === 'asc' ? 1 : -1);
    });
  }
  if (q.offset) out = out.slice(q.offset);
  if (q.limit != null) out = out.slice(0, q.limit);
  return out;
}
