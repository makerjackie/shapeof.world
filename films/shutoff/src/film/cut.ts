// The cut: every picture shot of 《关不掉》 in film seconds. Text cards live in text.ts; sound cues in tools/sound.py
// read the same numbers from cut.json (written by tools/cutjson.mjs).
export type SceneId = "phone" | "city" | "server" | "control" | "earth";
export type Shot = {
  t0: number;
  t1: number;
  scene: SceneId;
  mode: string;
  o?: number; // start offset inside the mode's own clock (montage reuse)
  fi?: number; // fade in from black (s)
  fo?: number; // fade out to black (s)
  xf?: number; // dissolve in over the previous shot (s); the previous shot must overlap
  glitch?: number;
};

const S = (t0: number, t1: number, scene: SceneId, mode: string, x: Partial<Shot> = {}): Shot => ({ t0, t1, scene, mode, ...x });

// ---- montage at the peak of act 3: cuts get shorter and shorter ----
const MONTAGE_T0 = 143.0;
export const MONTAGE_T1 = 154.2;
// the montage slams into silence; 03:15, the chat
export const CHAT_T0 = 155.0;
const POOL: [SceneId, string, number][] = [
  ["server", "leds", 1.0],
  ["city", "masts", 0.5],
  ["control", "monitor", 12.6],
  ["city", "redlights", 0.3],
  ["phone", "call", 3.2],
  ["city", "billboards", 4.0],
  ["city", "drones", 6.5],
  ["control", "phones", 7.4],
  ["server", "poweroff", 5.2],
  ["city", "freeze", 4.4],
  ["earth", "glimpse", 1.0],
  ["city", "blackout", 6.6],
];
const montage: Shot[] = [];
{
  let t = MONTAGE_T0;
  let i = 0;
  while (t < MONTAGE_T1 - 0.01) {
    const d = Math.max(0.2, 1.15 * Math.pow(0.86, i));
    const t1 = Math.min(MONTAGE_T1, t + d);
    const [scene, mode, o] = POOL[i % POOL.length];
    montage.push(S(t, t1, scene, mode, { o: o + (i >= POOL.length ? 1.7 : 0), glitch: i > 6 ? 0.5 : 0 }));
    t = t1;
    i++;
  }
}

export const CUT: Shot[] = [
  // cold open: 03:12, the phone on the desk
  S(0.6, 14.4, "phone", "lock", { fi: 1.6 }),
  // act 1 · trust
  S(19.6, 23.4, "city", "dusk", { fi: 0.6 }),
  S(23.4, 27.0, "city", "skyline"),
  S(29.2, 37.0, "city", "greenwave"),
  S(39.6, 42.4, "city", "grid"),
  S(42.4, 45.2, "city", "highway"),
  S(45.2, 48.0, "city", "masts"),
  S(48.0, 51.6, "phone", "morning", { fo: 0.4 }),
  // act 2 · the line
  S(57.0, 64.0, "server", "aisle", { fi: 1.0 }),
  S(64.0, 78.5, "control", "monitor"),
  S(81.5, 84.5, "control", "countdown"),
  S(84.5, 86.6, "control", "breaker"),
  S(86.6, 93.6, "server", "poweroff"),
  S(93.6, 103.0, "control", "phones"),
  // act 3 · where is it
  S(105.4, 114.0, "city", "blackout"),
  S(114.0, 120.5, "city", "freeze"),
  S(120.5, 126.5, "city", "billboards"),
  S(126.5, 133.5, "phone", "call"),
  S(133.5, 143.0, "city", "drones"),
  ...montage,
  // act 4 · 03:15 a.m., the same night as the cold open: 林工 finally asks
  S(CHAT_T0, 192.4, "phone", "chat"),
  // ending: up and out, to the whole night side of the earth
  S(191.8, 196.4, "phone", "pullout", { xf: 0.6 }),
  S(195.8, 203.4, "city", "rise", { xf: 0.6 }),
  S(202.8, 215.8, "earth", "orbit", { xf: 0.6, fo: 0.8 }),
];

// story time runs from the cold open (0) to the end card; the pre-roll card plays before it
export const PRE = 6.0;
export const FILM_SECONDS = 273.0;

export const shotsAt = (t: number) => CUT.filter((s) => t >= s.t0 && t < s.t1).sort((a, b) => a.t0 - b.t0).slice(-2);
