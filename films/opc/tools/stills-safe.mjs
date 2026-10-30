// Renders review stills, reporting (not stopping on) a failing frame: node tools/stills-safe.mjs <outDir> <frame>...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const [outDir, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = path.resolve("tools/chrome.sh");
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "Film", chromiumOptions: { gl: "angle" }, browserExecutable });
for (const f of frames.map(Number)) {
  try {
    await renderStill({ serveUrl, composition, frame: f, output: path.join(outDir, `f${String(f).padStart(5, "0")}.jpg`), imageFormat: "jpeg", jpegQuality: 88, scale: Number(process.env.SCALE ?? 0.5), chromiumOptions: { gl: "angle" }, browserExecutable, timeoutInMilliseconds: 120000 });
  } catch (e) {
    console.log("FAILED", f, String(e.message ?? e).slice(0, 400));
  }
}
console.log("done");
