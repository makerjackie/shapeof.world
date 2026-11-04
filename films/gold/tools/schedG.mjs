// Prints the gold film's schedule: node tools/schedG.mjs
import { buildSync } from "esbuild";
import fs from "node:fs";
import path from "node:path";
fs.mkdirSync("out", { recursive: true });
buildSync({ entryPoints: ["src/g/gold.ts"], bundle: true, platform: "node", format: "esm", outfile: "out/goldS.mjs", loader: { ".json": "json" }, logLevel: "error" });
const m = await import(path.resolve("out/goldS.mjs") + "?v=" + Date.now());
const S = m.GOLD;
for (const e of S.events) console.log(`${e.t0.toFixed(2).padStart(7)} ${String(e.b).padStart(2)}b ${(e.t1 - e.t0).toFixed(2)}s ${e.y.toFixed(2).padStart(8)} ${e.k.padEnd(6)} ${e.anchor !== undefined ? "@" : " "} ${(e.tag || "").slice(0, 22).padEnd(22)} ${e.t} ${e.n || ""}`);
console.log("events", S.events.length, "body", S.body.map((x) => x.toFixed(2)).join("-"), "dur", S.music.dur);
