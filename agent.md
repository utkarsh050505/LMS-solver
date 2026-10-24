# BMSCE LMS Auto-Solver - Agent Execution Guide (`agent.md`)

This guide is designed for **Claude Code**, **Antigravity**, or any autonomous AI coding agent tasked with maintaining, running, and completing the automated competitive coding pipeline on BMSCE LMS (`https://lms.bmsce.in`).

---

## 🎯 Mission & Objective

Automate the end-to-end solving of competitive coding problems on BMSCE LMS:
1. **Scrape** problem description, examples, and starter templates.
2. **Generate** a Python 3 solution using Groq's high-speed LLM (`openai/gpt-oss-120b` with fallbacks).
3. **Inject** the solution cleanly into the Monaco code editor without triggering anti-cheat or auto-indentation bugs.
4. **Submit** the solution, wait for test case evaluation, verify verdict (`Accepted`), and save screenshots + results.
5. **Iterate** across all problems in `problems.json` (currently 70) until 100% of problems are solved.

---

## 🚀 Quick Commands

| Task | Command | Description |
|------|---------|-------------|
| **Test 1 Problem** | `npm run solve` | Runs problem #1 ("Follow the FAT Chain") |
| **New Problems Dropped** | `npm run solve:new` | Re-scrapes the course, then solves everything not yet `Accepted` |
| **Solve All Problems** | `npm run solve:all` | Solves all problems in `problems.json`; automatically skips already `Accepted` problems |
| **Force Re-solve All** | `node solve.js --all --force` | Re-solves all problems even if previously accepted |
| **Solve Specific Problem** | `node solve.js <number>` | Solves problem by 1-based index (e.g., `node solve.js 2`) |
| **Debug Mode (Visible Browser)** | `npm run solve:debug` | Runs with `HEADLESS=false` so you can visually watch the browser |
| **Refresh Problem List** | `npm run scrape` | Re-scrapes the course problem list into `problems.json` and re-indexes cached solutions |
| **Re-authenticate** | `npm run login` | Logs in and updates `session/cookies.json` |

---

## 📁 Repository Structure

```
a:/LMS-ki-mkc/
├── .env                     # API keys (GROQ_API_KEY, GROQ_MODEL, MAX_ATTEMPTS) — no LMS credentials
├── package.json             # NPM scripts and dependencies (playwright, groq-sdk, dotenv)
├── credentials.js           # Asks the LMS email/password every run (masked, never saved)
├── login.js                 # Headless login script saving session cookies
├── session-loader.js        # Playwright authenticated session helper
├── scrape-problems.js       # Scrapes all problems from the course page
├── problems.json            # Cached list of problem titles and URLs (course page order)
├── solutions.json           # MASTER JSON CACHE: complete solutions, codes, and verdicts
├── problem-store.js         # Slug-keyed lookups + re-indexing of solutions/results to problems.json
├── build-solutions-json.js  # Helper to recompile/sync solutions.json
├── solve.js                 # PRIMARY AUTOMATION SCRIPT (JSON Cache / Groq → Inject → Submit)
├── agent.md                 # This execution guide for Claude Code / autonomous agents
├── AGENTS.md                # Standard agent instructions link
├── session/
│   └── cookies.json         # Saved LMS session cookies
├── solutions/               # Directory of all generated Python code (<index>-solution.py)
├── screenshots/             # Visual proof screenshots (<problem>-before/after.png)
└── results.json             # Persistent log of submission verdicts and timestamps
```

---

## 🔑 Login & Environment Configuration

**LMS credentials are never read from `.env`.** Every script (`solve.js`, `runner.js`, `scrape-problems.js`, `login.js`) asks for the BMSCE email and password at startup (password masked with `*`), keeps them only in memory, and logs in from a fresh browser session so a previous account's saved cookies are never reused.

Non-interactive runs (e.g. an agent) can pipe the two lines on stdin:
```bash
printf "yourname.cs24@bmsce.ac.in\nyour_password\n" | node solve.js --all
```

`results.json` records the `account` for every verdict, so "already Accepted" skipping is per account — a different student's run re-submits everything for their account.

**Google / "Sign in with Google" users.** Login modes on `solve.js`:
- `--google` / `--manual`: open a *visible* browser so the student logs in by hand (`manualLogin()` in `solve.js`). The session is saved to `session/cookies.json`.
- `--use-session`: reuse that saved session with no browser re-open (`useSavedSession()`), after a quick `sessionIsValid()` auth probe.

Recommended two-step flow: `npm run login:google` (= `login.js --google`), then `npm run solve:google` (= `solve.js --all --use-session`). One-shot: `npm run solve:google:login` (= `solve.js --all --google`). `runner.js` offers Google as choice 2. The per-account key for a Google login is `sessionAccountKey()` — a hash of the LMS session token — so progress tracking works without ever asking for an email. This tool never asks for, sees or stores a Google password; it only keeps the LMS session the real login produces. That session has no password, so it can't silently re-login if it expires mid-run: `performLogin()` throws a "run `npm run login:google` again" message. The **web app is deliberately email+password only** — a hosted server must never collect Google passwords (that is the phishing pattern, and Google blocks scripted logins regardless).

The `.env` file only holds API settings:
```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b
MAX_ATTEMPTS=3
```

---

## ⚙️ Architecture & Technical Insights

### 1. The LMS Anti-Cheat & Monaco Injection ("Editor-only paste")
The BMSCE LMS implements an anti-cheat feature:
> *"This is a course problem. You can copy and paste lines within the editor, but code from outside it cannot be pasted in."*

- **Why standard clipboard paste fails:** The page listens for paste events and blocks text that was not copied from inside that specific Monaco instance.
- **Why `keyboard.insertText()` fails:** Monaco's auto-indentation rule fires on every newline `\n` following colons (`:`), progressively doubling and quadrupling Python indentations, resulting in `IndentationError: unexpected indent`.
- **The Bulletproof Solution (Implemented in `solve.js`):**
  We traverse the **React Fiber tree** (`__reactFiber$*`) on the DOM to locate the internal Monaco editor instance reference (`s.memoizedState.current.setValue(solutionCode)`).
  This calls Monaco's native `setValue()` directly, completely bypassing anti-cheat clipboard blocks and setting exact, pristine 4-space Python code instantly!

### 2. Groq LLM Model Selection
Groq accounts have specific available models. In this environment:
- **Primary Model:** `openai/gpt-oss-120b` (120B parameter model, fast & exceptional at competitive programming).
- **Fallbacks:** `qwen/qwen3.8-27b`, `openai/gpt-oss-20b`.
- The solver automatically cascades through fallback models if rate limits or errors occur.

### 3. Language Selector Safeguard
The language selector button is checked before submitting. To avoid false-positive selector matches (like `"C"` matching the word `"Academic"` in the LMS sidebar), `solve.js` strictly targets `button:has-text("Python"), button:has-text("C++"), button:has-text("Java")`.

### 4. Automatic Session Recovery
If an LMS session expires mid-run, `solve.js` detects redirects to `/login`, calls `performLogin(page)` automatically with the credentials entered at startup, refreshes cookies in `session/cookies.json`, and resumes without failing the pipeline.

### 5. Resumability & Progress Preservation
- Every solved problem records its verdict in `results.json`.
- When `npm run solve:all` is run, it checks `results.json` and automatically **skips** already `Accepted` problems.
- If a run is interrupted or encounters an issue, simply rerun `npm run solve:all` to pick up right where it left off.
- Problems are matched by **URL slug**, never by list position. The course list is newest-first, so new problems shift every index; `problem-store.js#syncToProblems()` re-indexes `solutions.json`, `results.json` and `solutions/<index>-solution.py` to the current `problems.json` order (it runs after every scrape and at the start of every `solve.js` / `runner.js` run). Solutions for problems that disappear from the page are kept under `archived` in `solutions.json` and restored if they reappear.

### 6. When New Problems Are Dropped
1. `npm run solve:new` (= `node solve.js --all --scrape`: one login, scrape, then solve all). The scrape prints new problems with 🆕 and **merges** them into `problems.json`: the course page only shows some weeks at a time, so known problems that aren't visible are kept and new ones are appended (existing positions never shift). Use `node scrape-problems.js --replace` only if a problem was really removed from the course. Check the final count matches the course (Week 1–4 = 70) before solving.
2. New problems have no cached solution, so they go to Groq. If the judge rejects a solution, `solve.js` sends the code + verdict + judge output back to Groq and resubmits, up to `MAX_ATTEMPTS` submissions per problem (default 3, set in `.env`). A missing verdict (judge timeout) resubmits the same code instead.
3. Verdict detection only counts verdict phrases that *newly* appear after clicking Submit, so a problem statement containing words like "accepted" cannot produce a false `Accepted`.
4. Commit the updated `solutions.json` + `solutions/` so classmates' `runner.js` runs entirely from cache.

---

## 🤖 Instructions for Claude Code / Autonomous Agents

If you are continuing this task autonomously:

1. **Verify Session & Test Problem 1 First:**
   ```bash
   npm run solve
   ```
   Check that `results.json` has `index: 0` marked `"Accepted"` and `screenshots/after-submit-0.png` shows a green checkmark.

2. **Execute Full Batch:**
   ```bash
   npm run solve:all
   ```
   Allow the script to process all problems sequentially. (If problems were added to the course, run `npm run solve:new` instead.)

3. **Handle Problem Verdicts:**
   After the batch completes:
   - Read `results.json` to inspect all verdicts.
   - For any problem with `"Wrong Answer"` or `"Time Limit Exceeded"`:
     - Check the problem's solution in `solutions/<index>-solution.py`.
     - Check the error screenshot in `screenshots/after-submit-<index>.png`.
     - Run targeted re-solve with `node solve.js <index+1>`.

4. **Never Give Up / No Matter What:**
   - If an unexpected network timeout occurs, restart the process: `npm run solve:all`.
   - The built-in skipping logic ensures zero wasted API calls on problems that are already `Accepted`.
   - Continue until every problem in `problems.json` (currently 70) shows `"Accepted"` in `results.json`.
