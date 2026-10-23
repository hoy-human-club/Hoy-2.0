# 0153 — Between Gigs token bridge and launch-screen polish

date: 2026-10-23
version: 0.25.0
prompt: docs/prompts/0153-between-gigs-bridge.md

- Trigger: UI polish of HoyOS on the Between Gigs design system (structure and rules from Between Gigs, every value from Hoy). Audit of v0.25.0 found clipped and wrapping values on M-01 and S-02 and the sun yellow used as a banner on C-01 / E-01.
- Decision:
  - D-01 `bridge`: the Between Gigs semantic names (`bg`, `surface`, `ink`, `action`, `line`, status + soft grounds, `cat-1…7`) emitted as aliases of existing tokens. No pixel changes; `--color-*` stay valid. New values only where Between Gigs needs a role Hoy lacked: `color-info` and the four `color-*-soft` grounds (light, dark, wireframe light/dark).
  - M-01: revenue KPI uses `formatCOPCompact` (`$8 M`, full amount in the title); `StatTile` re-fits after `document.fonts.ready`, since the first fit measured the metric fallback and the real heading face then ellipsised ("$ 8.020.0…"). The "Hoy en un vistazo" time column sizes to its content and never wraps.
  - S-02: teacher times use the new `.time` utility (one line, tabular figures). `GlobalSearch` is a size container: under 15rem it drops the placeholder and key hint instead of clipping "Buscar páginas y persona"; the glyph and sr-only label remain.
  - C-01 / E-01: the "no package yet" nudge is an info `Notice` instead of a highlight `Card`; the yellow is kept for markers and celebrations.
- Rejected: changing `formatTime` to emit non-breaking spaces (scripts/test-studio-timezone.mjs pins it to raw Intl output, and every caller would change); hiding `SiteVersionSelect` outside dev mode (test-studio-hero / test-photography-ui drive it as a visitor and the team reviews editions with it, so it is an owner decision); recolouring dark `action` in this pass (visible change, awaiting approval).
- Not reproduced on this head, so not changed: P-01 horizontal page scroll at 800 px (`scrollWidth` equals the viewport; only the class-arch carousel extends, by design), the empty site logo (a capture during load), the clipped class chips on S-02.
- Files: src/design/tokens.ts, src/design/tokens.css (generated), src/i18n/format.ts, src/components/molecule/StatTile/StatTile.tsx, src/components/molecule/GlobalSearch/GlobalSearch.css, src/styles/global.css, src/modules/admin/DashboardPage.tsx, src/modules/admin/admin.css, src/modules/staff/CheckinPage.tsx, src/modules/customer/HomePage.tsx, src/modules/customer/pages/blocks.tsx, docs/design-system.md, docs/kanban.md.
- Components: no new component; `Notice` (existing, D-02) gains two usages; `Card tone="highlight"` keeps its other usages.
