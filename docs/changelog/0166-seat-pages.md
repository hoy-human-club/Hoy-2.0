# 0166 — The team seats' pages: balanced and decluttered

date: 2026-10-26
version: 0.25.0
prompt: docs/prompts/0166-seat-pages.md

- Trigger: "Fix all of the dashboard inside them". This means the pages behind the hub's eight team-seat tiles. Front desk (S-02) and the admin dashboard (M-01) were done in 0164 and 0165, so this covers the other six.
- Decision:
  - **Inbox (S-06):** from 900 px the reading pane fills the screen height and stays beside the list while it scrolls. "Pick a conversation" or a short thread no longer leaves a blank column, and a thread's message area takes the full pane.
  - **Point of sale (S-04):**
    - The demo note and the daily count draft share one bar (the opened draft takes the whole bar).
    - The quote notice moved into the summary rail, under the summary card, so the totals and the pay button stay in view.
    - The rail now sticks below the sticky top bar; it used to slide under it.
  - **CRM (M-03):** the segment tabs and the search share one bar, and the demo note became a footnote under the list.
  - **Transactional messages (M-10):**
    - The ~70-template list scrolls inside its own column beside the editor, with no scrollbar and a fade at the foot. The page went from about 4,300 px to about 1,700 px tall.
    - The two standing notes (local simulation, every email is a suggestion) sit side by side.
  - **Finance (M-09):**
    - The subscriptions link joined the range chips in the head row instead of a row of its own above the page.
    - The visible "M-09a" spec code was removed from the payouts card; spec codes show only in dev mode.
  - **Marketing (MarketingDraftBoard):**
    - From 1100 px the month calendar sits on the left, with campaigns and undated drafts stacked beside it; brand references run full width below.
    - The in-page h1 is visually hidden like every other page (kept for screen readers).
- Rejected:
  - Collapsing the notices into disclosures: their exact texts are part of the bilingual test contract and they carry the demo boundary.
  - Paginating the email templates: the scroll column keeps every template one click away.
  - Moving the point-of-sale summary above the steps.
- Checks:
  - Inbox pane 132–812 at a 1280×800 viewport. Transactional messages page height 1,733 px (was about 4,300).
  - Tests pass: test-email-edit-ui, test-email-test-ui, test-marketing-drafts-ui, test-reporting-ui, test-reporting-special-ui, test-sensitive-audit-ui, test-operational-active-account-ui, test-desk-sale-ui, test-pending-package-ui, test-contact-mask-ui, test-payroll-draft-ui.
  - Dev-server tests pass: test-reporting-read-ui, test-email-edit-states, test-email-test-states, test-marketing-draft-fences-states.
  - `npm run build` passes (spacing lint 58, baseline 60).
- Files: src/modules/staff/{RegisterPage.tsx,staff.css}, src/modules/admin/{CrmPage.tsx,EmailsPage.tsx,FinancePage.tsx,admin.css}, src/components/organism/MarketingDraftBoard/{MarketingDraftBoard.tsx,MarketingDraftBoard.css}, docs/kanban.md.
