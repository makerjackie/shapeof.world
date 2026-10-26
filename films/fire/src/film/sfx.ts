// Sound effects from our own library (music.shapeof.world, CC0 synthesis), each on a picture action.
// [film seconds, file in public/sfx, volume]
import sim from "../data/sim.json";
import { F } from "../timing";

type Cue = [number, string, number];
const P30 = sim.p30 as unknown as Record<string, { fail: number | null }>;
const P50A = sim.p50_300 as unknown as Record<string, { fail: number | null }>;

const gridYear = (Y: number) => {
  // inverse of the S4 calendar: [F17,1928] [F18.4,1929.2] [F25.6,2026]
  if (Y <= 1929.2) return F(17.0) + ((Y - 1928) / 1.2) * F(1.4);
  return F(18.4) + ((Y - 1929.2) / (2026 - 1929.2)) * F(7.2);
};
const runA = (Y: number) => F(49.2) + ((Y - 1928) / 98) * F(2.8);

export const SFX: Cue[] = (() => {
  const c: Cue[] = [
    [0.28, "sfx-impact-11", 0.95],
    [0.3, "sfx-impact-16", 0.55],
    [F(1.15), "sfx-foley-02", 0.35],
    [F(1.15) + 0.5, "sfx-impact-17", 0.5],
    [F(2.1), "sfx-foley-02", 0.35],
    [F(2.1) + 0.5, "sfx-impact-17", 0.5],
    [F(3.0), "sfx-transition-12", 0.4],
    [F(3.05), "sfx-impact-20", 0.7],
    [F(4.05), "sfx-transition-01", 0.3],
    [F(4.75), "sfx-foley-01", 0.55],
    [F(6.0), "sfx-foley-02", 0.35],
    [F(6.5), "sfx-foley-02", 0.35],
    [F(7.0), "sfx-foley-02", 0.35],
    [F(7.3), "sfx-transition-19", 0.35],
    [F(8.4), "sfx-transition-19", 0.45],
    [F(9.4), "sfx-impact-16", 0.5],
    [F(11.2), "sfx-transition-13", 0.55],
    [F(11.9), "sfx-impact-20", 0.6],
    [F(13.0), "sfx-foley-02", 0.3],
    [F(13.5), "sfx-foley-02", 0.3],
    [F(14.0), "sfx-magic-14", 0.3],
    [F(15.0), "sfx-impact-09", 0.75],
    [F(15.0), "sfx-transition-18", 0.35],
    [F(16.6), "sfx-transition-05", 0.4],
    [F(26.3), "sfx-impact-20", 0.4],
    [F(32.7), "sfx-transition-08", 0.35],
    [F(35.0) + (24.2 / 30) * F(2.0), "sfx-impact-09", 0.6],
    [F(37.6), "sfx-transition-19", 0.3],
    [F(40.0), "sfx-impact-16", 0.7],
    [F(40.0), "sfx-impact-20", 0.6],
    [F(40.0) + (24.2 / 30) * F(3.0), "sfx-impact-09", 0.6],
    [F(43.0), "sfx-magic-20", 0.35],
    [F(48.3), "sfx-transition-05", 0.4],
    [F(52.6), "sfx-transition-19", 0.35],
    [F(54.8), "sfx-magic-20", 0.35],
    [F(55.35), "sfx-impact-20", 0.7],
    [F(56.3), "sfx-transition-12", 0.35],
    [F(56.5), "sfx-ui-10", 0.4],
    [F(57.6), "sfx-ui-10", 0.4],
    [F(59.0), "sfx-ui-10", 0.4],
    [F(61.0), "sfx-ui-10", 0.4],
    [F(64.6), "sfx-ui-07", 0.35],
    [F(65.1), "sfx-ui-07", 0.35],
    [F(65.6), "sfx-ui-07", 0.35],
    [F(66.1), "sfx-ui-07", 0.35],
    [F(66.6), "sfx-ui-07", 0.35],
    [F(67.0), "sfx-impact-20", 0.5],
    [F(68.4), "sfx-transition-01", 0.35],
    [F(72.4), "sfx-transition-05", 0.35],
    [F(73.6) + (22 / 66) * F(3.8), "sfx-impact-19", 0.45],
    [F(73.6) + (37 / 66) * F(3.8), "sfx-impact-19", 0.45],
    [F(73.6) + F(3.8), "sfx-impact-19", 0.45],
    [F(80.0), "sfx-transition-19", 0.5],
    [F(80.2), "sfx-magic-05", 0.35],
    [F(81.5), "sfx-impact-16", 0.35],
    [F(83.0), "sfx-impact-16", 0.35],
    [F(84.5), "sfx-impact-20", 0.45],
    [F(86.3), "sfx-transition-12", 0.35],
    [F(89.8), "sfx-ui-04", 0.28],
    [F(90.2), "sfx-ui-04", 0.28],
    [F(90.6), "sfx-ui-04", 0.28],
    [F(91.0), "sfx-ui-04", 0.28],
    [F(92.0), "sfx-magic-14", 0.5],
    [F(92.0), "sfx-transition-07", 0.3],
    [F(95.1), "sfx-impact-17", 0.75],
    [F(99.0), "sfx-transition-20", 0.3],
  ];
  // house bricks clicking into place
  for (let i = 0; i < 6; i++) c.push([F(70.1) + i * 0.28, "sfx-impact-01", 0.22]);
  // the five 30-year failures, and a handful of the 50-year ones
  for (const s of Object.keys(P30)) {
    const f = P30[s].fail;
    if (f !== null) c.push([gridYear(Number(s) + f), "sfx-impact-09", 0.4]);
  }
  let k = 0;
  for (const s of Object.keys(P50A)) {
    const f = P50A[s].fail;
    if (f !== null && k++ % 3 === 0) c.push([runA(Number(s) + f), "sfx-impact-09", 0.25]);
  }
  return c;
})();

export const SFX_FILES = Array.from(new Set(SFX.map((c) => c[1])));
