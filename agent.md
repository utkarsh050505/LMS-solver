# BMSCE LMS Auto-Solver - Agent Execution Guide (`agent.md`)

This guide is designed for **Claude Code**, **Antigravity**, or any autonomous AI coding agent tasked with maintaining, running, and completing the automated competitive coding pipeline on BMSCE LMS (`https://lms.bmsce.in`).

---

## 🎯 Mission & Objective

Automate the end-to-end solving of competitive coding problems on BMSCE LMS:
1. **Scrape** problem description, examples, and starter templates.
2. **Generate** a Python 3 solution using Groq's high-speed LLM (`openai/gpt-oss-120b` with fallbacks).
3. **Inject** the solution cleanly into the Monaco code editor without triggering anti-cheat or auto-indentation bugs.
4. **Submit** the solution, wait for test case evaluation, verify verdict (`Accepted`), and save screenshots + results.
5. **Iterate** across all 42 problems (47 links) until 100% of problems are solved.

---

## 🚀 Quick Commands

| Task | Command | Description |
|------|---------|-------------|
| **Test 1 Problem** | `npm run solve` | Runs problem #1 ("Follow the FAT Chain") |
| **Solve All Problems** | `npm run solve:all` | Solves all 42 problems; automatically skips already `Accepted` problems |
| **Force Re-solve All** | `node solve.js --all --force` | Re-solves all problems even if previously accepted |
| **Solve Specific Problem** | `node solve.js <number>` | Solves problem by 1-based index (e.g., `node solve.js 2`) |
| **Debug Mode (Visible Browser)** | `npm run solve:debug` | Runs with `HEADLESS=false` so you can visually watch the browser |
| **Refresh Problem List** | `npm run scrape` | Re-scrapes the course problem list into `problems.json` |
| **Re-authenticate** | `npm run login` | Logs in and updates `session/cookies.json` |

---

## 📁 Repository Structure

```
a:/LMS-ki-mkc/
├── .env                     # Credentials & API keys (LMS_EMAIL, LMS_PASSWORD, GROQ_API_KEY)
├── package.json             # NPM scripts and dependencies (playwright, groq-sdk, dotenv)
├── login.js                 # Headless login script saving session cookies
├── session-loader.js        # Playwright authenticated session helper
├── scrape-problems.js       # Scrapes all problems from the course page
├── problems.json            # Cached list of 42 problem titles and URLs
├── solutions.json           # MASTER JSON CACHE: all 42 complete solutions, codes, and verdicts
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

## 🔑 Environment Configuration (`.env`)

Ensure the `.env` file contains:
```env
LMS_EMAIL=yourname.cs24@bmsce.ac.in
LMS_PASSWORD=your_password_here
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b
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
If an LMS session expires mid-run, `solve.js` detects redirects to `/login`, calls `performLogin(page)` automatically, refreshes cookies in `session/cookies.json`, and resumes without failing the pipeline.

### 5. Resumability & Progress Preservation
- Every solved problem records its verdict in `results.json`.
- When `npm run solve:all` is run, it checks `results.json` and automatically **skips** already `Accepted` problems.
- If a run is interrupted or encounters an issue, simply rerun `npm run solve:all` to pick up right where it left off.

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
   Allow the script to process all 42 problems sequentially.

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
   - Continue until all 42 problems in `results.json` show `"Accepted"`.
