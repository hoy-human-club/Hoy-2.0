Small pills for filtering a view and for naming a class type by its tone.

**Use**
- Filter chips (`button.chip`) — date ranges, filters and segmented choices in a row. Unselected chips are tactile paper pills (`shadow-pill`); the selected chip is the ink pill (`color-accent-fill`, `shadow-ink-lift`). One selected per group unless the group is multi-select.
- Tone chips (`chip-tone`) — the class type in rosters, schedules and bookings: a translucent tone ground, the tone's `fg` ink and a `tone-*-dot`. In dark mode the ink is the dot mixed 30% toward `color-ink` so it holds 4.5:1.

**What the consumer provides:** the label (`{ es, en }`), `selected`, and for tone chips the class `tone` id (river, sun, clay, moss, sage, slate, plum).

**Rules**
- Interactive chips are at least `h-ctl` tall; tone chips are labels and can be compact.
- Chips in a tab row stay on one line.
- Tone names are never shown as words — the class name is the label.
