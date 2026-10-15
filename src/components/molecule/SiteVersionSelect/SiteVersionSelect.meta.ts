import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { SiteVersionSelect } from './SiteVersionSelect';
export default defineMeta({
  tier: 'molecule', name: 'SiteVersionSelect', description: { es: 'Elige Latest o la vista previa animada archivada; conserva la ruta cuando es compatible.', en: 'Choose Latest or the archived animated preview; preserves compatible routes.' },
  props: [{ name: 'value', type: "'latest' | 'archive' | 'classic' | 'photos'", required: true, description: { es: 'Versión activa', en: 'Active edition' } }],
  states: ['photo preview', 'latest', 'archived animated preview', 'latest still', 'classic', 'focus', 'open'],
  usages: [{ title: { es: 'Vista previa de fotos', en: 'Photo preview' }, render: () => h(SiteVersionSelect, { value: 'photos', videoEnabled: false, onChange: () => undefined }) }, { title: { es: 'Selector', en: 'Selector' }, render: () => h(SiteVersionSelect, { value: 'latest', onChange: () => undefined }) }],
  a11y: [{ es: 'Selector nativo con etiqueta traducida y teclado.', en: 'Native keyboard-operable select with translated label.' }], usedBy: ['W-01','W-02','W-04','W-05','W-06','W-07','W-08','P-01'],
});
