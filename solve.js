// ═══════════════════════════════════════════════════════════
// LMS Auto-Solver: Scrape → Groq LLM / JSON Cache → Paste → Submit
// ═══════════════════════════════════════════════════════════

const { chromium } = require("playwright");
const Groq = require("groq-sdk");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const {
  RESULTS_FILE,
  SOLUTIONS_JSON_FILE,
  SOLUTIONS_DIR,
  slugOf,
  loadProblems,
  loadResults,
  isAccepted,
  solutionsMetadata,
  syncToProblems,
} = require("./problem-store");
const { promptCredentials } = require("./credentials");
dotenv.config();

// ─── Config ────────────────────────────────────────────────
const LMS_BASE = "https://lms.bmsce.in";
const LOGIN_URL = `${LMS_BASE}/login`;
const SESSION_FILE = path.join(__dirname, "session", "cookies.json");
const SCREENSHOT_DIR = path.join(__dirname, "screenshots");
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// { email, password } asked at startup by login(); kept only in memory
let credentials = null;

// Total submissions per problem (first try + Groq retries with judge feedback)
const MAX_ATTEMPTS = Math.max(1, parseInt(process.env.MAX_ATTEMPTS, 10) || 3);
const VERDICT_TIMEOUT_MS = 60000;

const FINAL_VERDICTS = [
  ["Accepted", "all\\s*\\d+\\s*test cases passed|accepted"],
  ["Wrong Answer", "wrong answer"],
  ["Time Limit Exceeded", "time limit exceeded"],
  ["Runtime Error", "runtime error"],
  ["Compilation Error", "compilation error"],
];

const GROQ_MODELS = [
  process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ─── Helpers ───────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${msg}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Cache Management (solutions.json) ────────────────────
function getCachedSolution(index, problemUrl) {
  // Check solutions.json first (matched by slug; indices shift when problems are added)
  if (fs.existsSync(SOLUTIONS_JSON_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(SOLUTIONS_JSON_FILE, "utf-8"));
      const list = data.solutions || [];
      const match = list.find((s) => slugOf(s.href) === slugOf(problemUrl));
      if (match && match.code && match.code.trim().length > 20) {
        return match.code.trim();
      }
    } catch (e) {}
  }

  // Fallback to solutions/<index>-solution.py
  const individualFile = path.join(SOLUTIONS_DIR, `${index}-solution.py`);
  if (fs.existsSync(individualFile)) {
    const code = fs.readFileSync(individualFile, "utf-8").trim();
    if (code.length > 20) return code;
  }

  return null;
}

function updateSolutionsJson(index, title, problemUrl, code, verdict) {
  ensureDir(SOLUTIONS_DIR);
  // Always update individual file
  const individualFile = path.join(SOLUTIONS_DIR, `${index}-solution.py`);
  fs.writeFileSync(individualFile, code, "utf-8");

  // Update solutions.json
  let data = { metadata: {}, solutions: [] };
  if (fs.existsSync(SOLUTIONS_JSON_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(SOLUTIONS_JSON_FILE, "utf-8"));
    } catch (e) {}
  }

  if (!Array.isArray(data.solutions)) data.solutions = [];

  const existingIdx = data.solutions.findIndex(
    (s) => slugOf(s.href) === slugOf(problemUrl)
  );

  const entry = {
    id: index + 1,
    index,
    name: title,
    href: problemUrl,
    verdict: verdict || "Pending",
    language: "python",
    code,
    solutionFile: `solutions/${index}-solution.py`,
    timestamp: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    data.solutions[existingIdx] = { ...data.solutions[existingIdx], ...entry };
  } else {
    data.solutions.push(entry);
  }

  data.solutions.sort((a, b) => a.index - b.index);
  data.metadata = solutionsMetadata(data.solutions);

  fs.writeFileSync(SOLUTIONS_JSON_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Auto-Login Helper ─────────────────────────────────────
async function performLogin(page) {
  if (credentials && credentials.manual) {
    // Google / manual sessions carry no password, so we can't silently re-login
    throw new Error("Your LMS session expired. Run `npm run login:google` again to sign in.");
  }
  if (!credentials) {
    throw new Error("Not logged in. Run login() first so the LMS email/password are asked.");
  }
  const { email, password } = credentials;

  log(`🔐 Logging into BMSCE LMS as ${email}...`);
  await page.goto(LOGIN_URL, { waitUntil: "networkidle", timeout: 30000 });

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

  await page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  if (page.url().includes("/login")) {
    const errorMsg = await page
      .evaluate(() => {
        const err = document.querySelector('[role="alert"], .text-destructive, .text-red-500, [data-sonner-toast]');
        return err ? err.innerText.trim() : "";
      })
      .catch(() => "");
    throw new Error(`Login failed: ${errorMsg || "still on the login page — check your email and password"}`);
  }

  const cookies = await page.context().cookies();
  ensureDir(path.dirname(SESSION_FILE));
  fs.writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));
  log("✅ Login successful, session cookies saved.");
}

// Ask for the LMS email/password and log in from a clean browser session, so a
// previous account's saved cookies are never reused. Returns the account email.
async function login() {
  for (let attempt = 1; ; attempt++) {
    credentials = await promptCredentials();
    const browser = await chromium.launch({ headless: process.env.HEADLESS !== "false" });
    try {
      const context = await browser.newContext({ bypassCSP: true, userAgent: USER_AGENT });
      await performLogin(await context.newPage());
      return credentials.email;
    } catch (err) {
      if (attempt >= 3 || !process.stdin.isTTY) throw err;
      console.error(`❌ ${err.message} — please try again.`);
    } finally {
      await browser.close();
    }
  }
}

function currentAccount() {
  return credentials ? credentials.email.toLowerCase() : null;
}

// ─── Google / Manual Login (for students who use "Sign in with Google") ─────
// Opens a REAL, visible browser on the LMS login page and lets the student log
// in themselves — including "Sign in with Google". Their Google password is only
// ever typed into Google's own page; this tool never sees, asks for or stores it.
// We keep only the resulting LMS session cookies, exactly like the password flow.
async function manualLogin() {
  // MANUAL_HEADLESS is a test-only knob (headless + non-interactive); real use needs a TTY.
  if (!process.stdin.isTTY && !process.env.MANUAL_HEADLESS) {
    throw new Error("Google login needs an interactive terminal — it opens a browser window for you.");
  }

  console.log("\n🌐 A browser window will open on the BMSCE LMS login page.");
  console.log('   Log in the way you normally do — including "Sign in with Google".');
  console.log("   Your Google password goes into Google's own page, never into this tool.\n");

  // Visible by default; MANUAL_HEADLESS is only for automated testing.
  const browser = await chromium.launch({ headless: !!process.env.MANUAL_HEADLESS });
  try {
    const context = await browser.newContext({ bypassCSP: true, userAgent: USER_AGENT });
    const page = await context.newPage();
    await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});

    log("Waiting for you to finish logging in (up to 5 minutes)...");
    const deadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < deadline) {
      await page.waitForTimeout(1500);
      let url;
      try {
        url = page.url();
      } catch (e) {
        throw new Error("The browser window was closed before login finished. Please try again.");
      }
      // Logged in once we're back on the LMS and no longer on the login page
      if (url.startsWith(LMS_BASE) && !url.includes("/login")) break;
    }
    if (page.url().includes("/login")) {
      throw new Error("Login wasn't completed in time. Please run `npm run login:google` again.");
    }

    const cookies = await context.cookies();
    if (!cookies.length) throw new Error("No session cookies were captured. Please try again.");
    ensureDir(path.dirname(SESSION_FILE));
    fs.writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));
    log("✅ Logged in — session saved. You can close the browser window.");

    // No email/password is ever asked; the per-account key is derived from the
    // saved LMS session token so progress tracking still works.
    credentials = { email: sessionAccountKey(), manual: true };
    return credentials.email;
  } finally {
    await browser.close().catch(() => {});
  }
}

// A stable, non-identifying key for the saved session (hash of the LMS session
// token). Used to tag results per login without ever asking for an email.
function sessionAccountKey() {
  try {
    const cookies = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
    const tok = cookies.find((c) => /session-token/i.test(c.name) && c.value);
    if (tok) return "google:" + crypto.createHash("sha256").update(tok.value).digest("hex").slice(0, 12);
  } catch (e) {}
  return "google:session";
}

// Quick auth probe: does the saved session still log us in?
async function sessionIsValid() {
  if (!fs.existsSync(SESSION_FILE)) return false;
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ bypassCSP: true, userAgent: USER_AGENT });
    await context.addCookies(JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8")));
    const page = await context.newPage();
    await page.goto(`${LMS_BASE}/courses/competitive-coding/competitive`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(1500);
    return !page.url().includes("/login") && !(await page.$('input[type="password"]'));
  } catch (e) {
    return false;
  } finally {
    await browser.close().catch(() => {});
  }
}

// Solve using the session saved earlier by `login:google` — no browser re-open.
async function useSavedSession() {
  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error("No saved session found. Run `npm run login:google` first to log in with Google.");
  }
  log("Checking your saved LMS session...");
  if (!(await sessionIsValid())) {
    throw new Error("Your saved session has expired. Run `npm run login:google` again, then retry.");
  }
  credentials = { email: sessionAccountKey(), manual: true };
  log("✅ Using your saved Google login — no re-login needed.");
  return credentials.email;
}

async function ensureAuthenticated(page) {
  const url = page.url();
  if (url.includes("/login") || (await page.$('input[type="password"]'))) {
    log("⚠️ Session invalid or expired. Performing auto-login...");
    await performLogin(page);
    return true;
  }
  return false;
}

// ─── Step 1: Scrape problem description + examples ─────────
async function scrapeProblem(page, problemUrl) {
  log(`Navigating to problem: ${problemUrl}`);
  await page.goto(`${LMS_BASE}${problemUrl}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  await ensureAuthenticated(page);
  await page.waitForTimeout(2000);

  // Get problem title
  const title = await page.evaluate(() => {
    const h1 = document.querySelector("h1, h2");
    return h1 ? h1.textContent.trim() : "Unknown Problem";
  });

  // Get description tab content
  const description = await page.evaluate(() => {
    const mainEl = document.querySelector("main");
    return mainEl ? mainEl.innerText : document.body.innerText;
  });

  // Click Examples tab to get test cases
  let examples = "";
  const examplesTab = await page.$('button:has-text("Examples")');
  if (examplesTab) {
    await examplesTab.click();
    await page.waitForTimeout(1000);
    examples = await page.evaluate(() => {
      const mainEl = document.querySelector("main");
      return mainEl ? mainEl.innerText : "";
    });
  }

  // Click Starter Code tab to get starter code
  let starterCode = "";
  const starterTab = await page.$('button:has-text("Starter Code")');
  if (starterTab) {
    await starterTab.click();
    await page.waitForTimeout(1000);
    starterCode = await page.evaluate(() => {
      const preEls = Array.from(document.querySelectorAll("pre, code"));
      for (const el of preEls) {
        const text = el.textContent.trim();
        if (text.includes("import sys") || text.includes("def main") || text.includes("sys.stdin")) {
          return text;
        }
      }
      return preEls[0] ? preEls[0].textContent.trim() : "";
    });
  }

  return { title, description, examples, starterCode };
}

// ─── Step 2: Ask Groq LLM for a solution ──────────────────
async function getSolutionFromGroq(problemData, previousAttempt = null) {
  if (!groq) {
    throw new Error("GROQ_API_KEY is not configured in .env!");
  }

  const { title, description, examples, starterCode } = problemData;
  log(`Asking Groq LLM for solution to: ${title}${previousAttempt ? " (retry with judge feedback)" : ""}`);

  const systemPrompt = `You are a world-class competitive programmer.
Solve the given problem in Python 3.
CRITICAL REQUIREMENTS:
1. Output ONLY executable Python code.
2. DO NOT output markdown code blocks (no \`\`\`python, no \`\`\`).
3. DO NOT output explanations, introductory text, or concluding notes.
4. Use standard Python 4-space indentation.
5. Read inputs cleanly using sys.stdin.read().split() or sys.stdin.readline.
6. Handle all edge cases and constraints described in the problem.
7. Must be efficient and pass within the time limit.`;

  const userPrompt = `PROBLEM: ${title}

DESCRIPTION:
${description}

EXAMPLES:
${examples}

${starterCode ? `STARTER CODE TEMPLATE:\n${starterCode}\n` : ""}
${
  previousAttempt
    ? `PREVIOUS ATTEMPT (verdict: ${previousAttempt.verdict}):
${previousAttempt.code}

JUDGE OUTPUT:
${previousAttempt.details}

The previous attempt was rejected. Find the bug (wrong logic, missed edge case, output format, or too slow) and write a corrected solution.
`
    : ""
}
Implement the complete Python 3 solution:`;

  let lastError = null;

  for (const model of GROQ_MODELS) {
    try {
      log(`Calling Groq with model: ${model}...`);
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: model,
        temperature: previousAttempt ? 0.4 : 0.1,
        max_tokens: 8192,
      });

      let code = (completion.choices[0].message.content || "").trim();

      // Clean up markdown fences if present (also when the model wraps code in prose)
      const fenced = code.match(/```(?:python|py)?[^\n]*\n([\s\S]*?)```/i);
      if (fenced) code = fenced[1];
      code = code.replace(/^```(?:python|py)?\s*\n?/i, "");
      code = code.replace(/\n?```\s*$/i, "");
      code = code.trim();

      if (code.length < 20) {
        throw new Error("Empty or truncated response");
      }

      log(`✅ Received solution from ${model} (${code.split("\n").length} lines)`);
      return code;
    } catch (err) {
      log(`⚠️ Model ${model} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`All Groq models failed. Last error: ${lastError?.message}`);
}

// ─── Step 3: Navigate to Solve page, inject code, submit ───
// options.screenshots: false skips the before/after screenshots (the web server
// uses this so other students' LMS pages are never written to disk)
async function submitSolution(page, problemUrl, code, index = 0, options = {}) {
  const screenshots = options.screenshots !== false;
  const solveUrl = problemUrl.replace(
    /\/problems\/([^?]+)/,
    "/problems/$1/solve"
  );

  log(`Navigating to solve page: ${solveUrl}`);
  await page.goto(`${LMS_BASE}${solveUrl}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  await ensureAuthenticated(page);

  log("Waiting for Monaco editor to initialize...");
  await page.waitForSelector(".monaco-editor", { timeout: 20000 });
  await page.waitForTimeout(2000);

  // Check language selector dropdown
  try {
    const langBtn = await page.$(
      'button:has-text("Python"), button:has-text("C++"), button:has-text("Java")'
    );
    if (langBtn) {
      const currentLang = (await langBtn.textContent()).trim();
      if (!currentLang.toLowerCase().includes("python")) {
        log(`Switching language from "${currentLang}" to "Python"...`);
        await langBtn.click();
        await page.waitForTimeout(600);
        const pyOption = await page.$(
          '[role="option"]:has-text("Python"), [role="menuitem"]:has-text("Python"), div:has-text("Python")'
        );
        if (pyOption) {
          await pyOption.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  } catch (e) {
    log(`Language check warning: ${e.message}`);
  }

  // Inject code into Monaco editor via React Fiber ref
  log("Injecting code into Monaco editor via React Fiber...");
  const injectionResult = await page.evaluate((solutionCode) => {
    function getReactFiber(dom) {
      const key = Object.keys(dom).find(
        (k) =>
          k.startsWith("__reactFiber") ||
          k.startsWith("__reactInternalInstance")
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
            const editor = s.memoizedState.current;
            editor.setValue(solutionCode);
            return { success: true, method: "fiber-state-current" };
          }
          s = s.next;
        }

        if (curr.memoizedProps) {
          for (const k in curr.memoizedProps) {
            const p = curr.memoizedProps[k];
            if (p && typeof p.setValue === "function") {
              p.setValue(solutionCode);
              return { success: true, method: "fiber-props-" + k };
            }
            if (p && p.current && typeof p.current.setValue === "function") {
              p.current.setValue(solutionCode);
              return { success: true, method: "fiber-props-current-" + k };
            }
          }
        }
        curr = curr.return;
      }
    }
    return { success: false };
  }, code);

  log(`Monaco injection status: ${JSON.stringify(injectionResult)}`);

  if (!injectionResult.success) {
    throw new Error("Failed to inject code into Monaco editor via React Fiber!");
  }

  await page.waitForTimeout(1000);
  await page.click(".monaco-editor");
  await page.waitForTimeout(500);

  // Save screenshot of code in editor before submit
  if (screenshots) {
    ensureDir(SCREENSHOT_DIR);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `before-submit-${index}.png`),
      fullPage: false,
    });
  }

  // Find Submit button
  log("Locating Submit button...");
  const submitBtn = await page.$('button:has-text("Submit")');
  if (!submitBtn) {
    throw new Error("Submit button not found on solve page!");
  }

  // Count verdict phrases already on the page (problem statement, earlier results)
  // so only phrases that newly appear after Submit count as this submission's verdict.
  const countVerdicts = () =>
    page.evaluate((sources) => {
      const text = document.body.innerText;
      const toast = document.querySelector('[data-sonner-toast], [role="alert"], .toast');
      return {
        counts: sources.map((src) => (text.match(new RegExp(src, "gi")) || []).length),
        toast: toast ? toast.textContent.trim() : null,
      };
    }, FINAL_VERDICTS.map(([, src]) => src));

  const lowest = (await countVerdicts()).counts;

  log("Clicking Submit...");
  await submitBtn.click();

  // Wait for submission evaluation
  log(`Waiting for test case execution & submission result (up to ${VERDICT_TIMEOUT_MS / 1000}s)...`);

  let submissionResult = "Submitted (Result pending)";
  const startTime = Date.now();

  while (Date.now() - startTime < VERDICT_TIMEOUT_MS) {
    await page.waitForTimeout(2000);

    const { counts, toast } = await countVerdicts();
    const hit = counts.findIndex((c, k) => c > lowest[k]);
    counts.forEach((c, k) => {
      lowest[k] = Math.min(lowest[k], c);
    });

    if (hit >= 0) {
      submissionResult = FINAL_VERDICTS[hit][0];
      break;
    }
    if (toast) {
      submissionResult = toast;
    }
  }

  // Save screenshot after submit
  if (screenshots) {
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `after-submit-${index}.png`),
      fullPage: false,
    });
  }

  log(`Verdict for problem [${index}]: ${submissionResult}`);
  return submissionResult;
}

// Text of the judge's result panel (failing test case, error trace) for retries
async function scrapeJudgeFeedback(page, verdict) {
  return page
    .evaluate((v) => {
      const text = (document.querySelector("main") || document.body).innerText;
      const at = text.toLowerCase().lastIndexOf(v.toLowerCase());
      return at >= 0 ? text.slice(Math.max(0, at - 300), at + 2500) : text.slice(-2500);
    }, verdict)
    .catch(() => "");
}

// ─── Main Pipeline for Single Problem ──────────────────────
async function solveProblem(problemUrl, index = 0, options = {}) {
  ensureDir(SCREENSHOT_DIR);
  ensureDir(SOLUTIONS_DIR);

  log(`\n🚀 Processing Problem [${index}]: ${problemUrl}`);

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== "false",
  });

  const context = await browser.newContext({
    bypassCSP: true,
    userAgent: USER_AGENT,
    permissions: ["clipboard-read", "clipboard-write"],
  });

  if (fs.existsSync(SESSION_FILE)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
      await context.addCookies(cookies);
    } catch (e) {
      log(`Warning: Failed to load session cookies: ${e.message}`);
    }
  }

  const page = await context.newPage();

  try {
    // Step 1: Scrape
    log("═══ STEP 1: Scraping problem details ═══");
    const problemData = await scrapeProblem(page, problemUrl);
    // The page's first heading can be the dashboard greeting ("Good morning, <name>!"),
    // so prefer the name from the course list in problems.json
    const listed = loadProblems().find((p) => slugOf(p.href) === slugOf(problemUrl));
    if (listed) problemData.title = listed.name;
    log(`Problem Title: "${problemData.title}"`);

    // Step 2: Solution Resolution (JSON Cache First → Groq API fallback)
    log("═══ STEP 2: Resolving Python Solution ═══");
    let solution = null;
    const forceApi = options.forceGroq || process.argv.includes("--no-cache") || process.argv.includes("--force-groq");

    if (!forceApi) {
      solution = getCachedSolution(index, problemUrl);
    }

    if (solution) {
      log(`⚡ [CACHE HIT] Loaded solution for [${index}] from solutions.json!`);
      log(`   (0 Groq API calls used!)`);
    } else {
      log(`🌐 [CACHE MISS] Requesting solution from Groq LLM...`);
      solution = await getSolutionFromGroq(problemData);
    }

    // Step 3: Paste and Submit (retrying with Groq + judge feedback until Accepted)
    let result = null;
    for (let attempt = 1; ; attempt++) {
      console.log("\n--- Solution to Submit ---");
      console.log(solution);
      console.log("--------------------------\n");

      log(`═══ STEP 3: Submitting solution (attempt ${attempt}/${MAX_ATTEMPTS}) ═══`);
      result = await submitSolution(page, problemUrl, solution, index);

      if (result === "Accepted" || attempt >= MAX_ATTEMPTS) break;
      if (!FINAL_VERDICTS.some(([v]) => v === result)) {
        log(`🔁 No final verdict ("${result}") — resubmitting the same code...`);
        continue;
      }
      if (!groq) break;

      const details = await scrapeJudgeFeedback(page, result);
      log(`🔁 Verdict "${result}" — asking Groq for a fix...`);
      try {
        solution = await getSolutionFromGroq(problemData, { code: solution, verdict: result, details });
      } catch (err) {
        log(`⚠️ Retry generation failed: ${err.message}`);
        break;
      }
    }

    // Update solutions.json & results.json
    updateSolutionsJson(index, problemData.title, problemUrl, solution, result);

    // Verdicts are per account: another student's Accepted doesn't count for this one
    const slug = slugOf(problemUrl);
    const account = currentAccount();
    const results = loadResults().filter((r) => !(slugOf(r.url) === slug && r.account === account));
    results.push({
      index,
      account,
      title: problemData.title,
      url: problemUrl,
      result,
      timestamp: new Date().toISOString(),
    });
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

    return { success: true, result, title: problemData.title };
  } catch (err) {
    console.error(`❌ Error on problem ${index}: ${err.message}`);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `error-${index}.png`),
      fullPage: true,
    }).catch(() => {});
    return { success: false, error: err.message };
  } finally {
    await browser.close();
  }
}

// ─── CLI Entry Point ───────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  require("./banner").printBanner();

  // Only one solve run per folder — a second would overwrite the shared login mid-run
  require("./lock").acquireLock();

  // Login mode:
  //   --use-session : reuse the session saved by `login:google` (no browser re-open)
  //   --google      : open a visible browser to log in by hand (incl. "Sign in with Google")
  //   (default)     : ask for email + password
  // No password is ever typed into this tool in the first two modes.
  let account;
  if (args.includes("--use-session")) {
    // Strict: only use the already-saved session (never opens a browser)
    account = await useSavedSession();
  } else if (args.includes("--google") || args.includes("--manual")) {
    // Smart one-command Google flow: reuse a still-valid saved login if there is
    // one, otherwise open a browser to log in — then solve. No password either way.
    if (await sessionIsValid()) {
      log("✅ Found a valid saved login — reusing it (no browser needed).");
      credentials = { email: sessionAccountKey(), manual: true };
      account = credentials.email;
    } else {
      account = await manualLogin();
    }
  } else {
    account = await login();
  }
  account = account.toLowerCase();

  // --scrape: refresh problems.json from the course page first (re-indexes the cache too)
  if (args.includes("--scrape")) {
    await require("./scrape-problems").scrapeProblems();
  }

  // Keep solutions/results indices aligned with the current problems.json order
  syncToProblems();
  const problems = loadProblems();

  // If --all flag is passed
  if (args.includes("--all")) {
    const force = args.includes("--force");

    log(`📋 Starting automated run for all ${problems.length} problems...`);

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const unsolved = [];

    const existingResults = loadResults();

    for (let i = 0; i < problems.length; i++) {
      if (isAccepted(existingResults, problems[i].href, account) && !force) {
        log(`⏩ Skipping [${i + 1}/${problems.length}] "${problems[i].name}" - Already Accepted!`);
        skipped++;
        passed++;
        continue;
      }

      console.log(`\n${"═".repeat(65)}`);
      console.log(`  [${i + 1}/${problems.length}] ${problems[i].name}`);
      console.log(`${"═".repeat(65)}\n`);

      const res = await solveProblem(problems[i].href, i);
      if (res.success && res.result === "Accepted") {
        passed++;
        log(`🎉 Problem ${i + 1} completed: ${res.result}`);
      } else {
        failed++;
        unsolved.push(`  #${i + 1} ${problems[i].name} → ${res.result || res.error}`);
        log(`⚠️ Problem ${i + 1} verdict: ${res.result || res.error}`);
      }

      // Small delay between problems
      if (i < problems.length - 1) {
        log("Waiting 3 seconds before next problem...");
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    log(`\n🏁 Finished! Summary: ${passed} passed (${skipped} previously solved), ${failed} failed.`);
    if (unsolved.length) {
      log(`Not yet accepted (rerun \`npm run solve:all\` or \`node solve.js <#>\`):\n${unsolved.join("\n")}`);
    }
    log(`Check ${RESULTS_FILE} & ${SOLUTIONS_JSON_FILE} for full status log.`);
    return;
  }

  // If a specific number or index is passed (1-based index)
  const numArg = args.find((a) => /^\d+$/.test(a));
  if (numArg) {
    const targetIdx = parseInt(numArg);
    const idx = targetIdx > 0 ? targetIdx - 1 : 0;
    const problem = problems[idx];
    if (!problem) {
      console.error(`Problem #${numArg} not found in problems.json!`);
      process.exit(1);
    }
    await solveProblem(problem.href, idx);
    return;
  }

  // Default: Solve Problem 1
  log(`🧪 Running single test problem (Problem 1: ${problems[0].name})...`);
  await solveProblem(problems[0].href, 0);
}

module.exports = {
  login,
  manualLogin,
  useSavedSession,
  sessionIsValid,
  sessionAccountKey,
  currentAccount,
  performLogin,
  ensureAuthenticated,
  solveProblem,
  scrapeProblem,
  getSolutionFromGroq,
  submitSolution,
  getCachedSolution,
  updateSolutionsJson,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(`❌ ${err.message || err}`);
    process.exit(1);
  });
}
