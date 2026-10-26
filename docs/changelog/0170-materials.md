# 0170 — Pulso Materia: stone, plaster, linen and leaf light in the product

date: 2026-10-26
version: 0.25.0
prompt: docs/prompts/0170-materials.md

- Trigger: client feedback on the review PDF, "Cool, but its missing the stone, and textures, and cloth, materials, etc", and the user's "Let's implement them".
- Diagnosis: the brand is tactile (travertine, sun-washed limestone plaster, leaf shadows, linen). The materials already existed: the sanctuary photographs, the D-01 materials and textures, and the stone and carved shadows. The Studio look (0160) switched all of them off, so the workspace read as flat colour.
- Decision: a single materials layer, `src/styles/materials.css`, that puts the materials behind content, never on top of text.
  - **Ground:** the limestone plaster photograph under a cream veil (84%; the hub 82%) for the staff workspace, the hub and the apps, with a faint leaf-shadow wash from the sunlight photograph falling across the top-right (masked, multiply, 18%). The top bar is frosted over it.
  - **Menu and hub hero:** blue plaster, the blue photograph multiplied into the river blue.
  - **Paper:** cards, tables and panels carry a paper tooth and a linen weave.
  - **Stone:** tone KPI tiles, the next-class hero, quick tiles, the member practice tiles and the hub tone and build tiles carry travertine mottling plus grain.
  - **Cloth:** notes and drawers carry the linen weave.
  - **Dark mode:** procedural stone instead of the light photographs (no glow); the menu stays dark blue plaster.
  - **New D-01 textures (procedural, no files):** `--tex-grain` (fractal-noise paper tooth), `--tex-stone` (low-frequency travertine mottling), `--tex-linen` (weave).
  - **Fixes found on the way:** a full class's "Full" label on the blue hero was red on blue (1.1:1) and is now sun yellow; the dark quick-action icon chips were near-invisible and are now light.
- Rejected:
  - Photographs behind text-dense surfaces (cards), where procedural grain keeps the tooth without hurting legibility.
  - The foliage photograph (too busy behind tables).
  - Stronger veils under 80%, which made the crack lines compete with content.
- Checks:
  - Contrast scan on seven pages in light and dark: clean apart from the pre-existing inactive "ES" toggle in dark.
  - Tests pass: test-public-entry, test-sidebar-groups, test-audit-repairs-ui, test-problem-report-ui, test-promotions-guide, test-continuation-library-ui, test-website-preview, test-class-management-ui, test-desk-sale-ui.
  - `npm run build` passes; the three textures are bundled once (115–203 kB each).
  - Before/after comparisons are in docs/screenshots/materials/, and docs/screenshots/seats/ was recaptured.
- Files: src/styles/materials.css (new), src/main.tsx, src/design/tokens.ts (+ generated tokens.css), src/components/organism/ClassCard/ClassCard.css, src/modules/staff/staff.css, docs/screenshots/{materials,seats}/*, docs/kanban.md.
