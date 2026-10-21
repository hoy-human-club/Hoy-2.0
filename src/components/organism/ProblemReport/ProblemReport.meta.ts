import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ProblemReport } from './ProblemReport';
export default defineMeta({
  tier: 'organism', name: 'ProblemReport',
  description: { es: 'Borrador local de problema con pantalla, actor y rol de demostración; no envía reportes.', en: 'Local problem draft with screen, demo actor and effective role; no report dispatch.' },
  props: [],
  states: ['closed', 'edit', 'required validation', 'preview', 'local save', 'storage failure', 'retry', 'saved once', 'cancel without saving', 'reload local draft'],
  usages: [{ title: { es: 'Borrador local interactivo', en: 'Interactive local draft' }, render: () => h(ProblemReport) }],
  a11y: [{ es: 'Drawer con foco atrapado; etiquetas y errores, foco en el primer campo inválido. Escape cierra sin guardar.', en: 'Focus-trapped Drawer; labelled fields and errors, first invalid field receives focus. Escape closes without saving.' }],
  usedBy: ['HUB-01'],
});
