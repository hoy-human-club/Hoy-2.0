import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Wordmark } from './Wordmark';
import { brandHeading } from './brandHeading';

const heading = (text: string, size: string, tone?: 'current') =>
  h('p', { style: { fontFamily: 'var(--font-editorial)', fontSize: size, lineHeight: 1.03, letterSpacing: '-.035em', color: tone ? 'var(--brand-cream)' : 'var(--color-primary)', margin: 0 } }, brandHeading(text, { tone }));

export default defineMeta({
  tier: 'atom', name: 'Wordmark',
  description: {
    es: 'Logo “hoy” desde tenant.brand. Imagen: azul en claro y crema en oscuro. Vector (0033): el trazo del manual de marca en SVG, coloreado por CSS, como bloque (`vector`, encabezado y pie del sitio) o dentro de un titular en lugar de la palabra HOY (`inline`, vía `brandHeading(texto)`). Reglas: área de protección = la altura de la H del lockup (⅓ del alto del trazo); mínimo 120 px de ancho en pantalla, 30 mm impreso; solo titulares y textos display, nunca párrafos, botones, enlaces del menú, eyebrows ni <title>.',
    en: '“hoy” wordmark from tenant.brand. Image: blue in light, cream in dark. Vector (0033): the brand manual’s script as SVG, coloured by CSS, as a block (`vector`, site header and footer) or inside a heading in place of the word HOY (`inline`, via `brandHeading(text)`). Rules: clear space = the H height of the lockup (⅓ of the script height); minimum 120 px wide on screen, 30 mm in print; display headings only — never paragraphs, buttons, nav links, eyebrows or the <title>.',
  },
  props: [
    { name: 'height', type: 'number', default: '28', description: { es: 'Alto en px (imagen y `vector`; `inline` se mide en em).', en: 'Height in px (image and `vector`; `inline` is sized in em).' } },
    { name: 'variant', type: "'blue' | 'cream' | 'yellow' | 'auto'", default: 'auto', description: { es: 'Colorway de la imagen.', en: 'Image colourway.' } },
    { name: 'vector', type: 'boolean', default: 'false', description: { es: 'Trazo vectorial en bloque (encabezado / pie).', en: 'Block vector mark (header / footer).' } },
    { name: 'inline', type: 'boolean', default: 'false', description: { es: 'Dentro de un titular: alto --wm-inline-h (1.2em, mínimo 120 px de ancho), baja hasta la línea base del texto, márgenes --wm-inline-gap.', en: 'Inside a heading: height --wm-inline-h (1.2em, never under 120 px wide), dropped to the text baseline, --wm-inline-gap margins.' } },
    { name: 'tone', type: "'auto' | 'blue' | 'cream' | 'yellow' | 'current'", default: 'auto', description: { es: 'Color del vector: auto = azul #35597D en claro y crema #F1E7D2 en oscuro; current = el color del titular (paneles azules); impreso siempre azul.', en: 'Vector colour: auto = blue #35597D in light, cream #F1E7D2 in dark; current = the heading colour (blue panels); always blue in print.' } },
  ],
  states: ['light', 'dark', 'intrinsic raster aspect ratio in stacked cards', 'inline in a heading', 'inline on the deep-blue panel (tone current / yellow)', 'link hover (site header, footer)', 'link focus-visible', 'print (blue)', 'minimum size floor (120 px)'],
  usages: [
    { title: { es: 'Imagen en tarjeta apilada', en: 'Image in a stacked card' }, render: () => h('div', { className: 'stack' }, h(Wordmark, { variant: 'blue', height: 28 })) },
    { title: { es: 'Colorways (imagen)', en: 'Colourways (image)' }, render: () => h('div', { className: 'row wrap', style: { background: 'var(--brand-deepBlue)', padding: 16, borderRadius: 'var(--r-md)' } }, h(Wordmark, { variant: 'cream', height: 40 }), h(Wordmark, { variant: 'yellow', height: 40 })) },
    { title: { es: 'Vector: tonos', en: 'Vector: tones' }, render: () => h('div', { className: 'row wrap', style: { gap: 24, alignItems: 'center' } },
      h(Wordmark, { vector: true, height: 51 }),
      h('div', { className: 'row', style: { background: 'var(--brand-deepBlue)', padding: 16, gap: 24, borderRadius: 'var(--r-md)' } }, h(Wordmark, { vector: true, height: 51, tone: 'cream' }), h(Wordmark, { vector: true, height: 51, tone: 'yellow' }))) },
    { title: { es: 'Inline en un titular (brandHeading)', en: 'Inline in a heading (brandHeading)' }, code: "<h1>{brandHeading(bi(about.title))}</h1>", render: () => h('div', { className: 'stack' }, heading('Sobre HOY', '72px'), heading('La vida es HOY.', '48px')) },
    { title: { es: 'Inline en el panel azul (tone current)', en: 'Inline on the blue panel (tone current)' }, render: () => h('div', { style: { background: 'var(--brand-deepBlue)', padding: 24, borderRadius: 'var(--r-md)' } }, heading('Todo empieza HOY.', '48px', 'current')) },
    { title: { es: 'Sin la palabra: queda texto', en: 'Without the word: stays text' }, render: () => heading('Hoy en el club', '40px') },
  ],
  a11y: [
    { es: 'Imagen: alt = nombre del tenant.', en: 'Image: alt = tenant name.' },
    { es: 'Vector: role="img" + aria-label = nombre del tenant; el titular se sigue leyendo “Sobre HOY”. El SVG interno es aria-hidden.', en: 'Vector: role="img" + aria-label = tenant name; the heading still reads “About HOY”. The inner SVG is aria-hidden.' },
    { es: 'Contraste: #35597D sobre el papel claro ≥ 6:1; crema sobre el fondo oscuro ≥ 9:1.', en: 'Contrast: #35597D on the light paper ≥ 6:1; cream on the dark ground ≥ 9:1.' },
  ],
  usedBy: ['S-07', 'S-08', 'C-29', 'M-15', 'P-02', 'M-13', 'C-28', 'P-HOME', 'TopBar', 'HUB-01', 'W-01', 'W-02', 'W-07', 'W-08'],
});
