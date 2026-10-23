import { Wordmark } from '../../atom/Wordmark/Wordmark';
import './MemberCard.css';

export interface MemberCardProps {
  /** The member's full name, as on their profile. */
  name: string;
  /** Second line under the name, e.g. "Desde octubre de 2026". */
  since?: string;
  /** Top-right caption, e.g. "Human club" and the city (two lines). */
  caption: [string, string];
  /** Accessible name for the card. */
  label: string;
}

/**
 * 0158 — Pulso Luxe: the member's club card. Deep ink with a fine sun-yellow double edge, a faint grain and the
 * breathing rings; the cream wordmark, the club caption, the member's name and since-line. Purely presentational:
 * the page around it says what the member has (classes, streak, next class). Same look in both themes.
 */
export function MemberCard({ name, since, caption, label }: MemberCardProps) {
  return (
    <section className="membercard" aria-label={label}>
      <span className="membercard-rings" aria-hidden="true" />
      <div className="membercard-top">
        <Wordmark vector tone="cream" className="membercard-mark" />
        <span className="membercard-caption">{caption[0]}<br />{caption[1]}</span>
      </div>
      <div className="membercard-bottom">
        <span className="membercard-name">{name}</span>
        {since && <span className="membercard-since">{since}</span>}
      </div>
    </section>
  );
}
