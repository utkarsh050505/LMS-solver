// ══════════════════════════════════════════════════════════════════════
// BMSCE LMS Auto-Solver - Web Application Server
// Original Architecture & Engineering by UM
// ══════════════════════════════════════════════════════════════════════

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── Constants & Paths ──────────────────────────────────────
const LMS_BASE = "https://lms.bmsce.in";
const LOGIN_URL = `${LMS_BASE}/login`;
const SOLUTIONS_JSON = path.join(__dirname, "solutions.json");
const PROBLEMS_JSON = path.join(__dirname, "problems.json");

// In-memory jobs tracking
const activeJobs = new Map();

// Load verified solutions
function getSolutionsDatabase() {
  if (fs.existsSync(SOLUTIONS_JSON)) {
    return JSON.parse(fs.readFileSync(SOLUTIONS_JSON, "utf-8"));
  }
  return { solutions: [] };
}

// ─── API: Get Problem Catalog ──────────────────────────────
app.get("/api/problems", (req, res) => {
  const db = getSolutionsDatabase();
  res.json({
    author: "UM",
    totalProblems: db.solutions.length,
    problems: db.solutions.map((s) => ({
      index: s.index,
      id: s.id,
      name: s.name,
      href: s.href,
      verdict: s.verdict,
    })),
  });
});

// ─── API: Start Auto-Solve Job ──────────────────────────────
app.post("/api/solve", async (req, res) => {
  const { email, password, target = "all" } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required!" });
  }

  const jobId = "job_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);

  const job = {
    id: jobId,
    author: "UM",
    email,
    target,
    status: "initializing",
    progress: { solved: 0, total: 0, percent: 0, xp: 0 },
    logs: [],
    results: [],
    listeners: new Set(),
    startedAt: new Date().toISOString(),
  };

  activeJobs.set(jobId, job);

  // Start automation process in background
  runSolveJob(job, password).catch((err) => {
    emitJobEvent(job, "error", { message: err.message });
    job.status = "failed";
  });

  res.json({
    success: true,
    jobId,
    message: "Auto-solver job initiated! Connect to SSE stream to monitor.",
    trademark: "Engineered by UM",
  });
});

// ─── API: SSE Stream for Live Execution Progress ───────────
app.get("/api/stream/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).send("Job not found");
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.write(`data: ${JSON.stringify({ type: "connected", jobId, status: job.status })}\n\n`);

  // Send historical logs so user doesn't miss early messages
  job.logs.forEach((logItem) => {
    res.write(`data: ${JSON.stringify(logItem)}\n\n`);
  });

  const listener = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  job.listeners.add(listener);

  req.on("close", () => {
    job.listeners.delete(listener);
  });
});

// ─── API: Job Status ────────────────────────────────────────
app.get("/api/status/:jobId", (req, res) => {
  const job = activeJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  res.json({
    jobId: job.id,
    author: "UM",
    status: job.status,
    progress: job.progress,
    resultsCount: job.results.length,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  });
});

// ─── Emit Helper ────────────────────────────────────────────
function emitJobEvent(job, type, payload = {}) {
  const eventData = {
    type,
    timestamp: new Date().toLocaleTimeString(),
    ...payload,
  };
  job.logs.push(eventData);
  for (const listener of job.listeners) {
    try {
      listener(eventData);
    } catch (e) {}
  }
}

// ─── Core Automation Engine (Playwright) ───────────────────
async function runSolveJob(job, password) {
  emitJobEvent(job, "log", { message: "🚀 Initializing Project UM Automation Core..." });

  const db = getSolutionsDatabase();
  const allProblems = db.solutions || [];

  let targetProblems = [];
  if (job.target === "all") {
    targetProblems = allProblems;
  } else if (!isNaN(parseInt(job.target))) {
    const idx = parseInt(job.target);
    targetProblems = allProblems.filter((p) => p.index === idx || p.id === idx);
  } else {
    targetProblems = allProblems;
  }

  job.progress.total = targetProblems.length;
  job.status = "running";

  emitJobEvent(job, "init", {
    total: targetProblems.length,
    problems: targetProblems.map((p) => ({ index: p.index, name: p.name })),
  });

  emitJobEvent(job, "log", { message: "🌐 Launching headless browser instance..." });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  try {
    // ── Step 1: Login ────────────────────────────────────────
    emitJobEvent(job, "log", { message: `🔐 Logging in as ${job.email}...` });
    emitJobEvent(job, "auth_start", {});

    await page.goto(LOGIN_URL, { waitUntil: "networkidle", timeout: 45000 });

    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', job.email);
    await page.fill('input[type="password"], input[name="password"]', password);

    const submitBtn = await page.$(
      'button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")'
    );
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.keyboard.press("Enter");
    }

    await page.waitForNavigation({ waitUntil: "networkidle", timeout: 35000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const postLoginUrl = page.url();
    if (postLoginUrl.includes("/login")) {
      const errorMsg = await page.evaluate(() => {
        const err = document.querySelector('[role="alert"], .error, [data-sonner-toast]');
        return err ? err.innerText : "Invalid email or password.";
      });
      emitJobEvent(job, "auth_error", { message: errorMsg });
      throw new Error(`Login failed: ${errorMsg}`);
    }

    emitJobEvent(job, "auth_success", { message: "Authentication successful! Session active." });
    emitJobEvent(job, "log", { message: "✅ Successfully logged into BMSCE LMS dashboard!" });

    // ── Step 2: Solve and Submit Each Problem ────────────────
    let xpAccumulated = 0;

    for (let i = 0; i < targetProblems.length; i++) {
      const prob = targetProblems[i];
      const probIndex = prob.index !== undefined ? prob.index : i;
      const progressPercent = Math.round(((i) / targetProblems.length) * 100);

      emitJobEvent(job, "problem_start", {
        index: probIndex,
        id: prob.id,
        name: prob.name,
        current: i + 1,
        total: targetProblems.length,
        progressPercent,
      });

      emitJobEvent(job, "log", {
        message: `[${i + 1}/${targetProblems.length}] Solving: "${prob.name}"...`,
      });

      const solveUrl = prob.href.replace(/\/problems\/([^?]+)/, "/problems/$1/solve");

      await page.goto(`${LMS_BASE}${solveUrl}`, {
        waitUntil: "networkidle",
        timeout: 45000,
      });

      await page.waitForSelector(".monaco-editor", { timeout: 25000 });
      await page.waitForTimeout(1500);

      // Language Switch Safeguard
      try {
        const langBtn = await page.$(
          'button:has-text("Python"), button:has-text("C++"), button:has-text("Java")'
        );
        if (langBtn) {
          const currentLang = (await langBtn.textContent()).trim();
          if (!currentLang.toLowerCase().includes("python")) {
            await langBtn.click();
            await page.waitForTimeout(500);
            const pyOption = await page.$(
              '[role="option"]:has-text("Python"), [role="menuitem"]:has-text("Python")'
            );
            if (pyOption) {
              await pyOption.click();
              await page.waitForTimeout(800);
            }
          }
        }
      } catch (e) {}

      // Code Injection via React Fiber
      emitJobEvent(job, "code_inject", { index: probIndex });
      const injectionSuccess = await page.evaluate((codeToInject) => {
        function getReactFiber(dom) {
          const key = Object.keys(dom).find(
            (k) => k.startsWith("__reactFiber") || k.startsWith("__reactInternalInstance")
          );
          return key ? dom[key] : null;
        }

        const allEls = Array.from(document.querySelectorAll("*"));
        for (const el of allEls) {
          const fiber = getReactFiber(el);
          if (!fiber) continue;

          let curr = fiber;
          while (curr) {
            let s = curr.memoizedState;
            while (s) {
              if (
                s.memoizedState &&
                s.memoizedState.current &&
                typeof s.memoizedState.current.setValue === "function"
              ) {
                s.memoizedState.current.setValue(codeToInject);
                return true;
              }
              s = s.next;
            }
            if (curr.memoizedProps) {
              for (const k in curr.memoizedProps) {
                const p = curr.memoizedProps[k];
                if (p && typeof p.setValue === "function") {
                  p.setValue(codeToInject);
                  return true;
                }
                if (p && p.current && typeof p.current.setValue === "function") {
                  p.current.setValue(codeToInject);
                  return true;
                }
              }
            }
            curr = curr.return;
          }
        }
        return false;
      }, prob.code);

      if (!injectionSuccess) {
        throw new Error(`Failed to inject solution for ${prob.name}`);
      }

      await page.waitForTimeout(800);
      await page.click(".monaco-editor");
      await page.waitForTimeout(400);

      // Submit
      emitJobEvent(job, "submit", { index: probIndex });
      const submitBtn = await page.$('button:has-text("Submit")');
      if (!submitBtn) {
        throw new Error("Submit button not found");
      }
      await submitBtn.click();

      // Poll for Verdict
      let verdict = "Submitted (Pending)";
      const startTime = Date.now();

      while (Date.now() - startTime < 30000) {
        await page.waitForTimeout(1500);
        const check = await page.evaluate(() => {
          const text = document.body.innerText;
          if (/all\s*\d+\s*test cases passed/i.test(text) || /accepted/i.test(text)) return "Accepted";
          if (/wrong answer/i.test(text)) return "Wrong Answer";
          if (/time limit exceeded/i.test(text)) return "Time Limit Exceeded";
          if (/runtime error/i.test(text)) return "Runtime Error";
          if (/compilation error/i.test(text)) return "Compilation Error";
          return null;
        });

        if (check) {
          verdict = check;
          break;
        }
      }

      const isAccepted = verdict === "Accepted";
      if (isAccepted) xpAccumulated += 25;

      job.progress.solved = i + 1;
      job.progress.xp = xpAccumulated;
      job.progress.percent = Math.round(((i + 1) / targetProblems.length) * 100);

      const resultItem = {
        index: probIndex,
        id: prob.id,
        name: prob.name,
        verdict,
        xp: isAccepted ? 25 : 0,
      };

      job.results.push(resultItem);

      emitJobEvent(job, "problem_result", {
        ...resultItem,
        progress: job.progress,
      });

      emitJobEvent(job, "log", {
        message: `🎯 [${i + 1}/${targetProblems.length}] "${prob.name}" -> ${verdict} (+${isAccepted ? 25 : 0} XP)`,
      });

      // Polite pause
      if (i < targetProblems.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // ── Finish ──────────────────────────────────────────────
    job.status = "completed";
    job.finishedAt = new Date().toISOString();

    emitJobEvent(job, "completed", {
      total: targetProblems.length,
      solved: job.progress.solved,
      xp: xpAccumulated,
      results: job.results,
      message: "🎉 All problems successfully solved and submitted to LMS!",
    });

    emitJobEvent(job, "log", {
      message: `🏆 All ${targetProblems.length} problems processed! Total XP earned: ~${xpAccumulated} XP.`,
    });
  } catch (err) {
    job.status = "failed";
    emitJobEvent(job, "error", { message: err.message });
    emitJobEvent(job, "log", { message: `❌ Job Error: ${err.message}` });
  } finally {
    await browser.close().catch(() => {});
  }
}

// ─── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  🚀 BMSCE LMS Auto-Solver Web Application Running`);
  console.log(`  ⚡ Trademark & Engineered by UM`);
  console.log(`  🌐 Local URL: http://localhost:${PORT}`);
  console.log(`════════════════════════════════════════════════════════════\n`);
});
