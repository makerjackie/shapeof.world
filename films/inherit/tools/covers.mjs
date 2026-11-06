// Renders the three covers at full size: node tools/covers.mjs <outDir>
//   cover-B-16x9.jpg (B站, YouTube, X) · cover-B-4x3.jpg (B站 4:3, 抖音横屏) · cover-B-3x4.jpg (视频号, 抖音竖, 小红书)
// Variant A (an answer on the cover) was rejected by the author on 2026-11-02 and is kept only as a record.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const [outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
for (const [id, name] of ["B"].flatMap((v) => [[`Cover169${v}`, `${v}-16x9`], [`Cover43${v}`, `${v}-4x3`], [`Cover34${v}`, `${v}-3x4`]])) {
  const composition = await selectComposition({ serveUrl, id, timeoutInMilliseconds: 180000 });
  await renderStill({ serveUrl, composition, frame: 0, output: path.join(outDir, `cover-${name}.jpg`), imageFormat: "jpeg", jpegQuality: 92, timeoutInMilliseconds: 180000 });
  console.log("rendered", name);
}
fs.rmSync(serveUrl, { recursive: true, force: true });
