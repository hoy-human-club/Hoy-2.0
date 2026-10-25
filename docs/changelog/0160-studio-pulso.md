# 0160 — Studio look: the staff workspace in Pulso

date: 2026-10-25
version: 0.25.0
prompt: docs/prompts/0160-studio-pulso.md

- Trigger: "use these colour theme and style to all the internal component and UI", with the coming-soon page (Direction C "Pulso") as the reference. A neutral project-board direction was mocked first and set aside; the Pulso reference (artifact "HoyOS Studio UI", v0.2) was approved.
- Decision:
  - D-01 gains `studio` (tokens.ts → tokens.css): `:root[data-look="studio"]` re-maps the semantic roles to the coming-soon materials (cream ground hoy-c20, paper tiles brand-white, flat surfaces with no grain or stone shadows, larger radii, DM Sans for controls and numbers, ink primary fill in light). Only existing palette values; every selector excludes the wireframe skin. Dark keeps the base dark accent (river fill, cream text), because `--color-text-on-primary` also sits on blue surfaces (room blocks, the next-class card) and inverting it would break them.
  - DesktopShell sets `data-look="studio"` on <html> in a layout effect (before paint) and removes it on unmount, so staff, admin and build pages and the drawers and toasts they portal to <body> follow it; the member app and website never do.
  - Components restyled in that scope: Card (serif title; the primary card becomes the river hero with breathing rings and a sun action), StatTile (in a grid, tiles take river, sun, clay and moss in turn with deep ink, paper on moss), Tabs (pill track, ink active pill), Toast (dark ink tile), Notice (info = sun tile), EmptyState (italic serif), Button (cream secondary pill), Badge (success/warn inks a step deeper on paper). Global: h1/h2 in the editorial serif.
  - DesktopShell: the sidebar is the coming-soon blue tile floating on the ground with breathing rings, cream text, the active item as the sun pill, sun Demo badge, a sun workspace switcher and the cream wordmark; the top bar sits on the ground with a serif page name; the phone drawer keeps the tile with one rounded edge.
  - D-01 page (/dev/tokens) shows the Studio tokens; D-02 metas gain a "studio look" state.
  - Also fixed: in dark, the unread bell count and the room grid "Ahora" marker were cream on light coral (1.9:1); they take the dark ground.
- Rejected: a neutral project-board look (mocked as v0.1, set aside for Pulso); scoping the tokens to `.deskshell` (drawers and toasts render outside it, and aliases resolved on :root would not follow); a cream primary in dark (navy on blue elsewhere); serif for controls and numbers.
- Checks: contrast scan of 11 staff pages in light and dark (text ≥ 4.5:1, large ≥ 3:1; disabled and dimmed rows excluded; transitions finished first) — clean after the badge, room-time and bell fixes; member app and site confirmed without the look; phone drawer without horizontal overflow. test-sidebar-groups and the booking-flow suite (8/8) pass; `npm run build` passes, spacing lint at baseline 60.
- Files: src/design/{tokens.ts,tokens.css}, src/styles/global.css, src/components/template/DesktopShell/{DesktopShell.tsx,DesktopShell.css,DesktopShell.meta.ts}, src/components/molecule/{Card,StatTile,Tabs,Toast,Notice,EmptyState,NotificationBell}/*, src/components/atom/{Button,Badge}/*, src/components/organism/RoomDayGrid/RoomDayGrid.css, src/modules/dev/{TokensPage.tsx,strings.ts}, docs/screenshots/M-01/sidebar-*, docs/kanban.md.
