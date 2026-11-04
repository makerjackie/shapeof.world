// Shared film description consumed by Engine6 (one engine, two films).
import type { Key, Music, Placed } from "./time6";

export type PtKind = "rec" | "est" | "stat" | "un";
export type Pt = { y: number; v: number; kind: PtKind }; // v in 万人
export type ColdLine = { t0: number; t1: number; a: string; b?: string; bBeats?: number; tone?: "gold" | "red" | "white" };
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
    mark?: { y: number; t0: number; t1: number; label?: string; tone?: "red" | "white" }; // a ring on one point
    ceiling?: { v: number; y0: number; y1: number; t0: number; peaks: [number, number][]; names: string[] }; // a dashed level the old peaks stay under
    cam?: { lon: number; lat: number; z: number }; // the fixed map camera of the cold open
    start?: string; // the label on the first point (default "公元 2 年")
    soloLabels?: boolean; // only the newest catastrophe keeps its label (the rest stay as dots), kept inside the safe area
    rings?: { y: number; t0: number; t1: number; label: string; tone?: "gold" | "white"; dx?: number; dy?: number }[]; // rings on points with a value
    spans?: { y0: number; y1: number; t0: number; t1: number; label: string; tone?: "gold" | "white" }[]; // time brackets under the line
    maps?: [number, string, boolean?][]; // cold-open territory cues: film time, map key, split (jolt + cracks)
    mapYears?: [number, string][]; // era start year -> map key (the rewind runs these backwards)
  };
  dyn?: [number, number, string, 0 | 1 | 2][]; // dynasties under the whole line: 1 = one realm, 0 = split / chaos, 2 = modern
  body: [number, number]; // film seconds
  ending: { t0: number; lines: EndLine[]; troughs: { y: number; t: string; dx?: number }[]; card: number };
  era: (y: number) => string; // the small line under the brand (dynasty / era)
  kindLabel: Record<PtKind, string>;
  mapOff: number; // year after which the territory map is gone (modern borders are never drawn)
  map: { lon: number; lat: number; zoom: number }; // default map camera
  table?: (y: number) => { n: string; v: number; c: string; tag?: string }[]; // top-right table (world: countries, ranked live)
  tableTitle?: string;
  tableRows?: number;
  sfxGain?: number;
  noRiser?: boolean; // no riser SFX under the rewind
  tableOn?: (e: { k: string; table?: boolean }) => boolean; // when the region table shows (default: always)
  hush?: [number, number][]; // SOURCE seconds where the music sinks low and the SFX go quiet
  solemnFrom?: number; // wars from this year on: a bell instead of drums and hits
  rests?: number[]; // event years whose card lands on one bar of silence
  noGapChip?: boolean; // the header chip never says "两次统计相隔 N 年" (estimates, not counts)
  srcEnd?: string; // the source line under the ending
  src?: (y: number) => string; // the source of the count the head last passed
};
