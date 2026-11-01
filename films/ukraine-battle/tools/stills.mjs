// Render several stills of one composition with one bundle: node tools/stills.mjs <Comp> <outdir> <f1,f2,...> [propsJSON]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [comp, outdir, frames, props = "{}"] = process.argv.slice(2);
const chromiumOptions = { gl: "angle" };
const browserExecutable = path.resolve("tools/chrome.sh");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const inputProps = JSON.parse(props);
const composition = await selectComposition({ serveUrl, id: comp, chromiumOptions, browserExecutable, inputProps, timeoutInMilliseconds: 240000 });
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ serveUrl, composition, frame: f, output: path.join(outdir, `${comp}_${f}.jpg`), imageFormat: "jpeg", jpegQuality: 90, chromiumOptions, browserExecutable, inputProps, timeoutInMilliseconds: 240000 });
  console.log(f, Date.now() - t0, "ms");
}
