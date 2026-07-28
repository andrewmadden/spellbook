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

let config = {};
let spellSlots = [];
let spells = [];
let preparedSet = new Set();
let slotsUsed = [];
let sortMode = 'level';
let preparedOnly = false;
let activeSchools = new Set();
let searchQuery = '';
let expandedCards = new Set();
let maxPreparedPerClass = {};

function calcMaxPreparedPerClass(cfg) {
  const limits = {};
  for (const cls of cfg.classes) {
    if (cls.name === 'Wizard') {
      limits[cls.name] = cfg.intModifier + cls.level;
    } else if (cls.name === 'Artificer') {
      limits[cls.name] = Math.max(1, cfg.intModifier + Math.floor(cls.level / 2));
    } else if (['Cleric', 'Druid', 'Paladin'].includes(cls.name)) {
      limits[cls.name] = cfg.intModifier + cls.level;
    }
  }
  return limits;
}

function calcSpellSlots(cfg) {
  let casterLevel = 0;
  for (const cls of cfg.classes) {
    if (cls.name === 'Artificer') {
      casterLevel += Math.ceil(cls.level / 2);
    } else if (['Wizard', 'Cleric', 'Druid', 'Bard', 'Sorcerer'].includes(cls.name)) {
      casterLevel += cls.level;
    } else if (['Paladin', 'Ranger'].includes(cls.name)) {
      casterLevel += Math.floor(cls.level / 2);
    }
  }
  const table = [
    [],
    [2],
    [3],
    [4, 2],
    [4, 3],
    [4, 3, 2],
    [4, 3, 3],
    [4, 3, 3, 1],
    [4, 3, 3, 2],
    [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 2],
    [4, 3, 3, 3, 2, 1],
    [4, 3, 3, 3, 2, 1],
    [4, 3, 3, 3, 2, 1, 1],
    [4, 3, 3, 3, 2, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 2, 1, 1],
  ];
  const slots = table[Math.min(casterLevel, 20)] || [];
  const labels = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
  return slots.map((total, i) => ({ level: i + 1, label: labels[i], total }));
}

function preparedCountPerClass() {
  const counts = {};
  for (const className of Object.keys(maxPreparedPerClass)) {
    counts[className] = 0;
  }
  const deferred = [];
  for (const spell of spells) {
    if (spell.level === 0 || !preparedSet.has(spell.name)) continue;
    const eligible = (spell.classes || []).filter(c => c in counts);
    if (eligible.length === 1) {
      counts[eligible[0]]++;
    } else if (eligible.length > 1) {
      deferred.push(eligible);
    }
  }
  for (const eligible of deferred) {
    const best = eligible.reduce((a, b) =>
      (maxPreparedPerClass[a] - counts[a]) >= (maxPreparedPerClass[b] - counts[b]) ? a : b
    );
    counts[best]++;
  }
  return counts;
}

async function loadData() {
  const [spellsRes, configRes] = await Promise.all([
    fetch('spells.json'),
    fetch('config.json'),
  ]);
  spells = await spellsRes.json();
  config = await configRes.json();
  maxPreparedPerClass = calcMaxPreparedPerClass(config);
  spellSlots = calcSpellSlots(config);
  slotsUsed = spellSlots.map(() => 0);

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
  renderPreparedCounter();
  renderSpellGrid();
}

function renderSubtitle() {
  const el = document.querySelector('.subtitle');
  const parts = config.classes.map(c => {
    const sub = c.subclass ? ` (${c.subclass})` : '';
    return `${c.name} ${c.level}${sub}`;
  });
  el.textContent = parts.join(' / ');
}

function renderPreparedCounter() {
  const el = document.getElementById('prepared-counter');
  const counts = preparedCountPerClass();
  const parts = [];
  let anyOver = false;
  for (const [cls, max] of Object.entries(maxPreparedPerClass)) {
    const count = counts[cls] || 0;
    parts.push(`${cls}: ${count}/${max}`);
    if (count > max) anyOver = true;
  }
  el.textContent = parts.join(' | ') + ' prepared';
  el.classList.toggle('over-limit', anyOver);
}

function renderSlotTracker() {
  const tracker = document.getElementById('slot-tracker');
  tracker.innerHTML = '';

  spellSlots.forEach((slot, slotIndex) => {
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
  const isCantrip = spell.level === 0;
  const isPrepared = isCantrip || preparedSet.has(spell.name);
  card.className = `spell-card ${schoolClass}`;
  if (isPrepared) card.classList.add('prepared');
  if (expandedCards.has(spell.name)) card.classList.add('expanded');

  const badgeText = isCantrip ? spell.school : `${levelLabel(spell.level)} ${spell.school}`;

  let tagsHtml = '';
  if (spell.ritual) tagsHtml += '<span class="spell-tag ritual">Ritual</span>';
  if (spell.concentration) tagsHtml += '<span class="spell-tag concentration">Concentration</span>';

  let componentsHtml = '';
  if (spell.components) {
    componentsHtml = `<div class="spell-components">${spell.components}</div>`;
  }

  let classTagsHtml = '';
  if (spell.classes && spell.classes.length > 0) {
    classTagsHtml = spell.classes.map(c =>
      `<span class="class-tag class-${c.toLowerCase()}">${c}</span>`
    ).join('');
  }

  let prepareHtml = '';
  if (!isCantrip) {
    prepareHtml = `<button class="prepare-btn">${preparedSet.has(spell.name) ? 'Unprepare' : 'Prepare'}</button>`;
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
    <div class="spell-classes">${classTagsHtml}</div>
    <div class="spell-description">${spell.description}</div>
    <div class="spell-card-footer">
      ${prepareHtml}
      <div class="spell-properties">${tagsHtml}</div>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.classList.contains('prepare-btn')) return;
    card.classList.toggle('expanded');
    if (card.classList.contains('expanded')) {
      expandedCards.add(spell.name);
    } else {
      expandedCards.delete(spell.name);
    }
  });

  if (!isCantrip) {
    card.querySelector('.prepare-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (preparedSet.has(spell.name)) {
        preparedSet.delete(spell.name);
      } else {
        preparedSet.add(spell.name);
      }
      savePrepared();
      renderPreparedCounter();
      renderSpellGrid();
    });
  }

  return card;
}

function getFilteredSpells() {
  return spells.filter(spell => {
    if (preparedOnly) {
      const isPrepared = spell.level === 0 || preparedSet.has(spell.name);
      if (!isPrepared) return false;
    }
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
    slotsUsed = spellSlots.map(() => 0);
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
  renderSubtitle();
  renderPreparedCounter();
  renderSlotTracker();
  renderSchoolFilters();
  initControls();
  renderSpellGrid();
}

init();
