import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { LaunchPaymentReceipt } from './LaunchPaymentReceipt';
import type { PaymentRow } from '../../../data/schema';
import { receiptReference } from '../../../data/launchReceipts';
import { tenant } from '../../../tenant/tenant';
const payment: PaymentRow = { id: 'fictional-receipt', tenant_id: tenant.id, user_id: 'fictional-person', plan_id: null, amount: 35000, amount_paid: 35000, currency: 'COP', method: 'cash', provider: 'manual', paid_at: '2026-10-23T12:00:00Z', taken_by: null, status: 'approved', note: null, created_at: '2026-10-23T12:00:00Z', updated_at: '2026-10-23T12:00:00Z' };
payment.frontend_receipt = { version: 1, kind: 'fictional-payment-receipt', reference: receiptReference(payment.id), source: 'desk-sale', facts: { paymentId: payment.id, tenantId: tenant.id, customerId: payment.user_id, planId: null, amountCharged: 35000, amountReceived: 35000, currency: 'COP', method: 'cash', provider: 'manual', confirmedAt: payment.paid_at, recordedBy: null, quote: null }, item: { es: 'Clase ficticia', en: 'Fictional class' }, recordedTax: null, previewChannels: ['email'], delivery: 'preview-only' };
export default defineMeta({
 tier: 'organism', name: 'LaunchPaymentReceipt',
 description: { es: 'Recibo demo guardado; nunca factura ni confirmación de email.', en: 'Saved demo receipt; never an invoice or email confirmation.' },
 props: [{ name: 'payment / customer / historicalReference', type: 'PaymentRow / string / string?', description: { es: 'Pago propio y referencia histórica opcional.', en: 'Owned payment and optional historical reference.' } }],
 states: ['saved receipt', 'pending', 'missing or inconsistent receipt', 'historical reference retained'],
 usages: [{ title: { es: 'Recibo guardado / incoherente', en: 'Saved / inconsistent receipt' }, render: () => h('div', { className: 'stack' }, h(LaunchPaymentReceipt, { payment, customer: 'Fictional / Ficticio' }), h(LaunchPaymentReceipt, { payment: { ...payment, amount_paid: 1 }, customer: 'Fictional / Ficticio' })) }, { title: { es: 'Pendiente / histórico sin recibo', en: 'Pending / historical without receipt' }, render: () => h('div', { className: 'stack' }, ...['pending', 'approved'].map(status => h(LaunchPaymentReceipt, { payment: { id: 'fictional-receipt', tenant_id: tenant.id, status } as PaymentRow, customer: 'Fictional / Ficticio', historicalReference: status === 'approved' ? 'HISTORICAL-DEMO' : undefined }))) }],
 a11y: [{ es: 'Texto explícito y tabla semántica; no depende solo del color.', en: 'Explicit text and semantic table; never color alone.' }],
 usedBy: ['C-11', 'S-04', 'S-09'],
});
