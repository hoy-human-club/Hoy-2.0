# 0161 — The testing hub as a bento (layout B)

date: 2026-10-25
version: 0.25.0
prompt: docs/prompts/0161-hub-bento.md

- Trigger: "Provide me some UX friendly layout of this to choose from" (a screenshot of HUB-01). Four layouts were mocked on the "HoyOS Hub Layouts" canvas (A role launcher, B bento overview, C explorer, D journey map); B was chosen.
- Decision:
  - HUB-01 is rebuilt in the coming-soon (Pulso) language: a river hero with breathing rings, the serif headline with the sun mark, a lead that tells testers what to do, and the session bar inside it (RoleSwitcher + "Open {name}'s home" sun button); a sun tile counting down to opening day (tenant.opensOn).
  - The promotions practice is a sun-edged banner; what a member sees is four class-tone tiles (river, sun, clay, moss); the team's eight seats are paper tiles with a tone dot; the build experiences are rows on an ink tile; the nine tools are pills beside the stats.
  - Every tile keeps what testers rely on: the experience name and purpose, who it enters as, its route, its secondary link, the coming-soon Placeholder, the "You are here" badge and a status badge only when a screen is not built. Agent actions (hub.enterAs, hub.openTool…) are unchanged; data still comes from the hub map (hubMap.data.ts).
  - Live screen previews are removed from the tiles: they made the page long and mostly empty frames; the page canvas and the simulator still show every screen. The HUB-01 spec is updated to match.
- Rejected: A (role launcher) and C (explorer) for now — B was chosen; keeping previews inside the bento tiles (heavier, and the main complaint was length); a dark brand band.
- Checks: contrast scan light and dark (fixed: labels on the moss tile, the language toggle on the ground); no horizontal overflow at 375 and 1280; test-public-entry, test-website-preview, test-promotions-guide, test-promotion-ui, test-problem-report-ui, test-problem-draft, test-clean-hub, test-continuation-library-ui and test-sidebar-groups pass; `npm run build` passes, spacing lint 58 (below the 60 baseline).
- Files: src/modules/hub/{HubPage.tsx,hub.css,strings.ts,specs.ts}, generated public/hub-map.json, docs/screenshots/HUB-01/*, docs/screenshots/M-01/sidebar-*, docs/kanban.md.
