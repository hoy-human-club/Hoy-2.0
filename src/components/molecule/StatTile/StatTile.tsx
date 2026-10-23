import { useLayoutEffect, useRef, type ReactNode } from 'react';
import './StatTile.css';

/** Below this scale the value is too small to read; it ellipsises instead of shrinking further. */
const MIN_SCALE = 0.5;

/**
 * KPI tile. The value never wraps: it is measured after layout and shrunk (`--stat-fit`, a font-size
 * multiplier down to MIN_SCALE (50 %)) until it fits the width the tile has, whatever the string — a COP
 * figure with the currency code in EN, a date, a "12 / 12". A ResizeObserver re-fits when the column
 * changes (phone frame, grid collapse). Label and hint clamp to two lines with an ellipsis.
 */
export function StatTile({ label, value, hint, trend }: { label: string; value: ReactNode; hint?: string; trend?: 'up' | 'down' | 'flat' }) {
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const row = box.current, el = text.current;
    if (!row || !el) return;
    const fit = () => {
      row.style.setProperty('--stat-fit', '1');
      const trendEl = row.querySelector<HTMLElement>('.stat-trend');
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const available = row.clientWidth - (trendEl ? trendEl.offsetWidth + gap : 0);
      const needed = el.scrollWidth;
      if (available > 0 && needed > available) row.style.setProperty('--stat-fit', String(Math.max(MIN_SCALE, available / needed)));
    };
    fit();
    // The heading face loads after first paint and is wider than its metric fallback: re-fit once it lands,
    // or a value measured against the fallback ellipsises ("$ 8.020.0…") in the real font.
    let live = true;
    document.fonts?.ready.then(() => { if (live) fit(); });
    if (typeof ResizeObserver === 'undefined') return () => { live = false; };
    const ro = new ResizeObserver(fit);
    ro.observe(row.parentElement ?? row);
    return () => { live = false; ro.disconnect(); };
  }, [value, trend]);

  return (
    <div className="stat">
      <div className="eyebrow stat-label">{label}</div>
      <div className="stat-value" ref={box}>
        <span className="stat-value-text" ref={text}>{value}</span>
        {trend && <span className={`stat-trend stat-${trend}`} aria-hidden>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>}
      </div>
      {hint && <div className="stat-hint muted small">{hint}</div>}
    </div>
  );
}
