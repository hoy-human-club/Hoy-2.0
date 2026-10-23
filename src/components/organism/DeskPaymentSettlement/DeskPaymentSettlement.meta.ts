import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { DeskPaymentSettlement } from './DeskPaymentSettlement';
import type { PaymentRow } from '../../../data/schema';
import { tenant } from '../../../tenant/tenant';
const historical: PaymentRow = { id: 'fictional-unverified-desk', tenant_id: tenant.id, created_at: '', updated_at: '', user_id: 'fictional', plan_id: null, amount: 1, currency: 'COP', method: 'cash', provider: 'manual', status: 'pending', amount_paid: null, paid_at: null, note: null };
// D-02 fixture only: no matching persisted payment, so confirming can only demonstrate a contained error.
const preview: PaymentRow = { ...historical, id: 'fictional-library-only', plan_id: 'plan_single', frontend_quote: {
  snapshotVersion: 1, tenantId: tenant.id, itemId: 'single', productId: 'plan_single', planId: 'plan_single', code: 'FICTIONAL', name: { es: 'Ejemplo ficticio', en: 'Fictional example' },
  amount: 1, currency: 'COP', purchaseDate: '2026-10-23', classes: 1, validityDays: null, catalogRevision: 0, priceId: 'fictional', source: 'legacy_demo', kind: 'class', sourceKey: 'fictional-library-only', quantity: 1, chargedAmount: 1, fallbackValidityDays: null, entitlementExpiresAt: '2099-01-01',
} };
export default defineMeta({ tier: 'organism', name: 'DeskPaymentSettlement', description: { es: 'Confirmación local de una solicitud de recepción con términos retenidos.', en: 'Local settlement of a front-desk request with retained terms.' }, props: [
  { name: 'payment', type: 'PaymentRow', required: true, description: { es: 'Solicitud demo sin comprobante; no infiere términos anteriores.', en: 'Receipt-free demo request; never infers historical terms.' } },
  { name: 'onSettled', type: '(payment: PaymentRow) => void', required: true, description: { es: 'Resultado confirmado localmente.', en: 'Locally confirmed outcome.' } },
], states: ['unavailable / missing retained terms', 'empty fields', 'amount mismatch', 'ready', 'saving / duplicate click blocked', 'atomic error / retry', 'context cancelled', 'confirmed callback'], usages: [
  { title: { es: 'Campos vacíos, validación, listo y error recuperable', en: 'Empty fields, validation, ready and recoverable error' }, render: () => h(DeskPaymentSettlement, { payment: preview, onSettled: () => {} }) },
  { title: { es: 'Histórico sin términos verificados', en: 'History without verified terms' }, render: () => h(DeskPaymentSettlement, { payment: historical, onSettled: () => {} }) },
], a11y: [{ es: 'Campos etiquetados, aviso de error y confirmación bloqueada hasta completar la revisión.', en: 'Labeled inputs, announced error and confirmation blocked until review is complete.' }], usedBy: ['S-09'] });
