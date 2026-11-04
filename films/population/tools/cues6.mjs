// Dumps a Film6 film's sound cues to out/cues6_<film>.json for tools/sfx_film6.py: node tools/cues6.mjs china|world
import { buildSync } from "esbuild";
import fs from "node:fs";
import path from "node:path";
const film = process.argv[2] || "china";
fs.mkdirSync("out", { recursive: true });
const entry = fs.existsSync(`src/v6/${film}.ts`) ? `src/v6/${film}.ts` : `src/v6/${film}6.ts`;
buildSync({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", outfile: `out/${film}6.mjs`, loader: { ".json": "json" }, logLevel: "error" });
const m = await import(path.resolve(`out/${film}6.mjs`) + "?v=" + Date.now());
const S = m.CHINA || m.WORLD;
const cues = {
  edl: S.music.edl,
  musicSrc: S.musicSrc ?? "ref_full.wav",
  dur: S.music.dur,
  events: S.events.map((e) => ({ t: e.t0, d: e.t1 - e.t0, k: e.k, big: !!e.big, st: e.st || null, y: e.y })),
  cold: S.cold.crashes.map((c) => c.at),
  coldLines: S.cold.lines.map((l) => l.t0),
  coldTones: S.cold.lines.map((l) => l.tone ?? "white"),
  rewind: S.cold.rewind,
  noRiser: !!S.noRiser,
  hush: (S.hush || []).map(([a, b]) => [S.music.F(a), S.music.F(b)]),
  solemnFrom: S.solemnFrom ?? null,
  rests: (S.rests || []).map((y) => S.events.find((e) => e.y === y).t0),
  body: S.body,
  ending: S.ending.lines.map((l) => ({ t: l.t0, brush: !!l.brush })),
  card: S.ending.card,
  reveals: (m.REVEALS || []).flatMap((r) => [r.num > r.title + 0.01 ? { t: r.num, k: r.k, big: r.big, y: r.y ?? 0, w: "num" } : null, r.sub > r.title + 0.01 && r.sub > r.num + 0.01 ? { t: r.sub, k: r.k, big: r.big, y: r.y ?? 0, w: "sub" } : null]).filter(Boolean),
};
fs.writeFileSync(`out/cues6_${film}.json`, JSON.stringify(cues));
console.log("cues6", film, "events", cues.events.length, "dur", cues.dur);
