# 0174 — Design system HTML/CSS build view

date: 2026-10-27
version: 0.25.0
prompt: docs/prompts/0174-design-system-build-view.md

- Trigger: "Pus it to the site as a html/css build view". The user chose a code view on the design system page.
- Decision:
  - **One stylesheet.** The tokens (light and dark) and component styles moved out of the page's inline `<style>` into `public/design-system/hoy.css`, which is linked from the page.
    - Each block starts with an `/* @component Name */` marker.
    - Page layout styles stay inline in the page.
    - The page renders the same as before; this was checked by screenshot.
  - **Chapter 07, "HTML/CSS build", on `/design-system/`:**
    - A component list (tabs, arrow keys) with ten items: page starter, Button, Chip, Class tone chip, KPI tile, Next-class card, Paper card, Quick action, Notice, Tokens.
    - A live preview stage and HTML / CSS tabs with syntax colour.
    - The CSS tab is read from `hoy.css` by marker and expanded to one declaration per line.
    - A "Needs …" note, a copy button (it falls back to selecting the text) and a `hoy.css` download.
  - The GitHub README gains chapter 07 with an image and a two-line usage example.
- Rejected:
  - Keeping CSS strings in the page's script (they would drift from what renders).
  - A separate code page (the client and developers should see the component and its code together).
- Values: unchanged; `hoy.css` is the same D-01 snapshot as 0173.
- Checks: rendered at 1440 in light and dark and at 390 px, with no page errors and no horizontal scroll. Long code lines scroll inside the code panel.
- Files: public/design-system/hoy.css, public/design-system/index.html, docs/review/design-system/README.md, docs/review/design-system/showcase/build.jpg, docs/prompts/0174-design-system-build-view.md, docs/kanban.md.
