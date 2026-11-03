// Film7: an event's card lands line by line, one line per beat inside the event (the reference's rhythm).
// Shared by Engine7 (picture) and tools/cues6.mjs (sound), so picture and SFX hit the same beats.
import type { Beat, Placed } from "./time6";

export type Reveal = { title: number; num: number; sub: number };
export const revealOf = (e: Placed, beats: Beat[]): Reveal => {
  const inside = beats.filter((b) => b.t > e.t0 + 0.05 && b.t < e.t1 - 0.12).map((b) => b.t);
  // a card with no title shows its number on the first beat; otherwise the number lands one beat later
  const num = e.n && e.t ? inside[0] ?? e.t0 : e.t0;
  const after = inside.filter((x) => x > num + 0.01);
  const sub = e.s ? (num > e.t0 ? after[0] ?? num : inside[0] ?? e.t0) : e.t0;
  return { title: e.t0, num, sub };
};
