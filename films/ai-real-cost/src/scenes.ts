import React from "react";
import { Elevator, Tower } from "./scenes/ch1";
import { Combine, Honest, Receipts } from "./scenes/ch2";
import { Formula, Relay } from "./scenes/ch3";
import { BrandOutro, Final, Scarce, TimeCost } from "./scenes/coda";
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
  // Beats (from the scene's first downbeat) that get a white flash.
  accents?: number[];
};

// Film bars (1 bar = 4 beats ≈ 2.15 s). The soundtrack is cut at bars 22 and 38 (MUSIC_EDIT in timing.ts), so
// film bar b plays track bar b + 2 until 22, b + 18 until 38, then b + 26. Track energy: intro 0–8, main 8–40,
// breakdown 40–48, main 48–64, peak 64–76, settling 76–78, fade 78–84.
export const SCENES: Scene[] = [
  // The conclusion is on screen from the first frame (track 2–8, intro)
  { from: 0, to: 2, C: Claim, tin: "cut", pal: [K.claude, K.deepseek, K.green] },
  { from: 2, to: 6, C: Board, tin: "zoom", pal: [K.claude, K.purple, K.deepseek] },
  { from: 6, to: 7, C: Title, tin: "cut", pal: [K.claude, K.gold, K.purple], accents: [0] },
  // Reason 1: flat-rate subscriptions (track 9–19)
  { from: 7, to: 11, C: Tower, tin: "up", pal: [K.gold, K.claude, K.red] },
  { from: 11, to: 14, C: Elevator, tin: "up", pal: [K.claude, K.deepseek, K.green] },
  { from: 14, to: 17, C: Relay, tin: "slide", pal: [K.gold, K.red, K.green] },
  // Reason 2: fewer tokens for the same work (track 19–24)
  { from: 17, to: 22, C: Receipts, tin: "zoom", pal: [K.gold, K.claude, K.deepseek] },
  // Fair play for DeepSeek, on the breakdown (track 40–44)
  { from: 22, to: 26, C: Honest, tin: "slide", pal: [K.deepseek, K.gold, K.claude] },
  // Both reasons together; the reveal lands where the music comes back (film 30 = track 48)
  { from: 26, to: 34, C: Combine, tin: "up", pal: [K.green, K.claude, K.deepseek], accents: [16] },
  { from: 34, to: 38, C: Formula, tin: "zoom", pal: [K.claude, K.gold, K.green] },
  // Coda on the peak (track 64–76): the real scarce resource is your time
  { from: 38, to: 42, C: TimeCost, tin: "slide", pal: [K.purple, K.claude, K.gold] },
  { from: 42, to: 46, C: Scarce, tin: "zoom", pal: [K.purple, K.gold, K.deepseek] },
  { from: 46, to: 50, C: Final, tin: "zoom", pal: [K.green, K.claude, K.purple], accents: [0] },
  { from: 50, to: 55, C: BrandOutro, tin: "zoom", pal: [K.claude, K.gold, K.purple], accents: [8] },
];

// The track is fading by then (track bar 81); stop a second after film bar 55.
export const FILM_FRAMES = barToFrame(55) + 30;
