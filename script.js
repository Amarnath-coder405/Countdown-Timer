const form = document.getElementById('countdown-form');
const timersContainer = document.getElementById('timers');
const themeToggleBtn = document.getElementById('theme-toggle');

let countdowns = JSON.parse(localStorage.getItem('countdowns')) || [];
let currentTheme = localStorage.getItem('theme') || 'light';

document.documentElement.setAttribute('data-theme', currentTheme);
themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

function saveCountdowns() {
  localStorage.setItem('countdowns', JSON.stringify(countdowns));
}

// Format milliseconds to days, hours, minutes, seconds
function formatTime(ms) {
  const totalSec = Math.max(Math.floor(ms / 1000), 0);
  const days = Math.floor(totalSec / (60 * 60 * 24));
  const hours = Math.floor((totalSec / (60 * 60)) % 24);
  const minutes = Math.floor((totalSec / 60) % 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds, totalSec };
}

// Create progress ring SVG elements for a card
function createProgressRing(radius = 36) {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'progress-ring');
  svg.setAttribute('width', radius * 2);
  svg.setAttribute('height', radius * 2);

  const bg = document.createElementNS(svgNS, 'circle');
  bg.setAttribute('class', 'bg-circle');
  bg.setAttribute('cx', radius);
  bg.setAttribute('cy', radius);
  bg.setAttribute('r', radius);

  const fg = document.createElementNS(svgNS, 'circle');
  fg.setAttribute('class', 'fg-circle');
  fg.setAttribute('cx', radius);
  fg.setAttribute('cy', radius);
  fg.setAttribute('r', radius);

  svg.appendChild(bg);
  svg.appendChild(fg);

  const circumference = 2 * Math.PI * radius;
  fg.setAttribute('stroke-dasharray', `${circumference} ${circumference}`);
  fg.setAttribute('stroke-dashoffset', circumference);

  return { svg, fg, circumference };
}

// Function to append a single countdown card to DOM (without re-rendering all)
function appendCountdownCard(item) {
  const { id, title, startTime, originalEndTime } = item;

  const card = document.createElement('div');
  card.className = 'timer-card';
  card.dataset.id = id;

  const { svg, fg, circumference } = createProgressRing(36);
  item._ring = { fg, circumference };

  const h = document.createElement('h3');
  h.textContent = title;

  const timeEl = document.createElement('div');
  timeEl.className = 'timer-time';

  const endEl = document.createElement('div');
  endEl.className = 'timer-end';
  endEl.textContent = `Ends: ${new Date(originalEndTime).toLocaleString()}`;

  const msgEl = document.createElement('div');
  msgEl.className = 'timer-message';

  const actions = document.createElement('div');
  actions.className = 'action-buttons';
  const pauseBtn = document.createElement('button');
  pauseBtn.className = 'pause-btn';
  pauseBtn.textContent = item.paused ? 'Resume' : 'Pause';
  pauseBtn.onclick = () => togglePause(id);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = 'Delete';
  deleteBtn.onclick = () => removeCountdown(id, card);

  actions.append(pauseBtn, deleteBtn);

  card.append(svg, h, timeEl, endEl, msgEl, actions);
  timersContainer.appendChild(card);

  updateSingle(item, timeEl, msgEl);
}

// Function to update a single card’s display and progress ring
function updateSingle(item, timeEl, msgEl) {
  const now = item.paused ? item.pauseTime : Date.now();
  const remaining = item.originalEndTime - now;

  const ft = formatTime(remaining);
  timeEl.textContent =
    `${String(ft.days).padStart(2, '0')}d ` +
    `${String(ft.hours).padStart(2, '0')}h ` +
    `${String(ft.minutes).padStart(2, '0')}m ` +
    `${String(ft.seconds).padStart(2, '0')}s`;

  if (!item.paused && remaining <= 0) {
    msgEl.textContent = '🎉 Time’s up!';
  } else {
    msgEl.textContent = '';
  }

  if (item._ring) {
    const { fg, circumference } = item._ring;
    const totalSpan = item.originalEndTime - item.startTime;
    const elapsed = now - item.startTime;
    let fraction = elapsed / totalSpan;
    if (fraction < 0) fraction = 0;
    if (fraction > 1) fraction = 1;
    const offset = circumference * (1 - fraction);
    fg.style.strokeDashoffset = offset;
  }
}

// Add new countdown (without re-rendering all)
function addCountdown(title, dt) {
  const end = new Date(dt).getTime();
  if (!title || isNaN(end) || end <= Date.now()) {
    alert('Enter future date & valid title.');
    return;
  }
  const now = Date.now();
  const id = now + Math.random();
  const newItem = {
    id,
    title,
    startTime: now,
    originalEndTime: end,
    paused: false,
    pauseTime: null,
    _ring: null
  };
  countdowns.push(newItem);
  saveCountdowns();
  appendCountdownCard(newItem);
}

// Toggle pause/resume for a specific timer, without re-rendering all
function togglePause(id) {
  const item = countdowns.find(c => c.id === id);
  if (!item) return;

  const card = timersContainer.querySelector(`.timer-card[data-id="${id}"]`);
  if (!card) return;

  const timeEl = card.querySelector('.timer-time');
  const msgEl = card.querySelector('.timer-message');
  const pauseBtn = card.querySelector('.pause-btn');

  if (!item.paused) {
    item.paused = true;
    item.pauseTime = Date.now();
    pauseBtn.textContent = 'Resume';
  } else {
    item.paused = false;
    const pausedDur = item.pauseTime - item.startTime;
    item.startTime = Date.now() - pausedDur;
    item.pauseTime = null;
    pauseBtn.textContent = 'Pause';
  }

  saveCountdowns();
  updateSingle(item, timeEl, msgEl);
}

// Remove a countdown with animation
function removeCountdown(id, cardElem) {
  cardElem.classList.add('removing');
  setTimeout(() => {
    countdowns = countdowns.filter(c => c.id !== id);
    saveCountdowns();
    // remove element
    cardElem.remove();
  }, 400);
}

// Form submission: Add countdown
form.addEventListener('submit', e => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const dt = document.getElementById('datetime').value;
  addCountdown(title, dt);
  form.reset();
});

// Theme toggle
themeToggleBtn.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('theme', currentTheme);
  themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
});

// Interval to update all timers each second
setInterval(() => {
  countdowns.forEach(item => {
    const card = timersContainer.querySelector(`.timer-card[data-id="${item.id}"]`);
    if (!card) return;
    const timeEl = card.querySelector('.timer-time');
    const msgEl = card.querySelector('.timer-message');
    updateSingle(item, timeEl, msgEl);
  });
}, 1000);

// On load: restore existing timers
countdowns.forEach(item => {
  appendCountdownCard(item);
});
