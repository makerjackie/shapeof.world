import React from "react";
import { Open } from "./scenes/open";
import { Doctor } from "./scenes/doctor";
import { Coder } from "./scenes/coder";
import { Panorama } from "./scenes/panorama";
import { Turn } from "./scenes/turn";
import { MathS } from "./scenes/math";
import { Coda, EndCard, Finding, Us } from "./scenes/finale";
import { A, aBar, B, B2_AT, B_AT, b2Bar, END_CARD_AT, FILM_S, FPS } from "./timing";

export type Scene = {
  id: string;
  from: number; // film seconds the scene starts (a sliding sheet starts a little earlier)
  to: number;
  zero: number; // film second of the scene's beat 0
  bpm: number;
  C: React.FC;
  slide?: boolean; // arrives as a new sheet sliding over the desk
  chapter?: string;
};

export const SCENES: Scene[] = [
  { id: "open", from: 0, to: aBar(7), zero: aBar(0), bpm: A.bpm, C: Open },
  { id: "doctor", from: aBar(7), to: aBar(17), zero: aBar(7), bpm: A.bpm, C: Doctor, slide: true, chapter: "医生" },
  { id: "coder", from: aBar(17), to: aBar(29), zero: aBar(17), bpm: A.bpm, C: Coder, slide: true, chapter: "程序员" },
  { id: "panorama", from: aBar(29), to: aBar(35), zero: aBar(29), bpm: A.bpm, C: Panorama, slide: true, chapter: "到处" },
  // The quiet turn keeps A's grid: the clock ticks on it.
  { id: "turn", from: aBar(35), to: B_AT, zero: aBar(35), bpm: A.bpm, C: Turn, slide: true, chapter: "谁来改" },
  { id: "math", from: B_AT, to: B2_AT, zero: B_AT, bpm: B.bpm, C: MathS, slide: true, chapter: "数学" },
  // The finding is a hard cut on the downbeat after the silence.
  { id: "finding", from: B2_AT, to: b2Bar(7), zero: B2_AT, bpm: B.bpm, C: Finding, chapter: "发现" },
  { id: "us", from: b2Bar(7), to: b2Bar(13), zero: b2Bar(7), bpm: B.bpm, C: Us, slide: true, chapter: "我们" },
  { id: "coda", from: b2Bar(13), to: END_CARD_AT, zero: b2Bar(13), bpm: B.bpm, C: Coda, slide: true, chapter: "两门课" },
  { id: "end", from: END_CARD_AT, to: FILM_S, zero: END_CARD_AT, bpm: B.bpm, C: EndCard, slide: true },
];

export const FILM_FRAMES = Math.round(FILM_S * FPS);
