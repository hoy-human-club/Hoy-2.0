<p align="center">
  <a href="https://hoy-human-club.github.io/Hoy-2.0/design-system/"><img src="showcase/hero.jpg" alt="HOY Design System — Pulso Materia" width="100%"></a>
</p>

<h1 align="center">HOY Design System</h1>

<p align="center">
  <i>Pulso Materia — plaster, paper, stone and linen for a wellness studio.</i><br>
  HOY Wellness Center · Medellín · v0.25.0 · October 2026
</p>

<p align="center">
  <a href="https://hoy-human-club.github.io/Hoy-2.0/design-system/"><b>View the design system →</b></a>
  &nbsp;·&nbsp;
  <a href="https://hoy-human-club.github.io/Hoy-2.0/">Live app</a>
  &nbsp;·&nbsp;
  <a href="https://hoy-human-club.github.io/Hoy-2.0/#/hub">Testing hub</a>
  &nbsp;·&nbsp;
  <a href="project/README.md">Brand book</a>
  &nbsp;·&nbsp;
  <a href="project/tokens.json">Tokens</a>
</p>

<br>

> HoyOS is designed the way the studio is built: sun-washed limestone plaster, blue plaster, paper, travertine stone and linen in morning light. The software should feel like the room it serves.

<br>

## 01 · Principles

<img src="showcase/principles.jpg" alt="Five principles" width="100%">

**Material before colour** · **One clear action** · **Calm density** · **Pigment is precious** · **Bilingual by default**

<br>

## 02 · Colour

<img src="showcase/colour.jpg" alt="Brand colours, surfaces, class tones and status" width="100%">

Deep blue `#35597D` is the identity, with cream, sun yellow and ink. Surfaces are warm paper over plaster. Seven class tones name the practices: full pigment for dots and bars, softened limewash for tiles, with ink text at 6.5–11.7 : 1.

<br>

## 03 · Typography

<img src="showcase/type.jpg" alt="Cormorant Garamond and DM Sans" width="100%">

**Cormorant Garamond** is used for greetings and titles. **DM Sans** is used for everything people read and tap. There is one display line per screen.

<br>

## 04 · Materials

<img src="showcase/materials.jpg" alt="Limestone plaster, blue plaster, paper, stone, linen, leaf shadow" width="100%">

Materials sit behind content, never on top of text. Each ground stays within a few percent of its flat colour, so contrast is unchanged. Dark mode replaces the photographs with procedural stone.

<br>

## 05 · Components

<img src="showcase/components.jpg" alt="The front-desk home built from the system" width="100%">

<img src="showcase/controls.jpg" alt="Buttons and chips" width="100%">

Limewash KPI tiles, the stone hero, paper lists, tactile quick actions and linen notes. Buttons and chips are pills at least 44 px tall: one ink pill per view, paper pills for everything else.

<details>
<summary><b>Dark mode</b></summary>
<br>
<img src="showcase/hero-dark.jpg" alt="Hero in dark mode" width="100%">
<img src="showcase/components-dark.jpg" alt="Components in dark mode" width="100%">
</details>

<br>

## 06 · Shape, depth & space

<img src="showcase/foundations.jpg" alt="Corners, depth, spacing, voice, motion, accessibility" width="100%">

Soft corners (24 px cards, 32 px heroes, pills for controls) and paper that lies almost flat. Controls have a tactile feel, and one 4 px spacing rhythm scales from a phone to a 4K reception screen.

<br>

---

### What's in this folder

| | |
|---|---|
| [**Design system page**](https://hoy-human-club.github.io/Hoy-2.0/design-system/) | The presentation: an interactive page with a light/dark switch (source: [`public/design-system/index.html`](../../../public/design-system/index.html)) |
| [`project/README.md`](project/README.md) | The brand book: principles, voice, colour, type, materials, depth, spacing, motion, accessibility, icons, logo |
| [`project/tokens.json`](project/tokens.json) | Colour (light + dark), type, spacing, radius, shadow and motion tokens, each with a usage note |
| [`project/components/`](project/components/) | Button, Chip, Card, StatTile, Notice and Materials guidelines and previews |
| [`screens/`](screens/) | Every component preview rendered in light and dark |

<sub>The source of truth is the code: <code>src/design/tokens.ts</code> (D-01) and <code>src/styles/materials.css</code>. This folder is a snapshot of those values. All demo content is fictional.</sub>
