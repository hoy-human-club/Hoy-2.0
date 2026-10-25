# 0169 — Content (M-02, the marketing home): two control rows, a progressive bulk editor, no empty columns

date: 2026-10-26
version: 0.25.0
prompt: docs/prompts/0169-content-page.md

- Trigger: "give the Content page (marketing home) its own balance and declutter pass on a new branch, with screenshots".
- Critique:
  - Five rows of chrome in four different control styles pushed the table to about 680 px down a 900 px screen:
    1. search + create
    2. sections
    3. records + price note
    4. schedule link + view buttons
    5. demo note
  - The bulk editor was always open.
  - "Default theme" and "Default description" were dashes on every row.
  - The section chips were smaller than the record chips under them.
- Decision:
  - **Shared content sub-navigation** (all five M-02 pages): the page actions ride on the right of the sections row.
  - **Content page, second row:** record tabs on the left; on the right, a Table / List segmented switch, a "Bulk update" toggle and the Class Schedule link.
  - **Bulk editor:** progressive. It opens from its toggle or as soon as a row is ticked, and stays open while a preview, an undo or a result needs it.
  - **Notes:** the demo and price notes are one footnote.
  - **Table:** a column that is empty on every record is left out of the table (the drawer still edits it), and the select column is checkbox-width.
  - **Section chips** match the record chips' size.
  - The table now starts at about 260 px instead of 680.
- Rejected:
  - Removing the bulk editor from the page (a modal is one level too deep for a frequent batch task).
  - Hiding columns permanently (they appear as soon as any record has a value).
- Checks:
  - Screenshots: docs/screenshots/seats/home-marketing-1440*.png.
  - Tests pass:
    - Preview build: test-class-management-ui (now opens Bulk update first), test-content-recovery-ui (Create button located in the sub-navigation actions), test-content-recovery-context-ui, test-content-photo-picker, test-media-access-ui, test-profile-review-ui, test-sidebar-groups.
    - Dev server: test-media-library.
  - `npm run build` passes (spacing lint 58, baseline 60).
- Files: src/modules/admin/{ContentPage.tsx,contentNav.tsx,admin.css}, scripts/test-class-management-ui.mjs, scripts/test-content-recovery-ui.mjs, docs/screenshots/seats/home-marketing-*, docs/kanban.md.
