/**
 * D-01 — the single source of truth for every design value.
 * tokens.css is generated from this file (npm run tokens) and imported once in main.tsx.
 * Nothing invents a value off this file.
 *
 * Values are lifted from the canvas (reference/canvas/Hoy Wellness System.dc.html, v1.5) for the
 * active brand "hoy 2026": its `.canvas[data-brand="hoy"]` colour tokens (--c1…--c26 as `palette`,
 * --m1…--m10 RGB triplets as `rgb`), the brand/theme surface rules (.surf/.surf2/.ink/.dim/.accent/.inverse),
 * the Texture and Depth detail layers, and the D-01 artboard's materials and surface scale.
 * The mapping table canvas var → HoyOS token lives in docs/design-system.md.
 */

/** Brand manual palette (p8-1) + the derived neutrals the canvas uses for the hoy brand. */
export const brand = {
  cream: '#F1E7D2',   // --c14/--c15/--c21/--c24 · neutral base (lane, sidebar)
  yellow: '#F7F3B2',  // light yellow · pricing badge, highlights
  deepBlue: '#35597D', // --c1/--c6 · primary, accent fills
  midBlue: '#5F85B1', // --c4 · accent, focus
  ink: '#1C2E42',     // --c3/--c11 · .ink (headings)
  sand: '#E7DCC6',    // --c22 · page ground behind frames
  white: '#FBF7EF',   // --c18/--c23 · .surf frame paper
} as const;

/** The canvas colour tokens for data-brand="hoy" (light). Kept whole so the mapping is auditable. */
export const palette = {
  c1: '#35597D', c2: '#24384F', c3: '#1C2E42', c4: '#5F85B1', c5: '#24384F', c6: '#35597D', c7: '#D8C24A', c8: '#5E5312',
  c9: '#9BAEC4', c10: '#24384F', c11: '#1C2E42', c12: '#24384F', c13: '#F5EEE1', c14: '#F1E7D2', c15: '#F1E7D2', c16: '#E3DBCB',
  c17: '#EFE7DA', c18: '#FBF7EF', c19: '#F5EEE1', c20: '#EDE4D4', c21: '#F1E7D2', c22: '#E7DCC6', c23: '#FBF7EF', c24: '#F1E7D2',
  c25: '#F5EEE1', c26: '#9BAEC4', dg: '#7E3B2C', cat: '#35597D',
} as const;

/** RGB triplets (canvas --m1…--m10) used inside rgba() for shadows and textures. */
export const rgb = {
  light: {
    'm-primary': '53,89,125',   // --m1 · deep blue
    'm-shade': '36,56,79',      // --m2 · ink shade for shadows and grain
    'm-deep': '28,46,66',       // --c3 · deep ink behind the dark-theme top bars (TopBar, site header)
    'm-ink': '36,56,79',        // --m3
    'm-mid': '95,133,177',      // --m4
    'm-sun': '216,194,74',      // --m5
    'm-steel': '155,174,196',   // --m7
    'm-cream': '241,231,210',   // --m8
    'm-light': '255,255,255',   // --m9 · highlight
    'm-paper': '251,247,239',   // --m10
  },
  dark: {
    'm-primary': '155,192,228', // --cat dark
    'm-shade': '0,0,0',         // dark .surf shadows use pure black in the canvas
    'm-deep': '20,34,50',       // one step below the dark frame paper (#1B2E44) so the sticky bar reads over scrolled content
    'm-ink': '228,218,198',
    'm-mid': '95,133,177',
    'm-sun': '216,194,74',
    'm-steel': '155,174,196',
    'm-cream': '241,231,210',
    'm-light': '255,255,255',
    'm-paper': '27,46,68',
  },
} as const;

/**
 * Class tones — a neutral per-modality palette (0039). Each class type (`modalities.tone`) and each website class
 * (`brand.classes[slug].tone`) picks one; chips, calendar dots, room blocks and empty media frames are tinted with it.
 * The ids are hue names and carry no concept: they are never shown as words outside the D-01 tokens page.
 * `fg` is the chip ink on the translucent `bg` in the light theme; `dot` is the saturated mark (dots, borders); in the
 * dark theme chip text is `dot` mixed toward the ink so it holds 4.5:1 on the dark surfaces (Chip.css).
 * moss / river / clay / sun are the canvas `movSets.hoy` colours; sage / slate / plum were added in the same family.
 */
export const classTones = {
  moss: { fg: '#3A4C36', dot: '#5A7355', bg: 'rgba(90,115,85,.24)' },
  river: { fg: '#2C4A6B', dot: '#5F85B1', bg: 'rgba(95,133,177,.24)' },
  clay: { fg: '#7A3F27', dot: '#C4704F', bg: 'rgba(196,112,79,.26)' },
  sun: { fg: '#5E5312', dot: '#D8C24A', bg: 'rgba(216,194,74,.32)' },
  sage: { fg: '#34483D', dot: '#7E9C88', bg: 'rgba(126,156,136,.26)' },
  slate: { fg: '#323F4C', dot: '#848F9B', bg: 'rgba(132,143,155,.26)' },
  plum: { fg: '#57344F', dot: '#9E6E8F', bg: 'rgba(158,110,143,.24)' },
} as const;
export type Tone = keyof typeof classTones;
/** Every tone id, in palette order (selects, generated CSS rules, the tokens page). */
export const TONES = Object.keys(classTones) as Tone[];

/**
 * Semantic roles. Light = canvas `.canvas[data-brand="hoy"]:not([data-theme="dark"])`,
 * dark = `.canvas[data-brand="hoy"][data-theme="dark"]`. Dark re-maps surfaces; accents are never inverted.
 */
export const semantic = {
  light: {
    'color-ground': '#E7DCC6',       // canvas page ground behind the frames
    'color-bg': '#FBF7EF',           // .surf frame paper (--c18) · solid fallback for the frame gradient
    'color-lane': '#F1E7D2',         // .lane / .surf2 sidebar (--c21)
    'color-surface': '#F5EEE1',      // .surf2 tiles inside a frame (--c13/--c19/--c25) · D-01 "Soft" is one step down
    'color-surface-elevated': '#FFFCF6', // D-01 "Elevated"
    'color-surface-2': '#EFE7DA',    // --c17 · muted tiles, code blocks
    'color-surface-3': '#EDE4D4',    // D-01 "Pressed" · tracks, segmented ground (--c20)
    'color-surface-4': '#E3DBCB',    // avatar/photo placeholder fill (--c16)
    'color-text': '#24384F',         // .surf body ink (--c2/--c10)
    'color-ink': '#1C2E42',          // .ink · headings (--c3)
    'color-text-muted': '#4C5D70',   // .dim
    'color-text-faint': 'rgba(36,56,79,.72)', // eyebrows and hints · .72 keeps 11px semibold text ≥ 4.5:1 on cream and paper (0020)
    'color-text-on-primary': '#F5EEE1', // --c13 on accent fills
    'color-text-on-inverse': '#F1E7D2', // .inverse ink
    'color-primary': '#35597D',      // --c1 · accent as text/links (dark → --cat)
    'color-primary-hover': '#24384F', // --c2
    'color-accent-fill': '#35597D',  // --c1 · accent as a fill: buttons, active pills (constant across themes, as in the canvas)
    'color-accent-fill-hover': '#24384F',
    'color-accent': '#5F85B1',       // --c4 mid blue
    'color-accent-soft': '#9BAEC4',  // --c9/--c26 steel
    'color-highlight': '#F7F3B2',    // pricing badge ground
    'color-on-highlight': '#4A4212', // pricing badge ink
    'color-border': 'rgba(36,56,79,.12)',     // rgba(var(--m2),.12) hairlines
    'color-border-strong': 'rgba(53,89,125,.28)', // select border
    'color-success': '#4F7D5A',
    'color-warn': '#8A6A1E',
    'color-danger': '#7E3B2C',       // --dg
    'color-info': '#2C4A6B',         // 0153 · river tone ink · "Pago por confirmar", "En curso" (8.5:1 on paper)
    'color-success-soft': 'var(--tone-moss-bg)',  // 0153 · status grounds behind badges and banners
    'color-warn-soft': 'var(--tone-sun-bg)',
    'color-danger-soft': 'var(--tone-clay-bg)',
    'color-info-soft': 'var(--tone-river-bg)',
    'color-focus': '#5F85B1',
    'gradient-frame': 'linear-gradient(170deg,#FBF7EF,#F6EFE2)', // phone / desktop frame fill (.surf paper, warmed toward the bottom)
    'gradient-tile': 'linear-gradient(150deg,#F5EEE1,#EDE4D4)',   // C-01 prompt tile
    'color-scrim': 'rgba(36,56,79,.35)',
  },
  dark: {
    'color-ground': '#101C29',
    'color-bg': '#1B2E44',           // dark .surf frame
    'color-lane': '#16263A',
    'color-surface': '#22384F',      // dark .surf2 tiles
    'color-surface-elevated': '#2A4159',
    'color-surface-2': '#2A4159',
    'color-surface-3': '#31506E',
    'color-surface-4': '#3B5C7C',
    'color-text': '#E4DAC6',
    'color-ink': '#F1E7D2',
    'color-text-muted': '#A3B3C5',
    'color-text-faint': 'rgba(228,218,198,.72)', // ≥ 4.5:1 on the dark tile (0020)
    'color-text-on-primary': '#F5EEE1',
    'color-text-on-inverse': '#EFE6D4',
    'color-primary': '#9BC0E4',      // --cat dark
    'color-primary-hover': '#B4D0EB',
    'color-accent-fill': '#35597D',
    'color-accent-fill-hover': '#4A6E93',
    'color-accent': '#5F85B1',
    'color-accent-soft': '#9BAEC4',
    'color-highlight': '#F7F3B2',
    'color-on-highlight': '#3A3410',
    'color-border': 'rgba(241,231,210,.12)',
    'color-border-strong': '#31506E',
    'color-success': '#7FB08A',
    'color-warn': '#D8C24A',
    'color-danger': '#E0A08F',       // --dg dark
    'color-info': '#9BC0E4',
    'color-success-soft': 'rgba(127,176,138,.16)',
    'color-warn-soft': 'rgba(216,194,74,.16)',
    'color-danger-soft': 'rgba(224,160,143,.16)',
    'color-info-soft': 'rgba(155,192,228,.16)',
    'color-focus': '#9BC0E4',
    'gradient-frame': 'linear-gradient(170deg,#1D3148,#1B2E44)',
    'gradient-tile': 'linear-gradient(150deg,#22384F,#1B2E44)',
    'color-scrim': 'rgba(0,0,0,.5)',
  },
} as const;

/**
 * 0153 — Between Gigs bridge. The Between Gigs design system's semantic names, each an alias of a HoyOS token above,
 * so components can be written against the shared vocabulary (bg → surface → surface-raised, ink / ink-muted,
 * action / action-strong, line, status + soft ground, cat-1…7) while every value stays Hoy's. Aliases only: themes and
 * the wireframe skin re-colour them through the tokens they point at, and adding the bridge changes no pixel.
 * Mapping and the open questions (dark `action`, solid `ink-subtle`) are in docs/design-system.md.
 */
export const bridge = {
  'bg': 'var(--color-bg)',
  'surface': 'var(--color-surface)',
  'surface-raised': 'var(--color-surface-elevated)',
  'surface-sunken': 'var(--color-surface-2)',
  'surface-brand': 'var(--brand-deepBlue)',   // a dark-theme island in both themes: set data-theme="dark" on the band
  'ink': 'var(--color-ink)',
  'ink-body': 'var(--color-text)',
  'ink-muted': 'var(--color-text-muted)',
  'ink-subtle': 'var(--color-text-faint)',    // ≈ 4.3:1 on surface-sunken — captions on bg/surface only until it is made solid
  'ink-brand': 'var(--color-primary)',
  'ink-on-brand': 'var(--color-text-on-inverse)',
  'action': 'var(--color-accent-fill)',
  'action-hover': 'var(--color-accent-fill-hover)',
  'on-action': 'var(--color-text-on-primary)',
  'action-strong': 'var(--color-ink)',
  'on-action-strong': 'var(--color-bg)',
  'action-danger': 'var(--color-danger)',
  'highlight': 'var(--color-highlight)',      // Hoy's sun plays Between Gigs' lime: markers and celebrations, never a banner
  'on-highlight': 'var(--color-on-highlight)',
  'line': 'var(--color-border)',
  'line-strong': 'var(--color-border-strong)',
  'focus': 'var(--color-focus)',
  'scrim': 'var(--color-scrim)',
  'success': 'var(--color-success)', 'success-soft': 'var(--color-success-soft)',
  'warning': 'var(--color-warn)', 'warning-soft': 'var(--color-warn-soft)',
  'danger': 'var(--color-danger)', 'danger-soft': 'var(--color-danger-soft)',
  'info': 'var(--color-info)', 'info-soft': 'var(--color-info-soft)',
  'neutral-soft': 'var(--color-surface-3)',
  ...Object.fromEntries(TONES.map((id, i) => [`cat-${i + 1}`, `var(--tone-${id}-dot)`])),
} as Record<string, string>;

/**
 * Depth — the canvas Detail layer "Depth" (multi-layer physical shadows), verbatim, written against the
 * rgb triplets so dark re-colours them. `card` = .surf2 tiles, `raised` = .surf panels/frames.
 */
export const shadows = {
  'shadow-window': 'inset 0 3px 12px rgba(var(--m-shade),.13), inset 0 18px 36px -24px rgba(var(--m-shade),.25), inset 0 -1px 0 rgba(var(--m-light),.75)',
  'shadow-photo-inset': 'inset 0 8px 24px rgba(var(--m-shade),.24), inset 0 1px 2px rgba(var(--m-shade),.35)',
  'shadow-carved': 'inset 0 2px 7px rgba(var(--m-shade),.18), inset 0 -1px 0 rgba(var(--m-light),.75)',
  'shadow-stone': 'inset 0 1px 0 rgba(255,255,255,.7), inset 0 -3px 0 rgba(73,65,47,.13), 0 4px 8px -3px rgba(36,56,79,.16), 0 16px 36px -20px rgba(36,56,79,.32)',
  'shadow-highlight': 'inset 0 1px 0 rgba(var(--m-light),.85)',
  'shadow-contact': '0 1px 1.5px rgba(var(--m-shade),.10)',
  'shadow-soft': '0 6px 14px -8px rgba(var(--m-shade),.30)',
  'shadow-card': 'inset 0 1px 0 rgba(var(--m-light),.85), 0 1px 1.5px rgba(var(--m-shade),.10), 0 6px 14px -8px rgba(var(--m-shade),.30)',
  'shadow-raised': 'inset 0 1px 0 rgba(var(--m-light),.92), inset 0 -1px 0 rgba(var(--m-shade),.07), 0 1px 1px rgba(var(--m-shade),.10), 0 3px 6px -2px rgba(var(--m-shade),.16), 0 12px 24px -10px rgba(var(--m-shade),.34), 0 34px 58px -30px rgba(var(--m-shade),.44)',
  'shadow-frame': 'inset 0 1px 0 rgba(var(--m-light),.7), 0 2px 3px rgba(var(--m-shade),.1), 0 18px 40px -14px rgba(var(--m-shade),.35)',
  'shadow-accent': 'inset 0 1px 0 rgba(var(--m-light),.28), inset 0 -1px 0 rgba(0,0,0,.15), 0 2px 4px -1px rgba(var(--m-primary),.40), 0 10px 22px -8px rgba(var(--m-primary),.58)',
  'shadow-inverse': 'inset 0 1px 0 rgba(var(--m-light),.24), 0 3px 7px -2px rgba(var(--m-shade),.30), 0 18px 38px -14px rgba(var(--m-shade),.55)',
  'shadow-lane': 'inset 0 1px 0 rgba(var(--m-light),.5), 0 1px 2px rgba(var(--m-shade),.07)',
  'shadow-pressed': 'inset 0 1px 2px rgba(var(--m-shade),.12)',
  'shadow-pressed-deep': 'inset 0 2px 4px rgba(var(--m-shade),.20)',
} as const;

/**
 * Texture — the canvas Detail layer "Texture" (suede grain from the brand manual) as pure CSS: two fine
 * repeating hairline gradients plus one soft light pool. Applied as `background-image`; no image files.
 */
export const textures = {
  'tex-lane': 'repeating-linear-gradient(103deg,rgba(var(--m-shade),.030) 0 1px,transparent 1px 3px), repeating-linear-gradient(17deg,rgba(var(--m-shade),.024) 0 1px,transparent 1px 4px), radial-gradient(120% 80% at 22% 12%,rgba(var(--m-light),.28),transparent 60%)',
  'tex-surf': 'repeating-linear-gradient(97deg,rgba(var(--m-shade),.034) 0 1px,transparent 1px 3px), repeating-linear-gradient(7deg,rgba(var(--m-shade),.024) 0 1px,transparent 1px 5px), radial-gradient(130% 90% at 18% 8%,rgba(var(--m-light),.34),transparent 62%)',
  'tex-accent': 'repeating-linear-gradient(101deg,rgba(0,0,0,.06) 0 1px,transparent 1px 3px), repeating-linear-gradient(13deg,rgba(0,0,0,.045) 0 1px,transparent 1px 5px), radial-gradient(120% 90% at 25% 10%,rgba(var(--m-light),.15),transparent 58%)',
  'tex-paper': 'radial-gradient(rgba(var(--m-shade),.16) 1.1px,transparent 1.3px) 0 0/13px 13px',
  'tex-ph': 'repeating-linear-gradient(45deg,var(--color-surface-3),var(--color-surface-3) 5px,var(--color-surface-4) 5px,var(--color-surface-4) 10px)',
} as const;

/** D-01 materials (canvas `tokens.textures` for the hoy brand) — decorative fills for hero art, gift cards, empty art. */
export const materials = {
  sand: { label: 'Sand', fill: 'linear-gradient(150deg,#F5EEE1,#E7DCC6)' },
  light: { label: 'Light', fill: 'linear-gradient(150deg,#FBF9DC,#F7F3B2)' },
  sky: { label: 'Sky', fill: 'linear-gradient(150deg,#A7BFDA,#5F85B1)' },
  deep: { label: 'Deep', fill: 'linear-gradient(150deg,#4A6E93,#35597D)' },
  linen: { label: 'Linen', fill: 'repeating-linear-gradient(90deg,#F7F1E5,#F7F1E5 3px,#EDE4D4 3px,#EDE4D4 6px)' },
} as const;

/**
 * Card-family hues (HUB-01 surface cards, D-05 canvas tiles). One angle per family; every fill is
 * `color-mix()` of `hsl(var(--hue) var(--hue-sat) var(--hue-lum))` with a semantic surface token, so a
 * family tints the shared surfaces instead of introducing a new colour. Dark re-balances sat/lum only.
 */
export const hues = {
  site: 198, app: 40, teacher: 268, desk: 158, inbox: 210, pos: 24, admin: 222,
  crm: 330, finance: 96, manual: 44, docs: 186, kb: 286, dev: 244,
  // 0031: the marketing-kit card (coming soon) and the source-documents card
  marketing: 352, sources: 58,
} as const;
export type HueFamily = keyof typeof hues;

/** D-01 surface scale (canvas `tokens.surfaces`). */
export const surfaces = {
  card: { label: 'Card', fill: 'var(--color-surface)', shadow: 'var(--shadow-card)' },
  elevated: { label: 'Elevated', fill: 'var(--color-surface-elevated)', shadow: 'var(--shadow-raised)' },
  pressed: { label: 'Pressed', fill: 'var(--color-surface-3)', shadow: 'var(--shadow-pressed-deep)' },
  soft: { label: 'Soft', fill: 'var(--color-surface-2)', shadow: 'none' },
  inverse: { label: 'Inverse', fill: 'var(--color-accent-fill)', shadow: 'var(--shadow-inverse)' },
} as const;

/** Brand manual: Inter for headings, DM Sans for body. Fallbacks are metric-adjusted (see @font-face in global.css). */
export const type = {
  'font-heading': "'Inter', 'Inter Fallback', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  'font-body': "'DM Sans', 'DM Sans Fallback', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  'font-editorial': "'Cormorant Garamond', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif",
  'font-mono': "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  /* `fs-floor` is 0 up to 1919 px and 16 px from 1920 px (UI_SCALE.minText): the two caption sizes never compute
     under 16 px on a large screen (10-foot legibility) while the base sizes stay 11 / 12 px on phones and desktops. */
  'fs-floor': '0px',
  'fs-2xs': 'max(0.6875rem, var(--fs-floor))', // 11px · eyebrows, code tags
  'fs-xs': 'max(0.75rem, var(--fs-floor))',    // 12px · captions, week-grid text
  'fs-sm': '0.875rem',
  'fs-md': '1rem',
  'fs-lg': '1.125rem',
  'fs-xl': '1.375rem',
  'fs-2xl': '1.75rem',
  'fs-3xl': '2.25rem',
  'fs-4xl': '3rem',
  'lh-tight': '1.15',
  'lh-base': '1.5',
  'ls-tight': '-0.02em',  // canvas hoy headings
  'ls-eyebrow': '0.14em', // canvas eyebrows
  /* 0033 — the script wordmark set inside a display heading in place of the word HOY (Wordmark `inline`). Sized in em so
     it follows the heading; the floor keeps it at the brand manual's 120 px minimum width; the gap is added to the word
     space on each side so the clear space totals ≈ the H height of the lockup (⅓ of the script height). */
  'wm-inline-h': '1.2em',
  'wm-inline-gap': '0.12em',
  'wm-min-w': '120px',
  'fw-light': '300',
  'fw-regular': '400',
  'fw-medium': '500',
  'fw-semibold': '600',
  'fw-bold': '700',
} as const;

/**
 * Spacing scale (0037). One 4 px-based scale in rem (4 px = .25rem at the base size) so every step scales with the
 * `--ui` band like type does (D-0007). `sp-px` is the hairline and stays 1 px. Module CSS never writes a raw px/rem
 * for margin, padding, gap or inset: it uses a semantic token below, or a scale step (scripts/spacing-lint.mjs).
 */
export const spacing = {
  'sp-0': '0', 'sp-px': '1px', 'sp-2xs': '0.125rem', 'sp-xs': '0.25rem', 'sp-sm': '0.5rem', 'sp-md': '0.75rem',
  'sp-lg': '1rem', 'sp-xl': '1.5rem', 'sp-2xl': '2rem', 'sp-3xl': '3rem', 'sp-4xl': '4rem', 'sp-5xl': '6rem',
} as const;

/**
 * Legacy numeric names (0001–0036), kept as aliases of the scale for one pass so older branches still resolve.
 * New code uses the named steps; the lint counts these as warnings. The off-scale 20 / 40 / 80 px steps
 * (`sp-5`, `sp-10`, `sp-20`) were retired in 0037: their call sites moved to `--block`, `--card-pad` or a scale step.
 */
export const spacingLegacy = {
  'sp-1': 'var(--sp-xs)', 'sp-2': 'var(--sp-sm)', 'sp-3': 'var(--sp-md)', 'sp-4': 'var(--sp-lg)', 'sp-6': 'var(--sp-xl)',
  'sp-8': 'var(--sp-2xl)', 'sp-12': 'var(--sp-3xl)', 'sp-16': 'var(--sp-4xl)',
} as const;

/**
 * Semantic spacing (0037) — the vocabulary pages use. Every value resolves to a scale step; the responsive ones
 * step up in SPACING_BANDS below (viewport min-width, px). Read it as a sentence: controls sit `gap-control` apart,
 * a card pads `card-pad`, blocks inside a card or section are `block` apart, sections are `section` apart.
 */
export const spacingSemantic = {
  'gap-inline': 'var(--sp-sm)',    // icon ↔ label, chip contents, inline meta
  'gap-control': 'var(--sp-md)',   // between buttons, chips, inputs in a row
  'stack-tight': 'var(--sp-xs)',   // eyebrow → heading, heading → lead, label → hint
  'stack': 'var(--sp-sm)',         // lead → body, rows of a small list, field label → control
  'stack-loose': 'var(--sp-lg)',   // form fields, paragraphs of a card
  'block': 'var(--sp-xl)',         // between blocks inside a card, a page or a section
  'card-pad': 'var(--sp-lg)',      // 16 phone · 24 from 768
  'card-pad-lg': 'var(--sp-xl)',   // 24 phone · 32 from 768 (feature cards, dialogs)
  'section': 'var(--sp-3xl)',      // 48 phone · 64 from 768 (between page sections)
  'section-hero': 'var(--sp-4xl)', // 64 phone · 96 from 768 (website hero and full-bleed bands)
  'gutter': 'var(--sp-lg)',        // page side padding: 16 phone · 24 from 768 · 32 from 1280
  'grid-gap': 'var(--sp-lg)',      // card grids: 16 phone · 24 from 768
  'row-pad-y': 'var(--sp-md)',     // list rows: 12 × 16, min-height --h-ctl
  'row-pad-x': 'var(--sp-lg)',
  'row-pad': 'var(--row-pad-y) var(--row-pad-x)',
  'btn-pad-x': 'var(--sp-lg)',     // buttons pad 0 × 16 (height comes from --h-ctl); sm 12, lg 24
  'measure': '65ch',               // body text line length
} as const;

/** The viewport widths where the responsive semantic tokens step up (0037). */
export const SPACING_BANDS: readonly { minWidth: number; vars: Record<string, string> }[] = [
  { minWidth: 768, vars: { 'card-pad': 'var(--sp-xl)', 'card-pad-lg': 'var(--sp-2xl)', section: 'var(--sp-4xl)', 'section-hero': 'var(--sp-5xl)', gutter: 'var(--sp-xl)', 'grid-gap': 'var(--sp-xl)' } },
  { minWidth: 1280, vars: { gutter: 'var(--sp-2xl)' } },
];

/**
 * Radii. 0037: rem so corners scale with the `--ui` band (a 16 px corner on a 1.75× card read sharp at 3840), and
 * on the 4 px scale: 2 · 4 · 8 · 12 (controls, was 11) · 16 (cards) · 24 · 32 · pill. `r-frame` 18 (desktop frame)
 * and `r-phone` 34 (DeviceFrame bezel) are the canvas's device constants, kept as they are. Nested corners follow
 * inner = outer − padding (a 16 px card with 8 px padding holds an 8 px tile).
 */
export const radii = {
  'r-arch-card': '50% 50% 1rem 1rem / 11.25rem 11.25rem 1rem 1rem',
  /** 0051 — a door-shaped arch: a full semicircle on top at any width (the browser scales the 999px radii to half the width). */
  'r-arch': '999px 999px 0.25rem 0.25rem',
  'r-2xs': '0.125rem', // hairline tracks (bar lists, token bars)
  'r-xs': '0.25rem', 'r-sm': '0.5rem', 'r-ctl': '0.75rem', 'r-md': '1rem', 'r-frame': '1.125rem', 'r-lg': '1.5rem', 'r-xl': '2rem', 'r-phone': '2.125rem', 'r-full': '999px',
} as const;

export const motion = {
  'dur-reveal': '800ms', 'dur-ambient': '18s',
  'dur-fast': '120ms', 'dur-base': '200ms', 'dur-slow': '360ms', 'dur-spin': '1.1s', 'dur-breath': '7s',
  'ease-out': 'cubic-bezier(.2,.7,.2,1)', 'ease-in-out': 'cubic-bezier(.65,0,.35,1)',
} as const;

/**
 * Icon scale (0030). One lucide stroke set behind the `Icon` atom: sizes are rem so glyphs grow with the `--ui` band
 * like type does; the stroke is a unitless SVG width (1.75 at rest, 2.25 for the active dock / top-bar item) so a
 * 20 px glyph and a 40 px glyph read with the same weight next to DM Sans. `icon-tile` is the square medallion behind a
 * settings or list-row glyph.
 */
export const icons = {
  'icon-xs': '0.875rem', 'icon-sm': '1rem', 'icon-md': '1.25rem', 'icon-lg': '1.5rem', 'icon-xl': '2rem',
  'icon-tile': '2.25rem', 'icon-stroke': '1.75', 'icon-stroke-active': '2.25',
} as const;
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Layout widths and heights, all in rem so they scale with the `--ui` band (1120 → 1960 px at 3840). The phone
 * bezel width lives in the hub's DeviceFrame presets (D-0006), not here.
 * `h-ctl` is the minimum height (and the minimum width of a square target) of every interactive control (44 px).
 * `h-ctl-sm` (36 px) is the visible height of a compact `Button size="sm"` inside a dense row (`RowActions`); its
 * hit area still reaches `h-ctl` through a transparent `::before` (0049 dense-row exception, D-0012).
 */
const layoutTokens = {
  'w-content': '70rem', 'w-app': '75rem', 'w-teach': '60rem', 'w-auth': '30rem', 'w-auth-wide': '36rem',
  'h-topbar': '3.5rem', 'h-bottomnav': '4rem', 'h-ctl': '2.75rem', 'h-ctl-sm': '2.25rem', 'h-ctl-lg': '3rem', 'w-sidebar': '15rem', 'w-rail': '3.5rem',
} as const;

/**
 * Breakpoints (px, min-width). One list for CSS media queries, `useMinWidth()` and `PageSpec.checkedAt`.
 * `shell` (900) is where AppShell swaps the bottom dock for the top-bar nav and DesktopShell opens its sidebar.
 * CSS cannot read custom properties inside @media, so the CSS vars are documentary; the numbers are the contract.
 */
export const BREAKPOINTS = { xs: 360, phone: 390, tablet: 768, shell: 900, desktop: 1280, hd: 1920, qhd: 2560, uhd: 3840 } as const;
export type Breakpoint = keyof typeof BREAKPOINTS;
export const CHECK_WIDTHS: readonly number[] = Object.values(BREAKPOINTS);
const breakpointVars = Object.fromEntries(Object.entries(BREAKPOINTS).map(([k, v]) => [`bp-${k}`, `${v}px`])) as Record<string, string>;

/**
 * Large-screen scale band (D-0004, made global by D-0007): `--ui` is 1 up to 1919 px, 1.125 at ≥ 1920, 1.375 at ≥ 2560,
 * 1.75 at ≥ 3840. It lives on :root and drives the html font-size, so every rem token (type, spacing, control heights,
 * layout widths) scales with it; px values stay put and multiply by `var(--ui)` where they must grow.
 */
export const UI_SCALE: readonly { minWidth: number; ui: number; minText: number }[] = [
  { minWidth: BREAKPOINTS.hd, ui: 1.125, minText: 16 }, { minWidth: BREAKPOINTS.qhd, ui: 1.375, minText: 16 }, { minWidth: BREAKPOINTS.uhd, ui: 1.75, minText: 16 },
];

export const tokens = { brand, palette, rgb, classTones, semantic, bridge, shadows, textures, materials, surfaces, hues, type, spacing, spacingLegacy, spacingSemantic, radii, motion, icons, layout: layoutTokens, breakpoints: breakpointVars };

function vars(obj: Record<string, string>): string {
  return Object.entries(obj).map(([k, v]) => `  --${k}: ${v};`).join('\n');
}

/**
 * Class-tone hooks (0039). Every element that carries a tone — `.chip-<id>`, `.tone-<id>` (ClassRow dot, RoomDayGrid block),
 * `.tonecard-<id>`, `.mediaslot-<id>`, `.cust-media-<id>`, `.cust-week-<id>`, `.adm-tone-<id>` or `[data-tone=<id>]` —
 * gets the local `--t-fg / --t-dot / --t-bg`, so component CSS reads those once instead of one rule per tone.
 */
export const TONE_HOOKS = ['chip', 'tone', 'tonecard', 'mediaslot', 'cust-media', 'cust-week', 'adm-tone'] as const;
function toneHooksCss(): string {
  return TONES.map((id) => `${[...TONE_HOOKS.map((h) => `.${h}-${id}`), `[data-tone="${id}"]`].join(', ')} { --t-fg: var(--tone-${id}-fg); --t-dot: var(--tone-${id}-dot); --t-bg: var(--tone-${id}-bg); }`).join('\n');
}

/** Builds the full tokens stylesheet. Themes via [data-theme], skins via [data-skin]. */
export function buildTokensCss(): string {
  const brandVars = vars(Object.fromEntries(Object.entries(brand).map(([k, v]) => [`brand-${k}`, v])));
  const paletteVars = vars(Object.fromEntries(Object.entries(palette).map(([k, v]) => [`hoy-${k}`, v])));
  const tone = Object.entries(classTones).flatMap(([k, m]) => [[`tone-${k}-fg`, m.fg], [`tone-${k}-dot`, m.dot], [`tone-${k}-bg`, m.bg]]);
  const mat = Object.fromEntries(Object.entries(materials).map(([k, m]) => [`mat-${k}`, m.fill]));
  const hueVars = vars(Object.fromEntries(Object.entries(hues).map(([k, v]) => [`hue-${k}`, String(v)])));
  return `/* GENERATED from src/design/tokens.ts — do not edit by hand */
:root {
${brandVars}
${paletteVars}
${vars(Object.fromEntries(tone))}
${vars(mat)}
${vars(type)}
${vars(spacing)}
${vars(spacingLegacy)}
${vars(spacingSemantic)}
${vars(radii)}
${vars(motion)}
${vars(icons)}
${vars(layoutTokens)}
${vars(breakpointVars)}
  --ui: 1;
${vars(rgb.light)}
${vars(semantic.light)}
${vars(bridge)}
${vars(shadows)}
${vars(textures)}
${hueVars}
  --hue-sat: 46%;
  --hue-lum: 52%;
  --tex-lane-on: var(--tex-lane);
  --tex-surf-on: var(--tex-surf);
  --tex-accent-on: var(--tex-accent);
  --color-card-border: transparent;
  color-scheme: light;
}
${toneHooksCss()}
${SPACING_BANDS.map((b) => `@media (min-width: ${b.minWidth}px) { :root {${Object.entries(b.vars).map(([k, v]) => ` --${k}: ${v};`).join('')} } }`).join('\n')}
${UI_SCALE.map((b) => `@media (min-width: ${b.minWidth}px) { :root { --ui: ${b.ui}; --fs-floor: ${b.minText}px; } }`).join('\n')}
/* D-0007: the band scales the root font-size, so every rem token grows with it. */
html { font-size: calc(100% * var(--ui)); }
:root[data-theme="dark"] {
${vars(rgb.dark)}
${vars(semantic.dark)}
  --shadow-highlight: inset 0 1px 0 rgba(255,255,255,.06);
  --shadow-card: inset 0 1px 0 rgba(255,255,255,.06), 0 1px 2px rgba(0,0,0,.55), 0 10px 30px rgba(0,0,0,.4);
  --shadow-raised: inset 0 1px 0 rgba(255,255,255,.08), 0 2px 4px rgba(0,0,0,.55), 0 24px 60px -20px rgba(0,0,0,.7);
  --shadow-frame: inset 0 1px 0 rgba(255,255,255,.08), 0 2px 3px rgba(0,0,0,.5), 0 18px 40px -14px rgba(0,0,0,.7);
  --shadow-accent: inset 0 1px 0 rgba(255,255,255,.18), inset 0 -1px 0 rgba(0,0,0,.25), 0 2px 4px -1px rgba(0,0,0,.4), 0 10px 22px -8px rgba(0,0,0,.6);
  --shadow-inverse: inset 0 1px 0 rgba(255,255,255,.1), 0 3px 7px -2px rgba(0,0,0,.4), 0 18px 38px -14px rgba(0,0,0,.7);
  --hue-sat: 42%;
  --hue-lum: 64%;
  --tex-lane-on: none;
  --tex-surf-on: none;
  --color-card-border: rgba(241,231,210,.06);
  color-scheme: dark;
}
:root[data-skin="wireframe"] {
  --color-ground: #F6F5F2;
  --color-bg: #FFFFFF;
  --color-lane: #FBFBFA;
  --color-surface: #FFFFFF;
  --color-surface-elevated: #FFFFFF;
  --color-surface-2: #F2F1ED;
  --color-surface-3: #E4E2DB;
  --color-surface-4: #D6D3CA;
  --color-text: #3A3A3A;
  --color-ink: #232323;
  --color-text-muted: #6B6B6B;
  --color-text-faint: #8A8A8A;
  --color-primary: #3A3A3A;
  --color-primary-hover: #232323;
  --color-accent-fill: #3A3A3A;
  --color-accent-fill-hover: #232323;
  --color-accent: #6B6B6B;
  --color-accent-soft: #C9C4B8;
  --color-highlight: #EDEBE5;
  --color-on-highlight: #3A3A3A;
  --color-border: #D6D3CA;
  --color-border-strong: #C9C4B8;
  --color-card-border: #C9C4B8;
  --color-text-on-primary: #FFFFFF;
  --color-text-on-inverse: #FFFFFF;
  --color-success: #5E5E5E;
  --color-warn: #5E5E5E;
  --color-danger: #5E5E5E;
  --color-info: #5E5E5E;
  --color-success-soft: #EDEBE5; --color-warn-soft: #EDEBE5; --color-danger-soft: #EDEBE5; --color-info-soft: #EDEBE5;
  --gradient-frame: linear-gradient(#FFFFFF,#FFFFFF);
  --gradient-tile: linear-gradient(#FFFFFF,#FFFFFF);
  --shadow-highlight: none; --shadow-contact: none; --shadow-soft: none; --shadow-card: none; --shadow-raised: none;
  --shadow-frame: none; --shadow-accent: none; --shadow-inverse: none; --shadow-lane: none; --shadow-pressed: none; --shadow-pressed-deep: none;
  --tex-lane-on: none; --tex-surf-on: none; --tex-accent-on: none;
  --hue-sat: 0%; --hue-lum: 62%;
  --tex-ph: repeating-linear-gradient(45deg,#F2F1ED,#F2F1ED 5px,#E4E2DB 5px,#E4E2DB 10px);
  --mat-sand: #EDEBE5; --mat-light: #EDEBE5; --mat-sky: #D6D3CA; --mat-deep: #C9C4B8; --mat-linen: #EDEBE5;
  --font-heading: 'Jost', system-ui, sans-serif;
  --font-body: 'Jost', system-ui, sans-serif;
  --ls-tight: 0;
}
:root[data-skin="wireframe"][data-theme="dark"] {
  --color-ground: #0E0D0B; --color-bg: #161511; --color-lane: #12110E;
  --color-surface: #1C1A15; --color-surface-elevated: #1C1A15; --color-surface-2: #272419; --color-surface-3: #2A2720; --color-surface-4: #3A362C;
  --color-text: #DCD3C0; --color-ink: #F4EEE0; --color-text-muted: #B2A794; --color-text-faint: #8F8677;
  --color-primary: #DCD3C0; --color-primary-hover: #F4EEE0; --color-accent-fill: #DCD3C0; --color-accent-fill-hover: #F4EEE0; --color-accent: #B2A794; --color-highlight: #272419; --color-on-highlight: #EDE5D2;
  --color-border: #3A362C; --color-border-strong: #4A4536; --color-card-border: #3A362C; --color-text-on-primary: #161511; --color-text-on-inverse: #EDE5D2;
  --color-success-soft: #272419; --color-warn-soft: #272419; --color-danger-soft: #272419; --color-info-soft: #272419;
  --gradient-frame: linear-gradient(#161511,#161511); --gradient-tile: linear-gradient(#1C1A15,#1C1A15);
  --tex-ph: repeating-linear-gradient(45deg,#1F1D17,#1F1D17 5px,#2A2720 5px,#2A2720 10px);
}
:root[data-skin="wireframe"] img { filter: grayscale(1) contrast(.6); }
`;
}
