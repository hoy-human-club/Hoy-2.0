import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Receipt } from './Receipt';

export default defineMeta({
  tier: 'organism', name: 'Receipt',
  description: { es: 'Recibo de mostrador imprimible: estudio, número, líneas, IVA, total, método y la casilla de referencia DIAN.', en: 'Printable counter receipt: studio, number, lines, IVA, total, method and the DIAN reference slot.' },
  props: [
    { name: 'number / issuedAt / customer', type: 'string', required: true, description: { es: 'Cabecera.', en: 'Header.' } },
    { name: 'lines', type: '{ label, amount }[]', required: true, description: { es: 'Productos.', en: 'Products.' } },
    { name: 'subtotal / tax / total', type: 'number', required: true, description: { es: 'Importes en COP calculados fuera (config de IVA).', en: 'COP amounts computed outside (IVA config).' } },
    { name: 'method / status / takenBy', type: 'string', description: { es: 'Cómo se cobró y quién.', en: 'How it was charged and by whom.' } },
    { name: 'dianRef', type: 'string | null', description: { es: 'CUFE cuando exista la factura electrónica.', en: 'CUFE once the e-invoice exists.' } },
    { name: 'printLabel', type: 'string', description: { es: 'Con valor, muestra el botón Imprimir.', en: 'When set, shows the Print button.' } },
  ],
  states: ['payment-preview (no invoice / no email)', 'approved', 'pending', 'with-dian', 'print'],
  usages: [{ title: { es: 'Recibo demo sin factura', en: 'Demo receipt without invoice' }, render: () => h(Receipt, { documentMode: 'payment-preview', studio: 'Fictional studio', number: 'DEMO-RECEIPT-example', issuedAt: '2026-10-23T12:00:00Z', customer: 'Fictional / Ficticio', lines: [{ label: 'Clase / Class', amount: 35000 }], subtotal: 35000, tax: 0, taxLabel: '', showTaxBreakdown: false, total: 35000, method: 'Efectivo / Cash' }) }, { title: { es: 'Clase de prueba en efectivo', en: 'Trial class, cash' }, render: () => h(Receipt, { studio: 'HOY Wellness Center', number: 'HOY-1031', issuedAt: new Date().toISOString(), customer: 'Valentina Ruiz', contact: '+57 300 ··· 1122', lines: [{ label: 'Clase de Prueba', amount: 39000 }], subtotal: 32773, tax: 6227, taxLabel: 'IVA 19% (incluido)', total: 39000, method: 'Efectivo', status: 'approved', takenBy: 'Camilo Duque · recepción', dianRef: null, note: 'Check-in: Fuego 17:30', printLabel: 'Imprimir' }) }],
  a11y: [{ es: 'Tabla semántica; en impresión solo el recibo es visible.', en: 'Semantic table; only the receipt is visible when printing.' }],
  usedBy: ['S-04', 'M-09', 'C-11', 'S-09'],
});
