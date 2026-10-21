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

// Bars of the soundtrack (1 bar = 4 beats ≈ 2.15 s). Measured energy: intro 0–8, main 8–40,
// breakdown 40–48, main 48–64, peak 64–76, settling 76–78, fade 78–84.
export const SCENES: Scene[] = [
  { from: 0, to: 2, C: Claim, tin: "cut", pal: [K.claude, K.deepseek, K.green] },
  { from: 2, to: 6, C: Board, tin: "zoom", pal: [K.claude, K.purple, K.deepseek] },
  { from: 6, to: 8, C: Reasons, tin: "slide", pal: [K.gold, K.claude, K.deepseek] },
  { from: 8, to: 10, C: Title, tin: "cut", pal: [K.claude, K.gold, K.purple], accents: [0] },
  // Reason 1: flat-rate subscriptions
  { from: 10, to: 13, C: Plans, tin: "zoom", pal: [K.claude, K.gold, K.purple] },
  { from: 13, to: 18, C: Tower, tin: "up", pal: [K.gold, K.claude, K.red] },
  { from: 18, to: 21, C: VsGPT, tin: "slide", pal: [K.claude, K.gpt, K.purple] },
  { from: 21, to: 26, C: Elevator, tin: "up", pal: [K.claude, K.deepseek, K.green] },
  { from: 26, to: 30, C: Relay, tin: "slide", pal: [K.gold, K.red, K.green] },
  // Reason 2: fewer tokens for the same work
  { from: 30, to: 36, C: Receipts, tin: "zoom", pal: [K.gold, K.claude, K.deepseek] },
  // Fair play for DeepSeek
  { from: 36, to: 40, C: Honest, tin: "slide", pal: [K.deepseek, K.gold, K.claude] },
  { from: 40, to: 44, C: DSBook, tin: "zoom", pal: [K.deepseek, K.purple, K.green] },
  // Both reasons together; the reveal lands where the music comes back (bar 48)
  { from: 44, to: 52, C: Combine, tin: "up", pal: [K.green, K.claude, K.deepseek], accents: [16] },
  { from: 52, to: 56, C: Formula, tin: "zoom", pal: [K.claude, K.gold, K.green] },
  // Coda: the real scarce resource is your time
  { from: 56, to: 61, C: TimeCost, tin: "slide", pal: [K.purple, K.claude, K.gold] },
  { from: 61, to: 66, C: Jevons, tin: "zoom", pal: [K.green, K.gold, K.purple] },
  { from: 66, to: 72, C: Scarce, tin: "zoom", pal: [K.purple, K.gold, K.deepseek] },
  { from: 72, to: 76, C: Final, tin: "zoom", pal: [K.green, K.claude, K.purple], accents: [0] },
  { from: 76, to: 84, C: BrandOutro, tin: "zoom", pal: [K.claude, K.gold, K.purple], accents: [8] },
];

// The track's last bars fade on their own; stop a second after bar 82.
export const FILM_FRAMES = barToFrame(82) + 30;
