# Nathi's Interactive Spellbook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static spellbook website for Nathi (Firbolg Artificer 1 / Wizard 11, Order of Scribes) with spell cards, sorting, filtering, prepared spell tracking, and spell slot usage.

**Architecture:** Multi-file vanilla JS static site — `index.html`, `styles.css`, `app.js`, `spells.json`, and `prepared.json`. No build tools or dependencies. Data is pre-extracted from D&D Beyond. Prepared state loads from `prepared.json` and can be toggled in-memory. Spell slot usage is in-memory only.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript (ES modules via `<script type="module">`)

## Global Constraints

- No external dependencies — no npm, no CDN links, no frameworks
- All files live under `nathi/`
- Must be serveable via `python3 -m http.server` or any static file server
- Dark mode only — background ~#1a1a2e, light text
- Desktop-first layout

---

### Task 1: Data Files — spells.json and prepared.json

**Files:**
- Create: `nathi/spells.json`
- Create: `nathi/prepared.json`

These are static data files with no logic. The spell data has already been extracted and deduplicated from the D&D Beyond API. The prepared list matches Nathi's current D&D Beyond prepared state.

- [ ] **Step 1: Create spells.json**

Copy the pre-extracted spell data to `nathi/spells.json`. This file contains 78 deduplicated spells as a JSON array. Each spell object has: `name`, `level`, `school`, `castingTime`, `range`, `duration`, `components`, `description`, `ritual`, `concentration`, `source`.

The data file is already prepared at:
`/tmp/claude-1000/-home-andrewmadden-dnd-spellbook/e7f1874a-673d-444b-8108-6f6e061441f2/scratchpad/spells_clean.json`

```bash
cp /tmp/claude-1000/-home-andrewmadden-dnd-spellbook/e7f1874a-673d-444b-8108-6f6e061441f2/scratchpad/spells_clean.json nathi/spells.json
```

- [ ] **Step 2: Create prepared.json**

```json
{
  "prepared": [
    "Alarm",
    "Cure Wounds",
    "Disguise Self",
    "Faerie Fire",
    "Feather Fall",
    "Magic Missile",
    "Misty Step",
    "Rope Trick",
    "Shatter",
    "Vortex Warp",
    "Counterspell",
    "Dispel Magic",
    "Fireball",
    "Life Transference",
    "Sending",
    "Greater Invisibility",
    "Polymorph",
    "Bigby's Hand",
    "Hold Monster",
    "Telekinesis",
    "Teleportation Circle"
  ]
}
```

- [ ] **Step 3: Verify data files load**

```bash
python3 -c "import json; d=json.load(open('nathi/spells.json')); print(f'{len(d)} spells loaded'); p=json.load(open('nathi/prepared.json')); print(f'{len(p[\"prepared\"])} prepared spells')"
```

Expected: `78 spells loaded` and `21 prepared spells` (or similar count).

- [ ] **Step 4: Commit**

```bash
git add nathi/spells.json nathi/prepared.json
git commit -m "feat: add spell data and prepared spell list for Nathi"
```

---

### Task 2: HTML Structure and CSS Styling

**Files:**
- Create: `nathi/index.html`
- Create: `nathi/styles.css`

**Interfaces:**
- Consumes: nothing
- Produces: DOM structure that `app.js` will query:
  - `#slot-tracker` — container for spell slot pips
  - `#reset-slots` — button to reset all slots
  - `#sort-select` — `<select>` for sort mode
  - `#prepared-toggle` — button to toggle prepared-only filter
  - `#school-filters` — container for school filter chips
  - `#search-input` — text input for search
  - `#spell-grid` — container where spell cards are rendered
  - CSS classes: `.spell-card`, `.expanded`, `.prepared`, `.slot-pip`, `.slot-pip.used`, `.school-chip`, `.school-chip.active`, school-specific classes (`.school-abjuration`, etc.)

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nathi's Spellbook</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>Nathi's Spellbook</h1>
    <p class="subtitle">Artificer 1 / Wizard 11 — Order of Scribes</p>
    <div id="slot-tracker"></div>
    <button id="reset-slots">Reset Slots</button>
  </header>

  <div class="controls">
    <div class="controls-row">
      <label for="sort-select">Sort:</label>
      <select id="sort-select">
        <option value="level">Level</option>
        <option value="alpha">Alphabetical</option>
        <option value="school">School</option>
      </select>

      <button id="prepared-toggle">Prepared Only</button>

      <input type="text" id="search-input" placeholder="Search spells...">
    </div>
    <div id="school-filters"></div>
  </div>

  <main id="spell-grid"></main>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create styles.css**

Full stylesheet with dark mode, school colors, card layout, slot pips, controls, and expanded state. School color map:

| School | Accent color |
|--------|-------------|
| Abjuration | `#4a9eff` (blue) |
| Conjuration | `#4ecdc4` (cyan) |
| Divination | `#a0a0b0` (silver) |
| Enchantment | `#e891b9` (pink) |
| Evocation | `#e85d3a` (red-orange) |
| Illusion | `#b06aff` (purple) |
| Necromancy | `#6abf69` (sickly green) |
| Transmutation | `#e8c84a` (gold) |

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: #1a1a2e;
  color: #e0e0e0;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  padding: 1rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

header {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #2a2a4a;
}

header h1 {
  font-size: 1.8rem;
  color: #f0f0f0;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

/* Spell Slot Tracker */
#slot-tracker {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.slot-group {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.slot-label {
  font-size: 0.75rem;
  color: #888;
  margin-right: 0.25rem;
  min-width: 2rem;
}

.slot-pip {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #6a6aff;
  background: #6a6aff;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.slot-pip.used {
  background: transparent;
}

.slot-pip:hover {
  border-color: #8a8aff;
}

#reset-slots {
  background: #2a2a4a;
  color: #aaa;
  border: 1px solid #3a3a5a;
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: background 0.15s;
}

#reset-slots:hover {
  background: #3a3a5a;
  color: #e0e0e0;
}

/* Controls */
.controls {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #2a2a4a;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.controls-row label {
  font-size: 0.85rem;
  color: #aaa;
}

#sort-select {
  background: #2a2a4a;
  color: #e0e0e0;
  border: 1px solid #3a3a5a;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  font-size: 0.85rem;
}

#prepared-toggle {
  background: #2a2a4a;
  color: #aaa;
  border: 1px solid #3a3a5a;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s;
}

#prepared-toggle.active {
  background: #4a4a8a;
  color: #e0e0e0;
  border-color: #6a6aff;
}

#search-input {
  background: #2a2a4a;
  color: #e0e0e0;
  border: 1px solid #3a3a5a;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  font-size: 0.85rem;
  flex: 1;
  min-width: 150px;
}

#search-input::placeholder {
  color: #666;
}

#school-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.school-chip {
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  cursor: pointer;
  border: 1px solid;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.school-chip.active {
  opacity: 1;
}

/* School Colors */
.school-abjuration { border-color: #4a9eff; color: #4a9eff; }
.school-abjuration.active { background: #4a9eff22; }
.school-conjuration { border-color: #4ecdc4; color: #4ecdc4; }
.school-conjuration.active { background: #4ecdc422; }
.school-divination { border-color: #a0a0b0; color: #a0a0b0; }
.school-divination.active { background: #a0a0b022; }
.school-enchantment { border-color: #e891b9; color: #e891b9; }
.school-enchantment.active { background: #e891b922; }
.school-evocation { border-color: #e85d3a; color: #e85d3a; }
.school-evocation.active { background: #e85d3a22; }
.school-illusion { border-color: #b06aff; color: #b06aff; }
.school-illusion.active { background: #b06aff22; }
.school-necromancy { border-color: #6abf69; color: #6abf69; }
.school-necromancy.active { background: #6abf6922; }
.school-transmutation { border-color: #e8c84a; color: #e8c84a; }
.school-transmutation.active { background: #e8c84a22; }

/* Spell Grid */
#spell-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 0.75rem;
}

.level-header {
  grid-column: 1 / -1;
  font-size: 1.1rem;
  color: #aaa;
  padding: 0.5rem 0 0.25rem;
  border-bottom: 1px solid #2a2a4a;
  margin-top: 0.5rem;
}

.level-header:first-child {
  margin-top: 0;
}

/* Spell Cards */
.spell-card {
  background: #22223a;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  border-left: 3px solid;
}

.spell-card:hover {
  border-color: #3a3a6a;
}

.spell-card.prepared {
  box-shadow: 0 0 8px rgba(106, 106, 255, 0.3);
  border-top-color: #3a3a6a;
  border-right-color: #3a3a6a;
  border-bottom-color: #3a3a6a;
}

.spell-card .spell-name {
  font-size: 1rem;
  font-weight: 600;
  color: #f0f0f0;
  margin-bottom: 0.3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.spell-card .spell-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 8px;
  border: 1px solid;
  white-space: nowrap;
}

.spell-card .spell-stats {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #999;
  margin-bottom: 0.3rem;
  flex-wrap: wrap;
}

.spell-card .spell-components {
  font-size: 0.7rem;
  color: #777;
  font-style: italic;
  margin-bottom: 0.3rem;
}

.spell-card .spell-tags {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.3rem;
}

.spell-tag {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: #2a2a4a;
  color: #aaa;
}

.spell-tag.ritual {
  color: #4ecdc4;
  background: #4ecdc422;
}

.spell-tag.concentration {
  color: #e8c84a;
  background: #e8c84a22;
}

.spell-card .spell-description {
  display: none;
  font-size: 0.8rem;
  color: #bbb;
  line-height: 1.5;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #2a2a4a;
}

.spell-card.expanded .spell-description {
  display: block;
}

.spell-card .prepare-btn {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #3a3a5a;
  background: #2a2a4a;
  color: #aaa;
  cursor: pointer;
  margin-top: 0.4rem;
  transition: background 0.15s;
}

.spell-card .prepare-btn:hover {
  background: #3a3a5a;
}

.spell-card.prepared .prepare-btn {
  background: #4a4a8a;
  color: #e0e0e0;
  border-color: #6a6aff;
}

.school-header {
  grid-column: 1 / -1;
  font-size: 1.1rem;
  padding: 0.5rem 0 0.25rem;
  border-bottom: 1px solid #2a2a4a;
  margin-top: 0.5rem;
}

.school-header.school-abjuration { color: #4a9eff; }
.school-header.school-conjuration { color: #4ecdc4; }
.school-header.school-divination { color: #a0a0b0; }
.school-header.school-enchantment { color: #e891b9; }
.school-header.school-evocation { color: #e85d3a; }
.school-header.school-illusion { color: #b06aff; }
.school-header.school-necromancy { color: #6abf69; }
.school-header.school-transmutation { color: #e8c84a; }
```

- [ ] **Step 3: Verify HTML loads with styles**

Start a local server and open the page in a browser to confirm it loads with the dark background and header visible.

```bash
cd nathi && python3 -m http.server 8080 &
# Open http://localhost:8080 in browser — should show dark page with "Nathi's Spellbook" header
```

- [ ] **Step 4: Commit**

```bash
git add nathi/index.html nathi/styles.css
git commit -m "feat: add HTML structure and dark mode CSS for spellbook"
```

---

### Task 3: Core Application Logic — app.js

**Files:**
- Create: `nathi/app.js`

**Interfaces:**
- Consumes: `spells.json` (array of spell objects), `prepared.json` (`{ prepared: string[] }`), DOM elements from `index.html` (IDs listed in Task 2)
- Produces: Fully interactive spellbook page

This is the main application file. It fetches data, builds the UI, and handles all interactions.

- [ ] **Step 1: Write app.js — data loading and state**

```javascript
const SPELL_SLOTS = [
  { level: 1, label: '1st', total: 4 },
  { level: 2, label: '2nd', total: 3 },
  { level: 3, label: '3rd', total: 3 },
  { level: 4, label: '4th', total: 3 },
  { level: 5, label: '5th', total: 2 },
  { level: 6, label: '6th', total: 1 },
];

const SCHOOL_COLORS = {
  Abjuration: 'abjuration',
  Conjuration: 'conjuration',
  Divination: 'divination',
  Enchantment: 'enchantment',
  Evocation: 'evocation',
  Illusion: 'illusion',
  Necromancy: 'necromancy',
  Transmutation: 'transmutation',
};

let spells = [];
let preparedSet = new Set();
let slotsUsed = SPELL_SLOTS.map(() => 0);
let sortMode = 'level';
let preparedOnly = false;
let activeSchools = new Set();
let searchQuery = '';

async function loadData() {
  const [spellsRes, preparedRes] = await Promise.all([
    fetch('spells.json'),
    fetch('prepared.json'),
  ]);
  spells = await spellsRes.json();
  const preparedData = await preparedRes.json();
  preparedSet = new Set(preparedData.prepared);
}
```

- [ ] **Step 2: Write app.js — spell slot tracker**

```javascript
function renderSlotTracker() {
  const tracker = document.getElementById('slot-tracker');
  tracker.innerHTML = '';

  SPELL_SLOTS.forEach((slot, slotIndex) => {
    const group = document.createElement('div');
    group.className = 'slot-group';

    const label = document.createElement('span');
    label.className = 'slot-label';
    label.textContent = slot.label;
    group.appendChild(label);

    for (let i = 0; i < slot.total; i++) {
      const pip = document.createElement('div');
      pip.className = 'slot-pip';
      if (i < slotsUsed[slotIndex]) pip.classList.add('used');
      pip.addEventListener('click', (e) => {
        e.stopPropagation();
        if (i < slotsUsed[slotIndex]) {
          slotsUsed[slotIndex] = i;
        } else {
          slotsUsed[slotIndex] = i + 1;
        }
        renderSlotTracker();
      });
      group.appendChild(pip);
    }

    tracker.appendChild(group);
  });
}
```

- [ ] **Step 3: Write app.js — school filter chips**

```javascript
function renderSchoolFilters() {
  const container = document.getElementById('school-filters');
  container.innerHTML = '';
  const schools = [...new Set(spells.map(s => s.school))].sort();

  schools.forEach(school => {
    const chip = document.createElement('button');
    chip.className = `school-chip school-${SCHOOL_COLORS[school]}`;
    if (activeSchools.has(school)) chip.classList.add('active');
    chip.textContent = school;
    chip.addEventListener('click', () => {
      if (activeSchools.has(school)) {
        activeSchools.delete(school);
      } else {
        activeSchools.add(school);
      }
      renderSchoolFilters();
      renderSpellGrid();
    });
    container.appendChild(chip);
  });
}
```

- [ ] **Step 4: Write app.js — spell card rendering**

```javascript
function levelLabel(level) {
  if (level === 0) return 'Cantrip';
  const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
  return `${level}${suffixes[level] || 'th'} Level`;
}

function createSpellCard(spell) {
  const card = document.createElement('div');
  const schoolClass = `school-${SCHOOL_COLORS[spell.school]}`;
  card.className = `spell-card ${schoolClass}`;
  if (preparedSet.has(spell.name)) card.classList.add('prepared');

  const badgeText = spell.level === 0 ? spell.school : `${levelLabel(spell.level)} ${spell.school}`;

  let tagsHtml = '';
  if (spell.ritual) tagsHtml += '<span class="spell-tag ritual">Ritual</span>';
  if (spell.concentration) tagsHtml += '<span class="spell-tag concentration">Concentration</span>';

  let componentsHtml = '';
  if (spell.components) {
    componentsHtml = `<div class="spell-components">${spell.components}</div>`;
  }

  card.innerHTML = `
    <div class="spell-name">
      <span>${spell.name}</span>
      <span class="spell-badge ${schoolClass}">${badgeText}</span>
    </div>
    <div class="spell-stats">
      <span>${spell.castingTime}</span>
      <span>${spell.range}</span>
      <span>${spell.duration}</span>
    </div>
    ${componentsHtml}
    <div class="spell-tags">${tagsHtml}</div>
    <div class="spell-description">${spell.description}</div>
    <button class="prepare-btn">${preparedSet.has(spell.name) ? 'Unprepare' : 'Prepare'}</button>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.classList.contains('prepare-btn')) return;
    card.classList.toggle('expanded');
  });

  card.querySelector('.prepare-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (preparedSet.has(spell.name)) {
      preparedSet.delete(spell.name);
    } else {
      preparedSet.add(spell.name);
    }
    renderSpellGrid();
  });

  return card;
}
```

- [ ] **Step 5: Write app.js — filtering, sorting, and grid rendering**

```javascript
function getFilteredSpells() {
  return spells.filter(spell => {
    if (preparedOnly && !preparedSet.has(spell.name)) return false;
    if (activeSchools.size > 0 && !activeSchools.has(spell.school)) return false;
    if (searchQuery && !spell.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
}

function getSortedSpells(filtered) {
  const sorted = [...filtered];
  if (sortMode === 'alpha') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortMode === 'school') {
    sorted.sort((a, b) => a.school.localeCompare(b.school) || a.level - b.level || a.name.localeCompare(b.name));
  } else {
    sorted.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }
  return sorted;
}

function renderSpellGrid() {
  const grid = document.getElementById('spell-grid');
  grid.innerHTML = '';

  const filtered = getFilteredSpells();
  const sorted = getSortedSpells(filtered);

  if (sortMode === 'level') {
    let currentLevel = -1;
    sorted.forEach(spell => {
      if (spell.level !== currentLevel) {
        currentLevel = spell.level;
        const header = document.createElement('div');
        header.className = 'level-header';
        header.textContent = levelLabel(currentLevel);
        grid.appendChild(header);
      }
      grid.appendChild(createSpellCard(spell));
    });
  } else if (sortMode === 'school') {
    let currentSchool = '';
    sorted.forEach(spell => {
      if (spell.school !== currentSchool) {
        currentSchool = spell.school;
        const header = document.createElement('div');
        header.className = `school-header school-${SCHOOL_COLORS[currentSchool]}`;
        header.textContent = currentSchool;
        grid.appendChild(header);
      }
      grid.appendChild(createSpellCard(spell));
    });
  } else {
    sorted.forEach(spell => grid.appendChild(createSpellCard(spell)));
  }
}
```

- [ ] **Step 6: Write app.js — event listeners and init**

```javascript
function initControls() {
  document.getElementById('sort-select').addEventListener('change', (e) => {
    sortMode = e.target.value;
    renderSpellGrid();
  });

  document.getElementById('prepared-toggle').addEventListener('click', (e) => {
    preparedOnly = !preparedOnly;
    e.target.classList.toggle('active', preparedOnly);
    renderSpellGrid();
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderSpellGrid();
  });

  document.getElementById('reset-slots').addEventListener('click', () => {
    slotsUsed = SPELL_SLOTS.map(() => 0);
    renderSlotTracker();
  });
}

async function init() {
  await loadData();
  renderSlotTracker();
  renderSchoolFilters();
  initControls();
  renderSpellGrid();
}

init();
```

- [ ] **Step 7: Verify full app works**

Start the local server and test in browser:

```bash
cd nathi && python3 -m http.server 8080
```

Open `http://localhost:8080` and verify:
1. All 78 spells display as cards, grouped by level
2. Prepared spells have a glowing border
3. Clicking a card expands/collapses the description
4. Sort dropdown changes card order (Level / Alphabetical / School)
5. "Prepared Only" button filters to just prepared spells
6. School chips filter by school (click to toggle, multiple can be active)
7. Search box filters by spell name in real-time
8. Spell slot pips toggle on click (filled = available, empty = used)
9. "Reset Slots" button refills all pips
10. Prepare/Unprepare button on each card toggles the prepared state

- [ ] **Step 8: Commit**

```bash
git add nathi/app.js
git commit -m "feat: add spellbook application logic with sorting, filtering, and slot tracking"
```
