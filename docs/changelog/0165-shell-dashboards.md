# 0165 — Menu always there, no scrollbars, no in-page titles, balanced role homes, visible depth

date: 2026-10-26
version: 0.25.0
prompt: docs/prompts/0165-shell-dashboards.md

- Trigger:
  - The left nav disappeared: it turned into a hidden drawer below 900 px.
  - The nav showed scrollbars, including a horizontal one in the rail.
  - Dashboards had blank areas.
  - Page titles and subtitles took space the top bar already covers.
  - "The 3d look and feel is not there in the dashboard at all."
- Decision:
  - **Menu (DesktopShell)**
    - A phone (< 600 px) is the only size that hides the menu behind ☰.
    - From 600 to 1023 px the icon rail stays in its column, and ☰ lays the full menu over the page with a scrim.
    - From 1024 px up the person's expanded or rail preference applies, as before.
  - **No scrollbar in any state**
    - The menu list still scrolls by wheel, touch and focus.
    - A soft fade and a small up/down chevron appear only at an edge that hides items; the chevron scrolls one page.
    - Horizontal overflow is clipped, which also fixes the clipped Home pill in the rail.
  - **Page titles**
    - In the staff/admin/dev shell, every `.page-head` h1 and its subtitle are visually hidden. The top bar names the page, and screen readers and tests still get the heading.
    - A page head that also holds actions keeps them, right-aligned. One with nothing else takes no space.
  - **Balanced homes**
    - S-01 (front desk, coordinator, maintenance) is paired rows of equal height: next class beside a quick-action tile grid, today's classes beside messages (or activity), and activity across the full width.
    - M-01 (admin, super admin, finance): occupancy beside "today at a glance", and the audit trail across the full width.
    - S-03 (teacher): the next class beside the three headline numbers, today beside the specials. The seventh "my numbers" tile spans its row instead of leaving a hole.
    - C-01 was balanced in 0164. The marketing and developer homes measured balanced.
  - **Depth**
    - Tiles and cards now have a resting material: a top bevel, a bottom edge and a cast shadow, in light and dark.
    - The pointer tilt goes from 2.5° to 4°, with a 4 px lift and a deeper shadow. Cards nested in cards stay flat.
- Rejected:
  - Hiding the scrollbar only until hover: the user asked for none in any state.
  - Always-visible scroll buttons, which are noise when everything fits.
  - Deleting the h1 elements: that breaks the heading outline and tests.
  - A JavaScript masonry layout for the dashboards: CSS grid rows give equal heights.
  - A 3D tilt on every card: large list cards tilting is distracting.
- Checks:
  - Balance measured per role home (staff for desk, coordinator and maintenance; admin; marketing; developer; teacher). The only flags were the intended full-width cards.
  - The rail is visible at 746 and 768 px, with no scrollbar.
  - Contrast clean on S-01 in light and dark. Fixed: "Open check-in" on the blue tile now uses the deeper ink.
  - Tests pass: test-sidebar-groups (updated for the tablet rail), test-audit-repairs-ui, test-reporting-ui, test-contact-mask-ui, test-teacher-ownership-ui, test-teacher-ownership-states (dev server), test-desk-package-ui, test-problem-report-ui.
  - `npm run build` passes (spacing lint 58, baseline 60).
- Files:
  - src/components/template/DesktopShell/{DesktopShell.tsx,DesktopShell.css,DesktopShell.meta.ts}, src/components/atom/Icon/Icon.tsx (`chevron-up`), src/i18n/core.ts (`core.shell.moreUp/moreDown`)
  - src/design/depth.ts, src/styles/motion.css
  - src/modules/staff/{HomePage.tsx,staff.css}, src/modules/admin/{DashboardPage.tsx,admin.css}, src/modules/teacher/{HomePage.tsx,teacher.css}
  - scripts/test-sidebar-groups.mjs, docs/screenshots/M-01/sidebar-*, docs/kanban.md
