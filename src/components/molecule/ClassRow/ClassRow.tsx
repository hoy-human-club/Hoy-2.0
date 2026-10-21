import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatTime } from '../../../i18n/format';
import type { Tone } from '../../../design/tokens';
import { CapacityMeter } from '../CapacityMeter/CapacityMeter';
import { Badge } from '../../atom/Badge/Badge';
import './ClassRow.css';

export interface ClassRowProps {
  thumbnail?: ReactNode;
  title: string;
  teacher: string;
  startsAt: string;
  durationMin: number;
  tone: Tone;
  booked: number;
  capacity: number;
  status?: 'scheduled' | 'cancelled' | 'completed';
  booked_by_me?: boolean;
  disabled?: boolean;
  availabilityLabel?: string;
  onClick?: () => void;
}

/** Dense one-line class entry for lists (today, schedule day, check-in). */
export function ClassRow({ thumbnail, title, teacher, startsAt, durationMin, tone, booked, capacity, status = 'scheduled', booked_by_me, disabled = false, availabilityLabel, onClick }: ClassRowProps) {
  const { lang, t } = useI18n();
  const Tag = onClick ? 'button' : 'div';
  // No spots left: the row states it as a pill and the capacity meter gives way to it (nothing left to meter).
  const full = status === 'scheduled' && booked >= capacity;
  return (
    <Tag data-tone={tone} className={`classrow classrow-${status} ${full ? 'is-full' : ''} ${disabled ? 'is-disabled' : ''} ${onClick && !disabled ? 'is-clickable' : ''}`} onClick={disabled ? undefined : onClick} disabled={onClick ? disabled : undefined} aria-disabled={disabled || undefined} type={onClick ? 'button' : undefined}>
      {thumbnail && <span className="classrow-thumbnail">{thumbnail}</span>}
      <span className={`classrow-dot tone-${tone}`} aria-hidden />
      <div className="classrow-time"><strong>{formatTime(startsAt, lang)}</strong><span className="xs muted">{t('core.common.min', { n: durationMin })}</span></div>
      <div className="grow">
        <div className="row"><span className="classrow-title">{title}</span>{booked_by_me && <Badge tone="primary">{t('core.status.booked')}</Badge>}{!availabilityLabel && status === 'cancelled' && <Badge tone="danger">{t('core.status.cancelled')}</Badge>}</div>
        <div className="muted small">{teacher}</div>
        {availabilityLabel && <Badge className="classrow-availability">{availabilityLabel}</Badge>}
      </div>
      {!availabilityLabel && status === 'scheduled' && (full ? <Badge tone="danger" className="classrow-full">{t('core.common.full')}</Badge> : <CapacityMeter booked={booked} capacity={capacity} compact />)}
    </Tag>
  );
}
