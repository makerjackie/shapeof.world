// Renders review stills: node tools/stills.mjs <outDir> <frame> [frame...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const [outDir, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "Film", timeoutInMilliseconds: 180000 });
for (const f of frames.map(Number)) {
  await renderStill({ serveUrl, composition, frame: f, output: path.join(outDir, `f${String(f).padStart(5, "0")}.jpg`), imageFormat: "jpeg", scale: 0.5, timeoutInMilliseconds: 180000 });
  console.log("rendered", f);
}
// the bundle is ~550 MB in the temp folder; remove it so review runs do not fill the disk
fs.rmSync(serveUrl, { recursive: true, force: true });
