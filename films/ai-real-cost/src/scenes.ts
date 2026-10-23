import React from "react";
import { Tower } from "./scenes/ch1";
import { Receipts } from "./scenes/ch2";
import { Formula } from "./scenes/ch3";
import { Bill, Devs, Grid, Loop, Wage } from "./scenes/time";
import { BrandOutro, Collapse, Future, Scarce, Today } from "./scenes/coda";
import { Board, Claim, Title } from "./scenes/hook";
import { K } from "./theme3";
import { barToFrame } from "./timing";

export type Trans = "cut" | "zoom" | "slide" | "up";
export type Scene = {
  from: number;
  to: number;
  C: React.FC;
  tin: Trans;
  pal: [string, string, string];
};

// Film bars (1 bar = 4 beats ≈ 2.15 s) where each scene starts; sound.ts uses the same table.
export const AT = {
  claim: 0,
  board: 2,
  title: 6,
  tower: 7,
  receipts: 10.5,
  formula: 14.5,
  devs: 19,
  loop: 21.5,
  grid: 24.5,
  wage: 29,
  bill: 31.5,
  today: 37.5,
  future: 39,
  collapse: 44,
  scarce: 47,
  outro: 50,
  end: 52.75,
};

// The soundtrack is cut at film bars 18 and 34 (MUSIC_EDIT in timing.ts): film bar b plays track bar b + 2 until 18,
// b + 22 until 34, then b + 30. Track energy: intro 0–8, main 8–40, breakdown 40–48, main 48–64, peak 64–77, settling
// 78–79, fade 80–84. Film bars 17 and 33 are muted (the two silences).
export const SCENES: Scene[] = [
  // The counter-intuitive claim on frame 0, the 17× puzzle, the subscription answer (track 2–8, intro)
  { from: AT.claim, to: AT.board, C: Claim, tin: "cut", pal: [K.claude, K.deepseek, K.green] },
  { from: AT.board, to: AT.title, C: Board, tin: "zoom", pal: [K.claude, K.purple, K.deepseek] },
  { from: AT.title, to: AT.tower, C: Title, tin: "cut", pal: [K.claude, K.gold, K.purple] },
  // Reason 1: the flat-rate plan; reason 2: fewer tokens for the same exam (track 9–17)
  { from: AT.tower, to: AT.receipts, C: Tower, tin: "up", pal: [K.gold, K.claude, K.red] },
  { from: AT.receipts, to: AT.formula, C: Receipts, tin: "zoom", pal: [K.gold, K.claude, K.deepseek] },
  // The formula, its missing line, the first silence (bar 17), then "your time" on the breakdown (film 18 = track 40)
  { from: AT.formula, to: AT.devs, C: Formula, tin: "zoom", pal: [K.claude, K.gold, K.purple] },
  // Your time, step by step (breakdown, then the main section from film 26 = track 48)
  { from: AT.devs, to: AT.loop, C: Devs, tin: "slide", pal: [K.purple, K.deepseek, K.claude] },
  { from: AT.loop, to: AT.grid, C: Loop, tin: "slide", pal: [K.purple, K.claude, K.deepseek] },
  { from: AT.grid, to: AT.wage, C: Grid, tin: "up", pal: [K.green, K.purple, K.deepseek] },
  { from: AT.wage, to: AT.bill, C: Wage, tin: "zoom", pal: [K.gold, K.purple, K.claude] },
  // The bill: tokens first, the second silence (bar 33), then the purple line on the peak (film 34 = track 64)
  { from: AT.bill, to: AT.today, C: Bill, tin: "up", pal: [K.purple, K.claude, K.deepseek] },
  // Today's answer, why it won't last, and the one line that stays (the hourglass lands on the settling bars)
  { from: AT.today, to: AT.future, C: Today, tin: "zoom", pal: [K.green, K.claude, K.purple] },
  { from: AT.future, to: AT.collapse, C: Future, tin: "slide", pal: [K.deepseek, K.gold, K.green] },
  { from: AT.collapse, to: AT.scarce, C: Collapse, tin: "zoom", pal: [K.purple, K.claude, K.gold] },
  { from: AT.scarce, to: AT.outro, C: Scarce, tin: "zoom", pal: [K.purple, K.gold, K.deepseek] },
  { from: AT.outro, to: AT.end, C: BrandOutro, tin: "zoom", pal: [K.claude, K.gold, K.purple] },
];

// The track is nearly silent by film bar 52 (track bar 82, −22 dB); Film.tsx fades the rest out by the last frame.
export const FILM_FRAMES = barToFrame(AT.end) + 18;
