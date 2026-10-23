// Reading-time and beat audit for every caption (films/DIRECTOR.md 四 and 六). Run: node tools/audit.mjs
// Reading rule (films/house/tools/reading.mjs): a line ≥ 56 px needs 0.6 s + 0.15 s per unit on screen, never under
// 1.2 s; a number counts as one unit. Beat rule: the first character lands on a beat of the film's grid (±1 frame).
import { build } from "esbuild";
import { need } from "../../house/tools/reading.mjs";

const out = await build({ entryPoints: ["src/captions.ts"], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const mod = await import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
const tb = await build({ stdin: { contents: 'export * from "./src/timing.ts";', resolveDir: process.cwd(), loader: "ts" }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const T = await import("data:text/javascript;base64," + Buffer.from(tb.outputFiles[0].text).toString("base64"));

const onBeat = (s) => {
  const g = s / T.BEAT;
  return Math.abs(g - Math.round(g)) * T.BEAT <= 1 / T.FPS + 1e-6;
};

let bad = 0;
for (const c of mod.CAPTIONS) {
  const have = c.end - c.at;
  const want = need(c.text, c.size ?? 76);
  const okR = have + 1e-6 >= want;
  const okB = onBeat(c.at);
  if (!okR || !okB) bad++;
  console.log(`${okR ? "ok " : "LOW"} ${okB ? "beat" : "OFF "}  ${c.at.toFixed(2).padStart(7)}s  ${have.toFixed(2)}s / ${want.toFixed(2)}s  ${c.text}`);
}
console.log(bad ? `${bad} problem(s)` : "all captions read in time and start on a beat");
process.exit(bad ? 1 : 0);
