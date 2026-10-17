version: 0.24.5
date: 2026-10-17

# 0069 — Organized role sidebars

- Version: 0.24.5
- Date: 2026-10-17
- Intent: Make longer admin and super-admin sidebars easier to scan and collapse.
- Decision: Reuse RouteDef.nav.group and DesktopShell. Filter by the existing role access first; show only nonempty categories. Keep Overview visible initially, fold secondary categories until needed, and reveal the active category on navigation. Users can fold the current category too. Persist per user, effective role and surface without copying one user's preferences to another.
- Alternative rejected: New navigation/permission registry or one huge Administration accordion. The existing route registry remains authoritative.
- Files: admin/voucher route metadata, shared bilingual strings, DesktopShell and D-02 metadata, focused browser regression, manifests/version and documentation.

## Interaction and verification

Native category buttons expose aria-expanded/aria-controls with 44 px targets. Sidebar navigation scrolls independently of its brand/footer. Mobile keeps a full drawer after desktop collapse, traps focus, closes with Escape and removes hidden links from keyboard navigation. Focused QA covers role-filtered groups, repeated toggle, keyboard toggle, persistence, active nested routes, Back/Forward, rail-to-mobile resize, ES/EN and responsive captures. No backend or access rules change.

## Verified evidence

Production build and independent code review pass. [Sidebar browser QA](https://github.com/imagine-os/hoy/actions/runs/38993316323) passed on c741e893: eight staff/admin/developer role perspectives, user/view-as isolation, repeated toggles, keyboard controls, persistence, nested-route/Back reveal, desktop-to-mobile resize, and ES/EN at 390/768/1280/1920/3840. Nineteen genuine browser captures include desktop dark mode and seven individual role views; representative M-01 captures are checked in. No browser page errors.
