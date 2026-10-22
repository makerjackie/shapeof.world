import React from "react";
import { Search, Spotlight, Supply } from "./scenes/ch1";
import { Audience, Gap, Idoubi, Levels, Shovels } from "./scenes/ch3";
import { BrandCard, Making, Shape, Sources } from "./scenes/coda";
import { Elevator, Exception } from "./scenes/fair";
import { Claim, Grid, Title } from "./scenes/hook";
import { K } from "./theme";
import { barToFrame } from "./timing";

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

// Film bars (1 bar = 2 s, bar 0 at 0.5 s). The score's sections (music/score.js) follow this table:
// hook 0–7, title 8–9, groove 10–20, breakdown 21–23, build 24, drop2 25–28 (the discovery), groove2 29–42,
// reflect 43–45 (to be fair), travel 46–47, build 48, anthem 49–58, outro 59–64 with the audio logo on bar 63.
const blue: [string, string, string] = [K.theme, K.slate, "#2a2f38"];
const night: [string, string, string] = ["#1c2230", K.slate, K.theme];
const green: [string, string, string] = [K.green, K.slate, K.theme];
const gold: [string, string, string] = [K.gold, K.theme, K.slate];

export const SCENES: Scene[] = [
  { from: 0, to: 3, C: Claim, tin: "cut", pal: [K.gold, K.green, K.slate] },
  { from: 3, to: 8, C: Grid, tin: "zoom", pal: blue },
  { from: 8, to: 10, C: Title, tin: "zoom", pal: blue, accents: [0] },
  // 01 做出来
  { from: 10, to: 14, C: Supply, tin: "up", pal: blue },
  // 02 被看见
  { from: 14, to: 18, C: Spotlight, tin: "slide", pal: night },
  { from: 18, to: 21, C: Search, tin: "slide", pal: night },
  // 03 赚到钱: the discovery lands on the re-entry (scene beat 16 = bar 25)
  { from: 21, to: 29, C: Gap, tin: "zoom", pal: gold, accents: [16] },
  { from: 29, to: 32, C: Levels, tin: "up", pal: green },
  { from: 32, to: 36, C: Idoubi, tin: "slide", pal: green },
  { from: 36, to: 39, C: Audience, tin: "zoom", pal: blue },
  { from: 39, to: 43, C: Shovels, tin: "slide", pal: green },
  // To be fair
  { from: 43, to: 46, C: Elevator, tin: "up", pal: [K.red, K.slate, "#2a2f38"] },
  { from: 46, to: 49, C: Exception, tin: "slide", pal: blue },
  // Coda on the anthem: the long tail is the shape; the last line lands on the last round (scene beat 32 = bar 57)
  { from: 49, to: 59, C: Shape, tin: "zoom", pal: [K.theme, K.gold, K.slate], accents: [32] },
  // Fixed end: sources → making-of → brand card
  { from: 59, to: 61, C: Sources, tin: "fade", pal: night },
  { from: 61, to: 63, C: Making, tin: "fade", pal: night },
  { from: 63, to: 65, C: BrandCard, tin: "zoom", pal: [K.gold, K.theme, "#2a2f38"] },
];

export const FILM_FRAMES = barToFrame(65) + 30;

export const CHAPTERS = [
  { from: 10, to: 14, n: "1", t: "做出来" },
  { from: 14, to: 21, n: "2", t: "被看见" },
  { from: 21, to: 43, n: "3", t: "赚到钱" },
];
