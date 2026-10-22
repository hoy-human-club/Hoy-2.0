import { useI18n } from '../../../i18n/I18nProvider';
import { formatDate, studioParts } from '../../../i18n/format';
import './DateStrip.css';

export interface DateStripProps {
  days: Date[];
  /** Index of the selected day. */
  value: number;
  onChange: (index: number) => void;
  /** Number of classes per day (renders a small dot row). */
  counts?: number[];
  /** Days with no bookable content (Sunday) render muted. */
  disabledIndex?: (i: number) => boolean;
}

/** Horizontal strip of day chips starting today. The selected chip is the primary pill. */
export function DateStrip({ days, value, onChange, counts, disabledIndex }: DateStripProps) {
  const { t, lang } = useI18n();
  return (
    <div className="datestrip" role="tablist" aria-label={t('core.nav.schedule')}>
      {days.map((d, i) => {
        const disabled = disabledIndex?.(i) ?? false;
        return (
          <button key={d.toISOString()} type="button" role="tab" aria-selected={value === i} disabled={disabled} className={`datestrip-day ${value === i ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''}`} onClick={() => onChange(i)}>
            <span className="datestrip-dow">{i === 0 ? t('core.common.today') : formatDate(d.toISOString(), lang, { weekday: 'short' })}</span>
            <strong className="datestrip-num">{studioParts(d).day}</strong>
            {counts && <span className="datestrip-dots" aria-hidden>{Array.from({ length: Math.min(4, counts[i] ?? 0) }, (_, k) => <i key={k} />)}</span>}
          </button>
        );
      })}
    </div>
  );
}
