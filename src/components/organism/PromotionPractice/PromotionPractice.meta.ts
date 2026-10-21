import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { PromotionPractice } from './PromotionPractice';

export default defineMeta({
  tier: 'organism', name: 'PromotionPractice',
  description: { es: 'Recorrido educativo y reiniciable de una oferta aprobada, compartir, activar y reservar, verificar un código ficticio y hacer check-in. Solo estado local de React; no modifica datos ni sesión.', en: 'A resettable learning journey through an approved offer, sharing, claim and booking, fictional-code verification and check-in. React local state only; no data or session changes.' },
  props: [],
  states: ['approved example / initial', 'shared', 'claimed and booked', 'verification error', 'verified', 'check-in complete', 'disabled / prerequisites', 'reset', 'keyboard focus / hover', 'ES / EN'],
  usages: [{ title: { es: 'Completar y reiniciar la práctica', en: 'Complete and restart the practice' }, render: () => h(PromotionPractice) }],
  a11y: [
    { es: 'Tres pasos en una lista ordenada; estados expresados con texto además de color.', en: 'Three steps in an ordered list; states use text as well as colour.' },
    { es: 'Campo con etiqueta, ayuda y error vinculados; la verificación funciona con Enter.', en: 'Input has linked label, help and error; verification supports Enter.' },
    { es: 'Botones nativos, requisitos explícitos, resultados anunciados y objetivos de al menos 44 px.', en: 'Native buttons, explicit prerequisites, announced results and targets at least 44 px.' },
  ],
  usedBy: ['P-02'],
});
