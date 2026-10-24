// ══════════════════════════════════════════════════════════════════════
// BMSCE LMS Scalable Auto-Solver Runner for Students / Classmates
// ══════════════════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");
const { loadProblems, loadResults, isAccepted, syncToProblems } = require("./problem-store");

const SOLUTIONS_JSON = path.join(__dirname, "solutions.json");

function askLine(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
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

// ─── Main Execution Pipeline ────────────────────────────────
async function main() {
  console.clear();
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         🚀 BMSCE LMS COMPETITIVE CODING AUTO-SOLVER        ║");
  console.log("║        Automated solver with verified cached solutions     ║");
  console.log("║                    ⚡ Built by Utkarsh                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  await ensureSetup();

  // Only one solve run per folder — a second would overwrite the shared login mid-run
  require("./lock").acquireLock();

  // Verify solutions.json exists
  if (!fs.existsSync(SOLUTIONS_JSON)) {
    console.error("❌ Error: solutions.json not found! Re-generating from source...");
    require("./build-solutions-json").buildSolutionsJson();
  }

  // Step 2: Log in (credentials are used once and never saved)
  console.log("⚡ Built by Utkarsh\n");
  const { login, manualLogin, solveProblem, getCachedSolution } = require("./solve");
  console.log("How do you log in to the LMS?");
  console.log("  1) Email + password");
  console.log('  2) "Sign in with Google" (opens a browser; your Google password stays with Google)\n');
  const choice = (await askLine("Enter 1 or 2: ")).trim();
  const account = (choice === "2" ? await manualLogin() : await login()).toLowerCase();

  syncToProblems();
  const problems = loadProblems();
  const uncached = problems.filter((p, i) => !getCachedSolution(i, p.href)).length;

  console.log(`\n📋 Loaded ${problems.length} problems (${problems.length - uncached} with pre-verified solutions).`);
  if (uncached === 0) {
    console.log(`⚡ Zero Groq API tokens needed — everything runs from local cache!`);
  } else {
    console.log(`🌐 ${uncached} problem(s) have no cached solution and will be generated with Groq (needs GROQ_API_KEY).`);
  }
  console.log(`🏁 Starting automatic submission process...\n`);

  const existingResults = loadResults();

  let passed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < problems.length; i++) {
    const prob = problems[i];
    const alreadyAccepted = isAccepted(existingResults, prob.href, account);

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
  console.error("Fatal Error:", err.message || err);
  process.exit(1);
});
