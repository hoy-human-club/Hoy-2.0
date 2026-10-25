# 0163 — Subtle depth and platform motion

date: 2026-10-26
version: 0.25.0
prompt: docs/prompts/0162-hub-progressive-and-motion.md

- Trigger: "provide a very subtle 3d emersive experience for components and their interaction without a distraction. And implement animation to the platform."
- Decision:
  - Depth (`src/design/depth.ts`, installed once in `main.tsx`): one delegated pointer listener tilts the surface under a mouse at most 2.5° toward the pointer, lifts it 3 px, deepens its shadow and lets a faint light follow the pointer. Surfaces: hub tiles, interactive cards, KPI stats, class cards, customer quick actions, and anything marked `data-depth`. Updates are throttled to one per frame.
  - The transform exists only while hovered (`.is-depth`), so at rest no card becomes a containing block for fixed menus or popovers.
  - Motion (`src/styles/motion.css`): page sections in both shells and the hub rise in once, 40 ms apart, capped at 240 ms; buttons, chips, tabs, segmented controls and nav links give slightly when pressed.
  - Only the D-01 motion tokens (`--dur-fast/base/slow`, `--ease-out`) and the material shade (`--m-shade`) are used; no new values.
  - Off for touch and coarse pointers; everything (tilt, sheen, entrances, press) is off under `prefers-reduced-motion`.
- Rejected: a 3D library (e.g. react-parallax-tilt): a dependency for ~40 lines; per-component tilt hooks, which would touch every component and its meta; scroll-triggered reveals, which distract on long staff pages and hide content from quick scanning; a stronger tilt (5–10°), which reads as a gimmick.
- Checks: real-hover check on the hub (≈1.6° tilt, 3 px lift, shadow applied, released on leave); `npm run build` passes; the hub test suite above passes with motion on (test-website-preview also checks reduced motion).
- Files: src/design/depth.ts, src/styles/motion.css, src/main.tsx, docs/kanban.md.
