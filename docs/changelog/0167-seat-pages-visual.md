# 0167 — Seat pages and the hub's bottom band, rebuilt against real screenshots

date: 2026-10-26
version: 0.25.0
prompt: docs/prompts/0167-seat-pages-visual.md

- Trigger: "These pages looks ugely and don't fall in my requirement. The balance. Spacing and all the stuffs I've asked you don't matche at all. Fix them and send me the SS". 0166 had been checked by measurement only. A second message added "This section in the Hub page don't looks good as well" (the build and tools band).
- Decision. Every page was captured at 1440×900, both the viewport and the full page (`scripts/capture-seats.mjs`), reviewed as an image, fixed, and captured again.
  - **Check-in (S-02)**
    - A balanced top band: today's classes and the door search on the left, teachers today and walk-in on the right. The last card in each column grows, so both end on one line.
    - The roster runs full width with its groups side by side, as equal-height cards. The undo note sits inside its card. The page fits one screen.
  - **Inbox (S-06):** a two-pane app one screen tall. The list and the pane share a height, conversations scroll inside the list (no scrollbar, a fade at the foot), and the empty state is no longer a box in a box.
  - **Point of sale (S-04)**
    - Step 3 (how they pay) moved beside the summary: who and what on the left, how and the total on the right. The columns end within about 45 px of each other.
    - The payment methods are an even 2-column grid of tiles.
    - The closed count draft reads as a quiet tool line instead of a serif heading.
  - **Transactional messages (M-10)**
    - Three columns of one height (list, preview, editor), each scrolling inside itself with no scrollbars and a fade.
    - The standing demo notes are quiet paper lines instead of bright banners.
  - **Finance (M-09)**
    - The range filters sit at the left of the head row and the apps link at the right.
    - Spec codes are gone from the Payroll / Expenses link labels and the payroll note.
    - Workspace tables page instead of scrolling inside themselves, so there is no inner scrollbar.
  - **Marketing:** one header row (boundary note and who) and one toolbar (actions and empty state). The month calendar sits beside a side column whose two cards split its height, and the brand references are one row of four.
  - **Hub, bottom band**
    - "How it is run and how it is built" is one clean list of evenly spaced rows. It was two ragged columns that left a hole and broke "knowledgebase" mid-word.
    - The nine tools are an even 2-column grid of tiles with the "New" badge at the right; the last one spans the row.
    - Both cards end on one line.
- Rejected:
  - Judging layouts by numbers alone.
  - Sticky side rails as the balance fix: a full-page view still shows the short column ending.
  - Hiding the demo-boundary notes: their texts are part of the bilingual test contract.
- Checks:
  - Screenshots for all six pages (viewport and full) and the hub band are in `docs/screenshots/seats/`.
  - 22 browser tests pass on the production build: test-public-entry, test-audit-repairs-ui, test-reporting-ui, test-desk-package-ui, test-desk-sale-ui, test-pending-package-ui, test-contact-mask-ui, test-transfer-receipts-ui, test-desk-settlement-ui, test-sensitive-audit-ui, test-email-edit-ui, test-email-test-ui, test-marketing-drafts-ui, test-reporting-special-ui, test-payroll-draft-ui, test-sidebar-groups, test-website-preview, test-promotions-guide, test-promotion-ui, test-problem-report-ui, test-clean-hub, test-continuation-library-ui.
  - 4 dev-server tests pass: test-reporting-read-ui, test-email-edit-states, test-email-test-states, test-marketing-draft-fences-states.
  - `npm run build` passes (spacing lint 58, baseline 60).
- Files:
  - src/modules/staff/{CheckinPage.tsx,RegisterPage.tsx,staff.css}, src/modules/admin/{admin.css,strings.ts}
  - src/components/organism/MarketingDraftBoard/{MarketingDraftBoard.tsx,MarketingDraftBoard.css}, src/components/template/DesktopShell/DesktopShell.css, src/modules/hub/hub.css
  - scripts/capture-seats.mjs (new), docs/screenshots/seats/*, docs/kanban.md
