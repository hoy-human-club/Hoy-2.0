# 0154 — Stage 1: Combobox, Tabs and the demo bar

date: 2026-10-23
version: 0.25.0
prompt: docs/prompts/0154-stage-1-structure.md

- Trigger: stage 1 of the Between Gigs polish (0153). The S-02 scheduled-class picker was a native select over every future class (≈180 rows, one long line each); the M-06 segments were pills under a tablist with the count inside the label; the desktop top bar mixed demo tools (user switcher, View as, Dev mode, spec chip) with the controls staff use.
- Decision:
  - New molecule `Combobox` (D-02): ARIA 1.2 combobox over a listbox drawn by the system. Typing filters label, hint and group, accent- and case-insensitive, every word must match; options grouped under sticky day headings; arrows / Enter / Escape; 60 rows at a time with "N more · keep typing". S-02 uses it with time · class on the main line and teacher · spots below.
  - New molecule `Tabs` (D-02): Between Gigs' single tab style — underline, optional count pill (shown at 0), one row that scrolls and never wraps, roving tabindex with ←/→/Home/End, `aria-controls` to a tabpanel. M-06 segments use it; the member list is the tabpanel.
  - DesktopShell: a recessed demo bar above the top bar holds the demo-user switcher, View as, Dev mode and the spec chip. The top bar keeps search, language, theme and inbox. The switcher is now reachable below 1080 px too (it was hidden there). The 0035 phone rules for the spec chip in the top bar are retired with it.
- Rejected: restyling the native select (the OS list still clips long options and cannot filter); SegmentedControl for the CRM segments (it is a 2–4 way view toggle; five named subsets with counts are tabs); hiding the demo tools behind a menu (the team switches users constantly while testing); gating the bar on a build flag now (no production build exists yet — the bar is the single place to drop it, HALL-16).
- Not in this change: the Hoy status vocabulary (waiting for Jas and Justin).
- Tests: scripts/test-desk-package-ui.mjs picks classes through the combobox (type the title, click the option) instead of `selectOption`. `#rs-user` keeps its id, so test-sidebar-groups and test-content-recovery-context-ui still find it.
- Files: src/components/molecule/Combobox/{Combobox.tsx,Combobox.css,Combobox.meta.ts}, src/components/molecule/Tabs/{Tabs.tsx,Tabs.css,Tabs.meta.ts}, src/components/template/DesktopShell/{DesktopShell.tsx,DesktopShell.css}, src/modules/staff/CheckinPage.tsx, src/modules/admin/CrmPage.tsx, src/modules/admin/strings.ts, src/i18n/core.ts, scripts/test-desk-package-ui.mjs, docs/kanban.md.
- Components: Combobox (new, S-02), Tabs (new, M-06). Chip keeps M-06 through the member page; Select keeps its other usages.
