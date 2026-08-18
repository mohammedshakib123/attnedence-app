/* ============================================================
   AttendanceIQ Mobile Pro — Autonomous Mobile Engine
   ============================================================ */

'use strict';

// ============================================================
// CONSTANTS & SCHEMAS
// ============================================================
const DEFAULT_SUBJECTS = [
  { id: 'MFS', name: 'Mathematics & Statistical Foundations', abbr: 'MFS', tag: 'Core Math' },
  { id: 'COA', name: 'Computer Organization & Architecture', abbr: 'COA', tag: 'Hardware' },
  { id: 'OOP', name: 'Object Oriented Programming (Java)', abbr: 'OOP', tag: 'Software Core' },
  { id: 'SE', name: 'Software Engineering & Design', abbr: 'SE', tag: 'Systems' },
  { id: 'NJ', name: 'Node.js Fullstack Engineering', abbr: 'NJ', tag: 'Web Dev' },
  { id: 'DBMS', name: 'Database Management Systems', abbr: 'DBMS', tag: 'Data Systems' }
];

const DEFAULT_TIMETABLE = {
  Monday: [
    { start: '09:00', end: '10:00', subject: 'SE' },
    { start: '10:00', end: '11:00', subject: 'COA' },
    { start: '11:10', end: '12:10', subject: 'OOP' },
    { start: '12:10', end: '13:10', subject: 'NJ' },
    { start: '14:00', end: '15:00', subject: 'DBMS' },
    { start: '15:00', end: '16:00', subject: 'MFS' }
  ],
  Tuesday: [
    { start: '09:00', end: '10:00', subject: 'COA' },
    { start: '10:00', end: '11:00', subject: 'NJ' },
    { start: '11:10', end: '12:10', subject: 'DBMS' },
    { start: '12:10', end: '13:10', subject: 'MFS' },
    { start: '14:00', end: '15:00', subject: 'SE' },
    { start: '15:00', end: '16:00', subject: 'OOP' }
  ],
  Wednesday: [
    { start: '09:00', end: '10:00', subject: 'MFS' },
    { start: '10:00', end: '11:00', subject: 'COA' },
    { start: '11:10', end: '12:10', subject: 'NJ' },
    { start: '12:10', end: '13:10', subject: 'DBMS' },
    { start: '14:00', end: '15:00', subject: 'OOP' },
    { start: '15:00', end: '16:00', subject: 'SE' }
  ],
  Thursday: [
    { start: '09:00', end: '10:00', subject: 'SE' },
    { start: '10:00', end: '11:00', subject: 'NJ' },
    { start: '11:10', end: '12:10', subject: 'DBMS' },
    { start: '12:10', end: '13:10', subject: 'COA' },
    { start: '14:00', end: '15:00', subject: 'MFS' },
    { start: '15:00', end: '16:00', subject: 'OOP' }
  ],
  Friday: [
    { start: '09:00', end: '10:00', subject: 'OOP' },
    { start: '10:00', end: '11:00', subject: 'SE' },
    { start: '11:10', end: '12:10', subject: 'MFS' },
    { start: '12:10', end: '13:10', subject: 'COA' },
    { start: '14:00', end: '15:00', subject: 'NJ' },
    { start: '15:00', end: '16:00', subject: 'DBMS' }
  ],
  Saturday: [
    { start: '09:00', end: '10:00', subject: 'COA' },
    { start: '10:00', end: '11:00', subject: 'NJ' },
    { start: '11:10', end: '12:10', subject: 'DBMS' },
    { start: '12:10', end: '13:10', subject: 'SE' }
  ],
  Sunday: []
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ============================================================
// STATE
// ============================================================
let appData = {
  setupDone: true,
  target: 75,
  theme: 'dark',
  semStart: '2026-08-01',
  semEnd: '2026-12-31',
  timetable: JSON.parse(JSON.stringify(DEFAULT_TIMETABLE)),
  attendance: {}
};

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let selectedDate = todayStr();
let calLastDate = null;
let activeTimetableDay = 'Monday';

// Dates currently unlocked for editing (in-memory only, resets on reload)
const editUnlockedDates = new Set();

// ============================================================
// STORAGE & UTILITIES
// ============================================================
function saveData() {
  localStorage.setItem('attendanceiq_v2', JSON.stringify(appData));
}

function loadData() {
  try {
    const raw = localStorage.getItem('attendanceiq_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      appData = { ...appData, ...parsed };
      DAY_NAMES.forEach(d => {
        if (!appData.timetable[d]) appData.timetable[d] = [];
      });
    }
  } catch (e) {
    console.error('Storage error', e);
  }
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateStr(s) {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateFull(s) {
  const d = parseDateStr(s);
  return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getDayName(s) {
  return DAY_NAMES[parseDateStr(s).getDay()];
}

function isFuture(s) { return s > todayStr(); }
function isToday(s) { return s === todayStr(); }
function isSunday(s) { return getDayName(s) === 'Sunday'; }

function getSubjectById(id) {
  return DEFAULT_SUBJECTS.find(s => s.id === id) || { id, name: id, abbr: id, tag: 'Course' };
}

function getTimetableForDate(dateStr) {
  if (isSunday(dateStr)) return [];
  const day = getDayName(dateStr);
  return (appData.timetable[day] || []).map((c, idx) => ({
    ...c,
    id: `${day}_${idx}_${c.subject}`
  }));
}

function getRecord(dateStr) {
  return appData.attendance[dateStr] || null;
}

function setRecord(dateStr, record) {
  appData.attendance[dateStr] = record;
  saveData();
}

// Check if a date's attendance is locked (saved + not unlocked for editing)
function isDateLocked(dateStr) {
  if (editUnlockedDates.has(dateStr)) return false;
  const rec = getRecord(dateStr);
  return rec && rec.locked === true;
}

// Lock a date's attendance record (called after save)
function lockDateRecord(dateStr) {
  const rec = getRecord(dateStr);
  if (rec) {
    rec.locked = true;
    setRecord(dateStr, rec);
  }
}

// Unlock a date for editing (in-memory only)
function unlockDateForEdit(dateStr) {
  editUnlockedDates.add(dateStr);
  loadAttendancePage();
  renderTodayCards(dateStr);
  showToast('✏️ Edit mode enabled. Note: Present classes cannot be changed.');
}

// Re-lock a date after editing
function relockDate(dateStr) {
  editUnlockedDates.delete(dateStr);
  lockDateRecord(dateStr);
  loadAttendancePage();
  renderTodayCards(dateStr);
  showToast('🔒 Attendance locked and saved!');
}

function isHoliday(dateStr) {
  const rec = getRecord(dateStr);
  return rec && rec.holiday === true;
}

function pct(attended, total) {
  if (!total || total <= 0) return 0;
  return (attended / total) * 100;
}

function computeStats(filterFn) {
  let total = 0, attended = 0, absent = 0, fullAbsentDays = 0;
  const subjectMap = {};
  DEFAULT_SUBJECTS.forEach(s => {
    subjectMap[s.id] = { total: 0, attended: 0, absent: 0 };
  });

  Object.entries(appData.attendance).forEach(([dateStr, rec]) => {
    if (filterFn && !filterFn(dateStr)) return;
    if (isFuture(dateStr) || isSunday(dateStr) || rec.holiday) return;
    const classes = rec.classes || [];
    let dayPresent = 0, dayAbsent = 0;
    classes.forEach(c => {
      const subId = c.subject;
      if (!subjectMap[subId]) subjectMap[subId] = { total: 0, attended: 0, absent: 0 };
      if (c.status === 'present') {
        total++; attended++; dayPresent++;
        subjectMap[subId].total++;
        subjectMap[subId].attended++;
      } else if (c.status === 'absent') {
        total++; absent++; dayAbsent++;
        subjectMap[subId].total++;
        subjectMap[subId].absent++;
      }
    });
    if (dayAbsent > 0 && dayPresent === 0 && classes.length > 0) fullAbsentDays++;
  });

  return { total, attended, absent, fullAbsentDays, subjectMap };
}

function overallStats() {
  return computeStats(null);
}

function computePredictor(totalConducted, attended, target) {
  const t = (target || 75) / 100;
  const current = totalConducted > 0 ? attended / totalConducted : 0;

  if (totalConducted === 0) {
    return { type: 'nodata', msg: 'No attendance records logged yet. Mark today\'s class lineup to activate AI predictions!' };
  }

  if (current >= t) {
    const canMiss = Math.floor((attended - t * totalConducted) / t);
    return {
      type: 'safe',
      currentPct: (current * 100).toFixed(1),
      canMiss: Math.max(0, canMiss),
      msg: `You have a comfortable safety margin! You can safely miss up to <strong>${Math.max(0, canMiss)} lecture${canMiss !== 1 ? 's' : ''}</strong> and stay above ${target}%.`
    };
  } else {
    const need = Math.ceil((t * totalConducted - attended) / (1 - t));
    return {
      type: 'danger',
      currentPct: (current * 100).toFixed(1),
      need: Math.max(0, need),
      msg: `⚠️ Shortage Alert: You need to attend <strong>${Math.max(0, need)} consecutive lecture${need !== 1 ? 's' : ''}</strong> without skipping to reach ${target}%.`
    };
  }
}

// ============================================================
// SYSTEM BOOTSTRAP
// ============================================================
function init() {
  loadData();
  applyTheme(appData.theme || 'dark');

  const attPicker = document.getElementById('attendance-date-picker');
  if (attPicker) attPicker.value = todayStr();

  const histPicker = document.getElementById('history-month-picker');
  const now = new Date();
  if (histPicker) histPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const targetIn = document.getElementById('target-input');
  if (targetIn) targetIn.value = appData.target || 75;

  populateWhatIfSubjects();
  navigate('dashboard');

  updateLivePeriodRadar();
  setInterval(autoHeartbeat, 3000);
}

function autoHeartbeat() {
  updateLivePeriodRadar();
  const dash = document.getElementById('page-dashboard');
  if (dash && dash.classList.contains('active')) {
    renderTodayCards(todayStr());
  }
}

// ============================================================
// NAVIGATION & SIDEBAR CONTROLS
// ============================================================
function toggleSidebar() {
  const sidebar = document.getElementById('left-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  sidebar?.classList.toggle('open');
  backdrop?.classList.toggle('active');
}

function closeSidebar() {
  document.getElementById('left-sidebar')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('active');
}

function navigate(page) {
  document.querySelectorAll('.app-view').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById('page-' + page);
  if (targetPage) targetPage.classList.add('active');

  // Sync Left Sidebar Links
  document.querySelectorAll('.sidebar-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });

  // Sync Bottom Dock Links
  document.querySelectorAll('.dock-item-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  const titles = {
    dashboard: { t: 'Overview Dashboard', s: 'Sphoorthy Engineering College' },
    attendance: { t: "Today's Schedule & Log", s: 'Daily Period Logger' },
    subjects: { t: 'Course Matrix & Ledger', s: 'Subject Breakdown' },
    advisor: { t: 'AI Copilot Advisor', s: 'Predictive Intelligence' },
    whatif: { t: 'What-If Simulator', s: 'Scenario Forecast Lab' },
    calendar: { t: 'Interactive Calendar', s: 'Monthly Inspection' },
    timetable: { t: 'Master Timetable', s: 'Room MV 308 Schedule' },
    history: { t: 'Audit Logs & Archives', s: 'Historical Record' },
    achievements: { t: 'Milestones & Badges', s: 'Academic Honors' },
    settings: { t: 'Settings & Backup', s: 'System Preferences' }
  };

  const titleEl = document.getElementById('topbar-title');
  const subEl = document.getElementById('topbar-subtitle');
  if (titleEl) titleEl.textContent = titles[page]?.t || 'AttendanceIQ';
  if (subEl) subEl.textContent = titles[page]?.s || 'Mobile App';

  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'attendance': loadAttendancePage(); break;
    case 'subjects': renderSubjects(); break;
    case 'advisor': renderAdvisor(); break;
    case 'whatif': runWhatIf(); break;
    case 'calendar': renderCalendar(); break;
    case 'timetable': renderTimetable(); break;
    case 'history': loadHistory(); break;
    case 'achievements': renderAchievements(); break;
    case 'settings': loadSettingsPage(); break;
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  appData.theme = theme;
  const icon = document.getElementById('theme-icon');
  const text = document.getElementById('theme-text');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  if (text) text.textContent = theme === 'dark' ? 'Light Theme' : 'Dark Theme';
}
function toggleTheme() {
  applyTheme(appData.theme === 'dark' ? 'light' : 'dark');
  saveData();
}

function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), duration);
}

function updateRing(pctValue) {
  const circumference = 2 * Math.PI * 68; // ~427.26
  const fill = document.getElementById('ring-fill');
  const pctEl = document.getElementById('ring-pct');
  const offset = circumference - (Math.min(100, Math.max(0, pctValue)) / 100) * circumference;
  if (fill) fill.style.strokeDashoffset = offset;
  if (pctEl) pctEl.textContent = pctValue.toFixed(1) + '%';
}

// ============================================================
// AUTOMATED REAL-TIME LIVE CLASS RADAR WITH EXACT DURATION
// ============================================================
function formatTime12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function updateLivePeriodRadar() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayS = todayStr();
  const schedule = getTimetableForDate(todayS);
  const isSun = isSunday(todayS);
  const isHol = isHoliday(todayS);
  const holInfo = getHolidayInfo(todayS);

  const tickerText = document.getElementById('topbar-live-text');
  const billboard = document.getElementById('live-class-billboard');

  // If Sunday or Holiday
  if (isSun || isHol || holInfo) {
    const title = holInfo ? holInfo.name : isHol ? 'College Holiday' : 'Sunday Weekend Break';
    const icon = holInfo ? holInfo.icon : '🏖️';
    if (tickerText) tickerText.textContent = `${icon} ${title}`;
    if (billboard) {
      billboard.innerHTML = `
        <div class="billboard-holiday-box">
          <div class="billboard-icon-large">${icon}</div>
          <div class="billboard-body">
            <div class="billboard-tag text-purple">OFFICIAL COLLEGE BREAK</div>
            <div class="billboard-title">${title}</div>
            <div class="billboard-timing">Campus is closed · No lectures scheduled for today</div>
          </div>
        </div>
      `;
    }
    return;
  }

  // Identify Active Period, Upcoming Period, or Break
  let activePeriod = null;
  let nextPeriod = null;
  let activeIndex = -1;

  for (let idx = 0; idx < schedule.length; idx++) {
    const cls = schedule[idx];
    const [sh, sm] = cls.start.split(':').map(Number);
    const [eh, em] = cls.end.split(':').map(Number);
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;

    if (currentMinutes >= startM && currentMinutes < endM) {
      activePeriod = { ...cls, idx, startM, endM };
      activeIndex = idx;
      if (idx + 1 < schedule.length) nextPeriod = schedule[idx + 1];
      break;
    } else if (currentMinutes < startM && !nextPeriod) {
      nextPeriod = { ...cls, idx, startM, endM };
    }
  }

  // Update Topbar
  const isLunchTime = currentMinutes >= 790 && currentMinutes < 840; // 01:10 PM to 02:00 PM

  if (tickerText) {
    if (activePeriod) {
      const sub = getSubjectById(activePeriod.subject);
      const remMins = activePeriod.endM - currentMinutes;
      tickerText.textContent = `🔴 LIVE: ${sub.abbr} (${formatTime12(activePeriod.start)} to ${formatTime12(activePeriod.end)}) · ${remMins}m left`;
    } else if (isLunchTime) {
      tickerText.textContent = `🍱 LUNCH BREAK: 01:10 PM to 02:00 PM (${840 - currentMinutes}m left)`;
    } else {
      tickerText.textContent = `☕ No Active Class Right Now`;
    }
  }

  // Update Dashboard Billboard
  if (billboard) {
    const todayRecord = getRecord(todayS);
    const classesLog = (todayRecord && todayRecord.classes) || [];

    if (activePeriod) {
      const sub = getSubjectById(activePeriod.subject);
      const remMins = Math.max(0, activePeriod.endM - currentMinutes);
      const elapsedMins = Math.max(0, currentMinutes - activePeriod.startM);
      const totalSlotDuration = activePeriod.endM - activePeriod.startM;
      const progressPercent = Math.min(100, Math.max(0, (elapsedMins / totalSlotDuration) * 100));

      const matchSlot = classesLog.find(c => c.slotIdx === activePeriod.idx);
      const curStatus = matchSlot ? matchSlot.status : 'unmarked';

      billboard.innerHTML = `
        <div class="billboard-active-card">
          <div class="billboard-top-strip">
            <div class="billboard-live-pulse-badge">
              <span class="pulse-live-dot"></span>
              <span>🔴 LIVE CLASS RUNNING RIGHT NOW</span>
            </div>
            <div class="billboard-slot-id">Period #${activePeriod.idx + 1} of ${schedule.length}</div>
          </div>

          <div class="billboard-main-content">
            <div class="billboard-sub-name-row">
              <h3 class="billboard-subject-name">${sub.name}</h3>
              <span class="billboard-code-badge">${sub.abbr}</span>
            </div>

            <!-- EXACT TIME SPAN (CURRENT ACTIVE CLASS ONLY) -->
            <div class="billboard-time-window">
              <span class="time-window-icon">⏰</span>
              <div class="time-window-text">
                <strong style="font-size:1.05rem;color:var(--text-primary)">From ${formatTime12(activePeriod.start)} to ${formatTime12(activePeriod.end)}</strong>
                <span class="time-window-rem">⏱️ ${remMins} minutes remaining</span>
              </div>
            </div>

            <div class="billboard-progress-bar">
              <div class="billboard-progress-fill" style="width:${progressPercent}%"></div>
            </div>

            <div class="billboard-actions-strip">
              <div class="billboard-status-indicator">
                Current Status: <span class="status-pill-badge chip-${curStatus}">${curStatus.toUpperCase()}</span>
              </div>
              <div class="billboard-quick-btns">
                <button class="btn-action-primary ${curStatus === 'present' ? 'btn-active-glow' : ''}" onclick="markSlotLive(${activePeriod.idx}, 'present')">
                  ✓ Present
                </button>
                <button class="btn-action-danger ${curStatus === 'absent' ? 'btn-active-glow' : ''}" onclick="markSlotLive(${activePeriod.idx}, 'absent')">
                  ✕ Absent
                </button>
              </div>
            </div>

            <div class="billboard-footer-row">
              <div class="billboard-hall-info">📍 Classroom: <strong>Room MV 308</strong> · CSE (AI &amp; ML)</div>
              <div class="billboard-next-info">⚡ Active Session in Progress</div>
            </div>
          </div>
        </div>
      `;
    } else if (isLunchTime) {
      const remLunch = 840 - currentMinutes;
      const elapsedLunch = currentMinutes - 790;
      const lunchProg = Math.min(100, Math.max(0, (elapsedLunch / 50) * 100));

      billboard.innerHTML = `
        <div class="billboard-active-card billboard-lunch-card">
          <div class="billboard-top-strip">
            <div class="billboard-lunch-pulse-badge">
              <span class="pulse-amber-dot"></span>
              <span>🍱 LUNCH &amp; REFRESHMENT BREAK</span>
            </div>
            <div class="billboard-slot-id">50 Mins Campus Recess</div>
          </div>

          <div class="billboard-main-content">
            <div class="billboard-sub-name-row">
              <h3 class="billboard-subject-name">College Lunch Interval</h3>
              <span class="billboard-code-badge" style="background:var(--color-amber);color:#000">RECESS</span>
            </div>

            <div class="billboard-time-window">
              <span class="time-window-icon">🍱</span>
              <div class="time-window-text">
                <strong style="font-size:1.05rem;color:var(--text-primary)">From 01:10 PM to 02:00 PM</strong>
                <span class="time-window-rem" style="color:var(--color-amber)">⏱️ ${remLunch} minutes remaining in lunch interval</span>
              </div>
            </div>

            <div class="billboard-progress-bar">
              <div class="billboard-progress-fill" style="width:${lunchProg}%;background:linear-gradient(90deg, var(--color-amber), var(--color-rose))"></div>
            </div>

            <div class="billboard-footer-row">
              <div class="billboard-hall-info">📍 Venue: <strong>Campus Cafeteria / Canteen</strong></div>
              <div class="billboard-next-info">Next Lecture: <strong>02:00 PM</strong> (Room MV 308)</div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Clean Standby / Recess / Break - strictly without future previews
      billboard.innerHTML = `
        <div class="billboard-standby-card">
          <div class="billboard-top-strip">
            <div class="billboard-standby-badge">
              <span>☕ RECESS / NO ACTIVE CLASS</span>
            </div>
            <div class="billboard-slot-id">Status: Standby</div>
          </div>

          <div class="billboard-main-content">
            <h3 class="billboard-subject-name" style="font-size:1.2rem">No Class Running Right Now</h3>
            <p style="font-size:0.88rem;color:var(--text-secondary);margin-top:0.35rem">
              Currently in break or off-hours interval. The radar will automatically trigger as soon as the next class begins.
            </p>

            <div class="billboard-footer-row" style="margin-top:1rem">
              <div class="billboard-hall-info">📍 Assigned Hall: <strong>Room MV 308</strong></div>
              <button class="btn-action-secondary" onclick="navigate('attendance')" style="padding:0.4rem 0.85rem;font-size:0.78rem">View Full Today Schedule</button>
            </div>
          </div>
        </div>
      `;
    }
  }
}

function markSlotLive(slotIdx, status) {
  const dStr = todayStr();
  const schedule = getTimetableForDate(dStr);
  let rec = getRecord(dStr) || { holiday: false, classes: [] };

  if (rec.classes.length === 0) {
    rec.classes = schedule.map((c, i) => ({ slotIdx: i, subject: c.subject, status: 'unmarked' }));
  }

  const match = rec.classes.find(c => c.slotIdx === slotIdx);
  if (match) {
    match.status = status;
  } else if (schedule[slotIdx]) {
    rec.classes.push({ slotIdx, subject: schedule[slotIdx].subject, status });
  }

  setRecord(dStr, rec);
  renderDashboard();
  showToast(`✅ Period #${slotIdx + 1} marked ${status.toUpperCase()}`);
}

// ============================================================
// DASHBOARD RENDERING
// ============================================================
function renderDashboard() {
  const now = new Date();
  const todayS = todayStr();

  const dateEl = document.getElementById('hero-date-text');
  if (dateEl) dateEl.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' });

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning, Shakib 👋' : hour < 17 ? 'Good afternoon, Shakib ⚡' : 'Good evening, Shakib 🌙';
  const greetEl = document.getElementById('hero-greeting-text');
  if (greetEl) greetEl.textContent = greeting;

  const stats = overallStats();
  const overallPctVal = pct(stats.attended, stats.total);
  updateRing(overallPctVal);

  const safeSet = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  safeSet('topbar-pct-val', overallPctVal.toFixed(1) + '%');
  safeSet('dash-total', stats.total);
  safeSet('dash-attended', stats.attended);
  safeSet('dash-missed', stats.absent);
  safeSet('dash-target-val', (appData.target || 75) + '%');

  const statusEl = document.getElementById('dash-target-status');
  if (statusEl) {
    if (overallPctVal >= (appData.target || 75)) {
      statusEl.textContent = '🟢 SAFE ZONE';
      statusEl.style.color = 'var(--color-emerald)';
    } else if (overallPctVal >= (appData.target || 75) - 10) {
      statusEl.textContent = '🟡 WARNING';
      statusEl.style.color = 'var(--color-amber)';
    } else {
      statusEl.textContent = '🔴 SHORTAGE';
      statusEl.style.color = 'var(--color-rose)';
    }
  }

  const insightEl = document.getElementById('smart-insight-text');
  if (insightEl) {
    const pred = computePredictor(stats.total, stats.attended, appData.target || 75);
    insightEl.innerHTML = pred.msg;
  }

  // Semester Progress
  const start = parseDateStr(appData.semStart || '2026-08-01');
  const end = parseDateStr(appData.semEnd || '2026-12-31');
  const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const elapsed = Math.max(0, Math.min(totalDays, Math.ceil((now - start) / (1000 * 60 * 60 * 24))));
  const progPct = Math.min(100, (elapsed / totalDays) * 100);
  safeSet('sem-term-pct', `${progPct.toFixed(0)}%`);
  safeSet('sem-term-days', `Week ${Math.ceil(elapsed / 7)} · ${totalDays - elapsed}d left`);

  renderTodayCards(todayS);
  renderDashboardCourseCards(stats.subjectMap);
  renderStreaks();
  renderTrend();
  updateLivePeriodRadar();
}

function renderTodayCards(todayS) {
  const lbl = document.getElementById('dash-today-label');
  if (lbl) lbl.textContent = `${getDayName(todayS)} (${formatDateFull(todayS)})`;

  const container = document.getElementById('today-classes-cards');
  if (!container) return;
  container.innerHTML = '';

  const schedule = getTimetableForDate(todayS);
  const sideCount = document.getElementById('side-today-count');
  if (sideCount) sideCount.textContent = schedule.length;

  if (isSunday(todayS)) {
    container.innerHTML = '<div style="grid-column:1/-1;padding:2.5rem;text-align:center;color:var(--text-muted);background:var(--bg-card);border-radius:var(--radius-lg)">☀️ Sunday — No classes scheduled today. Enjoy your break!</div>';
    return;
  }
  if (schedule.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;padding:2.5rem;text-align:center;color:var(--text-muted);background:var(--bg-card);border-radius:var(--radius-lg)">No timetable classes scheduled for today.</div>';
    return;
  }

  const rec = getRecord(todayS);
  const todayRec = rec && !rec.holiday ? (rec.classes || []) : [];
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  schedule.forEach((cls, idx) => {
    // Insert Lunch Break between Period 4 and Period 5 (idx === 4)
    if (idx === 4) {
      const isLunchLive = isToday(todayS) && currentTime >= '13:10' && currentTime < '14:00';
      const lunchCard = document.createElement('div');
      lunchCard.className = `lecture-touch-card lunch-recess-card ${isLunchLive ? 'is-live-break' : ''}`;
      lunchCard.innerHTML = `
        <div>
          <div class="l-top-row">
            <span class="l-time" style="color:var(--color-amber);font-weight:800;font-size:0.85rem">🍱 01:10 PM – 02:00 PM</span>
            <span class="l-badge ${isLunchLive ? 'chip-live' : 'chip-lunch'}">${isLunchLive ? '🔴 LUNCH BREAK NOW' : 'CAMPUS RECESS (50M)'}</span>
          </div>
          <div class="l-title">Lunch &amp; Refreshment Break</div>
          <div class="l-code" style="color:var(--text-secondary)">📍 Campus Cafeteria &amp; Student Lawn · 50 Mins Interval</div>
        </div>
      `;
      container.appendChild(lunchCard);
    }

    const sub = getSubjectById(cls.subject);
    const existing = todayRec.find(c => c.slotIdx === idx && c.subject === cls.subject);
    const status = isHoliday(todayS) ? 'holiday' : (existing ? existing.status : 'unmarked');
    const isLive = isToday(todayS) && currentTime >= cls.start && currentTime <= cls.end;
    const dayLocked = isDateLocked(todayS);
    const isPermanentPresent = status === 'present'; // Present is permanent even in edit mode

    const card = document.createElement('div');
    card.className = `lecture-touch-card ${isLive ? 'is-live' : ''} ${dayLocked ? 'card-locked' : ''}`;
    card.innerHTML = `
      <div>
        <div class="l-top-row">
          <span class="l-time">⏰ ${formatTime12(cls.start)} – ${formatTime12(cls.end)}</span>
          <span class="l-badge ${isLive ? 'chip-live' : status === 'present' ? 'chip-present' : status === 'absent' ? 'chip-absent' : 'chip-unmarked'}">
            ${isLive ? 'LIVE NOW' : status.toUpperCase()}
          </span>
          ${dayLocked ? '<span class="lock-badge-inline">🔒 LOCKED</span>' : ''}
        </div>
        <div class="l-title">${sub.name}</div>
        <div class="l-code">Room MV 308 · ${sub.abbr}</div>
      </div>
      <div class="l-actions-bar">
        <button class="btn-l-toggle p-btn ${status === 'present' ? 'active' : ''}"
          onclick="setClassStatus('${todayS}', ${idx}, '${cls.subject}', 'present')"
          ${dayLocked || isPermanentPresent ? 'disabled style="opacity:0.45;cursor:not-allowed"' : ''}>
          ✓ Present${isPermanentPresent ? ' 🔒' : ''}
        </button>
        <button class="btn-l-toggle a-btn ${status === 'absent' ? 'active' : ''}"
          onclick="setClassStatus('${todayS}', ${idx}, '${cls.subject}', 'absent')"
          ${dayLocked || isPermanentPresent ? 'disabled style="opacity:0.45;cursor:not-allowed"' : ''}>
          ✕ Absent
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function setClassStatus(dateStr, idx, subject, newStatus) {
  if (isHoliday(dateStr)) {
    showToast('⚠️ Date is marked as a holiday.');
    return;
  }

  // Block changes if date is locked
  if (isDateLocked(dateStr)) {
    showToast('🔒 Attendance is locked. Tap ✏️ Edit to make changes.');
    return;
  }

  let rec = getRecord(dateStr) || { holiday: false, classes: [] };
  if (!rec.classes) rec.classes = [];

  const existingIdx = rec.classes.findIndex(c => c.slotIdx === idx && c.subject === subject);

  // Block downgrade from Present — Present is permanent
  if (existingIdx >= 0 && rec.classes[existingIdx].status === 'present' && newStatus !== 'present') {
    showToast('🛡️ Present attendance is permanent and cannot be changed.');
    return;
  }

  if (existingIdx >= 0) {
    rec.classes[existingIdx].status = newStatus;
  } else {
    rec.classes.push({ subject, slotIdx: idx, status: newStatus });
  }

  // Auto-lock if all periods on today's date are marked (not unmarked)
  const schedule = getTimetableForDate(dateStr);
  const allMarked = schedule.length > 0 && schedule.every((cls, i) => {
    const found = rec.classes.find(c => c.slotIdx === i);
    return found && found.status !== 'unmarked';
  });
  if (allMarked && !editUnlockedDates.has(dateStr)) {
    rec.locked = true;
  }

  setRecord(dateStr, rec);
  renderDashboard();
  loadAttendancePage();
  showToast(`${newStatus === 'present' ? '✅ Marked Present' : '❌ Marked Absent'} for ${subject}`);
}

function markAllToday(status) {
  const todayS = todayStr();
  if (isSunday(todayS)) { showToast('☀️ Sunday — no classes scheduled!'); return; }
  const schedule = getTimetableForDate(todayS);
  if (schedule.length === 0) return;

  let rec = { holiday: false, classes: schedule.map((c, i) => ({ subject: c.subject, slotIdx: i, status })) };
  setRecord(todayS, rec);
  renderDashboard();
  showToast(status === 'present' ? '🎉 Full day marked Present!' : '❌ Full day marked Absent!');
}

function markTodayHoliday() {
  const todayS = todayStr();
  const isHol = isHoliday(todayS);
  setRecord(todayS, { holiday: !isHol, classes: [] });
  renderDashboard();
  showToast(!isHol ? '🏖️ Today marked as College Holiday' : 'Holiday cleared');
}

// ============================================================
// COURSES, STREAKS, TRENDS
// ============================================================
function renderDashboardCourseCards(subjectMap) {
  const el = document.getElementById('dash-subject-bars');
  if (!el) return;
  el.innerHTML = '';
  const target = appData.target || 75;

  DEFAULT_SUBJECTS.forEach(sub => {
    const sm = subjectMap[sub.id] || { total: 0, attended: 0, absent: 0 };
    const hasRecords = sm.total > 0;
    const p = hasRecords ? pct(sm.attended, sm.total) : 0;
    const colorVal = !hasRecords ? 'var(--text-muted)' : p >= target ? 'var(--color-emerald)' : p >= target - 10 ? 'var(--color-amber)' : 'var(--color-rose)';
    const statusPill = !hasRecords ? '<span class="status-pill-badge chip-unmarked">READY TO LOG</span>' : p >= target ? '<span class="status-pill-badge chip-present">SAFE ZONE</span>' : p >= target - 10 ? '<span class="status-pill-badge chip-partial">WARNING</span>' : '<span class="status-pill-badge chip-absent">SHORTAGE</span>';

    const card = document.createElement('div');
    card.className = 'course-card-pro';
    card.innerHTML = `
      <div class="c-head">
        <div>
          <div class="c-name">${sub.name}</div>
          <span class="c-tag">${sub.tag} · Room MV 308</span>
        </div>
        <span class="c-code-badge">${sub.abbr}</span>
      </div>
      <div class="c-metric-row">
        <span class="c-pct-text" style="color:${colorVal}">${hasRecords ? p.toFixed(1) + '%' : '0.0%'}</span>
        <span class="c-ratio-text">${sm.attended}/${sm.total} classes</span>
      </div>
      <div class="c-track" style="margin: 0.5rem 0"><div class="c-fill" style="width:${hasRecords ? Math.min(p, 100) : 0}%;background:${colorVal}"></div></div>
      <div style="margin-top:0.65rem;display:flex;justify-content:space-between;align-items:center">
        ${statusPill}
        <span style="font-size:0.72rem;color:var(--text-muted);font-weight:700">Target: ${target}%</span>
      </div>
    `;
    el.appendChild(card);
  });
}

// ============================================================
// COURSE MATRIX & COMPREHENSIVE ACADEMIC LEDGER
// ============================================================
function renderSubjects() {
  const gridEl = document.getElementById('subjects-grid');
  const tableBody = document.getElementById('subjects-table-body');
  const target = appData.target || 75;

  const stats = computeStats();
  const subjectMap = stats.subjectMap;

  let safeCount = 0;
  let criticalCount = 0;

  // Process counts
  DEFAULT_SUBJECTS.forEach(sub => {
    const sm = subjectMap[sub.id] || { total: 0, attended: 0, absent: 0 };
    if (sm.total > 0) {
      const p = pct(sm.attended, sm.total);
      if (p >= target) safeCount++;
      else criticalCount++;
    }
  });

  // Summary Deck
  const safeSet = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  safeSet('cm-total-courses', `${DEFAULT_SUBJECTS.length} Enrolled`);
  safeSet('cm-safe-courses', `${safeCount} Safe`);
  safeSet('cm-critical-courses', `${criticalCount} Attention Required`);
  safeSet('cm-target-pct', `${target.toFixed(1)}% Minimum`);

  // Render Grid Cards
  if (gridEl) {
    gridEl.innerHTML = DEFAULT_SUBJECTS.map(sub => {
      const sm = subjectMap[sub.id] || { total: 0, attended: 0, absent: 0 };
      const hasRecords = sm.total > 0;
      const p = hasRecords ? pct(sm.attended, sm.total) : 0;
      const colorVal = !hasRecords ? 'var(--text-muted)' : p >= target ? 'var(--color-emerald)' : p >= target - 10 ? 'var(--color-amber)' : 'var(--color-rose)';

      // AI Advice Calculation
      let adviceText = '';
      if (!hasRecords) {
        adviceText = '🎯 Ready to Log · 0 Conducted so far';
      } else if (p >= target) {
        const canSkip = Math.floor((sm.attended - (target / 100) * sm.total) / (target / 100));
        adviceText = canSkip > 0
          ? `🟢 <strong>Safe Margin:</strong> Can miss up to <strong>${canSkip}</strong> lecture${canSkip > 1 ? 's' : ''} safely`
          : `🟢 <strong>On Track:</strong> Exactly on the ${target}% threshold boundary`;
      } else {
        const needed = Math.ceil(((target / 100) * sm.total - sm.attended) / (1 - (target / 100)));
        adviceText = `🔴 <strong>Shortage:</strong> Must attend next <strong>${needed}</strong> consecutive lecture${needed > 1 ? 's' : ''}`;
      }

      return `
        <div class="course-matrix-card">
          <div class="cm-card-head">
            <div class="cm-card-meta">
              <span class="cm-code-badge">${sub.abbr}</span>
              <span class="cm-tag-pill">${sub.tag}</span>
            </div>
            <span class="cm-room-badge">MV 308</span>
          </div>

          <h3 class="cm-card-title">${sub.name}</h3>

          <div class="cm-score-row">
            <div class="cm-pct-big" style="color:${colorVal}">
              ${hasRecords ? p.toFixed(1) + '%' : '—'}
            </div>
            <div class="cm-counts-stack">
              <div class="cm-stat-item"><span class="cm-lbl">Conducted:</span> <strong>${sm.total}</strong></div>
              <div class="cm-stat-item text-emerald"><span class="cm-lbl">Attended:</span> <strong>${sm.attended}</strong></div>
              <div class="cm-stat-item text-rose"><span class="cm-lbl">Missed:</span> <strong>${sm.absent}</strong></div>
            </div>
          </div>

          <div class="c-track" style="margin: 0.85rem 0">
            <div class="c-fill" style="width:${hasRecords ? Math.min(p, 100) : 0}%; background:${colorVal}"></div>
          </div>

          <div class="cm-advice-box">
            ${adviceText}
          </div>

          <div class="cm-card-footer">
            <button class="btn-cm-simulate" onclick="quickSimulateSubject('${sub.id}')">
              🔮 Simulate Scenarios
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Table Ledger
  if (tableBody) {
    tableBody.innerHTML = DEFAULT_SUBJECTS.map(sub => {
      const sm = subjectMap[sub.id] || { total: 0, attended: 0, absent: 0 };
      const hasRecords = sm.total > 0;
      const p = hasRecords ? pct(sm.attended, sm.total) : 0;
      const statusBadge = !hasRecords
        ? '<span class="status-pill-badge chip-unmarked">UNMARKED</span>'
        : p >= target
          ? '<span class="status-pill-badge chip-present">🟢 SAFE ZONE</span>'
          : p >= target - 10
            ? '<span class="status-pill-badge chip-partial">🟡 WARNING</span>'
            : '<span class="status-pill-badge chip-absent">🔴 SHORTAGE</span>';

      return `
        <tr>
          <td>
            <strong>${sub.name}</strong>
          </td>
          <td>
            <span class="cm-code-badge">${sub.abbr}</span>
          </td>
          <td>
            <span class="cm-tag-pill">${sub.tag}</span>
          </td>
          <td><strong>${sm.total}</strong></td>
          <td style="color:var(--color-emerald);font-weight:800">${sm.attended}</td>
          <td style="color:var(--color-rose);font-weight:800">${sm.absent}</td>
          <td>
            <strong style="font-family:var(--font-mono);font-size:1.05rem;color:${!hasRecords ? 'var(--text-muted)' : p >= target ? 'var(--color-emerald)' : 'var(--color-rose)'}">
              ${hasRecords ? p.toFixed(1) + '%' : '0.0%'}
            </strong>
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:0.6rem">
              ${statusBadge}
              <button class="btn-mini-sim" onclick="quickSimulateSubject('${sub.id}')" title="Simulate this course">🔮</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

function quickSimulateSubject(subId) {
  navigate('whatif');
  const sel = document.getElementById('wi-subject');
  if (sel) {
    sel.value = subId;
    runWhatIf();
  }
}

function renderStreaks() {
  const el = document.getElementById('streaks-row');
  if (!el) return;

  let currentStreak = 0, bestStreak = 0, tempStreak = 0, totalPresent = 0, totalMarked = 0;
  const dates = Object.keys(appData.attendance).filter(d => !isFuture(d) && !isSunday(d)).sort();

  dates.forEach(d => {
    const rec = appData.attendance[d];
    if (!rec || rec.holiday) return;
    const classes = rec.classes || [];
    if (classes.length === 0) return;
    totalMarked++;
    const presentCount = classes.filter(c => c.status === 'present').length;
    totalPresent += presentCount;
    if (presentCount > 0) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  });

  const rev = [...dates].reverse();
  for (const d of rev) {
    const rec = appData.attendance[d];
    if (!rec || rec.holiday) break;
    const classes = rec.classes || [];
    if (classes.length === 0) break;
    if (classes.filter(c => c.status === 'present').length > 0) currentStreak++;
    else break;
  }

  el.innerHTML = `
    <div class="streak-cell"><div class="streak-emoji">🔥</div><div class="streak-val" style="color:var(--color-emerald)">${currentStreak}</div><div class="streak-lbl">Current Streak (Days)</div></div>
    <div class="streak-cell"><div class="streak-emoji">🏆</div><div class="streak-val">${bestStreak}</div><div class="streak-lbl">All-Time Best (Days)</div></div>
    <div class="streak-cell"><div class="streak-emoji">📅</div><div class="streak-val">${totalMarked}</div><div class="streak-lbl">Total Days Tracked</div></div>
    <div class="streak-cell"><div class="streak-emoji">⚡</div><div class="streak-val" style="color:var(--color-cyan)">${totalPresent}</div><div class="streak-lbl">Lecture Sessions Attended</div></div>
  `;
}

function renderTrend() {
  const el = document.getElementById('trend-content');
  const badge = document.getElementById('trend-direction');
  if (!el) return;

  const now = new Date();
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const wStart = new Date(now);
    wStart.setDate(now.getDate() - (i * 7) - now.getDay() + 1);
    const wEnd = new Date(wStart);
    wEnd.setDate(wStart.getDate() + 6);
    const sStr = wStart.toISOString().slice(0, 10);
    const eStr = wEnd.toISOString().slice(0, 10);
    const wStats = computeStats(d => d >= sStr && d <= eStr);
    weeks.push({ label: `W${8 - i}`, pct: pct(wStats.attended, wStats.total), total: wStats.total });
  }

  const activeWeeks = weeks.filter(w => w.total > 0);
  let dir = '↔ Steady Compliance';
  if (activeWeeks.length >= 2) {
    const last = activeWeeks[activeWeeks.length - 1].pct;
    const prev = activeWeeks[activeWeeks.length - 2].pct;
    if (last > prev + 1) dir = '📈 Positive Velocity';
    else if (last < prev - 1) dir = '📉 Negative Velocity';
  }
  if (badge) badge.textContent = dir;

  const barsHtml = weeks.map(w => {
    const h = w.total === 0 ? 8 : Math.max(8, (w.pct / 100) * 100);
    return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;height:110px;justify-content:flex-end;gap:4px">
        <div style="font-size:0.75rem;font-weight:800;font-family:var(--font-mono);color:var(--text-primary)">${w.total > 0 ? w.pct.toFixed(0) + '%' : '—'}</div>
        <div style="width:100%;max-width:36px;border-radius:4px 4px 0 0;background:var(--color-indigo);height:${h}%;transition:height 0.6s ease"></div>
        <div style="font-size:0.7rem;color:var(--text-muted);font-family:var(--font-mono)">${w.label}</div>
      </div>
    `;
  }).join('');

  el.innerHTML = `<div style="display:flex;align-items:flex-end;gap:0.75rem;padding:0 0.5rem">${barsHtml}</div>`;
}

// ============================================================
// MARK ATTENDANCE PAGE
// ============================================================
function loadAttendancePage() {
  const picker = document.getElementById('attendance-date-picker');
  const dateStr = (picker && picker.value) ? picker.value : todayStr();
  selectedDate = dateStr;

  const banner = document.getElementById('attendance-day-info');
  const schedule = getTimetableForDate(dateStr);
  const dayLocked = isDateLocked(dateStr);

  if (banner) {
    const lockBanner = dayLocked ? `
      <div style="
        display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;
        background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);
        border-radius:14px;padding:0.85rem 1.2rem;margin-bottom:1rem;
      ">
        <div style="display:flex;align-items:center;gap:0.6rem">
          <span style="font-size:1.3rem">🔒</span>
          <div>
            <div style="font-size:0.85rem;font-weight:800;color:var(--color-emerald)">Attendance Locked & Saved</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">Present classes are permanent. You can still change Absent entries in Edit mode.</div>
          </div>
        </div>
        <button onclick="unlockDateForEdit('${dateStr}')" style="
          background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);color:var(--color-amber);
          padding:0.45rem 1rem;border-radius:9999px;font-weight:800;font-size:0.82rem;cursor:pointer;
        ">✏️ Edit Attendance</button>
      </div>
    ` : (editUnlockedDates.has(dateStr) ? `
      <div style="
        display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;
        background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);
        border-radius:14px;padding:0.85rem 1.2rem;margin-bottom:1rem;
      ">
        <div style="display:flex;align-items:center;gap:0.6rem">
          <span style="font-size:1.3rem">✏️</span>
          <div>
            <div style="font-size:0.85rem;font-weight:800;color:var(--color-amber)">Edit Mode Active</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">Note: Classes marked Present 🔒 cannot be changed.</div>
          </div>
        </div>
        <button onclick="relockDate('${dateStr}')" style="
          background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);color:var(--color-emerald);
          padding:0.45rem 1rem;border-radius:9999px;font-weight:800;font-size:0.82rem;cursor:pointer;
        ">🔒 Save & Lock</button>
      </div>
    ` : '');

    banner.innerHTML = `
      ${lockBanner}
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;margin-bottom:1rem">
        <div>
          <div style="font-size:0.75rem;font-weight:800;color:var(--text-muted)">ATTENDANCE LOG</div>
          <div style="font-size:1rem;font-weight:800;color:var(--text-primary);margin-top:2px">📅 ${formatDateFull(dateStr)}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">${schedule.length} periods scheduled</div>
        </div>
        <input type="date" id="attendance-date-picker" value="${dateStr}" onchange="loadAttendancePage()" style="
          background:var(--bg-subtle);border:1px solid var(--border-glass);color:var(--text-primary);
          padding:0.5rem 0.85rem;border-radius:10px;font-size:0.85rem;font-family:inherit;
        " />
      </div>
      ${ !dayLocked ? `
      <div id="att-quick-actions" style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-bottom:1.25rem">
        <button onclick="markSelectedAll('present')" style="background:var(--color-emerald);color:#fff;border:none;padding:0.55rem 1rem;border-radius:9px;font-weight:700;font-size:0.82rem;cursor:pointer">✓ All Present</button>
        <button onclick="markSelectedAll('absent')" style="background:var(--bg-subtle);border:1px solid rgba(244,63,94,0.4);color:var(--color-rose);padding:0.55rem 1rem;border-radius:9px;font-weight:700;font-size:0.82rem;cursor:pointer">✕ All Absent</button>
        <button onclick="markSelectedHoliday()" style="background:var(--bg-subtle);border:1px solid rgba(168,85,247,0.4);color:var(--color-purple);padding:0.55rem 1rem;border-radius:9px;font-weight:700;font-size:0.82rem;cursor:pointer">🏖️ Holiday</button>
        <button onclick="saveAndLockDay('${dateStr}')" style="background:var(--color-indigo);color:#fff;border:none;padding:0.55rem 1rem;border-radius:9px;font-weight:800;font-size:0.82rem;cursor:pointer;margin-left:auto">💾 Save & Lock</button>
      </div>` : '' }
    `;
  }

  const container = document.getElementById('attendance-classes-list');
  if (!container) return;
  container.innerHTML = '';

  if (isSunday(dateStr)) {
    container.innerHTML = '<div style="grid-column:1/-1;padding:2.5rem;text-align:center;color:var(--text-muted)">☀️ Sunday — College Holiday</div>';
    return;
  }
  if (isFuture(dateStr)) {
    container.innerHTML = '<div style="grid-column:1/-1;padding:2.5rem;text-align:center;color:var(--text-muted)">⏳ Future date — Cannot log attendance ahead of time.</div>';
    return;
  }
  if (isHoliday(dateStr)) {
    container.innerHTML = '<div style="grid-column:1/-1;padding:2.5rem;text-align:center;color:var(--color-amber)">🏖️ Declared College Holiday<br><button class="btn-action-primary" style="margin-top:1rem" onclick="clearHoliday(\'' + dateStr + '\')">Remove Holiday</button></div>';
    return;
  }

  const rec = getRecord(dateStr);
  const todayRec = rec ? (rec.classes || []) : [];

  schedule.forEach((cls, idx) => {
    // Insert Lunch Break between Period 4 and Period 5 (idx === 4)
    if (idx === 4) {
      const lunchCard = document.createElement('div');
      lunchCard.className = 'lunch-break-slot-card';
      lunchCard.innerHTML = `
        <div class="lunch-card-inner">
          <div class="lunch-icon-badge">🍱</div>
          <div class="lunch-details">
            <div class="lunch-time-row">
              <span class="lunch-time-text">⏰ 01:10 PM – 02:00 PM</span>
              <span class="status-pill-badge chip-lunch">CAMPUS RECESS (50M)</span>
            </div>
            <div class="lunch-title">Lunch &amp; Refreshment Break</div>
            <div class="lunch-meta">📍 Campus Cafeteria &amp; Student Lawn</div>
          </div>
        </div>
      `;
      container.appendChild(lunchCard);
    }

    const sub = getSubjectById(cls.subject);
    const existing = todayRec.find(c => c.slotIdx === idx && c.subject === cls.subject);
    const status = existing ? existing.status : 'unmarked';
    const isPermanentPresent = status === 'present';
    const isLocked = isDateLocked(dateStr);

    const card = document.createElement('div');
    card.className = `lecture-touch-card${isLocked ? ' card-locked' : ''}`;
    card.innerHTML = `
      <div>
        <div class="l-top-row">
          <span class="l-time">⏰ ${formatTime12(cls.start)} – ${formatTime12(cls.end)}</span>
          <div style="display:flex;align-items:center;gap:0.4rem">
            <span class="l-badge ${status === 'present' ? 'chip-present' : status === 'absent' ? 'chip-absent' : 'chip-unmarked'}">${status.toUpperCase()}</span>
            ${isLocked ? '<span class="lock-badge-inline">🔒</span>' : ''}
          </div>
        </div>
        <div class="l-title">${sub.name}</div>
        <div class="l-code">${sub.abbr} · MV 308</div>
      </div>
      <div class="l-actions-bar">
        <button class="btn-l-toggle p-btn ${status === 'present' ? 'active' : ''}"
          onclick="setClassStatus('${dateStr}', ${idx}, '${cls.subject}', 'present')"
          ${isLocked || isPermanentPresent ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>
          ✓ Present${isPermanentPresent ? ' 🔒' : ''}
        </button>
        <button class="btn-l-toggle a-btn ${status === 'absent' ? 'active' : ''}"
          onclick="setClassStatus('${dateStr}', ${idx}, '${cls.subject}', 'absent')"
          ${isLocked || isPermanentPresent ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>
          ✕ Absent
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function saveAndLockDay(dateStr) {
  const rec = getRecord(dateStr);
  if (!rec || (rec.classes || []).length === 0) {
    showToast('⚠️ No attendance marked yet. Mark at least one period first.');
    return;
  }
  relockDate(dateStr);
  showToast('💾 Attendance saved & locked!');
  renderDashboard();
}

function saveAttendance() {
  lockDateRecord(selectedDate);
  editUnlockedDates.delete(selectedDate);
  showToast('💾 Attendance saved & locked! ✅');
  loadAttendancePage();
  renderDashboard();
}

function markSelectedAll(status) {
  const schedule = getTimetableForDate(selectedDate);
  if (schedule.length === 0) return;
  setRecord(selectedDate, { holiday: false, classes: schedule.map((c, i) => ({ subject: c.subject, slotIdx: i, status })) });
  loadAttendancePage();
  showToast(`Day saved as ${status}`);
}

function markSelectedHoliday() {
  const isHol = isHoliday(selectedDate);
  setRecord(selectedDate, { holiday: !isHol, classes: [] });
  loadAttendancePage();
  showToast(!isHol ? '🏖️ Holiday logged' : 'Holiday removed');
}

function clearHoliday(dateStr) {
  setRecord(dateStr, { holiday: false, classes: [] });
  loadAttendancePage();
}


// ============================================================
// AI ADVISOR & WHAT-IF
// ============================================================
function renderAdvisor() {
  const stats = overallStats();
  const target = appData.target || 75;
  const overallP = pct(stats.attended, stats.total);

  const overallEl = document.getElementById('advisor-overall');
  if (overallEl) {
    const pred = computePredictor(stats.total, stats.attended, target);
    overallEl.innerHTML = `
      <div style="display:flex;gap:2rem;align-items:center;flex-wrap:wrap">
        <div><div style="font-size:0.75rem;font-weight:700;color:var(--text-muted)">OVERALL COMPLIANCE</div><div style="font-size:2rem;font-weight:900;font-family:var(--font-mono);color:var(--color-cyan)">${overallP.toFixed(1)}%</div></div>
        <div><div style="font-size:0.75rem;font-weight:700;color:var(--text-muted)">LECTURES ATTENDED</div><div style="font-size:2rem;font-weight:900;font-family:var(--font-mono);color:var(--text-primary)">${stats.attended}/${stats.total}</div></div>
        <div><div style="font-size:0.75rem;font-weight:700;color:var(--text-muted)">TARGET GOAL</div><div style="font-size:2rem;font-weight:900;font-family:var(--font-mono);color:var(--text-primary)">${target}%</div></div>
        <div style="flex:1;min-width:260px"><div style="font-size:0.75rem;font-weight:700;color:var(--text-muted)">AI ADVISORY</div><div style="font-size:0.95rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem;line-height:1.45">${pred.msg}</div></div>
      </div>
    `;
  }

  const subsEl = document.getElementById('advisor-subjects');
  if (subsEl) {
    subsEl.innerHTML = '';
    DEFAULT_SUBJECTS.forEach(sub => {
      const sm = stats.subjectMap[sub.id] || { total: 0, attended: 0, absent: 0 };
      if (sm.total === 0) return;
      const p = pct(sm.attended, sm.total);
      const pred = computePredictor(sm.total, sm.attended, target);
      const row = document.createElement('div');
      row.className = 'advisor-card-row';
      row.innerHTML = `
        <div>
          <strong>${sub.name}</strong> (${sub.abbr})
          <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:0.2rem">${pred.msg}</div>
        </div>
        <span style="font-size:1.25rem;font-weight:900;font-family:var(--font-mono);color:${p >= target ? 'var(--color-emerald)' : 'var(--color-rose)'}">${p.toFixed(1)}%</span>
      `;
      subsEl.appendChild(row);
    });
  }

  const recsEl = document.getElementById('advisor-recs');
  if (recsEl) {
    recsEl.innerHTML = `
      <div class="advisor-card-row">🎯 <strong>Rule 1 (Golden Buffer):</strong> Keep at least 2 safe skips in reserve per course.</div>
      <div class="advisor-card-row">⚡ <strong>Rule 2 (Lab Compliance):</strong> Node.js &amp; Computational Math Lab require mandatory presence.</div>
      <div class="advisor-card-row">🚨 <strong>Rule 3 (Detention Alert):</strong> Any subject dropping below 65% triggers immediate warning.</div>
    `;
  }
}

function populateWhatIfSubjects() {
  const sel = document.getElementById('wi-subject');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select Course —</option>';
  DEFAULT_SUBJECTS.forEach(s => {
    sel.innerHTML += `<option value="${s.id}">${s.abbr} — ${s.name}</option>`;
  });
}

function runWhatIf() {
  const stats = overallStats();
  const target = appData.target || 75;

  const miss = parseInt(document.getElementById('wi-miss')?.value) || 0;
  const missRes = document.getElementById('wi-miss-result');
  if (missRes) {
    if (miss > 0) {
      const newP = pct(stats.attended, stats.total + miss);
      missRes.className = 'sim-output-box show ' + (newP >= target ? 'sim-safe' : 'sim-danger');
      missRes.innerHTML = `Skipping <strong>${miss}</strong> lectures drops your attendance to <strong>${newP.toFixed(1)}%</strong>.`;
    } else { missRes.className = 'sim-output-box'; }
  }

  const att = parseInt(document.getElementById('wi-attend')?.value) || 0;
  const attRes = document.getElementById('wi-attend-result');
  if (attRes) {
    if (att > 0) {
      const newP = pct(stats.attended + att, stats.total + att);
      attRes.className = 'sim-output-box show sim-safe';
      attRes.innerHTML = `Attending <strong>${att}</strong> consecutive lectures increases your attendance to <strong>${newP.toFixed(1)}%</strong>.`;
    } else { attRes.className = 'sim-output-box'; }
  }

  const subId = document.getElementById('wi-subject')?.value;
  const subAtt = parseInt(document.getElementById('wi-sub-attend')?.value) || 0;
  const subMiss = parseInt(document.getElementById('wi-sub-miss')?.value) || 0;
  const subRes = document.getElementById('wi-sub-result');
  if (subId && subRes && (subAtt > 0 || subMiss > 0)) {
    const sm = stats.subjectMap[subId] || { total: 0, attended: 0, absent: 0 };
    const newP = pct(sm.attended + subAtt, sm.total + subAtt + subMiss);
    subRes.className = 'sim-output-box show ' + (newP >= target ? 'sim-safe' : 'sim-danger');
    subRes.innerHTML = `Predicted percentage for <strong>${getSubjectById(subId).name}</strong>: <strong>${newP.toFixed(1)}%</strong>`;
  } else if (subRes) {
    subRes.className = 'sim-output-box';
  }
}

// ============================================================
// OFFICIAL 2026 TELANGANA & INDIAN GAZETTED HOLIDAYS DICTIONARY
// ============================================================
const GAZETTED_HOLIDAYS_2026 = {
  '2026-01-01': { name: "New Year's Day", icon: '🎆', type: 'Public Holiday' },
  '2026-01-14': { name: 'Bhogi Festival', icon: '🪁', type: 'State Holiday' },
  '2026-01-15': { name: 'Makara Sankranti / Pongal', icon: '🌾', type: 'General Holiday' },
  '2026-01-26': { name: 'Republic Day', icon: '🇮🇳', type: 'National Holiday' },
  '2026-02-15': { name: 'Maha Shivaratri', icon: '🕉️', type: 'General Holiday' },
  '2026-03-03': { name: 'Holi (Festival of Colors)', icon: '🎨', type: 'General Holiday' },
  '2026-03-19': { name: 'Ugadi (Telugu New Year)', icon: '🌿', type: 'State Festival' },
  '2026-03-21': { name: 'Eid-ul-Fitr (Ramzan)', icon: '🌙', type: 'General Holiday' },
  '2026-03-27': { name: 'Sri Rama Navami', icon: '🏹', type: 'General Holiday' },
  '2026-04-03': { name: 'Good Friday', icon: '✝️', type: 'General Holiday' },
  '2026-04-14': { name: 'Dr. B.R. Ambedkar Jayanti', icon: '⚖️', type: 'General Holiday' },
  '2026-05-01': { name: 'May Day / Telangana Labour Day', icon: '🛠️', type: 'Public Holiday' },
  '2026-05-27': { name: 'Eid-ul-Adha (Bakrid)', icon: '🐑', type: 'General Holiday' },
  '2026-06-02': { name: 'Telangana State Formation Day', icon: '🏛️', type: 'State Holiday' },
  '2026-06-26': { name: 'Muharram', icon: '🏴', type: 'General Holiday' },
  '2026-08-15': { name: 'Independence Day', icon: '🇮🇳', type: 'National Holiday' },
  '2026-08-26': { name: 'Raksha Bandhan', icon: '🎗️', type: 'Optional Holiday' },
  '2026-09-04': { name: 'Sri Krishna Janmashtami', icon: '🦚', type: 'General Holiday' },
  '2026-09-14': { name: 'Vinayaka Chavithi / Ganesh Chaturthi', icon: '🐘', type: 'General Holiday' },
  '2026-09-23': { name: 'Eid Milad-un-Nabi', icon: '🕌', type: 'General Holiday' },
  '2026-10-02': { name: 'Mahatma Gandhi Jayanti', icon: '🕊️', type: 'National Holiday' },
  '2026-10-19': { name: 'Maha Ashtami / Durgashtami', icon: '🌸', type: 'State Holiday' },
  '2026-10-20': { name: 'Vijaya Dashami (Dussehra)', icon: '🏹', type: 'General Holiday' },
  '2026-11-08': { name: 'Deepavali (Diwali)', icon: '🪔', type: 'General Holiday' },
  '2026-11-09': { name: 'Karthika Pournami', icon: '🌕', type: 'Optional Holiday' },
  '2026-12-25': { name: 'Christmas Day', icon: '🎄', type: 'General Holiday' }
};

function getHolidayInfo(dateStr) {
  return GAZETTED_HOLIDAYS_2026[dateStr] || null;
}

// ============================================================
// REAL-TIME INTERACTIVE CALENDAR ENGINE
// ============================================================
function renderCalendar() {
  const monthName = MONTH_NAMES[calMonth];
  const label = document.getElementById('cal-month-label');
  if (label) label.textContent = `${monthName} ${calYear}`;

  const yearBadge = document.getElementById('cal-year-badge');
  if (yearBadge) yearBadge.textContent = `${calYear} Academic Year`;

  const grid = document.getElementById('calendar-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // 7 Column Days Header
  const daysHeader = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  daysHeader.forEach((d, idx) => {
    const isWeekend = idx === 0 || idx === 6;
    grid.innerHTML += `<div class="cal-weekday-header ${isWeekend ? 'cal-weekday-weekend' : ''}">${d}</div>`;
  });

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const totalDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // Previous month trailing padding
  for (let i = 0; i < firstDay; i++) {
    grid.innerHTML += '<div class="cal-real-day-cell cal-day-empty"></div>';
  }

  // Monthly Metrics Calculation
  let monthPresent = 0;
  let monthAbsent = 0;
  let monthHolidays = 0;

  // Render Day Cells
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(calYear, calMonth, day);
    const dayOfWeek = dateObj.getDay();
    const isSun = dayOfWeek === 0;
    const isTodayDate = isToday(dStr);
    const isFutureDate = isFuture(dStr);
    const holidayInfo = getHolidayInfo(dStr);
    const userRec = getRecord(dStr);
    const isUserHoliday = isHoliday(dStr);

    if (holidayInfo || isUserHoliday) monthHolidays++;

    const dayCard = document.createElement('div');
    dayCard.className = 'cal-real-day-cell';

    // Status classes
    if (isSun) dayCard.classList.add('cell-sunday');
    if (isTodayDate) dayCard.classList.add('cell-today');
    if (isFutureDate) dayCard.classList.add('cell-future');
    if (holidayInfo || isUserHoliday) dayCard.classList.add('cell-holiday');

    // Attendance computation for this day
    let statusBadgeHtml = '';
    if (!isSun && !isFutureDate && !holidayInfo && !isUserHoliday) {
      if (userRec && userRec.classes && userRec.classes.length > 0) {
        const pCount = userRec.classes.filter(c => c.status === 'present').length;
        const aCount = userRec.classes.filter(c => c.status === 'absent').length;
        const tot = userRec.classes.length;

        monthPresent += pCount;
        monthAbsent += aCount;

        if (pCount === tot) {
          dayCard.classList.add('cell-present');
          statusBadgeHtml = `<div class="cal-mini-pill pill-green">✓ ${pCount}/${tot} Present</div>`;
        } else if (aCount === tot) {
          dayCard.classList.add('cell-absent');
          statusBadgeHtml = `<div class="cal-mini-pill pill-red">✕ ${aCount}/${tot} Absent</div>`;
        } else if (pCount > 0) {
          dayCard.classList.add('cell-partial');
          statusBadgeHtml = `<div class="cal-mini-pill pill-amber">⚡ ${pCount}/${tot} Partial</div>`;
        }
      } else {
        statusBadgeHtml = `<div class="cal-mini-pill pill-unlogged">• Unmarked</div>`;
      }
    }

    // Holiday badge
    let holidayBadgeHtml = '';
    if (holidayInfo) {
      holidayBadgeHtml = `<div class="cal-holiday-tag" title="${holidayInfo.name}">${holidayInfo.icon} ${holidayInfo.name}</div>`;
    } else if (isUserHoliday) {
      holidayBadgeHtml = `<div class="cal-holiday-tag">🏖️ College Holiday</div>`;
    } else if (isSun) {
      holidayBadgeHtml = `<div class="cal-sunday-tag">☀️ Sunday Off</div>`;
    }

    dayCard.innerHTML = `
      <div class="cal-cell-top">
        <span class="cal-cell-day-num ${isTodayDate ? 'num-today' : ''}">${day}</span>
        ${isTodayDate ? '<span class="cal-today-badge">TODAY</span>' : ''}
      </div>
      <div class="cal-cell-content">
        ${holidayBadgeHtml}
        ${statusBadgeHtml}
      </div>
    `;

    if (!isFutureDate) {
      dayCard.onclick = () => openCalDetail(dStr);
      dayCard.style.cursor = 'pointer';
    }

    grid.appendChild(dayCard);
  }

  // Update Month KPI strip
  const safeSet = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  safeSet('cal-kpi-present', monthPresent);
  safeSet('cal-kpi-absent', monthAbsent);
  safeSet('cal-kpi-holidays', monthHolidays);
  const totalSlots = monthPresent + monthAbsent;
  const monthRate = totalSlots > 0 ? ((monthPresent / totalSlots) * 100).toFixed(1) + '%' : '100.0%';
  safeSet('cal-kpi-rate', monthRate);

  // Populate Upcoming Holidays Card
  renderUpcomingHolidaysList();
}

function renderUpcomingHolidaysList() {
  const container = document.getElementById('upcoming-holidays-list');
  if (!container) return;

  const today = todayStr();
  const allHolidays = Object.entries(GAZETTED_HOLIDAYS_2026)
    .sort(([a], [b]) => a.localeCompare(b));

  container.innerHTML = allHolidays.map(([dStr, hol]) => {
    const isPast = dStr < today;
    const isCurrent = dStr === today;
    return `
      <div class="holiday-mini-card ${isPast ? 'hol-past' : isCurrent ? 'hol-current' : 'hol-upcoming'}">
        <div class="hol-card-icon">${hol.icon}</div>
        <div class="hol-card-info">
          <div class="hol-card-name">${hol.name}</div>
          <div class="hol-card-date">${formatDateFull(dStr)} · <span class="hol-type-tag">${hol.type}</span></div>
        </div>
        ${isCurrent ? '<span class="hol-badge-live">TODAY</span>' : ''}
      </div>
    `;
  }).join('');
}

function calPrev() {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function calNext() {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function calJumpToday() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  renderCalendar();
  showToast('📅 Jumped to current month');
}

function openCalDetail(dateStr) {
  calLastDate = dateStr;
  const modal = document.getElementById('cal-detail-modal');
  const title = document.getElementById('cal-modal-title');
  const body = document.getElementById('cal-modal-body');
  if (!modal || !body) return;

  const holInfo = getHolidayInfo(dateStr);
  const isSun = isSunday(dateStr);

  if (title) title.textContent = formatDateFull(dateStr);
  const rec = getRecord(dateStr);
  const schedule = getTimetableForDate(dateStr);

  if (holInfo) {
    body.innerHTML = `
      <div style="background:rgba(168,85,247,0.14);border:1px solid rgba(168,85,247,0.4);border-radius:var(--radius-md);padding:1.2rem;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:0.4rem">${holInfo.icon}</div>
        <h4 style="font-size:1.2rem;font-weight:900;color:var(--text-primary)">${holInfo.name}</h4>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:0.2rem">Official 2026 Gazetted Holiday (${holInfo.type})</p>
        <p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.6rem">No college attendance required for this day.</p>
      </div>
    `;
  } else if (isSun) {
    body.innerHTML = `
      <div style="background:var(--glass-card-subtle);border:1px solid var(--glass-border);border-radius:var(--radius-md);padding:1.2rem;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:0.4rem">☀️</div>
        <h4 style="font-size:1.2rem;font-weight:900;color:var(--text-primary)">Sunday Weekend Break</h4>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:0.2rem">Campus closed for weekly off.</p>
      </div>
    `;
  } else if (isHoliday(dateStr)) {
    body.innerHTML = `
      <div style="background:rgba(168,85,247,0.14);border:1px solid rgba(168,85,247,0.4);border-radius:var(--radius-md);padding:1.2rem;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:0.4rem">🏖️</div>
        <h4 style="font-size:1.2rem;font-weight:900;color:var(--text-primary)">College Holiday Active</h4>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:0.2rem">Logged as exemption in your attendance records.</p>
      </div>
    `;
  } else if (!rec || !rec.classes || rec.classes.length === 0) {
    body.innerHTML = `
      <div style="padding:1.5rem;text-align:center;color:var(--text-muted)">
        <p>No lecture records logged yet for this date.</p>
        <p style="font-size:0.8rem;margin-top:0.4rem">Click "Edit Day's Log" below to record attendance.</p>
      </div>
    `;
  } else {
    body.innerHTML = '<div style="display:flex;flex-direction:column;gap:0.6rem">' +
      schedule.map((cls, idx) => {
        const sub = getSubjectById(cls.subject);
        const match = rec.classes.find(c => c.slotIdx === idx);
        const st = match ? match.status : 'unmarked';
        return `
          <div class="advisor-card-row">
            <div style="display:flex;align-items:center;gap:0.6rem">
              <span style="font-family:var(--mono);font-size:0.75rem;color:var(--accent-cyan);background:var(--glass-card-subtle);padding:0.2rem 0.5rem;border-radius:4px">${cls.start}–${cls.end}</span>
              <strong>${sub.name}</strong>
            </div>
            <span class="l-badge chip-${st}">${st.toUpperCase()}</span>
          </div>
        `;
      }).join('') +
      '</div>';
  }
  modal.classList.remove('hidden');
}

function goToAttendanceFromCal() {
  document.getElementById('cal-detail-modal')?.classList.add('hidden');
  const picker = document.getElementById('attendance-date-picker');
  if (picker && calLastDate) picker.value = calLastDate;
  navigate('attendance');
}

// ============================================================
// TIMETABLE (PROFESSIONAL VISUAL SCHEDULE & MASTER MATRIX)
// ============================================================
function setTimetableDay(day) {
  activeTimetableDay = day;
  renderTimetable();
}

function renderTimetable() {
  const wrap = document.getElementById('timetable-grid');
  if (!wrap) return;

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Weekly Matrix 📊'];
  const todayName = getDayName(todayStr());

  // Day Filter Tabs
  let tabsHtml = '<div class="timetable-days-nav">';
  days.forEach(day => {
    const isCurToday = day === todayName;
    const isAct = activeTimetableDay === day;
    tabsHtml += `
      <button class="tt-day-tab ${isAct ? 'active' : ''}" onclick="setTimetableDay('${day}')">
        ${isCurToday ? '📍 ' : ''}${day}
        ${isCurToday ? '<span class="tt-tab-today-dot"></span>' : ''}
      </button>
    `;
  });
  tabsHtml += '</div>';

  let contentHtml = '';

  if (activeTimetableDay === 'Weekly Matrix 📊') {
    // Executive Weekly Master Spreadsheet Matrix
    contentHtml += `
      <div class="tt-matrix-wrapper">
        <div class="tt-matrix-header-strip">
          <h3 style="font-size:1.1rem;font-weight:900;color:var(--text-primary)">📊 Full Semester Weekly Time Matrix</h3>
          <span style="font-size:0.75rem;color:var(--text-muted);font-weight:700">Room MV 308 · SEC CSE-AIML</span>
        </div>
        <div class="table-responsive">
          <table class="tt-matrix-table">
            <thead>
              <tr>
                <th style="width:110px">Day</th>
                <th>Period 1<br><small>09:00 AM–10:00 AM</small></th>
                <th>Period 2<br><small>10:00 AM–11:00 AM</small></th>
                <th>Period 3<br><small>11:10 AM–12:10 PM</small></th>
                <th>Period 4<br><small>12:10 PM–01:10 PM</small></th>
                <th style="background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.3);color:var(--color-amber)">🍱 Lunch Break<br><small>01:10 PM–02:00 PM</small></th>
                <th>Period 5<br><small>02:00 PM–03:00 PM</small></th>
                <th>Period 6<br><small>03:00 PM–04:00 PM</small></th>
              </tr>
            </thead>
            <tbody>
              ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => {
      const isTodayRow = d === todayName;
      const classes = appData.timetable[d] || [];
      return `
                  <tr class="${isTodayRow ? 'tt-matrix-today-row' : ''}">
                    <td class="tt-day-label-cell">
                      <strong>${d}</strong>
                      ${isTodayRow ? '<span class="tt-today-inline-pill">TODAY</span>' : ''}
                    </td>
                    ${[0, 1, 2, 3].map(idx => {
        const c = classes[idx];
        if (!c) return '<td class="tt-empty-cell">—</td>';
        const sub = getSubjectById(c.subject);
        return `
                        <td>
                          <div class="tt-matrix-chip">
                            <span class="tt-matrix-sub-abbr">${sub.abbr}</span>
                            <span class="tt-matrix-sub-name">${sub.name}</span>
                          </div>
                        </td>
                      `;
      }).join('')}
                    <td class="tt-lunch-cell">
                      <div class="tt-lunch-matrix-chip">🍱 Lunch (50m)</div>
                    </td>
                    ${[4, 5].map(idx => {
        const c = classes[idx];
        if (!c) return '<td class="tt-empty-cell">—</td>';
        const sub = getSubjectById(c.subject);
        return `
                        <td>
                          <div class="tt-matrix-chip">
                            <span class="tt-matrix-sub-abbr">${sub.abbr}</span>
                            <span class="tt-matrix-sub-name">${sub.name}</span>
                          </div>
                        </td>
                      `;
      }).join('')}
                  </tr>
                `;
    }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    // Individual Day's Visual Slot Deck
    const classes = appData.timetable[activeTimetableDay] || [];
    const isSelectedToday = activeTimetableDay === todayName;

    contentHtml += `
      <div>
        <div class="tt-day-headline-row">
          <div>
            <h3 class="tt-day-headline">📅 ${activeTimetableDay}'s Class Schedule</h3>
            <p style="font-size:0.8rem;color:var(--text-muted);font-weight:600;margin-top:2px">
              ${classes.length} Academic Periods · Room MV 308
            </p>
          </div>
          ${isSelectedToday ? '<span class="status-pill-badge chip-present" style="font-size:0.75rem;padding:0.3rem 0.8rem">⚡ TODAY\'S ACTIVE SCHEDULE</span>' : ''}
        </div>
        <div class="timetable-boxed-grid">
          ${renderDayBoxes(classes)}
        </div>
      </div>
    `;
  }

  // Course Directory Card at Bottom
  contentHtml += `
    <div class="tt-course-directory-card" style="margin-top:2rem">
      <div style="font-size:0.95rem;font-weight:900;color:var(--text-primary);margin-bottom:0.75rem;display:flex;align-items:center;gap:0.4rem">
        <span>📚 Registered Semester Courses</span>
        <span style="font-size:0.72rem;color:var(--text-muted);font-weight:600">(6 Subjects)</span>
      </div>
      <div class="tt-course-chips-grid">
        ${DEFAULT_SUBJECTS.map(s => `
          <div class="tt-course-mini-pill">
            <span class="tt-pill-code">${s.abbr}</span>
            <span class="tt-pill-name">${s.name}</span>
            <span class="tt-pill-tag">${s.tag}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  wrap.innerHTML = tabsHtml + contentHtml;
}

function renderDayBoxes(classes) {
  if (!classes || classes.length === 0) {
    return '<div style="grid-column:1/-1;padding:2.5rem;text-align:center;color:var(--text-muted);background:var(--bg-card);border-radius:var(--radius-lg)">No scheduled periods for this day.</div>';
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isCurDay = activeTimetableDay === getDayName(todayStr());

  let cardsHtml = '';

  classes.forEach((c, idx) => {
    // Insert Lunch Box before Period 5 (idx === 4)
    if (idx === 4) {
      const isLunchLive = isCurDay && currentMinutes >= 790 && currentMinutes < 840;
      cardsHtml += `
        <div class="tt-slot-box tt-lunch-box ${isLunchLive ? 'tt-slot-live' : ''}">
          <div class="tt-slot-header">
            <div style="display:flex;align-items:center;gap:0.45rem">
              <span class="tt-period-num-badge" style="background:var(--color-amber);color:#000">RECESS</span>
              <span class="tt-time-chip">⏰ 01:10 PM – 02:00 PM</span>
            </div>
            <span class="tt-code-pill" style="background:var(--color-amber-bg);color:var(--color-amber)">LUNCH</span>
          </div>
          <div class="tt-sub-name">🍱 Campus Lunch &amp; Refreshment Break</div>
          <div class="tt-sub-footer">
            <span class="tt-venue-chip">📍 Campus Cafeteria &amp; Lawn</span>
            <span class="tt-tag-chip">50 Minutes Recess</span>
            ${isLunchLive ? '<span class="status-pill-badge chip-live">🔴 BREAK NOW</span>' : ''}
          </div>
        </div>
      `;
    }

    const sub = getSubjectById(c.subject);
    const [sh, sm] = c.start.split(':').map(Number);
    const [eh, em] = c.end.split(':').map(Number);
    const isLiveSlot = isCurDay && currentMinutes >= (sh * 60 + sm) && currentMinutes < (eh * 60 + em);

    cardsHtml += `
      <div class="tt-slot-box ${isLiveSlot ? 'tt-slot-live' : ''}">
        <div class="tt-slot-header">
          <div style="display:flex;align-items:center;gap:0.45rem">
            <span class="tt-period-num-badge">Period #${idx + 1}</span>
            <span class="tt-time-chip">⏰ ${formatTime12(c.start)} – ${formatTime12(c.end)}</span>
          </div>
          <span class="tt-code-pill">${sub.abbr}</span>
        </div>

        <div class="tt-sub-name">${sub.name}</div>

        <div class="tt-sub-footer">
          <span class="tt-venue-chip">📍 Room MV 308</span>
          <span class="tt-tag-chip">${sub.tag}</span>
          ${isLiveSlot ? '<span class="status-pill-badge chip-live">🔴 LIVE NOW</span>' : ''}
        </div>
      </div>
    `;
  });

  return cardsHtml;
}

// ============================================================
// AUDIT HISTORY
// ============================================================
function loadHistory() {
  const val = document.getElementById('history-month-picker')?.value;
  const [y, m] = (val || todayStr().slice(0, 7)).split('-').map(Number);

  const list = document.getElementById('history-list');
  if (!list) return;
  list.innerHTML = '';

  const dates = Object.keys(appData.attendance)
    .filter(d => {
      const dt = parseDateStr(d);
      return dt.getFullYear() === y && dt.getMonth() === m - 1;
    })
    .sort().reverse();

  if (dates.length === 0) {
    list.innerHTML = '<div style="padding:2.5rem;text-align:center;color:var(--text-muted)">No records found for the selected month.</div>';
    return;
  }

  dates.forEach(d => {
    const rec = appData.attendance[d];
    const item = document.createElement('div');
    item.className = 'advisor-card-row';
    item.style.marginBottom = '0.65rem';
    const chips = (rec.classes || []).map(c => `<span class="l-badge chip-${c.status}">${getSubjectById(c.subject).abbr}: ${c.status}</span>`).join(' ');
    item.innerHTML = `
      <div>
        <strong style="font-size:0.95rem;color:var(--text-primary)">${formatDateFull(d)}</strong>
        <div style="margin-top:0.35rem;display:flex;gap:0.35rem;flex-wrap:wrap">${rec.holiday ? '<span class="l-badge" style="background:rgba(168,85,247,0.2);color:var(--color-purple)">Holiday</span>' : chips}</div>
      </div>
      <button class="btn-action-secondary" style="padding:0.4rem 0.8rem" onclick="openCalDetail('${d}')">Audit Day</button>
    `;
    list.appendChild(item);
  });
}

// ============================================================
// ACHIEVEMENTS
// ============================================================
function renderAchievements() {
  const el = document.getElementById('achievements-grid');
  if (!el) return;
  const stats = overallStats();
  const ovP = pct(stats.attended, stats.total);

  const badges = [
    { icon: '🎯', name: 'First Audit', desc: 'Logged initial academic attendance', unlocked: stats.total > 0 },
    { icon: '🔥', name: 'Streak Legend', desc: 'Maintained 5+ active attendances', unlocked: stats.attended >= 5 },
    { icon: '🛡️', name: 'Safe Harbor (75%+)', desc: 'Safely above detention threshold', unlocked: ovP >= 75 && stats.total >= 10 },
    { icon: '👑', name: 'Perfect 100', desc: '100% attendance consistency streak', unlocked: ovP >= 99 && stats.total >= 15 },
    { icon: '🤖', name: 'AI Pilot', desc: 'Forecast engine utilized', unlocked: true },
    { icon: '⚡', name: 'Master Scholar', desc: '20+ Lectures completed', unlocked: stats.attended >= 20 }
  ];

  el.innerHTML = badges.map(b => `
    <div class="achievement-tile ${b.unlocked ? 'unlocked' : 'locked'}">
      <div style="font-size:2.4rem;margin-bottom:0.5rem">${b.icon}</div>
      <div style="font-size:1.1rem;font-weight:800;color:var(--text-primary)">${b.name}</div>
      <div style="font-size:0.82rem;color:var(--text-secondary);margin:0.25rem 0 0.8rem">${b.desc}</div>
      <span class="l-badge ${b.unlocked ? 'chip-present' : 'chip-absent'}">${b.unlocked ? '✓ UNLOCKED' : '🔒 LOCKED'}</span>
    </div>
  `).join('');
}

// ============================================================
// SETTINGS
// ============================================================
function loadSettingsPage() {
  const tIn = document.getElementById('target-input');
  if (tIn) tIn.value = appData.target || 75;
  const sIn = document.getElementById('sem-start-input');
  if (sIn) sIn.value = appData.semStart || '2026-08-01';
  const eIn = document.getElementById('sem-end-input');
  if (eIn) eIn.value = appData.semEnd || '2026-12-31';
}

function saveTarget() {
  const val = parseInt(document.getElementById('target-input')?.value) || 75;
  appData.target = val;
  saveData();
  showToast(`🎯 Target benchmark set to ${val}%`);
}

function saveSemesterDates() {
  appData.semStart = document.getElementById('sem-start-input')?.value;
  appData.semEnd = document.getElementById('sem-end-input')?.value;
  saveData();
  showToast('📅 Semester dates saved.');
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `AttendanceIQ_Mobile_Backup_${todayStr()}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast('💾 Database backup exported.');
}

function exportCSV() {
  let csv = 'Date,Day,Subject,Status\n';
  Object.entries(appData.attendance).forEach(([d, rec]) => {
    if (rec.holiday) csv += `${d},${getDayName(d)},HOLIDAY,holiday\n`;
    else (rec.classes || []).forEach(c => {
      csv += `${d},${getDayName(d)},${getSubjectById(c.subject).abbr},${c.status}\n`;
    });
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `Attendance_Ledger_${todayStr()}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('📊 CSV Spreadsheet report downloaded.');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      appData = { ...appData, ...data };
      saveData();
      applyTheme(appData.theme || 'dark');
      navigate('dashboard');
      showToast('📥 Backup successfully restored.');
    } catch (err) {
      showToast('⚠️ Invalid backup file format.');
    }
  };
  reader.readAsText(file);
}

function confirmReset() {
  document.getElementById('reset-modal')?.classList.remove('hidden');
}
function resetAllData() {
  localStorage.removeItem('attendanceiq_v2');
  location.reload();
}

// ============================================================
// BOOT EVENT
// ============================================================
window.addEventListener('DOMContentLoaded', init);
