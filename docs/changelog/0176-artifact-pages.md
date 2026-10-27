# 0176 — UI polish review pages on GitHub Pages

date: 2026-10-27
version: 0.25.0
prompt: docs/prompts/0176-artifact-pages.md

- Trigger: the user asked to push every review page made on claude.ai to the repo it belongs to, so the pages can be shared without a claude.ai account.
- Decision: four static pages are copied as they are published, each in its own folder under `public/artifacts/`. Vite copies `public/` into the build, so Pages serves them at `/Hoy-2.0/artifacts/<page>/`:
  - `before-after/` is Hoy Before and After, with its 14 screenshots in `shots/`;
  - `studio-ui/` is HoyOS Studio UI;
  - `navigation-architecture/` is HoyOS Navigation Architecture;
  - `polish-plan/` is Hoy UI Polish Plan.
- Not copied:
  - The HoyOS Project Board runs on live data stored on claude.ai, so a static copy would be empty.
  - HOY Design System, Hoy Bold Directions and HoyOS Hub Layouts are built on claude.ai page types, and their exported files are only an empty shell.
  - All of these stay as claude.ai links in the Project Link Hub.
- Rejected: `public/hub/`, because that path already holds the HUB-01 page.
- App code: unchanged. Nothing under `src/` was touched.
- Files: public/artifacts/**, docs/prompts/0176-artifact-pages.md, docs/kanban.md.
