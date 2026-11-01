import type { ImgHTMLAttributes } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatCOP } from '../../../i18n/format';
import type { PriceItem } from '../../../tenant/pricing';
import type { Tone } from '../../../design/tokens';
import { Wordmark } from '../../atom/Wordmark/Wordmark';
import { Button } from '../../atom/Button/Button';
import './PackageCard.css';

export interface PackageCardProps {
  item: PriceItem;
  /** "01 / 02" on the card object. */
  index: number;
  total: number;
  /** Colour of the card object (D-01 class tone). */
  tone: Tone;
  /** Line above the name ("Para todos", "Afiliados Santa María Tennis Club"). */
  eyebrow: string;
  /** Label on the object ("Paquete"). */
  objectLabel: string;
  /** What the package gives, one line each. */
  benefits: string[];
  ctaLabel: string;
  onSelect: () => void;
  /** Decorative artwork only; text and controls stay opaque. */
  photo?: Pick<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'>;
}

/**
 * 0051 — the 12-class package as a tactile card: the object (wordmark, name, "12") above the price, the rules and
 * the call to action. Was MembershipCard (the retired monthly / annual plans); the look is kept, the content is the
 * package's. Prices come from src/tenant/pricing.ts; the rules come from the caller (the M-08 freeze policy).
 */
export function PackageCard({ item, index, total, tone, eyebrow, objectLabel, benefits, ctaLabel, onSelect, photo }: PackageCardProps) {
  const { bi, lang } = useI18n();
  return <article className="package-card" data-tone={tone}>
    <div className="package-object" aria-hidden="true">{photo && <img {...photo} alt="" className="package-object-photo" loading="lazy" decoding="async" />}<Wordmark height={36}/><span className="package-orbit"/><span className="package-object-label">{objectLabel}</span><span className="package-object-name">{bi(item.name)}</span><span className="package-object-footer">{String(index).padStart(2, '0')} / {String(total).padStart(2, '0')} <span>{item.classes ?? ''}</span></span></div>
    <div className="package-card-copy"><div className="row-between wrap"><p className="eyebrow">{eyebrow}</p>{item.badge && <span className="package-badge">{bi(item.badge)}</span>}</div><h2>{bi(item.name)}</h2><p className="muted">{bi(item.description)}</p><div className="package-price"><strong>{formatCOP(item.price ?? 0, lang)}</strong><span>COP</span></div>
    <ul className="package-benefits">{benefits.map((b) => <li key={b}>{b}</li>)}</ul>
    <Button block size="lg" onClick={onSelect}>{ctaLabel} <span aria-hidden>↗</span></Button></div>
  </article>;
}
