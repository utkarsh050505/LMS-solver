# 🚀 BMSCE LMS Competitive Coding Auto-Solver

An automated solver that solves, tests, and submits all **42 problems** on the BMSCE LMS Competitive Coding course (`https://lms.bmsce.in`).

---

## ✨ Features

- **100% Success Rate (42 / 42 Accepted):** All solutions have been tested and verified on LMS.
- **Zero API Keys Required:** All solutions are pre-compiled in `solutions.json`. No Groq API key or payment is needed!
- **Interactive & Secure:** Prompts for your BMSCE email and password with `*` masking and saves locally in `.env`.
- **Anti-Cheat Safe:** Injects code via internal React Fiber refs directly into the Monaco editor, bypassing LMS clipboard blocks and preserving pristine Python indentation.
- **Auto-Resuming:** If interrupted, simply run it again — it remembers previously solved problems and resumes instantly.

---

## ⚡ Quick Start (For Classmates)

### Option A: One-Click (Windows)
Simply double-click:
📁 **`run.bat`**

---

### Option B: Command Line (Windows / Mac / Linux)

1. Make sure you have **[Node.js](https://nodejs.org/)** installed (LTS version).
2. Open terminal in this folder and run:
   ```bash
   npm run solve-all
   ```

When prompted:
1. 📧 **BMSCE Email:** `yourname.cs24@bmsce.ac.in`
2. 🔒 **LMS Password:** (typed characters are masked with `*`)

The script will automatically log in, navigate to each problem, paste the verified solution, and submit!

---

## 📁 What's Included

- `runner.js`: Interactive CLI runner for classmates.
- `run.bat`: Double-click batch file for Windows.
- `solutions.json`: Master database of all 42 complete solutions & problem URLs.
- `solve.js`: Core Playwright automation and Monaco injector.
- `solutions/`: 42 individual Python solution files (`0-solution.py` ... `41-solution.py`).
- `screenshots/`: Screenshots of test submissions and results.

---

## 🛠️ Advanced Commands

```bash
# Run interactive classmate solver
npm run solve-all
# or
npm start

# Test a single problem (e.g. Problem 1)
npm run solve

# Run a specific problem by number (e.g. Problem 5)
node solve.js 5

# Debug mode with visible browser
npm run solve:debug
```
