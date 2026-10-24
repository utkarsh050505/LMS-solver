// Shared CLI banner — author attribution shown on every run.
// Built by Utkarsh · https://github.com/utkarsh050505
const AUTHOR = "Utkarsh";
const GITHUB = "https://github.com/utkarsh050505";
const WIDTH = 62;

// Pad an (emoji-free) line to the box width so the right border lines up
function row(text) {
  const t = text.length > WIDTH ? text.slice(0, WIDTH) : text;
  return `║ ${t}${" ".repeat(WIDTH - t.length)} ║`;
}

function printBanner(subtitle = "") {
  const bar = "═".repeat(WIDTH + 2);
  console.log(`╔${bar}╗`);
  console.log(row("BMSCE LMS Competitive Coding Auto-Solver"));
  console.log(row(`Built by ${AUTHOR}  ·  ${GITHUB}`));
  console.log(row("Don't vibe code — hire me."));
  console.log(`╚${bar}╝`);
  if (subtitle) console.log(subtitle);
  console.log("");
}

module.exports = { printBanner, AUTHOR, GITHUB };
