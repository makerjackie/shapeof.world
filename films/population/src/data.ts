// China 1949-2025 (万人) and the UN world table. Built by tools/data.py.
import raw from "./data.json";

export type Row = { y: number; pop: number; b: number; d: number };
export const CN: Row[] = (raw as any).china;
export const Y0 = 1949;
export const Y1 = 2025;
const byYear = new Map(CN.map((r) => [r.y, r]));
export const row = (y: number) => byYear.get(Math.max(Y0, Math.min(Y1, Math.round(y))))!;

// Straight segments between yearly points (x = year).
const seg = (x: number, f: (r: Row) => number) => {
  if (x <= Y0) return f(CN[0]);
  if (x >= Y1) return f(CN[CN.length - 1]);
  const i = Math.floor(x) - Y0;
  const a = CN[i];
  const b = CN[i + 1];
  return f(a) + (f(b) - f(a)) * (x - Math.floor(x));
};
export const births = (x: number) => seg(x, (r) => r.b);
export const deaths = (x: number) => seg(x, (r) => r.d);
export const popAt = (x: number) => seg(x, (r) => r.pop);

export const WORLD: Record<string, [string, number][]> = (raw as any).world;
export const CN_UN: Record<string, number> = (raw as any).chinaUN;

// x where births and deaths cross between two years
export const crossing = (y: number) => {
  const a = byYear.get(y)!;
  const b = byYear.get(y + 1)!;
  const d0 = a.b - a.d;
  const d1 = b.b - b.d;
  return y + d0 / (d0 - d1);
};

export const fmtWan = (v: number) => Math.round(v).toLocaleString("en-US");
export const pct = (from: number, to: number) => ((to - from) / from) * 100;
