// Renders review stills: node tools/stills.mjs <outDir> <frame> [frame...]   (COMP=Lab for look-dev shots)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const [outDir, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "Film", chromiumOptions: { gl: "angle" } });
for (const f of frames.map(Number)) {
  const t0 = Date.now();
  await renderStill({
    serveUrl,
    composition,
    frame: f,
    output: path.join(outDir, `f${String(f).padStart(5, "0")}.jpg`),
    imageFormat: "jpeg",
    jpegQuality: 88,
    scale: Number(process.env.SCALE ?? 0.5),
    chromiumOptions: { gl: "angle" },
    timeoutInMilliseconds: 120000,
  });
  console.log("rendered", f, `${Date.now() - t0} ms`);
}
