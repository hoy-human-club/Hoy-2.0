# 0177 · Home photo cards

date: 2026-11-07
version: 0.25.0
prompt: docs/prompts/0177-home-photo-cards.md
intent: Present the first two Home plan cards with their selected full-photo backgrounds and readable light text.
decision: Use responsive warrior-blue sources for the trial card and existing pricing-duo sources for the standard package, with an isolated gradient layer in Latest and Photos. Synchronize media inventory and regression assertions.
rejected: Extending this treatment to Plans, private classes or Santa María; those surfaces retain their existing presentation and terms.
files: src/modules/website/pages/HomePage.tsx, src/modules/website/sanctuary.css, src/modules/website/strings.ts, src/data/mediaCatalog.generated.json, public/images/studio-2026/warrior-blue-*.webp, scripts/*media*, scripts/test-website-aleja-design.mjs, scripts/test-website-artwork-catalog.mjs, docs/pages/W-01.md

W-01 only. Trial and standard-package prices and links remain data-driven. Private-class styling, Plans, shared PackageCard, footer, finale, CMS precedence and historical editions remain unchanged. No backend or permission change.

Fresh build, media model/catalogue drift, 16 Home language/viewport/theme/edition groups and 32 combined Home/Plans captures pass locally. Captures are private local verification evidence; they are not included in this public change. Remote exact-head checks and release remain separate gates.

Resumen: Las dos primeras tarjetas de Inicio usan fotos completas con texto claro; precios y condiciones no cambian.
