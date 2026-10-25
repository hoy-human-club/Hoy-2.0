import { studioParts, studioDate } from '../../i18n/format';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData } from '../../data/DataContext';
import type { Bi } from '../../specs/types';
import { Chip } from '../../components/atom/Chip/Chip';
import { Field } from '../../components/molecule/Field/Field';
import { useAudit } from '../staff/audit';
import './admin.css';

/** The five leaves of the M-02 family, in the order the sub-navigation shows them. */
export const CONTENT_TABS = [
  { key: 'entities', to: '/admin/content', code: 'M-02' },
  { key: 'articles', to: '/admin/content/articles', code: 'M-02a' },
  { key: 'faq', to: '/admin/content/faq', code: 'M-02b' },
  { key: 'events', to: '/admin/content/events', code: 'M-02c' },
  { key: 'media', to: '/admin/content/media', code: 'M-02d' },
] as const;

export type ContentTab = typeof CONTENT_TABS[number]['key'];

/**
 * Shared sub-navigation of M-02 — the same row on all five pages. 0169: the page's actions (search, create…) ride on
 * the right of this row instead of a header row of their own.
 */
export function ContentSubNav({ current, actions }: { current: ContentTab; actions?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="adm-subnav-bar">
      <nav className="adm-subnav" aria-label={t('admin.content.title')}>
        {CONTENT_TABS.map((tab) => (
          <Link key={tab.key} to={tab.to} aria-current={tab.key === current ? 'page' : undefined}>
            <Chip selected={tab.key === current}>{t(`admin.content.nav.${tab.key}`)}</Chip>
          </Link>
        ))}
      </nav>
      {actions && <div className="adm-subnav-actions">{actions}</div>}
    </div>
  );
}

/** Everything a content editor needs: the provider, the audit writer and the permission. */
export function useContentEditing() {
  const data = useData();
  const { can } = useSession();
  const audit = useAudit('admin');
  return { data, audit, canWrite: can('content.write') };
}

const EMPTY: Bi = { es: '', en: '' };

/** One bilingual field: ES required, EN optional (it falls back to ES everywhere). */
export function BiField({ label, value, onChange, disabled, rows = 2, hint }: { label: string; value: Bi | null | undefined; onChange: (next: Bi) => void; disabled?: boolean; rows?: number; hint?: string }) {
  const { t } = useI18n();
  const v = value ?? EMPTY;
  return (
    <Field label={label} hint={hint ?? t('admin.content.bi.hint')}>
      {(id) => (
        <div className="stack-sm">
          <textarea id={id} className="input adm-textarea" rows={rows} disabled={disabled} placeholder="ES" value={v.es} onChange={(e) => onChange({ ...v, es: e.target.value })} />
          <textarea className="input adm-textarea" rows={rows} disabled={disabled} placeholder="EN" value={v.en} onChange={(e) => onChange({ ...v, en: e.target.value })} aria-label={`${label} EN`} />
        </div>
      )}
    </Field>
  );
}

/** A page header shared by the four sub-pages: title, subtitle, sub-nav and actions. */
export function ContentHead({ current, title, subtitle, actions }: { current: ContentTab; title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <>
      <div className="page-head">
        <div><h1>{title}</h1><p className="muted small">{subtitle}</p></div>
      </div>
      <ContentSubNav current={current} actions={actions} />
    </>
  );
}

/** Date <-> `datetime-local` input value, without dragging the date into UTC. */
export const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${studioParts(d).year}-${pad(studioParts(d).month + 1)}-${pad(studioParts(d).day)}T${pad(studioParts(d).hour)}:${pad(studioParts(d).minute)}`;
};
export const fromLocalInput = (v: string) => {
  if (!v) return null;
  const [date, time] = v.split('T'), [y, m, d] = date.split('-').map(Number), [h, min] = (time ?? '').split(':').map(Number);
  return studioDate(y, m - 1, d, h, min).toISOString();
};
