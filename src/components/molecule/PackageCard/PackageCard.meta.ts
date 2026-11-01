import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { PackageCard } from './PackageCard';
import { studioPhotoProps } from '../../../modules/website/photography';
import { priceItem } from '../../../tenant/pricing';

const rules = ['12 clases en cualquiera de las siete metodologías', 'Para usar en 3 meses', 'Lo puedes congelar una vez, hasta 30 días', 'No es reembolsable'];

export default defineMeta({
  tier: 'molecule', name: 'PackageCard',
  description: {
    es: 'El paquete de 12 clases como tarjeta táctil: el objeto (wordmark, nombre, "12") en el tono de la clase, el precio, las reglas y la llamada a la acción. Reemplaza a MembershipCard (0051: no hay membresías en el lanzamiento).',
    en: 'The 12-class package as a tactile card: the object (wordmark, name, "12") in a class tone, the price, the rules and the call to action. Replaces MembershipCard (0051: no memberships at launch).',
  },
  props: [
    { name: 'item', type: 'PriceItem', required: true, description: { es: 'De src/tenant/pricing.ts.', en: 'From src/tenant/pricing.ts.' } },
    { name: 'index / total', type: 'number', required: true, description: { es: '"01 / 02" en el objeto.', en: '"01 / 02" on the object.' } },
    { name: 'tone', type: 'Tone', required: true, description: { es: 'Tono D-01 del objeto.', en: 'D-01 tone of the object.' } },
    { name: 'eyebrow / objectLabel', type: 'string', required: true, description: { es: 'Línea superior y etiqueta del objeto.', en: 'Top line and object label.' } },
    { name: 'benefits', type: 'string[]', required: true, description: { es: 'Las reglas del paquete (vigencia, congelar, reembolso).', en: 'The package rules (validity, freeze, refund).' } },
    { name: 'photo', type: 'image source / responsive sources', description: { es: 'Fondo decorativo opcional al 20%; no cambia texto, precios ni reglas.', en: 'Optional decorative background at 20%; does not change text, prices or rules.' } },
    { name: 'ctaLabel / onSelect', type: 'string / () => void', required: true, description: { es: 'Botón de compra.', en: 'Buy button.' } },
  ],
  states: ['default', 'with decorative photo (20%)', 'with badge (Santa María)', 'hover', 'focus'],
  usages: [
    { title: { es: 'Paquete de 12 clases', en: '12-class package' }, render: () => h(PackageCard, { item: priceItem('pack12')!, photo: studioPhotoProps('pricing-duo'), index: 1, total: 2, tone: 'river', eyebrow: 'Para todos', objectLabel: 'Paquete', benefits: rules, ctaLabel: 'Elegir paquete', onSelect: () => {} }) },
    { title: { es: 'Afiliados Santa María', en: 'Santa María affiliates' }, render: () => h(PackageCard, { item: priceItem('pack12_smtc')!, index: 2, total: 2, tone: 'moss', eyebrow: 'Afiliados de Santa María Tennis Club', objectLabel: 'Paquete', benefits: [...rules, 'Solo para afiliados de Santa María Tennis Club'], ctaLabel: 'Elegir paquete', onSelect: () => {} }) },
  ],
  a11y: [{ es: 'Precio, clases y reglas en texto; el objeto es decorativo (aria-hidden).', en: 'Price, classes and rules in text; the object is decorative (aria-hidden).' }],
  usedBy: ['P-01'],
});
