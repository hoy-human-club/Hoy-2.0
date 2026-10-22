/**
 * Editable content as data: club rules (C-13), the "about HOY" text, the FAQ (C-14/C-15) and the
 * events calendar (C-23). This used to live in src/modules/customer/content.ts as static objects;
 * the pages now read it through useTable() so M-02 can edit it without a deploy.
 * Every string is ES + EN. Figures come from src/tenant/pricing.ts and the M-08 policy defaults — nothing invents a
 * price or a rule here. 0051: the FAQ is the owner's verified FAQ (five sections), shared by the website (W-10) and
 * the app (C-14 / C-15).
 */
import type { ContentArticleRow, EventRow, FaqEntryRow } from '../schema';
import { priceItem } from '../../tenant/pricing';
import { DEFAULT_POLICIES as P } from '../../tenant/policies';
import { base, iso, NOW } from './catalog';
import { formatCOP, MS, addDays, atStudioTime } from '../../i18n/format';

const price = (id: string) => priceItem(id)?.price ?? 0;
const cop = (id: string) => formatCOP(price(id), 'es');
const usd = (id: string) => formatCOP(price(id), 'en');

export const contentArticles: ContentArticleRow[] = [
  // 0051: no class on the launch list is heated, so the hot-room article is unpublished (M-02a can publish it again).
  { ...base('art_hot_room', 120), slug: 'hot-room', section: 'rules', icon: 'flame', required: false, sort: 1, published: false, publish_at: null,
    title: { es: 'Seguridad en sala caliente', en: 'Hot room safety' },
    summary: { es: 'Hidratación, señales del cuerpo y cuándo parar.', en: 'Hydration, body signals and when to stop.' },
    body_md: { es: 'La sala se calienta a 36–38 °C. Es normal sudar mucho; no es normal sentir mareo, náusea o frío repentino. Si pasa, siéntate o acuéstate y avisa al profesor.\n\nToma agua antes, durante y después. Evita comer pesado en las dos horas previas.', en: 'The room is heated to 36–38 °C. Sweating a lot is normal; dizziness, nausea or sudden chills are not. If it happens, sit or lie down and tell the teacher.\n\nDrink water before, during and after. Avoid a heavy meal in the two hours before.' },
    checklist: [{ es: 'Toalla grande para el mat', en: 'Large towel for the mat' }, { es: 'Botella de agua (mínimo 500 ml)', en: 'Water bottle (at least 500 ml)' }, { es: 'Ropa ligera y transpirable', en: 'Light, breathable clothing' }], video_label: null },
  { ...base('art_preparation', 120), slug: 'preparation', section: 'rules', icon: 'clock', required: false, sort: 2, published: true, publish_at: null,
    title: { es: 'Preparación para la clase', en: 'Class preparation' },
    summary: { es: 'Qué traer y cuándo llegar.', en: 'What to bring and when to arrive.' },
    body_md: { es: 'Llega 10 minutos antes y haz el check-in en recepción. La puerta de la sala se cierra al empezar para cuidar la energía del grupo.\n\nNosotros ponemos el mat y todos los implementos. Si quieres, trae una toalla pequeña para la cara y un termo para hidratarte; después de clase hay una zona de hidratación.', en: 'Arrive 10 minutes early and check in at the front desk. The room door closes at start time to protect the group’s focus.\n\nWe provide the mat and all the props. If you like, bring a small face towel and a bottle to stay hydrated; there is a hydration zone after class.' },
    checklist: [{ es: 'Reserva confirmada en la app', en: 'Booking confirmed in the app' }, { es: 'Llegar 10 min antes y hacer el check-in en recepción', en: 'Arrive 10 min early and check in at the front desk' }, { es: 'Teléfono en silencio en el casillero', en: 'Phone silenced, in the locker' }], video_label: null },
  { ...base('art_etiquette', 120), slug: 'etiquette', section: 'rules', icon: 'users', required: false, sort: 3, published: true, publish_at: null,
    title: { es: 'Etiqueta del estudio', en: 'Studio etiquette' },
    summary: { es: 'Silencio, espacio y respeto.', en: 'Silence, space and respect.' },
    body_md: { es: 'Hablamos bajo en la sala y dejamos los zapatos en la entrada. Cada mat es un espacio propio: pide permiso antes de acercarte.\n\nCancela con tiempo si no vas a venir: alguien en lista de espera quiere tu cupo.', en: 'We speak softly in the room and leave shoes at the entrance. Each mat is personal space: ask before moving closer.\n\nCancel in time if you cannot make it: someone on the waitlist wants your spot.' },
    checklist: null, video_label: null },
  { ...base('art_tour', 120), slug: 'tour', section: 'rules', icon: 'play', required: false, sort: 4, published: true, publish_at: null,
    title: { es: 'Tour del estudio', en: 'Studio tour' },
    summary: { es: 'Recepción, casilleros, duchas, vestieres y la sala.', en: 'Front desk, lockers, showers, changing rooms and the room.' },
    body_md: { es: 'Al entrar está recepción, donde haces el check-in. A la izquierda, los casilleros, las duchas y los vestieres; al fondo, la sala principal. Después de clase tienes la zona de hidratación.', en: 'The front desk is at the entrance — that is where you check in. To the left, the lockers, showers and changing rooms; the main room at the back. After class there is the hydration zone.' },
    checklist: null, video_label: { es: 'Video · tour del estudio · 2:00 (pendiente de grabar)', en: 'Video · studio tour · 2:00 (footage pending)' } },
  { ...base('art_emergencies', 120), slug: 'emergencies', section: 'rules', icon: 'health', required: true, sort: 5, published: true, publish_at: null,
    title: { es: 'Emergencias', en: 'Emergencies' },
    summary: { es: 'Qué hacer y a quién avisar.', en: 'What to do and who to tell.' },
    body_md: { es: 'Si alguien se siente mal, avisa al profesor de inmediato. El botiquín y el desfibrilador están en recepción. Tu contacto de emergencia (perfil) es a quien llamamos.', en: 'If someone feels unwell, tell the teacher immediately. First-aid kit and defibrillator are at the front desk. Your emergency contact (profile) is who we call.' },
    checklist: null, video_label: null },
  { ...base('art_about', 120), slug: 'about', section: 'about', icon: 'info', required: false, sort: 6, published: true, publish_at: null,
    title: { es: 'Sobre HOY', en: 'About HOY' },
    summary: { es: 'Un club humano. La vida es hoy.', en: 'A human club. Life is today.' },
    body_md: { es: 'HOY es un espacio de movimiento y bienestar. Siete clases —Ligereza, Híbrido, Fuego, Sólido, Centro, Alineación y Pulso— combinan Pilates, Yoga, Barre, movilidad, fuerza, cardio y respiración, con diferentes niveles de intensidad.\n\nNo venimos a entrenar cuerpos. Venimos a despertar presencia.', en: 'HOY is a space for movement and wellbeing. Seven classes — Ligereza, Híbrido, Fuego, Sólido, Centro, Alineación and Pulso — combine Pilates, Yoga, Barre, mobility, strength, cardio and breathwork, at different levels of intensity.\n\nWe are not here to train bodies. We are here to awaken presence.' },
    checklist: null, video_label: null },
];

interface FaqSeed { group: string; page: number; title: { es: string; en: string }; lead: { es: string; en: string }; items: { q: { es: string; en: string }; a: { es: string; en: string } }[] }

/**
 * 0051 — the owner's FAQ ("HOY FAQ", verified 2026-10-01), five sections. An answer may hold a `{{pricing:<families>}}`
 * line: the FAQ renders it as a live price table from src/tenant/pricing.ts (FaqAnswer), so the table never goes stale.
 * Numbers in sentences are filled here from pricing.ts and the M-08 defaults at seed time.
 */
const FAQ: FaqSeed[] = [
  { group: 's1', page: 1, title: { es: '01 · Clases y precios', en: '01 · Classes and prices' }, lead: { es: 'Las opciones, cuánto duran y qué incluyen.', en: 'The options, how long they last and what they include.' }, items: [
    { q: { es: '¿Cuáles son las opciones?', en: 'What are the options?' }, a: { es: 'Estas son las opciones de lanzamiento, en pesos colombianos:\n\n{{pricing:bienvenida,paquetes,privadas}}', en: 'These are the launch options, in Colombian pesos:\n\n{{pricing:bienvenida,paquetes,privadas}}' } },
    { q: { es: '¿Cuánto tiempo tengo para usar mi paquete de 12 clases?', en: 'How long do I have to use my 12-class package?' }, a: { es: `Tienes ${Math.round((priceItem('pack12')?.validityDays ?? 90) / 30)} meses para usar tus 12 clases.`, en: `You have ${Math.round((priceItem('pack12')?.validityDays ?? 90) / 30)} months to use your 12 classes.` } },
    { q: { es: '¿Puedo pausar mi paquete?', en: 'Can I pause my package?' }, a: { es: `Sí. Puedes congelar tu paquete de 12 clases ${P.freezesPerPackage === 1 ? 'una sola vez' : `${P.freezesPerPackage} veces`}, hasta por ${P.freezeMaxDays} días.`, en: `Yes. You can freeze your 12-class package ${P.freezesPerPackage === 1 ? 'once' : `${P.freezesPerPackage} times`}, for up to ${P.freezeMaxDays} days.` } },
    { q: { es: '¿Hacen reembolsos?', en: 'Do you offer refunds?' }, a: { es: 'No. El paquete de 12 clases no es reembolsable.', en: 'No. The 12-class package is non-refundable.' } },
    { q: { es: 'Soy afiliado de Santa María Tennis Club. ¿Tengo beneficios en HOY?', en: 'I’m a Santa María Tennis Club affiliate. Do I get benefits at HOY?' }, a: { es: `Tienes un precio especial en el paquete de 12 clases: ${cop('pack12_smtc')}. No hay otros beneficios entre Santa María Tennis Club y HOY.`, en: `You get a special price on the 12-class package: ${usd('pack12_smtc')}. There are no other benefits between Santa María Tennis Club and HOY.` } },
    { q: { es: '¿Tienen clases privadas?', en: 'Do you offer private classes?' }, a: { es: `Sí. Una clase privada cuesta ${cop('private')} y cada persona adicional, ${cop('private_extra')}. Máximo ${priceItem('private')?.maxPeople ?? 3} personas por clase privada.`, en: `Yes. A private class costs ${usd('private')}, and each additional person is ${usd('private_extra')}. Maximum ${priceItem('private')?.maxPeople ?? 3} people per private class.` } },
    { q: { es: '¿En qué idioma son las clases?', en: 'What language are the classes in?' }, a: { es: 'La mayoría son en español. Algunas pueden ser en inglés.', en: 'Most are in Spanish. Some may be taught in English.' } },
  ] },
  { group: 's2', page: 1, title: { es: '02 · Reservas, cancelaciones y no-show', en: '02 · Booking, cancellation and no-show' }, lead: { es: 'Cómo reservar, hasta cuándo cancelar y qué pasa si no llegas.', en: 'How to book, when you can cancel and what happens if you miss a class.' }, items: [
    { q: { es: '¿Con cuánta anticipación puedo reservar?', en: 'How far in advance can I book?' }, a: { es: 'No hay un tiempo mínimo. Puedes reservar una clase hasta el último minuto, siempre que haya cupos disponibles.', en: 'There’s no minimum time. You can book a class up to the last minute, as long as there are spots available.' } },
    { q: { es: '¿Puedo cancelar mi reserva?', en: 'Can I cancel my booking?' }, a: { es: `Sí. Puedes cancelar hasta ${P.cancellationHours} horas antes de la clase.`, en: `Yes. You can cancel up to ${P.cancellationHours} hours before the class.` } },
    { q: { es: '¿Qué pasa si no asisto a mi clase?', en: 'What if I miss my class?' }, a: { es: 'No hay reembolso. Si no asististe por enfermedad, reprogramamos tu clase.', en: 'There’s no refund. If you missed it because you were sick, we’ll reschedule your class.' } },
    { q: { es: '¿Cómo hago el check-in?', en: 'How do I check in?' }, a: { es: 'En recepción, cuando llegas.', en: 'At reception, when you arrive.' } },
  ] },
  { group: 's3', page: 1, title: { es: '03 · Tarjetas de regalo', en: '03 · Gift cards' }, lead: { es: 'Regala una clase o un paquete.', en: 'Give a class or a package.' }, items: [
    { q: { es: '¿Puedo regalar HOY?', en: 'Can I give HOY as a gift?' }, a: { es: 'Sí. Hay dos tarjetas de regalo, al mismo precio de las clases:\n\n{{pricing:regalos}}\n\nPuedes comprar varias clases individuales, o dos o más paquetes de 12 clases, para regalar a quien quieras.', en: 'Yes. There are two gift cards, at the same price as the classes:\n\n{{pricing:regalos}}\n\nYou can buy several individual classes, or two or more 12-class packages, to give to whoever you like.' } },
  ] },
  { group: 's4', page: 2, title: { es: '04 · Pagos', en: '04 · Payments' }, lead: { es: 'Cómo pagar en línea y en recepción.', en: 'How to pay online and at the front desk.' }, items: [
    { q: { es: '¿Qué medios de pago aceptan?', en: 'What payment methods do you accept?' }, a: { es: 'Puedes pagar en línea en la página web, con código QR de Wompi o por PSE. En recepción hay diferentes medios de pago, incluido el efectivo.', en: 'You can pay online on the website, with a Wompi QR code or through PSE. At the front desk there are several payment methods, cash included.' } },
  ] },
  { group: 's5', page: 2, title: { es: '05 · Qué traer y el espacio', en: '05 · What to bring and the space' }, lead: { es: 'Lo que ponemos nosotros y lo que encuentras en el estudio.', en: 'What we provide and what you will find at the studio.' }, items: [
    { q: { es: '¿Qué debo llevar?', en: 'What should I bring?' }, a: { es: 'Nosotros ponemos el mat y todos los implementos. Si quieres, trae una toalla pequeña para la cara y un termo para hidratarte.', en: 'We provide the mat and all the props. If you like, bring a small face towel and a bottle to stay hydrated.' } },
    { q: { es: '¿Hay un lugar para hidratarse?', en: 'Is there a place to hydrate?' }, a: { es: 'Sí. Hay una zona de hidratación disponible después de clase.', en: 'Yes. There’s a hydration zone available after class.' } },
    { q: { es: '¿Hay casilleros, duchas y vestieres?', en: 'Are there lockers, showers and changing rooms?' }, a: { es: 'Sí, tenemos casilleros, duchas y vestieres.', en: 'Yes, we have lockers, showers and changing rooms.' } },
  ] },
];

export const faqEntries: FaqEntryRow[] = FAQ.flatMap((s, si) => s.items.map((it, i) => ({
  ...base(`faq_${s.group}_${i + 1}`, 120), group_key: s.group, group_title: s.title, group_lead: s.lead, page: s.page,
  question: it.q, answer: it.a, sort: si * 10 + i + 1, published: true,
})));

/**
 * Upcoming events, relative to "today" so C-23 always has something to show. Demo events: since 0051 they name no
 * host (the teachers are real people; the studio assigns a host when it publishes a real event) and carry one price
 * for everyone, because there is no membership to discount.
 */
const at = (daysAhead: number, hh: number) => { return atStudioTime(addDays(NOW, daysAhead), hh); };
const span = (from: Date, minutes: number) => iso(new Date(from.getTime() + minutes * MS.min));

export const events: EventRow[] = [
  { ...base('evt_sound_bath', 20), slug: 'sound-bath-luna-llena', status: 'published', room_id: 'room_main', host_teacher_id: null, capacity: 24, price_cop: price('single'), member_price_cop: price('single'), cover_key: 'events/sound-bath',
    title: { es: 'Baño de sonido · Luna llena', en: 'Full Moon Sound Bath' }, kind: { es: 'Baño de sonido', en: 'Sound bath' },
    description: { es: 'Noventa minutos de cuencos, gongs y respiración guiada. Llega con ropa abrigada: el cuerpo se enfría al quedarse quieto.', en: 'Ninety minutes of bowls, gongs and guided breath. Bring warm layers: the body cools down when it stays still.' },
    bring: [{ es: 'Cobija o manta', en: 'Blanket' }, { es: 'Ropa abrigada', en: 'Warm layers' }],
    starts_at: iso(at(9, 19)), ends_at: span(at(9, 19), 90) },
  { ...base('evt_breath_workshop', 15), slug: 'taller-respiracion', status: 'published', room_id: 'room_main', host_teacher_id: null, capacity: 15, price_cop: price('single'), member_price_cop: price('single'), cover_key: 'events/breathwork',
    title: { es: 'Taller de respiración', en: 'Breathwork workshop' }, kind: { es: 'Taller', en: 'Workshop' },
    description: { es: 'Pranayama para gente ocupada: tres técnicas que caben en un día de trabajo.', en: 'Pranayama for busy people: three techniques that fit a working day.' },
    bring: [{ es: 'Cuaderno', en: 'Notebook' }],
    starts_at: iso(at(16, 10)), ends_at: span(at(16, 10), 120) },
  { ...base('evt_inversions', 10), slug: 'masterclass-inversiones', status: 'published', room_id: 'room_main', host_teacher_id: null, capacity: 12, price_cop: price('single') * 2, member_price_cop: price('single') * 2, cover_key: 'events/inversions',
    title: { es: 'Masterclass de inversiones', en: 'Inversions masterclass' }, kind: { es: 'Masterclass', en: 'Masterclass' },
    description: { es: 'Tres horas sobre la pared: parada de manos, antebrazos y cabeza, con asistencia individual y progresiones para cada cuerpo.', en: 'Three hours at the wall: handstand, forearm stand and headstand, with hands-on assistance and progressions for every body.' },
    bring: [{ es: 'Toalla', en: 'Towel' }, { es: 'Medias antideslizantes (opcional)', en: 'Grip socks (optional)' }],
    starts_at: iso(at(23, 9)), ends_at: span(at(23, 9), 180) },
];
