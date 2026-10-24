// Compiles all problem solutions and results into a single solutions.json
const fs = require("fs");
const path = require("path");
const { slugOf } = require("./problem-store");

const PROBLEMS_FILE = path.join(__dirname, "problems.json");
const RESULTS_FILE = path.join(__dirname, "results.json");
const SOLUTIONS_DIR = path.join(__dirname, "solutions");
const OUTPUT_FILE = path.join(__dirname, "solutions.json");

function buildSolutionsJson() {
  const problemsData = JSON.parse(fs.readFileSync(PROBLEMS_FILE, "utf-8"));
  const problems = problemsData.problems;

  let results = [];
  if (fs.existsSync(RESULTS_FILE)) {
    try {
      results = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));
    } catch (e) {
      results = [];
    }
  }

  // Keyed by slug: result indices go stale when problems are added to the course.
  // Results can come from several accounts; any Accepted verifies the solution.
  const resultsMap = {};
  results.forEach((r) => {
    const slug = slugOf(r.url);
    if (!resultsMap[slug] || r.result === "Accepted") resultsMap[slug] = r;
  });

  const allSolutions = [];

  for (let i = 0; i < problems.length; i++) {
    const prob = problems[i];
    const solutionPath = path.join(SOLUTIONS_DIR, `${i}-solution.py`);
    let code = "";
    if (fs.existsSync(solutionPath)) {
      code = fs.readFileSync(solutionPath, "utf-8");
    }

    const res = resultsMap[slugOf(prob.href)] || {};

    allSolutions.push({
      id: i + 1,
      index: i,
      name: prob.name.trim(),
      href: prob.href,
      verdict: res.result || "Unknown",
      language: "python",
      code: code,
      solutionFile: `solutions/${i}-solution.py`,
      timestamp: res.timestamp || new Date().toISOString(),
    });
  }

  const acceptedCount = allSolutions.filter((s) => s.verdict === "Accepted").length;

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalProblems: allSolutions.length,
      acceptedCount: acceptedCount,
      successRate: `${((acceptedCount / allSolutions.length) * 100).toFixed(1)}%`,
    },
    solutions: allSolutions,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`✅ solutions.json created with ${allSolutions.length} problems (${acceptedCount} Accepted)!`);
  return output;
}

if (require.main === module) {
  buildSolutionsJson();
}

module.exports = { buildSolutionsJson };
