// v3 sound effects from our own library (CC0), fetched by tools/music3.py into public/sfx/.
import { FALL3 } from "./astro3";
import { FREEZE, MATCHES, PRESS10 } from "./game3";
import { BEAT, T } from "./time";

export type Cue = { t: number; id: string; v: number };

export const CUES3: Cue[] = [
  // the night: a press on every new match, a sting on the slower results
  ...MATCHES.slice(1).map((m) => ({ t: m.start, id: "sfx-ui-04", v: 0.5 })),
  ...MATCHES.slice(0, 4).map((m) => ({ t: m.result, id: m.win ? "sfx-notification-01" : "sfx-notification-02", v: 0.28 })),
  { t: FREEZE, id: "sfx-impact-08", v: 0.6 }, // 失败, 01:47
  { t: PRESS10, id: "sfx-ui-04", v: 0.75 }, // the tenth press
  // the rings
  { t: T(8.35), id: "sfx-transition-05", v: 0.4 },
  { t: T(9.6), id: "sfx-impact-19", v: 0.55 }, // one round closes
  { t: FALL3 + 0.42, id: "sfx-impact-15", v: 0.26 }, // a star breaks
  { t: T(12.3), id: "sfx-notification-16", v: 0.45 }, // daily task
  ...Array.from({ length: 8 }, (_, k) => ({ t: T(14) + k * BEAT, id: "sfx-mechanical-14", v: 0.28 })), // season clock
  { t: T(16.3), id: "sfx-notification-04", v: 0.45 }, // "差一个，来不来？"
  { t: T(18), id: "sfx-transition-06", v: 0.4 }, // the rings speed up
  { t: T(21.6), id: "sfx-ui-12", v: 0.45 }, // teams matched
  { t: T(26.95), id: "sfx-transition-17", v: 0.45 }, // the fall
  { t: T(28), id: "sfx-impact-08", v: 0.7 }, // after one bar of silence
];
