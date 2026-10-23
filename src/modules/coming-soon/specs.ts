import { defineSpec } from '../../specs/define';
import { EVERYONE } from '../../auth/roles';

export const comingSoonSpec = defineSpec({
  code: 'W-11',
  name: { es: 'Próximamente', en: 'Coming soon' },
  purpose: { es: 'La página de preapertura, separada del sitio completo y accesible desde su propia tarjeta en el hub.', en: 'A standalone pre-launch page, separate from the full website and accessible from its own hub card.' },
  layout: ['Landing'], data: [], roles: EVERYONE, integrations: [],
  logic: [
    'Public root and /coming-soon share the pre-launch page; /hub is the separate public testing hub. No SiteShell, booking or lead collection.',
    '0155: the eyebrow names opening day from tenant.opensOn (RN-01, 30 October) until that day has passed, then reads "Coming soon". The tagline\'s last line is italic with its last word on the sun marker.',
    'Uses the existing brand wordmark, tenant identity, approved brand tagline and concept sanctuary artwork.',
    'AmbientScene reuses the existing local loop with a still fallback, reduced-motion/save-data support and an explicit pause control.',
    'Top-right Login (a quiet text link beside the language toggle since 0155) opens a Coming Soon dialog with Close, Escape, Back and focus restoration; no credentials, Clerk setup or authentication action.',
    '0155: index.html carries link-preview tags (og / twitter) with a 1200 × 630 card rendered from this page by scripts/gen-og-image.mjs.',
    'The only external link opens the existing studio Instagram profile; no visitor data is collected or submitted.',
    'Spanish and English share the normal language switch; the full website and its Latest default remain unchanged.',
  ],
  states: ['Spanish', 'English', 'login dialog', 'motion playing', 'motion paused', 'reduced motion', 'video unavailable'],
  checkedAt: [344, 390, 768, 1280],
});
