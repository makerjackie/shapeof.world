import React from "react";
import { Elevator, Plans, Tower, VsGPT } from "./scenes/ch1";
import { Combine, Honest, Receipts } from "./scenes/ch2";
import { DSBook, Formula, Relay } from "./scenes/ch3";
import { BrandOutro, Final, Jevons, Scarce, TimeCost } from "./scenes/coda";
import { Board, Claim, Reasons, Title } from "./scenes/hook";
import { K } from "./theme3";
import { barToFrame } from "./timing";

export type Trans = "cut" | "zoom" | "slide" | "up";
export type Scene = {
  from: number;
  to: number;
  C: React.FC;
  tin: Trans;
  pal: [string, string, string];
  // Beats (from the scene's first downbeat) that get a white flash.
  accents?: number[];
};

// Film bars (1 bar = 4 beats ≈ 2.15 s). The story and order are the published v5.1's; the holds are shorter and
// "your time" shows the rework loop. Music (timing.ts): film 16 → track 24, so film 40 = track 48 (the music comes
// back after the breakdown) and film 56 = track 64 (the peak).
export const SCENES: Scene[] = [
  { from: 0, to: 2, C: Claim, tin: "cut", pal: [K.claude, K.deepseek, K.green] },
  { from: 2, to: 6, C: Board, tin: "zoom", pal: [K.claude, K.purple, K.deepseek] },
  { from: 6, to: 8, C: Reasons, tin: "slide", pal: [K.gold, K.claude, K.deepseek] },
  { from: 8, to: 10, C: Title, tin: "cut", pal: [K.claude, K.gold, K.purple], accents: [0] },
  // Reason 1: flat-rate subscriptions
  { from: 10, to: 12, C: Plans, tin: "zoom", pal: [K.claude, K.gold, K.purple] },
  { from: 12, to: 16, C: Tower, tin: "up", pal: [K.gold, K.claude, K.red] },
  { from: 16, to: 18, C: VsGPT, tin: "slide", pal: [K.claude, K.gpt, K.purple] },
  { from: 18, to: 22, C: Elevator, tin: "up", pal: [K.claude, K.deepseek, K.green] },
  { from: 22, to: 25, C: Relay, tin: "slide", pal: [K.gold, K.red, K.green] },
  // Reason 2: fewer tokens for the same work
  { from: 25, to: 30, C: Receipts, tin: "zoom", pal: [K.gold, K.claude, K.deepseek] },
  // DeepSeek's side of the story
  { from: 30, to: 33, C: Honest, tin: "slide", pal: [K.deepseek, K.gold, K.claude] },
  { from: 33, to: 36, C: DSBook, tin: "zoom", pal: [K.deepseek, K.purple, K.green] },
  // Both reasons together; the reveal (beat 16) lands where the music comes back
  { from: 36, to: 42, C: Combine, tin: "up", pal: [K.green, K.claude, K.deepseek], accents: [16] },
  { from: 42, to: 45, C: Formula, tin: "zoom", pal: [K.claude, K.gold, K.green] },
  // The missing term: your time, checking and re-checking
  { from: 45, to: 53.5, C: TimeCost, tin: "slide", pal: [K.purple, K.claude, K.gold] },
  // Today's answer only: cheaper every year, used ever more; the usage line hits the peak (beat 10 = film bar 56)
  { from: 53.5, to: 58, C: Jevons, tin: "zoom", pal: [K.green, K.gold, K.purple] },
  { from: 58, to: 62, C: Scarce, tin: "zoom", pal: [K.purple, K.gold, K.deepseek] },
  { from: 62, to: 64.5, C: Final, tin: "zoom", pal: [K.green, K.claude, K.purple], accents: [0] },
  { from: 64.5, to: 67.25, C: BrandOutro, tin: "zoom", pal: [K.claude, K.gold, K.purple], accents: [3] },
];

export const FILM_FRAMES = barToFrame(67.25) + 18;
