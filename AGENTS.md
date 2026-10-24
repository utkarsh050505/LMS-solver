# BMSCE LMS Auto-Solver - Agent Execution Guide

Please refer to [agent.md](file:///a:/LMS-ki-mkc/agent.md) for the full execution guide.

### Quick Start
```bash
# Test single problem
npm run solve

# Solve all problems (auto-resumes and skips already accepted)
npm run solve:all

# New problems dropped: re-scrape the course, then solve all
npm run solve:new

# Specific problem (e.g. problem 2)
node solve.js 2
```
