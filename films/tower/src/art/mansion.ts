// 深圳能源大厦 (BIG + 深圳市建筑设计研究总院): two towers on a shared podium. Heights and floor counts follow CTBUH
// throughout (north 218 m / 43 floors above ground, south 111.3 m / 20 floors); the designer's page (SZAD) says
// 41 and 19 floors and 116 m for the south tower, see SCRIPT.md. Podium about 34.5 m / 6 floors (深圳能源 2010
// investment notice). Plan sizes come from the OSM footprints; floor heights between podium and roof are spread
// evenly, which is a drawing assumption.

export type TowerId = "N" | "S";

export type TowerSpec = {
  id: TowerId;
  height: number; // roof, m
  floors: number;
  podium: number; // floors inside the podium
  podiumH: number; // m
  crown: number; // m of parapet / crown above the top floor
};

export const TOWERS: Record<TowerId, TowerSpec> = {
  N: { id: "N", height: 218, floors: 43, podium: 6, podiumH: 34.5, crown: 8 },
  S: { id: "S", height: 111.3, floors: 20, podium: 6, podiumH: 34.5, crown: 5 },
};

// Bottom height (m) of floor `f` (1-based) in a tower; floorTop(t, f) = floorBase(t, f + 1).
export const floorBase = (t: TowerSpec, f: number) => {
  if (f <= 1) return 0;
  if (f <= t.podium + 1) return ((f - 1) / t.podium) * t.podiumH;
  const upper = t.floors - t.podium;
  return t.podiumH + ((f - 1 - t.podium) / upper) * (t.height - t.crown - t.podiumH);
};

// The folded skin: every bay is a fold, its glazed share changes slowly across the facade and up the floors, which
// reads as the "ripple" (涟漪) the designers describe. Returns the glazed fraction of bay `i` on floor `f`.
export const ripple = (i: number, f: number, face = 0) => {
  const a = Math.sin(i * 0.23 + f * 0.21 + face * 1.7);
  const b = Math.sin(i * 0.07 - f * 0.12 + face);
  return Math.max(0.1, Math.min(0.9, 0.5 + 0.3 * a + 0.12 * b));
};

export const FOLD = 1.6; // m, width of one fold (bay) in elevation
