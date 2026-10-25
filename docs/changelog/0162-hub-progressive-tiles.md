# 0162 — Hub tiles with progressive disclosure

date: 2026-10-26
version: 0.25.0
prompt: docs/prompts/0162-hub-progressive-and-motion.md

- Trigger: the hub and its role services looked unbalanced, misaligned and text-cluttered; the request was to show detail progressively (hover/click) without deep nesting, accessible and premium.
- Decision:
  - Every HUB-01 tile has two layers. At rest: icon, one status flag (only when it says something: coming soon, training, not built, you are here), the name, who it enters as, and the enter pill. On hover, keyboard focus or the ⓘ toggle: the purpose (3 lines max), the route and the secondary link fade in inside the same tile.
  - Tiles have fixed heights per kind (member tones 18rem, team seats 15.5rem; 17rem/15rem on phones), so footers line up across a row and nothing shifts when details open.
  - The ⓘ toggle is a real button with `aria-expanded` / `aria-controls` and a bilingual label (`hub.details.show` / `hub.details.hide`); on touch screens hover never sticks the layer open. The details stay in the DOM for screen readers and the tests.
  - Grids are 4 columns on desktop, 2 under 1100 px, 1 under 560 px. The teacher and front-desk tiles get their own icons; each seat has a tone.
- Rejected: a click-to-expand accordion (changes tile heights and breaks the grid rhythm); a modal per service (one level too deep for a launcher); tooltips (not reachable on touch, too small for the purpose text).
- Checks: equal tile heights and aligned footers at 1280 and 375, no horizontal overflow, no details overflow; test-public-entry, test-website-preview, test-promotions-guide, test-promotion-ui, test-problem-report-ui, test-problem-draft, test-clean-hub, test-continuation-library-ui and test-sidebar-groups pass; `npm run build` passes (spacing lint 58, baseline 60).
- Files: src/modules/hub/{HubPage.tsx,hub.css,strings.ts}, docs/screenshots/HUB-01/*, docs/kanban.md.
