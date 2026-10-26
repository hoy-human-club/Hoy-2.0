# 0173 — Design system showcase page

date: 2026-10-27
version: 0.25.0
prompt: docs/prompts/0173-design-system-showcase.md

- Trigger: "make it visually aesthetic to present in a good way to the client". The GitHub folder from 0172 read as a file listing.
- Decision:
  - **Showcase page.** `public/design-system/index.html` is a self-contained page that Vite copies into `dist/`. It is served at `https://hoy-human-club.github.io/Hoy-2.0/design-system/` and lives outside the app router, so no route, spec or module is involved.
    - Contents: blue-plaster hero with the cream wordmark and arch motif; 01 principles; 02 colour (brand, surfaces, the seven limewash tones with measured contrast, status); 03 typography (specimens and scale); 04 materials (limestone, blue plaster, paper, stone, linen, leaf shadow); 05 components (the front-desk home rebuilt from the system, plus buttons and chips); 06 shape, depth and space (with voice, motion, accessibility); closing band with links.
    - Behaviour: light/dark switch remembered per viewer; reveal on scroll, off for reduced motion; phone layout down to 390 px with no horizontal scroll.
    - It uses the logos and photographs already in `public/`.
  - **README.** `docs/review/design-system/README.md` becomes a visual landing page: hero banner, quick links, one rendered image per chapter (`showcase/*.jpg`), a dark-mode drawer and the folder table.
- Rejected:
  - A React route inside the app (it would sit behind the app shell and the demo session, and the client should not need a role).
  - A PDF (static; the page lets the client switch themes and feel the hover states).
- Values: every colour, radius, shadow, spacing step and duration is copied from D-01 (`src/design/tokens.ts`, Studio look) and `src/styles/materials.css`; none is new. The page is outside `src/`, so the spacing lint does not apply to it.
- Checks: rendered at 1440 (light and dark) and 390 px; no horizontal scroll. Tone contrast was computed: river 7.6, sun 11.7, clay 7.7, moss 6.5, sage 8.7, slate 8.3, plum 7.3 : 1.
- Files: public/design-system/index.html, docs/review/design-system/README.md, docs/review/design-system/showcase/*.jpg, docs/prompts/0173-design-system-showcase.md, docs/kanban.md.
