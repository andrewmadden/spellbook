# Nathi's Spellbook

Interactive spell reference for Nathi, a Firbolg Artificer 1 / Wizard 11 (Order of Scribes).

## Features

- 78 spells displayed as cards with school-colored accents
- Sort by level, alphabetical, or school
- Filter by prepared status, school, or search by name
- Spell slot tracker with clickable pips
- Toggle spells as prepared/unprepared (saved to browser)
- Expand cards to read full spell descriptions
- Dark mode (PhpStorm-style) and parchment light theme with toggle

## Usage

Serve the `nathi/` directory with any static file server:

```bash
cd nathi
python3 -m http.server 8080
```

Open http://localhost:8080.

## Updating Spells

Edit `nathi/spells.json` to add or remove spells. Each spell object:

```json
{
  "name": "Fireball",
  "level": 3,
  "school": "Evocation",
  "castingTime": "1 Action",
  "range": "150 ft",
  "duration": "Instantaneous",
  "components": "a ball of bat guano and sulfur",
  "description": "...",
  "ritual": false,
  "concentration": false,
  "source": "Wizard"
}
```

## Prepared Spells

`nathi/prepared.json` sets the default prepared spell list for first-time visitors. After the first visit, prepared state is saved to the browser (localStorage). Use the "Reset to Default" button in the app to reload from `prepared.json`.

## Hosting

This is a fully static site — deploy by pushing to GitHub Pages, Netlify, or any static host. No build step required.
