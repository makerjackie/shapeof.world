// Shared film description consumed by Engine6 (one engine, two films).
import type { Key, Music, Placed } from "./time6";

export type PtKind = "rec" | "est" | "stat" | "un";
export type Pt = { y: number; v: number; kind: PtKind }; // v in 万人
export type ColdLine = { t0: number; t1: number; a: string; b?: string; tone?: "gold" | "red" | "white" };
export type EndLine = { t0: number; t1: number; text: string; text2?: string; brush?: boolean; tone?: "gold" | "red" | "white" };
export type Spec = {
  id: "china" | "world";
  brand: string;
  series: Pt[];
  music: Music;
  events: Placed[];
  cold: {
    keys: Key[]; // cursor keys of the cold open (film seconds)
    crashes: { y: number; t: string; at: number; tone?: "gold" | "red"; p?: string }[]; // labels popping on beats
    lines: ColdLine[];
    rewind: [number, number];
    promise?: string; // the line under the big title
    counter?: string; // the cold-open counter label ("次人口大跌")
    mark?: { y: number; t0: number; t1: number }; // a calm ring on one point (the turn now)
  };
  dyn?: [number, number, string, 0 | 1 | 2][]; // dynasties under the whole line: 1 = one realm, 0 = split / chaos, 2 = modern
  body: [number, number]; // film seconds
  ending: { t0: number; lines: EndLine[]; troughs: { y: number; t: string; dx?: number }[]; card: number };
  era: (y: number) => string; // the small line under the brand (dynasty / era)
  kindLabel: Record<PtKind, string>;
  mapOff: number; // year after which the territory map is gone (modern borders are never drawn)
  map: { lon: number; lat: number; zoom: number }; // default map camera
  table?: (y: number) => { n: string; v: number; c: string }[]; // top-right table (world: regions)
  sfxGain?: number;
  src?: (y: number) => string; // the source of the count the head last passed
};
