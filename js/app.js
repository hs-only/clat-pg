// ==========================================================================
// CLAT PG 2027 – Complete CBT Mock Engine, Login Gate, Save/Resume & Reports
// ==========================================================================

const STORAGE_KEYS = {
  AUTH_CONFIG: "clatpg_auth_config_v1",
  AUTH_SESSION: "clatpg_auth_session_v1",
  CANDIDATE_NAME: "clatpg_candidate_name_v1",
  HISTORY: "clatpg_completed_history_v1",
  LEGACY_ACTIVE_SESSION: "clatpg_active_session_v1",
  SAVED_SESSIONS_MAP: "clatpg_saved_sessions_map_v2",
  CASE_CHECKLIST: "clatpg_case_checklist_v1",
  CUSTOM_TESTS: "clatpg_custom_tests_v1"
};

// Default Assigned Login Credentials (Can be changed here before hosting or in Settings tab)
const DEFAULT_AUTH = {
  username: "clatpg2027",
  password: "Nlu@2027",
  candidateName: "CLAT PG Aspirant"
};

// Official TCS iON 5 Question States
const Q_STATE = {
  NOT_VISITED: "NOT_VISITED",
  NOT_ANSWERED: "NOT_ANSWERED",
  ANSWERED: "ANSWERED",
  MARKED: "MARKED",
  ANSWERED_MARKED: "ANSWERED_MARKED"
};

const OPTION_LETTERS = ["A", "B", "C", "D"];

const App = {
  isAuthenticated: false,
  authConfig: { ...DEFAULT_AUTH },
  currentTab: "dashboard",
  categoryFilter: "ALL",
  candidateName: DEFAULT_AUTH.candidateName,
  completedHistory: [],
  savedSessionsMap: {}, // { [testId]: examSessionObj }
  revisedCases: {},
  pendingTestId: null,

  // Active CBT Exam State
  activeExam: null,
  timerInterval: null,
  currentSelectedOption: null,

  // Review Mode State
  currentReviewAttempt: null,
  reviewFilterStatus: "ALL",
  reviewFilterSubject: "ALL",

  init() {
    this.loadStoredData();
    this.checkAuthGate();
    this.updateCandidateUI();
    this.populateSettingsForm();
    this.renderDashboard();
    this.renderHistoryView();
    this.renderStudyPlanView();
  },

  loadStoredData() {
    try {
      // Load Auth Config
      const savedAuth = localStorage.getItem(STORAGE_KEYS.AUTH_CONFIG);
      if (savedAuth) {
        const parsedAuth = JSON.parse(savedAuth);
        if (parsedAuth && parsedAuth.username && parsedAuth.password) {
          this.authConfig = parsedAuth;
        }
      }

      // Load Candidate Name
      const savedName = localStorage.getItem(STORAGE_KEYS.CANDIDATE_NAME);
      if (savedName) {
        this.candidateName = savedName;
      } else if (this.authConfig.candidateName) {
        this.candidateName = this.authConfig.candidateName;
      }

      // Check existing login session
      const sessionAuth =
        localStorage.getItem(STORAGE_KEYS.AUTH_SESSION) ||
        sessionStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      if (sessionAuth === "AUTHENTICATED") {
        this.isAuthenticated = true;
      }

      // Load Completed History
      const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (savedHistory) this.completedHistory = JSON.parse(savedHistory) || [];

      // Load Per-Test Saved Sessions Map
      const savedMap = localStorage.getItem(STORAGE_KEYS.SAVED_SESSIONS_MAP);
      if (savedMap) {
        this.savedSessionsMap = JSON.parse(savedMap) || {};
      }

      // Migrate any legacy single active session automatically so user's previous test try is preserved!
      const legacyRaw = localStorage.getItem(STORAGE_KEYS.LEGACY_ACTIVE_SESSION);
      if (legacyRaw) {
        try {
          const legacySession = JSON.parse(legacyRaw);
          if (legacySession && legacySession.testId && !this.savedSessionsMap[legacySession.testId]) {
            this.savedSessionsMap[legacySession.testId] = legacySession;
            this.persistSavedSessionsMap();
          }
          localStorage.removeItem(STORAGE_KEYS.LEGACY_ACTIVE_SESSION);
        } catch (e) {
          // ignore
        }
      }

      // Load Landmark Case Checklist
      const savedChecklist = localStorage.getItem(STORAGE_KEYS.CASE_CHECKLIST);
      if (savedChecklist) this.revisedCases = JSON.parse(savedChecklist) || {};

      // Load Custom Tests
      const savedCustomTests = localStorage.getItem(STORAGE_KEYS.CUSTOM_TESTS);
      if (savedCustomTests) {
        const customArr = JSON.parse(savedCustomTests) || [];
        customArr.forEach(t => {
          if (window.registerClatTest) window.registerClatTest(t);
        });
      }
    } catch (err) {
      console.error("Error loading stored data:", err);
    }
  },

  // ========================================================================
  // LOGIN GATE & CREDENTIALS MANAGEMENT
  // ========================================================================

  checkAuthGate() {
    const loginScreen = document.getElementById("login-screen");
    if (!loginScreen) return;
    if (this.isAuthenticated) {
      loginScreen.classList.add("hidden");
    } else {
      loginScreen.classList.remove("hidden");
    }
  },

  handleLoginSubmit(event) {
    event.preventDefault();
    const userInp = (document.getElementById("login-username").value || "").trim();
    const passInp = document.getElementById("login-password").value || "";
    const remember = document.getElementById("login-remember").checked;
    const errBox = document.getElementById("login-error-box");

    const validUser =
      userInp.toLowerCase() === this.authConfig.username.toLowerCase() ||
      userInp.toLowerCase() === DEFAULT_AUTH.username.toLowerCase();
    const validPass =
      passInp === this.authConfig.password || passInp === DEFAULT_AUTH.password;

    if (validUser && validPass) {
      this.isAuthenticated = true;
      errBox.classList.add("hidden");
      if (remember) {
        localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, "AUTHENTICATED");
      } else {
        sessionStorage.setItem(STORAGE_KEYS.AUTH_SESSION, "AUTHENTICATED");
      }
      document.getElementById("login-password").value = "";
      this.checkAuthGate();
    } else {
      errBox.classList.remove("hidden");
    }
  },

  logout() {
    if (this.activeExam) {
      this.saveActiveSession();
    }
    this.isAuthenticated = false;
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    sessionStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    this.checkAuthGate();
  },

  populateSettingsForm() {
    const nameEl = document.getElementById("set-cand-name");
    const userEl = document.getElementById("set-username");
    const passEl = document.getElementById("set-password");
    if (nameEl) nameEl.value = this.candidateName;
    if (userEl) userEl.value = this.authConfig.username;
    if (passEl) passEl.value = this.authConfig.password;
  },

  saveCredentialsSettings(event) {
    event.preventDefault();
    const newName = (document.getElementById("set-cand-name").value || "").trim();
    const newUser = (document.getElementById("set-username").value || "").trim();
    const newPass = document.getElementById("set-password").value || "";

    if (!newName || !newUser || !newPass) {
      alert("Please fill in Candidate Name, Username, and Password.");
      return;
    }

    this.candidateName = newName;
    this.authConfig = {
      username: newUser,
      password: newPass,
      candidateName: newName
    };

    localStorage.setItem(STORAGE_KEYS.CANDIDATE_NAME, this.candidateName);
    localStorage.setItem(STORAGE_KEYS.AUTH_CONFIG, JSON.stringify(this.authConfig));
    this.updateCandidateUI();
    alert(`Updated credentials!\nUsername: ${newUser}\nCandidate Name: ${newName}`);
  },

  // ========================================================================
  // CANDIDATE PROFILE & STORAGE HELPERS
  // ========================================================================

  saveHistory() {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(this.completedHistory));
    this.updateQuickStats();
  },

  persistSavedSessionsMap() {
    localStorage.setItem(STORAGE_KEYS.SAVED_SESSIONS_MAP, JSON.stringify(this.savedSessionsMap));
  },

  getInitials(name) {
    const parts = (name || "CA").trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },

  updateCandidateUI() {
    const initials = this.getInitials(this.candidateName);
    const navName = document.getElementById("nav-candidate-name");
    if (navName) navName.textContent = this.candidateName;

    const loginCand = document.getElementById("login-display-cand-name");
    if (loginCand) loginCand.textContent = this.candidateName;

    const greeting = document.getElementById("hero-greeting");
    if (greeting) {
      greeting.textContent = `Welcome, ${this.candidateName}! Ready to ace CLAT PG?`;
    }

    const instName = document.getElementById("inst-candidate-name");
    const instAv = document.getElementById("inst-avatar-initials");
    if (instName) instName.textContent = this.candidateName;
    if (instAv) instAv.textContent = initials;

    const cbtName = document.getElementById("cbt-candidate-name");
    const cbtAv = document.getElementById("cbt-avatar-initials");
    if (cbtName) cbtName.textContent = this.candidateName;
    if (cbtAv) cbtAv.textContent = initials;
  },

  promptCandidateName() {
    const newName = prompt("Enter Candidate Name (for Exam Interface & Downloadable Score Reports):", this.candidateName);
    if (newName && newName.trim()) {
      this.candidateName = newName.trim();
      localStorage.setItem(STORAGE_KEYS.CANDIDATE_NAME, this.candidateName);
      this.updateCandidateUI();
      this.populateSettingsForm();
    }
  },

  // ========================================================================
  // NAVIGATION & DASHBOARD
  // ========================================================================

  switchTab(tabName) {
    this.currentTab = tabName;
    const views = ["dashboard", "history", "study-plan", "manage", "review"];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.toggle("hidden", v !== tabName);
    });

    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
    });

    if (tabName === "dashboard") this.renderDashboard();
    if (tabName === "history") this.renderHistoryView();
    if (tabName === "study-plan") this.renderStudyPlanView();
    if (tabName === "manage") this.populateSettingsForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  setCategoryFilter(cat) {
    this.categoryFilter = cat;
    document.querySelectorAll(".filter-pill").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-filter") === cat);
    });
    this.renderTestsGrid();
  },

  updateQuickStats() {
    const tests = window.CLAT_TESTS || [];
    const totalQuestions = tests.reduce((acc, t) => acc + t.totalQuestions, 0);
    const totalPassages = tests.reduce((acc, t) => acc + t.totalPassages, 0);

    document.getElementById("stat-total-tests").textContent = tests.length;
    const navTestsCount = document.getElementById("nav-tests-count");
    if (navTestsCount) navTestsCount.textContent = tests.length;

    document.getElementById("stat-total-questions-bank").textContent = `${totalQuestions} Qs across ${totalPassages} Passages`;
    document.getElementById("stat-completed-count").textContent = this.completedHistory.length;
    document.getElementById("nav-history-count").textContent = this.completedHistory.length;

    if (this.completedHistory.length > 0) {
      const avgAcc =
        this.completedHistory.reduce((acc, h) => acc + (h.accuracy || 0), 0) /
        this.completedHistory.length;
      document.getElementById("stat-avg-accuracy").textContent = `${avgAcc.toFixed(1)}%`;
    } else {
      document.getElementById("stat-avg-accuracy").textContent = "—";
    }

    const totalCases = (window.CLAT_STUDY_PLAN?.landmarkCaseChecklist || []).length;
    const revisedCount = Object.values(this.revisedCases).filter(Boolean).length;
    document.getElementById("stat-cases-revised").textContent = `${revisedCount} / ${totalCases}`;
  },

  renderDashboard() {
    this.updateQuickStats();
    this.renderSavedSessionsBanners();
    this.renderTestsGrid();
  },

  renderSavedSessionsBanners() {
    const container = document.getElementById("saved-sessions-container");
    if (!container) return;

    const savedIds = Object.keys(this.savedSessionsMap || {});
    if (savedIds.length === 0) {
      container.innerHTML = "";
      return;
    }

    const bannersHtml = savedIds
      .map(testId => {
        const saved = this.savedSessionsMap[testId];
        const test = (window.CLAT_TESTS || []).find(t => t.id === testId);
        if (!test || !saved) return "";

        const minsLeft = Math.floor((saved.remainingSeconds || 0) / 60);
        const secsLeft = (saved.remainingSeconds || 0) % 60;
        const timeStr = `${minsLeft}m ${secsLeft}s`;
        const answeredCount = Object.values(saved.responses || {}).filter(
          r => r.state === Q_STATE.ANSWERED || r.state === Q_STATE.ANSWERED_MARKED
        ).length;
        const currentQNo = (saved.currentQIndex || 0) + 1;

        return `
          <div class="resume-banner">
            <div>
              <div style="font-weight:800; color:#92400e; font-size:0.96rem;">
                ⏸ Saved In-Progress Test: ${this.escapeHtml(test.title)}
              </div>
              <div style="font-size:0.84rem; color:#78350f; margin-top:0.15rem;">
                Paused at <strong>Question ${currentQNo} of ${test.totalQuestions}</strong> • <strong>${answeredCount}</strong> Answered • <strong>${timeStr}</strong> remaining
              </div>
            </div>
            <div style="display:flex; gap:0.6rem;">
              <button class="btn btn-resume btn-sm" onclick="App.resumeSavedTestById('${test.id}')">
                ▶ Resume from Q.${currentQNo} (${minsLeft}m left)
              </button>
              <button class="btn btn-outline btn-sm" onclick="App.discardSavedTestById('${test.id}')">
                ✕ Discard
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    container.innerHTML = bannersHtml;
  },

  openOrResumeTest(testId) {
    if (this.savedSessionsMap[testId]) {
      this.resumeSavedTestById(testId);
    } else {
      this.startInstructions(testId);
    }
  },

  startFreshTestConfirm(testId) {
    const test = (window.CLAT_TESTS || []).find(t => t.id === testId);
    if (!test) return;
    if (this.savedSessionsMap[testId]) {
      const ok = confirm(
        `You have a saved in-progress session for "${test.title}".\n\nDo you want to discard that saved progress and start fresh from Question 1?`
      );
      if (!ok) return;
      delete this.savedSessionsMap[testId];
      this.persistSavedSessionsMap();
    }
    this.startInstructions(testId);
  },

  renderTestsGrid() {
    const grid = document.getElementById("tests-grid");
    if (!grid) return;

    const tests = (window.CLAT_TESTS || []).filter(t =>
      this.categoryFilter === "ALL" ? true : t.category === this.categoryFilter
    );

    grid.innerHTML = tests
      .map(test => {
        const attempts = this.completedHistory.filter(h => h.testId === test.id);
        const latestAttempt = attempts.length > 0 ? attempts[0] : null;
        const savedSession = this.savedSessionsMap[test.id] || null;

        let catClass = "cat-sec";
        if (test.category === "Full-Length Mock") catClass = "cat-full";
        else if (test.category === "PYQ Paper") catClass = "cat-pyq";

        let savedInfoHtml = "";
        let actionButtonsHtml = "";

        if (savedSession) {
          const minsLeft = Math.ceil((savedSession.remainingSeconds || 0) / 60);
          const answeredCount = Object.values(savedSession.responses || {}).filter(
            r => r.state === Q_STATE.ANSWERED || r.state === Q_STATE.ANSWERED_MARKED
          ).length;
          const curQ = (savedSession.currentQIndex || 0) + 1;

          savedInfoHtml = `<span class="in-progress-tag">⏸ Paused at Q.${curQ} (${answeredCount}/${test.totalQuestions} Ans • ${minsLeft}m left)</span>`;
          actionButtonsHtml = `
            <button class="btn btn-resume" style="flex:1;" onclick="App.resumeSavedTestById('${test.id}')">
              ▶ Resume Test (Q.${curQ} • ${minsLeft}m left)
            </button>
            <button class="btn btn-outline btn-sm" onclick="App.startFreshTestConfirm('${test.id}')" title="Discard saved progress and start from Question 1">
              ↻ Start Fresh
            </button>
            ${
              latestAttempt
                ? `<button class="btn btn-outline btn-sm" onclick="App.openReviewByAttemptId('${latestAttempt.attemptId}')">👁 Report</button>`
                : ""
            }
          `;
        } else {
          savedInfoHtml = latestAttempt
            ? `<span class="attempted-tag">✓ Last Score: ${latestAttempt.score.toFixed(2)} / ${test.maxMarks}</span>`
            : `<span style="font-size:0.75rem; color:#64748b; font-weight:600;">${this.escapeHtml(test.recommendedPhase || "")}</span>`;

          actionButtonsHtml = `
            <button class="btn btn-primary" style="flex:1;" onclick="App.startInstructions('${test.id}')">
              ${latestAttempt ? "↻ Retake in CBT Mode" : "▶ Start Test (CBT UI)"}
            </button>
            ${
              latestAttempt
                ? `<button class="btn btn-outline" onclick="App.openReviewByAttemptId('${latestAttempt.attemptId}')">
                     👁 View Solutions &amp; Report
                   </button>`
                : ""
            }
          `;
        }

        return `
          <div class="test-card" style="${savedSession ? "border: 2px solid #f59e0b;" : ""}">
            <div class="test-card-top">
              <div class="badge-row">
                <span class="cat-badge ${catClass}">${this.escapeHtml(test.badge || test.category)}</span>
                ${savedInfoHtml}
              </div>
              <h3>${this.escapeHtml(test.title)}</h3>
              <p>${this.escapeHtml(test.description)}</p>
              <div class="test-meta-list">
                <span>📝 <strong>${test.totalQuestions}</strong> Questions</span>
                <span>📚 <strong>${test.totalPassages}</strong> Passages</span>
                <span>⏱ <strong>${test.durationMinutes}</strong> Mins</span>
                <span>⚖ <strong>+1.00 / -0.25</strong></span>
              </div>
            </div>

            <div class="test-card-actions">
              ${actionButtonsHtml}
            </div>
          </div>
        `;
      })
      .join("");
  },

  // ========================================================================
  // PRE-TEST OFFICIAL INSTRUCTIONS SCREEN
  // ========================================================================

  startInstructions(testId) {
    const test = (window.CLAT_TESTS || []).find(t => t.id === testId);
    if (!test) return;

    this.pendingTestId = testId;
    document.getElementById("inst-test-title").textContent = test.title;
    document.getElementById("inst-duration").textContent = test.durationMinutes;
    document.getElementById("inst-q-count").textContent = test.totalQuestions;
    document.getElementById("inst-p-count").textContent = test.totalPassages;

    const chk = document.getElementById("inst-declaration-chk");
    chk.checked = false;
    this.toggleReadyBtn();

    document.getElementById("instructions-screen").classList.remove("hidden");
  },

  closeInstructions() {
    document.getElementById("instructions-screen").classList.add("hidden");
    this.pendingTestId = null;
  },

  toggleReadyBtn() {
    const chk = document.getElementById("inst-declaration-chk");
    const btn = document.getElementById("inst-start-btn");
    if (chk && chk.checked) {
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    } else {
      btn.disabled = true;
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";
    }
  },

  beginTestFromInstructions() {
    if (!this.pendingTestId) return;
    const testId = this.pendingTestId;
    this.closeInstructions();
    this.launchNewCBTExam(testId);
  },

  // ========================================================================
  // AUTHENTIC TCS iON CBT EXAM ENGINE (WITH PER-TEST SAVE & RESUME)
  // ========================================================================

  launchNewCBTExam(testId) {
    const test = (window.CLAT_TESTS || []).find(t => t.id === testId);
    if (!test) return;

    const responses = {};
    for (let i = 0; i < test.questions.length; i++) {
      responses[i] = {
        selectedOption: null,
        state: i === 0 ? Q_STATE.NOT_ANSWERED : Q_STATE.NOT_VISITED
      };
    }

    this.activeExam = {
      testId: test.id,
      startedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
      remainingSeconds: test.durationMinutes * 60,
      currentQIndex: 0,
      responses: responses,
      fontScale: 0
    };

    this.saveActiveSession();
    this.openCBTInterface();
  },

  resumeSavedTestById(testId) {
    const saved = this.savedSessionsMap[testId];
    if (!saved) return;
    this.activeExam = JSON.parse(JSON.stringify(saved));
    this.openCBTInterface();
  },

  discardSavedTestById(testId) {
    const test = (window.CLAT_TESTS || []).find(t => t.id === testId);
    const title = test ? test.title : testId;
    if (confirm(`Discard saved progress for "${title}"?`)) {
      delete this.savedSessionsMap[testId];
      this.persistSavedSessionsMap();
      this.renderDashboard();
    }
  },

  saveActiveSession() {
    if (this.activeExam && this.activeExam.testId) {
      this.activeExam.lastSavedAt = new Date().toISOString();
      this.savedSessionsMap[this.activeExam.testId] = this.activeExam;
      this.persistSavedSessionsMap();

      const pill = document.getElementById("cbt-autosave-indicator");
      if (pill) {
        pill.textContent = "✓ Progress Saved";
      }
    }
  },

  getActiveTestObj() {
    if (!this.activeExam) return null;
    return (window.CLAT_TESTS || []).find(t => t.id === this.activeExam.testId);
  },

  openCBTInterface() {
    const test = this.getActiveTestObj();
    if (!test) return;

    document.getElementById("cbt-header-title").textContent = test.title;

    // Populate Passage Jumper Select
    const select = document.getElementById("cbt-passage-select");
    select.innerHTML = test.passages
      .map(
        (p, idx) =>
          `<option value="${idx}">Passage ${p.passageNumber} (${this.escapeHtml(p.subject)}) — Q${p.questions[0].globalQNo}–Q${p.questions[p.questions.length - 1].globalQNo}</option>`
      )
      .join("");

    document.getElementById("cbt-screen").classList.remove("hidden");
    this.renderCurrentQuestion();
    this.startExamTimer();
  },

  startExamTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      if (!this.activeExam) {
        clearInterval(this.timerInterval);
        return;
      }
      this.activeExam.remainingSeconds--;
      if (this.activeExam.remainingSeconds % 3 === 0) {
        this.saveActiveSession();
      }
      this.updateTimerDisplay();

      if (this.activeExam.remainingSeconds <= 0) {
        clearInterval(this.timerInterval);
        alert("Time is up! Your examination will now be submitted automatically.");
        this.finalizeAndSubmitExam();
      }
    }, 1000);
  },

  updateTimerDisplay() {
    if (!this.activeExam) return;
    const secs = Math.max(0, this.activeExam.remainingSeconds);
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    const display = `${String(mins).padStart(2, "0")}:${String(remSecs).padStart(2, "0")}`;
    const el = document.getElementById("cbt-timer-display");
    if (el) {
      el.textContent = display;
      el.classList.toggle("timer-warning", secs <= 600);
    }
  },

  pauseAndExitToDashboard() {
    if (this.activeExam) {
      // If user clicked a radio option on the current question without clicking Save & Next yet, preserve it!
      const qIdx = this.activeExam.currentQIndex;
      const resp = this.activeExam.responses[qIdx];
      if (
        this.currentSelectedOption !== null &&
        this.currentSelectedOption !== undefined &&
        resp
      ) {
        resp.selectedOption = this.currentSelectedOption;
        if (resp.state === Q_STATE.NOT_ANSWERED || resp.state === Q_STATE.NOT_VISITED) {
          resp.state = Q_STATE.ANSWERED;
        }
      }
      this.saveActiveSession();
    }
    if (this.timerInterval) clearInterval(this.timerInterval);
    document.getElementById("cbt-screen").classList.add("hidden");
    this.activeExam = null;
    this.switchTab("dashboard");
  },

  changeFontSize(delta) {
    if (!this.activeExam) return;
    if (delta === 0) this.activeExam.fontScale = 0;
    else this.activeExam.fontScale = Math.max(-2, Math.min(3, (this.activeExam.fontScale || 0) + delta));

    const baseRem = 1 + this.activeExam.fontScale * 0.08;
    document.getElementById("cbt-passage-text").style.fontSize = `${baseRem}rem`;
    document.getElementById("cbt-q-stem").style.fontSize = `${baseRem}rem`;
  },

  renderCurrentQuestion() {
    const test = this.getActiveTestObj();
    if (!test || !this.activeExam) return;

    const qIdx = this.activeExam.currentQIndex;
    const qObj = test.questions[qIdx];
    const passage = test.passages[qObj.passageIndex];
    const resp = this.activeExam.responses[qIdx];

    if (resp.state === Q_STATE.NOT_VISITED) {
      resp.state = Q_STATE.NOT_ANSWERED;
    }

    this.currentSelectedOption = resp.selectedOption;

    const select = document.getElementById("cbt-passage-select");
    if (select) select.value = String(qObj.passageIndex);

    document.getElementById("cbt-passage-heading").textContent = `PASSAGE ${passage.passageNumber} OF ${test.totalPassages}`;
    document.getElementById("cbt-passage-subject").textContent = passage.subject;

    const paragraphs = passage.passageText
      .split(/\n\s*\n/)
      .map(para => `<p>${this.escapeHtml(para.trim())}</p>`)
      .join("");
    document.getElementById("cbt-passage-text").innerHTML = paragraphs;

    document.getElementById("cbt-q-number-label").textContent = `Question No. ${qObj.globalQNo}`;
    document.getElementById("cbt-q-passage-sublabel").textContent = `Passage ${passage.passageNumber} • Question ${qObj.localQNo} of ${passage.questions.length}`;
    document.getElementById("cbt-q-stem").textContent = qObj.question;

    this.renderOptionsList(qObj);
    this.renderPaletteAndCounts();
    this.saveActiveSession();
  },

  renderOptionsList(qObj) {
    const container = document.getElementById("cbt-options-container");
    container.innerHTML = qObj.options
      .map((optText, optIdx) => {
        const isSelected = this.currentSelectedOption === optIdx;
        return `
          <label class="option-row ${isSelected ? "selected" : ""}" onclick="App.selectOption(${optIdx})">
            <input type="radio" name="cbt-option" value="${optIdx}" ${isSelected ? "checked" : ""} />
            <div class="option-label-text">
              <strong>(${OPTION_LETTERS[optIdx]})</strong> ${this.escapeHtml(optText)}
            </div>
          </label>
        `;
      })
      .join("");
  },

  selectOption(optIdx) {
    this.currentSelectedOption = optIdx;
    const test = this.getActiveTestObj();
    if (!test || !this.activeExam) return;
    const qIdx = this.activeExam.currentQIndex;
    // Also immediately persist the selected option in activeExam so even an abrupt browser close saves it!
    this.activeExam.responses[qIdx].selectedOption = optIdx;
    if (
      this.activeExam.responses[qIdx].state === Q_STATE.NOT_ANSWERED ||
      this.activeExam.responses[qIdx].state === Q_STATE.NOT_VISITED
    ) {
      this.activeExam.responses[qIdx].state = Q_STATE.ANSWERED;
    }
    const qObj = test.questions[qIdx];
    this.renderOptionsList(qObj);
    this.renderPaletteAndCounts();
    this.saveActiveSession();
  },

  clearResponse() {
    if (!this.activeExam) return;
    const qIdx = this.activeExam.currentQIndex;
    this.currentSelectedOption = null;
    this.activeExam.responses[qIdx].selectedOption = null;
    this.activeExam.responses[qIdx].state = Q_STATE.NOT_ANSWERED;
    this.renderCurrentQuestion();
  },

  saveAndNext() {
    if (!this.activeExam) return;
    const test = this.getActiveTestObj();
    const qIdx = this.activeExam.currentQIndex;
    const resp = this.activeExam.responses[qIdx];

    if (this.currentSelectedOption !== null && this.currentSelectedOption !== undefined) {
      resp.selectedOption = this.currentSelectedOption;
      resp.state = Q_STATE.ANSWERED;
    } else {
      resp.selectedOption = null;
      resp.state = Q_STATE.NOT_ANSWERED;
    }

    if (qIdx < test.questions.length - 1) {
      this.activeExam.currentQIndex = qIdx + 1;
    }
    this.renderCurrentQuestion();
  },

  markForReviewAndNext() {
    if (!this.activeExam) return;
    const test = this.getActiveTestObj();
    const qIdx = this.activeExam.currentQIndex;
    const resp = this.activeExam.responses[qIdx];

    if (this.currentSelectedOption !== null && this.currentSelectedOption !== undefined) {
      resp.selectedOption = this.currentSelectedOption;
      resp.state = Q_STATE.ANSWERED_MARKED;
    } else {
      resp.selectedOption = null;
      resp.state = Q_STATE.MARKED;
    }

    if (qIdx < test.questions.length - 1) {
      this.activeExam.currentQIndex = qIdx + 1;
    }
    this.renderCurrentQuestion();
  },

  prevQuestion() {
    if (!this.activeExam) return;
    if (this.activeExam.currentQIndex > 0) {
      this.activeExam.currentQIndex--;
      this.renderCurrentQuestion();
    }
  },

  jumpToQuestion(qIdx) {
    if (!this.activeExam) return;
    const prevPassageIdx = this.getActiveTestObj().questions[this.activeExam.currentQIndex].passageIndex;
    this.activeExam.currentQIndex = qIdx;
    const newPassageIdx = this.getActiveTestObj().questions[qIdx].passageIndex;
    this.renderCurrentQuestion();
    if (prevPassageIdx !== newPassageIdx) {
      document.getElementById("cbt-passage-pane").scrollTop = 0;
    }
    document.getElementById("cbt-question-pane").scrollTop = 0;
  },

  jumpToPassage(passageIdxStr) {
    const pIdx = parseInt(passageIdxStr, 10);
    const test = this.getActiveTestObj();
    if (!test || !test.passages[pIdx]) return;
    const firstGlobalQ = test.passages[pIdx].questions[0].globalQNo;
    this.jumpToQuestion(firstGlobalQ - 1);
  },

  getBadgeClassForState(state) {
    switch (state) {
      case Q_STATE.ANSWERED:
        return "q-state-answered";
      case Q_STATE.NOT_ANSWERED:
        return "q-state-not-answered";
      case Q_STATE.MARKED:
        return "q-state-marked";
      case Q_STATE.ANSWERED_MARKED:
        return "q-state-ans-marked";
      default:
        return "q-state-not-visited";
    }
  },

  renderPaletteAndCounts() {
    const test = this.getActiveTestObj();
    if (!test || !this.activeExam) return;

    const counts = {
      [Q_STATE.ANSWERED]: 0,
      [Q_STATE.NOT_ANSWERED]: 0,
      [Q_STATE.NOT_VISITED]: 0,
      [Q_STATE.MARKED]: 0,
      [Q_STATE.ANSWERED_MARKED]: 0
    };

    const gridHtml = test.questions
      .map((q, idx) => {
        const resp = this.activeExam.responses[idx];
        counts[resp.state] = (counts[resp.state] || 0) + 1;
        const stateClass = this.getBadgeClassForState(resp.state);
        const currentClass = idx === this.activeExam.currentQIndex ? "current-q" : "";
        return `<button class="q-badge ${stateClass} ${currentClass}" onclick="App.jumpToQuestion(${idx})">${q.globalQNo}</button>`;
      })
      .join("");

    document.getElementById("cbt-palette-grid").innerHTML = gridHtml;
    document.getElementById("cnt-answered").textContent = counts[Q_STATE.ANSWERED];
    document.getElementById("cnt-not-answered").textContent = counts[Q_STATE.NOT_ANSWERED];
    document.getElementById("cnt-not-visited").textContent = counts[Q_STATE.NOT_VISITED];
    document.getElementById("cnt-marked").textContent = counts[Q_STATE.MARKED];
    document.getElementById("cnt-ans-marked").textContent = counts[Q_STATE.ANSWERED_MARKED];
  },

  // ========================================================================
  // CBT MODALS: QUESTION PAPER, INSTRUCTIONS & SUBMIT SUMMARY
  // ========================================================================

  openQuestionPaperModal() {
    const test = this.getActiveTestObj();
    if (!test) return;

    document.getElementById("cbt-modal-title").textContent = `Question Paper View — ${test.title}`;
    const bodyHtml = test.passages
      .map(
        p => `
        <div style="margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:2px solid #cbd5e1;">
          <div style="font-weight:800; color:#1e3a5f; margin-bottom:0.4rem;">PASSAGE ${p.passageNumber} (${this.escapeHtml(p.subject)})</div>
          <div style="font-family:Georgia,serif; font-size:0.9rem; background:#f8fafc; padding:0.75rem; border-radius:6px; margin-bottom:0.85rem;">
            ${this.escapeHtml(p.passageText)}
          </div>
          ${p.questions
            .map(
              q => `
              <div style="margin-bottom:0.75rem; padding-left:0.5rem;">
                <div style="font-weight:700; font-size:0.9rem;">Q.${q.globalQNo}: ${this.escapeHtml(q.question)}</div>
                <div style="font-size:0.84rem; color:#334155; margin-top:0.25rem; padding-left:0.85rem;">
                  ${q.options.map((o, i) => `<div>(${OPTION_LETTERS[i]}) ${this.escapeHtml(o)}</div>`).join("")}
                </div>
              </div>
            `
            )
            .join("")}
        </div>
      `
      )
      .join("");

    document.getElementById("cbt-modal-body").innerHTML = bodyHtml;
    document.getElementById("cbt-modal-footer").innerHTML = `
      <button class="tcs-btn tcs-btn-primary" onclick="App.closeModal()">Close Question Paper</button>
    `;
    document.getElementById("cbt-modal-overlay").classList.remove("hidden");
  },

  openInstructionsModal() {
    const test = this.getActiveTestObj();
    if (!test) return;

    document.getElementById("cbt-modal-title").textContent = "Examination Instructions";
    document.getElementById("cbt-modal-body").innerHTML = `
      <div style="font-size:0.92rem; line-height:1.6;">
        <p><strong>Exam:</strong> ${this.escapeHtml(test.title)}</p>
        <p><strong>Total Questions:</strong> ${test.totalQuestions} (${test.totalPassages} Passages)</p>
        <p><strong>Marking Scheme:</strong> +1.00 for every Correct Answer | -0.25 for every Wrong Answer | 0 for Unattempted.</p>
        <hr style="margin:0.85rem 0; border:none; border-top:1px solid #cbd5e1;" />
        <p><strong>Save &amp; Resume Later:</strong> You can click <strong>"💾 Save &amp; Resume Later"</strong> at any time to pause this test and resume later from the exact question and remaining timer.</p>
        <p style="margin-top:0.5rem;"><strong>Important Evaluation Note:</strong> Questions marked as <em>"Answered &amp; Marked for Review"</em> WILL be evaluated and scored upon submission, just like the real Consortium / TCS iON examination.</p>
      </div>
    `;
    document.getElementById("cbt-modal-footer").innerHTML = `
      <button class="tcs-btn tcs-btn-primary" onclick="App.closeModal()">Back to Test</button>
    `;
    document.getElementById("cbt-modal-overlay").classList.remove("hidden");
  },

  openSubmitModal() {
    const test = this.getActiveTestObj();
    if (!test || !this.activeExam) return;

    const counts = {
      [Q_STATE.ANSWERED]: 0,
      [Q_STATE.NOT_ANSWERED]: 0,
      [Q_STATE.NOT_VISITED]: 0,
      [Q_STATE.MARKED]: 0,
      [Q_STATE.ANSWERED_MARKED]: 0
    };

    Object.values(this.activeExam.responses).forEach(r => {
      counts[r.state] = (counts[r.state] || 0) + 1;
    });

    const totalEvaluated = counts[Q_STATE.ANSWERED] + counts[Q_STATE.ANSWERED_MARKED];

    document.getElementById("cbt-modal-title").textContent = "Exam Submission Summary";
    document.getElementById("cbt-modal-body").innerHTML = `
      <h3 style="margin-bottom:0.85rem; color:#0f172a;">Are you sure you want to submit the examination?</h3>
      <table class="subject-table" style="margin-bottom:1rem;">
        <thead>
          <tr>
            <th>Section</th>
            <th>No. of Questions</th>
            <th>Answered</th>
            <th>Not Answered</th>
            <th>Marked for Review</th>
            <th>Answered &amp; Marked for Review</th>
            <th>Not Visited</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Post Graduate (LLM)</strong></td>
            <td>${test.totalQuestions}</td>
            <td style="color:#15803d; font-weight:700;">${counts[Q_STATE.ANSWERED]}</td>
            <td style="color:#b91c1c; font-weight:700;">${counts[Q_STATE.NOT_ANSWERED]}</td>
            <td style="color:#6b3fa0; font-weight:700;">${counts[Q_STATE.MARKED]}</td>
            <td style="color:#6b3fa0; font-weight:700;">${counts[Q_STATE.ANSWERED_MARKED]}</td>
            <td>${counts[Q_STATE.NOT_VISITED]}</td>
          </tr>
        </tbody>
      </table>
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:0.75rem 1rem; border-radius:6px; font-size:0.88rem; color:#166534;">
        <strong>Total Questions to be Evaluated:</strong> ${totalEvaluated} out of ${test.totalQuestions} (includes Answered + Answered &amp; Marked for Review).
      </div>
    `;
    document.getElementById("cbt-modal-footer").innerHTML = `
      <button class="tcs-btn" onclick="App.closeModal()">No, Return to Exam</button>
      <button class="tcs-btn" style="background:#fffbeb; border-color:#f59e0b; color:#92400e;" onclick="App.closeModal(); App.pauseAndExitToDashboard();">💾 Save &amp; Resume Later Instead</button>
      <button class="tcs-btn tcs-btn-submit" style="width:auto; padding:0.55rem 1.5rem;" onclick="App.finalizeAndSubmitExam()">Yes, Submit Final Exam ✓</button>
    `;
    document.getElementById("cbt-modal-overlay").classList.remove("hidden");
  },

  closeModal() {
    document.getElementById("cbt-modal-overlay").classList.add("hidden");
  },

  // ========================================================================
  // EVALUATION, SCORING & POST-TEST REVIEW
  // ========================================================================

  finalizeAndSubmitExam() {
    this.closeModal();
    if (this.timerInterval) clearInterval(this.timerInterval);

    const test = this.getActiveTestObj();
    if (!test || !this.activeExam) return;

    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;
    const userAnswers = {};

    test.questions.forEach((q, idx) => {
      const resp = this.activeExam.responses[idx];
      const isEvaluated =
        (resp.state === Q_STATE.ANSWERED || resp.state === Q_STATE.ANSWERED_MARKED) &&
        resp.selectedOption !== null &&
        resp.selectedOption !== undefined;

      if (!isEvaluated) {
        unattemptedCount++;
        userAnswers[q.globalQNo] = null;
      } else {
        userAnswers[q.globalQNo] = resp.selectedOption;
        if (resp.selectedOption === q.correctOption) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    });

    const attemptedCount = correctCount + wrongCount;
    const positiveScore = correctCount * 1.0;
    const negativeDeduction = wrongCount * 0.25;
    const finalScore = positiveScore - negativeDeduction;
    const accuracy = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;
    const timeTakenSeconds = Math.max(
      1,
      test.durationMinutes * 60 - (this.activeExam.remainingSeconds || 0)
    );

    const attemptRecord = {
      attemptId: "att-" + Date.now(),
      testId: test.id,
      testTitle: test.title,
      candidateName: this.candidateName,
      completedAt: new Date().toISOString(),
      totalQuestions: test.totalQuestions,
      maxMarks: test.maxMarks,
      attemptedCount,
      correctCount,
      wrongCount,
      unattemptedCount,
      positiveScore,
      negativeDeduction,
      score: finalScore,
      accuracy,
      timeTakenSeconds,
      userAnswers
    };

    this.completedHistory.unshift(attemptRecord);
    this.saveHistory();

    // Remove finished test from in-progress saved sessions map
    delete this.savedSessionsMap[test.id];
    this.persistSavedSessionsMap();
    this.activeExam = null;

    document.getElementById("cbt-screen").classList.add("hidden");
    this.openReviewByAttemptId(attemptRecord.attemptId);
  },

  openReviewByAttemptId(attemptId) {
    const attempt = this.completedHistory.find(h => h.attemptId === attemptId);
    if (!attempt) return;

    this.currentReviewAttempt = attempt;
    this.reviewFilterStatus = "ALL";
    this.reviewFilterSubject = "ALL";
    this.switchTab("review");
    this.renderReviewScreen();
  },

  setReviewFilter(status, subject) {
    if (status !== null) this.reviewFilterStatus = status;
    if (subject !== null) this.reviewFilterSubject = subject;
    this.renderReviewQuestionsList();
  },

  computeSubjectBreakdown(test, attempt) {
    const map = {};
    test.questions.forEach(q => {
      if (!map[q.subject]) {
        map[q.subject] = {
          subject: q.subject,
          total: 0,
          attempted: 0,
          correct: 0,
          wrong: 0,
          unattempted: 0,
          score: 0
        };
      }
      const s = map[q.subject];
      s.total++;
      const ua = attempt.userAnswers[q.globalQNo];
      if (ua === null || ua === undefined) {
        s.unattempted++;
      } else {
        s.attempted++;
        if (ua === q.correctOption) {
          s.correct++;
          s.score += 1.0;
        } else {
          s.wrong++;
          s.score -= 0.25;
        }
      }
    });
    return Object.values(map);
  },

  formatDuration(secs) {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem}s`;
  },

  renderReviewScreen() {
    const attempt = this.currentReviewAttempt;
    if (!attempt) return;

    const test = (window.CLAT_TESTS || []).find(t => t.id === attempt.testId);
    const container = document.getElementById("review-content-container");
    if (!test || !container) return;

    const subjectStats = this.computeSubjectBreakdown(test, attempt);
    const subjects = ["ALL", ...subjectStats.map(s => s.subject)];
    const dateStr = new Date(attempt.completedAt).toLocaleString();

    container.innerHTML = `
      <div class="no-print" style="margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
        <button class="btn btn-outline btn-sm" onclick="App.switchTab('dashboard')">← Back to Tests Dashboard</button>
        <div style="display:flex; gap:0.6rem; flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="App.downloadStandaloneReportHTML('${attempt.attemptId}')">
            ⬇ Download Full Question &amp; Answer Report (.html)
          </button>
          <button class="btn btn-accent btn-sm" onclick="App.printReportPDF('${attempt.attemptId}')">
            🖨 Print / Save Report as PDF
          </button>
          <button class="btn btn-outline btn-sm" onclick="App.downloadReportCSV('${attempt.attemptId}')">
            📊 Download Excel/CSV Sheet
          </button>
        </div>
      </div>

      <div class="review-header-card">
        <div>
          <span style="background:rgba(255,255,255,0.18); padding:0.2rem 0.65rem; border-radius:4px; font-size:0.76rem; font-weight:700;">
            COMPLETED TEST REPORT &amp; CASE SOLUTIONS
          </span>
          <h1 style="font-size:1.4rem; margin-top:0.5rem;">${this.escapeHtml(test.title)}</h1>
          <div style="font-size:0.86rem; color:#cbd5e1; margin-top:0.3rem;">
            Candidate: <strong>${this.escapeHtml(attempt.candidateName || this.candidateName)}</strong> • Completed on: ${this.escapeHtml(dateStr)} • Time Taken: <strong>${this.formatDuration(attempt.timeTakenSeconds)}</strong>
          </div>
        </div>

        <div style="display:flex; gap:0.85rem; flex-wrap:wrap;">
          <div class="score-big-box">
            <div style="font-size:0.75rem; text-transform:uppercase; color:#e2e8f0;">Final Score</div>
            <div class="score-big-num">${attempt.score.toFixed(2)} <span style="font-size:1rem; color:#cbd5e1;">/ ${attempt.maxMarks}</span></div>
          </div>
          <div class="score-big-box">
            <div style="font-size:0.75rem; text-transform:uppercase; color:#e2e8f0;">Accuracy</div>
            <div class="score-big-num" style="color:#4ade80;">${attempt.accuracy.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Attempted</div>
          <div class="stat-value">${attempt.attemptedCount} / ${attempt.totalQuestions}</div>
          <div class="stat-sub">${attempt.unattemptedCount} Unattempted (0.00)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Correct Answers (+1.00)</div>
          <div class="stat-value" style="color:#15803d;">${attempt.correctCount}</div>
          <div class="stat-sub">+${attempt.positiveScore.toFixed(2)} positive marks</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Incorrect Answers (-0.25)</div>
          <div class="stat-value" style="color:#b91c1c;">${attempt.wrongCount}</div>
          <div class="stat-sub">-${attempt.negativeDeduction.toFixed(2)} negative marks</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Avg Time / Question</div>
          <div class="stat-value">${Math.round(attempt.timeTakenSeconds / attempt.totalQuestions)}s</div>
          <div class="stat-sub">Total: ${this.formatDuration(attempt.timeTakenSeconds)}</div>
        </div>
      </div>

      <h3 style="margin-bottom:0.65rem; color:#0f172a;">Subject-Wise Performance Breakdown</h3>
      <table class="subject-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Total Qs</th>
            <th>Attempted</th>
            <th>Correct (+1)</th>
            <th>Wrong (-0.25)</th>
            <th>Unattempted</th>
            <th>Accuracy</th>
            <th>Net Score</th>
          </tr>
        </thead>
        <tbody>
          ${subjectStats
            .map(s => {
              const acc = s.attempted > 0 ? ((s.correct / s.attempted) * 100).toFixed(1) + "%" : "—";
              return `
                <tr>
                  <td><strong>${this.escapeHtml(s.subject)}</strong></td>
                  <td>${s.total}</td>
                  <td>${s.attempted}</td>
                  <td style="color:#15803d; font-weight:700;">${s.correct}</td>
                  <td style="color:#b91c1c; font-weight:700;">${s.wrong}</td>
                  <td>${s.unattempted}</td>
                  <td>${acc}</td>
                  <td><strong>${s.score.toFixed(2)} / ${s.total}</strong></td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>

      <div class="section-header no-print" style="margin-top:1.75rem;">
        <h3 style="font-size:1.15rem; color:#0f172a;">Detailed Passage, Question, Answer &amp; Explanation Review</h3>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
          <button class="filter-pill active" id="rf-ALL" onclick="App.setReviewFilter('ALL', null)">All (${attempt.totalQuestions})</button>
          <button class="filter-pill" id="rf-CORRECT" onclick="App.setReviewFilter('CORRECT', null)">✓ Correct (${attempt.correctCount})</button>
          <button class="filter-pill" id="rf-WRONG" onclick="App.setReviewFilter('WRONG', null)">✕ Incorrect (${attempt.wrongCount})</button>
          <button class="filter-pill" id="rf-UNATTEMPTED" onclick="App.setReviewFilter('UNATTEMPTED', null)">○ Unattempted (${attempt.unattemptedCount})</button>
          <select class="cbt-passage-jumper" onchange="App.setReviewFilter(null, this.value)">
            ${subjects.map(sub => `<option value="${this.escapeHtml(sub)}">${sub === "ALL" ? "All Subjects" : this.escapeHtml(sub)}</option>`).join("")}
          </select>
        </div>
      </div>

      <div id="review-questions-list"></div>
    `;

    this.renderReviewQuestionsList();
  },

  renderReviewQuestionsList() {
    const attempt = this.currentReviewAttempt;
    if (!attempt) return;
    const test = (window.CLAT_TESTS || []).find(t => t.id === attempt.testId);
    if (!test) return;

    ["ALL", "CORRECT", "WRONG", "UNATTEMPTED"].forEach(st => {
      const btn = document.getElementById(`rf-${st}`);
      if (btn) btn.classList.toggle("active", this.reviewFilterStatus === st);
    });

    const listEl = document.getElementById("review-questions-list");
    if (!listEl) return;

    const blocksHtml = test.passages
      .map(p => {
        if (this.reviewFilterSubject !== "ALL" && p.subject !== this.reviewFilterSubject) {
          return "";
        }

        const filteredQs = p.questions.filter(q => {
          const ua = attempt.userAnswers[q.globalQNo];
          const isUnattempted = ua === null || ua === undefined;
          const isCorrect = !isUnattempted && ua === q.correctOption;
          const isWrong = !isUnattempted && ua !== q.correctOption;

          if (this.reviewFilterStatus === "CORRECT") return isCorrect;
          if (this.reviewFilterStatus === "WRONG") return isWrong;
          if (this.reviewFilterStatus === "UNATTEMPTED") return isUnattempted;
          return true;
        });

        if (filteredQs.length === 0) return "";

        return `
          <div class="review-passage-block">
            <div class="review-passage-head">
              <div class="review-case-badge">PASSAGE ${p.passageNumber} • ${this.escapeHtml(p.subject)} • ${this.escapeHtml(p.topic || "")}</div>
              <div style="font-weight:800; font-size:1.05rem; color:#0f172a;">
                Landmark Case / Source Unlocked: ${this.escapeHtml(p.caseTitle)}
              </div>
              <div style="font-size:0.82rem; color:#475569; margin-top:0.15rem;">
                Citation / Bench: <strong>${this.escapeHtml(p.citation)}</strong>
              </div>
            </div>

            <details style="border-bottom:1px solid #e2e8f0;">
              <summary style="padding:0.7rem 1.35rem; cursor:pointer; font-weight:700; font-size:0.86rem; color:#1e3a5f; background:#f8fafc;">
                📖 Click to Toggle Full Passage Text (Passage ${p.passageNumber})
              </summary>
              <div class="review-passage-body">
                ${p.passageText
                  .split(/\n\s*\n/)
                  .map(para => `<p style="margin-bottom:0.8rem;">${this.escapeHtml(para.trim())}</p>`)
                  .join("")}
              </div>
            </details>

            ${filteredQs
              .map(q => {
                const ua = attempt.userAnswers[q.globalQNo];
                const isUnattempted = ua === null || ua === undefined;
                const isCorrect = !isUnattempted && ua === q.correctOption;

                let statusBadge = `<span class="status-pill status-unattempted">Unattempted (0.00)</span>`;
                if (isCorrect) statusBadge = `<span class="status-pill status-correct">✓ Correct (+1.00)</span>`;
                else if (!isUnattempted) statusBadge = `<span class="status-pill status-wrong">✕ Incorrect (-0.25)</span>`;

                const userAnsLabel = isUnattempted ? "Not Attempted" : `Option (${OPTION_LETTERS[ua]})`;
                const correctAnsLabel = `Option (${OPTION_LETTERS[q.correctOption]})`;

                return `
                  <div class="review-q-item">
                    <div class="review-q-top">
                      <span style="font-weight:800; color:#0f172a; font-size:0.98rem;">Question ${q.globalQNo}</span>
                      <div style="display:flex; gap:0.65rem; align-items:center; flex-wrap:wrap;">
                        <span style="font-size:0.82rem; color:#334155;">Your Answer: <strong>${userAnsLabel}</strong></span>
                        <span style="font-size:0.82rem; color:#15803d;">Correct Answer: <strong>${correctAnsLabel}</strong></span>
                        ${statusBadge}
                      </div>
                    </div>

                    <div style="font-weight:600; font-size:0.96rem; color:#111827; margin-bottom:0.85rem;">
                      ${this.escapeHtml(q.question)}
                    </div>

                    <div>
                      ${q.options
                        .map((optText, idx) => {
                          const isThisCorrect = idx === q.correctOption;
                          const isThisUserWrong = !isUnattempted && idx === ua && !isThisCorrect;
                          let cls = "";
                          let tag = "";
                          if (isThisCorrect && idx === ua) {
                            cls = "opt-correct";
                            tag = `<span style="font-size:0.75rem; font-weight:800; color:#15803d;">✓ Your Answer &amp; Correct</span>`;
                          } else if (isThisCorrect) {
                            cls = "opt-correct";
                            tag = `<span style="font-size:0.75rem; font-weight:800; color:#15803d;">✓ Correct Answer</span>`;
                          } else if (isThisUserWrong) {
                            cls = "opt-user-wrong";
                            tag = `<span style="font-size:0.75rem; font-weight:800; color:#b91c1c;">✕ Your Answer</span>`;
                          }
                          return `
                            <div class="review-opt ${cls}">
                              <span><strong>(${OPTION_LETTERS[idx]})</strong> ${this.escapeHtml(optText)}</span>
                              ${tag}
                            </div>
                          `;
                        })
                        .join("")}
                    </div>

                    <div class="explanation-box">
                      <div style="font-weight:700; color:#0f766e; margin-bottom:0.25rem; font-size:0.82rem; text-transform:uppercase;">
                        ⚖ Legal Explanation &amp; Ratio Decidendi (${this.escapeHtml(p.caseTitle)})
                      </div>
                      <div>${this.escapeHtml(q.explanation)}</div>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        `;
      })
      .join("");

    listEl.innerHTML =
      blocksHtml ||
      `<div class="stat-card" style="text-align:center; padding:2rem;">No questions match the selected filter.</div>`;
  },

  // ========================================================================
  // DOWNLOADABLE REPORTS (STANDALONE HTML, PRINT-TO-PDF, EXCEL CSV)
  // ========================================================================

  generateFullReportHTMLString(attemptId, autoPrint) {
    const attempt = this.completedHistory.find(h => h.attemptId === attemptId);
    if (!attempt) return "";
    const test = (window.CLAT_TESTS || []).find(t => t.id === attempt.testId);
    if (!test) return "";

    const subjectStats = this.computeSubjectBreakdown(test, attempt);
    const dateStr = new Date(attempt.completedAt).toLocaleString();

    const passagesHtml = test.passages
      .map(
        p => `
        <div class="passage-box">
          <div class="p-head">
            <div><strong>PASSAGE ${p.passageNumber} — ${this.escapeHtml(p.subject)} (${this.escapeHtml(p.topic || "")})</strong></div>
            <div><strong>Case / Source:</strong> ${this.escapeHtml(p.caseTitle)} | <strong>Citation:</strong> ${this.escapeHtml(p.citation)}</div>
          </div>
          <div class="p-text">
            ${p.passageText
              .split(/\n\s*\n/)
              .map(para => `<p>${this.escapeHtml(para.trim())}</p>`)
              .join("")}
          </div>
          ${p.questions
            .map(q => {
              const ua = attempt.userAnswers[q.globalQNo];
              const isUnattempted = ua === null || ua === undefined;
              const isCorrect = !isUnattempted && ua === q.correctOption;
              const statusText = isUnattempted
                ? "UNATTEMPTED (0.00)"
                : isCorrect
                ? "CORRECT (+1.00)"
                : "INCORRECT (-0.25)";
              const statusColor = isUnattempted ? "#475569" : isCorrect ? "#15803d" : "#b91c1c";
              const userAnsStr = isUnattempted
                ? "Not Answered"
                : `(${OPTION_LETTERS[ua]}) ${this.escapeHtml(q.options[ua])}`;
              const correctAnsStr = `(${OPTION_LETTERS[q.correctOption]}) ${this.escapeHtml(q.options[q.correctOption])}`;

              return `
                <div class="q-box">
                  <div class="q-top">
                    <span><strong>Question ${q.globalQNo}</strong></span>
                    <span style="color:${statusColor}; font-weight:700;">${statusText}</span>
                  </div>
                  <div class="q-stem">${this.escapeHtml(q.question)}</div>
                  <div class="opts">
                    ${q.options
                      .map((opt, idx) => {
                        let style = "padding:6px 10px; border:1px solid #cbd5e1; border-radius:4px; margin-bottom:4px;";
                        let suffix = "";
                        if (idx === q.correctOption && idx === ua) {
                          style += "background:#dcfce7; border-color:#16a34a; font-weight:700;";
                          suffix = " ✓ [Your Answer & Correct Answer]";
                        } else if (idx === q.correctOption) {
                          style += "background:#dcfce7; border-color:#16a34a; font-weight:700;";
                          suffix = " ✓ [Correct Answer]";
                        } else if (!isUnattempted && idx === ua) {
                          style += "background:#fee2e2; border-color:#dc2626; font-weight:700;";
                          suffix = " ✕ [Your Answer]";
                        }
                        return `<div style="${style}">(${OPTION_LETTERS[idx]}) ${this.escapeHtml(opt)}${suffix}</div>`;
                      })
                      .join("")}
                  </div>
                  <div class="ans-summary">
                    <div><strong>Candidate's Answer:</strong> ${userAnsStr}</div>
                    <div><strong>Correct Answer:</strong> ${correctAnsStr}</div>
                  </div>
                  <div class="exp-box">
                    <strong>Explanation &amp; Case Ratio:</strong> ${this.escapeHtml(q.explanation)}
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      `
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CLAT PG Score & Question Report - ${this.escapeHtml(test.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif; color: #111827; max-width: 980px; margin: 0 auto; padding: 24px; line-height: 1.5; }
    .report-header { border-bottom: 3px solid #1e3a5f; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .score-banner { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
    .s-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; background: #f8fafc; }
    .s-val { font-size: 1.35rem; font-weight: 800; color: #1e3a5f; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 0.88rem; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; }
    .passage-box { border: 1px solid #94a3b8; border-radius: 8px; margin-bottom: 24px; overflow: hidden; }
    .p-head { background: #eff6ff; padding: 10px 14px; border-bottom: 1px solid #94a3b8; font-size: 0.9rem; }
    .p-text { padding: 12px 14px; background: #fafafa; border-bottom: 1px solid #cbd5e1; font-family: Georgia, serif; font-size: 0.92rem; text-align: justify; }
    .q-box { padding: 14px; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; }
    .q-top { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.9rem; }
    .q-stem { font-weight: 700; margin-bottom: 10px; font-size: 0.95rem; }
    .opts { font-size: 0.88rem; margin-bottom: 10px; }
    .ans-summary { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 10px; border-radius: 4px; font-size: 0.85rem; margin-bottom: 8px; }
    .exp-box { background: #f0fdf4; border-left: 4px solid #0f766e; padding: 8px 12px; font-size: 0.86rem; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px; text-align:right;">
    <button onclick="window.print()" style="padding:8px 16px; background:#1e3a5f; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:700;">🖨 Print / Save as PDF</button>
  </div>
  <div class="report-header">
    <div>
      <h1 style="margin:0 0 4px 0; font-size:1.35rem; color:#1e3a5f;">${this.escapeHtml(test.title)}</h1>
      <div style="font-size:0.88rem; color:#475569;">Candidate: <strong>${this.escapeHtml(attempt.candidateName || this.candidateName)}</strong> | Date: ${this.escapeHtml(dateStr)} | Duration Taken: ${this.formatDuration(attempt.timeTakenSeconds)}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:0.78rem; font-weight:700; color:#64748b;">CONSORTIUM PATTERN (+1 / -0.25)</div>
      <div style="font-size:1.5rem; font-weight:800; color:#15803d;">${attempt.score.toFixed(2)} / ${attempt.maxMarks}</div>
    </div>
  </div>

  <div class="score-banner">
    <div class="s-box"><div>Total Questions</div><div class="s-val">${attempt.totalQuestions}</div></div>
    <div class="s-box"><div>Attempted</div><div class="s-val">${attempt.attemptedCount}</div></div>
    <div class="s-box"><div>Correct (+1.00)</div><div class="s-val" style="color:#15803d;">${attempt.correctCount}</div></div>
    <div class="s-box"><div>Wrong (-0.25)</div><div class="s-val" style="color:#b91c1c;">${attempt.wrongCount}</div></div>
    <div class="s-box"><div>Accuracy</div><div class="s-val">${attempt.accuracy.toFixed(1)}%</div></div>
  </div>

  <h3>Subject-Wise Summary</h3>
  <table>
    <thead>
      <tr><th>Subject</th><th>Total</th><th>Attempted</th><th>Correct</th><th>Wrong</th><th>Unattempted</th><th>Net Score</th></tr>
    </thead>
    <tbody>
      ${subjectStats
        .map(
          s =>
            `<tr><td><strong>${this.escapeHtml(s.subject)}</strong></td><td>${s.total}</td><td>${s.attempted}</td><td>${s.correct}</td><td>${s.wrong}</td><td>${s.unattempted}</td><td><strong>${s.score.toFixed(2)}</strong></td></tr>`
        )
        .join("")}
    </tbody>
  </table>

  <h3>Complete Questions, Options, Candidate Responses, Correct Answers &amp; Explanations</h3>
  ${passagesHtml}
  ${autoPrint ? `<script>window.onload = function(){ window.print(); };</script>` : ""}
</body>
</html>`;
  },

  downloadStandaloneReportHTML(attemptId) {
    const htmlStr = this.generateFullReportHTMLString(attemptId, false);
    if (!htmlStr) return;
    const blob = new Blob([htmlStr], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CLAT-PG-Report-${attemptId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  printReportPDF(attemptId) {
    const htmlStr = this.generateFullReportHTMLString(attemptId, true);
    if (!htmlStr) return;
    const win = window.open("", "_blank");
    if (win) {
      win.document.open();
      win.document.write(htmlStr);
      win.document.close();
    } else {
      window.print();
    }
  },

  downloadReportCSV(attemptId) {
    const attempt = this.completedHistory.find(h => h.attemptId === attemptId);
    if (!attempt) return;
    const test = (window.CLAT_TESTS || []).find(t => t.id === attempt.testId);
    if (!test) return;

    const headers = [
      "Q.No",
      "Passage No",
      "Subject",
      "Landmark Case / Topic",
      "Citation",
      "Question",
      "Option (A)",
      "Option (B)",
      "Option (C)",
      "Option (D)",
      "Your Answer",
      "Correct Answer",
      "Status",
      "Marks Awarded",
      "Explanation"
    ];

    const rows = [headers];
    test.questions.forEach(q => {
      const ua = attempt.userAnswers[q.globalQNo];
      const isUnattempted = ua === null || ua === undefined;
      const isCorrect = !isUnattempted && ua === q.correctOption;
      const status = isUnattempted ? "UNATTEMPTED" : isCorrect ? "CORRECT" : "WRONG";
      const marks = isUnattempted ? "0.00" : isCorrect ? "+1.00" : "-0.25";
      const userAnsText = isUnattempted ? "Not Attempted" : `(${OPTION_LETTERS[ua]}) ${q.options[ua]}`;
      const correctAnsText = `(${OPTION_LETTERS[q.correctOption]}) ${q.options[q.correctOption]}`;

      rows.push([
        q.globalQNo,
        q.passageNumber,
        q.subject,
        q.caseTitle,
        q.citation,
        q.question,
        q.options[0],
        q.options[1],
        q.options[2],
        q.options[3],
        userAnsText,
        correctAnsText,
        status,
        marks,
        q.explanation
      ]);
    });

    const csvContent =
      "\uFEFF" +
      rows
        .map(row =>
          row
            .map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CLAT-PG-Sheet-${attemptId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // ========================================================================
  // COMPLETED TESTS HISTORY TAB
  // ========================================================================

  renderHistoryView() {
    const container = document.getElementById("history-list-container");
    if (!container) return;

    if (this.completedHistory.length === 0) {
      container.innerHTML = `
        <div class="stat-card" style="text-align:center; padding:3rem 1.5rem;">
          <h3 style="margin-bottom:0.5rem; color:#1e293b;">No Completed Tests Yet</h3>
          <p style="color:#64748b; margin-bottom:1.25rem;">
            Once you complete any Full-Length Mock, PYQ Paper, or Sectional Test, your full attempt history, answers, explanations, and downloadable reports will appear here permanently.
          </p>
          <button class="btn btn-primary" onclick="App.switchTab('dashboard')">Browse Mock Tests &amp; PYQs</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="subject-table">
        <thead>
          <tr>
            <th>Date &amp; Time</th>
            <th>Test Title</th>
            <th>Score</th>
            <th>Attempted</th>
            <th>Correct / Wrong</th>
            <th>Accuracy</th>
            <th>Time Taken</th>
            <th>Actions &amp; Report Downloads</th>
          </tr>
        </thead>
        <tbody>
          ${this.completedHistory
            .map(h => {
              const dt = new Date(h.completedAt).toLocaleString();
              return `
                <tr>
                  <td style="font-size:0.82rem; color:#475569;">${this.escapeHtml(dt)}</td>
                  <td><strong>${this.escapeHtml(h.testTitle)}</strong></td>
                  <td><strong style="color:#1e3a5f; font-size:0.98rem;">${h.score.toFixed(2)} / ${h.maxMarks}</strong></td>
                  <td>${h.attemptedCount} / ${h.totalQuestions}</td>
                  <td>
                    <span style="color:#15803d; font-weight:700;">+${h.correctCount}</span> /
                    <span style="color:#b91c1c; font-weight:700;">-${h.wrongCount}</span>
                  </td>
                  <td><strong>${h.accuracy.toFixed(1)}%</strong></td>
                  <td>${this.formatDuration(h.timeTakenSeconds)}</td>
                  <td>
                    <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                      <button class="btn btn-primary btn-sm" onclick="App.openReviewByAttemptId('${h.attemptId}')">
                        👁 View Answers &amp; Explanations
                      </button>
                      <button class="btn btn-accent btn-sm" onclick="App.printReportPDF('${h.attemptId}')" title="Print or Save as PDF">
                        🖨 PDF Report
                      </button>
                      <button class="btn btn-outline btn-sm" onclick="App.downloadStandaloneReportHTML('${h.attemptId}')" title="Download offline HTML report">
                        ⬇ HTML
                      </button>
                      <button class="btn btn-outline btn-sm" onclick="App.downloadReportCSV('${h.attemptId}')" title="Download Excel/CSV">
                        📊 CSV
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  },

  // ========================================================================
  // STUDY PLAN & HIGH-YIELD LANDMARK CASE TRACKER TAB
  // ========================================================================

  toggleCaseRevised(caseId) {
    this.revisedCases[caseId] = !this.revisedCases[caseId];
    localStorage.setItem(STORAGE_KEYS.CASE_CHECKLIST, JSON.stringify(this.revisedCases));
    this.updateQuickStats();
    this.renderStudyPlanView();
  },

  renderStudyPlanView() {
    const container = document.getElementById("study-plan-container");
    const plan = window.CLAT_STUDY_PLAN;
    if (!container || !plan) return;

    const totalCases = plan.landmarkCaseChecklist.length;
    const revisedCount = Object.values(this.revisedCases).filter(Boolean).length;

    container.innerHTML = `
      <div class="hero-banner" style="background:linear-gradient(120deg, #0f172a 0%, #1e3a5f 100%);">
        <div>
          <h1>CLAT PG Strategic Preparation Plan &amp; High-Yield Blueprint</h1>
          <p>
            Designed around actual Consortium of NLUs trends (2020–2025). Focus on identifying landmark ratios from redacted judicial excerpts, mastering 5/7/9-Judge Bench rulings, and controlling the -0.25 negative marking trap.
          </p>
        </div>
        <div class="score-big-box">
          <div style="font-size:0.75rem; text-transform:uppercase; color:#cbd5e1;">Target Safe Score</div>
          <div class="score-big-num">78+ / 120</div>
          <div style="font-size:0.75rem; color:#e2e8f0;">Top 3 NLUs &amp; PSU Cutoff</div>
        </div>
      </div>

      <h3 style="margin-bottom:0.75rem; color:#0f172a;">1. Official Subject Weightage &amp; High-Hit-Rate Topics</h3>
      <table class="subject-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Expected Questions</th>
            <th>Share</th>
            <th>Priority</th>
            <th>High-Yield Topics &amp; Landmark Doctrines to Revise</th>
          </tr>
        </thead>
        <tbody>
          ${plan.subjectWeightage
            .map(
              row => `
              <tr>
                <td><strong>${this.escapeHtml(row.subject)}</strong></td>
                <td style="white-space:nowrap; font-weight:600;">${this.escapeHtml(row.expectedQuestions)}</td>
                <td><strong>${this.escapeHtml(row.weightagePercent)}</strong></td>
                <td><span class="cat-badge ${row.priority === "CRITICAL" ? "cat-pyq" : "cat-full"}">${this.escapeHtml(row.priority)}</span></td>
                <td style="font-size:0.84rem; color:#334155;">${this.escapeHtml(row.keyTopics)}</td>
              </tr>
            `
            )
            .join("")}
        </tbody>
      </table>

      <h3 style="margin:1.75rem 0 0.85rem; color:#0f172a;">2. Four-Phase Structured Preparation Roadmap</h3>
      <div class="tests-grid" style="margin-bottom:2rem;">
        ${plan.fourPhaseRoadmap
          .map(
            p => `
            <div class="test-card">
              <div>
                <div class="badge-row">
                  <span class="cat-badge cat-sec">${this.escapeHtml(p.duration)}</span>
                </div>
                <h3>${this.escapeHtml(p.phase)}</h3>
                <p style="font-weight:600; color:#0f766e;">Goal: ${this.escapeHtml(p.goal)}</p>
                <ul style="padding-left:1.2rem; font-size:0.86rem; color:#334155;">
                  ${p.tasks.map(t => `<li style="margin-bottom:0.4rem;">${this.escapeHtml(t)}</li>`).join("")}
                </ul>
              </div>
            </div>
          `
          )
          .join("")}
      </div>

      <div class="section-header">
        <div>
          <h3 style="font-size:1.2rem; color:#0f172a;">3. Must-Read Landmark Judgments Revision Tracker (${revisedCount} / ${totalCases} Revised)</h3>
          <p style="font-size:0.86rem; color:#475569;">Check off each Constitution Bench &amp; Landmark Judgment once you have revised its ratio decidendi and dissenting opinions.</p>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:0.85rem;">
        ${plan.landmarkCaseChecklist
          .map(c => {
            const isChecked = !!this.revisedCases[c.id];
            return `
              <div class="stat-card" style="border-left: 4px solid ${isChecked ? "#16a34a" : "#1e3a5f"}; background:${isChecked ? "#f0fdf4" : "#ffffff"};">
                <label style="display:flex; align-items:flex-start; gap:0.85rem; cursor:pointer;">
                  <input type="checkbox" ${isChecked ? "checked" : ""} onchange="App.toggleCaseRevised('${c.id}')" style="margin-top:0.25rem; width:18px; height:18px; cursor:pointer;" />
                  <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                      <strong style="font-size:0.98rem; color:#0f172a; ${isChecked ? "text-decoration:line-through; opacity:0.85;" : ""}">${this.escapeHtml(c.title)}</strong>
                      <div>
                        <span class="cat-badge cat-full">${this.escapeHtml(c.subject)}</span>
                        <span style="font-size:0.78rem; color:#475569; font-weight:700; margin-left:0.4rem;">${this.escapeHtml(c.citation)}</span>
                      </div>
                    </div>
                    <div style="font-size:0.88rem; color:#334155; margin-top:0.35rem;">
                      <strong>Ratio &amp; Key Holding:</strong> ${this.escapeHtml(c.ratio)}
                    </div>
                  </div>
                </label>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  },

  // ========================================================================
  // BACKUP / RESTORE & CUSTOM TEST JSON LOADER
  // ========================================================================

  exportHistoryJSON() {
    const payload = {
      exportedAt: new Date().toISOString(),
      candidateName: this.candidateName,
      completedHistory: this.completedHistory,
      savedSessionsMap: this.savedSessionsMap,
      revisedCases: this.revisedCases
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CLAT-PG-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importHistoryJSON(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.candidateName) {
          this.candidateName = data.candidateName;
          localStorage.setItem(STORAGE_KEYS.CANDIDATE_NAME, this.candidateName);
        }
        if (Array.isArray(data.completedHistory)) {
          this.completedHistory = data.completedHistory;
          this.saveHistory();
        }
        if (data.savedSessionsMap && typeof data.savedSessionsMap === "object") {
          this.savedSessionsMap = data.savedSessionsMap;
          this.persistSavedSessionsMap();
        }
        if (data.revisedCases && typeof data.revisedCases === "object") {
          this.revisedCases = data.revisedCases;
          localStorage.setItem(STORAGE_KEYS.CASE_CHECKLIST, JSON.stringify(this.revisedCases));
        }
        this.updateCandidateUI();
        this.renderDashboard();
        this.renderHistoryView();
        alert(`Successfully restored ${this.completedHistory.length} completed test attempts and saved in-progress sessions!`);
      } catch (err) {
        alert("Invalid JSON backup file.");
      }
    };
    reader.readAsText(file);
  },

  clearAllHistory() {
    if (confirm("Are you sure you want to permanently clear all completed test attempts and paused sessions from this browser?")) {
      this.completedHistory = [];
      this.savedSessionsMap = {};
      this.saveHistory();
      this.persistSavedSessionsMap();
      this.renderHistoryView();
      this.renderDashboard();
    }
  },

  importCustomTestJSON(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const testConfig = JSON.parse(e.target.result);
        if (!testConfig.id || !testConfig.title || !Array.isArray(testConfig.passages)) {
          alert("Invalid test JSON format. Must include id, title, and passages array.");
          return;
        }
        window.registerClatTest(testConfig);

        const existingCustom = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_TESTS) || "[]");
        const idx = existingCustom.findIndex(t => t.id === testConfig.id);
        if (idx >= 0) existingCustom[idx] = testConfig;
        else existingCustom.push(testConfig);
        localStorage.setItem(STORAGE_KEYS.CUSTOM_TESTS, JSON.stringify(existingCustom));

        this.renderDashboard();
        this.switchTab("dashboard");
        alert(`Successfully imported test: "${testConfig.title}"!`);
      } catch (err) {
        alert("Could not parse test JSON file.");
      }
    };
    reader.readAsText(file);
  },

  downloadSampleTestTemplate() {
    const sample = {
      id: "custom-clat-mock-5",
      title: "Custom CLAT PG Sectional / Mock Test",
      category: "Sectional Test",
      badge: "Custom • 6 Qs",
      description: "Sample custom test template that can be imported directly.",
      durationMinutes: 10,
      recommendedPhase: "Custom Practice",
      passages: [
        {
          id: "sample-p1",
          subject: "Constitutional Law",
          topic: "Basic Structure Doctrine",
          caseTitle: "Kesavananda Bharati v. State of Kerala",
          citation: "(1973) 4 SCC 225 (13-Judge Bench)",
          passageText: "Paste the judicial excerpt or legal passage text here...",
          questions: [
            {
              qNo: 1,
              question: "What was the bench strength in Kesavananda Bharati v. State of Kerala (1973)?",
              options: ["9 Judges", "11 Judges", "13 Judges", "15 Judges"],
              correctOption: 2,
              explanation: "Kesavananda Bharati (1973) was decided by a 13-Judge Bench—the largest bench in Supreme Court history—by a 7:6 majority."
            }
          ]
        }
      ]
    };
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clat-pg-sample-test-template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
};

window.addEventListener("DOMContentLoaded", () => {
  App.init();
});
