// Sound effects from our own library (CC0, music.shapeof.world), fetched by tools/music.py into public/sfx/.
import { ENTER, FLIP_AT, RENAME_AT } from "./open";
import { BEAT, S, SIL0 } from "./time";
import { TICK_AT } from "./flight";

export type Cue = { t: number; id: string; v: number };

const keys = (a: number, n: number, cps: number, v = 0.22): Cue[] => Array.from({ length: n }, (_, i) => ({ t: a + (i + 0.5) / cps, id: "sfx-mechanical-03", v }));

export const CUES: Cue[] = [
  ...keys(-0.18, 6, 12.5).filter((c) => c.t >= 0),
  { t: ENTER, id: "sfx-ui-04", v: 0.5 },
  { t: ENTER + 0.02, id: "sfx-notification-02", v: 0.3 },
  ...Array.from({ length: 12 }, (_, i) => ({ t: FLIP_AT(i + 1), id: "sfx-ui-01", v: 0.3 })),
  { t: S(4.0), id: "sfx-transition-05", v: 0.4 },
  { t: S(5.4), id: "sfx-transition-17", v: 0.35 },
  ...keys(RENAME_AT + 0.08, 7, 16, 0.2),
  { t: RENAME_AT + 0.55, id: "sfx-notification-01", v: 0.3 },
  { t: S(7.5), id: "sfx-impact-16", v: 0.5 },
  // cases: tab, rows pouring in, the bottom, the fall, the audit
  { t: S(8.75), id: "sfx-ui-09", v: 0.4 },
  ...Array.from({ length: 6 }, (_, i) => ({ t: S(9.7) + i * (BEAT / 2), id: "sfx-ui-01", v: 0.22 })),
  { t: S(10.2), id: "sfx-transition-10", v: 0.35 },
  { t: S(12.3), id: "sfx-impact-08", v: 0.55 },
  { t: S(12.75), id: "sfx-transition-18", v: 0.45 },
  ...Array.from({ length: 6 }, (_, i) => ({ t: S(12.8) + i * 0.24, id: "sfx-impact-12", v: 0.16 })),
  { t: S(14.5), id: "sfx-transition-12", v: 0.3 },
  { t: S(16), id: "sfx-transition-05", v: 0.35 },
  { t: S(16.9), id: "sfx-impact-16", v: 0.45 },
  // front stage: the flip and back, the bicycle, 总有人懂
  { t: S(18), id: "sfx-ui-09", v: 0.35 },
  { t: S(18.9), id: "sfx-transition-03", v: 0.45 },
  { t: S(20.4), id: "sfx-transition-03", v: 0.35 },
  { t: S(26.05), id: "sfx-impact-20", v: 0.45 },
  { t: S(26.6), id: "sfx-transition-19", v: 0.35 },
  // xz: the tower drops in, the push, the second name, the lock, the half second, the catch
  { t: S(27), id: "sfx-ui-09", v: 0.35 },
  ...Array.from({ length: 12 }, (_, i) => ({ t: S(27) + 0.05 + i * (BEAT / 2) + 0.2, id: "sfx-impact-01", v: 0.22 })),
  { t: S(29.4), id: "sfx-transition-17", v: 0.35 },
  { t: S(31), id: "sfx-ui-06", v: 0.3 },
  { t: S(33), id: "sfx-ui-06", v: 0.3 },
  ...Array.from({ length: 6 }, (_, i) => ({ t: S(33.4) + i * 0.2, id: "sfx-mechanical-14", v: 0.22 })),
  { t: S(34.6), id: "sfx-mechanical-15", v: 0.45 },
  { t: S(36.0), id: "sfx-notification-03", v: 0.35 },
  { t: S(37.6), id: "sfx-ui-13", v: 0.4 },
  { t: S(38.3), id: "sfx-foley-10", v: 0.45 },
  { t: SIL0 + 0.05, id: "sfx-impact-19", v: 0.3 },
  // nurse: the log, the yellow column, the peel
  { t: S(40), id: "sfx-ui-09", v: 0.4 },
  ...Array.from({ length: 12 }, (_, i) => ({ t: S(40.3) + i * 0.42, id: "sfx-mechanical-03", v: 0.2 })),
  ...Array.from({ length: 12 }, (_, i) => ({ t: S(45.5) + i * 0.18, id: "sfx-foley-07", v: 0.18 })),
  { t: S(48), id: "sfx-mechanical-14", v: 0.3 },
  { t: S(50.1), id: "sfx-foley-10", v: 0.5 },
  { t: S(52.4), id: "sfx-transition-05", v: 0.3 },
  // flight: the checklist, the reports, the rules
  { t: S(56), id: "sfx-ui-09", v: 0.4 },
  ...Array.from({ length: 5 }, (_, i) => ({ t: TICK_AT(i), id: "sfx-foley-07", v: 0.4 })),
  ...Array.from({ length: 10 }, (_, i) => ({ t: S(58.6) + i * 0.24, id: "sfx-ui-19", v: 0.2 })),
  { t: S(61), id: "sfx-transition-10", v: 0.3 },
  ...Array.from({ length: 4 }, (_, i) => ({ t: S(62.3) + i * 0.25 + 0.15, id: "sfx-notification-16", v: 0.25 })),
  // the field, the discovery, the but, the note
  { t: S(64.1), id: "sfx-transition-05", v: 0.45 },
  ...Array.from({ length: 12 }, (_, i) => ({ t: S(66.6) + i * 0.12, id: "sfx-ui-03", v: 0.12 })),
  { t: S(67.85), id: "sfx-impact-05", v: 0.6 },
  { t: S(69.75), id: "sfx-impact-08", v: 0.4 },
  ...Array.from({ length: 5 }, (_, i) => ({ t: S(69.9) + i * (BEAT / 2), id: "sfx-foley-07", v: 0.25 })),
  { t: S(71.9), id: "sfx-notification-01", v: 0.35 },
  { t: S(73.5), id: "sfx-ui-09", v: 0.35 },
  { t: S(73.9), id: "sfx-ui-07", v: 0.4 },
  { t: S(77.45), id: "sfx-impact-20", v: 0.5 },
];
