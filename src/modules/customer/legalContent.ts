import { formatCOP } from '../../i18n/format';
import type { Lang } from '../../i18n/types';
import { tenant } from '../../tenant/tenant';
import { pricing } from '../../tenant/pricing';
import { contactOf, type StudioSettings } from '../admin/settings';
import { resolveLegalTokens, type LegalTokens } from '../../components/organism/LegalDocument/legalTokens';
import { strings } from './strings';
import type { LegalDocumentRow } from '../../data/schema';

/** The same resolved text is used for review, consent fingerprints and saved evidence. */
export function legalTokens(settings:StudioSettings,lang:Lang):LegalTokens {
 const contact=contactOf(settings);
 const t=(key:string,vars:Record<string,string|number>={})=>{
  const entry=strings[key]; let text=(lang==='en'?entry.en??entry.es:entry.es);
  for(const [name,value] of Object.entries(vars))text=text.replaceAll(`{${name}}`,String(value));
  return text;
 };
 return {
    tenant: {
      name: settings.branding.displayName || tenant.name,
      legalName: tenant.legalName,
      city: contact.city,
      nit: settings.profile.nit || t('customer.legal.token.pending'),
      address: contact.pendingFields.address ? `${contact.address} (${t('customer.legal.token.pending')})` : `${contact.address}, ${contact.city}`,
      email: contact.pendingFields.email ? `${contact.email} ${t('customer.legal.token.pending')}` : contact.email,
      whatsapp: contact.pendingFields.whatsapp ? `${contact.whatsapp} ${t('customer.legal.token.pending')}` : contact.whatsapp,
      mats: settings.studio.mats,
      perPersonPerDay: settings.studio.perPersonPerDay,
      landmark: tenant.contact.landmark[lang],
      instagram: contact.instagram,
    },
    // 0051: {{price.<id>}} — a price from src/tenant/pricing.ts, formatted for the reader.
    price: Object.fromEntries(pricing.map((p) => [p.id, p.price == null ? '' : formatCOP(p.price, lang)])),
    policy: {
      cancellationHours: settings.policies.cancellationHours,
      waitlistClaimMin: settings.policies.waitlistClaimMin,
      lateGraceMin: settings.policies.lateGraceMin,
      freezeMaxDays: settings.policies.freezeMaxDays,
      freezesPerPackage: settings.policies.freezesPerPackage,
      // the Terms v1.0 (kept as history) still name the pre-0051 membership-pause tokens
      pauseDaysPerYear: settings.policies.freezeMaxDays,
      maxPausesPerYear: settings.policies.freezesPerPackage,
      chargeNoticeDays: settings.policies.chargeNoticeDays,
      noShowFeeClause: settings.features.noShowFee && settings.policies.noShowFee > 0
        ? t('customer.legal.token.noShowFee', { amount: formatCOP(settings.policies.noShowFee, lang) })
        : '',
    },
  };
}
export function resolvedLegalCopy(row:LegalDocumentRow,settings:StudioSettings,lang:Lang){
 const bi=(value:{es:string;en?:string})=>lang==='en'?value.en??value.es:value.es;
 return {title:bi(row.title),summary:bi(row.summary),body:resolveLegalTokens(bi(row.body_md),legalTokens(settings,lang))};
}
