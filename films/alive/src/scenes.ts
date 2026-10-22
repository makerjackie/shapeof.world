import React from "react";
import { Alone, Day, Lines } from "./scenes/ch1";
import { Break, Fair, Far, Should } from "./scenes/ch2";
import { Harvard, Survive } from "./scenes/ch3";
import { BrandCard, Callback, Closing, Making, Relight, Sources, Stance } from "./scenes/coda";
import { Claim, Question, TitleCard, Weeks } from "./scenes/hook";
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

// Film bars (1 bar = 2.5 s at 96 BPM, bar 0 at 0.5 s). The score's sections (music/score.js) follow this table:
// intro 0–5, title 6–7, walk 8–16, walk2 17–22, breakdown 23–26, build 27, rise 28–33 (the discovery),
// anthem 34–43 (the coda, the music's peak), coda 44–45 (the callback, drums out), outro 46–51 (the end card on the fade, audio logo on bar 49.5).
// Scenes that share the life grid change with "fade" so the grid stays put.
const warm: [string, string, string] = [K.theme, "#2a2f38", K.steel];
const cool: [string, string, string] = [K.steel, "#2a2f38", K.theme];
const dark: [string, string, string] = [K.night, "#2a2f38", K.steel];
const gold: [string, string, string] = [K.gold, K.theme, "#2a2f38"];

export const SCENES: Scene[] = [
  { from: 0, to: 2, C: Claim, tin: "cut", pal: warm },
  { from: 2, to: 4, C: Weeks, tin: "zoom", pal: warm },
  { from: 4, to: 6, C: Question, tin: "fade", pal: cool },
  { from: 6, to: 8, C: TitleCard, tin: "zoom", pal: warm, accents: [0] },
  // 01 格子去哪了
  { from: 8, to: 11, C: Day, tin: "up", pal: cool },
  { from: 11, to: 14, C: Lines, tin: "zoom", pal: cool },
  { from: 14, to: 17, C: Alone, tin: "slide", pal: warm },
  // 02 喜欢
  { from: 17, to: 20, C: Should, tin: "up", pal: cool },
  { from: 20, to: 23, C: Far, tin: "zoom", pal: warm },
  // The fair word, on the breakdown
  { from: 23, to: 25, C: Fair, tin: "fade", pal: dark },
  { from: 25, to: 28, C: Break, tin: "fade", pal: cool },
  // 03 The one discovery on the biggest re-entry
  { from: 28, to: 32, C: Harvard, tin: "zoom", pal: gold, accents: [8] },
  { from: 32, to: 34, C: Survive, tin: "fade", pal: gold },
  // Coda on the peak
  { from: 34, to: 37, C: Stance, tin: "fade", pal: warm },
  { from: 37, to: 41, C: Relight, tin: "zoom", pal: warm },
  { from: 41, to: 44, C: Closing, tin: "fade", pal: gold },
  { from: 44, to: 46, C: Callback, tin: "fade", pal: warm },
  // Fixed end: sources → making-of → brand card
  { from: 46, to: 48, C: Sources, tin: "fade", pal: dark },
  { from: 48, to: 49.5, C: Making, tin: "fade", pal: dark },
  { from: 49.5, to: 51.5, C: BrandCard, tin: "zoom", pal: [K.gold, K.steel, "#2a2f38"] },
];

export const FILM_FRAMES = barToFrame(51.5) + 30;

export const CHAPTERS = [
  { from: 8, to: 17, n: "1", t: "格子去哪了" },
  { from: 17, to: 28, n: "2", t: "喜欢" },
  { from: 28, to: 34, n: "3", t: "最后剩下什么" },
];
