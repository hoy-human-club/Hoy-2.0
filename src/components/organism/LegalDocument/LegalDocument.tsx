import { Children, isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { Badge } from '../../atom/Badge/Badge';
import { Chip } from '../../atom/Chip/Chip';
import './LegalDocument.css';

export interface LegalVersionRef {
  id: string;
  /** Chip label, already localised by the caller (e.g. "v1.1 · borrador"). */
  label: string;
}

export interface LegalDocumentProps {
  /** Resolved title for the current language. */
  title: string;
  /** One-line summary under the title. */
  summary?: string;
  /** Markdown body with every {{token}} already resolved. */
  body: string;
  version: string;
  status: 'draft' | 'published';
  /** Human-readable effective date, already formatted. */
  effectiveLabel: string;
  /** Label for the status badge ("vigente" / "borrador"). */
  statusLabel: string;
  /** The counsel-review notice; always shown, because no version is lawyer-reviewed yet. */
  notice?: ReactNode;
  /** Shown only when more than one version exists. */
  versions?: LegalVersionRef[];
  activeVersionId?: string;
  onPickVersion?: (id: string) => void;
  versionsLabel?: string;
  /** "Accepted on …" line for the in-app copy of a document the member signed. */
  accepted?: ReactNode;
  /** Cross-links to the sibling documents. */
  footer?: ReactNode;
}

/**
 * A-06 — one legal document, rendered the same way on the public site and inside the app:
 * title, version and effective date, the counsel-review notice, the markdown body, an optional
 * version switcher and an optional acceptance receipt.
 */
export function LegalDocument({ title, summary, body, version, status, effectiveLabel, statusLabel, notice, versions, activeVersionId, onPickVersion, versionsLabel, accepted, footer }: LegalDocumentProps) {
  const many = (versions?.length ?? 0) > 1;
  return (
    <article className="legaldoc">
      <header className="legaldoc-head">
        <h1 className="legaldoc-title">{title}</h1>
        <div className="row wrap legaldoc-meta">
          <Badge tone={status === 'published' ? 'success' : 'warn'}>{statusLabel}</Badge>
          <span className="mono xs legaldoc-ver">v{version}</span>
          <span className="xs muted">{effectiveLabel}</span>
        </div>
        {summary && <p className="muted small legaldoc-sum">{summary}</p>}
      </header>
      {accepted && <div className="legaldoc-accepted small">{accepted}</div>}
      {notice && <div className="legaldoc-notice small">{notice}</div>}
      {many && (
        <div className="row wrap legaldoc-versions" role="tablist" aria-label={versionsLabel}>
          {versionsLabel && <span className="xs muted">{versionsLabel}</span>}
          {versions!.map((v) => (
            <Chip key={v.id} selected={v.id === activeVersionId} role="tab" aria-selected={v.id === activeVersionId} onClick={onPickVersion ? () => onPickVersion(v.id) : undefined}>{v.label}</Chip>
          ))}
        </div>
      )}
      <div className="prose legaldoc-body">
        <ReactMarkdown components={{ blockquote: ({ children }) => <blockquote className={isPending(children) ? 'legaldoc-pending' : undefined}>{children}</blockquote> }}>{body}</ReactMarkdown>
      </div>
      {footer && <footer className="legaldoc-foot small">{footer}</footer>}
    </article>
  );
}

/** Plain text of rendered markdown children (to recognise a callout by its first words). */
const textOf = (node: ReactNode): string => Children.toArray(node).map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : isValidElement<{ children?: ReactNode }>(c) ? textOf(c.props.children) : '')).join('');

/**
 * 0051 — a blockquote that starts with "Por definir" / "To be defined" is an item the owner still has to write
 * (the Términos y Condiciones draft marks them in yellow). It renders as a highlighted callout, so the page is
 * honest about what is not decided yet instead of hiding it.
 */
const isPending = (children: ReactNode) => /^\s*(por definir|to be defined)/i.test(textOf(children));

export { resolveLegalTokens, type LegalTokens } from './legalTokens';
