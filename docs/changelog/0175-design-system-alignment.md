# 0175 — Design system page: alignment pass

date: 2026-10-27
version: 0.25.0
prompt: docs/prompts/0175-design-system-alignment.md

- Trigger: the user sent a full-page screenshot of `/design-system/` with "Please fix it alignment and make it awesoem looking".
- Diagnosis (measured at 1440 px, not eyeballed):
  - Chapter leads ended at x 1301 instead of the content edge at 1328 (`max-width: 36rem`).
  - Sub-heading leads started at x 784 and x 971: they used flex with `space-between`, not the lead column at 725.
  - Principle titles sat at different heights (`margin-top: auto` with titles that wrap differently).
  - The front-desk mock-up columns were 447 px and 402 px tall.
  - The depth card was half empty.
  - The pill and arch labels were clipped by their curves.
- Decision:
  - **Chapter headers and sub-headings share one two-column grid:**
    - leads run x 752–1328 on every chapter and sub-heading;
    - each chapter header starts with a hairline rule and a labelled marker (sun dot, "NN · Name").
  - **Principles:**
    - rows are numeral, title (bottom-aligned in a fixed row), then body, so titles and copy line up across the five cards;
    - numerals sit on the limewash discs (river, sun, clay, moss, sage), and cards lift on hover;
    - on phones the numeral sits beside the title.
  - **Components:**
    - the desk's left list shows three classes, so both columns end together at 402 px;
    - the chips card gets a third rule, so it ends with the buttons card.
  - **Foundations:**
    - the depth card gains "Pressed" and "Stone hero" (six samples);
    - round shapes centre their labels;
    - spacing values are right-aligned tabular numbers;
    - the motion disc sits beside its heading.
  - **Colour:** the Sun swatch note is shortened to one line, so its text lines up with the other swatches.
  - **README:** `docs/review/design-system/showcase/*.jpg` were re-rendered.
- Rejected: stretching short cards to equal height with empty space. Balance comes from content (the 0168 rule).
- Values: unchanged; `hoy.css` was not edited.
- Checks: re-measured after the change, in light and dark at 1440 and at 390, with no page errors and no horizontal scroll.
- Files: public/design-system/index.html, docs/review/design-system/showcase/*.jpg, docs/prompts/0175-design-system-alignment.md, docs/kanban.md.
