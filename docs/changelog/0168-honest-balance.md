# 0168 — Honest balance: real content side by side, no padded empty cards

date: 2026-10-26
version: 0.25.0
prompt: docs/prompts/0168-honest-balance.md

- Trigger: "Do you think these pages and all that you've just build looks good in UX friendly way? And criticize them Please fix these in all the user role and make it balanced looking".
- Critique (what 0165–0167 got wrong):
  - Several "balanced" layouts were faked by stretching cards to equal height, leaving tall cards with nothing in them: check-in "Did not come", marketing's empty draft cards, the front-desk "No classes left today" hero, admin "Today at a glance", teacher next class, member "We rest today".
  - The inbox opened onto an empty void.
  - Bright sun-yellow info notices stacked into walls of yellow on emails and marketing.
  - Code-mono timestamps made every feed look like a log.
  - The maintenance home showed "On waitlist" twice and an empty "Quick actions" column.
- Decision:
  - **Notices:** a Studio info notice is now a quiet paper note with a sun edge and a sun icon, everywhere in the workspace.
  - **Check-in:** roster groups flow as a two-column masonry at natural height. Times use the body face with even digits. The walk-in action anchors to the foot of its card, level with the door search.
  - **Inbox:** with no thread open, the pane is a triage view. Unread threads are listed with the longest wait first: who, channel, how long ago, what they wrote, unread count and Reply.
  - **Emails:** the standing notes read in two lines (full text on hover or focus), and audience plus priority filters share one row, so the three-column workspace starts above the fold.
  - **Marketing:** the draft cards keep natural height, and brand references moved into the side column under them, beside the calendar.
  - **Front desk / coordinator / maintenance home:**
    - The day cell is the next class (when there is one) above today's list; the empty hero is gone.
    - With no quick actions there is no quick-actions column.
    - The duplicated waitlist tile became "Next class".
    - Messages and activity pair, and home cells keep natural heights.
  - **Admin / finance home:** "Today at a glance" leads full width; the occupancy chart pairs with the last five audit entries at matching heights.
  - **Teacher home:**
    - The headline numbers are compact, so the next-class card beside them is not stretched.
    - "My numbers" is a 4 + 3 grid, with the last tile spanning two columns.
  - **Member home:** a rest day shows "Coming up", the next four classes, instead of an empty card.
  - **Timeline:** timestamps use the body face.
  - **Capture script:** now also captures every role's home.
- Rejected:
  - Equal-height stretching as a balance technique.
  - Auto-opening the first unread inbox thread: opening marks it read, and the person never looked.
  - Hiding the demo-boundary notes: their texts are part of the test contract.
- Not changed, noted:
  - The Content page (marketing home) stacks four rows of controls above a wide table whose "default theme / description" columns are mostly empty. That is a data and editor question, left for a dedicated pass.
  - The "Existing vector wordmark" asset is cropped in the file itself.
- Checks:
  - Screenshots in docs/screenshots/seats cover the six seat pages and all nine role homes.
  - 27 browser tests pass on the production build: the 0167 set plus test-teacher-ownership-ui, test-operational-active-account-ui, test-signin-preview-ui, test-signup-consent-ui, test-reschedule-future-ui.
  - `npm run build` passes (spacing lint 58, baseline 60).
- Files:
  - src/components/molecule/Notice/Notice.css, src/components/organism/Timeline/Timeline.css, src/components/organism/MarketingDraftBoard/MarketingDraftBoard.css
  - src/modules/staff/{HomePage.tsx,InboxPage.tsx,staff.css,strings.ts}, src/modules/admin/{DashboardPage.tsx,EmailsPage.tsx,admin.css}
  - src/modules/customer/{HomePage.tsx,customer.css,strings.ts}, src/modules/teacher/teacher.css
  - scripts/capture-seats.mjs, docs/screenshots/seats/*, docs/kanban.md
