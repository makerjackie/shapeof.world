// Dumps every event of src/plan.ts (bars) to out/cues.json for tools/score.py.
import { buildSync } from "esbuild";
import fs from "node:fs";
import path from "node:path";

fs.mkdirSync("out", { recursive: true });
buildSync({ entryPoints: ["src/plan.ts"], bundle: true, platform: "node", format: "esm", outfile: "out/plan.mjs", loader: { ".json": "json" }, logLevel: "error" });
const m = await import(path.resolve("out/plan.mjs"));
fs.writeFileSync("out/cues.json", JSON.stringify(m.ALL_EVENTS.map((e) => ({ k: e.k, at: e.at, out: e.out ?? null, big: e.big ?? false }))));
console.log("cues", m.ALL_EVENTS.length);
