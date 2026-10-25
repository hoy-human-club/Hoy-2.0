# 0164 — Member home and front-desk check-in: balance and calm

date: 2026-10-26
version: 0.25.0
prompt: docs/prompts/0164-home-checkin-balance.md

- Trigger: after the hub (0162), the same balance and clutter fixes for the member home (C-01) and the front-desk check-in (S-02), in the same progressive style.
- Decision:
  - **C-01 Home.**
    - From 900 px the blocks pair into rows instead of two independent columns: the next class sits beside the quick actions, and today beside the practice block.
    - Each block is a head + body subgrid, so the eyebrows share a line and the bodies share a height.
    - The quick actions become a 2×2 grid of tone tiles that fill the hero's height.
    - The studio announcement is one quiet line under the greeting instead of a card; the plan nudge also runs full width.
    - The streak tile carries this week's dots, so "this week" lives in one place; the two counts share the row below. Without a goal, the goal question and the week card stay under the counts.
    - Phones keep the flat layout-editor order.
  - **S-02 Check-in.**
    - Today's classes and the "book another class" picker share one head line. The picker keeps its accessible name and the visible label became screen-reader-only.
    - The "tap a class" hint was removed, and the demo note became a footnote.
    - Row actions: "Check in" always shows on the right of the row. "No-show" and "Undo" appear on row hover or keyboard focus, and always on touch.
    - The redundant "Checked in" badge is gone from the checked-in group, whose header already says it.
    - The undo-policy explanation is an info-icon note.
    - The walk-in explanation sits behind a native "How it works" disclosure.
- Rejected:
  - Hiding the class picker behind a toggle: the desk books future classes often, and one extra click per booking is a cost.
  - Collapsing roster groups: the desk needs to see who arrived at a glance.
  - Equal-height columns through JavaScript, where the subgrid does it in CSS.
  - A new disclosure component, where native `<details>` already gives keyboard and screen-reader behaviour.
- Checks:
  - Home rows aligned at 1280: hero and quick actions share top and bottom; today and practice share top and bottom.
  - No horizontal overflow at 375. Contrast clean on both pages in light and dark; the existing sidebar group labels and the inactive language toggle in dark were not touched.
  - Tests pass: test-audit-repairs-ui, test-reporting-ui, test-desk-package-ui, test-desk-settlement-ui, test-transfer-receipts-ui, test-sidebar-groups, test-signin-preview-ui, test-signup-consent-ui, test-reschedule-future-ui and test-reschedule-ui (dev server).
  - `npm run build` passes (spacing lint 58, baseline 60).
- Files: src/modules/customer/{HomePage.tsx,customer.css,pulso.css}, src/modules/staff/{CheckinPage.tsx,staff.css,strings.ts}, docs/kanban.md.
- Strings: `staff.checkin.walkin.how` added; `staff.checkin.future.choose` now reads "Book another class…"; `staff.checkin.strip.hint` removed (unused).
