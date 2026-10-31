// Renders stills through the GPU with one shared browser: node tools/lab.mjs <outDir> <frame...>
// COMP=<id> picks the composition (default Film), SCALE=<n> the output scale (default 0.5).
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const [outDir, ...frames] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const chromiumOptions = { gl: "angle", enableMultiProcessOnLinux: true };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { chromiumOptions });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "Film", chromiumOptions, puppeteerInstance: browser, timeoutInMilliseconds: 240000 });
for (const f of frames.map(Number)) {
  const t = Date.now();
  const out = path.join(outDir, `f${String(f).padStart(5, "0")}.jpg`);
  await renderStill({ serveUrl, composition, frame: f, output: out, imageFormat: "jpeg", jpegQuality: 86, scale: Number(process.env.SCALE ?? 0.5), chromiumOptions, puppeteerInstance: browser, timeoutInMilliseconds: 240000 });
  console.log("rendered", f, Date.now() - t, "ms");
}
await browser.close({ silent: true });
