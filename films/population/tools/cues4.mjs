// Dumps the v3 plan's sound cues to out/cues4.json for tools/sfx_film.py.
import { buildSync } from "esbuild";
import fs from "node:fs";
import path from "node:path";
fs.mkdirSync("out", { recursive: true });
buildSync({ entryPoints: ["src/v3/plan4.ts"], bundle: true, platform: "node", format: "esm", outfile: "out/plan4.mjs", loader: { ".json": "json" }, logLevel: "error" });
const m = await import(path.resolve("out/plan4.mjs") + "?v=" + Date.now());
const cues = { edl: m.EDL, inks: m.INKS, bursts: m.BURSTS, seals: m.SEALS.map((s) => s.t0), heavy: m.SEALS.filter((s) => ["浩劫", "乱世", "大乱", "饥荒"].includes(s.chars)).map((s) => s.t0), rewind: m.REWIND.map((r) => r[0]), winds: m.WINDS, milestones: m.MILESTONES.map((x) => x.t), dur: m.DUR };
fs.writeFileSync("out/cues4.json", JSON.stringify(cues));
console.log("cues4", Object.fromEntries(Object.entries(cues).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])));
