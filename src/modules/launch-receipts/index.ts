import type { RouteDef } from '../../specs/types';
import type { StringTable } from '../../i18n/types';
export const routes: RouteDef[] = [];
export const strings: StringTable = {
 'launchReceipt.title': { es: 'Vista previa del recibo', en: 'Receipt preview' },
 'launchReceipt.mock': { es: 'Demostración local con datos ficticios. No procesa pagos reales.', en: 'Local demonstration with fictional data. Does not process real payments.' },
 'launchReceipt.boundary': { es: 'Recibo de pago demo. No se emitió factura ni se envió email.', en: 'Demo payment receipt. No invoice was issued and no email was sent.' },
 'launchReceipt.reference': { es: 'Referencia del pago', en: 'Payment reference' },
 'launchReceipt.unknown': { es: 'No hay una vista previa guardada y verificable para este pago.', en: 'There is no saved, verifiable receipt preview for this payment.' },
 'launchReceipt.pending': { es: 'Este pago aún no está confirmado. No se generó un recibo.', en: 'This payment is not confirmed. No receipt was created.' },
 'launchReceipt.legacy': { es: 'Referencia histórica conservada', en: 'Preserved historical reference' },
 'launchReceipt.item': { es: 'Pago registrado', en: 'Recorded payment' },
 'launchReceipt.received': { es: 'Importe recibido registrado', en: 'Recorded amount received' },
 'launchReceipt.tax': { es: 'Impuesto registrado en la demo', en: 'Tax recorded in the demo' },
 'launchReceipt.approved': { es: 'Pago confirmado en la demo', en: 'Payment confirmed in the demo' },
 'launchReceipt.email': { es: 'Vista previa de email', en: 'Email preview' },
 'launchReceipt.whatsapp': { es: 'Vista previa de WhatsApp', en: 'WhatsApp preview' },
 'launchReceipt.print': { es: 'Imprimir vista previa', en: 'Print preview' },
 'launchReceipt.checkoutNote': { es: 'Al confirmar se guarda un recibo demo. No se emite factura ni se envía email.', en: 'Confirmation saves a demo receipt. No invoice is issued and no email is sent.' },
 'launchReceipt.readError': { es: 'No pudimos cargar los pagos. Reintenta.', en: 'We could not load payments. Please retry.' },
 'launchReceipt.retry': { es: 'Reintentar', en: 'Retry' },
};
