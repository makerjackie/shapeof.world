#!/usr/bin/env node
// Frame-accurate render: static server → headless Chromium → PNG pipe → ffmpeg.
import http from "node:http";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const args = process.argv.slice(2);
const filmArg = args[0] ?? "deepinfer-open-source";
const filmDir = join(root, "cuts", filmArg);
if (!existsSync(filmDir)) throw new Error(`No such film: ${filmDir}`);

const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const from = Number(opt("from", 0));
const to = Number(opt("to", 0));
const out = resolve(opt("out", join(filmDir, "output", "video-silent.mp4")));
const quality = opt("crf", "16");
const fpsOverride = Number(opt("fps", 0));
const vw = Number(opt("w", 1080));
const vh = Number(opt("h", 1920));

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".wav": "audio/wav", ".mp4": "video/mp4" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const path = normalize(join(root, url));
  if (!path.startsWith(root) || !existsSync(path) || statSync(path).isDirectory()) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream", "cache-control": "no-store" });
  createReadStream(path).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
page.on("console", (m) => { if (m.type() === "error") console.error("PAGE:", m.text()); });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
await page.goto(`http://127.0.0.1:${port}/cuts/${filmArg}/index.html`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__film?.duration > 0);
await page.evaluate(() => window.__film.ready);
await page.evaluate(() => document.fonts.ready);
const meta = await page.evaluate(() => ({ duration: window.__film.duration, fps: window.__film.fps, width: window.__film.width, height: window.__film.height }));
const fps = fpsOverride || meta.fps;
const start = Math.max(0, from);
const end = to > 0 ? Math.min(meta.duration, to) : meta.duration;
const frameCount = Math.max(1, Math.round((end - start) * fps));
console.log(`film=${filmArg} ${meta.width}x${meta.height} ${fps}fps ${start.toFixed(2)}→${end.toFixed(2)} (${frameCount} frames)`);

mkdirSync(dirname(out), { recursive: true });
const ff = spawn("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
  "-c:v", "libx264", "-preset", "medium", "-crf", quality,
  "-pix_fmt", "yuv420p", "-r", String(fps), "-movflags", "+faststart", out,
], { stdio: ["pipe", "inherit", "inherit"] });

const write = (buf) => new Promise((res, rej) => {
  const ok = ff.stdin.write(buf, (err) => (err ? rej(err) : res()));
  if (!ok) ff.stdin.once("drain", res);
});

const started = Date.now();
for (let i = 0; i < frameCount; i++) {
  const t = start + i / fps;
  await page.evaluate((tt) => window.__film.seek(tt), t);
  const buf = await page.screenshot({ type: "png", animations: "disabled", caret: "hide" });
  await write(buf);
  if (i % 30 === 0 || i === frameCount - 1) {
    const pct = ((i + 1) / frameCount * 100).toFixed(1);
    const secs = ((Date.now() - started) / 1000).toFixed(0);
    process.stdout.write(`\r${pct}%  frame ${i + 1}/${frameCount}  ${secs}s   `);
  }
}
ff.stdin.end();
await new Promise((res, rej) => ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`)))));
await browser.close();
server.close();
console.log(`\nWrote ${out}`);
