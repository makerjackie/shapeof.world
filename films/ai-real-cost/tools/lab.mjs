// Renders stills through the GPU with one shared browser: node tools/lab.mjs <outDir> <frame...>
// COMP=<id> picks the composition (default Lab), SCALE=<n> the output scale (default 1).
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const [outDir, ...frames] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const chromiumOptions = { gl: "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { chromiumOptions });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "Lab", chromiumOptions, puppeteerInstance: browser, timeoutInMilliseconds: 180000 });
for (const f of frames.map(Number)) {
  const t = Date.now();
  const out = path.join(outDir, `f${String(f).padStart(5, "0")}.jpg`);
  if (fs.existsSync(out)) continue;
  await renderStill({ serveUrl, composition, frame: f, output: out, imageFormat: "jpeg", jpegQuality: 88, scale: Number(process.env.SCALE ?? 1), chromiumOptions, puppeteerInstance: browser, timeoutInMilliseconds: 180000 });
  console.log("rendered", f, Date.now() - t, "ms");
}
await browser.close({ silent: true });
