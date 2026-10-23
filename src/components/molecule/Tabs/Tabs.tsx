import { useRef, type KeyboardEvent } from 'react';
import './Tabs.css';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  /** Shown as a pill after the label; 0 is shown too (an empty segment is information). */
  count?: number;
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  /** id of the region the tabs switch; each tab points at it with aria-controls. */
  panelId?: string;
}

/**
 * 0154 — sections of one page or one collection (Between Gigs `Tabs`, its only tab style): underline tabs with optional
 * counts, one row that scrolls sideways and never wraps. Switching is instant; use SegmentedControl for a 2–4 way view
 * toggle and Tabs for named subsets (CRM segments). ←/→, Home and End move between tabs (roving tabindex).
 */
export function Tabs<T extends string>({ items, value, onChange, ariaLabel, panelId }: TabsProps<T>) {
  const list = useRef<HTMLDivElement>(null);
  const move = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = items.length;
    const to = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    onChange(items[to].value);
    list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[to]?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel} ref={list}>
      {items.map((it, i) => {
        const on = it.value === value;
        return (
          <button key={it.value} type="button" role="tab" aria-selected={on} aria-controls={panelId} tabIndex={on ? 0 : -1}
            className={`tabs-tab ${on ? 'is-active' : ''}`} onClick={() => onChange(it.value)} onKeyDown={(e) => move(e, i)}>
            <span>{it.label}</span>
            {it.count != null && <span className="tabs-count">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
