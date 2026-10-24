// ══════════════════════════════════════════════════════════════════════
// BMSCE LMS Auto-Solver - Web Application Server
// Original Architecture & Engineering by UM
// ══════════════════════════════════════════════════════════════════════
//
// Security model
//  • A student's LMS email/password are used once, to sign in from a fresh,
//    isolated browser context. They are never stored, logged or written to
//    disk, and are dropped from memory as soon as the login attempt finishes.
//  • Each run is addressed by an unguessable random token. Nothing lists runs,
//    run events never contain the email, and a run is forgotten 15 minutes
//    after it finishes.
//  • Same-origin only (no CORS), strict security headers, tiny JSON bodies.
//  • One active run per account, failed-login limits per account and per IP
//    (so the site can't be used to guess passwords), an hourly run limit per
//    IP, a global concurrency cap with a bounded queue, and a per-run timeout.

const express = require("express");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const { submitSolution } = require("./solve");

// ─── Config (all optional env vars) ─────────────────────────
function envInt(name, fallback) {
  const n = parseInt(process.env[name], 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === "production";
const MAX_CONCURRENT_JOBS = Math.max(1, envInt("MAX_CONCURRENT_JOBS", 2)); // each run is one Chromium (~300 MB)
const MAX_QUEUE = envInt("MAX_QUEUE", 20);
const RUNS_PER_IP_PER_HOUR = envInt("RUNS_PER_IP_PER_HOUR", 20); // a whole class can share one college IP
const FAILED_LOGINS_PER_IP_PER_HOUR = envInt("FAILED_LOGINS_PER_IP_PER_HOUR", 10);
const FAILED_LOGINS_PER_ACCOUNT_PER_HOUR = 3;
const JOB_TIMEOUT_MS = Math.max(1, envInt("JOB_TIMEOUT_MINUTES", 60)) * 60 * 1000;
const JOB_RETENTION_MS = 15 * 60 * 1000;
const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN ?? "bmsce.ac.in").trim().toLowerCase();
// Reverse proxies in front of the app (Render/Railway/Fly/Koyeb = 1). Needed for real client IPs.
const TRUST_PROXY = envInt("TRUST_PROXY", IS_PROD ? 1 : 0);

const HOUR = 60 * 60 * 1000;
const LMS_BASE = "https://lms.bmsce.in";
const LOGIN_URL = `${LMS_BASE}/login`;
const SOLUTIONS_JSON = path.join(__dirname, "solutions.json");
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Only solutions verified as Accepted are ever submitted for students
function loadVerifiedSolutions() {
  if (!fs.existsSync(SOLUTIONS_JSON)) return [];
  const db = JSON.parse(fs.readFileSync(SOLUTIONS_JSON, "utf-8"));
  return (db.solutions || []).filter((s) => s.code && s.href && s.verdict === "Accepted");
}
const SOLUTIONS = loadVerifiedSolutions();

// ─── App & Security Headers ─────────────────────────────────
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", TRUST_PROXY);

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "object-src 'none'",
].join("; ");

app.use((req, res, next) => {
  res.set({
    "Content-Security-Policy": CSP,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
  if (req.secure) res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // Behind a TLS-terminating proxy, never let a password travel over plain HTTP
  // (only when the proxy says so: a direct local run has no X-Forwarded-Proto)
  if (TRUST_PROXY && req.get("x-forwarded-proto") && req.protocol === "http" && req.path !== "/healthz") {
    return res.redirect(301, `https://${req.get("host")}${req.originalUrl}`);
  }
  next();
});

app.use(express.static(path.join(__dirname, "public"), { maxAge: IS_PROD ? "1h" : 0 }));

// ─── Rate Limiting (sliding one-hour windows) ───────────────
const hits = new Map(); // key -> [timestamps]

function countRecent(key) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < HOUR);
  if (recent.length) hits.set(key, recent);
  else hits.delete(key);
  return recent.length;
}

function record(key) {
  hits.set(key, [...(hits.get(key) || []), Date.now()]);
}

// ─── Jobs, Queue & Events ───────────────────────────────────
const jobs = new Map(); // token -> job
const queue = []; // { job, credentials, position }
let running = 0;

function hashAccount(email) {
  return crypto.createHash("sha256").update(email).digest("hex");
}

function isActive(job) {
  return job.status === "queued" || job.status === "running";
}

function createJob(ip, accountKey) {
  const job = {
    id: crypto.randomBytes(24).toString("base64url"),
    ip,
    accountKey,
    status: "queued",
    events: [],
    listeners: new Set(), // open SSE responses
    progress: { done: 0, accepted: 0, total: SOLUTIONS.length, percent: 0 },
  };
  jobs.set(job.id, job);
  return job;
}

function writeEvent(res, event) {
  res.write(`id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`);
}

function emit(job, type, payload = {}) {
  const event = { seq: job.events.length + 1, type, ...payload };
  job.events.push(event);
  for (const res of job.listeners) writeEvent(res, event);
}

function finish(job, status) {
  job.status = status;
  setTimeout(() => {
    for (const res of job.listeners) res.end();
    jobs.delete(job.id);
  }, JOB_RETENTION_MS).unref();
}

function pump() {
  while (running < MAX_CONCURRENT_JOBS && queue.length) {
    const entry = queue.shift();
    running++;
    runJob(entry).finally(() => {
      running--;
      pump();
    });
  }
  queue.forEach((entry, i) => {
    if (entry.position !== i + 1) {
      entry.position = i + 1;
      emit(entry.job, "queued", { position: i + 1 });
    }
  });
}

// Error whose message is safe to show to the student
function userError(message) {
  const err = new Error(message);
  err.userFacing = true;
  return err;
}

// ─── LMS Login (fresh context, nothing saved) ───────────────
// Returns null on success, or the LMS's error message.
async function lmsLogin(page, email, password) {
  await page.goto(LOGIN_URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', email);
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

  if (!page.url().includes("/login")) return null;
  const errorMsg = await page
    .evaluate(() => {
      const err = document.querySelector('[role="alert"], .text-destructive, .text-red-500, [data-sonner-toast]');
      return err ? err.innerText.trim() : "";
    })
    .catch(() => "");
  return (errorMsg || "Invalid email or password.").slice(0, 200);
}

// ─── Core Automation Engine (Playwright) ────────────────────
async function runJob(entry) {
  const { job } = entry;
  job.status = "running";
  emit(job, "started", {
    total: SOLUTIONS.length,
    problems: SOLUTIONS.map((s) => ({ index: s.index, name: s.name })),
  });

  let browser = null;
  const timer = setTimeout(() => {
    job.timedOut = true;
    if (browser) browser.close().catch(() => {});
  }, JOB_TIMEOUT_MS);

  try {
    browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage", "--disable-gpu"] });
    // A new context per run: no cookies or storage are ever shared between students
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();

    emit(job, "auth_start");
    let { email, password } = entry.credentials;
    entry.credentials = null;
    const loginError = await lmsLogin(page, email, password);
    email = password = null;

    if (loginError) {
      record(`fail:${job.ip}`);
      record(`fail:${job.accountKey}`);
      emit(job, "auth_error", { message: loginError });
      return finish(job, "failed");
    }
    emit(job, "auth_success");

    let consecutiveErrors = 0;
    for (let i = 0; i < SOLUTIONS.length; i++) {
      const prob = SOLUTIONS[i];
      emit(job, "problem_start", { index: prob.index, name: prob.name, current: i + 1, total: SOLUTIONS.length });

      let verdict;
      try {
        verdict = await submitSolution(page, prob.href, prob.code, prob.index, { screenshots: false });
        consecutiveErrors = 0;
      } catch (err) {
        if (job.timedOut) throw err;
        // solve.js can't re-login here (it never holds web users' passwords)
        if (/not logged in/i.test(err.message)) throw userError("Your LMS session expired. Please run again.");
        console.error(`[run ${job.id.slice(0, 6)}] problem ${prob.index}: ${err.message.split("\n")[0]}`);
        verdict = "Error";
        if (++consecutiveErrors >= 3) throw userError("The LMS isn't responding right now. Please try again later.");
      }

      job.progress.done = i + 1;
      if (verdict === "Accepted") job.progress.accepted++;
      job.progress.percent = Math.round(((i + 1) / SOLUTIONS.length) * 100);
      emit(job, "problem_result", { index: prob.index, name: prob.name, verdict, progress: { ...job.progress } });

      // Polite pause between problems
      if (i < SOLUTIONS.length - 1) await new Promise((r) => setTimeout(r, 1500));
    }

    emit(job, "completed", { ...job.progress });
    finish(job, "completed");
  } catch (err) {
    if (!err.userFacing && !job.timedOut) {
      console.error(`[run ${job.id.slice(0, 6)}] failed: ${err.message.split("\n")[0]}`);
    }
    const message = job.timedOut
      ? "This run took too long and was stopped. Please try again."
      : err.userFacing
        ? err.message
        : "Something went wrong while talking to the LMS. Please try again.";
    emit(job, "error", { message });
    finish(job, "failed");
  } finally {
    clearTimeout(timer);
    if (browser) await browser.close().catch(() => {});
  }
}

// ─── API ────────────────────────────────────────────────────
app.get("/healthz", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/problems", (req, res) => {
  res.json({
    total: SOLUTIONS.length,
    problems: SOLUTIONS.map((s) => ({ index: s.index, name: s.name })),
  });
});

function sameOrigin(req) {
  const origin = req.get("origin");
  if (!origin) return true; // non-browser clients; the limits below still apply
  try {
    return new URL(origin).host === req.get("host");
  } catch (e) {
    return false;
  }
}

app.post("/api/solve", express.json({ limit: "4kb" }), (req, res) => {
  if (!sameOrigin(req)) {
    return res.status(403).json({ error: "Cross-site requests are not allowed." });
  }

  const body = req.body || {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (ALLOWED_EMAIL_DOMAIN && !email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
    return res.status(400).json({ error: `Use your @${ALLOWED_EMAIL_DOMAIN} LMS email.` });
  }
  if (!password || password.length > 256) {
    return res.status(400).json({ error: "Enter your LMS password." });
  }
  if (!SOLUTIONS.length) {
    return res.status(503).json({ error: "No verified solutions are loaded on this server." });
  }

  const ip = req.ip;
  const accountKey = hashAccount(email);

  for (const job of jobs.values()) {
    if (isActive(job) && job.accountKey === accountKey) {
      return res.status(429).json({ error: "This account already has a run in progress." });
    }
  }
  if (countRecent(`fail:${accountKey}`) >= FAILED_LOGINS_PER_ACCOUNT_PER_HOUR) {
    return res.status(429).json({ error: "Too many failed logins for this account. Try again in an hour." });
  }
  if (countRecent(`fail:${ip}`) >= FAILED_LOGINS_PER_IP_PER_HOUR) {
    return res.status(429).json({ error: "Too many failed logins from your network. Try again in an hour." });
  }
  if (countRecent(`start:${ip}`) >= RUNS_PER_IP_PER_HOUR) {
    return res.status(429).json({ error: "Too many runs from your network. Try again in an hour." });
  }
  if (queue.length >= MAX_QUEUE) {
    return res.status(503).json({ error: "The solver is busy right now. Please try again in a few minutes." });
  }

  record(`start:${ip}`);
  const job = createJob(ip, accountKey);
  queue.push({ job, credentials: { email, password }, position: 0 });
  pump();

  res.status(202).json({ jobId: job.id, total: SOLUTIONS.length });
});

// Live progress for one run (Server-Sent Events). The token is the only key.
app.get("/api/stream/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Run not found or expired." });
  }
  if (job.listeners.size >= 5) {
    return res.status(429).json({ error: "Too many open connections for this run." });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Replay what the client missed (all of it on a fresh page, the gap on reconnect)
  const lastSeen = parseInt(req.get("last-event-id"), 10) || 0;
  for (const event of job.events) {
    if (event.seq > lastSeen) writeEvent(res, event);
  }

  job.listeners.add(res);
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25000);
  req.on("close", () => {
    clearInterval(heartbeat);
    job.listeners.delete(res);
  });
});

// Never leak stack traces or internals (bad JSON, oversized bodies, ...)
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  res.status(status >= 400 && status < 500 ? status : 500).json({
    error: status >= 400 && status < 500 ? "Bad request." : "Something went wrong.",
  });
});

// Drop expired rate-limit entries
setInterval(() => {
  for (const key of [...hits.keys()]) countRecent(key);
}, 10 * 60 * 1000).unref();

// ─── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  🚀 BMSCE LMS Auto-Solver Web Application Running`);
  console.log(`  ⚡ Trademark & Engineered by UM`);
  console.log(`  🌐 Local URL: http://localhost:${PORT}`);
  console.log(`  📋 ${SOLUTIONS.length} verified solutions · ${MAX_CONCURRENT_JOBS} concurrent run(s)`);
  console.log(`════════════════════════════════════════════════════════════\n`);
});
