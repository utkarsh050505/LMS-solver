# 🚀 BMSCE LMS Competitive Coding Auto-Solver

### Built by Utkarsh

An automated solver that solves, tests, and submits all **70 problems** on the BMSCE LMS Competitive Coding course (`https://lms.bmsce.in`).

---

## ✨ Features

- **Verified Solutions:** Every solution in `solutions.json` is stored with its LMS verdict after being submitted and checked.
- **Zero API Keys Required:** Cached solutions in `solutions.json` are submitted directly. A Groq API key is only needed for problems that don't have a cached solution yet.
- **Interactive & Secure:** Asks for your BMSCE email and password on every run (password masked with `*`). Nothing is saved to `.env`, so classmates can take turns on the same machine.
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

When prompted, pick how you log in:
- **1) Email + password** — enter your `@bmsce.ac.in` email and LMS password (masked with `*`).
- **2) Sign in with Google** — a browser window opens on the LMS login page. Click **Sign in with Google** and finish logging in yourself. Your Google password is typed into Google's own page; **this tool never sees or stores it** — it only keeps the LMS session afterward.

The script then logs in, navigates to each problem, pastes the verified solution, and submits.

### 🔑 "Sign in with Google" (OAuth) users

If you normally open the LMS with **Sign in with Google**, use the command line (the website can't do Google login — see below). Two steps:

```bash
npm run login:google   # 1) opens a browser — log in with Google yourself (once)
npm run solve:google   # 2) solves all 70 using that saved session (no re-login)
```

- `login:google` opens a real browser and waits for *you* to finish the Google login. Nothing about your Google account is asked for, seen, or saved — only the LMS session it produces.
- `solve:google` reuses that saved session and submits every problem. It never re-opens the browser. If the session has expired, it tells you to run `npm run login:google` again.

> Prefer one command? `npm run solve:google:login` opens the browser to log in *and* then solves all 70 in a single step.

---

## 📁 What's Included

- `runner.js`: Interactive CLI runner for classmates.
- `run.bat`: Double-click batch file for Windows.
- `solutions.json`: Master database of complete solutions & problem URLs.
- `solve.js`: Core Playwright automation and Monaco injector.
- `solutions/`: Individual Python solution files (`<index>-solution.py`, in course page order).
- `screenshots/`: Screenshots of test submissions and results.

---

## 🌐 Website (classmates just enter their LMS email + password)

```bash
npm run web   # http://localhost:3000
```

The site submits the verified solutions in `solutions.json` for whoever signs in. Security:
- Passwords are used once to sign in from a fresh, isolated browser and are **never stored, logged or written to disk**.
- Runs are private (random token), forgotten 15 minutes after finishing, and never contain the email.
- One run per account, 3 failed logins per account per hour (no password guessing), per-IP limits, a queue with a concurrency cap, strict security headers, same-origin only, HTTPS redirect behind a proxy.
- `.dockerignore` keeps `.env` and saved LMS sessions out of the Docker image.

> **"Sign in with Google" users:** the website only accepts an email + LMS password, because a hosted site must never ask you to type your **Google** password into it — a server that collects Google passwords and replays them is exactly how phishing works, and Google blocks automated logins anyway. If you use Google to sign in, run the tool on your own computer with `npm run login:google` (above) instead, where *you* complete the Google login in a real browser.

### Host it on Render (free, ~5 minutes)
1. Commit and push this repo to GitHub (`.env` is git-ignored, so no secrets are pushed).
2. Go to [render.com](https://render.com) → sign in with GitHub → **New → Blueprint** → pick this repo → **Apply**.
   Render reads `render.yaml`, builds the `Dockerfile` and gives you a `https://<name>.onrender.com` URL with HTTPS.
3. Open the URL and do one run with your own account first.

The free plan sleeps after 15 minutes without visitors and is slow (0.1 CPU), so a run can stop midway. If that happens, change `plan: free` to `plan: starter` in `render.yaml` (or in the Render dashboard). Pushing to GitHub redeploys automatically, including new `solutions.json` updates.

Optional env vars: `MAX_CONCURRENT_JOBS` (default 2, use 1 on 512 MB), `MAX_QUEUE` (20), `RUNS_PER_IP_PER_HOUR` (20), `JOB_TIMEOUT_MINUTES` (60), `ALLOWED_EMAIL_DOMAIN` (`bmsce.ac.in`).

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

# New problems added to the course: re-scrape, then solve everything not yet accepted
npm run solve:new

# Log in with Google, then solve everything with that session
npm run login:google
npm run solve:google
```

---

## 👤 Author & License

**Built by Utkarsh** — [github.com/utkarsh050505](https://github.com/utkarsh050505).
Don't vibe code — hire me. 🙂

Released under the [MIT License](LICENSE): you're free to use and build on it, but the copyright notice and author credit must stay in any copy or fork. Not affiliated with BMSCE.
