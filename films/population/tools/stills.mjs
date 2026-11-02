// Review stills by bar: node tools/stills.mjs <outDir> <bar> [bar...]   (writes b<bar>.jpg at half size)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const [outDir, ...bars] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const BAR = 240 / 130;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "Film", timeoutInMilliseconds: 180000 });
for (const b of bars.map(Number)) {
  const f = Math.round(b * BAR * 30);
  await renderStill({ serveUrl, composition, frame: f, output: path.join(outDir, `b${String(b.toFixed(2)).padStart(6, "0")}.jpg`), imageFormat: "jpeg", scale: Number(process.env.SCALE ?? 0.4), timeoutInMilliseconds: 180000 });
}
console.log("ok", bars.length);
