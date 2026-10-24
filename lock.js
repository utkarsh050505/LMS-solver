// Single-run lock: this tool keeps ONE shared login in session/cookies.json and
// ONE results.json, so two solve runs in the same folder would clobber each
// other (one person's login overwrites the other's mid-run). This refuses a
// second concurrent run and tells the user to run people one at a time.
const fs = require("fs");
const path = require("path");

const LOCK_FILE = path.join(__dirname, "session", ".solve.lock");
const STALE_MS = 90 * 60 * 1000; // a full 70-run is ~20 min; 90 min means "crashed, not running"

function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    let info = {};
    try {
      info = JSON.parse(fs.readFileSync(LOCK_FILE, "utf-8"));
    } catch (e) {}
    if (info.time && Date.now() - info.time < STALE_MS) {
      const started = new Date(info.time).toLocaleTimeString();
      throw new Error(
        `Another solve run is already active in this folder (started ${started}).\n` +
          "   Run people ONE AT A TIME — wait for the current run to say 'Finished',\n" +
          "   then do the next person. To solve several people at once, give each\n" +
          "   person their own copy of the folder (a separate `git clone`)."
      );
    }
  }

  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, time: Date.now() }));

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch (e) {}
  };
  process.on("exit", release);
  process.on("SIGINT", () => {
    release();
    process.exit(130);
  });
  return release;
}

module.exports = { acquireLock, LOCK_FILE };
