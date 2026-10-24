// ══════════════════════════════════════════════════════════════════
// BMSCE LMS Auto-Solver - Client Logic
// Engineered & Architected by UM
// ══════════════════════════════════════════════════════════════════

console.log(
  "%c⚡ BMSCE LMS AUTO-SOLVER\n%cDon't vibe code. Hire me → https://github.com/utkarsh050505",
  "color: #06b6d4; font-size: 16px; font-weight: 800;",
  "color: #8b5cf6; font-size: 12px; font-weight: 600;"
);

const $ = (id) => document.getElementById(id);

// Elements
const solveForm = $("solveForm");
const inputCard = $("inputCard");
const dashboardCard = $("dashboardCard");
const emailInput = $("emailInput");
const passwordInput = $("passwordInput");
const togglePwdBtn = $("togglePwdBtn");
const startBtn = $("startBtn");
const formError = $("formError");
const heroCount = $("heroCount");

const solvedCount = $("solvedCount");
const totalCount = $("totalCount");
const progressPercent = $("progressPercent");
const progressBarFill = $("progressBarFill");
const gridCounter = $("gridCounter");
const acceptedBadge = $("acceptedBadge");
const sessionStatus = $("sessionStatus");

const problemsGrid = $("problemsGrid");
const terminalLogs = $("terminalLogs");
const clearLogsBtn = $("clearLogsBtn");
const actionBar = $("actionBar");
const resetBtn = $("resetBtn");
const congratsTitle = $("congratsTitle");
const congratsEmoji = $("congratsEmoji");

const START_LABEL = "🚀 Solve everything";
const RUN_KEY = "lms-solver-run"; // sessionStorage: lets a page refresh re-attach to the run

let catalog = [];
let runStarted = false;
let eventSource = null;

// Password visibility toggle
togglePwdBtn.addEventListener("click", () => {
  const isPwd = passwordInput.type === "password";
  passwordInput.type = isPwd ? "text" : "password";
  togglePwdBtn.textContent = isPwd ? "🙈" : "👁️";
  togglePwdBtn.setAttribute("aria-label", isPwd ? "Hide password" : "Show password");
});

// Clear logs button
clearLogsBtn.addEventListener("click", () => {
  terminalLogs.replaceChildren();
});

// Reset session button
resetBtn.addEventListener("click", () => {
  dashboardCard.classList.add("hidden");
  inputCard.classList.remove("hidden");
  actionBar.classList.add("hidden");
  terminalLogs.replaceChildren();
  runStarted = false;
  renderProblemGrid(catalog);
  updateProgress({ done: 0, accepted: 0, total: catalog.length, percent: 0 });
});

function setFormError(message) {
  formError.textContent = message;
  formError.classList.toggle("hidden", !message);
}

function setStatus(text, kind) {
  sessionStatus.className = `status-pill status-${kind}`;
  sessionStatus.textContent = text;
}

// Append styled terminal line
function appendLog(text, level = "info") {
  const line = document.createElement("div");
  line.className = `log-line ${level}`;
  const ts = document.createElement("span");
  ts.className = "log-ts";
  ts.textContent = `[${new Date().toLocaleTimeString()}]`;
  const msg = document.createElement("span");
  msg.className = "log-text";
  msg.textContent = text;
  line.append(ts, " ", msg);
  terminalLogs.appendChild(line);
  terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

// Populate Problem Cards in Grid
function renderProblemGrid(problems) {
  problemsGrid.replaceChildren(
    ...problems.map((prob, i) => {
      const card = document.createElement("div");
      card.className = "problem-card";
      card.id = `prob-card-${prob.index}`;

      const left = document.createElement("div");
      left.className = "prob-left";
      const idx = document.createElement("span");
      idx.className = "prob-idx";
      idx.textContent = `#${String(i + 1).padStart(2, "0")}`;
      const name = document.createElement("span");
      name.className = "prob-name";
      name.title = prob.name;
      name.textContent = prob.name;
      left.append(idx, name);

      const badge = document.createElement("span");
      badge.className = "prob-badge badge-pending";
      badge.id = `badge-${prob.index}`;
      badge.textContent = "Pending";

      card.append(left, badge);
      return card;
    })
  );
}

function updateProgress(progress) {
  solvedCount.textContent = progress.done;
  totalCount.textContent = progress.total;
  progressPercent.textContent = `${progress.percent}%`;
  progressBarFill.style.width = `${progress.percent}%`;
  gridCounter.textContent = `${progress.accepted} / ${progress.total} Accepted`;
  acceptedBadge.textContent = `${progress.accepted} accepted`;
}

function showDashboard() {
  inputCard.classList.add("hidden");
  dashboardCard.classList.remove("hidden");
  actionBar.classList.add("hidden");
  setStatus("STARTING", "queued");
}

// Initial fetch of problems list to pre-render grid
fetch("/api/problems")
  .then((r) => r.json())
  .then((data) => {
    catalog = data.problems || [];
    heroCount.textContent = catalog.length;
    if (!runStarted) {
      renderProblemGrid(catalog);
      updateProgress({ done: 0, accepted: 0, total: catalog.length, percent: 0 });
    }
  })
  .catch(() => {});

// ─── Handle Form Submission ─────────────────────────────────
solveForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setFormError("");

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    setFormError("Enter your LMS email and password.");
    return;
  }

  startBtn.disabled = true;
  startBtn.querySelector(".btn-text").textContent = "⏳ Starting...";

  try {
    const res = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Couldn't start the solver. Please try again.");
    }

    // Don't keep the password around in the page
    passwordInput.value = "";
    showDashboard();
    appendLog(`Run created for ${email}.`, "system");
    try {
      sessionStorage.setItem(RUN_KEY, data.jobId);
    } catch (err) {}
    connectEventStream(data.jobId);
  } catch (err) {
    setFormError(err.message === "Failed to fetch" ? "Network error. Check your connection and try again." : err.message);
  } finally {
    startBtn.disabled = false;
    startBtn.querySelector(".btn-text").textContent = START_LABEL;
  }
});

// ─── SSE Stream Handler ─────────────────────────────────────
function connectEventStream(jobId) {
  eventSource = new EventSource(`/api/stream/${encodeURIComponent(jobId)}`);

  eventSource.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      return;
    }
    handleServerEvent(data);
  };

  eventSource.onerror = () => {
    // EventSource reconnects by itself; CLOSED means the run is gone (expired or server restarted)
    if (eventSource && eventSource.readyState === EventSource.CLOSED) {
      if (!runStarted) appendLog("This run is no longer available.", "error");
      endRun("Run ended", "⚠️");
    }
  };
}

function endRun(title, emoji) {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  try {
    sessionStorage.removeItem(RUN_KEY);
  } catch (err) {}
  congratsTitle.textContent = title;
  congratsEmoji.textContent = emoji;
  actionBar.classList.remove("hidden");
}

function handleServerEvent(data) {
  switch (data.type) {
    case "queued":
      setStatus("QUEUED", "queued");
      appendLog(`Waiting in line — position ${data.position}. You can keep this tab open.`, "system");
      break;

    case "started":
      runStarted = true;
      setStatus("RUNNING", "running");
      renderProblemGrid(data.problems);
      updateProgress({ done: 0, accepted: 0, total: data.total, percent: 0 });
      appendLog("Your run has started.", "system");
      break;

    case "auth_start":
      appendLog("Signing in to BMSCE LMS...", "system");
      break;

    case "auth_success":
      appendLog("✅ Signed in.", "success");
      break;

    case "auth_error":
      setStatus("LOGIN FAILED", "failed");
      appendLog(`❌ Login failed: ${data.message}`, "error");
      endRun("Login failed — check your email and password.", "🔒");
      break;

    case "problem_start": {
      const card = $(`prob-card-${data.index}`);
      const badge = $(`badge-${data.index}`);
      if (card) {
        document.querySelectorAll(".problem-card.active").forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      if (badge) {
        badge.className = "prob-badge badge-submitting";
        badge.textContent = "Solving...";
      }
      appendLog(`[${data.current}/${data.total}] ${data.name}`, "info");
      break;
    }

    case "problem_result": {
      const card = $(`prob-card-${data.index}`);
      const badge = $(`badge-${data.index}`);
      const isAccepted = data.verdict === "Accepted";

      if (card) {
        card.classList.remove("active");
        if (isAccepted) card.classList.add("accepted");
      }
      if (badge) {
        badge.className = isAccepted ? "prob-badge badge-accepted" : "prob-badge badge-failed";
        badge.textContent = isAccepted ? "✓ Accepted" : data.verdict;
      }
      appendLog(`${isAccepted ? "✅" : "⚠️"} ${data.name}: ${data.verdict}`, isAccepted ? "success" : "error");
      if (data.progress) updateProgress(data.progress);
      break;
    }

    case "completed":
      setStatus("FINISHED", "completed");
      updateProgress(data);
      appendLog("🎉 Run complete.", "success");
      endRun(`${data.accepted} of ${data.total} problems accepted!`, "🏆");
      break;

    case "error":
      setStatus("STOPPED", "failed");
      appendLog(`❌ ${data.message}`, "error");
      endRun("The run stopped early.", "⚠️");
      break;
  }
}

// Re-attach to a run that is still going after a page refresh
try {
  const savedRun = sessionStorage.getItem(RUN_KEY);
  if (savedRun) {
    showDashboard();
    appendLog("Reconnecting to your run...", "system");
    connectEventStream(savedRun);
  }
} catch (err) {}
