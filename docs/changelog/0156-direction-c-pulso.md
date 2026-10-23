# 0156 — Direction C "Pulso": coming soon and member home

date: 2026-10-23
version: 0.25.0
prompt: docs/prompts/0156-direction-c-pulso.md

- Trigger: three bold visual directions were mocked on a design canvas (A Luz, B Noche roja, C Pulso); C was chosen.
- Decision:
  - W-11 is a bento of rounded tiles on sand. Hero tile on brand blue holds the approved tagline (italic last line, sun marker), the intro and the Instagram CTA, over slowly breathing rings (`--dur-breath`; still under reduced motion). The sun tile holds the opening day from `tenant.opensOn`, and says "Próximamente" once it has passed. The tall tile is the approved red-studio photo (0066). Four class tone tiles and a list tile show the seven brand classes (`tenant/brand.ts` classes: name and tagline, tone from D-01), each once. Login stays a quiet link (0058). Phones stack the tiles in two columns, then one.
  - C-01 Home gets the same language through a scoped stylesheet (`src/modules/customer/pulso.css`): editorial greeting, every card a rounded tile, the next-class card as the blue hero tile with the rings and a sun action, the four quick actions as tone tiles, the streak tile on clay and the balance tile on sun. No component or data changes.
  - Text on tone tiles: the ink mixed 50 % toward black on river, clay and sun, paper on moss — each ≥ 4.5:1. Checked on C-01 in light and dark.
- Rejected: the unassigned group photo from the mockup on the public root (no recorded approval; the approved red-studio photo stays and the tests pin it); new marketing copy from the mockup ("Muévete con nosotros") in place of the approved tagline; restyling the shared Card / StatTile / ClassCard components globally (only C-01 changes in this pass).
- Not in this change: Pulso on the other member pages and the public site; lead capture.
- Tests: scripts/test-website-preview.mjs passes (16 checks, ES/EN, 344–3840, Login dialog, reduced motion). W-11 captures regenerated.
- Files: src/components/template/ComingSoonLanding/{ComingSoonLanding.tsx,ComingSoonLanding.css,ComingSoonLanding.meta.ts}, src/modules/coming-soon/{strings,specs}.ts, src/modules/customer/{HomePage.tsx,pulso.css}, docs/pages/W-11.md, docs/screenshots/W-11/*, docs/kanban.md.
