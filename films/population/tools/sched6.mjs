// Prints a Film6 schedule: node tools/sched6.mjs china|world
import { buildSync } from "esbuild";
import fs from "node:fs";
import path from "node:path";
const film = process.argv[2] || "china";
fs.mkdirSync("out", { recursive: true });
const ent = `src/v6/${film}6.ts`;
buildSync({ entryPoints: [ent], bundle: true, platform: "node", format: "esm", outfile: `out/${film}6.mjs`, loader: { ".json": "json" }, logLevel: "error" });
const m = await import(path.resolve(`out/${film}6.mjs`) + "?v=" + Date.now());
const S = m.CHINA || m.WORLD;
const ev = S.events;
let lines = [];
for (const e of ev) {
  const d = e.t1 - e.t0;
  lines.push(`${e.t0.toFixed(2).padStart(7)} ${String(e.b).padStart(2)}b ${d.toFixed(2)}s  ${String(e.y).padStart(6)} ${e.k.padEnd(6)} ${e.anchor !== undefined ? "@" : " "} ${(e.tag || "").slice(0, 18).padEnd(18)} ${e.t} ${e.n || ""}`);
}
console.log(lines.join("\n"));
console.log("events", ev.length, "body", S.body.map((x) => x.toFixed(2)).join("-"), "dur", S.music.dur, "beats/event", (ev.reduce((s, e) => s + e.b, 0) / ev.length).toFixed(2));
const asked = ev.map((e, i) => e.b);
