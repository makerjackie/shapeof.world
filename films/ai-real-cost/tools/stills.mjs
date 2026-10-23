// Renders review stills at film seconds: node tools/stills.mjs <outDir> <sec> [sec...]  (half resolution)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const [outDir, ...secs] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "Film" });
for (const s of secs.map(Number)) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * 30));
  await renderStill({ serveUrl, composition, frame, output: path.join(outDir, `s${s.toFixed(2).padStart(7, "0")}.jpg`), imageFormat: "jpeg", jpegQuality: 80, scale: Number(process.env.SCALE ?? 0.5) });
}
console.log("STILLS_DONE");
