# 0157 — Pulso across the first week: welcome, schedule, class, checkout, booking

date: 2026-10-24
version: 0.25.0
prompt: docs/prompts/0157-pulso-booking-flow.md

- Trigger: on opening day every member is new, so they see the first-time home (E-01) and the booking path, which still had the pre-Pulso look.
- Decision:
  - E-01: the welcome is the blue hero tile (title, body, "Ver clases de hoy", tour link) followed by the seven brand classes as tone tiles linking to the schedule; stats, trial nudge and notice stay.
  - C-03: the title block is a tile in the class's own tone (Fuego clay, Ligereza river…); the hero image and cards are rounded tiles.
  - C-08: an active, upcoming booking opens with a "Nos vemos el sábado, 7:00 a. m." tile in the class tone, with Share and Add to calendar (existing handlers). Its eyebrow says "Tu clase", not "confirmed": a transfer booking can still be waiting for payment, which the payment card states.
  - C-02 and C-04 join the Pulso scope (rounded tiles, editorial page title).
  - Shared: `.tone-tile` (global.css) fills a tile with its class tone and picks the text — deep ink on river, clay, sun, sage and slate; paper on moss and a deepened plum — each ≥ 4.5:1. `pulso.css` now scopes `.cust-home` and `.cust-pulso`.
  - Fixes found on the way, in shared components: ClassRow times no longer split ("6:00 a. / m.") and the time column sizes to its content; the SessionCalendar period title no longer capitalises every word ("23 De Octubre De 2026" → "23 de octubre de 2026"); the dark-theme neutral Badge goes from 3.9:1 to ≈ 6:1.
- Rejected: a 15-minute hold ring on the transfer path (the transfer flow has no hold timestamp to count down from; the existing ring stays on the declined-payment state); a class filter link from the welcome tiles (the schedule has no class parameter yet); "Reserva confirmada" on the booking tile.
- Checks: text contrast scanned on E-01, C-02, C-03, C-04 and C-08 in light and dark (all ≥ 4.5:1 / 3:1 large). No horizontal overflow at 390 px. Booking-flow UI tests: see the commit.
- Files: src/modules/customer/pulso.css, src/modules/customer/strings.ts, src/modules/customer/pages/{blocks,BookedPage,ClassDetailPage,CheckoutPage,SchedulePage}.tsx, src/styles/global.css, src/components/molecule/ClassRow/ClassRow.css, src/components/organism/SessionCalendar/SessionCalendar.css, src/components/atom/Badge/Badge.css, docs/kanban.md.
