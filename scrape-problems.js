// Scrape all problem slugs from the competitive coding course page
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const SESSION_FILE = path.join(__dirname, "session", "cookies.json");

async function scrapeProblems() {
  const cookies = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  await context.addCookies(cookies);
  const page = await context.newPage();

  console.log("Navigating to course page...");
  await page.goto(
    "https://lms.bmsce.in/courses/competitive-coding/competitive",
    { waitUntil: "networkidle", timeout: 30000 }
  );

  // Get all problem links with their "Solve" buttons
  const problems = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/problems/"]');
    const results = [];
    const seen = new Set();
    for (const link of links) {
      const href = link.getAttribute("href");
      if (href && href.includes("/problems/") && !seen.has(href)) {
        seen.add(href);
        const text = link.textContent.trim();
        // Only include actual problem links (with Solve button nearby)
        if (text && text !== "Solve" && !href.includes("/solve")) {
          results.push({ name: text, href });
        }
      }
    }
    return results;
  });

  // Also get Solve button hrefs
  const solveLinks = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/problems/"]');
    const results = [];
    for (const link of links) {
      const href = link.getAttribute("href");
      const text = link.textContent.trim();
      if (text === "Solve" && href) {
        results.push(href);
      }
    }
    return results;
  });

  console.log(`Found ${problems.length} problems:`);
  problems.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} -> ${p.href}`);
  });

  console.log(`\nFound ${solveLinks.length} Solve links`);

  // Save to file
  fs.writeFileSync(
    path.join(__dirname, "problems.json"),
    JSON.stringify({ problems, solveLinks }, null, 2)
  );
  console.log("Saved to problems.json");

  await browser.close();
}

scrapeProblems().catch(console.error);
