import React from "react";
import { Gallup, LifeDay, Tree } from "./scenes/ch1";
import { Break, Fair, Grow, Stamp } from "./scenes/ch2";
import { Harvard, Survive } from "./scenes/ch3";
import { BrandCard, Callback, Closing, Making, Relight, Sources, Stance } from "./scenes/coda";
import { Claim, TitleCard, Weeks, Zoom } from "./scenes/hook";
import { K } from "./theme";
import { barToFrame } from "./timing";

export type Trans = "cut" | "zoom" | "slide" | "up" | "fade";
export type Scene = {
  from: number;
  to: number;
  C: React.FC;
  tin: Trans;
  pal: [string, string, string];
  // Beats (from the scene's first downbeat) that get a soft flash.
  accents?: number[];
};

// Film bars (1 bar = 4 beats ≈ 2.15 s at 111.62 BPM). The soundtrack is cut at bars 32 and 48 (MUSIC_EDIT in
// timing.ts): film bar b plays track bar b until 32, b + 8 until 48, then b + 16. So: intro 0–8 (claim, the grid,
// the question), main 8–32 (title, chapters 1–2), interlude 32–40 (the fair word, the branch breaking), main 40–48
// (the discovery on the re-entry), climax 48–60 (the coda), the track's own fade 60–66 (the end card).
// Scenes that share a prop change with "fade" so the prop stays put.
const warm: [string, string, string] = [K.theme, "#2a2f38", K.steel];
const cool: [string, string, string] = [K.steel, "#2a2f38", K.theme];
const dark: [string, string, string] = [K.night, "#2a2f38", K.steel];
const gold: [string, string, string] = [K.gold, K.theme, "#2a2f38"];

export const SCENES: Scene[] = [
  { from: 0, to: 2, C: Claim, tin: "cut", pal: warm },
  { from: 2, to: 5, C: Weeks, tin: "zoom", pal: warm },
  { from: 5, to: 8, C: Zoom, tin: "fade", pal: cool },
  { from: 8, to: 10, C: TitleCard, tin: "zoom", pal: warm, accents: [0] },
  // 01 格子去哪了
  { from: 10, to: 17, C: LifeDay, tin: "up", pal: cool },
  { from: 17, to: 21, C: Tree, tin: "zoom", pal: warm },
  { from: 21, to: 24, C: Gallup, tin: "slide", pal: warm },
  // 02 喜欢
  { from: 24, to: 28, C: Stamp, tin: "up", pal: cool },
  { from: 28, to: 32, C: Grow, tin: "zoom", pal: warm },
  // The fair word, on the interlude
  { from: 32, to: 35, C: Fair, tin: "fade", pal: dark },
  { from: 35, to: 40, C: Break, tin: "fade", pal: cool },
  // 03 The one discovery on the re-entry
  { from: 40, to: 45, C: Harvard, tin: "zoom", pal: gold, accents: [10.5] },
  { from: 45, to: 48, C: Survive, tin: "slide", pal: gold },
  // Coda on the climax
  { from: 48, to: 51, C: Stance, tin: "fade", pal: warm },
  { from: 51, to: 55, C: Relight, tin: "zoom", pal: warm },
  { from: 55, to: 58, C: Closing, tin: "fade", pal: gold },
  { from: 58, to: 60, C: Callback, tin: "fade", pal: warm },
  // Fixed end on the track's fade: sources → making-of → brand card
  { from: 60, to: 62.5, C: Sources, tin: "fade", pal: dark },
  { from: 62.5, to: 64, C: Making, tin: "fade", pal: dark },
  { from: 64, to: 66, C: BrandCard, tin: "zoom", pal: [K.gold, K.steel, "#2a2f38"] },
];

export const FILM_FRAMES = barToFrame(66) + 30;

export const CHAPTERS = [
  { from: 10, to: 24, n: "1", t: "格子去哪了" },
  { from: 24, to: 40, n: "2", t: "喜欢" },
  { from: 40, to: 48, n: "3", t: "最后剩下什么" },
];
