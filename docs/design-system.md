# Design system (D-01, D-02)

## Tokens (`src/design/tokens.ts`)
Single source of truth; `tokens.css` is generated from it (`npm run tokens`, also part of `npm run build`) and
imported once in `main.tsx`. Every value is lifted from the canvas (`reference/canvas/Hoy Wellness System.dc.html`,
v1.5) for the active brand **hoy 2026**, from the brand board (`reference/brand/p8-1.png`) and from the canvas D-01
artboard. Nothing invents a value off this file.

- **Brand palette** (`--brand-*`): cream `#F1E7D2` (neutral base), light yellow `#F7F3B2`, deep blue `#35597D`,
  mid blue `#5F85B1`, ink `#1C2E42`, sand `#E7DCC6`, paper `#FBF7EF`.
- **Canvas palette** (`--hoy-c1 … --hoy-c26`, `--hoy-dg`, `--hoy-cat`): the canvas colour tokens for
  `data-brand="hoy"`, kept whole so the mapping below is auditable.
- **RGB triplets** (`--m-*`): the canvas `--m1 … --m10`, used inside `rgba()` by every shadow and texture so dark can
  recolour them.
- **Semantic roles** (`--color-*`): ground, bg (frame), lane, surface, surface-elevated/2/3/4, text, ink, text-muted,
  text-faint, text-on-primary, text-on-inverse, primary (accent as text), accent-fill (accent as a fill),
  accent, accent-soft, highlight/on-highlight (pricing badge), border, border-strong, success/warn/danger, focus,
  scrim; `--gradient-frame`, `--gradient-tile`.
- **Class tones** (`--tone-*`): seven hue-named tones (moss, river, clay, sun, sage, slate, plum) used by chips, class rows, calendar dots, room blocks and empty media frames; one per modality, chosen in M-02 modalities.
- **Shadows** (`--shadow-*`): the canvas Depth layer verbatim — `card` (`.surf2` tiles: inset highlight + contact +
  soft), `raised` (`.surf` panels, six layers), `frame` (phone/desktop frame), `accent` (buttons, active pills),
  `inverse` (deep-blue cards), `lane`, `pressed`, `pressed-deep`. Aliases `highlight`, `contact`, `soft` are the three
  layers of `card`.
- **Textures** (`--tex-*`): the canvas Texture layer as pure CSS — `lane`, `surf`, `accent` (two 1 px repeating
  gradients + a radial light pool), `paper` (graph paper behind component demos), `ph` (image placeholder stripes).
  `--tex-lane-on / --tex-surf-on / --tex-accent-on` are what components apply; dark and wireframe set them to `none`.
- **Materials** (`--mat-*`): Sand, Light, Sky, Deep, Linen — decorative fills for hero art, gift cards, empty art.
- **Type**: Inter (headings, `--ls-tight: -0.02em`, colour `--color-ink`) + DM Sans (body) from Google Fonts with
  metric-adjusted `Inter Fallback` / `DM Sans Fallback` `@font-face` (see `global.css`). Scale `--fs-2xs … --fs-4xl`;
  eyebrows are `--fs-2xs` uppercase `--ls-eyebrow .14em` in `--color-text-faint`.
- **Spacing**: one 4 px scale in rem `--sp-0 · --sp-px · --sp-2xs … --sp-5xl` plus the semantic layer — see
  "Spacing and sizing" below (0037). The numeric `--sp-1 … --sp-16` remain as aliases for one pass.
- **Radii** (rem since 0037, so corners scale with `--ui`): `--r-2xs 2` · `--r-xs 4` (code tags) · `--r-sm 8` ·
  `--r-ctl 12` (controls, date cells; was 11) · `--r-md 16` (cards) · `--r-lg 24` · `--r-xl 32` · `--r-full`; the
  canvas device constants `--r-frame 18` (desktop frame) and `--r-phone 34` (DeviceFrame bezel) stay off the scale.
- **Motion**: `--dur-fast/base/slow`, `--dur-spin 1.1s`, `--dur-breath 7s`; the breathe keyframes are the canvas's
  (`scale .82 → 1.08`, `opacity .5 → .95`).

## Canvas var → HoyOS token
| Canvas | Value (hoy, light) | HoyOS token | Used for |
| --- | --- | --- | --- |
| page ground | `#E7DCC6` | `--color-ground` | hub ground; behind the DeviceFrame in the simulator |
| `.surf` (frame) | `#FBF7EF` | `--color-bg`, `--gradient-frame` | app background (AppShell is full-viewport, D-0006) / DeviceFrame fill |
| `.surf2` (tile) | `#F5EEE1` (`--c13/--c19/--c25`) | `--color-surface` | cards, tiles, list groups, tables |
| D-01 Elevated | `#FFFCF6` | `--color-surface-elevated` | raised cards, hover |
| `--c17` | `#EFE7DA` | `--color-surface-2` | muted cards, code blocks |
| `--c20` (pressed) | `#EDE4D4` | `--color-surface-3` | segmented tracks, toggles, meters |
| `--c16` | `#E3DBCB` | `--color-surface-4` | avatar / photo placeholder |
| `.lane`, `--c21` | `#F1E7D2` | `--color-lane` | desktop sidebar, site footer |
| `.ink`, `--c3/--c11` | `#1C2E42` | `--color-ink` | headings |
| `--c2/--c10` | `#24384F` | `--color-text` | body text |
| `.dim` | `#4C5D70` | `--color-text-muted` | secondary text |
| `rgba(var(--m3),.5–.6)` | `rgba(36,56,79,.55)` | `--color-text-faint` | eyebrows, hints |
| `--c1` (`.accent` fill) | `#35597D` | `--color-accent-fill` | buttons, selected chips, active nav, inverse cards |
| `--c1` / `--cat` (text) | `#35597D` / dark `#9BC0E4` | `--color-primary` | links, active labels, deltas |
| `--c13` | `#F5EEE1` | `--color-text-on-primary` | text on accent fills |
| `.inverse` ink | `#F1E7D2` | `--color-text-on-inverse` | text on inverse cards |
| `--c4` | `#5F85B1` | `--color-accent`, `--color-focus` | mid-blue accents, focus ring |
| `--c9/--c26` | `#9BAEC4` | `--color-accent-soft` | steel accents |
| `.pbadge` | `#F7F3B2` / `#4A4212` | `--color-highlight` / `--color-on-highlight` | pricing badge, highlight cards |
| `rgba(var(--m2),.12)` | — | `--color-border` | hairlines |
| select border | `rgba(53,89,125,.28)` | `--color-border-strong` | inputs |
| `--dg` | `#7E3B2C` / dark `#E0A08F` | `--color-danger` | negative deltas, destructive |
| `--m1` | `53,89,125` | `--m-primary` | accent shadows |
| `--m2` / `--m3` | `36,56,79` | `--m-shade` / `--m-ink` | shadows, grain (dark: `0,0,0`) |
| `--m4` | `95,133,177` | `--m-mid` | focus ring |
| `--m5` | `216,194,74` | `--m-sun` | hero glow |
| `--m7` | `155,174,196` | `--m-steel` | — |
| `--m8` | `241,231,210` | `--m-cream` | top bars at 90 % |
| `--m9` | `255,255,255` | `--m-light` | inset highlights |
| `--m10` | `251,247,239` | `--m-paper` | — |
| Depth `.surf2` shadow | — | `--shadow-card` | cards |
| Depth `.surf` shadow | — | `--shadow-raised` | drawers, raised cards |
| frame shadow (inline) | — | `--shadow-frame` | DeviceFrame bezel (hub previews, D-06) |
| Depth `.accent` shadow | — | `--shadow-accent` | primary buttons |
| Depth `.inverse` shadow | — | `--shadow-inverse` | inverse cards, gift cards |
| Texture `.lane` | — | `--tex-lane` | body, sidebar, ground |
| Texture `.surf` | — | `--tex-surf` | frame, raised cards |
| Texture `.inverse/.accent` | — | `--tex-accent` | primary buttons, inverse cards |
| `.graphpaper` | — | `--tex-paper` | component library canvas |
| `.ph` | — | `--tex-ph` | media placeholders |
| D-01 textures | Sand · Light · Sky · Deep · Linen | `--mat-*` | hero art, gift cards |
| Class tones (`classTones`) | moss · river · clay · sun · sage · slate · plum | `--tone-{moss,river,clay,sun,sage,slate,plum}-{fg,dot,bg}` | chips, class rows, calendar dots, room blocks, empty media frames; one per modality, chosen in M-02 modalities |
| radii 4 · 8 · 11 · 16 · 18 · 24 · 32 · 34 | — | `--r-xs … --r-phone` | — |
| `@keyframes breathe` 7 s, `spin` 1.1 s | — | `--dur-breath`, `--dur-spin` | A-01 rings, spinners |

## Between Gigs bridge (0153)
HoyOS is being polished on the **Between Gigs** design system: its component structure, roles and rules, with every
value kept Hoy's. `bridge` in `tokens.ts` emits the Between Gigs semantic names as aliases of the tokens above, so new
and reworked components can read `--surface`, `--ink-muted`, `--action`, `--line`, `--info-soft` … and themes, skins and
the wireframe pass re-colour them through what they point at. The aliases add no pixel; the `--color-*` names stay valid.

| Between Gigs | HoyOS token | Use |
| --- | --- | --- |
| `bg` · `surface` · `surface-raised` · `surface-sunken` | `color-bg` · `color-surface` · `color-surface-elevated` · `color-surface-2` | page → card → floating → recessed (inputs, filter bars) |
| `surface-brand` | `brand-deepBlue` | hub/site heroes, sign-in; a dark-theme island in both themes |
| `ink` · `ink-body` · `ink-muted` · `ink-subtle` · `ink-brand` | `color-ink` · `color-text` · `color-text-muted` · `color-text-faint` · `color-primary` | headings · body · secondary · captions · eyebrows and checked controls |
| `action` · `on-action` · `action-strong` · `action-danger` | `color-accent-fill` · `color-text-on-primary` · `color-ink` · `color-danger` | one primary per view · decisive step ("Confirmar pago") · destructive |
| `highlight` · `on-highlight` | `color-highlight` · `color-on-highlight` | the sun marker and celebrations only — never a banner ground |
| `line` · `line-strong` · `focus` · `scrim` | `color-border` · `color-border-strong` · `color-focus` · `color-scrim` | hairlines · control borders · focus ring · overlays |
| `success` `warning` `danger` `info` (+ `-soft`) | `color-success` `color-warn` `color-danger` `color-info` (+ `-soft`) | status ink and its badge/banner ground; `info` is new (river ink `#2C4A6B` / `#9BC0E4`) |
| `neutral-soft` | `color-surface-3` | Not started, Archived, Cancelada |
| `cat-1 … cat-7` | `tone-<moss…plum>-dot` | class types and chart series, always with a label |

Open, not changed here: dark `action` stays `#35597D` (light blue `#9BC0E4` with an ink label is proposed, it nearly
merges with the dark page today); `ink-subtle` is translucent and ≈ 4.3:1 on `surface-sunken`, so captions stay on
`bg`/`surface` until it becomes a solid colour.

## Themes and skins
`<html data-theme="light|dark" data-skin="styled|wireframe">`. Dark re-maps the surfaces to the canvas's dark hoy
values (frame `#1B2E44`, tiles `#22384F`, lane `#16263A`, ground `#101C29`, ink `#F1E7D2`, dim `#A3B3C5`) and never
inverts accents: fills stay `#35597D`, text accents lighten to `--cat #9BC0E4`. Textures switch off in dark (as in the
canvas). Wireframe strips colour, texture and shadow, restores 1 px `#C9C4B8` borders (`--color-card-border`) and sets
Jost as the face, to review structure. `ThemeProvider` exposes toggles; choices persist in localStorage.

## Logo — the hoy wordmark (0033)

Source: *Manual de marca 2026* (slides 7 and 10). The logo is the handwritten script **"hoy"** plus **HUMAN CLUB** in
spaced caps; construction 6X wide × (3X script + X caps line).

| Rule | Value | Where it is enforced |
| --- | --- | --- |
| Clear space | the height of the H of HUMAN CLUB on all sides (= ⅓ of the script height) | `--wm-inline-gap` (0.12em) on top of the word space inside headings; the header gap (2.25rem) |
| Minimum size | 120 px wide on screen, 30 mm in print | `--wm-min-w`; the inline and header marks use `max(…, 120px / ratio)` |
| Colourways | #35597D on light · #F1E7D2 or #F7F3B2 on the deep blue | `Wordmark tone`: `auto` (blue in light, cream in dark), `blue`, `cream`, `yellow`, `current` |
| Print | blue | `@media print` in `Wordmark.css` |

**Assets** (`public/brand/`): `hoy-wordmark.svg` — the script traced from the manual's slide-3 artwork (the PDF holds it
only as raster), one path, `fill="currentColor"`, `<symbol id="hoy">` for `<use href>`; metrics in
`tenant.brand.vector` (ratio 1.985, baseline 0.73 of the height). `hoy-blue.png` / `hoy-cream.png` / `hoy-yellow.png`
stay for `<img>` uses (emails, receipts, the apps). `p8-2.png` / `p8-3.png` are the sand lockups.

**In headings** — `brandHeading(text)` (`src/components/atom/Wordmark/brandHeading.tsx`) swaps the standalone word
`HOY` (the tenant name, case-sensitive) for the inline mark: `--wm-inline-h` 1.2em tall, dropped so the script's
baseline sits on the text baseline, `role="img"` + `aria-label="HOY"`. Display headings only (website V2: page titles,
closing panels); never paragraphs, buttons, nav links, eyebrows, meta titles or `<title>`, and never the Spanish adverb
"hoy" ("today"). The places are listed in `docs/changelog/0033-site-wordmark-headings.md`.

## Component library (D-02)
Every component ships a `.meta.ts` (tier, description es/en, props, states, usages, a11y notes).
`/#/dev/components` renders all of them on the graph-paper canvas. Rule: no component without a meta, no meta
without a usage. Surface vocabulary shared by all of them: `.surf` (frame/panel), `.surf2` (tile), `.inverse`
(deep-blue card), `.ph` (placeholder) in `global.css`, and the `Card` tones `surface | primary | highlight | muted`.

## Icons (0030, v0.12.0)
One set, one seam: `src/components/atom/Icon/Icon.tsx` maps **135 names** (`IconName`) to [lucide](https://lucide.dev)
glyphs (ISC licence, named imports only, so the bundle carries just these). Nothing else imports `lucide-react`;
redrawing or swapping a glyph is one line in the map. D-02 (`/#/dev/components` → Icon) shows every name in five
groups: navigation, actions, settings, things and status, hub tools.

- **Tokens (D-01)**: `--icon-xs` 14 · `--icon-sm` 16 · `--icon-md` 20 · `--icon-lg` 24 · `--icon-xl` 32 px (rem, so
  they grow with `--ui`), `--icon-tile` 36 px (the tinted square behind a list-row or settings glyph),
  `--icon-stroke` 1.75 and `--icon-stroke-active` 2.25. `size` takes a step name or px.
- **Slots take the name**: `Button icon="user-plus"`, `ListRow icon="bell"`, `Card icon="clock"`, `EmptyState icon="inbox"`,
  `Notice icon=…`, `NavBar` items and `RouteDef.nav.icon` (typed `IconName`, so a nav entry cannot fall back to a
  box). `renderIcon()` draws a known name and passes any other node through (Avatar, a seeded literal glyph); an
  unknown kebab-case string warns in dev.
- **Active state is never colour alone**: the dock item gets a tinted pill behind a heavier stroke and a semibold
  label; the sidebar active pill and the settings rail thicken the stroke too.
- **Labels stay**: every icon is `aria-hidden` next to a visible label; an icon-only control (month arrows, remove
  card, inbox back) carries `aria-label` + `title`. Targets stay at `--h-ctl` (44 px) from the control, not the glyph.
- **Themes**: `currentColor` everywhere, so light, dark and wireframe inherit the container's contrast.

## Spacing and sizing (0037)
Justin's ask: every gap and size "picture perfect", with Client-First's good ideas and none of its confusion. The
answer is tokens plus a lint (D-0012), explained for people in `.claude/skills/ui-spacing/SKILL.md`.

**Scale** (base 4 px, rem so the `--ui` band scales it): `--sp-0` 0 · `--sp-px` 1 · `--sp-2xs` 2 · `--sp-xs` 4 ·
`--sp-sm` 8 · `--sp-md` 12 · `--sp-lg` 16 · `--sp-xl` 24 · `--sp-2xl` 32 · `--sp-3xl` 48 · `--sp-4xl` 64 ·
`--sp-5xl` 96. Old → new: `sp-1` xs · `sp-2` sm · `sp-3` md · `sp-4` lg · `sp-6` xl · `sp-8` 2xl · `sp-12` 3xl ·
`sp-16` 4xl (aliases kept); the off-grid `sp-5` (20), `sp-10` (40) and `sp-20` (80) are retired.

**Semantic layer** (every value is a scale step; responsive steps at viewport 768 and 1280):

| Token | Phone | ≥ 768 | ≥ 1280 | For |
| --- | --- | --- | --- | --- |
| `--gap-inline` | 8 | | | icon ↔ label, chip contents |
| `--gap-control` | 12 | | | between controls (`.row`, `.row-between`) |
| `--stack-tight` | 4 | | | eyebrow → heading, heading → lead |
| `--stack` | 8 | | | lead → body, label → control (`.stack-sm`) |
| `--stack-loose` | 16 | | | fields, paragraphs, blocks in a `.stack` |
| `--block` | 24 | | | blocks in a card, page or section; page head → first block |
| `--card-pad` | 16 | 24 | | `Card padding="md"`, equal on all sides |
| `--card-pad-lg` | 24 | 32 | | `Card padding="lg"`, plan and feature cards |
| `--section` | 48 | 64 | | page sections (website `.site-section`) |
| `--section-hero` | 64 | 96 | | website hero and full-bleed bands |
| `--gutter` | 16 | 24 | 32 | `.container`, AppShell / DesktopShell side padding |
| `--grid-gap` | 16 | 24 | | `.grid`, card grids |
| `--row-pad` | 12 × 16 | | | `ListRow`, `RosterRow`, choice rows (min-height `--h-ctl`) |
| `--btn-pad-x` | 16 | | | `Button` md (sm 12, lg 24; vertical 0, height `--h-ctl` / `--h-ctl-lg` 48; `--h-ctl-sm` 36 for `sm` in a dense row, 0049) |
| `--measure` | 65ch | | | `.prose` line length |

**Rules**
1. Module CSS never writes a raw px/rem for margin, padding, gap, inset (top/right/bottom/left) or the size of a
   control (≤ 64 px). Allowed: 1 px borders and nudges ≤ 2 px marked `/* optical */`.
2. Layout sizes (grid columns, widths, hero heights, website type) are rem, not px, so a 3840 screen keeps the
   rhythm; a rem token is never multiplied by `var(--ui)` (it already scales — 0037 removed the hub's double scaling).
3. Card padding equal on all sides; inner radius = outer − padding.
4. Eyebrow → h2 and heading → lead `--stack-tight`; lead → body `--stack`.
5. Buttons pad `0 × --btn-pad-x`; icon-only controls are square (`.ctl-round`).
6. List rows `--row-pad`, grids `--grid-gap`, sections `--section`, consecutive sections one `--section` apart.
7. Every target ≥ 44 × 44 px, text links in a card head included; nothing hover-only. **Dense-row exception (0049):**
   inside `RowActions` a `Button size="sm"` is 36 px visible (`--h-ctl-sm`) and keeps a 44 px hit area through a
   transparent `::before` that extends ±4 px vertically; `npm run audit:spacing` counts that hit area.
8. Blocks inside a section start on the section's left edge (no stray centring).

**Enforcement.** `npm run lint:spacing` (`scripts/spacing-lint.mjs`) scans `src/**/*.css` and inline
`style={{ margin/padding/gap }}` props and fails when the count grows above `scripts/spacing-baseline.json`; `npm
run build` runs it in report mode (a one-line summary, same failure rule). 0037 took the count from **774 to 71**;
the 71 left are component geometry (switch knobs, dots, meter heights, avatar ovals, badge offsets, the element
cursor) and are listed in the baseline file. `npm run audit:spacing -- --route=… --widths=…` measures a live page
(sibling gaps, card padding, targets under 44 px, optional 4 px grid overlay).

**Deviations from the brief, recorded.** The website keeps a 24 px minimum side gutter on phones (editorial
layout; the app keeps 16). `--r-ctl` moved 11 → 12 to sit on the scale. Chips pad 4 × 12 (was 6 × 12) so status
chips stay compact; chips in a tab row still take the 44 px floor.

