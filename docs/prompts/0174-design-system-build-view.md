# Design system HTML/CSS build view

Pus it to the site as a html/css build view

(Clarified: a code view on the design system page, a developer handoff.)

## Response

On `ui-polish/design-system-build-view`:

- The page's tokens and component styles now live in one stylesheet, `public/design-system/hoy.css`, served at `/design-system/hoy.css`. The page loads it, so what the code view shows is what renders.
- New chapter 07, "HTML/CSS build". It covers ten items: page starter, Button, Chip, Class tone chip, KPI tile, Next-class card, Paper card, Quick action, Notice and Tokens. Each one has:
  - a live preview;
  - HTML and CSS tabs, with the CSS read from `hoy.css`;
  - a copy button;
  - a note of what else it needs.
- A download link for `hoy.css`.
- The GitHub README gains a matching chapter.

See changelog 0174.
