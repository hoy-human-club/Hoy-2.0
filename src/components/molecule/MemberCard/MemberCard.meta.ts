import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { MemberCard } from './MemberCard';

export default defineMeta({
  tier: 'molecule', name: 'MemberCard',
  description: { es: 'La tarjeta de miembro del club (Pulso Luxe): tinta profunda con doble filo amarillo sol, el logotipo, el nombre y desde cuándo es miembro.', en: 'The club member card (Pulso Luxe): deep ink with a fine sun-yellow double edge, the wordmark, the name and the member-since line.' },
  props: [
    { name: 'name', type: 'string', required: true, description: { es: 'Nombre completo del perfil.', en: 'Full name from the profile.' } },
    { name: 'since', type: 'string', description: { es: 'Segunda línea: "Desde octubre de 2026".', en: 'Second line: "Since October 2026".' } },
    { name: 'caption', type: '[string, string]', required: true, description: { es: 'Las dos líneas de la esquina: club y ciudad.', en: 'The two corner lines: club and city.' } },
    { name: 'label', type: 'string', required: true, description: { es: 'Nombre accesible de la tarjeta.', en: 'Accessible name of the card.' } },
  ],
  states: ['default', 'without since line', 'long name (wraps)', 'reduced motion (rings still)'],
  usages: [{ title: { es: 'Tarjeta de miembro', en: 'Member card' }, render: () => h('div', { style: { maxWidth: 380 } }, h(MemberCard, { name: 'Juliana Ospina', since: 'Desde octubre de 2026', caption: ['Human club', 'Medellín'], label: 'Tarjeta de miembro de Juliana Ospina' })) }],
  a11y: [{ es: 'Región con nombre accesible; el texto crema mantiene ≥ 7:1 sobre la tinta en ambos temas; los anillos son decorativos y quietos con movimiento reducido.', en: 'Named region; the cream text holds ≥ 7:1 on the ink in both themes; the rings are decorative and still under reduced motion.' }],
  usedBy: ['C-28'],
});
