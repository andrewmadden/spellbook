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
  const spellsRes = await fetch('spells.json');
  spells = await spellsRes.json();

  const hashPrepared = loadPreparedFromHash();
  if (hashPrepared) {
    preparedSet = hashPrepared;
    savePrepared();
    history.replaceState(null, '', location.pathname);
  } else {
    const saved = localStorage.getItem('spellbook-prepared');
    if (saved) {
      preparedSet = new Set(JSON.parse(saved));
    } else {
      const preparedRes = await fetch('prepared.json');
      const preparedData = await preparedRes.json();
      preparedSet = new Set(preparedData.prepared);
    }
  }
}

function loadPreparedFromHash() {
  const hash = location.hash.slice(1);
  if (!hash.startsWith('p=')) return null;
  try {
    const decoded = atob(hash.slice(2));
    return new Set(JSON.parse(decoded));
  } catch {
    return null;
  }
}

function sharePrepared() {
  const encoded = btoa(JSON.stringify([...preparedSet]));
  const url = `${location.origin}${location.pathname}#p=${encoded}`;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('share-prepared');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Share Prepared'; }, 2000);
  });
}

function savePrepared() {
  localStorage.setItem('spellbook-prepared', JSON.stringify([...preparedSet]));
}

async function resetPrepared() {
  localStorage.removeItem('spellbook-prepared');
  const preparedRes = await fetch('prepared.json');
  const preparedData = await preparedRes.json();
  preparedSet = new Set(preparedData.prepared);
  renderSpellGrid();
}

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
    savePrepared();
    renderSpellGrid();
  });

  return card;
}

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

function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const saved = localStorage.getItem('spellbook-theme');
  if (saved === 'parchment') {
    document.documentElement.setAttribute('data-theme', 'parchment');
    toggle.textContent = '☽';
  } else {
    toggle.textContent = '☀';
  }
  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'parchment') {
      document.documentElement.removeAttribute('data-theme');
      toggle.textContent = '☀';
      localStorage.setItem('spellbook-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'parchment');
      toggle.textContent = '☽';
      localStorage.setItem('spellbook-theme', 'parchment');
    }
  });
}

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

  document.getElementById('reset-prepared').addEventListener('click', () => {
    resetPrepared();
  });

  document.getElementById('share-prepared').addEventListener('click', () => {
    sharePrepared();
  });
}

async function init() {
  initTheme();
  await loadData();
  renderSlotTracker();
  renderSchoolFilters();
  initControls();
  renderSpellGrid();
}

init();
