import { useMemo } from 'react';
import { useTable } from '../../data/DataContext';
import type { BaseRow, MembershipRow, PlanRow, ProfileRow, UserRow } from '../../data/schema';

interface RoleRow extends BaseRow { user_id: string; role: string }
interface ProfileFull extends ProfileRow { birthday: string | null; notes: string | null }

/** A user joined with profile, role, active membership and plan — what desk, CRM and log pages show. */
export interface Person {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string | null;
  role: string;
  profileId: string | null;
  birthday: string | null;
  notes: string | null;
  marketingOptin: boolean;
  whatsappVerified: boolean;
  createdAt: string;
  membership?: MembershipRow;
  plan?: PlanRow;
}

/** Live join of users × profiles × user_roles × active memberships × plans. */
export function usePeople(): { people: Person[]; byId: Map<string, Person>; loading: boolean } {
  const { rows: users, loading } = useTable<UserRow>('users');
  const { rows: profiles } = useTable<ProfileFull>('profiles');
  const { rows: roles } = useTable<RoleRow>('user_roles');
  const { rows: memberships } = useTable<MembershipRow>('memberships', { where: { status: ['active', 'paused', 'past_due'] } });
  const { rows: plans } = useTable<PlanRow>('plans');
  return useMemo(() => {
    const prof = new Map(profiles.map((p) => [p.user_id, p]));
    const rol = new Map(roles.map((r) => [r.user_id, r.role]));
    const mem = new Map(memberships.map((m) => [m.user_id, m]));
    const plan = new Map(plans.map((p) => [p.id, p]));
    const people = users.map<Person>((u) => {
      const p = prof.get(u.id);
      const m = mem.get(u.id);
      const name = p?.full_name ?? u.email;
      return {
        id: u.id, name, initials: p?.initials ?? name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase(), email: u.email, phone: u.phone,
        role: rol.get(u.id) ?? 'customer', profileId: p?.id ?? null, birthday: p?.birthday ?? null, notes: p?.notes ?? null,
        marketingOptin: !!p?.marketing_optin, whatsappVerified: !!p?.whatsapp_verified, createdAt: u.created_at,
        membership: m, plan: m ? plan.get(m.plan_id) : undefined,
      };
    });
    return { people, byId: new Map(people.map((p) => [p.id, p])), loading };
  }, [users, profiles, roles, memberships, plans, loading]);
}

// Existing import contract retained; formatting is pure and never changes joined/stored data.
export { maskPhone } from './maskPhone';

/** Text match across name, phone and email. */
export const personMatches = (p: Person, q: string) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return p.name.toLowerCase().includes(s) || (p.phone ?? '').replace(/\s/g, '').includes(s.replace(/\s/g, '')) || p.email.toLowerCase().includes(s);
};
