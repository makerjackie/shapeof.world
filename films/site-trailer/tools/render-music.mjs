// Renders the original score (music/score.js) offline in a Chromium-based browser, then normalises loudness
// with a two-pass linear loudnorm so the sections keep their dynamics.
// Usage: node tools/render-music.mjs  -> music/score-raw.wav, public/score.wav
// Playwright comes from the site's dependencies at the repository root; it drives the headless Chrome that Remotion
// downloads into node_modules/.remotion, so no extra browser is needed. (The system Edge works too, PW_CHANNEL=msedge,
// but Windows runs it in efficiency mode and the render crawls.) ffmpeg is the one bundled with Remotion.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

// A worktree has no root node_modules: PW_FROM points at a checkout that has (default: the main checkout next door).
function loadPlaywright() {
  const roots = [new URL("../../../package.json", import.meta.url).pathname, process.env.PW_FROM, "/Volumes/DevSSD/Projects/code/shapeof.world/package.json"];
  for (const r of roots.filter(Boolean)) {
    try { return createRequire(r)("playwright"); } catch {}
  }
  throw new Error("playwright not found; set PW_FROM=/path/to/checkout/package.json");
}
const { chromium } = loadPlaywright();
const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const raw = path.join(root, "music", "score-raw.wav");
const out = path.join(root, "public", "score.wav");
// npx is a .cmd on Windows and needs a shell there; elsewhere spawn it directly so the filter strings stay intact.
const ffmpeg = (args) => spawnSync("npx", ["remotion", "ffmpeg", ...args], { cwd: root, encoding: "utf8", shell: process.platform === "win32" });

// Remotion downloads its headless Chrome on the first render; fetch it now if this checkout has not rendered yet.
function headlessShell() {
  const dir = path.join(root, "node_modules", ".remotion", "chrome-headless-shell");
  if (!existsSync(dir)) spawnSync("npx", ["remotion", "browser", "ensure"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  const plat = readdirSync(dir)[0]; // win64, mac-arm64, linux64 …
  const exe = process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell";
  return path.join(dir, plat, `chrome-headless-shell-${plat}`, exe);
}

if (!process.argv.includes("--norm-only")) {
  const args = ["--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"];
  const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL, args } : { executablePath: headlessShell(), args });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("pageerror", String(e)));
  await page.setContent("<!doctype html><meta charset=utf-8><title>score</title>");
  await page.addScriptTag({ content: readFileSync(path.join(root, "music", "score.js"), "utf8") });
  await page.waitForFunction(() => window.ready);
  const { b64, ms, seconds } = await page.evaluate(() => window.renderWav());
  await browser.close();
  writeFileSync(raw, Buffer.from(b64, "base64"));
  console.log(`rendered ${seconds.toFixed(1)} s of audio in ${(ms / 1000).toFixed(1)} s`);
}

// STYLE.md: about −12 LUFS, true peak under −1 dBTP after encoding.
const target = "I=-12.5:TP=-1.5:LRA=11"; // the trailer score peaks hot; -12.5 keeps the pass linear
const m = ffmpeg(["-hide_banner", "-i", raw, "-af", `loudnorm=${target}:print_format=json`, "-f", "null", "-"]);
const j = JSON.parse((m.stderr + m.stdout).match(/\{[^{}]*\}/g).pop());
console.log("measured", j.input_i, "LUFS, TP", j.input_tp, "LRA", j.input_lra);
const af = `loudnorm=${target}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true:print_format=summary`;
const r = ffmpeg(["-y", "-hide_banner", "-i", raw, "-af", af, "-ar", "48000", out]);
console.log((r.stderr + r.stdout).split("\n").filter((l) => /Output|Normalization|Input Integrated/.test(l)).join("\n"));
process.exit(r.status ?? 0);
