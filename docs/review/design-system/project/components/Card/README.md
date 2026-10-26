The paper surface that holds every panel, list and form, and the blue-stone hero for the one thing that matters most.

**Use**
- `card` — paper (`color-surface`) with the paper grain and linen weave, `r-md` corners, `shadow-card`, padded `card-pad` (16 px phone, 24 px from 768). Title in `card-title`, an optional eyebrow above it.
- `card-primary` — the deep-blue stone hero (`brand-deepBlue` + travertine mottling + grain): the next class, the hub build tile, a gift card. At most one per screen. Text is `color-text-on-primary`; eyebrows at 82%.
- Interactive cards lift to `shadow-raised` and move 2 px up on hover (`dur-base`, `ease-out`).

**What the consumer provides:** a title, optional eyebrow and actions (top right), body content; `padding` sm/md/lg; `raised`; `interactive`.

**Rules**
- Cells in a grid keep their natural height — never stretch an empty card to "balance" a row; pair it with real content instead.
- Rows inside a card are separated by `color-border` hairlines, padded `sp-md` vertically.
- Nested corners follow inner = outer − padding.
