import { useCallback, useEffect, useMemo, useState } from 'react';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, HoursOverrideRow } from '../../data/schema';
import { EMPTY_RATE_CARD, type PayrollCadence, type RateCard } from '../../data/payrollCalc';
import type { MapProvider } from '../../components/molecule/MapSlot/MapSlot';
import { tenant } from '../../tenant/tenant';
import { DEFAULT_POLICIES } from '../../tenant/policies';
import { DEFAULT_IVA_PCT, splitIva } from '../../data/tax';
import { MS, dateKey, waLink } from '../../i18n/format';
import { effectiveHoursFor, hoursSentence, todayStatus, type EffectiveHours, type WeeklyHours } from '../../tenant/hours';
import { DEFAULT_CONTACT_ROUTES, mergeContacts, resolveContact, type ContactIntent, type ContactRoutes, type ResolvedContact } from '../../tenant/contacts';
import { colombianHolidays } from '../../tenant/holidays.co';

/**
 * M-08 — the operating parameters every other screen reads. Stored in `tenants.settings` (json)
 * through the data layer; defaults come from src/tenant/tenant.ts so nothing is hardcoded twice.
 */
export interface OpeningHours { open: string; close: string }
/** The contact facts that carry their own confirmed / pending flag (0036). */
export type ContactField = 'whatsapp' | 'address' | 'email' | 'instagram';
export const CONTACT_FIELDS: readonly ContactField[] = ['whatsapp', 'address', 'email', 'instagram'];
export interface StudioSettings {
  studio: { mats: number; classesPerDay: number; perPersonPerDay: number; rooms: number };
  /**
   * M-08a — the studio's contact identity (0018). Every field defaults to src/tenant/tenant.ts. `confirmedFields`
   * (0036) is the owner saying "this one is real", per field: until a field is confirmed every consumer (site
   * footer, W-06, legal tokens, email footers, the customer app, the manual) labels it as pending. `confirmed`
   * is the pre-0036 all-at-once switch, kept so a stored `true` still confirms everything. `useContact()` is the one reader.
   */
  profile: { nit: string; address: string; city: string; whatsapp: string; email: string; instagram: string; instagramUrl: string; mapLat: number; mapLng: number; mapLabel: string; mapLink: string; confirmed: boolean; confirmedFields: Record<ContactField, boolean> };
  /** 0 = Sunday … 6 = Saturday; null = closed. */
  openingHours: Record<string, OpeningHours | null>;
  /** Demo defaults are not verified reception hours. Saving M-08a confirms them explicitly. */
  openingHoursConfirmed: boolean;
  /**
   * Read by the customer app through usePolicy() → src/modules/customer/policy.ts (cancel window, claim window, hold, package
   * freeze, charge notice, lockout). 0051: the verified launch rules — cancel up to 12 h before; the 12-class package can be
   * frozen once (`freezesPerPackage`) for up to 30 days (`freezeMaxDays`); was pauseDaysPerYear / maxPausesPerYear (memberships).
   */
  policies: { cancellationHours: number; waitlistClaimMin: number; lateGraceMin: number; noShowFee: number; freezeMaxDays: number; freezesPerPackage: number; paymentHoldMin: number; chargeNoticeDays: number; lockoutAttempts: number; lockoutMinutes: number };
  quietHours: { from: string; to: string };
  tax: { ivaPct: number; pricesIncludeIva: boolean; dianResolution: string; eInvoicing: boolean };
  integrations: Record<'wompi' | 'whatsapp' | 'email' | 'calendar', 'pending' | 'connected' | 'error'>;
  features: { multipleLocations: boolean; noShowFee: boolean; holidayCalendar: boolean; walkInRegistration: boolean; autoCheckinOnSale: boolean };
  /** M-08c — payout account and the Wompi environment. Secrets are never stored here (see the page notice). */
  payments: { bankName: string; accountType: 'savings' | 'checking'; accountNumber: string; accountHolder: string; wompiEnv: 'sandbox' | 'production' };
  /** M-08d — sender identity for WhatsApp and email (quiet hours live in `quietHours`). */
  comms: { whatsappSender: string; emailSender: string; emailReplyTo: string };
  /** M-08e — tenant-facing identity. `displayName` empty falls back to src/tenant/tenant.ts. */
  branding: { displayName: string; wordmarkVariant: 'auto' | 'blue' | 'cream' | 'yellow'; defaultLang: 'es' | 'en' };
  /**
   * M-08c — payroll (0018). `cadence` is programmed both ways: M-09a generates one run per month or two
   * (1–15, 16–end), S-03 and the finance range follow it. `rateCard` is read by src/data/payrollCalc.ts
   * `rateFor()`: teacher override → modality rate → teachers.rate_per_class. `signedBy` is who signs the
   * payment record (ROADMAP §E 27); `payoutMethod` is the default M-09a proposes.
   */
  payroll: { cadence: PayrollCadence; payoutMethod: 'wompi' | 'transfer' | 'cash'; signedBy: string; withholding: boolean; rateCard: RateCard };
  /**
   * M-08f — content decisions (0018). `mapProvider` is what MapSlot embeds. (0039 retired `publicNaming`: classes
   * are always titled by their modality; 0051 retired `breathworkOwnClass`: the seven classes have no Respiración
   * row to hide. A stored object that still carries either key is read without it, see mergeSettings.)
   */
  content: { mapProvider: MapProvider };
  /**
   * M-08a — WhatsApp contacts by topic (0047, D-0022). One row per intent (`frontDesk`, `sales`, `specials`, `support`,
   * `finance`, `payroll`, `legal`, `coordinator`, `owner`): name, number, role and an hours rule. `frontDesk` with no
   * number is `profile.whatsapp` (then tenant.ts); every other intent with no number falls back to the front desk.
   * `useWhatsappLink()` is the one reader; `resolveContact()` in src/tenant/contacts.ts holds the rules.
   */
  contacts: ContactRoutes;
}

export const DEFAULT_SETTINGS: StudioSettings = {
  studio: { ...tenant.studio },
  profile: { nit: '', address: tenant.contact.address, city: tenant.city, whatsapp: tenant.contact.whatsapp, email: tenant.contact.email, instagram: tenant.social.instagram, instagramUrl: tenant.social.instagramUrl, mapLat: tenant.location.lat, mapLng: tenant.location.lng, mapLabel: '', mapLink: '', confirmed: false, confirmedFields: { ...tenant.contact.confirmed } },
  openingHours: { ...tenant.openingHours },
  openingHoursConfirmed: false,
  policies: { ...DEFAULT_POLICIES },
  quietHours: { from: '21:00', to: '07:00' },
  tax: { ivaPct: DEFAULT_IVA_PCT, pricesIncludeIva: true, dianResolution: '', eInvoicing: false },
  integrations: { wompi: 'pending', whatsapp: 'pending', email: 'pending', calendar: 'pending' },
  features: { multipleLocations: false, noShowFee: false, holidayCalendar: true, walkInRegistration: true, autoCheckinOnSale: true },
  payments: { bankName: '', accountType: 'savings', accountNumber: '', accountHolder: tenant.legalName, wompiEnv: 'sandbox' },
  comms: { whatsappSender: tenant.name, emailSender: tenant.legalName, emailReplyTo: tenant.contact.email },
  branding: { displayName: '', wordmarkVariant: 'auto', defaultLang: tenant.defaultLocale },
  payroll: { cadence: 'monthly', payoutMethod: 'wompi', signedBy: '', withholding: false, rateCard: EMPTY_RATE_CARD },
  content: { mapProvider: 'none' },
  contacts: DEFAULT_CONTACT_ROUTES,
};

export interface TenantRow extends BaseRow { settings: Partial<StudioSettings> | null }

/** Stored partial → full settings with defaults. Exported so non-React code (customer policy) can read the same shape. */
function mergeSettings(stored: Partial<StudioSettings> | null | undefined): StudioSettings {
  const s = stored ?? {};
  return {
    studio: { ...DEFAULT_SETTINGS.studio, ...(s.studio ?? {}) },
    profile: { ...DEFAULT_SETTINGS.profile, ...(s.profile ?? {}), confirmedFields: { ...DEFAULT_SETTINGS.profile.confirmedFields, ...(s.profile?.confirmedFields ?? {}) } },
    openingHours: { ...DEFAULT_SETTINGS.openingHours, ...(s.openingHours ?? {}) },
    openingHoursConfirmed: s.openingHoursConfirmed ?? false,
    policies: { ...DEFAULT_SETTINGS.policies, ...(s.policies ?? {}) },
    quietHours: { ...DEFAULT_SETTINGS.quietHours, ...(s.quietHours ?? {}) },
    tax: { ...DEFAULT_SETTINGS.tax, ...(s.tax ?? {}) },
    integrations: { ...DEFAULT_SETTINGS.integrations, ...(s.integrations ?? {}) },
    features: { ...DEFAULT_SETTINGS.features, ...(s.features ?? {}) },
    payments: { ...DEFAULT_SETTINGS.payments, ...(s.payments ?? {}) },
    comms: { ...DEFAULT_SETTINGS.comms, ...(s.comms ?? {}) },
    branding: { ...DEFAULT_SETTINGS.branding, ...(s.branding ?? {}) },
    payroll: { ...DEFAULT_SETTINGS.payroll, ...(s.payroll ?? {}), rateCard: { byModality: { ...(s.payroll?.rateCard?.byModality ?? {}) }, byTeacher: { ...(s.payroll?.rateCard?.byTeacher ?? {}) } } },
    // Known keys only: a row saved before 0039 / 0051 may still hold `publicNaming` / `breathworkOwnClass`, which are ignored.
    content: { mapProvider: s.content?.mapProvider ?? DEFAULT_SETTINGS.content.mapProvider },
    contacts: mergeContacts(s.contacts),
  };
}

export type SettingsSection = keyof StudioSettings;

export function useSettings() {
  const data = useData();
  const { rows, loading } = useTable<TenantRow>('tenants', { where: { id: tenant.id } });
  const row = rows[0];
  const settings = useMemo(() => mergeSettings(row?.settings), [row]);
  /** Replaces one section; returns { before, after } for the audit log. */
  const save = useCallback(async <K extends SettingsSection>(section: K, value: StudioSettings[K]) => {
    const before = settings[section];
    const next = { ...(row?.settings ?? {}), [section]: value, ...(section === 'openingHours' ? { openingHoursConfirmed: true } : {}) };
    if (row) await data.update('tenants', row.id, { settings: next });
    return { before, after: value };
  }, [data, row, settings]);
  return { settings, save, loading, ready: !!row };
}

/**
 * The policy numbers, live. Any component that calls this re-renders when M-08 is saved, because
 * useSettings() reads `tenants` through useTable() (which follows the provider's change events).
 * src/modules/customer/policy.ts feeds its `policy` snapshot from this hook (<PolicySync/>), so the customer
 * app and the admin read one source.
 */
export function usePolicy() {
  const { settings, loading, ready } = useSettings();
  return useMemo(() => ({
    ...settings.policies,
    quietHours: settings.quietHours,
    features: settings.features,
    tax: settings.tax,
    /** M-08c payroll switches (0018): cadence, default payout method, who signs. */
    payroll: settings.payroll,
    /** Free-cancellation deadline for a session start. */
    cancelDeadline: (startsAt: string) => new Date(new Date(startsAt).getTime() - settings.policies.cancellationHours * MS.hour),
    /** True while `at` is still inside the free-cancellation window. */
    canCancelFree: (startsAt: string, at: Date = new Date()) => at.getTime() <= new Date(startsAt).getTime() - settings.policies.cancellationHours * MS.hour,
    loading, ready,
  }), [settings, loading, ready]);
}

/** IVA split for a consumer price, following the tax settings. */
export const splitTax = (price: number, tax: StudioSettings['tax']) => splitIva(price, tax.ivaPct / 100, tax.pricesIncludeIva);

/** True when `at` falls inside quiet hours (which wrap past midnight). */
export function inQuietHours(at: Date, q: StudioSettings['quietHours']) {
  const mins = at.getHours() * 60 + at.getMinutes();
  const [fh, fm] = q.from.split(':').map(Number), [th, tm] = q.to.split(':').map(Number);
  const from = fh * 60 + fm, to = th * 60 + tm;
  return from > to ? mins >= from || mins < to : mins >= from && mins < to;
}

/* ------------------------------------------------------------------------------------------------
 * 0018 — decisions as settings. The readers every other surface uses so nothing reads tenant.ts alone.
 * ---------------------------------------------------------------------------------------------- */

export interface StudioContact {
  address: string; city: string; whatsapp: string; email: string; instagram: string; instagramUrl: string;
  location: { lat: number; lng: number; label: { es: string; en: string }; link: string | null };
  /** Per field (0036): true until the owner confirms it in M-08a — consumers label that value as pending. */
  pendingFields: Record<ContactField, boolean>;
  /** True while any field is still pending (summary badges). */
  pending: boolean;
  pendingLabel: { es: string; en: string };
}

/** Settings → contact facts, with src/tenant/tenant.ts as the fallback for every empty field. */
export function contactOf(settings: StudioSettings): StudioContact {
  const p = settings.profile;
  const instagram = p.instagram || tenant.social.instagram;
  const label = p.mapLabel ? { es: p.mapLabel, en: p.mapLabel } : tenant.location.label;
  const pendingFields = Object.fromEntries(CONTACT_FIELDS.map((f) => [f, !(p.confirmed || p.confirmedFields?.[f])])) as Record<ContactField, boolean>;
  return {
    address: p.address || tenant.contact.address,
    city: p.city || tenant.city,
    whatsapp: p.whatsapp || tenant.contact.whatsapp,
    email: p.email || tenant.contact.email,
    instagram,
    instagramUrl: p.instagramUrl || (instagram ? `https://www.instagram.com/${instagram.replace('@', '')}` : tenant.social.instagramUrl),
    location: { lat: p.mapLat || tenant.location.lat, lng: p.mapLng || tenant.location.lng, label, link: p.mapLink || tenant.location.link || null },
    pendingFields,
    pending: CONTACT_FIELDS.some((f) => pendingFields[f]),
    pendingLabel: tenant.contact.pendingLabel,
  };
}

/** " (pendiente)" / " (pending)" after a value whose field is not confirmed yet; empty once it is. */
export function pendingSuffix(contact: StudioContact, field: ContactField, lang: 'es' | 'en'): string {
  return contact.pendingFields[field] ? ` (${contact.pendingLabel[lang]})` : '';
}

/** The studio's contact identity, live: M-08a first, tenant.ts as the default. */
export function useContact(): StudioContact {
  const { settings } = useSettings();
  return useMemo(() => contactOf(settings), [settings]);
}

/* ------------------------------------------------------------------------------------------------
 * 0041 — opening hours, live (D-0016). The weekly hours saved in M-08a are the source of truth, the
 * dated exceptions in `hours_overrides` (M-08g) win for the dates they cover, tenant.ts is the fallback.
 * The site footer, W-06, C-25, the manual's {{tenant:hours}}, the JSON-LD and M-10a all read this.
 * ---------------------------------------------------------------------------------------------- */

export interface StudioHours {
  confirmed: boolean;
  weekly: WeeklyHours;
  /** Every override, sorted by start date. */
  overrides: HoursOverrideRow[];
  /** The weekly hours as one sentence per language ("Lun–Vie 6:00–20:00 · Sáb 8:00–13:00 · Dom cerrado"). */
  sentence: { es: string; en: string };
  /** Today's line in the studio's time zone ("Hoy: 06:00–20:00", "Hoy cerrado · Festivo (…)"). */
  today: { es: string; en: string };
  /** Today's date key in the studio's time zone. */
  todayKey: string;
  effectiveHoursFor: (date: string) => EffectiveHours<HoursOverrideRow>;
  loading: boolean;
}

/** Settings + overrides → hours. Pure, exported for tests and non-React callers. */
export function hoursOf(settings: StudioSettings, overrides: HoursOverrideRow[], now: Date = new Date()): Omit<StudioHours, 'loading'> {
  const weekly: WeeklyHours = { ...tenant.openingHours, ...settings.openingHours };
  const sorted = [...overrides].sort((a, b) => a.start_date.localeCompare(b.start_date));
  return {
    confirmed: settings.openingHoursConfirmed,
    weekly,
    overrides: sorted,
    sentence: settings.openingHoursConfirmed ? { es: hoursSentence(weekly, 'es'), en: hoursSentence(weekly, 'en') } : { es: 'Clases de lunes a domingo · consulta el horario de clases', en: 'Classes Monday–Sunday · see the class timetable' },
    today: settings.openingHoursConfirmed ? { es: todayStatus(now, tenant.timezone, weekly, sorted, 'es'), en: todayStatus(now, tenant.timezone, weekly, sorted, 'en') } : { es: 'Horario de recepción pendiente de confirmar', en: 'Reception hours awaiting confirmation' },
    todayKey: dateKeyIn(now, tenant.timezone),
    effectiveHoursFor: (date: string) => effectiveHoursFor(date, weekly, sorted),
  };
}

/** The date key of `now` in an IANA zone (falls back to the viewer's local date if Intl cannot). */
function dateKeyIn(now: Date, tz: string): string {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); } catch { return dateKey(now); }
}

/** The studio's opening hours, live: M-08a weekly hours + M-08g overrides, tenant.ts as the default. */
export function useOpeningHours(): StudioHours {
  const { settings } = useSettings();
  const { rows, loading } = useTable<HoursOverrideRow>('hours_overrides');
  // A 60 s tick so "today" and todayKey follow opening / closing times and midnight while a page stays open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id); }, []);
  return useMemo(() => ({ ...hoursOf(settings, rows, new Date(now)), loading }), [settings, rows, loading, now]);
}

/* ------------------------------------------------------------------------------------------------
 * 0047 — WhatsApp contacts by intent (D-0022). Every handoff in the product names an intent and reads the number
 * through this hook, so the front desk stops receiving payroll and habeas-data questions once M-08a names who does.
 * ---------------------------------------------------------------------------------------------- */

export interface WhatsappLinks {
  /** Who receives `intent` right now (hours and holidays applied), with the front desk as the fallback. */
  resolve: (intent: ContactIntent) => ResolvedContact;
  /** The wa.me link for `intent`, with `text` prefilled. */
  link: (intent: ContactIntent, text?: string) => string;
  /** The number to print in copy: the resolved one, with the M-08a pending label when it is the (unconfirmed) front desk number. */
  display: (intent: ContactIntent, lang: 'es' | 'en') => string;
  /** The routing table itself (M-08a), for lists such as the manual's {{tenant:contact}}. */
  contacts: ContactRoutes;
}

/** The holiday date keys `resolveContact` treats as non-business days: the country's computed calendar, this year and next. */
export function holidayKeys(now: Date = new Date()): string[] {
  if (tenant.country !== 'CO') return [];
  const y = now.getFullYear();
  return [...colombianHolidays(y), ...colombianHolidays(y + 1)].map((h) => h.date);
}

/** Pure version of the hook for non-React callers (actions, tests): settings + hours → the three readers. */
export function whatsappLinksOf(settings: StudioSettings, hours: Pick<StudioHours, 'weekly' | 'overrides'>, now: Date = new Date()): WhatsappLinks {
  const contact = contactOf(settings);
  const holidays = holidayKeys(now);
  const resolve = (intent: ContactIntent) => resolveContact({ contacts: settings.contacts, frontDeskWhatsapp: contact.whatsapp }, hours, intent, { now, tz: tenant.timezone, holidays });
  return {
    resolve,
    link: (intent, text) => waLink(resolve(intent).whatsapp, text),
    display: (intent, lang) => { const r = resolve(intent); return r.resolvedIntent === 'frontDesk' && r.whatsapp === contact.whatsapp ? `${r.whatsapp}${pendingSuffix(contact, 'whatsapp', lang)}` : r.whatsapp; },
    contacts: settings.contacts,
  };
}

/** The WhatsApp links, live: M-08a contacts + hours + M-08g exceptions; re-resolves with the hours' 60 s tick. */
export function useWhatsappLink(): WhatsappLinks {
  const { settings } = useSettings();
  const hours = useOpeningHours();
  return useMemo(() => whatsappLinksOf(settings, hours), [settings, hours]);
}

/**
 * How a class is titled on a public schedule row (C-03, W-04, W-01): by its session title, which is the
 * modality name unless the coordinator renamed the session; the modality name fills an empty title.
 * (0039: the M-08f `publicNaming` switch is retired, so there is one naming.)
 */
export function classDisplay(input: { title: string; modalityName?: string | null; teacher: string }): { title: string; teacher: string } {
  return { title: input.title || input.modalityName || '', teacher: input.teacher };
}
