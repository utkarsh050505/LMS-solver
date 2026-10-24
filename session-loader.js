// Reusable module: load a Playwright browser context with saved session cookies
// Usage:
//   const { getAuthenticatedPage, closeBrowser } = require("./session-loader");
//   const page = await getAuthenticatedPage();
//   // ... do stuff with `page` ...
//   await closeBrowser();

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SESSION_FILE = path.join(__dirname, "session", "cookies.json");

let _browser = null;
let _context = null;

/**
 * Returns a Playwright Page with saved LMS session cookies loaded.
 * If no session file exists, throws an error prompting you to run login.js first.
 */
async function getAuthenticatedPage(options = {}) {
  const { headless = true } = options;

  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error(
      "No saved session found. Run `node login.js` first to create one."
    );
  }

  const cookies = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));

  _browser = await chromium.launch({ headless });
  _context = await _browser.newContext({
    bypassCSP: true,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  await _context.addCookies(cookies);

  const page = await _context.newPage();
  return page;
}

/**
 * Closes the browser and cleans up.
 */
async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
    _context = null;
  }
}

module.exports = { getAuthenticatedPage, closeBrowser };
