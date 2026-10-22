import React from "react";
import { Credits, Calendar, Done, Money, Timeline } from "./scenes/ch2";
import { Buyers, Plot, Scale, Sold, Today } from "./scenes/ch1";
import { Clocks, Fair, Price, Rent, Vacancy } from "./scenes/ch3";
import { Bet, BrandCard, City, Final, Futian, Making, Own, Sources } from "./scenes/coda";
import { Claim, Evidence, TitleCard, Why } from "./scenes/hook";
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
// hook 0–5, title 6–7, groove 8–20, groove2 21–31, stop 32–33, clock 34–41, breakdown 42–44, build 45,
// drop2 46–50 (the reveal), anthem 51–62, outro 63–68 with the audio logo on bar 67.
const warm: [string, string, string] = [K.theme, K.steel, "#2a2f38"];
const cool: [string, string, string] = [K.steel, "#2a2f38", K.theme];
const dark: [string, string, string] = ["#1c2230", "#2a2f38", K.steel];

export const SCENES: Scene[] = [
  { from: 0, to: 2, C: Claim, tin: "cut", pal: warm },
  { from: 2, to: 4, C: Evidence, tin: "zoom", pal: [K.green, K.steel, "#2a2f38"] },
  { from: 4, to: 6, C: Why, tin: "slide", pal: cool },
  { from: 6, to: 8, C: TitleCard, tin: "zoom", pal: warm, accents: [0] },
  // 01 谁在决定
  { from: 8, to: 11, C: Plot, tin: "up", pal: cool },
  { from: 11, to: 14, C: Buyers, tin: "slide", pal: warm },
  { from: 14, to: 16, C: Sold, tin: "zoom", pal: warm },
  { from: 16, to: 18, C: Today, tin: "slide", pal: cool },
  { from: 18, to: 21, C: Scale, tin: "up", pal: warm },
  // 02 十年
  { from: 21, to: 23, C: Calendar, tin: "slide", pal: warm },
  { from: 23, to: 26, C: Timeline, tin: "up", pal: cool },
  { from: 26, to: 29, C: Money, tin: "zoom", pal: warm },
  { from: 29, to: 32, C: Credits, tin: "up", pal: dark },
  // Turn: the music stops
  { from: 32, to: 34, C: Done, tin: "fade", pal: dark },
  // 03 等人来
  { from: 34, to: 37, C: Vacancy, tin: "zoom", pal: dark },
  { from: 37, to: 40, C: Rent, tin: "slide", pal: warm },
  { from: 40, to: 42, C: Price, tin: "zoom", pal: warm },
  { from: 42, to: 46, C: Fair, tin: "fade", pal: [K.green, K.steel, "#2a2f38"] },
  // The one discovery on the biggest re-entry
  { from: 46, to: 51, C: Clocks, tin: "zoom", pal: [K.gold, K.theme, K.red], accents: [0] },
  // Coda on the peak section
  { from: 51, to: 53, C: Own, tin: "slide", pal: warm },
  { from: 53, to: 55, C: City, tin: "zoom", pal: cool },
  { from: 55, to: 58, C: Futian, tin: "up", pal: warm },
  { from: 58, to: 61, C: Bet, tin: "fade", pal: [K.theme, K.gold, K.steel] },
  { from: 61, to: 63, C: Final, tin: "zoom", pal: [K.gold, K.theme, K.steel] },
  // Fixed end: sources → making-of → brand card
  { from: 63, to: 65.5, C: Sources, tin: "fade", pal: dark },
  { from: 65.5, to: 67, C: Making, tin: "fade", pal: dark },
  { from: 67, to: 69, C: BrandCard, tin: "zoom", pal: [K.gold, K.steel, "#2a2f38"] },
];

export const FILM_FRAMES = barToFrame(69) + 30;

export const CHAPTERS = [
  { from: 8, to: 21, n: "1", t: "谁在决定" },
  { from: 21, to: 32, n: "2", t: "十年" },
  { from: 32, to: 51, n: "3", t: "等人来" },
];
