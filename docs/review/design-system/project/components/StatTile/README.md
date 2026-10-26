A KPI tile: a label, one figure with an optional trend, and a hint, painted in a limewash class tone.

**Use**
- A KPI row takes the tones in order: river, sun, clay, moss (`tone-*-wash`), repeating every four tiles.
- The wash is the pigment softened toward the plaster — `tone-*-dot` at 64% over `#F4EDE0` (66% over `#B8B0A0` in dark). It carries only the paper grain and a soft top light; no stone mottling.
- All text on a wash is `stat-ink` (#0e1721): 6.5–11.8:1 in light, ≥ 4.5:1 in dark.
- A tile alone (outside a KPI row) is plain paper with `color-ink` figures.

**What the consumer provides:** `label`, `value` (preformatted, es-CO number format), optional `trend` (up / down / flat with its text) and `hint`.

**Rules**
- Figure: DM Sans 700, 28 px, -0.03em, tabular numerals. It shrinks to fit (to 50%) and never wraps.
- Label and hint clamp to two lines so tiles in a row keep one height.
- Never use the full-strength `tone-*-dot` as a tile fill — dots and bars only.
