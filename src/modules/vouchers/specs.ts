import type { PageSpec } from '../../specs/types';
export const adminSpec: PageSpec = {
  code: 'M-13', name: { es: 'Invitaciones y bonos', en: 'Invitations and vouchers' },
  purpose: { es: 'Crear invitaciones gratuitas de prueba y seguir activación, reserva y asistencia.', en: 'Create free test invitations and follow activation, booking and attendance.' },
  roles: ['super_admin', 'admin'], layout: ['notice', 'create', 'history'],
  data: ['vouchers', 'voucher_bookings', 'voucher_events', 'class_sessions'],
  logic: ['Free invitation issuance never records a purchase.', 'Benefit and participant cap are independent.', 'Demo provider only: no real delivery, authentication or payment.'],
  integrations: ['Supabase (not connected)', 'WhatsApp (preview only)', 'Email (preview only)'],
  states: ['Empty', 'Draft', 'Issued (test)', 'Claimed (test)', 'Booked (test)', 'Attended (test)', 'Error', 'Revoked'],
};
export const claimSpec: PageSpec = { ...adminSpec, code: 'C-28', name: { es: 'Activar invitación', en: 'Activate invitation' }, purpose: { es: 'Activar un bono de prueba y reservar con acompañantes.', en: 'Activate a test voucher and book with guests.' }, roles: ['super_admin', 'admin', 'customer', 'teacher'], layout: ['notice', 'benefit', 'booking', 'history'] };

export const deskSpec: PageSpec = {...adminSpec, code:'S-08',name:{es:'Recepción · bonos y promociones',en:'Front desk · vouchers and promotions'},purpose:{es:'Buscar un código o enlace, verificar al titular, confirmar reservas y marcar asistencia sin volver a descontar.',en:'Find a code or link, verify the holder, confirm bookings and check in without a second debit.'},roles:['super_admin','admin','coordinator','front_desk'],layout:['notice','lookup','result','bookings','walkup'],data:[...adminSpec.data,'bookings','promotion_campaigns','promotion_shares','promotion_claims'],states:['Lookup','Not found','No available class','Participant limit','Unclaimed','Verified','Booked','Confirmed','Attended','Expired','Cancelled']};
