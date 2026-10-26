Pill-shaped actions: one ink pill per view for the main action, tactile paper pills for everything else.

**Use**
- `btn-primary` — the one main action in a view or card ("Reservar clase", "Confirmar check-in"). `color-accent-fill` (ink in light, deep blue in dark) with `color-text-on-primary` and `shadow-ink-lift`.
- `btn-secondary` — every other action. Paper (`color-surface`) with a top highlight, a `rgba(ink,.12)` hairline and `shadow-pill`; on hover it lifts to `shadow-pill-hover`, on press it sinks to `shadow-pill-pressed` and moves 1 px down.
- `btn-outline` — exports and filters that sit on the plaster ground; keeps a visible edge.
- `btn-tonal` — repeated row actions (a 24% tint of `color-accent`, `color-primary` text, no shadow).
- `btn-ghost` — cancel and tertiary links. `btn-danger` — destructive and irreversible actions only.

**What the consumer provides:** a short verb label in Spanish and English (`{ es, en }`), an optional leading icon (lucide, 1.75 stroke), `size` sm/md/lg, `loading`, `disabled`.

**Rules**
- Height is never under `h-ctl` (44 px); `btn-lg` is `h-ctl-lg` (48 px). Padding is `0 sp-lg` (`sp-xl` for large).
- Label: DM Sans 600, 14 px (16 px large), sentence case, no trailing punctuation.
- Never two primary pills side by side; never a primary pill on a deep-blue hero (use secondary there).
- Disabled is 50% opacity and keeps its shape; loading shows a spinner and keeps the label at 60%.
- Focus: a 2 px `color-focus` ring offset 2 px.
