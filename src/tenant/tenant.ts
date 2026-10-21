/**
 * The ONLY place the studio's identity and physical facts are written.
 * Multi-tenant later: this becomes a row in `tenants` loaded at boot.
 */
import { hoursSentence } from './hours';

export type DayHours = { open: string; close: string } | null;
/**
 * Opening hours per weekday (0 = Sunday), `null` when closed. These are the DEFAULTS only (0041): the live
 * hours are the ones saved in M-08a (`tenants.settings.openingHours`) plus the dated exceptions in
 * `hours_overrides` (M-08g), read everywhere through `useOpeningHours()` in src/modules/admin/settings.ts.
 */
export type OpeningHours = Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', DayHours>;

const openingHours: OpeningHours = {
  '0': null,
  '1': { open: '06:00', close: '20:00' }, '2': { open: '06:00', close: '20:00' }, '3': { open: '06:00', close: '20:00' },
  '4': { open: '06:00', close: '20:00' }, '5': { open: '06:00', close: '20:00' },
  '6': { open: '08:00', close: '13:00' },
};

/** 0041: moved to ./hours.ts with the other pure hours readers; re-exported so existing imports keep working. */
export { hoursSentence };

export const tenant = {
  id: 'ten_hoy',
  slug: 'hoy',
  name: 'HOY',
  legalName: 'HOY Wellness Center',
  tagline: { es: 'Human club', en: 'Human club' },
  /** The studio is in Medellín (the brand manual is headed "Medellín · 2026" and the copy names it). */
  city: 'Medellín',
  country: 'CO',
  timezone: 'America/Bogota',
  currency: 'COP',
  /** Owner-selected defaults for new classes; existing durations and agreements stay unchanged. */
  classDefaults: { durationMin: 50, flatPayCOP: 100_000 },
  /** Country dialling code every phone field starts from. */
  dialCode: '+57',
  /** Prefix of the invoice numbers the studio issues (`HOY-1005`). */
  invoicePrefix: 'HOY',
  locales: ['es', 'en'] as const,
  defaultLocale: 'es' as const,
  /**
   * 0036 — the phone and the street address come from the owner (Justin, Slack #hoy, 2026-09-29). 0051 — the email and
   * the Instagram handle are confirmed by the studio's verified website brief and Términos y Condiciones (2026-10-01):
   * info@humanclub.com, @hoyhumanclub, WhatsApp Business +57 312 776 5000, and the landmark next to the address.
   * `confirmed` says which fields are real; a field that is not confirmed is labelled as pending on every screen.
   * M-08a can override each value and each flag.
   */
  contact: {
    /** Display form; `waLink()` strips it to digits for the wa.me link (E.164 +573127765000). It is a WhatsApp Business line. */
    whatsapp: '+57 312 776 5000',
    email: 'info@humanclub.com',
    /** Colombian street format, as the club publishes it. */
    address: 'Cl. 7B Sur # 29C-100, El Poblado',
    /** How to find it (Términos y Condiciones §1). */
    landmark: { es: 'Contiguo al Colegio Santa María del Rosario', en: 'Next to Colegio Santa María del Rosario' },
    instagram: '@hoyhumanclub',
    confirmed: { whatsapp: true, address: true, email: true, instagram: true },
    pendingLabel: { es: 'pendiente', en: 'pending' },
  },
  /**
   * The studio's location for the map slot: Santa María Tenis Club, El Poblado. Coordinates from the club's
   * easycancha listing (6.19281, -75.56535), which matches the club's own map pin for the same address.
   */
  location: {
    lat: 6.19281,
    lng: -75.56535,
    label: { es: 'Cl. 7B Sur # 29C-100, El Poblado, Medellín', en: 'Cl. 7B Sur # 29C-100, El Poblado, Medellín' },
    /** Google Maps search for the street address (no share link from the owner yet). */
    link: 'https://www.google.com/maps/search/?api=1&query=Cl.+7B+Sur+%2329C-100%2C+El+Poblado%2C+Medell%C3%ADn%2C+Antioquia',
  },
  /** Public profiles. `null` = the account does not exist yet. */
  social: {
    instagram: '@hoyhumanclub',
    instagramUrl: 'https://www.instagram.com/hoyhumanclub',
    tiktok: null,
    youtube: null,
  },
  /** Studio capacity — the business rule waitlists, capacity meters and the checkout race cite. */
  studio: { mats: 16, matRows: 2, classesPerDay: 5, perPersonPerDay: 1, rooms: 1 },
  openingHours,
  /**
   * The same default hours as a sentence per language (derived, never typed twice). Fallback constant only:
   * screens quote `useOpeningHours().sentence`, which follows what the owner saves in M-08a.
   */
  hours: { es: hoursSentence(openingHours, 'es'), en: hoursSentence(openingHours, 'en') },
  brand: {
    wordmark: { blue: './brand/hoy-blue.png', cream: './brand/hoy-cream.png', yellow: './brand/hoy-yellow.png' },
    lockup: { sand: './brand/p8-2.png', sandAlt: './brand/p8-3.png' },
    /**
     * 0033 — the script mark as one vector (public/brand/hoy-wordmark.svg, `<symbol id="hoy">`, fill currentColor) for
     * the website's display headings. `ratio` = width / height of the symbol's viewBox; `baseline` = where the script's
     * baseline sits, as a fraction of the height from the top (the Wordmark atom drops the mark by 1 − baseline).
     */
    vector: { src: './brand/hoy-wordmark.svg#hoy', ratio: 4501 / 2267, baseline: 0.73 },
  },
} as const;

