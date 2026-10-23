// Reading-time audit (films/DIRECTOR.md 四): after a line finishes typing it must stay at least
// 0.6 s + 0.15 s per character (big lines), never under 1.2 s; rule and character count from
// films/house/tools/reading.mjs. Reads every <Say …/> straight from src/scenes, so there is no table to keep
// in step. Each scene file runs on one music grid (BPM below).
// Usage: node tools/readtime.mjs
import { readFileSync } from "node:fs";
import { need } from "../../house/tools/reading.mjs";

const CPS = 14; // Say types 14 characters a second, spaces included
const LEAVE = 0.25; // the slip starts leaving 0.25 s before `out`
const FILES = { open: 90, doctor: 90, coder: 90, panorama: 90, turn: 90, math: 100.36, finale: 100.36 };

let bad = 0;
for (const [f, bpm] of Object.entries(FILES)) {
  const src = readFileSync(new URL(`../src/scenes/${f}.tsx`, import.meta.url), "utf8");
  const beat = 60 / bpm;
  for (const m of src.matchAll(/<Say\b([\s\S]*?)\/>/g)) {
    const attrs = m[1];
    const at = Number(attrs.match(/\bat=\{([\d.]+)\}/)[1]);
    const out = Number(attrs.match(/\bout=\{([\d.]+)\}/)[1]);
    const size = Number(attrs.match(/\bsize=\{(\d+)\}/)?.[1] ?? 82);
    const lines = attrs.match(/lines=\{(\[[\s\S]*\])\}/)[1];
    const text = [...lines.matchAll(/"([^"]*)"/g)].map((x) => x[1]).join("");
    const typing = Array.from(text).length / CPS;
    const shown = (out - at) * beat - typing - LEAVE;
    const want = need(text, size);
    const ok = shown >= want - 0.02;
    if (!ok) bad++;
    console.log(`${ok ? "  " : "✗ "}${f.padEnd(9)} ${String(at).padStart(5)}–${String(out).padEnd(5)} read ${shown.toFixed(2)} s / need ${want.toFixed(2)} s  ${text}`);
  }
}
console.log(bad ? `\n${bad} line(s) leave too early` : "\nall lines stay long enough");
process.exit(bad ? 1 : 0);
