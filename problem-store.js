// Shared bookkeeping for problems.json / results.json / solutions.json
// Problems are identified by their URL slug, never by list position: when new
// problems are added to the course the list order shifts, and index-based
// matching would skip new problems or submit another problem's code.

const fs = require("fs");
const path = require("path");

const PROBLEMS_FILE = path.join(__dirname, "problems.json");
const RESULTS_FILE = path.join(__dirname, "results.json");
const SOLUTIONS_JSON_FILE = path.join(__dirname, "solutions.json");
const SOLUTIONS_DIR = path.join(__dirname, "solutions");

// "/problems/foo/solve?courseId=..." -> "/problems/foo"
function slugOf(href) {
  return (href || "").split("?")[0].replace(/\/solve\/?$/, "").replace(/\/+$/, "");
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (e) {
    return fallback;
  }
}

function loadProblems() {
  return readJson(PROBLEMS_FILE, { problems: [] }).problems || [];
}

function loadResults() {
  const results = readJson(RESULTS_FILE, []);
  return Array.isArray(results) ? results : [];
}

// Results are per LMS account; entries without an account (older runs) match nobody
function isAccepted(results, href, account) {
  const slug = slugOf(href);
  return results.some(
    (r) => slugOf(r.url) === slug && r.result === "Accepted" && r.account && r.account === account
  );
}

function solutionsMetadata(solutions) {
  const accepted = solutions.filter((s) => s.verdict === "Accepted").length;
  return {
    generatedAt: new Date().toISOString(),
    totalProblems: solutions.length,
    acceptedCount: accepted,
    successRate: `${((accepted / (solutions.length || 1)) * 100).toFixed(1)}%`,
  };
}

// Re-index solutions.json, results.json and solutions/<index>-solution.py so
// that <index> always matches the current problems.json order. Solutions for
// problems no longer listed are kept under `archived` in solutions.json.
function syncToProblems() {
  const problems = loadProblems();
  const data = readJson(SOLUTIONS_JSON_FILE, null);
  if (!problems.length || !data || !Array.isArray(data.solutions)) {
    return { synced: false };
  }

  const pool = new Map();
  for (const s of [...(data.archived || []), ...data.solutions]) {
    if (s.href) pool.set(slugOf(s.href), s);
  }
  const indexBySlug = new Map(problems.map((p, i) => [slugOf(p.href), i]));
  const results = loadResults()
    .map((r) => {
      const i = indexBySlug.get(slugOf(r.url));
      // Keep verdicts of unlisted problems (index cleared) in case they reappear
      return i === undefined ? { ...r, index: null } : { ...r, index: i, url: problems[i].href };
    })
    .sort((a, b) => (a.index ?? Infinity) - (b.index ?? Infinity));

  const solutions = [];
  problems.forEach((p, i) => {
    const slug = slugOf(p.href);
    const s = pool.get(slug);
    if (s) {
      solutions.push({
        ...s,
        id: i + 1,
        index: i,
        href: p.href,
        solutionFile: `solutions/${i}-solution.py`,
      });
      pool.delete(slug);
    }
  });
  const archived = [...pool.values()];

  if (!fs.existsSync(SOLUTIONS_DIR)) fs.mkdirSync(SOLUTIONS_DIR, { recursive: true });
  const expected = new Map(
    solutions.filter((s) => s.code).map((s) => [path.basename(s.solutionFile), s.code])
  );
  for (const f of fs.readdirSync(SOLUTIONS_DIR)) {
    if (/^\d+-solution\.py$/.test(f) && !expected.has(f)) fs.unlinkSync(path.join(SOLUTIONS_DIR, f));
  }
  for (const [f, code] of expected) {
    const file = path.join(SOLUTIONS_DIR, f);
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf-8") !== code) {
      fs.writeFileSync(file, code, "utf-8");
    }
  }

  const unchanged =
    JSON.stringify(solutions) === JSON.stringify(data.solutions) &&
    JSON.stringify(archived) === JSON.stringify(data.archived || []);
  if (!unchanged) {
    const output = { metadata: solutionsMetadata(solutions), solutions };
    if (archived.length) output.archived = archived;
    fs.writeFileSync(SOLUTIONS_JSON_FILE, JSON.stringify(output, null, 2), "utf-8");
  }
  if (JSON.stringify(results) !== JSON.stringify(loadResults())) {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), "utf-8");
  }

  return {
    synced: true,
    problems: problems.length,
    cached: solutions.length,
    archived: archived.length,
  };
}

module.exports = {
  PROBLEMS_FILE,
  RESULTS_FILE,
  SOLUTIONS_JSON_FILE,
  SOLUTIONS_DIR,
  slugOf,
  loadProblems,
  loadResults,
  isAccepted,
  solutionsMetadata,
  syncToProblems,
};
