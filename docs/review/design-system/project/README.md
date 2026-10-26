HoyOS is the operating system of a wellness studio in Medellín: the member app, the front desk, the coordinators' and owners' workspace and the team hub. It is designed the way the studio is built: **Pulso Materia** — sun-washed limestone plaster, blue plaster, paper, travertine stone and linen, with the warmth of morning light through leaves. The interface should feel like the room, not like software laid on top of it.

Live: [the app](https://hoy-human-club.github.io/Hoy-2.0/) · [team hub](https://hoy-human-club.github.io/Hoy-2.0/#/hub) · [front desk](https://hoy-human-club.github.io/Hoy-2.0/#/staff) · [member home](https://hoy-human-club.github.io/Hoy-2.0/#/app)

## Principles

1. **Material before colour.** Grounds are plaster, panels are paper, heroes are stone. Flat colour alone is never the finished state.
2. **One clear action.** Each view has one ink pill (`btn-primary`); every other action is a tactile paper pill.
3. **Calm density.** Remove page headings that only repeat the menu; let content start at the top. Cells keep their natural height — balance comes from pairing real content, never from stretched empty boxes.
4. **Pigment is precious.** Full-strength class tones mark dots and bars; large tiles use the softened limewash (`tone-*-wash`).
5. **Bilingual by default.** Every string exists in Spanish (required) and English.

## Voice and content

- Spanish first, warm and brief, tú form: "Tu clase empieza en 20 minutos", "Reservar clase", "Ver horario".
- Sentence case everywhere; eyebrows are the only uppercase text ("HOY · MARTES").
- Verbs on buttons; no trailing punctuation; no emoji in the interface.
- Numbers use Colombian format: `$1.284.000`, `86%`, `07:00`.

## Colour

- **Brand**: `brand-deepBlue` #35597D is the identity colour — the menu, heroes and the wordmark. `brand-cream`, `brand-yellow` (sun, highlights only) and `brand-ink` complete it.
- **Grounds and surfaces**: the page is `color-bg` under the limestone photograph; cards and controls are `color-surface` paper; `color-surface-2` / `-3` step down for notes and pressed states.
- **Text**: `color-ink` for headings and figures, `color-text` for body, `color-text-muted` for secondary lines, `color-text-faint` only for eyebrows on paper and ground. All pass WCAG AA in both themes.
- **Primary action**: `color-accent-fill` — ink in light, deep blue in dark — with `color-text-on-primary`.
- **Class tones**: river, sun, clay, moss (plus sage, slate, plum) identify class types. `tone-*-dot` at full pigment for dots, calendar marks and bars; `tone-*-wash` (pigment 64% over #F4EDE0, 66% over #B8B0A0 in dark) for large tiles, always with `stat-ink` text. A KPI row runs river → sun → clay → moss.
- **Status**: `color-success`, `color-warn`, `color-danger`, `color-info` — always with a word or icon, never colour alone.

## Typography

- **Cormorant Garamond** (`editorial`) for page titles and greetings: `display` 41 px / 1.0, regular; `title` 28 px / 1.15, medium. One display line per screen.
- **DM Sans** (`body`) for everything else: card titles 18 px semibold, body 16 px / 1.5, dense UI 14 px, captions 12 px, eyebrows 11 px semibold uppercase at +0.14em.
- Figures are DM Sans bold, −0.03em, tabular numerals. Body text is held to a 65ch measure.
- Captions never compute below 16 px from 1920 px wide; the whole interface scales with the `--ui` band (×1.125 at 1920, ×1.375 at 2560, ×1.75 at 3840).

## Materials (Pulso Materia)

| Material | Where | How |
|---|---|---|
| Limestone plaster | Page ground: workspace, hub, member app | Photo under an 84% `color-bg` veil, fixed to the viewport; leaf-shadow light in the top-right at 18% |
| Blue plaster | Side menu, hub hero | Blue plaster photo multiplied into `brand-deepBlue` |
| Paper | Cards, tables, panels, controls | `color-surface` + fine paper grain + linen weave |
| Stone | The one blue hero per screen | `brand-deepBlue` + travertine mottling + grain |
| Linen | Notes, drawers | `color-surface-2` + a two-way hairline weave |

Materials sit behind content, never on top of text, and keep every ground within a few percent of its flat colour so contrast is unchanged. Dark mode replaces the photographs with procedural stone.

## Depth, shape and buttons

- Paper lies almost flat (`shadow-card`); drawers and hovered cards lift (`shadow-raised`).
- Controls are tactile: secondary buttons and chips carry a hairline edge, a top highlight and `shadow-pill`; hover deepens to `shadow-pill-hover`; press sinks to `shadow-pill-pressed` and moves 1 px. Primary pills and selected chips use `shadow-ink-lift`.
- Corners are soft: `r-md` (24 px) for cards and tiles, `r-lg` (32 px) for heroes and drawers, `r-ctl` for inputs, `r-full` for every button and chip.

## Spacing and layout

- One 4 px scale (`sp-*`, in rem). Read it as a sentence: controls `sp-md` apart, cards pad `sp-lg` → `sp-xl` from 768 px, blocks `sp-xl` apart, sections `sp-3xl` → `sp-4xl`.
- Every control is at least `h-ctl` (44 px) tall.
- Staff and admin use the sidebar shell; the menu is always visible from 900 px and scrolls with edge fades and arrows instead of a scrollbar. The member app uses a bottom dock below 900 px and a top bar above.

## Motion

- Controls respond in `dur-fast` (120 ms); cards lift in `dur-base` (200 ms) on `ease-out`.
- Hub and dashboard tiles reveal progressively (`dur-reveal`, staggered). Nothing loops except ambient light.
- Everything honours `prefers-reduced-motion` and `prefers-reduced-transparency`.

## Accessibility

- Text meets 4.5:1 (3:1 at 24 px+) in light and dark; limewash tiles measure 6.5–11.8:1.
- Focus is a solid 2 px `color-focus` ring offset 2 px on every interactive element.
- Status always carries a word or icon; class tones are never the only cue.

## Iconography

Lucide outline icons through one `Icon` atom: sizes `icon-xs` → `icon-xl` (14–32 px), stroke 1.75 at rest and 2.25 for the active menu or dock item. No emoji, no filled icon sets.

## Logo

The HOY script wordmark (`assets/Logos`) in deep blue on light grounds, cream or yellow on deep blue. Clear space equals ⅓ of the script height; minimum 120 px wide.
