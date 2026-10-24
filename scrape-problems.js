// Scrape all problem slugs from the competitive coding course page
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { login, ensureAuthenticated } = require("./solve");
const { PROBLEMS_FILE, slugOf, loadProblems, syncToProblems } = require("./problem-store");
dotenv.config();

const SESSION_FILE = path.join(__dirname, "session", "cookies.json");
const COURSE_URL = "https://lms.bmsce.in/courses/competitive-coding/competitive";

async function openCoursePage(page) {
  await page.goto(COURSE_URL, { waitUntil: "networkidle", timeout: 45000 });
  if (await ensureAuthenticated(page)) {
    await page.goto(COURSE_URL, { waitUntil: "networkidle", timeout: 45000 });
  }

  // Scroll and expand "load more"-style controls so lazily rendered problems show up
  for (let round = 0; round < 15; round++) {
    const before = await page.$$eval('a[href*="/problems/"]', (els) => els.length);
    await page.mouse.wheel(0, 20000);
    await page.waitForTimeout(700);
    const more = await page.$('button:has-text("Load more"), button:has-text("Show more")');
    if (more) {
      await more.click().catch(() => {});
      await page.waitForLoadState("networkidle").catch(() => {});
      if (!page.url().startsWith(COURSE_URL)) {
        await page.goto(COURSE_URL, { waitUntil: "networkidle", timeout: 45000 });
        break;
      }
    }
    const after = await page.$$eval('a[href*="/problems/"]', (els) => els.length);
    if (!more && after === before) break;
  }
}

async function scrapeProblems() {
  const previous = loadProblems();
  const cookies = fs.existsSync(SESSION_FILE) ? JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8")) : [];
  const browser = await chromium.launch({ headless: process.env.HEADLESS !== "false" });
  const context = await browser.newContext({
    bypassCSP: true,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  await context.addCookies(cookies);
  const page = await context.newPage();

  console.log("Navigating to course page...");
  await openCoursePage(page);

  // Group all links with /problems/ to map each unique problem slug to its clean title and solve href
  const { problems } = await page.evaluate(() => {
    const allLinks = Array.from(document.querySelectorAll('a[href*="/problems/"]'));
    const slugMap = new Map();

    for (const link of allLinks) {
      const href = link.getAttribute("href");
      if (!href) continue;
      const slug = href.split("?")[0].replace("/problems/", "").replace("/solve", "");
      if (!slug) continue;

      if (!slugMap.has(slug)) {
        slugMap.set(slug, {
          slug,
          href: href.replace("/solve", ""),
          texts: [],
        });
      }

      // innerText keeps line breaks between the number, title and difficulty badges
      const text = (link.innerText || link.textContent).trim();
      if (text && text !== "Solve" && text !== "Review" && text !== "Resume" && !text.includes("Just this one")) {
        slugMap.get(slug).texts.push(text);
      }
    }

    const problemList = [];
    const solveList = [];

    for (const [slug, item] of slugMap.entries()) {
      let title = item.texts[0] || slug;
      // Clean up title if it contains numbers like "1.\nTitle"
      const lines = title.split("\n").map((l) => l.trim()).filter(Boolean);
      const cleanTitle = lines.find((l) => !/^\d+\.?$/.test(l) && !/^(Beginner|Intermediate|Advanced|Warm-up|Boss)$/i.test(l)) || lines[0] || slug;

      problemList.push({
        name: cleanTitle,
        href: item.href,
      });
      solveList.push(item.href);
    }

    return { problems: problemList, solveLinks: solveList };
  });

  await browser.close();

  if (!problems.length) {
    throw new Error("No problems found on the course page — problems.json left unchanged.");
  }

  const known = new Set(previous.map((p) => slugOf(p.href)));
  const current = new Set(problems.map((p) => slugOf(p.href)));
  const added = problems.filter((p) => !known.has(slugOf(p.href)));
  const missing = previous.filter((p) => !current.has(slugOf(p.href)));

  // The course page only shows some weeks at a time, so a scrape can miss problems
  // that are still assigned. By default keep every known problem (positions unchanged)
  // and append new ones; --replace makes problems.json exactly what the page shows.
  const replace = process.argv.includes("--replace");
  const merged = replace ? problems : [...previous, ...added];

  console.log(`Found ${problems.length} problems on the page (previously ${previous.length} known):`);
  problems.forEach((p, i) => {
    const tag = known.has(slugOf(p.href)) ? "  " : "🆕";
    console.log(`  ${tag} ${i + 1}. ${p.name} -> ${p.href.split("?")[0]}`);
  });
  if (missing.length) {
    console.log(
      `\n⚠️ ${missing.length} known problem(s) not visible on the page right now ` +
        (replace ? "(dropped because of --replace):" : "(kept — pass --replace to drop them):")
    );
    missing.slice(0, 5).forEach((p) => console.log(`     ${p.name} -> ${p.href.split("?")[0]}`));
    if (missing.length > 5) console.log(`     ...and ${missing.length - 5} more`);
  }
  console.log(`\n${added.length} new problem(s). problems.json now lists ${merged.length} problems.`);

  // Save to file
  fs.writeFileSync(PROBLEMS_FILE, JSON.stringify({ problems: merged, solveLinks: merged.map((p) => p.href) }, null, 2));
  console.log("Saved to problems.json");

  const sync = syncToProblems();
  if (sync.synced) {
    console.log(
      `Re-indexed solutions.json: ${sync.cached}/${sync.problems} problems have cached solutions` +
        (sync.archived ? `, ${sync.archived} archived` : "")
    );
  }
}

if (require.main === module) {
  login()
    .then(scrapeProblems)
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { scrapeProblems };
