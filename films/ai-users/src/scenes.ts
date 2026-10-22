import React from "react";
import { Books, OnePerson, Platform } from "./scenes/ch1";
import { Wall, Wave1, Wave2, Wave3, Wave4 } from "./scenes/ch2";
import { Compiler, Expert, Overnight } from "./scenes/ch3";
import { BrandCard, Final, Making, Medal, Sources, TwoSkills, Years } from "./scenes/coda";
import { FairPlay, Gap } from "./scenes/gap";
import { Finding } from "./scenes/mid";
import { Claim, Hook, Questions, Title } from "./scenes/open";
import { K } from "./theme";
import { barToFrame, MUSIC_END_FRAME } from "./timing";

export type Trans = "cut" | "zoom" | "slide" | "up" | "fade";
export type Scene = {
  from: number;
  to: number;
  C: React.FC;
  tin: Trans;
  pal: [string, string, string];
  // Beats (from the scene's first downbeat) that get a white flash.
  accents?: number[];
};

// Film bars = track bars (1 bar = 4 beats ≈ 2.15 s). Track energy: intro 0–8, main 8–40, interlude 40–48,
// main 48–64 (48 is the biggest re-entry), climax 64–76, settling 76–80, fade 80–84.
export const SCENES: Scene[] = [
  // The claim, whole, from the first frame (intro)
  { from: 0, to: 2, C: Claim, tin: "cut", pal: [K.ai, K.paper, K.gold] },
  { from: 2, to: 6, C: Hook, tin: "zoom", pal: [K.paper, K.ai, K.green] },
  { from: 6, to: 8, C: Questions, tin: "up", pal: [K.paper, K.ai, K.gold] },
  // Title on the main section's first downbeat
  { from: 8, to: 10, C: Title, tin: "up", pal: [K.gold, K.ai, K.paper], accents: [0] },
  // 1 · how thick is the answer sheet: tokens
  { from: 10, to: 14, C: OnePerson, tin: "slide", pal: [K.ai, K.aiHi, K.paper] },
  { from: 14, to: 18, C: Books, tin: "up", pal: [K.cloth, K.ai, K.paper] },
  { from: 18, to: 22, C: Platform, tin: "zoom", pal: [K.ai, K.aiHi, K.cloth] },
  // 2 · the barrage, profession by profession
  { from: 22, to: 26, C: Wave1, tin: "slide", pal: [K.paper, K.ai, K.green] },
  { from: 26, to: 30, C: Wave2, tin: "slide", pal: [K.paper, K.ai, K.gold] },
  { from: 30, to: 34, C: Wave3, tin: "slide", pal: [K.ai, K.paper, K.gold] },
  { from: 34, to: 38, C: Wave4, tin: "slide", pal: [K.paper, K.green, K.ai] },
  { from: 38, to: 40, C: Wall, tin: "zoom", pal: [K.paper, K.ai, K.gold] },
  // Interlude: fair play, then the gap
  { from: 40, to: 44, C: FairPlay, tin: "fade", pal: [K.red, K.paper, K.ai] },
  { from: 44, to: 48, C: Gap, tin: "slide", pal: [K.ai, K.paper, K.sub] },
  // The one discovery, on the biggest re-entry
  { from: 48, to: 54, C: Finding, tin: "cut", pal: [K.gold, K.ai, K.paper], accents: [0, 14.5] },
  // 3 · build the grader first
  { from: 54, to: 58, C: Compiler, tin: "up", pal: [K.ai, K.green, K.paper] },
  { from: 58, to: 61, C: Overnight, tin: "slide", pal: [K.ai, K.cloth, K.paper] },
  { from: 61, to: 64, C: Expert, tin: "slide", pal: [K.ai, K.green, K.gold] },
  // 升华 on the climax
  { from: 64, to: 67, C: Years, tin: "fade", pal: [K.paper, K.gold, K.ai] },
  { from: 67, to: 70, C: Medal, tin: "zoom", pal: [K.gold, K.ai, K.paper] },
  { from: 70, to: 73, C: TwoSkills, tin: "fade", pal: [K.paper, K.gold, K.ai] },
  { from: 73, to: 76, C: Final, tin: "zoom", pal: [K.gold, K.paper, K.ai], accents: [0] },
  // Fixed end: sources → making-of → brand card (on the fade)
  { from: 76, to: 78.5, C: Sources, tin: "fade", pal: [K.dim, K.ai, K.paper] },
  { from: 78.5, to: 80, C: Making, tin: "fade", pal: [K.dim, K.ai, K.paper] },
  { from: 80, to: 84.4, C: BrandCard, tin: "fade", pal: [K.gold, K.ai, K.paper] },
];

export const CHAPTERS = [
  { from: 10, to: 22, n: "1", t: "答卷有多厚" },
  { from: 22, to: 40, n: "2", t: "各行各业" },
  { from: 54, to: 64, n: "3", t: "先造阅卷" },
];

// The track runs out at its own end (181.9 s).
export const FILM_FRAMES = Math.min(MUSIC_END_FRAME, barToFrame(84.4));
