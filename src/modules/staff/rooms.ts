import { studioDate, studioParts } from '../../i18n/format';
/**
 * Especiales (0017) — the room calendar rules shared by S-05 (book a room) and S-04 (sell an
 * Especial with a room window). One place decides what "the room is taken" means.
 *
 * A room is taken by a scheduled class (`class_sessions`, status scheduled) or by a space booking
 * that is not cancelled. Two windows conflict when they overlap for more than zero minutes:
 * [a.start, a.end) ∩ [b.start, b.end) ≠ ∅. Back-to-back is fine.
 */
import type { ClassSessionRow, SpaceBookingKind, SpaceBookingRow, SpaceBookingStatus } from '../../data/schema';
import type { Bi } from '../../specs/types';

export const BOOKING_KINDS: SpaceBookingKind[] = ['private_event', 'rental', 'private_class', 'maintenance', 'blocked'];

export const KIND_LABEL: Record<SpaceBookingKind, Bi> = {
  private_event: { es: 'Evento privado', en: 'Private event' },
  rental: { es: 'Alquiler', en: 'Rental' },
  private_class: { es: 'Clase privada', en: 'Private class' },
  maintenance: { es: 'Mantenimiento', en: 'Maintenance' },
  blocked: { es: 'Bloqueo', en: 'Blocked' },
};

export const STATUS_LABEL: Record<SpaceBookingStatus, Bi> = {
  held: { es: 'En espera', en: 'Held' },
  confirmed: { es: 'Confirmada', en: 'Confirmed' },
  cancelled: { es: 'Cancelada', en: 'Cancelled' },
  done: { es: 'Realizada', en: 'Done' },
};

/** Which pricing.ts espacio item maps to which booking kind when the desk starts an Especial from it. */
/** The booking kind an Especial started from a price item opens (0051: only the private class is priced). */
export const KIND_FOR_ITEM: Record<string, SpaceBookingKind> = { private: 'private_class' };

export interface Conflict { kind: 'class' | 'booking'; id: string; title: string; starts_at: string; ends_at: string }

export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => aStart < bEnd && bStart < aEnd;

/** Everything already occupying `roomId` inside the window, so a form can refuse the booking with a reason. */
export function findConflicts(
  window: { roomId: string; startsAt: string; endsAt: string; excludeBookingId?: string | null },
  sessions: ClassSessionRow[],
  bookings: SpaceBookingRow[],
): Conflict[] {
  if (!window.roomId || !window.startsAt || !window.endsAt || window.startsAt >= window.endsAt) return [];
  const out: Conflict[] = [];
  for (const s of sessions) {
    if (s.room_id === window.roomId && s.status === 'scheduled' && overlaps(window.startsAt, window.endsAt, s.starts_at, s.ends_at)) out.push({ kind: 'class', id: s.id, title: s.title, starts_at: s.starts_at, ends_at: s.ends_at });
  }
  for (const b of bookings) {
    if (b.id === window.excludeBookingId || b.status === 'cancelled' || b.room_id !== window.roomId) continue;
    if (overlaps(window.startsAt, window.endsAt, b.starts_at, b.ends_at)) out.push({ kind: 'booking', id: b.id, title: b.title, starts_at: b.starts_at, ends_at: b.ends_at });
  }
  return out.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

/** Local ISO from a date (YYYY-MM-DD) and a time (HH:MM) — studio-local, like everything on the calendar. */
export const localIso = (date: string, time: string): string => {
  if (!date || !time) return '';
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return studioDate(y, m - 1, d, h, mi, 0, 0).toISOString();
};

export const dateInputValue = (d: Date) => `${studioParts(d).year}-${String(studioParts(d).month + 1).padStart(2, '0')}-${String(studioParts(d).day).padStart(2, '0')}`;
export const timeInputValue = (iso: string) => { const d = new Date(iso); return `${String(studioParts(d).hour).padStart(2, '0')}:${String(studioParts(d).minute).padStart(2, '0')}`; };
