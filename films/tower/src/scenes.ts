import React from "react";
import { Act1 } from "./scenes/land";
import { Act5 } from "./scenes/bet";
import { Act2 } from "./scenes/decade";
import { Finding } from "./scenes/finding";
import { BrandCard, Making, Sources } from "./scenes/outro";
import { Act3, Fair, OwnRent, Rent } from "./scenes/wait";
import { Act4, Own } from "./scenes/why";
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
  // Map scenes paint their own ground; the drifting colour backdrop stays off under them.
  flat?: boolean;
};

// Film bars on the 千年之后 grid (film bar b = track bar b + 2, one bar = 2.150 s). Track sections in film bars:
// intro 0–6, main 6–38, interlude 38–46, main 46–62, climax 62–74, outro 74–82. SCRIPT.md has the full table.
const warm: [string, string, string] = [K.theme, K.steel, "#2a2f38"];
const dark: [string, string, string] = ["#1c2230", "#2a2f38", K.steel];

export const SCENES: Scene[] = [
  // Opening and 01 一块地: one continuous map camera, from the Futian night skyline to the parcel.
  { from: 0, to: 24, C: Act1, tin: "cut", pal: dark, flat: true },
  // 02 十年: the tower's design, skin, decade and money on one standing elevation.
  { from: 24, to: 34, C: Act2, tin: "fade", pal: warm },
  // 03 等人来: the city building at once, the empty quarter, rents halved, this tower's rent; fair play.
  { from: 34, to: 40, C: Act3, tin: "fade", pal: dark, flat: true },
  { from: 40, to: 42, C: Rent, tin: "fade", pal: warm },
  { from: 42, to: 44, C: OwnRent, tin: "slide", pal: warm },
  { from: 44, to: 46, C: Fair, tin: "fade", pal: [K.green, K.steel, "#2a2f38"] },
  // The one discovery on the biggest re-entry, on the same year axis as fair play.
  { from: 46, to: 51, C: Finding, tin: "cut", pal: [K.gold, K.theme, K.steel], accents: [0] },
  // 图什么: its own headquarters; half the new offices are companies building for themselves; not the rent.
  { from: 51, to: 54, C: Own, tin: "fade", pal: warm },
  { from: 54, to: 62, C: Act4, tin: "fade", pal: dark, flat: true },
  // 升华 on the climax: Futian lights up, the trains run, people walk in, back to the first shot.
  { from: 62, to: 74, C: Act5, tin: "cut", pal: [K.gold, K.theme, K.steel], flat: true },
  // Fixed end: sources → making-of → brand card.
  { from: 74, to: 76.5, C: Sources, tin: "fade", pal: dark },
  { from: 76.5, to: 78, C: Making, tin: "fade", pal: dark },
  { from: 78, to: 83, C: BrandCard, tin: "zoom", pal: [K.gold, K.steel, "#2a2f38"] },
];

export const FILM_FRAMES = MUSIC_END_FRAME;
export const BRAND_FROM = 78;

export const CHAPTERS = [
  { from: 8, to: 24, n: "1", t: "一块地" },
  { from: 24, to: 34, n: "2", t: "十年" },
  { from: 34, to: 51, n: "3", t: "等人来" },
];

export const sceneStart = (s: Scene, i: number) => (i === 0 ? 0 : barToFrame(s.from));
