// ═══════════════════════════════════════════════════════════
// LMS Auto-Solver: Scrape → Groq LLM / JSON Cache → Paste → Submit
// ═══════════════════════════════════════════════════════════

const { chromium } = require("playwright");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

// ─── Config ────────────────────────────────────────────────
const LMS_BASE = "https://lms.bmsce.in";
const LOGIN_URL = `${LMS_BASE}/login`;
const SESSION_FILE = path.join(__dirname, "session", "cookies.json");
const SCREENSHOT_DIR = path.join(__dirname, "screenshots");
const SOLUTIONS_DIR = path.join(__dirname, "solutions");
const RESULTS_FILE = path.join(__dirname, "results.json");
const SOLUTIONS_JSON_FILE = path.join(__dirname, "solutions.json");

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
  // Check solutions.json first
  if (fs.existsSync(SOLUTIONS_JSON_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(SOLUTIONS_JSON_FILE, "utf-8"));
      const list = data.solutions || [];
      const match = list.find((s) => s.index === index || s.href === problemUrl);
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
    (s) => s.index === index || s.href === problemUrl
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

  const accepted = data.solutions.filter((s) => s.verdict === "Accepted").length;
  data.metadata = {
    generatedAt: new Date().toISOString(),
    totalProblems: data.solutions.length,
    acceptedCount: accepted,
    successRate: `${((accepted / (data.solutions.length || 1)) * 100).toFixed(1)}%`,
  };

  fs.writeFileSync(SOLUTIONS_JSON_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Auto-Login Helper ─────────────────────────────────────
async function performLogin(page) {
  const email = process.env.LMS_EMAIL;
  const password = process.env.LMS_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing LMS_EMAIL or LMS_PASSWORD in .env");
  }

  log("🔐 Logging into BMSCE LMS...");
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

  const cookies = await page.context().cookies();
  ensureDir(path.dirname(SESSION_FILE));
  fs.writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));
  log("✅ Login successful, session cookies saved.");
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
async function getSolutionFromGroq(problemData) {
  if (!groq) {
    throw new Error("GROQ_API_KEY is not configured in .env!");
  }

  const { title, description, examples, starterCode } = problemData;
  log(`Asking Groq LLM for solution to: ${title}`);

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
        temperature: 0.1,
        max_tokens: 4096,
      });

      let code = completion.choices[0].message.content.trim();

      // Clean up markdown fences if present
      code = code.replace(/^```(?:python|py)?\s*\n?/i, "");
      code = code.replace(/\n?```\s*$/i, "");
      code = code.trim();

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
async function submitSolution(page, problemUrl, code, index = 0) {
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
  ensureDir(SCREENSHOT_DIR);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `before-submit-${index}.png`),
    fullPage: false,
  });

  // Find Submit button
  log("Locating Submit button...");
  const submitBtn = await page.$('button:has-text("Submit")');
  if (!submitBtn) {
    throw new Error("Submit button not found on solve page!");
  }

  log("Clicking Submit...");
  await submitBtn.click();

  // Wait for submission evaluation
  log("Waiting for test case execution & submission result (up to 30s)...");

  let submissionResult = "Submitted (Result pending)";
  const startTime = Date.now();

  while (Date.now() - startTime < 30000) {
    await page.waitForTimeout(2000);

    const check = await page.evaluate(() => {
      const text = document.body.innerText;

      if (/all\s*\d+\s*test cases passed/i.test(text) || /accepted/i.test(text)) {
        return "Accepted";
      }
      if (/wrong answer/i.test(text)) {
        return "Wrong Answer";
      }
      if (/time limit exceeded/i.test(text)) {
        return "Time Limit Exceeded";
      }
      if (/runtime error/i.test(text)) {
        return "Runtime Error";
      }
      if (/compilation error/i.test(text)) {
        return "Compilation Error";
      }

      const toast = document.querySelector('[data-sonner-toast], [role="alert"], .toast');
      if (toast) {
        return toast.textContent.trim();
      }

      return null;
    });

    if (check) {
      submissionResult = check;
      if (["Accepted", "Wrong Answer", "Time Limit Exceeded", "Runtime Error", "Compilation Error"].includes(check)) {
        break;
      }
    }
  }

  // Save screenshot after submit
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `after-submit-${index}.png`),
    fullPage: false,
  });

  log(`Verdict for problem [${index}]: ${submissionResult}`);
  return submissionResult;
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
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

    console.log("\n--- Solution to Submit ---");
    console.log(solution);
    console.log("--------------------------\n");

    // Step 3: Paste and Submit
    log("═══ STEP 3: Submitting solution ═══");
    const result = await submitSolution(page, problemUrl, solution, index);

    // Update solutions.json & results.json
    updateSolutionsJson(index, problemData.title, problemUrl, solution, result);

    let results = [];
    if (fs.existsSync(RESULTS_FILE)) {
      try {
        results = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));
      } catch (e) {
        results = [];
      }
    }

    results = results.filter((r) => r.index !== index);
    results.push({
      index,
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

  // If --all flag is passed
  if (args.includes("--all")) {
    const problemsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "problems.json"), "utf-8")
    );
    const problems = problemsData.problems;
    const force = args.includes("--force");

    log(`📋 Starting automated run for all ${problems.length} problems...`);

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    let existingResults = [];
    if (fs.existsSync(RESULTS_FILE)) {
      try {
        existingResults = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));
      } catch (e) {
        existingResults = [];
      }
    }

    for (let i = 0; i < problems.length; i++) {
      const alreadyAccepted = existingResults.find(
        (r) => (r.index === i || r.url === problems[i].href) && r.result === "Accepted"
      );

      if (alreadyAccepted && !force) {
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
        log(`⚠️ Problem ${i + 1} verdict: ${res.result || res.error}`);
      }

      // Small delay between problems
      if (i < problems.length - 1) {
        log("Waiting 3 seconds before next problem...");
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    log(`\n🏁 Finished! Summary: ${passed} passed (${skipped} previously solved), ${failed} failed.`);
    log(`Check ${RESULTS_FILE} & ${SOLUTIONS_JSON_FILE} for full status log.`);
    return;
  }

  // If a specific number or index is passed (1-based index)
  if (args[0] && !isNaN(parseInt(args[0]))) {
    const problemsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "problems.json"), "utf-8")
    );
    const targetIdx = parseInt(args[0]);
    const idx = targetIdx > 0 ? targetIdx - 1 : 0;
    const problem = problemsData.problems[idx];
    if (!problem) {
      console.error(`Problem #${args[0]} not found in problems.json!`);
      process.exit(1);
    }
    await solveProblem(problem.href, idx);
    return;
  }

  // Default: Solve Problem 1
  log("🧪 Running single test problem (Problem 1: Follow the FAT Chain)...");
  const problemsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "problems.json"), "utf-8")
  );
  await solveProblem(problemsData.problems[0].href, 0);
}

module.exports = {
  solveProblem,
  scrapeProblem,
  getSolutionFromGroq,
  submitSolution,
  getCachedSolution,
  updateSolutionsJson,
};

if (require.main === module) {
  main().catch(console.error);
}
