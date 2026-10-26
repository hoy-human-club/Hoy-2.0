# 0171 — Tactile buttons and limewash tones

date: 2026-10-26
version: 0.25.0
prompt: docs/prompts/0171-buttons-tones.md

- Trigger: "I think some buttons lost their shadow and style. I feel like the colors dont look great. yellow orange green".
- Diagnosis:
  - The Studio look (0160) flattened secondary buttons, chips and option tiles (`box-shadow: none; border-color: transparent`). On flat cream that read as a tint; on the plaster ground (0170) it read as unfinished.
  - The large tone tiles used the full-strength class dots (`--tone-*-dot`), which are meant for dots and markers, and 0170's stone mottling muddied them (yellow read as mustard, clay as brick).
- Decision:
  - **D-01 adds `--tone-*-wash`** for every class tone: the pigment softened toward the plaster, `color-mix(dot 64%, #F4EDE0)`; in dark mode `color-mix(dot 66%, #B8B0A0)`. It is also exposed through the tone hooks as `--t-wash`. KPI tiles, quick tiles, hub tone tiles and member practice tiles use it. Dots, bars and small markers keep the full-strength `--tone-*-dot`. The moss tiles switch from white to ink text.
  - **Limewash tiles** carry only the paper tooth plus a soft top light (no dark stone mottling). The dark heroes (next class, hub build) keep the stone.
  - **Tactile controls in the Studio look:**
    - Secondary buttons, unselected chips and payment-option tiles are paper pills: a hairline edge, a top highlight and a soft contact shadow, with a deeper lift on hover and pressed in on press.
    - Primary buttons and selected chips get a lift.
    - Outline buttons keep a visible edge.
    - Dark mode gets its own versions.
- Rejected:
  - Desaturating the dots globally (they carry class identity in calendars and rosters).
  - Paper tiles with only a tone icon (it loses the brand's colour language).
  - Keeping stone on the coloured tiles.
- Checks:
  - Contrast measured on the computed colours: KPI tiles 6.5–11.8:1 in light; dark passes after the base was raised from #9C9486 to #B8B0A0 (moss had been 4.0:1).
  - Tests pass: test-sidebar-groups, test-promotions-guide, test-desk-sale-ui, test-class-management-ui, test-website-preview.
  - `npm run build` passes.
  - Before/after comparisons are in docs/screenshots/tones/.
- Files: src/design/tokens.ts (+ generated tokens.css), src/styles/materials.css, src/components/molecule/StatTile/StatTile.css, src/modules/hub/hub.css, src/modules/staff/staff.css, src/modules/customer/pulso.css, docs/screenshots/tones/*, docs/kanban.md.
