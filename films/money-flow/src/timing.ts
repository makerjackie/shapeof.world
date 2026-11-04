// v7: cut to the score 「脉搏 · 弦」 (music.shapeof.world pulse-strings): 111.6 BPM, first downbeat 0.105 s.
// Every scene time is a bar (or a beat) of that track, so the film lands on its hits:
//   b0–7 intro (sub enters at b4) · b8 DROP · b20 lift · b32 one-beat stop · b47 hard stop · b48–55 breather ·
//   b56 pre-drop gap · b57 PEAK · b76 outro · track ends ≈ 174.5 s.
export const FPS = 30;
export const BAR = 240 / 111.6;
export const B = (n: number) => 0.105 + n * BAR;
export const BEAT = BAR / 4;

export const T = {
  hook: 0, // a payslip: 5000; the company pays 6,645, the card gets 4,075, income tax 0. Where did the rest go?
  c1: B(8), // DROP: the 2,570, item by item (your own accounts, the pools, today's retirees)
  c2: B(16), // the 4,075 is spent: tax inside every price
  c3: B(20), // lift: your spending becomes someone's wages, taxes, profits; dividends; who holds the shares
  c4: B(33) - 2.6, // where it stops: the savers (engine: the top tanks brim over at c4 + 2.6)
  c5: B(36), // savings → the bank → the young buyer; interest back
  stop: B(47), // hard stop: why do the rich get richer?
  c7: B(48), // breather: wages vs. assets; the tax on each; new money lands first
  peak: B(57), // PEAK: the whole circulation at night
  c11: B(73), // ending line
  sources: B(78),
  card: B(80),
  end: B(80) + 5.4,
};

// light: blue hour under the payslip, a hard cut to bright afternoon on the drop, dusk through the savers, night for
// the peak (0 = golden, 0.6 = blue hour, 1 = night)
const NIGHT_KEYS: [number, number][] = [[0, 0.72], [B(8) - 0.02, 0.72], [B(8), 0.02], [B(30), 0.1], [B(40), 0.4], [B(47), 0.55], [B(56), 0.7], [B(57), 1], [B(80), 1]];
export const nightAt = (t: number) => {
  let i = 0;
  while (i < NIGHT_KEYS.length - 1 && t > NIGHT_KEYS[i + 1][0]) i++;
  const [a, x] = NIGHT_KEYS[i];
  const [b, y] = NIGHT_KEYS[Math.min(i + 1, NIGHT_KEYS.length - 1)];
  const u = b === a ? 1 : Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x + (y - x) * (b - a < 0.1 ? 1 : u * u * (3 - 2 * u));
};

// the year model of v4–v6 is not used (tanks are set per scene in state.ts)
export const MONTHS = { start: 9000, end: 9001 };

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ss = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
export const ramp = (t: number, a: number, b: number) => ss((t - a) / (b - a));
// 0 → 1 over [a, a+fi], 1 → 0 over [b-fo, b]
export const win = (t: number, a: number, b: number, fi = 0.6, fo = 0.6) => Math.min(ramp(t, a, a + fi), 1 - ramp(t, b - fo, b));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
// a punch on a downbeat: 1 at the hit, decaying over `d` seconds
export const punch = (t: number, at: number, d = 0.35) => (t < at || t > at + d ? 0 : 1 - (t - at) / d);

// the payslip (illustrative: 5,000 a month, contribution base = wage; common rates, they differ by city)
export const PAY = {
  gross: 5000,
  firm: { pension: 800, medical: 400, unemp: 25, injury: 20, fund: 400 }, // 16%, ≈8%, 0.5%, ≈0.4%, 8%
  own: { pension: 400, medical: 100, unemp: 25, fund: 400 }, // 8%, 2%, 0.5%, 8%
};
export const FIRM_TOTAL = 5000 + 800 + 400 + 25 + 20 + 400; // 6,645
export const NET = 5000 - 400 - 100 - 25 - 400; // 4,075 (taxable 4,075 < 5,000: income tax 0)
