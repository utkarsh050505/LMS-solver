// ══════════════════════════════════════════════════════════════════
// BMSCE LMS Auto-Solver - Client Logic
// Engineered & Architected by Utkarsh Mandal
// ══════════════════════════════════════════════════════════════════

console.log(
  "%c⚡ BMSCE LMS AUTO-SOLVER\n%cOriginal Architecture & Development by Utkarsh Mandal (BMSCE CSE)\nAll Intellectual Property & Engine Logic © 2026 Utkarsh Mandal. All rights reserved.",
  "color: #06b6d4; font-size: 16px; font-weight: 800;",
  "color: #8b5cf6; font-size: 12px; font-weight: 600;"
);

// Elements
const solveForm = document.getElementById("solveForm");
const inputCard = document.getElementById("inputCard");
const dashboardCard = document.getElementById("dashboardCard");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const togglePwdBtn = document.getElementById("togglePwdBtn");
const startBtn = document.getElementById("startBtn");

const solvedCount = document.getElementById("solvedCount");
const totalCount = document.getElementById("totalCount");
const progressPercent = document.getElementById("progressPercent");
const progressBarFill = document.getElementById("progressBarFill");
const gridCounter = document.getElementById("gridCounter");
const xpCounter = document.getElementById("xpCounter");
const sessionStatus = document.getElementById("sessionStatus");

const problemsGrid = document.getElementById("problemsGrid");
const terminalLogs = document.getElementById("terminalLogs");
const clearLogsBtn = document.getElementById("clearLogsBtn");
const actionBar = document.getElementById("actionBar");
const resetBtn = document.getElementById("resetBtn");
const congratsTitle = document.getElementById("congratsTitle");

// Mode selector styling
document.querySelectorAll(".mode-option input").forEach((radio) => {
  radio.addEventListener("change", (e) => {
    document.querySelectorAll(".mode-option").forEach((opt) => opt.classList.remove("active"));
    e.target.closest(".mode-option").classList.add("active");
  });
});

// Password visibility toggle
togglePwdBtn.addEventListener("click", () => {
  const isPwd = passwordInput.type === "password";
  passwordInput.type = isPwd ? "text" : "password";
  togglePwdBtn.textContent = isPwd ? "🙈" : "👁️";
});

// Clear logs button
clearLogsBtn.addEventListener("click", () => {
  terminalLogs.innerHTML = "";
});

// Reset session button
resetBtn.addEventListener("click", () => {
  dashboardCard.classList.add("hidden");
  inputCard.classList.remove("hidden");
  actionBar.classList.add("hidden");
  startBtn.disabled = false;
  startBtn.querySelector(".btn-text").textContent = "🚀 Launch Auto-Solver";
});

// Append styled terminal line
function appendLog(text, level = "info") {
  const ts = new Date().toLocaleTimeString();
  const line = document.createElement("div");
  line.className = `log-line ${level}`;
  line.innerHTML = `<span class="log-ts">[${ts}]</span> <span class="log-text">${escapeHtml(text)}</span>`;
  terminalLogs.appendChild(line);
  terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Populate Problem Cards in Grid
function renderProblemGrid(problems) {
  problemsGrid.innerHTML = "";
  problems.forEach((prob, i) => {
    const card = document.createElement("div");
    card.className = "problem-card";
    card.id = `prob-card-${prob.index !== undefined ? prob.index : i}`;
    card.innerHTML = `
      <div class="prob-left">
        <span class="prob-idx">#${String(i + 1).padStart(2, "0")}</span>
        <span class="prob-name" title="${escapeHtml(prob.name)}">${escapeHtml(prob.name)}</span>
      </div>
      <span class="prob-badge badge-pending" id="badge-${prob.index !== undefined ? prob.index : i}">Pending</span>
    `;
    problemsGrid.appendChild(card);
  });
}

// Initial fetch of problems list to pre-render grid
fetch("/api/problems")
  .then((r) => r.json())
  .then((data) => {
    if (data.problems) {
      renderProblemGrid(data.problems);
      totalCount.textContent = data.problems.length;
      gridCounter.textContent = `0 / ${data.problems.length} Solved`;
    }
  })
  .catch(() => {});

// ─── Handle Form Submission ─────────────────────────────────
solveForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const targetMode = document.querySelector('input[name="targetMode"]:checked').value;

  if (!email || !password) {
    alert("Please enter both BMSCE email and password!");
    return;
  }

  startBtn.disabled = true;
  startBtn.querySelector(".btn-text").textContent = "⏳ Initializing Engine...";

  try {
    const res = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, target: targetMode }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(`Error: ${data.error || "Failed to start solver"}`);
      startBtn.disabled = false;
      startBtn.querySelector(".btn-text").textContent = "🚀 Launch Auto-Solver";
      return;
    }

    // Transition to Dashboard
    inputCard.classList.add("hidden");
    dashboardCard.classList.remove("hidden");
    sessionStatus.className = "status-pill status-running";
    sessionStatus.textContent = "RUNNING";

    appendLog("Connected to Utkarsh Mandal Execution Daemon...", "system");
    appendLog(`Authenticated target: ${email}`, "system");

    // Connect SSE Stream
    connectEventStream(data.jobId);
  } catch (err) {
    alert(`Network Error: ${err.message}`);
    startBtn.disabled = false;
    startBtn.querySelector(".btn-text").textContent = "🚀 Launch Auto-Solver";
  }
});

// ─── SSE Stream Handler ─────────────────────────────────────
function connectEventStream(jobId) {
  const eventSource = new EventSource(`/api/stream/${jobId}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerEvent(data);
    } catch (e) {}
  };

  eventSource.onerror = () => {
    // Reconnect handled automatically by EventSource
  };
}

function handleServerEvent(data) {
  switch (data.type) {
    case "init":
      if (data.problems) {
        renderProblemGrid(data.problems);
        totalCount.textContent = data.total;
      }
      break;

    case "log":
      appendLog(data.message, data.message.includes("Error") ? "error" : "info");
      break;

    case "auth_start":
      appendLog("Navigating to BMSCE LMS Login portal...", "system");
      break;

    case "auth_success":
      appendLog("✅ Login successful! Session token active.", "success");
      break;

    case "auth_error":
      appendLog(`❌ Authentication failed: ${data.message}`, "error");
      sessionStatus.className = "status-pill";
      sessionStatus.style.background = "rgba(239, 68, 68, 0.2)";
      sessionStatus.style.color = "#ef4444";
      sessionStatus.textContent = "AUTH FAILED";
      break;

    case "problem_start": {
      const card = document.getElementById(`prob-card-${data.index}`);
      const badge = document.getElementById(`badge-${data.index}`);
      if (card) {
        document.querySelectorAll(".problem-card").forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      if (badge) {
        badge.className = "prob-badge badge-submitting";
        badge.textContent = "Solving...";
      }
      break;
    }

    case "problem_result": {
      const card = document.getElementById(`prob-card-${data.index}`);
      const badge = document.getElementById(`badge-${data.index}`);
      const isAccepted = data.verdict === "Accepted";

      if (card) {
        card.classList.remove("active");
        if (isAccepted) card.classList.add("accepted");
      }

      if (badge) {
        badge.className = isAccepted ? "prob-badge badge-accepted" : "prob-badge";
        if (!isAccepted) {
          badge.style.background = "rgba(239, 68, 68, 0.2)";
          badge.style.color = "#ef4444";
        }
        badge.textContent = isAccepted ? "✓ Accepted" : data.verdict;
      }

      // Update progress metrics
      if (data.progress) {
        solvedCount.textContent = data.progress.solved;
        progressPercent.textContent = `${data.progress.percent}%`;
        progressBarFill.style.width = `${data.progress.percent}%`;
        gridCounter.textContent = `${data.progress.solved} / ${data.progress.total} Solved`;
        xpCounter.textContent = `+${data.progress.xp} XP`;
      }
      break;
    }

    case "completed":
      sessionStatus.className = "status-pill status-completed";
      sessionStatus.textContent = "FINISHED";
      congratsTitle.textContent = `All ${data.total} Problems Solved (+${data.xp} XP)!`;
      actionBar.classList.remove("hidden");
      appendLog("🎉 Auto-solver run completed successfully!", "success");
      break;

    case "error":
      sessionStatus.className = "status-pill";
      sessionStatus.style.background = "rgba(239, 68, 68, 0.2)";
      sessionStatus.style.color = "#ef4444";
      sessionStatus.textContent = "ERROR";
      appendLog(`❌ Execution stopped: ${data.message}`, "error");
      break;
  }
}
