import { TIMETABLE } from './timetable';
import type { BaseRow, ModalityRow, RoomRow, TeacherRow, PlanRow } from '../schema';
import { pricing } from '../../tenant/pricing';
import { tenant } from '../../tenant/tenant';

export const NOW = new Date();
export const iso = (d: Date) => d.toISOString();
export const base = (id: string, daysAgo = 30): BaseRow => {
  const d = new Date(NOW); d.setDate(d.getDate() - daysAgo);
  return { id, tenant_id: tenant.id, created_at: iso(d), updated_at: iso(d) };
};

/**
 * 0051 — the seven classes of the verified launch brief, one schedule modality each (the slug matches the class
 * route in src/tenant/brand.ts). Intensity follows the owner's class cards (baja 1 · media 3 · media-alta 4 ·
 * alta 5). Durations remain demo values: the supplied timetable specifies start times, not lengths. Coordination edits them in M-02.
 */
export const modalities: ModalityRow[] = [
  { ...base('mod_ligereza', 200), slug: 'ligereza', name_es: 'Ligereza', name_en: 'Ligereza', tone: 'river', description: { es: 'Movilidad, stretching y yoga yin. Baja intensidad.', en: 'Mobility, stretching and yin yoga. Low intensity.' }, intensity: 1, heated: false, duration_min: 60, active: true },
  { ...base('mod_hibrido', 200), slug: 'hibrido', name_es: 'Híbrido', name_en: 'Híbrido', tone: 'plum', description: { es: 'Pilates y yoga dinámico. Media intensidad.', en: 'Pilates and dynamic yoga. Medium intensity.' }, intensity: 3, heated: false, duration_min: 60, active: true },
  { ...base('mod_fuego', 200), slug: 'fuego', name_es: 'Fuego', name_en: 'Fuego', tone: 'clay', description: { es: 'Pilates dinámico y rumba. Alta intensidad, sin descanso.', en: 'Dynamic pilates and rumba. High intensity, no rest.' }, intensity: 5, heated: false, duration_min: 60, active: true },
  { ...base('mod_solido', 200), slug: 'solido', name_es: 'Sólido', name_en: 'Sólido', tone: 'slate', description: { es: 'Pilates con pesas y resistencia. Full body, intensidad media-alta.', en: 'Pilates with weights and resistance. Full body, medium-high intensity.' }, intensity: 4, heated: false, duration_min: 60, active: true },
  { ...base('mod_centro', 200), slug: 'centro', name_es: 'Centro', name_en: 'Centro', tone: 'moss', description: { es: 'Meditación, respiración consciente y sound healing.', en: 'Meditation, conscious breathing and sound healing.' }, intensity: 1, heated: false, duration_min: 60, active: true },
  { ...base('mod_alineacion', 200), slug: 'alineacion', name_es: 'Alineación', name_en: 'Alineación', tone: 'sage', description: { es: 'Yoga dinámico funcional y vinyasas. Media intensidad.', en: 'Functional dynamic yoga and vinyasas. Medium intensity.' }, intensity: 3, heated: false, duration_min: 60, active: true },
  { ...base('mod_pulso', 200), slug: 'pulso', name_es: 'Pulso', name_en: 'Pulso', tone: 'sun', description: { es: 'Barre, isometrías y pulsos. Media intensidad.', en: 'Barre, isometrics and pulses. Medium intensity.' }, intensity: 3, heated: false, duration_min: 60, active: true },
];

export const rooms: RoomRow[] = [
  { ...base('room_main', 200), name: 'Sala principal', capacity: tenant.studio.mats, heated: true },
  // The small room: meditation, breathwork, private classes and closed groups (S-05). Demo capacity —
  // the owner confirms the real room list (ROADMAP §E).
  { ...base('room_meditacion', 200), name: 'Sala de meditación', capacity: 8, heated: false },
];

/**
 * 0051 — the studio's teachers as the owner listed them for the website (names exactly as given), each with the
 * class families they guide (updated from the provisional timetable below). The bio only states assignments: nothing else about a real person is invented. Portraits
 * stay empty until the photo session (the site shows the portrait-pending state). `rate_per_class` is the demo
 * fallback the payroll seed reads; the owner sets the real rate card in M-08c. The teacher demo sign-in
 * (`usr_teach`) opens Carolina's teacher app; the account's email and phone stay fictional.
 */
const teacher = (id: string, name: string, mod: string, cls: string, userId: string | null = null): TeacherRow => ({
  ...base(id, 180), user_id: userId, display_name: name,
  bio: { es: `Guía las clases de ${cls}.`, en: `Guides the ${cls} classes.` },
  photo_url: null, specialties: [mod], rate_per_class: 90000, active: true, rating_avg: null,
});

export const teachers: TeacherRow[] = [
  teacher('tea_carolina', 'Carolina Cifuentes', 'mod_pulso', 'Pulso', 'usr_teach'),
  teacher('tea_raghu', 'Raghu', 'mod_hibrido', 'Híbrido'),
  teacher('tea_sara_e', 'Sara Estrada', 'mod_fuego', 'Fuego'),
  teacher('tea_andre', 'Andre Cardona', 'mod_solido', 'Sólido'),
  teacher('tea_sara_c', 'Sara Crismatt Duque', 'mod_ligereza', 'Ligereza'),
  teacher('tea_maria_camila', 'María Camila Pinzón', 'mod_alineacion', 'Alineación'),
  teacher('tea_tatiana', 'Tatiana Ramirez', 'mod_pulso', 'Pulso'),
  // Andrea is not assumed to be Andre Cardona; retain the existing profile separately.
  teacher('tea_andrea', 'Andrea', 'mod_fuego', 'Fuego'),
  teacher('tea_jennifer', 'Jennifer Varela', 'mod_solido', 'Sólido'),
  teacher('tea_clara', 'Clara Zuluaga', 'mod_fuego', 'Fuego'),
  teacher('tea_leandro', 'Leandro Valencia', 'mod_fuego', 'Fuego'),
];

// Public teaching assignments only; no compensation or private availability is imported.
for (const person of teachers) {
  const assigned = [...new Set(TIMETABLE.filter(row => row.teacher === person.id).map(row => row.modality))];
  if (!assigned.length) continue;
  person.specialties = assigned;
  const names = assigned.map(id => modalities.find(m => m.id === id)!.name_es).join(', ');
  person.bio = { es: `Guía las clases de ${names}.`, en: `Guides the ${names} classes.` };
}

export const plans: PlanRow[] = pricing.map((p, i) => ({
  ...base(`plan_${p.id}`, 200),
  slug: p.id, family: p.family, name_es: p.name.es, name_en: p.name.en, description: p.description,
  price: p.price ?? 0, period: p.period ?? 'once', classes: p.classes ?? null, validity_days: p.validityDays ?? null,
  is_from_price: !!p.from, badge: p.badge ?? null, active: true, sort: i,
}));

/**
 * 0018 — the demo rate card M-08c opens with (COP per class by modality). It lives on the seeded
 * `tenants.settings.payroll.rateCard`, not on the teacher rows: `teachers.rate_per_class` stays as the
 * last fallback `payrollCalc.rateFor()` reads. 0051: one flat demo rate for the seven classes — the owner
 * replaces it in M-08c.
 */
export const SEED_RATE_CARD = {
  byModality: Object.fromEntries(modalities.map((m) => [m.id, 90000])) as Record<string, number>,
  byTeacher: {} as Record<string, number>,
};
