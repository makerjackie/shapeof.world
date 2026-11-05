// Renders stills of the gold film at the given seconds and tiles them into one contact sheet: node tools/stillsG.mjs 3 9 23 ...
import path from "node:path";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
const secs = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: path.resolve("src/indexG.ts") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP || "Gold" });
const outs = [];
for (const s of secs) {
  const out = `out/st_${String(s).replace(".", "_")}.png`;
  await renderStill({ composition, serveUrl, output: out, frame: Math.round(s * 30), timeoutInMilliseconds: 240000 });
  outs.push(out);
}
const cols = Math.min(5, outs.length);
const rows = Math.ceil(outs.length / cols);
const args = ["-y", "-nostdin", "-loglevel", "error"];
for (const o of outs) args.push("-i", o);
const lab = outs.map((_, i) => `[${i}:v]scale=432:768[v${i}]`).join(";");
const pad = [];
for (let i = outs.length; i < cols * rows; i++) pad.push(i);
let f = lab;
let inputs = outs.map((_, i) => `[v${i}]`).join("");
if (pad.length) {
  f += ";" + pad.map((i) => `color=c=black:s=432x768:d=1[v${i}]`).join(";");
  inputs += pad.map((i) => `[v${i}]`).join("");
}
f += `;${inputs}xstack=inputs=${cols * rows}:layout=${Array.from({ length: cols * rows }, (_, i) => `${(i % cols) * 432}_${Math.floor(i / cols) * 768}`).join("|")}[o]`;
execFileSync("ffmpeg", [...args, "-filter_complex", f, "-map", "[o]", "-frames:v", "1", "-q:v", "4", "out/sheet.jpg"]);
console.log("sheet out/sheet.jpg", outs.length);
