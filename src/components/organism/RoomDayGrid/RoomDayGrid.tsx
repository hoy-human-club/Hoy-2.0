import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatTime, studioParts } from '../../../i18n/format';
import type { Tone } from '../../../design/tokens';
import './RoomDayGrid.css';

/** A class block takes its modality tone; space bookings take a material. */
export type RoomBlockTone = Tone | 'event' | 'rental' | 'private' | 'maintenance' | 'blocked';

export interface RoomBlock {
  id: string;
  roomId: string;
  startsAt: string;
  endsAt: string;
  title: string;
  /** Second line: teacher, contact, capacity… */
  sub?: string;
  tone: RoomBlockTone;
  /** A held booking is drawn dashed; a cancelled one faded; done is stamped. */
  status?: 'held' | 'confirmed' | 'cancelled' | 'done' | 'class';
  /** Small trailing chip, e.g. the status word. */
  chip?: ReactNode;
}

export interface RoomDayGridProps {
  rooms: { id: string; name: string; capacity?: number }[];
  blocks: RoomBlock[];
  /** First and last hour drawn (24h). Defaults widen to fit the blocks. */
  fromHour?: number;
  toHour?: number;
  /** Pixels per hour. */
  hourHeight?: number;
  selectedId?: string | null;
  onSelect?: (block: RoomBlock) => void;
  /** Clicking an empty cell proposes a start time in that room. */
  onSlot?: (roomId: string, hour: number) => void;
  /** Draws the "now" line when the day shown is today. */
  now?: Date | null;
}

const minutes = (iso: string) => { const d = new Date(iso); return studioParts(d).hour * 60 + studioParts(d).minute; };

/**
 * One day of every room, rooms as columns and hours as rows; classes and space bookings are blocks
 * positioned by the minute. Pure presentation: the page decides what a block is and what selecting
 * it does. Used by S-05.
 */
export function RoomDayGrid({ rooms, blocks, fromHour, toHour, hourHeight = 56, selectedId, onSelect, onSlot, now }: RoomDayGridProps) {
  const { t, lang } = useI18n();
  const earliest = Math.min(6, ...blocks.map((b) => Math.floor(minutes(b.startsAt) / 60)));
  const latest = Math.max(21, ...blocks.map((b) => Math.ceil(minutes(b.endsAt) / 60)));
  const from = fromHour ?? earliest;
  const to = toHour ?? latest;
  const hours = Array.from({ length: Math.max(1, to - from) }, (_, i) => from + i);
  const top = (iso: string) => ((minutes(iso) - from * 60) / 60) * hourHeight;
  const nowTop = now ? ((studioParts(now).hour * 60 + studioParts(now).minute - from * 60) / 60) * hourHeight : null;

  return (
    <div className="roomgrid" style={{ ['--rg-hour' as string]: `${hourHeight}px`, ['--rg-cols' as string]: rooms.length }}>
      <div className="roomgrid-head">
        <div className="roomgrid-corner" aria-hidden />
        {rooms.map((r) => (
          <div key={r.id} className="roomgrid-room">
            <strong className="small">{r.name}</strong>
            {r.capacity != null && <span className="xs muted">{t('core.common.capacity', { n: r.capacity })}</span>}
          </div>
        ))}
      </div>
      <div className="roomgrid-body" style={{ height: hours.length * hourHeight }}>
        <div className="roomgrid-hours" aria-hidden>
          {hours.map((h) => <div key={h} className="roomgrid-hour"><span className="xs mono muted">{String(h).padStart(2, '0')}:00</span></div>)}
        </div>
        {rooms.map((r) => (
          <div key={r.id} className="roomgrid-col" role="list" aria-label={r.name}>
            {hours.map((h) => (
              <button key={h} type="button" className="roomgrid-cell" aria-label={`${r.name} ${String(h).padStart(2, '0')}:00`} onClick={() => onSlot?.(r.id, h)} tabIndex={onSlot ? 0 : -1} />
            ))}
            {blocks.filter((b) => b.roomId === r.id).map((b) => {
              const h = Math.max(hourHeight / 3, top(b.endsAt) - top(b.startsAt));
              const short = h < hourHeight; // under an hour: no sub-line
              const tiny = h < hourHeight * 0.6; // under ~35 min: title only
              return (
                <button
                  key={b.id}
                  type="button"
                  role="listitem"
                  className={`roomgrid-block tone-${b.tone} status-${b.status ?? 'class'} ${short ? 'is-short' : ''} ${tiny ? 'is-tiny' : ''} ${selectedId === b.id ? 'is-selected' : ''}`}
                  style={{ top: top(b.startsAt), height: h }}
                  onClick={() => onSelect?.(b)}
                  aria-pressed={selectedId === b.id}
                  title={`${formatTime(b.startsAt, lang)}–${formatTime(b.endsAt, lang)} · ${b.title}`}
                >
                  <span className="roomgrid-block-time xs mono">{formatTime(b.startsAt, lang)}–{formatTime(b.endsAt, lang)}</span>
                  <strong className="roomgrid-block-title small">{b.title}</strong>
                  {b.sub && <span className="roomgrid-block-sub xs">{b.sub}</span>}
                  {b.chip && <span className="roomgrid-block-chip">{b.chip}</span>}
                </button>
              );
            })}
          </div>
        ))}
        {nowTop != null && nowTop >= 0 && nowTop <= hours.length * hourHeight && <div className="roomgrid-now" style={{ top: nowTop }} aria-hidden><span className="xs">{t('core.common.now')}</span></div>}
      </div>
    </div>
  );
}
