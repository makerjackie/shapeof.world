// The gold film's description, consumed by EngineG (the population Engine7, re-cut for a price line).
import type { Key, Music, Placed } from "./time6";

// a: annual average (1792-1967), m: monthly average (1968-2000), d: daily close (1980-01-21, 2000-08 on), p: a swing point
export type PtKind = "a" | "m" | "d" | "p";
export type Pt = { y: number; v: number; kind: PtKind }; // v in US$ per troy ounce
export type ColdLine = { t0: number; t1: number; a: string; b?: string; bBeats?: number; tone?: "gold" | "red" | "white" };
export type EndLine = { t0: number; t1: number; text: string; text2?: string; brush?: boolean; tone?: "gold" | "red" | "white" };
export type TableRow = { n: string; v: number; c: string; tag?: string };
export type Spec = {
  id: "gold";
  brand: string;
  series: Pt[];
  music: Music;
  events: Placed[];
  cold: {
    keys: Key[];
    crashes: { y: number; t: string; at: number; tone?: "gold" | "red"; p?: string }[]; // the spikes named on the beats
    lines: ColdLine[];
    rewind: [number, number];
    promise?: string;
    counter?: string;
    start?: string;
    soloLabels?: boolean;
    // optional cold-open marks (kept from Engine7, unused by the gold cut)
    mark?: { y: number; t0: number; t1: number; label?: string; tone?: "red" | "white" };
    ceiling?: { v: number; y0: number; y1: number; t0: number; peaks: [number, number][]; names: string[] };
    rings?: { y: number; t0: number; t1: number; label: string; tone?: "gold" | "white"; dx?: number; dy?: number }[];
    spans?: { y0: number; y1: number; t0: number; t1: number; label: string; tone?: "gold" | "white" }[];
  };
  dyn?: [number, number, string, 0 | 1 | 2][]; // monetary eras under the whole line
  body: [number, number];
  ending: {
    t0: number;
    lines: EndLine[];
    troughs: { y: number; t: string; dx?: number; dy?: number; tone?: "gold" | "red" }[]; // named points on the whole line
    card: number;
    credits?: { t0: number; title?: string; lines: string[] };
    slogan?: string;
    maker?: string;
  };
  era: (y: number) => string;
  kindLabel: Record<PtKind, string>;
  log: [number, number]; // value range of the log axis (cold open and ending)
  cny?: [number, number][]; // yuan per US$ (monthly), for the 元/克 chip
  cnyFrom?: number; // the chip shows from this year
  table?: (y: number) => TableRow[];
  tableTitle?: string;
  tableRows?: number;
  tableBack?: number; // years back for the change column
  tableFrom?: number; // the table shows from this year
  tableNote?: (y: number) => string | undefined;
  srcEnd?: string;
  src?: (y: number) => string;
  rewindLabel?: string;
  musicSrc?: string; // the score in public/
  noRiser?: boolean; // the score carries the rewind itself
  i18n?: Record<string, string>; // on-screen strings of the engine, translated (English cut)
  en?: boolean; // English cut: English dates and number formats
};
