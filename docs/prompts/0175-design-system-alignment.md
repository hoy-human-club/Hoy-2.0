# Design system page: alignment pass

(screenshot of the full design system page) Please fix it alignment and make it awesoem looking

## Response

On `ui-polish/design-system-alignment`, the alignment problems were measured and then fixed:

- **Leads and sub-headings.** Chapter leads stopped 27 px short of the content edge. The sub-heading leads started at different x positions (784 and 971 instead of the lead column). All of them now share one two-column grid, and every lead runs x 752–1328.
- **Chapter headers.** Each header now has a hairline rule and a labelled chapter marker ("01 · Principles").
- **Principles.** The cards are top-aligned: titles and body copy start on one line across all five, and the numerals sit on limewash discs. On phones, the numeral sits beside the title.
- **Front-desk mock-up.** The two columns now end on one line (they were 447 and 402 px tall).
- **Buttons and chips cards.** They now end together.
- **Depth card.** Six samples fill it; Pressed and Stone hero were added.
- **Round shapes.** Labels are centred on the pill/disc and the arch.
- **Spacing ruler.** The values are right-aligned.
- **Motion card.** The breathing disc moved next to the heading.
- **Sun swatch.** The note is shortened to one line.
- **GitHub README.** The images were re-rendered.

See changelog 0175.
