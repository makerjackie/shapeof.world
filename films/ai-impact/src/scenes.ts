import React from "react";
import { ChinaAnswer, ChipWall, Memory, Squeeze } from "./scenes/chips";
import { Bold, Fan, Ruler } from "./scenes/future";
import { Claim, Shape, TitleCard, Why } from "./scenes/hook";
import { AiCuts, Devs, Fair, Scissor } from "./scenes/jobs";
import { Capex, Losers, Nvidia, StackOverflow, Valuations } from "./scenes/money";
import { BrandCard, Cohort, Final, Making, NewHire, Rerouted, Sources } from "./scenes/coda";
import { Capability, Content, Science, Users } from "./scenes/people";
import { Grid, Nuclear } from "./scenes/power";
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

// Film bars (1 bar = 4 beats ≈ 2.15 s, bar 0 at 0.487 s). Film bar b plays track bar b until bar 32, then b − 8
// (timing.ts): the title lands on track bar 8 (main section), the breakdown is film 48–56, the reveal is film 56
// (track 48, the music's biggest re-entry), the coda is film 72–84 (track 64–76, the peak), the end 84–91.5.
const money: [string, string, string] = [K.money, "#3a2a1a", K.chip];
const chip: [string, string, string] = [K.chip, "#16303a", K.power];
const power: [string, string, string] = [K.power, "#251d3a", K.chip];
const people: [string, string, string] = [K.theme, K.work, "#1c2230"];
const work: [string, string, string] = [K.work, "#331a2a", K.power];
const dark: [string, string, string] = ["#1c2230", "#2a2f38", K.theme];
const gold: [string, string, string] = [K.gold, K.work, K.theme];

export const SCENES: Scene[] = [
  { from: 0, to: 3, C: Claim, tin: "cut", pal: [K.money, K.power, K.work] },
  { from: 3, to: 6, C: Shape, tin: "zoom", pal: [K.money, K.chip, K.work] },
  { from: 6, to: 8, C: Why, tin: "slide", pal: [K.chip, K.power, K.work] },
  { from: 8, to: 10, C: TitleCard, tin: "zoom", pal: [K.theme, K.money, K.power], accents: [0] },
  // 01 钱
  { from: 10, to: 13, C: Capex, tin: "up", pal: money },
  { from: 13, to: 16, C: Nvidia, tin: "up", pal: money },
  { from: 16, to: 18, C: Valuations, tin: "slide", pal: money },
  { from: 18, to: 20, C: StackOverflow, tin: "up", pal: [K.chip, "#16303a", K.money] },
  { from: 20, to: 22, C: Losers, tin: "zoom", pal: [K.red, "#3a1a1a", K.money] },
  // 02 芯片
  { from: 22, to: 25, C: Memory, tin: "up", pal: chip },
  { from: 25, to: 27, C: Squeeze, tin: "slide", pal: [K.red, K.chip, "#16303a"] },
  { from: 27, to: 30, C: ChipWall, tin: "zoom", pal: chip },
  { from: 30, to: 32, C: ChinaAnswer, tin: "slide", pal: [K.chip, K.red, "#16303a"] },
  // 03 电 (the eight repeated bars of the track start at film bar 32)
  { from: 32, to: 35, C: Grid, tin: "up", pal: power },
  { from: 35, to: 38, C: Nuclear, tin: "slide", pal: power },
  // 04 人
  { from: 38, to: 41, C: Capability, tin: "up", pal: people },
  { from: 41, to: 44, C: Users, tin: "slide", pal: people },
  { from: 44, to: 46, C: Content, tin: "zoom", pal: people },
  { from: 46, to: 48, C: Science, tin: "slide", pal: people },
  // Fair play on the breakdown
  { from: 48, to: 52, C: Fair, tin: "fade", pal: [K.green, K.work, "#1c2230"] },
  { from: 52, to: 56, C: AiCuts, tin: "slide", pal: [K.red, K.work, "#1c2230"] },
  // The one discovery on the biggest re-entry
  { from: 56, to: 60, C: Scissor, tin: "zoom", pal: gold, accents: [0] },
  { from: 60, to: 62, C: Devs, tin: "slide", pal: gold },
  // 05 下一个四年
  { from: 62, to: 66, C: Fan, tin: "up", pal: [K.theme, K.money, K.power] },
  { from: 66, to: 69, C: Ruler, tin: "slide", pal: [K.theme, K.money, "#1c2230"] },
  { from: 69, to: 72, C: Bold, tin: "zoom", pal: [K.theme, K.work, K.money] },
  // Coda on the peak
  { from: 72, to: 75, C: Cohort, tin: "up", pal: gold, accents: [0] },
  { from: 75, to: 78, C: Rerouted, tin: "fade", pal: gold },
  { from: 78, to: 81, C: NewHire, tin: "fade", pal: gold },
  { from: 81, to: 84, C: Final, tin: "zoom", pal: gold },
  // Fixed end: sources → making-of → brand card
  { from: 84, to: 86.5, C: Sources, tin: "fade", pal: dark },
  { from: 86.5, to: 88, C: Making, tin: "fade", pal: dark },
  { from: 88, to: 91.5, C: BrandCard, tin: "zoom", pal: [K.gold, K.theme, "#2a2f38"] },
];

export const FILM_FRAMES = barToFrame(91.5) + 15;

export const CHAPTERS = [
  { from: 10, to: 22, n: "1", t: "钱", c: K.money },
  { from: 22, to: 32, n: "2", t: "芯片", c: K.chip },
  { from: 32, to: 38, n: "3", t: "电", c: K.power },
  { from: 38, to: 48, n: "4", t: "人", c: K.fg },
  { from: 48, to: 62, n: "5", t: "工作", c: K.work },
  { from: 62, to: 72, n: "6", t: "下一个四年", c: K.theme },
];
