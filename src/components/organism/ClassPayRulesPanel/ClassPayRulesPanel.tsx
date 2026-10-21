import { useRef, useState } from 'react';
import { useData, useTable } from '../../../data/DataContext';
import { useSession } from '../../../auth/SessionProvider';
import { useI18n } from '../../../i18n/I18nProvider';
import { dateKey } from '../../../i18n/format';
import { canManageClassPay, quoteClassPay, resolveClassPayRule, validateClassPayRule, type AttendanceBasis, type AttendanceCounts, type ClassPayRuleRow, type PayMode } from '../../../data/classPayRules';
import { Card } from '../../molecule/Card/Card';
import { Field } from '../../molecule/Field/Field';
import { Input, Select } from '../../atom/Input/Input';
import { Button } from '../../atom/Button/Button';
import { Badge } from '../../atom/Badge/Badge';

export interface ClassPayRulesPanelProps { templateId?: string | null; sessionId?: string | null; sessionDate?: string; attendeeCounts?: AttendanceCounts }
/** Guard outside the data-reading child: other roles neither query nor render private compensation. */
export function ClassPayRulesPanel(props: ClassPayRulesPanelProps) {
 const { role } = useSession();
 if (!canManageClassPay(role)) return null;
 return <PayEditor key={props.sessionId || props.templateId} {...props} />;
}
function PayEditor({ templateId, sessionId, sessionDate, attendeeCounts }: ClassPayRulesPanelProps) {
 const { t, lang } = useI18n(), { user, role } = useSession();
 const data = useData();
 const { rows } = useTable<ClassPayRuleRow>('class_pay_rules');
 const today = dateKey(), onDate = sessionDate ? (/^\d{4}-\d{2}-\d{2}$/.test(sessionDate) ? sessionDate : dateKey(new Date(sessionDate))) : today;
 const scope = { templateId, sessionId };
 const current = resolveClassPayRule(rows, scope, onDate);
 const quote = quoteClassPay(rows, scope, onDate, attendeeCounts);
 const [mode, setMode] = useState<PayMode>('flat');
 const [effective, setEffective] = useState(onDate >= today ? onDate : today);
 const [flat, setFlat] = useState(current?.mode === 'flat' ? String(current.flat_amount ?? '') : '');
 const [base, setBase] = useState(''), [rate, setRate] = useState('');
 const [basis, setBasis] = useState<AttendanceBasis | ''>('');
 const pending = useRef<{ key: string; requestId: string } | null>(null);
 const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
 const parse = (value: string) => value.trim() === '' ? null : Number(value);
 const ownRules = rows.filter(rule => sessionId ? rule.session_id === sessionId : !rule.session_id && rule.template_id === templateId).sort((a, b) => b.created_at.localeCompare(a.created_at));
 const draft = { template_id: sessionId ? null : templateId ?? null, session_id: sessionId ?? null, effective_from: effective, mode, flat_amount: mode === 'flat' ? parse(flat) : null, base_amount: mode === 'attendance' ? parse(base) : null, per_attendee: mode === 'attendance' ? parse(rate) : null, attendance_basis: mode === 'attendance' && basis ? basis : null };
 const valid = validateClassPayRule(draft) && effective >= today && (!sessionId || onDate >= today);
 const money = (amount: number) => new Intl.NumberFormat(lang === 'es' ? 'es-CO' : 'en-US', { maximumFractionDigits: 0 }).format(amount);
 const save = async () => {
  if (!valid || busy || !canManageClassPay(role)) return;
  setBusy(true); setMessage('');
  try {
   if (!data.appendClassPayRule) throw new Error('not_connected');
   const key = JSON.stringify(draft);
   if (pending.current?.key !== key) pending.current = { key, requestId: crypto.randomUUID() };
   await data.appendClassPayRule({ requestId: pending.current.requestId, role, actorId: user.id, rule: draft });
   pending.current = null; setMessage('classPay.saved');
  }
  catch { setMessage('classPay.error'); } finally { setBusy(false); }
 };
 return <Card title={t('classPay.title')}><div className="stack">
  <p className="small muted">{t('classPay.demo')}</p>
  <div role="status">{quote.configured ? <strong>{t('classPay.preview', { amount: money(quote.amountCOP!) })}</strong> : <p>{t(quote.ruleId ? 'classPay.missingCounts' : 'classPay.unconfigured')}</p>}{quote.ruleId && <Badge>{t(`classPay.source.${quote.source}`)}</Badge>}</div>
  <p className="small muted">{t('classPay.prospective')}</p>
  <Field label={t('classPay.date')}>{id => <Input id={id} type="date" min={today} value={effective} disabled={busy} onChange={e => setEffective(e.target.value)} />}</Field>
  <Field label={t('classPay.mode')}>{id => <Select id={id} value={mode} disabled={busy} onChange={e => { setMode(e.target.value as PayMode); setMessage(''); }}><option value="flat">{t('classPay.flat')}</option><option value="attendance">{t('classPay.attendance')}</option></Select>}</Field>
  {mode === 'flat' ? <Field label={t('classPay.amount')}>{id => <Input id={id} type="number" min="0" step="1" value={flat} disabled={busy} onChange={e => setFlat(e.target.value)} />}</Field> : <>
   <p className="small muted">{t('classPay.formula')}</p>
   <Field label={t('classPay.base')}>{id => <Input id={id} type="number" min="0" step="1" value={base} disabled={busy} onChange={e => setBase(e.target.value)} />}</Field>
   <Field label={t('classPay.perPerson')}>{id => <Input id={id} type="number" min="0" step="1" value={rate} disabled={busy} onChange={e => setRate(e.target.value)} />}</Field>
   <Field label={t('classPay.basis')}>{id => <Select id={id} value={basis} disabled={busy} onChange={e => setBasis(e.target.value as AttendanceBasis | '')}><option value="">{t('classPay.choose')}</option><option value="checked_in">{t('classPay.checked_in')}</option><option value="booked">{t('classPay.booked')}</option></Select>}</Field>
  </>}
  <Button disabled={!valid || busy || !data.appendClassPayRule} loading={busy} onClick={save}>{t('classPay.save')}</Button>
  {message && <p role="status">{t(message)}</p>}
  <details><summary>{t('classPay.history')} · {ownRules.length}</summary>{ownRules.length ? <ul>{ownRules.map(rule => <li key={rule.id}>{rule.effective_from} · {t(`classPay.${rule.mode}`)}{rule.mode === 'flat' ? ` · COP ${money(rule.flat_amount!)}` : ` · COP ${money(rule.base_amount!)} + COP ${money(rule.per_attendee!)} × ${t(`classPay.${rule.attendance_basis}`)}`}</li>)}</ul> : <p>{t('classPay.emptyHistory')}</p>}</details>
 </div></Card>;
}
