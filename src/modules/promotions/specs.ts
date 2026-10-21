import type { PageSpec } from '../../specs/types';
import { EVERYONE } from '../../auth/roles';
export const promoteSpec: PageSpec = {
  code: 'S-07', name: {es:'Promover una invitación',en:'Promote an invitation'},
  purpose: {es:'Compartir ofertas aprobadas con enlaces únicos y seguir resultados propios.',en:'Share approved offers with unique links and follow your own results.'},
  roles:['super_admin','admin','teacher'], layout:['notice','create','history'],
  data:['promotion_campaigns','promotion_shares','promotion_claims','promotion_events','voucher_bookings'],
  logic:['Only approved, published, eligible campaigns can be shared.','Private context never appears in public offer previews or links.','Copy and native-share handoff do not mean delivered.','This browser-local sandbox does not work across devices.'],
  integrations:['Native share sheet (handoff only)','Supabase (not connected)'], states:['Draft','Created','Copied','Share cancelled','Claimed','Booked','Attended','Error'],
};
export const offerSpec:PageSpec={...promoteSpec,code:'C-29',name:{es:'Vista previa de promoción',en:'Promotion preview'},purpose:{es:'Revisar una oferta, activarla con una cuenta de prueba y reservar.',en:'Review an offer, claim it with a test account and book.'},roles:EVERYONE,layout:['notice','offer']};
export const performanceSpec:PageSpec={...promoteSpec,code:'M-15',name:{es:'Resultados de promociones',en:'Promotion results'},purpose:{es:'Revisar promociones y resultados por promotor sin confundir compartir con entregar.',en:'Review promotions and promoter results without confusing sharing with delivery.'},roles:['super_admin','admin','coordinator'],layout:['notice','campaigns','results']};
