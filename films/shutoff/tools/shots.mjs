// Stills at film times (seconds) through one GPU browser: node tools/shots.mjs <outDir> <t...>   SCALE=0.5 default
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
const [outDir, ...times] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const chromiumOptions = { gl: "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { chromiumOptions, browserExecutable: path.resolve("tools/chrome.sh") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "Film", chromiumOptions, puppeteerInstance: browser, timeoutInMilliseconds: 240000 });
for (const s of times.map(Number)) {
  const f = Math.round((s + Number(process.env.PRE ?? 6.5)) * 30); // story seconds → frames (pre-roll first)
  const t0 = Date.now();
  const out = path.join(outDir, `f${String(f).padStart(5, "0")}.jpg`);
  await renderStill({ serveUrl, composition, frame: f, output: out, imageFormat: "jpeg", jpegQuality: 88, scale: Number(process.env.SCALE ?? 0.5), chromiumOptions, puppeteerInstance: browser, timeoutInMilliseconds: 240000 });
  console.log("t", s, Date.now() - t0, "ms");
}
await browser.close({ silent: true });
