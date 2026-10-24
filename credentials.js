// Interactive LMS login prompt: asked on every run, kept only in memory (never written to .env)
const readline = require("readline");

function askLine(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

// Password input masked with * (raw TTY mode)
function askHidden(query) {
  return new Promise((resolve) => {
    process.stdout.write(query);
    let input = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\n" || ch === "\r" || ch === "\u0004") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(input);
          return;
        } else if (ch === "\u0003") {
          // Ctrl+C
          process.stdout.write("\n");
          process.exit(130);
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
      }
    };

    process.stdin.on("data", onData);
  });
}

// Piped stdin (e.g. `printf "email\npassword\n" | node solve.js --all`): read both lines from one reader
async function readPipedCredentials() {
  const rl = readline.createInterface({ input: process.stdin });
  const lines = rl[Symbol.asyncIterator]();
  const next = async (query) => {
    process.stdout.write(query);
    const { value } = await lines.next();
    process.stdout.write("\n");
    return (value || "").trim();
  };
  const email = await next("📧 BMSCE Email: ");
  const password = await next("🔒 LMS Password: ");
  rl.close();
  return { email, password };
}

async function promptCredentials() {
  console.log("🔑 Enter your BMSCE LMS login details (asked every run, not saved):");

  if (!process.stdin.isTTY) {
    const creds = await readPipedCredentials();
    if (!creds.email.includes("@") || !creds.password) {
      throw new Error("Expected an email and a password on stdin.");
    }
    return creds;
  }

  let email = await askLine("📧 BMSCE Email: ");
  while (!email || !email.includes("@")) {
    console.log("   ⚠️ Please enter a valid email address!");
    email = await askLine("📧 BMSCE Email: ");
  }

  let password = await askHidden("🔒 LMS Password: ");
  while (!password) {
    console.log("   ⚠️ Password cannot be empty!");
    password = await askHidden("🔒 LMS Password: ");
  }

  return { email, password };
}

// Email only, used purely as a label to track per-account progress (no password,
// no login). For the Google / manual login path, where we never handle a password.
async function promptEmail(query = "📧 Your BMSCE email (only to track your progress, not to log in): ") {
  if (!process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin });
    const { value } = await rl[Symbol.asyncIterator]().next();
    rl.close();
    return (value || "").trim().toLowerCase();
  }
  let email = await askLine(query);
  while (!email || !email.includes("@")) {
    console.log("   ⚠️ Please enter a valid email address!");
    email = await askLine(query);
  }
  return email.toLowerCase();
}

module.exports = { promptCredentials, promptEmail };
