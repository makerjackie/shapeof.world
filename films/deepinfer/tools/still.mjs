#!/usr/bin/env node
// Render still frames at chosen times for review.
import http from "node:http";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const args = process.argv.slice(2);
const filmArg = args[0] ?? "deepinfer-open-source";
const filmDir = join(root, "cuts", filmArg);
const atArg = args.includes("--at") ? args[args.indexOf("--at") + 1] : "";
const times = atArg ? atArg.split(",").map(Number) : [];
const cover = args.includes("--cover");
const wArg = args.includes("--w") ? Number(args[args.indexOf("--w") + 1]) : 1080;
const hArg = args.includes("--h") ? Number(args[args.indexOf("--h") + 1]) : 1920;

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const path = normalize(join(root, url));
  if (!path.startsWith(root) || !existsSync(path) || statSync(path).isDirectory()) return res.writeHead(404).end("not found");
  res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream", "cache-control": "no-store" });
  createReadStream(path).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: wArg, height: hArg }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.error("PAGE:", m.text()); });
await page.goto(`http://127.0.0.1:${port}/cuts/${filmArg}/index.html${cover ? "?cover=1" : ""}`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__film?.duration > 0);
await page.evaluate(() => window.__film.ready);
await page.evaluate(() => document.fonts.ready);
const meta = await page.evaluate(() => ({ duration: window.__film.duration, fps: window.__film.fps }));
const list = times.length ? times : [0.5, 3, 7, 12, 21, 29, 37, 46, 55, 63, 70, 78, 88, meta.duration - 0.1];
const dir = join(filmDir, "output", "stills");
mkdirSync(dir, { recursive: true });
for (const t of list) {
  const tt = Math.min(meta.duration - 0.02, Math.max(0, t));
  await page.evaluate((x) => window.__film.seek(x), tt);
  const name = `${cover ? "cover-" : "t"}${String(tt.toFixed(2)).padStart(6, "0")}.png`;
  await page.screenshot({ path: join(dir, name), animations: "disabled" });
  console.log(`${name}  ${tt.toFixed(2)}s`);
}
await browser.close();
server.close();
console.log(dir);
