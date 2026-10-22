import { studioParts, addDays, atStudioTime } from '../../i18n/format';
/**
 * Especiales (0017) — the edge cases handled by hand, seeded so S-05, S-04's receipt, M-09b and S-03
 * open with something real to look at:
 *
 *   · a birthday session already delivered in the small room (done), paid, with a manual teacher
 *     payout — so the current payroll draft carries a line of kind 'manual';
 *   · a confirmed private event in the main room next Saturday, room + teacher, paid by transfer;
 *   · a photo shoot on hold (not yet paid) — the desk sees a dashed block in S-05;
 *   · a maintenance block in the small room tomorrow morning — no money, no teacher.
 *
 * Dates hang off NOW so every seed day has a window to look at; Sundays have no classes, so the
 * Saturday event is the only one that shares a room with the timetable and it sits after the last class.
 */
import type { BaseRow, PaymentRow, SpaceBookingRow, SpecialChargeRow } from '../schema';
import { priceItem } from '../../tenant/pricing';
import { tenant } from '../../tenant/tenant';
import { base, iso, NOW } from './catalog';
import { DEFAULT_IVA_PCT, splitIva } from '../tax';

interface InvoiceRow extends BaseRow { payment_id: string; number: string; subtotal: number; tax: number; total: number; issued_at: string; pdf_url: string | null; dian_cufe: string | null }
interface AuditRow extends BaseRow { actor_id: string | null; action: string; entity: string; entity_id: string | null; diff: Record<string, unknown> | null; ip: string | null }

/** A date `days` from today at `h:m` local time. */
const at = (days: number, h: number, m = 0) => { return atStudioTime(addDays(NOW, days), h, m); };
/** Days until the next Saturday strictly after today. */
const toSaturday = () => ((6 - studioParts(NOW).weekday + 7) % 7) || 7;
const split = (total: number) => splitIva(total, DEFAULT_IVA_PCT / 100);

export function buildSpecials(input: { invoiceCount: number }): { bookings: SpaceBookingRow[]; charges: SpecialChargeRow[]; payments: PaymentRow[]; invoices: InvoiceRow[]; audit: AuditRow[] } {
  const bookings: SpaceBookingRow[] = [];
  const charges: SpecialChargeRow[] = [];
  const payments: PaymentRow[] = [];
  const invoices: InvoiceRow[] = [];
  const audit: AuditRow[] = [];
  let inv = input.invoiceCount;

  const sell = (id: string, opts: { concept: string; amount: number; customerId: string | null; contact: string | null; teacherId: string | null; payout: number | null; bookingId: string | null; source: string | null; method: PaymentRow['method']; daysAgo: number; note?: string }) => {
    const paidAt = at(-opts.daysAgo, 11, 20);
    const stamp = { created_at: iso(paidAt), updated_at: iso(paidAt) };
    const money = split(opts.amount);
    const payment: PaymentRow = { ...base(`pay_sp_${id}`, opts.daysAgo), ...stamp, user_id: opts.customerId, plan_id: null, amount: money.total, amount_paid: money.total, currency: tenant.currency, method: opts.method, provider: 'manual', provider_ref: null, status: 'approved', paid_at: iso(paidAt), taken_by: 'usr_desk', note: null } as PaymentRow;
    payments.push(payment);
    inv += 1;
    invoices.push({ ...base(`inv_sp_${id}`, opts.daysAgo), ...stamp, payment_id: payment.id, number: `HOY-${1000 + inv}`, subtotal: money.subtotal, tax: money.tax, total: money.total, issued_at: iso(paidAt), pdf_url: null, dian_cufe: null });
    const charge: SpecialChargeRow = { ...base(`spc_${id}`, opts.daysAgo), ...stamp, concept: opts.concept, amount: money.total, customer_id: opts.customerId, contact_name: opts.contact, teacher_id: opts.teacherId, teacher_payout: opts.payout, space_booking_id: opts.bookingId, payment_id: payment.id, source_item: opts.source, note: opts.note ?? null, created_by: 'usr_desk' };
    charges.push(charge);
    audit.push({ ...base(`aud_sp_${id}`, opts.daysAgo), ...stamp, actor_id: 'usr_desk', action: 'special.create', entity: 'special_charges', entity_id: charge.id, diff: { role: 'front_desk', source: 'front_desk', concept: opts.concept, amount: money.total, teacher_payout: opts.payout, booking: opts.bookingId }, ip: null });
    return charge;
  };

  // 1 · Birthday session, delivered two days ago in the small room — the manual payroll line of the month.
  const bday: SpaceBookingRow = { ...base('spb_cumple', 9), room_id: 'room_meditacion', kind: 'private_event', title: 'Cumpleaños de Mariana · Centro en privado', starts_at: iso(at(-2, 17, 0)), ends_at: iso(at(-2, 18, 30)), customer_id: 'usr_c05', contact_name: null, teacher_id: 'tea_tatiana', special_charge_id: null, status: 'done', note: '8 personas · traen su torta, nosotros el té', created_by: 'usr_desk' };
  bookings.push(bday);
  const bdayCharge = sell('cumple', { concept: bday.title, amount: 480000, customerId: 'usr_c05', contact: null, teacherId: 'tea_tatiana', payout: 150000, bookingId: bday.id, source: 'private', method: 'qr', daysAgo: 9, note: 'Precio acordado por coordinación: sala pequeña + profe, 90 min.' });
  bday.special_charge_id = bdayCharge.id;

  // 2 · Private team session next Saturday in the main room, after the last class — confirmed and paid by transfer.
  const sat = toSaturday();
  const team: SpaceBookingRow = { ...base('spb_equipo', 4), room_id: 'room_main', kind: 'private_class', title: 'Sesión privada · equipo Lumen Studio', starts_at: iso(at(sat, 16, 0)), ends_at: iso(at(sat, 17, 30)), customer_id: null, contact_name: 'Lumen Studio · Ana Restrepo', teacher_id: 'tea_andre', special_charge_id: null, status: 'confirmed', note: '12 personas · barre suave · facturan a la empresa', created_by: 'usr_coord' };
  bookings.push(team);
  // 0051: a private class for up to 3 people is the launch price; a team session beyond that is quoted by hand (an Especial).
  const teamCharge = sell('equipo', { concept: team.title, amount: (priceItem('private')?.price ?? 0) + 2 * (priceItem('private_extra')?.price ?? 0), customerId: null, contact: team.contact_name, teacherId: 'tea_andre', payout: 180000, bookingId: team.id, source: 'private', method: 'transfer', daysAgo: 4 });
  team.special_charge_id = teamCharge.id;

  // 3 · Photo shoot on hold: quoted, not paid — S-05 draws it dashed until the deposit lands.
  bookings.push({ ...base('spb_foto', 1), room_id: 'room_main', kind: 'rental', title: 'Foto & video · catálogo Ropa Tierra', starts_at: iso(at(3, 13, 30)), ends_at: iso(at(3, 17, 0)), customer_id: null, contact_name: 'Ropa Tierra · Julián Mesa', teacher_id: null, special_charge_id: null, status: 'held', note: 'Esperan cotización firmada; sin anticipo no se bloquea (`12`).', created_by: 'usr_coord' });

  // 4 · Maintenance block tomorrow morning in the small room.
  bookings.push({ ...base('spb_mant', 2), room_id: 'room_meditacion', kind: 'maintenance', title: 'Mantenimiento · cambio de filtros y pintura', starts_at: iso(at(1, 8, 0)), ends_at: iso(at(1, 11, 0)), customer_id: null, contact_name: null, teacher_id: null, special_charge_id: null, status: 'confirmed', note: null, created_by: 'usr_maint' });

  for (const b of bookings) audit.push({ ...base(`aud_spb_${b.id}`, 3), created_at: b.created_at, updated_at: b.created_at, actor_id: b.created_by, action: 'space_booking.create', entity: 'space_bookings', entity_id: b.id, diff: { role: b.created_by === 'usr_coord' ? 'coordinator' : b.created_by === 'usr_maint' ? 'maintenance' : 'front_desk', source: 'front_desk', kind: b.kind, room_id: b.room_id, status: b.status }, ip: null });

  return { bookings, charges, payments, invoices, audit };
}
