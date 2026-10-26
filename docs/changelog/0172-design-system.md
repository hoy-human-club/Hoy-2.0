# 0172 — HOY Design System, client edition

date: 2026-10-27
version: 0.25.0
prompt: docs/prompts/0172-design-system.md

- Trigger: "Provide the design system to send to the client", then "Push it to the github and provide the link".
- Decision:
  - The client gets an interactive design system: a Claude artifact made from the Design System type (https://claude.ai/artifact/B9jAL3bAv4cvVqyDH3r7YN).
  - It contains:
    - a brand book (principles, voice, colour, type, materials, depth, spacing, motion, accessibility, icons, logo);
    - `tokens.json` in light and dark, from the Studio-look values in D-01, including the 0171 `--tone-*-wash` hexes computed from their `color-mix`;
    - Button, Chip, Card, StatTile, Notice and Materials cards with guidelines;
    - a cover;
    - the logos and material photographs as assets.
  - A snapshot of the source files and every preview rendered in light and dark is kept in `docs/review/design-system/`, so the repository shows the same content on GitHub.
- Not in this release:
  - The previews are static HTML and CSS, not the React components.
  - Fonts load from Google Fonts; the Cormorant Garamond and DM Sans files are not bundled.
- Rejected:
  - A PDF-only style guide (it cannot be browsed or kept in step with the tokens).
  - Exporting the dev tokens page (`/#/dev/tokens`), which is an engineering view and needs a developer login.
- Source of truth is unchanged: `src/design/tokens.ts` and `src/styles/materials.css`. The snapshot invents no values.
- Files: docs/review/design-system/** (README, project/**, screens/*), docs/prompts/0172-design-system.md, docs/kanban.md.
