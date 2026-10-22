import type { DataProvider } from '../../../data/types';
import type { BaseRow, UserRow } from '../../../data/schema';
import { digitsOf, isPhone } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';

/** Fictional browser account only. Passwords never enter this command, digest or receipt. */
export interface MockRegistration {
  first: string; last: string; email: string; whatsapp: string;
  birthday: string; ecName: string; ecPhone: string; photo: string | null;
  consent: boolean; marketing: boolean; invite: string | null;
}
export async function registerMockCustomer(data: DataProvider, input: MockRegistration, requestId: string, cancelled: () => boolean = () => false): Promise<string> {
  if (data.name !== 'mock' || !data.atomic) throw Error('registration_disconnected');
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(requestId)) throw Error('registration_request');
  const form = { first: input.first.trim(), last: input.last.trim(), email: input.email.trim().toLowerCase(), whatsapp: input.whatsapp.trim(),
    birthday: input.birthday, ecName: input.ecName.trim(), ecPhone: input.ecPhone.trim(), photo: input.photo, consent: input.consent, marketing: input.marketing, invite: input.invite };
  if (form.first.length < 2 || form.last.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) || !isPhone(form.whatsapp, 12) || form.ecName.length < 2 || !isPhone(form.ecPhone) || form.consent !== true) throw Error('registration_invalid');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(form))))].map(v => v.toString(16).padStart(2, '0')).join('');
  const check = () => { if (cancelled()) throw Error('registration_cancelled'); };
  check();
  return data.atomic(async tx => {
    check();
    const receiptId = `mock_signup_${tenant.id}_${requestId}`;
    const prior = await tx.get<BaseRow & { action: string; diff: unknown }>('audit_log', receiptId);
    check();
    if (prior) {
      const receipt = prior.diff as { intent?: string; userId?: string };
      if (prior.tenant_id !== tenant.id || prior.action !== 'mock.registration' || receipt.intent !== digest || !receipt.userId) throw Error('registration_conflict');
      const user = await tx.get<UserRow>('users', receipt.userId);
      check();
      if (!user || user.tenant_id !== tenant.id) throw Error('registration_conflict');
      return user.id;
    }
    const users = await tx.list<UserRow>('users', { where: { tenant_id: tenant.id } });
    check();
    if (users.some(u => u.tenant_id === tenant.id && (u.email.toLowerCase() === form.email || (u.phone && digitsOf(u.phone) === digitsOf(form.whatsapp))))) throw Error('registration_duplicate');
    const now = new Date().toISOString();
    const user = await tx.insert<UserRow>('users', { email: form.email, phone: form.whatsapp, status: 'active', locale: 'es', last_sign_in_at: now });
    check();
    await tx.insert('profiles', { user_id: user.id, full_name: `${form.first} ${form.last}`, initials: `${form.first[0]}${form.last[0]}`.toUpperCase(), photo_url: form.photo, birthday: form.birthday || null, emergency_contact: { name: form.ecName, phone: form.ecPhone }, marketing_optin: form.marketing, whatsapp_verified: false, notes: form.invite ? `Invite ${form.invite}` : null });
    check();
    await tx.insert('user_roles', { user_id: user.id, role: 'customer', granted_by: null });
    check();
    for (const legal_document_id of ['leg_terms_es', 'leg_privacy_es']) {
      await tx.insert('consents', { user_id: user.id, legal_document_id, accepted_at: now, ip: null });
      check();
    }
    await tx.insert('audit_log', { id: receiptId, actor_id: null, action: 'mock.registration', entity: 'users', entity_id: user.id, ip: null,
      diff: { source: 'fictional-browser-registration', role: 'customer', intent: digest, userId: user.id } });
    check();
    return user.id;
  });
}
