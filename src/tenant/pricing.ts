/**
 * Launch price list (0051) — the ONLY place a price is written. P-01, C-04, C-06, C-07, C-17, S-04,
 * the FAQ seed and the `plans` seed all read from here. Amounts in COP (integers), IVA included.
 *
 * Source: the owner's verified launch list (WEBSITE MODIF, the FAQ and the Términos y Condiciones,
 * 2026-10-01). HOY sells classes, never credits: a trial class, a single class, the 12-class package
 * (3 months, freeze once for up to 30 days, non-refundable), the same package at a special price for
 * Santa María Tennis Club affiliates, private classes for up to 3 people and gift cards at the class
 * price. The studio rental and corporate experiences are quoted case by case, so their families carry
 * a label, a role and a rationale but **no priced item** (`ON_REQUEST_FAMILIES`).
 *
 * The 0032 value model (Membresía, Pausas, packs of 3 and 10) is retired: there is no recurring plan
 * at launch. Final post-launch prices are an owner decision (manual chapter 03).
 */
import { tenant } from './tenant';

export type PlanFamily = 'bienvenida' | 'paquetes' | 'privadas' | 'regalos' | 'espacio' | 'corporativo';

/** Families that are offered but quoted case by case: no `pricing` item may use them. */
export const ON_REQUEST_FAMILIES: readonly PlanFamily[] = ['espacio', 'corporativo'];
/** The families a priced item (and so a `plans` row) can belong to. */
export type SellableFamily = Exclude<PlanFamily, 'espacio' | 'corporativo'>;
export const isOnRequest = (family: PlanFamily) => ON_REQUEST_FAMILIES.includes(family);
/** Every family, in the order the plans page and the manual list them. */
export const FAMILY_ORDER: readonly PlanFamily[] = ['bienvenida', 'paquetes', 'privadas', 'regalos', 'espacio', 'corporativo'];

export interface PriceItem {
  id: string;
  family: SellableFamily;
  name: { es: string; en: string };
  description: { es: string; en: string };
  /** COP; null when the price reads "included". */
  price: number | null;
  /** A recurring charge. No launch item is recurring; the field stays for a future plan. */
  period?: 'month' | 'year';
  /** How many classes the item gives (1 for a trial or single class, 12 for the package). */
  classes?: number;
  /** Days the classes can be used from the purchase (the package: 3 months). */
  validityDays?: number;
  /** The package can be frozen this many times, each for at most this many days (the M-08 freeze policy). */
  freezable?: boolean;
  /** False when the purchase is not refundable (the 12-class package). */
  refundable?: boolean;
  /** Most people one booking covers (private class: 3). */
  maxPeople?: number;
  /** An add-on charged per extra person (the private class's additional person). */
  perPerson?: boolean;
  /** Who may buy it, when not everyone can (Santa María Tennis Club affiliates). */
  audience?: { es: string; en: string };
  /** A gift card: the id of the item it gives, at the same price. */
  giftOf?: string;
  from?: boolean;
  badge?: { es: string; en: string };
}

export const FAMILY_LABEL: Record<PlanFamily, { es: string; en: string }> = {
  bienvenida: { es: 'Para empezar', en: 'To begin' },
  paquetes: { es: 'Paquete de 12 clases', en: '12-class package' },
  privadas: { es: 'Clases privadas', en: 'Private classes' },
  regalos: { es: 'Tarjetas de regalo', en: 'Gift cards' },
  espacio: { es: 'Alquiler del espacio', en: 'Studio rental' },
  corporativo: { es: 'Experiencias corporativas', en: 'Corporate experiences' },
};

export const pricing: PriceItem[] = [
  { id: 'trial', family: 'bienvenida', name: { es: 'Clase de prueba', en: 'Trial class' }, description: { es: 'tu primera clase en el estudio', en: 'your first class at the studio' }, price: 35000, classes: 1 },
  { id: 'single', family: 'bienvenida', name: { es: 'Clase individual', en: 'Individual class' }, description: { es: 'una clase, sin compromiso', en: 'one class, no commitment' }, price: 55000, classes: 1 },
  { id: 'pack12', family: 'paquetes', name: { es: 'Paquete de 12 clases', en: '12-class package' }, description: { es: 'para usar en 3 meses', en: 'to use within 3 months' }, price: 600000, classes: 12, validityDays: 90, freezable: true, refundable: false },
  { id: 'pack12_smtc', family: 'paquetes', name: { es: 'Paquete de 12 clases · Santa María', en: '12-class package · Santa María' }, description: { es: 'precio especial para afiliados de Santa María Tennis Club', en: 'special price for Santa María Tennis Club affiliates' }, price: 480000, classes: 12, validityDays: 90, freezable: true, refundable: false, audience: { es: 'Afiliados de Santa María Tennis Club', en: 'Santa María Tennis Club affiliates' }, badge: { es: 'Afiliados', en: 'Affiliates' } },
  { id: 'private', family: 'privadas', name: { es: 'Clase privada', en: 'Private class' }, description: { es: 'hasta 3 personas', en: 'up to 3 people' }, price: 250000, maxPeople: 3 },
  { id: 'private_extra', family: 'privadas', name: { es: 'Persona adicional', en: 'Additional person' }, description: { es: 'en una clase privada, por persona', en: 'in a private class, per person' }, price: 60000, perPerson: true },
  { id: 'gift_single', family: 'regalos', name: { es: 'Tarjeta de regalo · clase individual', en: 'Gift card · individual class' }, description: { es: 'una clase para regalar', en: 'one class to give' }, price: 55000, classes: 1, giftOf: 'single' },
  { id: 'gift_pack12', family: 'regalos', name: { es: 'Tarjeta de regalo · paquete de 12 clases', en: 'Gift card · 12-class package' }, description: { es: 'el paquete completo para regalar', en: 'the full package to give' }, price: 600000, classes: 12, validityDays: 90, giftOf: 'pack12' },
];

export const pricingByFamily = (family: PlanFamily) => pricing.filter((p) => p.family === family);
export const priceItem = (id: string) => pricing.find((p) => p.id === id);
/** The items a member pays a class with (trial and single first, then the packages), cheapest first. */
export const CLASS_ITEMS = ['trial', 'single', 'pack12', 'pack12_smtc'] as const;
/** The items that open a class balance (a package), as opposed to paying one class. */
export const isPackage = (item: PriceItem | undefined) => !!item && (item.classes ?? 0) > 1;

/**
 * The formats each on-request family is offered in — descriptions only, no price, no checkout. The studio
 * quotes each request (WhatsApp → the desk prices it by hand in S-04).
 */
export const ON_REQUEST_FORMATS: Record<'espacio' | 'corporativo', { id: string; name: { es: string; en: string }; description: { es: string; en: string } }[]> = {
  espacio: [
    { id: 'space-shoot', name: { es: 'Fotos y video', en: 'Photo and video' }, description: { es: 'sesiones y rodajes en el estudio', en: 'shoots and filming at the studio' } },
    { id: 'space-workshop', name: { es: 'Talleres', en: 'Workshops' }, description: { es: 'una sesión temática con tu comunidad', en: 'a themed session with your community' } },
    { id: 'space-event', name: { es: 'Experiencias y eventos', en: 'Experiences and events' }, description: { es: 'lanzamientos, encuentros y actividades especiales', en: 'launches, gatherings and special activities' } },
  ],
  corporativo: [
    { id: 'corp-team', name: { es: 'Sesión para equipos', en: 'Team session' }, description: { es: 'una experiencia grupal en el estudio o en la oficina', en: 'a group experience at the studio or at the office' } },
    { id: 'corp-program', name: { es: 'Programa recurrente', en: 'Recurring programme' }, description: { es: 'encuentros periódicos para un mismo equipo', en: 'regular sessions for the same team' } },
    { id: 'corp-workshop', name: { es: 'Taller a medida', en: 'Tailored workshop' }, description: { es: 'una sesión temática, diseñada según la necesidad del equipo', en: 'a themed session designed around what the team needs' } },
  ],
};

/**
 * Why each family exists — the commercial role and one paragraph, so the plans page and the manual can
 * explain the offer instead of only listing prices.
 */
export const FAMILY_ROLE: Record<PlanFamily, { es: string; en: string }> = {
  bienvenida: { es: 'Primera visita', en: 'First visit' },
  paquetes: { es: 'Constancia', en: 'Consistency' },
  privadas: { es: 'A tu medida', en: 'Made for you' },
  regalos: { es: 'Para compartir', en: 'To share' },
  espacio: { es: 'Bajo solicitud', en: 'On request' },
  corporativo: { es: 'Bajo solicitud', en: 'On request' },
};

export interface FamilyRationale {
  /** The commercial role, shown as the card eyebrow. */
  role: { es: string; en: string };
  /** One line under the family name. */
  subtitle: { es: string; en: string };
  /** The "why it exists" paragraph. */
  why: { es: string; en: string };
  /** Optional footnote. */
  note?: { es: string; en: string };
}

export const FAMILY_RATIONALE: Record<PlanFamily, FamilyRationale> = {
  bienvenida: {
    role: FAMILY_ROLE.bienvenida,
    subtitle: { es: 'Una clase para conocernos, o una clase cuando la quieras.', en: 'One class to meet us, or one class whenever you want it.' },
    why: {
      es: 'La clase de prueba baja la barrera de la primera visita; la clase individual es para quien viene de vez en cuando o todavía no decide.',
      en: 'The trial class lowers the barrier to a first visit; the individual class is for whoever comes now and then or has not decided yet.',
    },
  },
  paquetes: {
    role: FAMILY_ROLE.paquetes,
    subtitle: { es: 'Doce clases, tres meses, cualquier metodología.', en: 'Twelve classes, three months, any methodology.' },
    why: {
      es: 'El paquete es la forma de practicar con constancia: 12 clases para usar en 3 meses, en cualquiera de las siete metodologías. Puedes congelarlo una sola vez, hasta por 30 días. No es reembolsable.',
      en: 'The package is how you practise with consistency: 12 classes to use within 3 months, in any of the seven methodologies. You can freeze it once, for up to 30 days. It is non-refundable.',
    },
    note: {
      es: 'Afiliados de Santa María Tennis Club: precio especial en el paquete de 12 clases. Es el único beneficio entre el club y el estudio.',
      en: 'Santa María Tennis Club affiliates: a special price on the 12-class package. It is the only benefit between the club and the studio.',
    },
  },
  privadas: {
    role: FAMILY_ROLE.privadas,
    subtitle: { es: 'Una clase solo para ti, o para ti y dos personas más.', en: 'A class just for you, or for you and two more people.' },
    why: {
      es: 'Una clase privada se diseña para quien la toma: máximo 3 personas. El valor cubre la clase y cada persona adicional suma un valor fijo.',
      en: 'A private class is designed for whoever takes it: 3 people at most. The price covers the class and each additional person adds a fixed amount.',
    },
  },
  regalos: {
    role: FAMILY_ROLE.regalos,
    subtitle: { es: 'Regala una clase o un paquete, al mismo precio.', en: 'Give a class or a package, at the same price.' },
    why: {
      es: 'Hay dos tarjetas de regalo, al mismo precio de las clases: una clase individual o un paquete de 12 clases. Puedes comprar varias clases individuales, o dos o más paquetes, para regalar a quien quieras.',
      en: 'There are two gift cards, at the same price as the classes: an individual class or a 12-class package. You can buy several individual classes, or two or more packages, to give to whoever you like.',
    },
  },
  espacio: {
    role: FAMILY_ROLE.espacio,
    subtitle: { es: 'El estudio para tus experiencias y actividades especiales.', en: 'The studio for your experiences and special activities.' },
    why: {
      es: 'HOY alquila el espacio para experiencias y actividades especiales. Cada solicitud se analiza de forma individual y su valor depende de las características y necesidades de cada caso.',
      en: 'HOY rents the space for experiences and special activities. Each request is reviewed on its own, and its price depends on what each case involves and needs.',
    },
  },
  corporativo: {
    role: FAMILY_ROLE.corporativo,
    subtitle: { es: 'Bienestar para equipos, desde el lanzamiento.', en: 'Wellbeing for teams, from launch.' },
    why: {
      es: 'Llevar HOY a los equipos: movimiento y respiración como parte de la cultura de trabajo. Tres formatos: sesión para equipos, programa recurrente y taller a medida. Cada propuesta se arma con la empresa.',
      en: 'Taking HOY to teams: movement and breathing as part of the work culture. Three formats: team session, recurring programme and tailored workshop. Each proposal is built with the company.',
    },
  },
};

/**
 * The studio behind the offer — four numbers read from src/tenant/tenant.ts (studio capacity) and from the
 * private-class rule here, so nothing is written twice.
 */
export const DISCIPLINE = {
  numbers: [
    { value: tenant.studio.mats, label: { es: 'mats por clase', en: 'mats per class' } },
    { value: tenant.studio.classesPerDay, label: { es: 'clases por día entre semana', en: 'classes per weekday' } },
    { value: tenant.studio.perPersonPerDay, label: { es: 'clase al día por persona', en: 'class a day per person' } },
    { value: priceItem('private')?.maxPeople ?? 3, label: { es: 'personas como máximo en una clase privada', en: 'people at most in a private class' } },
  ],
  paragraph: {
    es: 'Un salón con cupos contados para que cada clase se viva con calma: reservas tu lugar, eliges tu mat y llegas a una sala preparada para ti.',
    en: 'One room with a set number of places so every class is lived calmly: you book your place, choose your mat and arrive at a room ready for you.',
  },
  tagline: { es: 'La vida es HOY.', en: 'Life is HOY.' },
} as const;

/** Free invitation templates. These are benefits, never sale prices or payment requests. */
export const INVITATION_PRESETS = [
  { id: 'classes_two', benefitKind: 'classes' as const, benefitTotal: 2, participantCap: 2 },
  { id: 'cop_two', benefitKind: 'cop' as const, benefitTotal: 60000, participantCap: 2 },
  { id: 'cop_four', benefitKind: 'cop' as const, benefitTotal: 80000, participantCap: 4 },
];
