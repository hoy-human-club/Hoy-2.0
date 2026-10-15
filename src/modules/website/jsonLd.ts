import { useEffect, useMemo } from 'react';
import { tenant } from '../../tenant/tenant';
import { toSchemaOrgHours } from '../../tenant/hours';
import { useContact, useOpeningHours } from '../admin/settings';

const SCRIPT_ID = 'hoyos-localbusiness';

/**
 * 0041 — the studio as schema.org `LocalBusiness` JSON-LD in the website's <head>, so search engines read the
 * same hours and exceptions the page prints (M-08a weekly hours + M-08g overrides from today on). Only confirmed
 * contact fields are published (0036): a pending placeholder never goes out as structured data. Language-neutral
 * on purpose; the names come from src/tenant/tenant.ts.
 */
export function useStudioJsonLd(enabled = true) {
  const contact = useContact();
  const hours = useOpeningHours();
  const json = useMemo(() => {
    const { openingHoursSpecification, specialOpeningHoursSpecification } = toSchemaOrgHours(hours.weekly, hours.overrides, hours.todayKey);
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: tenant.legalName,
      alternateName: tenant.name,
      ...(contact.pendingFields.address ? {} : { address: { '@type': 'PostalAddress', streetAddress: contact.address, addressLocality: contact.city, addressCountry: tenant.country } }),
      ...(contact.pendingFields.whatsapp ? {} : { telephone: contact.whatsapp }),
      ...(contact.pendingFields.email ? {} : { email: contact.email }),
      ...(contact.pendingFields.instagram ? {} : { sameAs: [contact.instagramUrl] }),
      geo: { '@type': 'GeoCoordinates', latitude: contact.location.lat, longitude: contact.location.lng },
      ...(contact.location.link ? { hasMap: contact.location.link } : {}),
      ...(hours.confirmed ? { openingHoursSpecification, ...(specialOpeningHoursSpecification.length ? { specialOpeningHoursSpecification } : {}) } : {}),
    });
  }, [contact, hours]);

  useEffect(() => {
    if (typeof document === 'undefined' || !enabled) return undefined;
    let el = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = SCRIPT_ID; document.head.appendChild(el); }
    el.textContent = json;
    return () => { document.getElementById(SCRIPT_ID)?.remove(); };
  }, [json, enabled]);
}

const FAQ_SCRIPT_ID = 'hoyos-faqpage';

/**
 * 0051 — the FAQ (W-10) as schema.org `FAQPage` JSON-LD, in the reader's language. A `{{pricing:…}}` line in an
 * answer is written out as "name: price" pairs, so the structured data carries the same live prices as the table.
 */
export function useFaqJsonLd(entries: { question: string; answer: string }[]) {
  const json = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((e) => ({ '@type': 'Question', name: e.question, acceptedAnswer: { '@type': 'Answer', text: e.answer } })),
  }), [entries]);
  useEffect(() => {
    if (typeof document === 'undefined' || entries.length === 0) return undefined;
    let el = document.getElementById(FAQ_SCRIPT_ID) as HTMLScriptElement | null;
    if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = FAQ_SCRIPT_ID; document.head.appendChild(el); }
    el.textContent = json;
    return () => { document.getElementById(FAQ_SCRIPT_ID)?.remove(); };
  }, [json, entries.length]);
}
