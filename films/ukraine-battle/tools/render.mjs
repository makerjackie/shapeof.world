// Full render: node tools/render.mjs out/name.mp4 [concurrency]. Video only (audio is mastered separately).
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, conc = "3"] = process.argv.slice(2);
const chromiumOptions = { gl: "angle" };
const browserExecutable = path.resolve("tools/chrome.sh");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "Film", chromiumOptions, browserExecutable, timeoutInMilliseconds: 240000 });
let last = 0;
await renderMedia({
  serveUrl, composition, codec: "h264", crf: 18, outputLocation: out, muted: true, concurrency: Number(conc),
  chromiumOptions, browserExecutable, imageFormat: "jpeg", jpegQuality: 92, timeoutInMilliseconds: 240000,
  frameRange: process.env.RANGE ? process.env.RANGE.split("-").map(Number) : undefined,
  onProgress: ({ progress }) => { if (progress - last > 0.02) { last = progress; console.log(new Date().toISOString(), (progress * 100).toFixed(1) + "%"); } },
});
console.log("done", out);
