// BMSCE LMS Headless Login Script
// Uses Playwright to log in and save session cookies for reuse

const { chromium } = require("playwright");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { promptCredentials } = require("./credentials");

dotenv.config();

// ─── Config ────────────────────────────────────────────────
const LMS_URL = "https://lms.bmsce.in";
const LOGIN_URL = `${LMS_URL}/login`;
const DASHBOARD_URL = `${LMS_URL}/dashboard`;
const SESSION_DIR = path.join(__dirname, "session");
const SESSION_FILE = path.join(SESSION_DIR, "cookies.json");
const SCREENSHOT_DIR = path.join(__dirname, "screenshots");

// ─── Helpers ───────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function log(msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${msg}`);
}

// ─── Main ──────────────────────────────────────────────────
async function login() {
  const { email, password } = await promptCredentials();

  ensureDir(SESSION_DIR);
  ensureDir(SCREENSHOT_DIR);

  log("Launching headless browser...");

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== "false", // set HEADLESS=false or use npm run login:debug
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  try {
    // ── Step 1: Navigate to login page ──────────────────────
    log("Navigating to login page...");
    await page.goto(LOGIN_URL, { waitUntil: "networkidle", timeout: 30000 });

    // ── Step 2: Fill in credentials ─────────────────────────
    log(`Filling email: ${email}`);
    await page.fill('input#email', email);

    log("Filling password...");
    await page.fill('input#password', password);

    // ── Step 3: Submit the form ─────────────────────────────
    log("Submitting login form...");
    await page.click('button[type="submit"]');

    // ── Step 4: Wait for navigation after login ─────────────
    // The site is a Next.js SPA, so we wait for the URL to change
    // or for dashboard-specific content to appear.
    log("Waiting for login response...");

    try {
      await page.waitForURL("**/dashboard**", { timeout: 15000 });
      log("✅ Login successful! Redirected to dashboard.");
    } catch {
      // Check if we're still on the login page (wrong creds / error)
      const currentUrl = page.url();
      const pageText = await page.textContent("body");

      if (currentUrl.includes("/login")) {
        // Look for error messages
        const errorEl = await page.$('[role="alert"], .text-destructive, .text-red-500, [data-sonner-toast]');
        if (errorEl) {
          const errorMsg = await errorEl.textContent();
          console.error(`❌ Login failed: ${errorMsg.trim()}`);
        } else {
          console.error("❌ Login failed: Still on login page. Check your credentials.");
        }

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, "login-failed.png"),
          fullPage: true,
        });
        log("Screenshot saved to screenshots/login-failed.png");
        await browser.close();
        process.exit(1);
      }

      // Might have landed on a different page (e.g. onboarding)
      log(`⚠️  Landed on: ${currentUrl}`);
    }

    // ── Step 5: Save session cookies ────────────────────────
    const cookies = await context.cookies();
    fs.writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));
    log(`Session saved to ${SESSION_FILE} (${cookies.length} cookies)`);

    // ── Step 6: Take success screenshot ─────────────────────
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "dashboard.png"),
      fullPage: true,
    });
    log("Dashboard screenshot saved to screenshots/dashboard.png");

    // ── Print summary ───────────────────────────────────────
    const title = await page.title();
    log(`Page title: "${title}"`);
    log("Done! Session cookies can be reused for future automation.");

  } catch (err) {
    console.error("❌ Error during login:", err.message);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "error.png"),
      fullPage: true,
    });
    log("Error screenshot saved to screenshots/error.png");
    process.exit(1);

  } finally {
    await browser.close();
  }
}

if (process.argv.includes("--manual") || process.argv.includes("--google")) {
  // Visible-browser login for "Sign in with Google" users (no password handled here)
  require("./solve")
    .manualLogin()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(`❌ ${e.message}`);
      process.exit(1);
    });
} else {
  login();
}
