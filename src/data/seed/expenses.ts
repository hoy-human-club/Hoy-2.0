/**
 * M-09c — the studio's own costs, seeded so Finance opens with a balance instead of an empty ledger.
 *
 * Six recurring templates a small Medellín studio actually pays (rent, EPM utilities, internet,
 * cleaning by the quincena, software, insurance) and, from them, every fixed expense of the last
 * three months through the same `fixedExpensesFor()` M-09c's generator calls. Variable expenses are
 * scattered over the last 90 days with the seed's RNG. Everything up to a few days ago is paid; the
 * rest is still to pay, so the paid / unpaid split on the page is real data.
 */
import type { ExpenseRow, ExpenseTemplateRow } from '../schema';
import { fixedExpensesFor } from '../expenseCalc';
import { monthPeriod } from '../payrollCalc';
import { base, NOW } from './catalog';
import type { rng } from './rng';
import { fromDateKey, dateKey, MS, studioParts, studioDate } from '../../i18n/format';

type Rng = ReturnType<typeof rng>;

export const expenseTemplates: ExpenseTemplateRow[] = [
  { ...base('xpt_rent', 200), concept: 'Arriendo del local', category: 'rent', amount: 4800000, cadence: 'monthly', anchor_day: 1, vendor: 'Inmobiliaria Laureles', active: true, note: 'Contrato a 36 meses; incremento IPC cada enero.' },
  { ...base('xpt_utilities', 200), concept: 'Servicios públicos (energía, agua, gas)', category: 'utilities', amount: 1150000, cadence: 'monthly', anchor_day: 12, vendor: 'EPM', active: true, note: 'La sala caliente pesa en la factura de energía; revisar contra el consumo del mes.' },
  { ...base('xpt_internet', 200), concept: 'Internet y telefonía', category: 'internet', amount: 189900, cadence: 'monthly', anchor_day: 20, vendor: 'Tigo', active: true, note: null },
  { ...base('xpt_cleaning', 200), concept: 'Aseo y lavandería (quincena)', category: 'cleaning', amount: 700000, cadence: 'biweekly', anchor_day: 15, vendor: 'Servicios de aseo Clara Ruiz', active: true, note: 'Se paga por quincena: el 15 y el último día del mes.' },
  { ...base('xpt_software', 200), concept: 'Software y suscripciones', category: 'software', amount: 240000, cadence: 'monthly', anchor_day: 5, vendor: 'Varios (música, videollamadas, hosting)', active: true, note: null },
  { ...base('xpt_insurance', 200), concept: 'Póliza de responsabilidad civil', category: 'insurance', amount: 380000, cadence: 'monthly', anchor_day: 8, vendor: 'Seguros Bolívar', active: true, note: 'Cubre lesiones de asistentes dentro del estudio.' },
];

const VARIABLE: [daysAgo: number, concept: string, category: ExpenseRow['category'], amount: number, method: ExpenseRow['method'], vendor: string | null][] = [
  [84, 'Reposición de 6 mats y bloques', 'supplies', 720000, 'card', 'Yoga Shop Medellín'],
  [79, 'Mantenimiento de los calentadores de la sala', 'maintenance', 450000, 'transfer', 'Técnico Hernán Ospina'],
  [72, 'Toallas para duchas y vestieres (30 unidades)', 'supplies', 390000, 'card', 'Textiles La Ceja'],
  [66, 'Pauta en Instagram · campaña Bienvenida', 'marketing', 300000, 'card', 'Meta Ads'],
  [60, 'Honorarios contabilidad (mes)', 'fees', 650000, 'transfer', 'Contadora Luz Marina Ríos'],
  [53, 'Velas, incienso y aceites para Yin', 'supplies', 128000, 'cash', null],
  [47, 'Reparación de la puerta del vestier', 'maintenance', 210000, 'cash', 'Cerrajería El Poblado'],
  [41, 'Agua y fruta para el evento Luna llena', 'supplies', 165000, 'cash', null],
  [34, 'Sesión de fotos · retratos de profesores', 'marketing', 900000, 'transfer', 'Fotógrafa Ana Cardona'],
  [30, 'Honorarios contabilidad (mes)', 'fees', 650000, 'transfer', 'Contadora Luz Marina Ríos'],
  [23, 'Recarga de extintores y señalización', 'maintenance', 180000, 'transfer', 'Extintores del Valle'],
  [17, 'Papelería, recibos y tinta de recepción', 'supplies', 96000, 'cash', null],
  [11, 'Comisiones Wompi del mes', 'fees', 312000, 'transfer', 'Wompi'],
  [6, 'Pauta en Instagram · Pausas', 'marketing', 250000, 'card', 'Meta Ads'],
  [2, 'Bombillos LED y limpieza de filtros', 'maintenance', 142000, 'cash', null],
];

/** Fixed expenses for the last three calendar months (incl. the current one) plus the variable list. */
export function buildExpenses(r: Rng): ExpenseRow[] {
  const out: ExpenseRow[] = [];
  const today = dateKey(NOW);
  const paidCutoff = dateKey(new Date(NOW.getTime() - 3 * MS.day));
  const METHOD_BY_CATEGORY: Partial<Record<ExpenseRow['category'], ExpenseRow['method']>> = { rent: 'transfer', utilities: 'transfer', internet: 'card', cleaning: 'transfer', software: 'card', insurance: 'transfer' };

  for (const offset of [2, 1, 0]) {
    const period = monthPeriod(studioDate(studioParts(NOW).year, studioParts(NOW).month - offset, 15));
    const { drafts } = fixedExpensesFor(period, expenseTemplates, out);
    for (const d of drafts) {
      // Everything due more than three days ago is paid, on the due day or up to two days later.
      const paid = d.incurred_on <= paidCutoff;
      const paidOn = paid ? dateKey(new Date(fromDateKey(d.incurred_on).getTime() + r.int(0, 2) * MS.day)) : null;
      const ageDays = Math.max(0, Math.round((NOW.getTime() - fromDateKey(d.incurred_on).getTime()) / MS.day));
      out.push({ ...base(`xp_${d.template_id.slice(4)}_${d.incurred_on}`, Math.min(ageDays + 3, 95)), ...d, paid_on: paidOn && paidOn <= today ? paidOn : null, method: METHOD_BY_CATEGORY[d.category] ?? 'transfer', note: null, created_by: 'usr_fin' });
    }
  }

  VARIABLE.forEach(([daysAgo, concept, category, amount, method, vendor], i) => {
    const day = dateKey(new Date(NOW.getTime() - daysAgo * MS.day));
    // Variable costs are usually paid on the spot; a transfer may wait a couple of days, and the two most recent are still open.
    const paidOn = daysAgo <= 6 && method === 'transfer' ? null : method === 'transfer' && r.chance(0.5) ? dateKey(new Date(NOW.getTime() - (daysAgo - r.int(1, 2)) * MS.day)) : day;
    out.push({ ...base(`xpv_${i}`, daysAgo), kind: 'variable', category, concept, amount, incurred_on: day, paid_on: paidOn && paidOn <= today ? paidOn : null, method, vendor, note: null, template_id: null, created_by: i % 3 === 0 ? 'usr_super' : 'usr_fin' });
  });

  return out.sort((a, b) => b.incurred_on.localeCompare(a.incurred_on));
}
