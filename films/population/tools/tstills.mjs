// Review stills by second: COMP=T2 node tools/tstills.mjs <outDir> <sec> [sec...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const [outDir, ...secs] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "T2", timeoutInMilliseconds: 180000 });
let i = 0;
for (const s of secs.map(Number)) {
  await renderStill({ serveUrl, composition, frame: Math.round(s * 30), output: path.join(outDir, `s${String(i++).padStart(2, "0")}.png`), imageFormat: "png", scale: Number(process.env.SCALE ?? 0.5), timeoutInMilliseconds: 180000 });
}
console.log("ok", secs.length);
