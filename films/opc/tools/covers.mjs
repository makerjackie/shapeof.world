// Renders the covers: node tools/covers.mjs -> out/covers/cover-16x9.jpg, cover-3x4.jpg, cover-4x3.jpg
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = path.resolve("tools/chrome.sh");
for (const id of ["cover-16x9", "cover-3x4", "cover-4x3"]) {
  const composition = await selectComposition({ serveUrl, id, chromiumOptions: { gl: "angle" }, browserExecutable });
  await renderStill({ serveUrl, composition, output: path.join("out", "covers", `${id}.jpg`), imageFormat: "jpeg", jpegQuality: 92, chromiumOptions: { gl: "angle" }, browserExecutable });
  console.log("rendered", id);
}
