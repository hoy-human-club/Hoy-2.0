import type { StudioContact } from '../admin/settings';
import { tenant } from '../../tenant/tenant';
/** A changed address must not silently open the tenant's old default map pin. Explicit map overrides win. */
export function customerDirections(contact: StudioContact): string {
  const link = contact.location.link;
  if (link && (link !== tenant.location.link || contact.address === tenant.contact.address && contact.city === tenant.city)) return link;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${contact.address}, ${contact.city}`)}`;
}
