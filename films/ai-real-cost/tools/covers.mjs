// Renders the release covers to out/covers/cover-<A|B>-<4x3|16x9>.jpg (and .webp via tools/webp.py).
import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill } from "@remotion/renderer";
import path from "node:path";

const outDir = process.argv[2] ?? "out/covers";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const comps = (await getCompositions(serveUrl)).filter((c) => c.id.startsWith("cover-"));
for (const composition of comps) {
  await renderStill({ serveUrl, composition, output: path.join(outDir, `${composition.id}.jpg`), imageFormat: "jpeg", jpegQuality: 90 });
  console.log("rendered", composition.id);
}
