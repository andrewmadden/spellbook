# Nathi's Interactive Spellbook — Design Spec

## Overview

A static website for managing Nathi's D&D 5e spellbook at the table. Displays spells as cards with sorting, filtering, prepared spell tracking, and spell slot usage.

**Character:** Nathi — Firbolg Artificer 1 / Wizard 11 (Order of Scribes)
**Total spells:** ~80 (after deduplication across race/class sources)

## Architecture

Multi-file vanilla JS static site. No build tools, no dependencies. Four files:

| File | Purpose |
|------|---------|
| `index.html` | Page structure, loads CSS and JS |
| `styles.css` | Dark mode styling, card layout, school colors |
| `app.js` | All interactivity: sorting, filtering, slot tracking, card expansion |
| `spells.json` | Static spell data extracted from D&D Beyond |

An additional `prepared.json` file stores the user's prepared spell list, editable by hand.

## Data Layer

### spells.json

Array of spell objects. Each spell:

```json
{
  "name": "Fireball",
  "level": 3,
  "school": "Evocation",
  "castingTime": "1 Action",
  "range": "150 ft",
  "duration": "Instantaneous",
  "components": "V, S, M (a ball of bat guano and sulfur)",
  "description": "Full spell description text...",
  "ritual": false,
  "concentration": false,
  "source": "Wizard"
}
```

Duplicates from multiple sources (race, artificer, wizard) are deduplicated, keeping the most complete version. Source field tracks origin.

### prepared.json

```json
{
  "prepared": ["Fireball", "Counterspell", "Magic Missile", "..."]
}
```

Edited by hand to change daily preparation. The UI also has toggle buttons for convenience (in-memory only — does not write back to file).

### Spell slot usage

Tracked in-memory (JS state). Resets on page load. This is per-session state that doesn't need persistence.

### Spell slot table (Artificer 1 / Wizard 11, multiclass rules)

| Level | Slots |
|-------|-------|
| 1st | 4 |
| 2nd | 3 |
| 3rd | 3 |
| 4th | 3 |
| 5th | 2 |
| 6th | 1 |

## UI Layout

### Header

- Character name "Nathi" with subtitle "Artificer 1 / Wizard 11 — Order of Scribes"
- Spell slot tracker: row of clickable pips per spell level (1st–6th). Click to mark used, click again to restore. "Reset Slots" button to refill all.

### Controls Bar

- **Sort dropdown:** Level (default), Alphabetical, School
- **Filter toggles:** "Prepared Only" toggle button, school filter chips (one per school present in spell list)
- **Search box:** Filters cards by spell name as you type

### Spell Card Grid

Responsive grid of spell cards. Each card:

- **Spell name** — prominent, top of card
- **Level + school badge** — color-coded pill/badge by school
- **Stat row** — casting time, range, duration in compact format
- **Components** — if any, shown below stat row
- **Tags** — Ritual and/or Concentration badges where applicable
- **Prepared indicator** — glowing border or dot for prepared spells
- **Expand on click** — reveals full description text
- **Prepare toggle** — button to mark prepared/unprepared (in-memory only)

### School Color Coding

Each school gets a distinct muted color for card accents/borders:

| School | Color |
|--------|-------|
| Abjuration | Blue |
| Conjuration | Cyan |
| Divination | Silver/light grey |
| Enchantment | Pink |
| Evocation | Red/orange |
| Illusion | Purple |
| Necromancy | Green (sickly) |
| Transmutation | Yellow/gold |

### Visual Style

- **Dark mode:** Background ~#1a1a2e, light text, colored accents per school
- **High contrast:** Easy to read in any lighting
- **Compact cards:** Maximize information density for desktop use
- **Desktop-first:** Optimized for laptop/desktop screens

## Interactions

1. **Sort:** Dropdown changes card order. Level sort groups by spell level with headers. Alphabetical sorts A–Z. School groups by school.
2. **Filter — Prepared Only:** Toggles visibility to show only prepared spells.
3. **Filter — School chips:** Click to toggle schools on/off. Multiple schools can be active.
4. **Search:** Real-time text filter on spell name.
5. **Card expand:** Click a card to expand and show full description. Click again to collapse.
6. **Prepare toggle:** Button on each card toggles prepared state (in-memory). Visual indicator updates immediately.
7. **Spell slot pips:** Click a pip to toggle used/available. Visual change (filled vs empty). "Reset Slots" refills all.

## File Structure

```
nathi/
  index.html
  styles.css
  app.js
  spells.json
  prepared.json
```

All files live under the existing `nathi/` directory.
