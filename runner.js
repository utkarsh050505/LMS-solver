// ══════════════════════════════════════════════════════════════════════
// BMSCE LMS Scalable Auto-Solver Runner for Students / Classmates
// ══════════════════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");

const ENV_FILE = path.join(__dirname, ".env");
const SOLUTIONS_JSON = path.join(__dirname, "solutions.json");
const SESSION_FILE = path.join(__dirname, "session", "cookies.json");
const RESULTS_FILE = path.join(__dirname, "results.json");

// ─── Interactive Prompt Helpers ─────────────────────────────
function askQuestion(query, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (!hidden) {
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    } else {
      process.stdout.write(query);
      let input = "";
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        const onData = (ch) => {
          if (ch === "\n" || ch === "\r" || ch === "\u0004") {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener("data", onData);
            process.stdout.write("\n");
            rl.close();
            resolve(input.trim());
          } else if (ch === "\u0003") {
            // Ctrl+C
            process.exit();
          } else if (ch === "\u0008" || ch === "\x7f") {
            // Backspace
            if (input.length > 0) {
              input = input.slice(0, -1);
              process.stdout.write("\b \b");
            }
          } else {
            input += ch;
            process.stdout.write("*");
          }
        };

        process.stdin.on("data", onData);
      } else {
        // Fallback for non-TTY
        rl.question("", (ans) => {
          rl.close();
          resolve(ans.trim());
        });
      }
    }
  });
}

// ─── Environment Management ────────────────────────────────
function readEnv() {
  if (!fs.existsSync(ENV_FILE)) return {};
  const content = fs.readFileSync(ENV_FILE, "utf-8");
  const env = {};
  content.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim();
      if (key && !key.startsWith("#")) env[key] = val;
    }
  });
  return env;
}

function writeEnv(envMap) {
  let lines = [];
  if (fs.existsSync(ENV_FILE)) {
    lines = fs.readFileSync(ENV_FILE, "utf-8").split("\n");
  }

  const updatedKeys = new Set();
  const newLines = lines.map((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      if (envMap[key] !== undefined) {
        updatedKeys.add(key);
        return `${key}=${envMap[key]}`;
      }
    }
    return line;
  });

  for (const key in envMap) {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}=${envMap[key]}`);
    }
  }

  fs.writeFileSync(ENV_FILE, newLines.join("\n").trim() + "\n", "utf-8");
}

// ─── Step 1: Ensure Dependencies & Playwright Browser ──────
async function ensureSetup() {
  console.log("🔍 Checking required dependencies...");

  // Check node_modules
  if (!fs.existsSync(path.join(__dirname, "node_modules"))) {
    console.log("📦 Installing NPM packages (playwright, dotenv, groq-sdk)...");
    execSync("npm install", { stdio: "inherit" });
  }

  // Ensure Playwright Chromium is available
  try {
    const { chromium } = require("playwright");
    const browser = await chromium.launch({ headless: true });
    await browser.close();
  } catch (err) {
    console.log("🌐 Installing Chromium browser for Playwright...");
    execSync("npx playwright install chromium", { stdio: "inherit" });
  }

  console.log("✅ Dependencies & browser are ready!\n");
}

// ─── Step 2: Prompt for User Credentials ────────────────────
async function ensureCredentials() {
  console.log("⚡ Built by Utkarsh\n");

  const currentEnv = readEnv();
  let email = currentEnv.LMS_EMAIL;
  let password = currentEnv.LMS_PASSWORD;

  if (email && password && !email.includes("your-email")) {
    console.log(`👤 Found saved account: ${email}`);
    const choice = await askQuestion("   Use this account? (Y/n): ");
    if (choice.toLowerCase() === "n") {
      email = null;
      password = null;
    }
  } else {
    email = null;
    password = null;
  }

  if (!email || !password) {
    console.log("⚡ Built by Utkarsh");
    console.log("🔑 Please enter your BMSCE LMS login details:");
    console.log("   (Your password will be masked with * and saved locally in .env)\n");

    email = await askQuestion("📧 BMSCE Email: ");
    while (!email || !email.includes("@")) {
      console.log("   ⚠️ Please enter a valid email address!");
      email = await askQuestion("📧 BMSCE Email: ");
    }

    password = await askQuestion("🔒 LMS Password: ", true);
    while (!password) {
      console.log("   ⚠️ Password cannot be empty!");
      password = await askQuestion("🔒 LMS Password: ", true);
    }

    writeEnv({ LMS_EMAIL: email, LMS_PASSWORD: password });
    // Clear old cookies to ensure fresh login
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
    // Clear old results for the new user
    if (fs.existsSync(RESULTS_FILE)) fs.unlinkSync(RESULTS_FILE);

    console.log("✅ Credentials saved!\n");
  }

  // Inject into process.env
  process.env.LMS_EMAIL = email;
  process.env.LMS_PASSWORD = password;
}

// ─── Main Execution Pipeline ────────────────────────────────
async function main() {
  console.clear();
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         🚀 BMSCE LMS COMPETITIVE CODING AUTO-SOLVER        ║");
  console.log("║        Automated solver with 42 Verified 100% Solutions    ║");
  console.log("║                    ⚡ Built by Utkarsh                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  await ensureSetup();
  await ensureCredentials();

  // Verify solutions.json exists
  if (!fs.existsSync(SOLUTIONS_JSON)) {
    console.error("❌ Error: solutions.json not found! Re-generating from source...");
    require("./build-solutions-json").buildSolutionsJson();
  }

  const { solveProblem } = require("./solve");
  const problemsData = JSON.parse(fs.readFileSync(path.join(__dirname, "problems.json"), "utf-8"));
  const problems = problemsData.problems;

  console.log(`\n📋 Loaded ${problems.length} problems with pre-verified solutions.`);
  console.log(`⚡ Zero Groq API tokens needed — everything runs from local cache!`);
  console.log(`🏁 Starting automatic submission process...\n`);

  let existingResults = [];
  if (fs.existsSync(RESULTS_FILE)) {
    try {
      existingResults = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));
    } catch (e) {
      existingResults = [];
    }
  }

  let passed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < problems.length; i++) {
    const prob = problems[i];
    const alreadyAccepted = existingResults.find(
      (r) => (r.index === i || r.url === prob.href) && r.result === "Accepted"
    );

    const padName = prob.name.padEnd(38, ".");
    const progressTag = `[${String(i + 1).padStart(2, " ")}/${problems.length}]`;

    if (alreadyAccepted) {
      console.log(`${progressTag} ${padName} [ ⏩ ALREADY SOLVED ]`);
      skipped++;
      passed++;
      continue;
    }

    process.stdout.write(`${progressTag} ${padName} [ Submitting... ]\r`);

    try {
      const res = await solveProblem(prob.href, i);
      if (res.success && res.result === "Accepted") {
        passed++;
        console.log(`${progressTag} ${padName} [ ✅ ACCEPTED ]`);
      } else {
        failed++;
        console.log(`${progressTag} ${padName} [ ⚠️ ${res.result || res.error || "Failed"} ]`);
      }
    } catch (err) {
      failed++;
      console.log(`${progressTag} ${padName} [ ❌ ERROR ]`);
    }

    // Small delay between problems to be polite to the LMS server
    if (i < problems.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log("\n════════════════════════════════════════════════════════════");
  console.log("                   🎉 SUBMISSION COMPLETED! 🎉");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`  Total Problems Processed: ${problems.length}`);
  console.log(`  Successfully Accepted:    ${passed}`);
  console.log(`  Previously Solved:        ${skipped}`);
  console.log(`  Needs Review / Failed:    ${failed}`);
  console.log(`  Success Rate:             ${((passed / problems.length) * 100).toFixed(1)}%`);
  console.log("════════════════════════════════════════════════════════════\n");
  console.log("💡 Log in to https://lms.bmsce.in/dashboard to see your updated leaderboard rank & XP!\n");
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
