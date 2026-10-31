// Flags captions that stay on screen for less time than it takes to read them (~6 Chinese chars/s + 0.6 s).
import fs from "node:fs";
const src = fs.readFileSync("src/film/text.ts", "utf8");
const re = /\{ at: ([\d.]+), out: ([\d.]+), t: "([^"]+)", s: "(\w+)"/g;
let m;
while ((m = re.exec(src))) {
  const [_, at, out, t, s] = m;
  if (s === "who") continue;
  const n = [...t].filter((c) => /[一-鿿0-9A-Za-z%]/.test(c)).length;
  const need = n / 6 + 0.6;
  const have = out - at;
  if (have < need) console.log(`${at.padStart(6)} have ${have.toFixed(1)} need ${need.toFixed(1)}  ${t}`);
}
