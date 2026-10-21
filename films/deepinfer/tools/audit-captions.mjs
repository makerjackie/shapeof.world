import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";
const root = resolve(import.meta.dirname, "..");
const film = process.argv[2] ?? "deepinfer-open-source";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const p = normalize(join(root, u));
  if (!p.startsWith(root) || !existsSync(p) || statSync(p).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": MIME[extname(p)] ?? "application/octet-stream" });
  createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`http://127.0.0.1:${server.address().port}/cuts/${film}/index.html`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__film?.cues);
const cues = await page.evaluate(() => window.__film.cues);
await b.close(); server.close();
const units = (s) => s.replace(/\s+/g, "").replace(/[0-9.,%+\-−–≈]+/g, "#").length;
let bad = 0, total = 0;
for (const [id, list] of Object.entries(cues)) {
  for (const c of list) {
    const dur = c.end - c.start - 0.1;
    const need = Math.max(1.2, 0.5 + 0.12 * units(c.text));
    total++;
    if (dur < need - 0.05) { bad++; console.log(`${id.padEnd(8)} ${c.start.toFixed(2)}  ${dur.toFixed(2)}s / ${need.toFixed(2)}s  ${c.text}`); }
  }
}
console.log(`${bad} short of ${total} cues`);
