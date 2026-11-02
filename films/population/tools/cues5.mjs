// Dumps Film5's sound cues (from src/v5/plan5.ts) to out/cues5.json for tools/sfx_film5.py.
import { buildSync } from "esbuild";
import fs from "node:fs";
import path from "node:path";
fs.mkdirSync("out", { recursive: true });
buildSync({ entryPoints: ["src/v5/plan5.ts"], bundle: true, platform: "node", format: "esm", outfile: "out/plan5.mjs", loader: { ".json": "json" }, logLevel: "error" });
const m = await import(path.resolve("out/plan5.mjs") + "?v=" + Date.now());
const F = m.F;
const LAND = F(6.47);
// rushes: where the chart flies past (> 480 px/s on screen for at least 0.25 s)
const rushes = [];
let cur = null;
for (let f = 1; f < Math.round(m.END_T * 30); f++) {
  const t = f / 30;
  const sp = Math.abs(m.CUR(t) - m.CUR(t - 1 / 30)) * 30 * (972 / m.SPAN(t)); // screen pixels per second
  const dir = m.CUR(t) >= m.CUR(t - 1 / 30) ? 1 : -1;
  if (sp > 480) {
    if (!cur) cur = { t0: t, t1: t, peak: sp, dir };
    cur.t1 = t;
    cur.peak = Math.max(cur.peak, sp);
  } else if (cur) {
    if (cur.t1 - cur.t0 >= 0.25) rushes.push(cur);
    cur = null;
  }
}
const rewindT = m.REWIND_MARKS.map(([yr]) => {
  for (let f = Math.round(F(5.58) * 30); f <= Math.round(LAND * 30); f++) if (m.CUR(f / 30) <= yr) return f / 30;
  return LAND;
});
const marks = m.MARKS.flatMap((k) => k.chars.map((_, i) => k.t0 + (k.chars.length === 3 ? i * 0.455 : 0)));
const cues = {
  edl: m.EDL, xfade: m.XFADE, tail: m.TAIL, dur: m.DUR, land: LAND,
  hits: m.HITS, milestones: m.MILESTONES.map((x) => x.t),
  rushes: rushes.filter((r) => !(r.t0 > F(5.5) && r.t1 < LAND + 0.1)), risers: m.RISERS,
  rewind: [F(5.58), LAND], rewindT, marks, arts: m.ARTS.map((a) => a.t0), hook: m.HOOK.t0,
  quotes: m.QUOTES.map((q) => q.t0), winds: m.WINDS, ending: m.ENDING,
};
fs.writeFileSync("out/cues5.json", JSON.stringify(cues));
console.log("cues5", Object.fromEntries(Object.entries(cues).map(([k, v]) => [k, Array.isArray(v) ? v.length : typeof v === "object" ? Object.keys(v).length : v])));
console.log("rushes", rushes.map((r) => `${r.t0.toFixed(2)}-${r.t1.toFixed(2)} ${Math.round(r.peak)}px/s`).join("  "));
