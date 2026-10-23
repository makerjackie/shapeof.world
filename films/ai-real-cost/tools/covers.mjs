// Renders the release covers to out/covers/cover-<16x9|3x4>.jpg plus the small previews used to check legibility
// (16:9 at 360 px wide, 3:4 at 260 px wide; films/DIRECTOR.md 三).
import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import path from "node:path";

const outDir = process.argv[2] ?? "out/covers";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const comps = (await getCompositions(serveUrl)).filter((c) => c.id.startsWith("cover-"));
for (const composition of comps) {
  const out = path.join(outDir, `${composition.id}.jpg`);
  await renderStill({ serveUrl, composition, output: out, imageFormat: "jpeg", jpegQuality: 92 });
  const w = composition.width > composition.height ? 360 : 260;
  execFileSync("/opt/homebrew/bin/ffmpeg", ["-nostdin", "-loglevel", "error", "-y", "-i", out, "-vf", `scale=${w}:-1`, out.replace(".jpg", `-${w}px.jpg`)]);
  console.log("rendered", composition.id);
}
console.log("COVERS_DONE");
