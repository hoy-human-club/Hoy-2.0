import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { ROLES, ROLE_LABEL, STAFF_ROLES, type Role } from '../../auth/roles';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, LegalDocumentRow, ModalityRow, RoomRow, TeacherRow } from '../../data/schema';
import { rateFor } from '../../data/payrollCalc';
import { formatCOP, formatDate, digitsOf, isPhone } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { SegmentedControl } from '../../components/molecule/SegmentedControl/SegmentedControl';
import { MapSlot } from '../../components/molecule/MapSlot/MapSlot';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Badge } from '../../components/atom/Badge/Badge';
import { Notice } from '../../components/molecule/Notice/Notice';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { Wordmark } from '../../components/atom/Wordmark/Wordmark';
import { useAudit } from '../staff/audit';
import { contactOf, useOpeningHours, useSettings, whatsappLinksOf, type SettingsSection, type StudioSettings, type TenantRow, CONTACT_FIELDS } from './settings';
import { CONTACT_HOURS, CONTACT_HOURS_LABEL, CONTACT_INTENTS, CONTACT_INTENT_LABEL, CONTACT_INTENT_USES, mergeContacts, type ContactHours, type ContactIntent, type ContactRoute } from '../../tenant/contacts';
import { HoursSettings } from './HoursSettings';
import { useActions } from '../../actions/bus';
import type { ActionHandler } from '../../actions/types';
import { need } from './actions';
import { M08a } from './specs';
import './admin.css';
import { Icon, type IconName } from '../../components/atom/Icon/Icon';

/** The seven sub-pages of M-08. `general` is /admin/settings; the rest are /admin/settings/<key>. `content` (M-08f) arrived in 0018, `hours` (M-08g) in 0041. */
export type SettingsGroup = 'general' | 'hours' | 'features' | 'payments' | 'communications' | 'branding' | 'content';
/** Roles mirror the RouteDef roles in src/modules/admin/index.ts so the rail never offers a blocked page. */
export const SETTINGS_GROUPS: { key: SettingsGroup; path: string; roles: Role[]; icon: IconName }[] = [
  { key: 'general', path: '/admin/settings', roles: ['super_admin', 'admin', 'coordinator', 'finance'], icon: 'studio' },
  { key: 'hours', path: '/admin/settings/hours', roles: ['super_admin', 'admin', 'coordinator'], icon: 'calendar-clock' },
  { key: 'features', path: '/admin/settings/features', roles: ['super_admin', 'admin', 'coordinator', 'finance'], icon: 'features' },
  { key: 'payments', path: '/admin/settings/payments', roles: ['super_admin', 'admin', 'finance'], icon: 'credit-card' },
  { key: 'communications', path: '/admin/settings/communications', roles: ['super_admin', 'admin', 'coordinator'], icon: 'communications' },
  { key: 'branding', path: '/admin/settings/branding', roles: ['super_admin', 'admin'], icon: 'branding' },
  { key: 'content', path: '/admin/settings/content', roles: ['super_admin', 'admin', 'coordinator'], icon: 'file-text' },
];

const DAYS = ['0', '1', '2', '3', '4', '5', '6'];
const DAY_LABEL: Record<string, { es: string; en: string }> = { '0': { es: 'Dom', en: 'Sun' }, '1': { es: 'Lun', en: 'Mon' }, '2': { es: 'Mar', en: 'Tue' }, '3': { es: 'Mié', en: 'Wed' }, '4': { es: 'Jue', en: 'Thu' }, '5': { es: 'Vie', en: 'Fri' }, '6': { es: 'Sáb', en: 'Sat' } };
/** A day's hours are valid when both times are HH:MM and closing comes after opening (0041). */
const validDay = (v: { open: string; close: string }) => /^\d{2}:\d{2}$/.test(v.open) && /^\d{2}:\d{2}$/.test(v.close) && v.close > v.open;
/** What a day reopens with: its tenant.ts default, or the first open day's (never a time typed here). */
const defaultDay = (day: string) => ({ ...(tenant.openingHours[day as keyof typeof tenant.openingHours] ?? Object.values(tenant.openingHours).find((v) => !!v)!) });
/** 0030: one glyph per settings section (M-08a…f); the rail uses SETTINGS_GROUPS[].icon. */
const SECTION_ICON: Record<SettingsSection, IconName> = { profile: 'identity', openingHours: 'clock', openingHoursConfirmed: 'clock', studio: 'capacity', policies: 'policies', features: 'features', payments: 'credit-card', tax: 'tax', payroll: 'payroll', quietHours: 'quiet-hours', comms: 'send', content: 'content', branding: 'branding', integrations: 'integrations', contacts: 'whatsapp' };
/** 0047: a contact row is valid when its number is empty (falls back to the front desk) or carries at least 10 digits. */
const validContact = (c: ContactRoute) => !c.whatsapp?.trim() || isPhone(c.whatsapp);
/** Flags whose page is load-bearing for the demo and cannot be switched off. */
const LOCKED_PAGES = ['A-06', 'E-04'];
interface FlagRow extends BaseRow { key: string; page_code: string | null; label: string; enabled: boolean }
/** The spec toggle label as a string key: 'Week view' → 'week_view' (the seed builds `feature_flags.key` the same way). */
const flagKey = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_');

/**
 * M-08 — every operating parameter other screens read, stored in tenants.settings through the data layer.
 * One page per group (M-08a…M-08e) behind a shared sub-navigation; the feature switches live here
 * (M-08b), not on the M-01 dashboard.
 */
export function SettingsPage({ group = 'general' }: { group?: SettingsGroup }) {
  const { t, bi, lang, dict } = useI18n();
  const { can, hasRole } = useSession();
  const data = useData();
  const audit = useAudit('admin');
  const { settings, save, ready } = useSettings();
  const { rows: rooms } = useTable<RoomRow>('rooms');
  const { rows: flags } = useTable<FlagRow>('feature_flags', { orderBy: { column: 'page_code' } });
  const { rows: modalities } = useTable<ModalityRow>('modalities', { orderBy: { column: 'name_es' } });
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true } });
  const { rows: legalDocs } = useTable<LegalDocumentRow>('legal_documents', { orderBy: { column: 'kind' } });
  const canLegal = can('settings.write');
  const contact = contactOf(settings);
  const canWrite = can('settings.write');
  const canFlags = can('features.write');
  // 0041: today's line in the hours card, and the M-08a WebMCP action.
  const hours = useOpeningHours();

  /** M-08f — publish or withdraw one legal version (A-06 reads `status`); every flip is audited. */
  const toggleLegal = async (d: LegalDocumentRow, on: boolean) => {
    if (!canLegal) return;
    const status = on ? 'published' : 'draft';
    await data.update('legal_documents', d.id, { status, published_at: on ? new Date().toISOString() : null });
    await audit(on ? 'legal.publish' : 'legal.unpublish', 'legal_documents', d.id, { kind: d.kind, version: d.version, before: d.status, after: status });
  };

  const toggleFlag = async (f: FlagRow, on: boolean) => {
    if (!canFlags) return;
    await data.update('feature_flags', f.id, { enabled: on });
    await audit('flag.toggle', 'feature_flags', f.id, { key: f.key, before: f.enabled, after: on });
  };

  const head = (
    <div className="page-head">
      <div><h1>{t('admin.settings.title')}</h1><p className="muted small">{t(`admin.settings.group.${group}.body`)}</p></div>
      {!canWrite && <Badge tone="warn">{t('admin.settings.readonly')}</Badge>}
    </div>
  );
  if (!ready) return <div className="stack">{head}<EmptyState tone="loading" title={t('core.common.loading')} /></div>;

  const S = <K extends SettingsSection>(section: K, title: string, render: (d: StudioSettings[K], set: (v: StudioSettings[K]) => void) => ReactNode, icon?: IconName, valid?: (d: StudioSettings[K]) => boolean) => (
    <Section<K> section={section} value={settings[section]} save={save} audit={audit} readOnly={!canWrite} title={title} icon={icon ?? SECTION_ICON[section]} render={render} valid={valid} />
  );

  return (
    <div className="stack">
      {head}
      <div className="settings">
        <nav className="settings-rail" aria-label={t('admin.settings.title')}>
          {SETTINGS_GROUPS.filter((g) => hasRole(g.roles)).map((g) => (
            <NavLink key={g.key} to={g.path} end className={({ isActive }) => `settings-link ${isActive ? 'is-active' : ''}`}><Icon name={g.icon} size="md" /><span>{t(`admin.settings.group.${g.key}`)}</span></NavLink>
          ))}
        </nav>
        <div className="settings-main stack">
          {group === 'general' && (
            <>
              <GeneralActions />
              {S('profile', t('admin.settings.sec.profile'), (d, set) => (
                <>
                  <div className="row-between wrap">
                    <p className="small muted" style={{ maxWidth: '60ch' }}>{t('admin.settings.profile.note')}</p>
                    {(() => { const open = CONTACT_FIELDS.filter((f) => !(d.confirmed || d.confirmedFields[f])).length; return <Badge tone={open ? 'warn' : 'success'}>{open ? t('admin.settings.profile.pendingN', { n: open }) : t('admin.settings.profile.confirmed')}</Badge>; })()}
                  </div>
                  <div className="grid grid-2"><Field label={t('admin.settings.f.name')} hint={t('admin.settings.f.name.hint')}>{(id) => <Input id={id} value={tenant.name} disabled />}</Field><Field label={t('admin.settings.f.legal')}>{(id) => <Input id={id} value={tenant.legalName} disabled />}</Field></div>
                  <div className="grid grid-2"><Field label={t('admin.settings.f.address')}>{(id) => <Input id={id} value={d.address} disabled={!canWrite} onChange={(e) => set({ ...d, address: e.target.value })} />}</Field><Field label={t('admin.settings.f.city')}>{(id) => <Input id={id} value={d.city} disabled={!canWrite} placeholder={tenant.city} onChange={(e) => set({ ...d, city: e.target.value })} />}</Field></div>
                  <div className="grid grid-2"><Field label="WhatsApp" hint={t('admin.settings.f.whatsapp.hint', { dial: tenant.dialCode })}>{(id) => <Input id={id} value={d.whatsapp} disabled={!canWrite} onChange={(e) => set({ ...d, whatsapp: e.target.value })} />}</Field><Field label="Email">{(id) => <Input id={id} type="email" value={d.email} disabled={!canWrite} onChange={(e) => set({ ...d, email: e.target.value })} />}</Field></div>
                  <div className="grid grid-2"><Field label="Instagram" hint={t('admin.settings.f.instagram.hint')}>{(id) => <Input id={id} value={d.instagram} disabled={!canWrite} placeholder={tenant.social.instagram} onChange={(e) => set({ ...d, instagram: e.target.value })} />}</Field><Field label={t('admin.settings.f.instagramUrl')}>{(id) => <Input id={id} value={d.instagramUrl} disabled={!canWrite} placeholder="https://www.instagram.com/…" onChange={(e) => set({ ...d, instagramUrl: e.target.value })} />}</Field></div>
                  <div className="grid grid-3">
                    <Field label={t('admin.settings.f.mapLat')}>{(id) => <Input id={id} type="number" step="0.0001" value={d.mapLat} disabled={!canWrite} onChange={(e) => set({ ...d, mapLat: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.mapLng')}>{(id) => <Input id={id} type="number" step="0.0001" value={d.mapLng} disabled={!canWrite} onChange={(e) => set({ ...d, mapLng: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.mapLabel')} hint={t('admin.settings.f.mapLabel.hint')}>{(id) => <Input id={id} value={d.mapLabel} disabled={!canWrite} placeholder={contact.location.label.es} onChange={(e) => set({ ...d, mapLabel: e.target.value })} />}</Field>
                  </div>
                  <div className="grid grid-2"><Field label={t('admin.settings.f.mapLink')} hint={t('admin.settings.f.mapLink.hint')}>{(id) => <Input id={id} value={d.mapLink} disabled={!canWrite} placeholder="https://maps.app.goo.gl/…" onChange={(e) => set({ ...d, mapLink: e.target.value })} />}</Field><Field label="NIT" hint={t('admin.settings.f.nit.hint')}>{(id) => <Input id={id} value={d.nit} disabled={!canWrite} onChange={(e) => set({ ...d, nit: e.target.value })} placeholder="901.xxx.xxx-1" />}</Field></div>
                  <fieldset className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}>
                    <legend className="eyebrow">{t('admin.settings.f.confirmed')}</legend>
                    <div className="grid grid-2">
                      {CONTACT_FIELDS.map((f) => <Toggle key={f} size="sm" checked={d.confirmed || d.confirmedFields[f]} disabled={!canWrite} label={t(`admin.settings.f.confirmed.${f}`)} onChange={(on) => set({ ...d, confirmed: false, confirmedFields: { ...Object.fromEntries(CONTACT_FIELDS.map((k) => [k, d.confirmed || d.confirmedFields[k]])) as typeof d.confirmedFields, [f]: on } })} />)}
                    </div>
                  </fieldset>
                  <p className="xs muted">{t('admin.settings.f.confirmed.hint')}</p>
                </>
              ))}
              {S('contacts', t('admin.settings.sec.contacts'), (d, set) => {
                // Who receives each topic right now, from the draft, so the owner sees the effect before saving.
                const draft = whatsappLinksOf({ ...settings, contacts: d }, hours);
                const now = (i: ContactIntent) => { const r = draft.resolve(i); return `${r.name ? `${r.name} · ` : ''}${bi(CONTACT_INTENT_LABEL[r.resolvedIntent])} · ${r.whatsapp}${r.note ? ` · ${bi(r.note)}` : ''}`; };
                return (
                  <>
                    <p className="small muted" style={{ maxWidth: '60ch' }}>{t('admin.settings.contacts.note')}</p>
                    <div className="stack-sm" role="list" aria-label={t('admin.settings.sec.contacts')}>
                      {CONTACT_INTENTS.map((i) => {
                        const row = d[i];
                        const isFront = i === 'frontDesk';
                        const empty = !row.whatsapp?.trim();
                        const upd = (patch: Partial<ContactRoute>) => set({ ...d, [i]: { ...row, ...patch } });
                        return (
                          <div key={i} role="listitem" className="settings-contact" data-intent={i} aria-label={bi(CONTACT_INTENT_LABEL[i])}>
                            <div className="settings-contact-head">
                              <strong className="small">{bi(CONTACT_INTENT_LABEL[i])}</strong>
                              <span className="xs muted">{t('admin.settings.contacts.uses')}: <span className="mono">{CONTACT_INTENT_USES[i]}</span></span>
                              <span className="xs muted" data-testid={`contact-now-${i}`}>{t('admin.settings.contacts.now')}: {now(i)}</span>
                            </div>
                            <Field label={t('admin.settings.contacts.f.name')}>{(id) => <Input id={id} value={row.name ?? ''} disabled={!canWrite} autoComplete="off" onChange={(e) => upd({ name: e.target.value })} />}</Field>
                            <Field label="WhatsApp" hint={empty ? (isFront ? t('admin.settings.contacts.frontDesk.default') : t('admin.settings.contacts.fallback')) : t('admin.settings.f.whatsapp.hint', { dial: tenant.dialCode })} error={validContact(row) ? undefined : t('admin.settings.contacts.invalid')}>{(id) => <Input id={id} inputMode="tel" value={row.whatsapp ?? ''} placeholder={isFront ? contact.whatsapp : `${tenant.dialCode} 3xx xxx xxxx`} disabled={!canWrite} invalid={!validContact(row)} onChange={(e) => upd({ whatsapp: e.target.value })} />}</Field>
                            <Field label={t('admin.settings.contacts.f.role')}>{(id) => <Select id={id} value={row.role ?? ''} disabled={!canWrite} onChange={(e) => upd({ role: (e.target.value || undefined) as Role | undefined })}><option value="">—</option>{STAFF_ROLES.map((r) => <option key={r} value={r}>{bi(ROLE_LABEL[r])}</option>)}</Select>}</Field>
                            <Field label={t('admin.settings.contacts.f.hours')} hint={t(`admin.settings.contacts.hours.${row.hours}`)}>{(id) => <Select id={id} value={row.hours} disabled={!canWrite} onChange={(e) => upd({ hours: e.target.value as ContactHours })}>{CONTACT_HOURS.map((h) => <option key={h} value={h}>{bi(CONTACT_HOURS_LABEL[h])}</option>)}</Select>}</Field>
                          </div>
                        );
                      })}
                    </div>
                    <p className="xs muted">{t('admin.settings.contacts.rules')} <Link to="/teach/payroll">S-03</Link> · <Link to="/app/account">C-26</Link> · <Link to="/site/contact">W-06</Link></p>
                  </>
                );
              }, undefined, (d) => CONTACT_INTENTS.every((i) => validContact(d[i])))}
              {S('openingHours', t('admin.settings.sec.openingHours'), (d, set) => (
                <div className="stack-sm">
                  <p className="small" data-testid="hours-today"><strong>{bi(hours.today)}</strong></p>
                  {DAYS.map((day) => { const v = d[day]; const label = bi(DAY_LABEL[day]); return (
                    <div key={day} className="settings-day">
                      <strong className="small">{label}</strong>
                      <Toggle size="sm" checked={!!v} disabled={!canWrite} label={v ? t('admin.settings.open') : t('admin.settings.closed')} onChange={(on) => set({ ...d, [day]: on ? defaultDay(day) : null })} />
                      {v && <><Input type="time" value={v.open} disabled={!canWrite} invalid={!validDay(v)} onChange={(e) => set({ ...d, [day]: { ...v, open: e.target.value } })} aria-label={t('admin.settings.hours.opensAt', { day: label })} /><span className="muted">–</span><Input type="time" value={v.close} disabled={!canWrite} invalid={!validDay(v)} onChange={(e) => set({ ...d, [day]: { ...v, close: e.target.value } })} aria-label={t('admin.settings.hours.closesAt', { day: label })} /></>}
                    </div>
                  ); })}
                  {DAYS.some((day) => d[day] && !validDay(d[day]!)) && <p className="xs" role="alert">{t('admin.settings.hours.invalid')}</p>}
                  <p className="xs muted">{t('admin.settings.hours.note')}</p>
                  <div className="settings-hours-links">
                    <Link to="/admin/settings/hours" className="btn btn-ghost btn-sm"><span className="btn-icon" aria-hidden><Icon name="calendar-clock" size="sm" /></span><span className="btn-label">{t('admin.settings.hours.link.overrides')}</span></Link>
                    {hasRole(['super_admin', 'admin']) && <Link to="/admin/integrations/google-business" className="btn btn-ghost btn-sm"><span className="btn-icon" aria-hidden><Icon name="store" size="sm" /></span><span className="btn-label">{t('admin.settings.hours.link.google')}</span></Link>}
                  </div>
                </div>
              ), undefined, (d) => DAYS.every((day) => !d[day] || validDay(d[day]!)))}
              {S('studio', t('admin.settings.sec.studio'), (d, set) => (
                <>
                  <div className="grid grid-3">
                    <Field label={t('admin.settings.f.mats')} hint={t('admin.settings.f.mats.hint')}>{(id) => <Input id={id} type="number" min={1} value={d.mats} disabled={!canWrite} onChange={(e) => set({ ...d, mats: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.classesPerDay')}>{(id) => <Input id={id} type="number" min={1} value={d.classesPerDay} disabled={!canWrite} onChange={(e) => set({ ...d, classesPerDay: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.perPerson')} hint={t('admin.settings.f.perPerson.hint')}>{(id) => <Input id={id} type="number" min={1} value={d.perPersonPerDay} disabled={!canWrite} onChange={(e) => set({ ...d, perPersonPerDay: Number(e.target.value) })} />}</Field>
                  </div>
                  <div className="stack-sm"><div className="eyebrow">{t('admin.settings.rooms')}</div>{rooms.map((r) => <div key={r.id} className="row-between small"><span>{r.name}</span><span className="muted">{r.capacity} mats{r.heated ? ' · ♨' : ''}</span></div>)}<Link to="/admin/content" className="small">{t('admin.settings.rooms.edit')}</Link></div>
                </>
              ))}
              {S('policies', t('admin.settings.sec.policies'), (d, set) => (
                <>
                  <div className="grid grid-2">
                    <Field label={t('admin.settings.f.cancellation')} hint="C-08 · C-11 · E-03">{(id) => <Input id={id} type="number" min={0} value={d.cancellationHours} disabled={!canWrite} onChange={(e) => set({ ...d, cancellationHours: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.waitlistClaim')} hint="C-20">{(id) => <Input id={id} type="number" min={5} value={d.waitlistClaimMin} disabled={!canWrite} onChange={(e) => set({ ...d, waitlistClaimMin: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.lateGrace')} hint="S-02 · S-03">{(id) => <Input id={id} type="number" min={0} value={d.lateGraceMin} disabled={!canWrite} onChange={(e) => set({ ...d, lateGraceMin: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.noShowFee')} hint={settings.features.noShowFee ? 'COP' : t('admin.settings.f.noShowFee.off')}>{(id) => <Input id={id} type="number" min={0} value={d.noShowFee} disabled={!canWrite || !settings.features.noShowFee} onChange={(e) => set({ ...d, noShowFee: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.freezeDays')} hint="C-07b">{(id) => <Input id={id} type="number" min={0} value={d.freezeMaxDays} disabled={!canWrite} onChange={(e) => set({ ...d, freezeMaxDays: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.freezes')} hint="C-07b">{(id) => <Input id={id} type="number" min={0} value={d.freezesPerPackage} disabled={!canWrite} onChange={(e) => set({ ...d, freezesPerPackage: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.paymentHold')} hint="E-02">{(id) => <Input id={id} type="number" min={0} value={d.paymentHoldMin} disabled={!canWrite} onChange={(e) => set({ ...d, paymentHoldMin: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.chargeNotice')} hint="C-22">{(id) => <Input id={id} type="number" min={0} value={d.chargeNoticeDays} disabled={!canWrite} onChange={(e) => set({ ...d, chargeNoticeDays: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.lockoutAttempts')} hint="A-02 · E-04">{(id) => <Input id={id} type="number" min={1} value={d.lockoutAttempts} disabled={!canWrite} onChange={(e) => set({ ...d, lockoutAttempts: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.lockoutMinutes')} hint="E-04">{(id) => <Input id={id} type="number" min={1} value={d.lockoutMinutes} disabled={!canWrite} onChange={(e) => set({ ...d, lockoutMinutes: Number(e.target.value) })} />}</Field>
                  </div>
                  <p className="xs muted">{t('admin.settings.policies.note')}</p>
                </>
              ))}
              <Card icon="integrations" title={t('admin.settings.sec.integrations')} eyebrow="M-10" actions={<Link to="/admin/integrations"><Button size="sm" variant="ghost" icon="arrow-right">{t('admin.settings.int.open')}</Button></Link>}>
                <p className="small muted">{t('admin.settings.int.pointer')}</p>
              </Card>
            </>
          )}

          {group === 'hours' && <HoursSettings />}

          {group === 'features' && (
            <>
              {S('features', t('admin.settings.sec.features'), (d, set) => (
                <>
                  <div className="stack-sm">{(Object.keys(d) as (keyof StudioSettings['features'])[]).map((k) => <Toggle key={k} checked={d[k]} disabled={!canWrite} label={t(`admin.settings.feat.${k}`)} onChange={(on) => set({ ...d, [k]: on })} />)}</div>
                  <p className="xs muted">{t('admin.settings.features.note')}</p>
                </>
              ))}
              <Card icon="flag" title={t('admin.settings.flags.title')} eyebrow={t('admin.settings.flags.eyebrow')}>
                <p className="muted small" style={{ marginBottom: 'var(--sp-lg)' }}>{canFlags ? t('admin.settings.flags.body') : t('admin.settings.flags.readonly')}</p>
                <div className="grid grid-3">
                  {[...new Set(flags.map((f) => f.page_code ?? '—'))].map((code) => (
                    <div key={code} className="stack-sm">
                      <div className="eyebrow">{code}</div>
                      {flags.filter((f) => (f.page_code ?? '—') === code).map((f) => <Toggle key={f.id} size="sm" checked={f.enabled} disabled={!canFlags || LOCKED_PAGES.includes(code)} label={dict[`admin.flag.${flagKey(f.label)}`] ? t(`admin.flag.${flagKey(f.label)}`) : f.label} onChange={(on) => toggleFlag(f, on)} />)}
                    </div>
                  ))}
                </div>
                <p className="xs muted" style={{ marginTop: 'var(--sp-lg)' }}>{t('admin.settings.flags.count', { n: flags.length, on: flags.filter((f) => f.enabled).length })} <Link to="/admin/activity">{t('core.nav.activity')}</Link></p>
              </Card>
            </>
          )}

          {group === 'payments' && (
            <>
              {S('payments', t('admin.settings.sec.payments'), (d, set) => (
                <>
                  <div className="grid grid-2">
                    <Field label={t('admin.settings.f.bank')}>{(id) => <Input id={id} value={d.bankName} disabled={!canWrite} onChange={(e) => set({ ...d, bankName: e.target.value })} placeholder={t('admin.settings.f.bank.ph')} />}</Field>
                    <Field label={t('admin.settings.f.accountType')}>{(id) => <Select id={id} value={d.accountType} disabled={!canWrite} onChange={(e) => set({ ...d, accountType: e.target.value as StudioSettings['payments']['accountType'] })}><option value="savings">{t('admin.settings.f.savings')}</option><option value="checking">{t('admin.settings.f.checking')}</option></Select>}</Field>
                    <Field label={t('admin.settings.f.accountNumber')}>{(id) => <Input id={id} value={d.accountNumber} disabled={!canWrite} onChange={(e) => set({ ...d, accountNumber: e.target.value })} />}</Field>
                    <Field label={t('admin.settings.f.accountHolder')}>{(id) => <Input id={id} value={d.accountHolder} disabled={!canWrite} onChange={(e) => set({ ...d, accountHolder: e.target.value })} />}</Field>
                    <Field label={t('admin.settings.f.wompiEnv')} hint="Wompi">{(id) => <Select id={id} value={d.wompiEnv} disabled={!canWrite} onChange={(e) => set({ ...d, wompiEnv: e.target.value as StudioSettings['payments']['wompiEnv'] })}><option value="sandbox">{t('admin.settings.f.sandbox')}</option><option value="production">{t('admin.settings.f.production')}</option></Select>}</Field>
                  </div>
                  <Notice tone="warn" title={t('admin.settings.pay.keys.title')}>{t('admin.settings.pay.keys.body')}</Notice>
                </>
              ))}
              {S('profile', t('admin.settings.sec.fiscal'), (d, set) => (
                <div className="grid grid-2"><Field label="NIT" hint={t('admin.settings.f.nit.hint')}>{(id) => <Input id={id} value={d.nit} disabled={!canWrite} onChange={(e) => set({ ...d, nit: e.target.value })} placeholder="901.xxx.xxx-1" />}</Field><Field label={t('admin.settings.f.legal')}>{(id) => <Input id={id} value={tenant.legalName} disabled />}</Field></div>
              ), 'fiscal')}
              {S('tax', t('admin.settings.sec.tax'), (d, set) => (
                <>
                  <div className="grid grid-2">
                    <Field label={t('admin.settings.f.iva')}>{(id) => <Input id={id} type="number" min={0} max={100} value={d.ivaPct} disabled={!canWrite} onChange={(e) => set({ ...d, ivaPct: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.dian')} hint={t('admin.settings.f.dian.hint')}>{(id) => <Input id={id} value={d.dianResolution} disabled={!canWrite} onChange={(e) => set({ ...d, dianResolution: e.target.value })} placeholder="18764…" />}</Field>
                  </div>
                  <Toggle checked={d.pricesIncludeIva} disabled={!canWrite} label={t('admin.settings.f.included')} onChange={(on) => set({ ...d, pricesIncludeIva: on })} />
                  <Toggle checked={d.eInvoicing} disabled={!canWrite || !d.dianResolution.trim()} label={t('admin.settings.f.eInvoicing')} onChange={(on) => set({ ...d, eInvoicing: on })} />
                  {!d.dianResolution.trim() && <p className="xs muted">{t('admin.settings.tax.needsDian')}</p>}
                  <p className="xs muted">{t('admin.settings.tax.readers')}</p>
                </>
              ))}
              {S('payroll', t('admin.settings.sec.payroll'), (d, set) => {
                const setMod = (id: string, v: string) => { const byModality = { ...d.rateCard.byModality }; if (v.trim()) byModality[id] = Number(v); else delete byModality[id]; set({ ...d, rateCard: { ...d.rateCard, byModality } }); };
                const setTea = (id: string, v: string) => { const byTeacher = { ...d.rateCard.byTeacher }; if (v.trim()) byTeacher[id] = Number(v); else delete byTeacher[id]; set({ ...d, rateCard: { ...d.rateCard, byTeacher } }); };
                return (
                  <>

                <>
                  <div className="grid grid-2">
                    <Field label={t('admin.settings.f.cadence')} hint={t('admin.settings.f.cadence.hint')}>{() => (
                      <SegmentedControl<StudioSettings['payroll']['cadence']> ariaLabel={t('admin.settings.f.cadence')} value={d.cadence} onChange={(v) => canWrite && set({ ...d, cadence: v })} options={[{ value: 'monthly', label: t('admin.settings.f.cadence.monthly') }, { value: 'biweekly', label: t('admin.settings.f.cadence.biweekly') }]} />
                    )}</Field>
                    <Field label={t('admin.settings.f.payoutMethod')} hint="M-09a">{(id) => <Select id={id} value={d.payoutMethod} disabled={!canWrite} onChange={(e) => set({ ...d, payoutMethod: e.target.value as StudioSettings['payroll']['payoutMethod'] })}>{(['wompi', 'transfer', 'cash'] as const).map((m) => <option key={m} value={m}>{t(`admin.payouts.method.${m}`)}</option>)}</Select>}</Field>
                    <Field label={t('admin.settings.f.signedBy')} hint={t('admin.settings.f.signedBy.hint')}>{(id) => <Input id={id} value={d.signedBy} disabled={!canWrite} placeholder={t('admin.settings.f.signedBy.placeholder')} onChange={(e) => set({ ...d, signedBy: e.target.value })} />}</Field>
                  </div>
                  <Toggle checked={d.withholding} disabled={!canWrite} label={t('admin.settings.f.withholding')} onChange={(on) => set({ ...d, withholding: on })} />
                  <p className="xs muted">{d.cadence === 'biweekly' ? t('admin.settings.payroll.note.biweekly') : t('admin.settings.payroll.note.monthly')} <Link to="/admin/finance/payouts">M-09a</Link> · <Link to="/teach/payroll">S-03</Link></p>
                </>
                    <div className="eyebrow" style={{ marginTop: 'var(--sp-sm)' }}>{t('admin.settings.sec.rateCard')}</div>
                    <p className="small muted">{t('admin.settings.rate.hint')}</p>
                    <div className="grid grid-2">
                      <div className="stack-sm">
                        <div className="eyebrow">{t('admin.settings.rate.modality')}</div>
                        {modalities.map((m) => (
                          <div key={m.id} className="settings-rate">
                            <span className="small">{bi({ es: m.name_es, en: m.name_en })}</span>
                            <Input inputMode="numeric" aria-label={m.name_es} value={d.rateCard.byModality[m.id] ?? ''} placeholder="—" disabled={!canWrite} onChange={(e) => setMod(m.id, digitsOf(e.target.value))} /><span className="xs muted settings-rate-fmt">{d.rateCard.byModality[m.id] ? formatCOP(d.rateCard.byModality[m.id], lang) : ''}</span>
                          </div>
                        ))}
                      </div>
                      <div className="stack-sm">
                        <div className="eyebrow">{t('admin.settings.rate.teacher')}</div>
                        {teachers.map((te) => (
                          <div key={te.id} className="settings-rate">
                            <span className="small">{te.display_name}<span className="xs muted"> · {t('admin.settings.rate.profile', { rate: formatCOP(te.rate_per_class ?? 0, lang) })}</span></span>
                            <Input inputMode="numeric" aria-label={te.display_name} value={d.rateCard.byTeacher[te.id] ?? ''} placeholder="—" disabled={!canWrite} onChange={(e) => setTea(te.id, digitsOf(e.target.value))} /><span className="xs muted settings-rate-fmt">{d.rateCard.byTeacher[te.id] ? formatCOP(d.rateCard.byTeacher[te.id], lang) : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="xs muted">{t('admin.settings.rate.example', { teacher: teachers[0]?.display_name ?? '—', modality: modalities[0]?.name_es ?? '—', rate: formatCOP(teachers[0] && modalities[0] ? rateFor(teachers[0].id, modalities[0].id, teachers, d.rateCard) : 0, lang) })}</p>
                  </>
                );
                            })}
            </>
          )}

          {group === 'communications' && (
            <>
              {S('quietHours', t('admin.settings.sec.quietHours'), (d, set) => (
                <>
                  <div className="grid grid-2"><Field label={t('admin.settings.f.from')}>{(id) => <Input id={id} type="time" value={d.from} disabled={!canWrite} onChange={(e) => set({ ...d, from: e.target.value })} />}</Field><Field label={t('admin.settings.f.to')}>{(id) => <Input id={id} type="time" value={d.to} disabled={!canWrite} onChange={(e) => set({ ...d, to: e.target.value })} />}</Field></div>
                  <p className="xs muted">{t('admin.settings.quiet.note')}</p>
                </>
              ))}
              {S('comms', t('admin.settings.sec.senders'), (d, set) => (
                <>
                  <div className="grid grid-2">
                    <Field label={t('admin.settings.f.waSender')} hint={t('admin.settings.f.waSender.hint')}>{(id) => <Input id={id} value={d.whatsappSender} disabled={!canWrite} onChange={(e) => set({ ...d, whatsappSender: e.target.value })} />}</Field>
                    <Field label={t('admin.settings.f.emailSender')}>{(id) => <Input id={id} value={d.emailSender} disabled={!canWrite} onChange={(e) => set({ ...d, emailSender: e.target.value })} />}</Field>
                    <Field label={t('admin.settings.f.replyTo')}>{(id) => <Input id={id} type="email" value={d.emailReplyTo} disabled={!canWrite} onChange={(e) => set({ ...d, emailReplyTo: e.target.value })} />}</Field>
                  </div>
                  <p className="xs muted">{t('admin.settings.senders.note')} <Link to="/admin/whatsapp">M-05</Link> · <Link to="/admin/emails">M-04</Link></p>
                </>
              ))}
            </>
          )}

          {group === 'content' && (
            <>
              {S('content', t('admin.settings.sec.content'), (d, set) => (
                <>
                  <div className="grid grid-2">
                    <Field label={t('admin.settings.f.mapProvider')} hint={t('admin.settings.f.mapProvider.hint')}>{(id) => <Select id={id} value={d.mapProvider} disabled={!canWrite} onChange={(e) => set({ ...d, mapProvider: e.target.value as StudioSettings['content']['mapProvider'] })}>{(['none', 'osm', 'google'] as const).map((v) => <option key={v} value={v}>{t(`admin.settings.f.mapProvider.${v}`)}</option>)}</Select>}</Field>
                  </div>
                  <div className="settings-map"><MapSlot provider={d.mapProvider} ratio="21:9" /></div>
                  <p className="xs muted">{t('admin.settings.content.note')}</p>
                </>
              ))}
              <Card icon="legal" title={t('admin.settings.sec.legal')} eyebrow={t('admin.settings.legal.eyebrow')}>
                <p className="small muted" style={{ marginBottom: 'var(--sp-md)' }}>{t('admin.settings.legal.body', { n: legalDocs.length, on: legalDocs.filter((x) => x.status === 'published').length })}</p>
                <div className="stack-sm">
                  {legalDocs.map((d) => (
                    <div key={d.id} className="row-between wrap settings-int">
                      <div className="grow"><strong className="small">{bi(d.title)}</strong> <span className="xs mono muted">v{d.version}</span><div className="xs muted">{d.kind} · {t('admin.settings.legal.effective', { date: formatDate(d.effective_from, lang) })}{d.requires_acceptance ? ` · ${t('admin.settings.legal.requiresAcceptance')}` : ''}</div></div>
                      <div className="row"><Badge tone={d.status === 'published' ? 'success' : 'warn'}>{t(`admin.settings.legal.${d.status}`)}</Badge><Toggle size="sm" checked={d.status === 'published'} disabled={!canLegal} label={t('admin.settings.legal.publish')} onChange={(on) => toggleLegal(d, on)} /><Link to={`/site/legal/${d.kind}`} className="xs">{t('admin.settings.legal.view')} →</Link></div>
                    </div>
                  ))}
                </div>
                <p className="xs muted" style={{ marginTop: 'var(--sp-md)' }}>{t('admin.settings.legal.note')}</p>
              </Card>
            </>
          )}

          {group === 'branding' && S('branding', t('admin.settings.sec.branding'), (d, set) => (
            <>
              <div className="grid grid-2">
                <Field label={t('admin.settings.f.displayName')} hint={t('admin.settings.f.displayName.hint')}>{(id) => <Input id={id} value={d.displayName} disabled={!canWrite} onChange={(e) => set({ ...d, displayName: e.target.value })} placeholder={tenant.name} />}</Field>
                <Field label={t('admin.settings.f.wordmark')}>{(id) => <Select id={id} value={d.wordmarkVariant} disabled={!canWrite} onChange={(e) => set({ ...d, wordmarkVariant: e.target.value as StudioSettings['branding']['wordmarkVariant'] })}>{(['auto', 'blue', 'cream', 'yellow'] as const).map((v) => <option key={v} value={v}>{t(`admin.settings.f.wordmark.${v}`)}</option>)}</Select>}</Field>
                <Field label={t('admin.settings.f.defaultLang')} hint={t('admin.settings.f.defaultLang.hint')}>{(id) => <Select id={id} value={d.defaultLang} disabled={!canWrite} onChange={(e) => set({ ...d, defaultLang: e.target.value as StudioSettings['branding']['defaultLang'] })}><option value="es">Español</option><option value="en">English</option></Select>}</Field>
              </div>
              <div className="settings-brand">
                <span className="eyebrow">{t('admin.settings.f.preview')}</span>
                <Wordmark height={30} variant={d.wordmarkVariant} />
                <span className="small muted">{d.displayName || tenant.name} · {d.defaultLang === 'en' ? 'English' : 'Español'} ({lang})</span>
              </div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section<K extends SettingsSection>({ section, value, save, audit, readOnly, title, icon, render, valid }: { section: K; icon: IconName; value: StudioSettings[K]; save: (s: K, v: StudioSettings[K]) => Promise<{ before: unknown; after: unknown }>; audit: (a: string, e: string, id?: string | null, d?: Record<string, unknown>) => Promise<unknown>; readOnly: boolean; title: string; render: (d: StudioSettings[K], set: (v: StudioSettings[K]) => void) => ReactNode; valid?: (d: StudioSettings[K]) => boolean }) {
  const { t } = useI18n();
  const [d, setD] = useState(value);
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  useEffect(() => setD(value), [value]);
  const dirty = JSON.stringify(d) !== JSON.stringify(value);
  const doSave = async () => {
    setState('saving');
    const { before, after } = await save(section, d);
    await audit('settings.update', 'tenants', tenant.id, { section, before, after });
    setState('saved'); setTimeout(() => setState('idle'), 2000);
  };
  return (
    <Card title={title} icon={icon} actions={!readOnly && <div className="row"><span className="xs muted">{state === 'saved' ? t('admin.settings.saved') : dirty ? t('admin.settings.unsaved') : ''}</span><Button size="sm" disabled={!dirty || (valid ? !valid(d) : false)} loading={state === 'saving'} onClick={doSave}>{t('core.common.save')}</Button></div>}>
      <div className="stack">{render(d, setD)}</div>
    </Card>
  );
}

/**
 * M-08a WebMCP (0041): `settings.hours.update` changes one weekday and saves the section exactly as the card's
 * Save button does (same validation, same `settings.update` audit row). Mounted only on the General group.
 */
function GeneralActions() {
  const { can } = useSession();
  const data = useData();
  const audit = useAudit('admin');
  const impl = useMemo<Record<string, ActionHandler>>(() => ({
    'settings.hours.update': async (p) => {
      if (!can('settings.write')) throw new Error('settings.write required');
      const day = need(p, 'day');
      if (!DAYS.includes(day)) throw new Error('day must be 0–6 (0 = Sunday)');
      const open = need(p, 'open');
      // Read the stored row, not the rendered settings, so two quick calls (an agent) do not overwrite each other.
      const row = await data.get<TenantRow>('tenants', tenant.id);
      if (!row) throw new Error('tenant row not found');
      const before = { ...tenant.openingHours, ...(row.settings?.openingHours ?? {}) };
      const next: StudioSettings['openingHours'] = { ...before };
      if (open === 'closed') next[day] = null;
      else {
        const v = { open, close: need(p, 'close') };
        if (!validDay(v)) throw new Error('times must be HH:MM with close after open');
        next[day] = v;
      }
      await data.update<TenantRow>('tenants', row.id, { settings: { ...(row.settings ?? {}), openingHours: next } });
      await audit('settings.update', 'tenants', tenant.id, { section: 'openingHours', before, after: next, via: 'action' });
      return `day ${day}: ${next[day] ? `${next[day]!.open}–${next[day]!.close}` : 'closed'}`;
    },
    // 0047: one contact row, merged field by field, saved exactly as the card does (same section, same audit row).
    'settings.contacts.update': async (p) => {
      if (!can('settings.write')) throw new Error('settings.write required');
      const intent = need(p, 'intent') as ContactIntent;
      if (!CONTACT_INTENTS.includes(intent)) throw new Error(`intent must be one of ${CONTACT_INTENTS.join(', ')}`);
      const row = await data.get<TenantRow>('tenants', tenant.id);
      if (!row) throw new Error('tenant row not found');
      const stored = mergeContacts(row.settings?.contacts);
      const before = stored[intent];
      const after: ContactRoute = { ...before };
      if (p?.name !== undefined) after.name = p.name.trim();
      if (p?.whatsapp !== undefined) { const v = p.whatsapp.trim(); if (v && !isPhone(v)) throw new Error('whatsapp needs at least 10 digits with the country code'); after.whatsapp = v; }
      if (p?.role !== undefined) { const r = p.role.trim(); if (r && !(ROLES as readonly string[]).includes(r)) throw new Error(`role must be one of ${ROLES.join(', ')}`); after.role = (r || undefined) as Role | undefined; }
      if (p?.hours !== undefined) { const h = p.hours.trim() as ContactHours; if (!CONTACT_HOURS.includes(h)) throw new Error(`hours must be one of ${CONTACT_HOURS.join(', ')}`); after.hours = h; }
      // Store the whole table (defaults filled in), so the saved shape matches what the card writes.
      const contacts = { ...stored, [intent]: after };
      await data.update<TenantRow>('tenants', row.id, { settings: { ...(row.settings ?? {}), contacts } });
      await audit('settings.update', 'tenants', tenant.id, { section: 'contacts', intent, before, after, via: 'action' });
      return `${intent}: ${after.whatsapp || 'front desk (fallback)'} · ${after.hours}`;
    },
  }), [can, data, audit]);
  useActions(M08a, impl);
  return null;
}
