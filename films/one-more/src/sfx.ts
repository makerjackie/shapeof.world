// Sound effects from our own library (CC0, music.shapeof.world), fetched by tools/audio.py into public/sfx/.
import { CARD_GAP, CARDS, TAPS } from "./life";
import { A, B, sA, sB, sC } from "./timing";

export type Cue = { t: number; id: string; v: number };

const beatA = A.bar / 4;

export const CUES: Cue[] = [
  // A · the night and the rings
  { t: 0.06, id: "sfx-notification-02", v: 0.45 }, // 失败
  { t: sA(3.0), id: "sfx-ui-04", v: 0.7 }, // the press
  { t: sA(4.0), id: "sfx-transition-08", v: 0.45 }, // title
  { t: sA(10.0), id: "sfx-transition-05", v: 0.4 }, // pull back to the rings
  { t: sA(11.55), id: "sfx-impact-19", v: 0.55 }, // one round closes
  { t: sA(13.3) + 0.42, id: "sfx-impact-15", v: 0.42 }, // a star breaks
  { t: sA(14.6), id: "sfx-notification-16", v: 0.45 }, // daily task
  ...Array.from({ length: 8 }, (_, k) => ({ t: sA(16.5) + k * beatA, id: "sfx-mechanical-14", v: 0.3 })), // season clock
  { t: sA(18.85), id: "sfx-notification-04", v: 0.45 }, // "差一个，来不来？"
  { t: sA(20.5), id: "sfx-transition-06", v: 0.4 }, // the rings speed up
  { t: sA(24.25), id: "sfx-ui-12", v: 0.45 }, // teams matched
  { t: sA(26.95), id: "sfx-transition-17", v: 0.45 }, // the fall
  // B · inside the head (after one second of silence)
  { t: B.start, id: "sfx-impact-08", v: 0.7 },
  { t: sB(3.45), id: "sfx-ui-06", v: 0.35 }, // liking: tiny points
  { t: sB(4.35), id: "sfx-scifi-03", v: 0.28 }, // wanting: the network
  { t: sB(7.3), id: "sfx-mechanical-05", v: 0.35 }, // reels
  { t: sB(7.7), id: "sfx-mechanical-19", v: 0.3 },
  { t: sB(7.85), id: "sfx-mechanical-19", v: 0.3 },
  { t: sB(8.1), id: "sfx-mechanical-19", v: 0.35 },
  { t: sB(9.2), id: "sfx-impact-05", v: 0.65 }, // the one discovery
  { t: sB(10.85), id: "sfx-transition-10", v: 0.28 }, // tonight's lines
  { t: sB(15.4), id: "sfx-impact-16", v: 0.5 }, // the second after a loss
  // C · not only games
  { t: sC(0.9), id: "sfx-transition-05", v: 0.32 },
  { t: sC(2.7), id: "sfx-ui-01", v: 0.4 },
  { t: sC(3.15), id: "sfx-ui-01", v: 0.4 },
  { t: sC(3.6), id: "sfx-notification-04", v: 0.35 },
  ...CARDS.map((_, i) => ({ t: sC(8.75) + i * CARD_GAP, id: "sfx-foley-02", v: 0.28 })),
  ...TAPS.filter((_, i) => i % 2 === 0).map((tp) => ({ t: tp.at, id: "sfx-ui-13", v: 0.16 })),
  { t: sC(17.4), id: "sfx-foley-20", v: 0.3 }, // the thumb lifts
  { t: sC(19.1), id: "sfx-impact-05", v: 0.4 }, // the last line
  { t: sC(23.0), id: "sfx-impact-20", v: 0.55 }, // end card
];

export const SFX_IDS = Array.from(new Set(CUES.map((c) => c.id)));
