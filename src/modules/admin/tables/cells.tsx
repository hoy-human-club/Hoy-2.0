import type { ReactNode } from 'react';
import type { Lang } from '../../../i18n/types';
import type { BaseRow, ColumnDef } from '../../../data/schema';
import { tableRegistry } from '../../../data/schema';
import type { Tone } from '../../../design/tokens';
import { biText, enumLabel, rowTitle, tableLabel } from '../../../data/labels';
import { formatCOP, formatDate, formatDateTime } from '../../../i18n/format';
import { Badge, toneForStatus } from '../../../components/atom/Badge/Badge';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Icon } from '../../../components/atom/Icon/Icon';
import { cellText, isMoney, type Resolve } from './model';

const TONES = new Set(['moss', 'river', 'clay', 'sun', 'sage', 'slate', 'plum']);

export interface CellCtx {
  lang: Lang;
  resolve: Resolve;
  /** Opens the referenced row (FK chip). */
  openRef: (table: string, id: string) => void;
  yes: string;
  no: string;
  openLabel: (title: string, table: string) => string;
}

/** A date / timestamp in the current language; bad input falls back to the raw text. */
export function formatWhen(c: ColumnDef, v: string, lang: Lang): string {
  try {
    if (c.type === 'date') return formatDate(v.slice(0, 10), lang, { day: 'numeric', month: 'short', year: 'numeric' });
    return formatDateTime(v, lang);
  } catch { return v; }
}

/** One value as a short line of text for list rows and cards: money and dates formatted, yes / no in words. */
export function displayText(c: ColumnDef, row: BaseRow, ctx: CellCtx): string {
  const v = row[c.name];
  if (v == null || v === '') return '';
  if (typeof v === 'boolean') return v ? ctx.yes : ctx.no;
  if ((c.type === 'timestamptz' || c.type === 'date') && typeof v === 'string') return formatWhen(c, v, ctx.lang);
  if (isMoney(c) && typeof v === 'number') return formatCOP(v, ctx.lang);
  if ((c.type === 'int' || c.type === 'numeric') && typeof v === 'number') return v.toLocaleString(ctx.lang === 'es' ? 'es-CO' : 'en-US');
  return cellText(c, row, ctx.lang, ctx.resolve);
}

/** The design-system rendering of one value: FK chip with the referenced row's title, enum badge, dates, money, Bi text. */
export function CellValue({ c, row, ctx, chip = true }: { c: ColumnDef; row: BaseRow; ctx: CellCtx; chip?: boolean }): ReactNode {
  const v = row[c.name];
  const { lang } = ctx;
  if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return <span className="tbl-none" aria-label="—">—</span>;
  if (c.references && typeof v === 'string') {
    const ref = ctx.resolve(c.references, v);
    const title = ref ? rowTitle(c.references, ref, lang, ctx.resolve) : v;
    if (!chip) return title;
    const icon = tableRegistry[c.references]?.icon ?? 'link';
    return (
      <button type="button" className="tbl-ref" title={ctx.openLabel(title, tableLabel(c.references, lang))} aria-label={ctx.openLabel(title, tableLabel(c.references, lang))}
        onClick={(e) => { e.stopPropagation(); ctx.openRef(c.references!, v); }} onKeyDown={(e) => e.stopPropagation()}>
        <Icon name={icon} size="xs" /><span className="tbl-ref-text">{title}</span>
      </button>
    );
  }
  if (c.enum && typeof v === 'string') {
    if (c.name === 'tone' && TONES.has(v)) return <Chip tone={v as Tone} dot>{enumLabel(v, lang)}</Chip>;
    return <Badge tone={toneForStatus(v)}>{enumLabel(v, lang)}</Badge>;
  }
  if (typeof v === 'boolean') return v ? <span className="tbl-bool is-on"><Icon name="check" size="sm" /><span className="sr-only">{ctx.yes}</span></span> : <span className="tbl-bool"><span aria-hidden>·</span><span className="sr-only">{ctx.no}</span></span>;
  if ((c.type === 'timestamptz' || c.type === 'date') && typeof v === 'string') return <time dateTime={v} className="tbl-when">{formatWhen(c, v, lang)}</time>;
  if (isMoney(c) && typeof v === 'number') return <span className="tbl-num">{formatCOP(v, lang)}</span>;
  if ((c.type === 'int' || c.type === 'numeric') && typeof v === 'number') return <span className="tbl-num">{v.toLocaleString(lang === 'es' ? 'es-CO' : 'en-US')}</span>;
  if (c.type === 'json') {
    const bi = biText(v, lang);
    if (bi != null) return bi;
    if (Array.isArray(v) && v.every((x) => typeof x === 'string' || typeof x === 'number')) return v.join(', ');
    return <code className="tbl-json-inline">{JSON.stringify(v)}</code>;
  }
  if (c.type === 'uuid') return <span className="mono small">{String(v)}</span>;
  return String(v);
}
