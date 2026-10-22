// Renders review stills: node tools/stills.mjs <outDir> <frame> [frame...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const [outDir, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "Film" });
for (const f of frames.map(Number)) {
  await renderStill({ serveUrl, composition, frame: f, output: path.join(outDir, `f${String(f).padStart(5, "0")}.jpg`), imageFormat: "jpeg", scale: Number(process.env.SCALE ?? 0.5) });
  console.log("rendered", f);
}
