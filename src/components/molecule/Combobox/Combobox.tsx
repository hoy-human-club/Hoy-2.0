import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { Icon } from '../../atom/Icon/Icon';
import './Combobox.css';

export interface ComboboxOption {
  value: string;
  /** What the field shows once chosen, and the option's main line. */
  label: string;
  /** Second line in the list (teacher, spots); searched too. */
  hint?: string;
  /** Heading the option sits under (a day); options arrive already ordered by group. */
  group?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  /** '' = nothing chosen. */
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  /** Rows rendered at once; the rest are counted and narrowed by typing. */
  limit?: number;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
}

/** Accent- and case-insensitive, so "barre" finds "Barre", "maria" finds "María". */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase();

/**
 * 0154 — pick one value from a long list by typing to filter it (Between Gigs `Combobox`). The field shows the chosen
 * label; focusing it opens the list, typing filters on label, hint and group (every word must match), arrows move,
 * Enter picks, Escape closes and restores the choice. The list is drawn here, not by the OS, so long options wrap
 * instead of clipping like a native select.
 */
export function Combobox({ options, value, onChange, ariaLabel, placeholder, limit = 60, id, invalid, disabled }: ComboboxProps) {
  const { t } = useI18n();
  const auto = useId();
  const inputId = id ?? `cb-${auto}`;
  const listId = `${inputId}-list`;
  const chosen = options.find((o) => o.value === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const words = fold(query).split(/\s+/).filter(Boolean);
    if (!words.length) return options;
    return options.filter((o) => { const hay = fold(`${o.label} ${o.hint ?? ''} ${o.group ?? ''}`); return words.every((w) => hay.includes(w)); });
  }, [options, query]);
  const shown = matches.slice(0, limit);

  // Opening puts the active row on the current choice; a new query starts from the top.
  useEffect(() => { if (open) setActive(Math.max(0, query ? 0 : shown.findIndex((o) => o.value === value))); }, [open, query]);
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active, open]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) close(); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  function close() { setOpen(false); setQuery(''); }
  function pick(o: ComboboxOption | undefined) {
    if (!o || o.disabled) return;
    onChange(o.value);
    close();
  }
  function step(dir: 1 | -1) {
    if (!shown.length) return;
    let i = active;
    for (let n = 0; n < shown.length; n++) { i = (i + dir + shown.length) % shown.length; if (!shown[i].disabled) break; }
    setActive(i);
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!open) setOpen(true); else step(e.key === 'ArrowDown' ? 1 : -1); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); pick(shown[active]); }
    else if (e.key === 'Escape' && open) { e.preventDefault(); close(); }
    else if (e.key === 'Tab' && open) close();
  }

  let lastGroup: string | undefined;
  return (
    <div className={`combobox ${open ? 'is-open' : ''}`} ref={root}>
      <div className={`input combobox-field ${invalid ? 'is-invalid' : ''}`}>
        <input ref={input} id={inputId} className="combobox-input" role="combobox" aria-label={ariaLabel} aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined} aria-invalid={invalid || undefined} disabled={disabled} autoComplete="off" spellCheck={false}
          placeholder={chosen ? chosen.label : placeholder} value={open ? query : chosen?.label ?? ''}
          onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onKeyDown={onKey} />
        <button type="button" className="combobox-toggle" tabIndex={-1} aria-label={t('core.combobox.toggle')} disabled={disabled}
          onClick={() => { if (open) close(); else { setOpen(true); input.current?.focus(); } }}><Icon name="chevron-down" size="sm" /></button>
      </div>
      {open && (
        <div className="combobox-panel">
          <ul className="combobox-list" id={listId} role="listbox" aria-label={ariaLabel} ref={list}>
            {shown.map((o, i) => {
              const head = o.group && o.group !== lastGroup ? o.group : null;
              lastGroup = o.group;
              return [
                head && <li key={`g-${head}`} className="combobox-group eyebrow" role="presentation">{head}</li>,
                <li key={o.value} id={`${listId}-${i}`} data-index={i} role="option" aria-selected={o.value === value} aria-disabled={o.disabled || undefined}
                  className={`combobox-option ${i === active ? 'is-active' : ''} ${o.value === value ? 'is-chosen' : ''}`}
                  onPointerDown={(e) => e.preventDefault()} onPointerEnter={() => setActive(i)} onClick={() => pick(o)}>
                  <span className="combobox-label">{o.label}</span>
                  {o.hint && <span className="combobox-hint xs muted">{o.hint}</span>}
                  {o.value === value && <Icon name="check" size="sm" className="combobox-check" />}
                </li>,
              ];
            })}
          </ul>
          {shown.length === 0 && <p className="combobox-empty small muted" role="status">{t('core.combobox.none', { q: query })}</p>}
          {matches.length > shown.length && <p className="combobox-more xs muted" role="status">{t('core.combobox.more', { n: matches.length - shown.length })}</p>}
        </div>
      )}
    </div>
  );
}
