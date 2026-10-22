// Map data in local metres (x east, y north) around ORIGIN, built by tools/geo-prep.mjs from data/*.geojson:
// - world.json: Pearl River Delta cities (DataV.GeoAtlas, Guangdong + Hong Kong + Macau) and Shenzhen districts.
// - city.json: Futian CBD roads, metro, stations, buildings (© OpenStreetMap contributors, ODbL) and the tower.
import city from "./city.json";
import world from "./world.json";

export type Poly = { name?: string; rings: number[][]; bbox: number[]; c: [number, number] };
export type Line = { name?: string; cls?: string; ref?: string; pts: number[]; bbox: number[] };
export type Bldg = { h: number; ring: number[]; bbox: number[]; cx: number; cy: number; name?: string };
export type Pt = { name: string; x: number; y: number; ref?: string };

export const ORIGIN = world.origin as [number, number];

export const WORLD = world as unknown as { origin: [number, number]; prd: Poly[]; sz: Poly[] };

export const CITY = city as unknown as {
  roads: Line[];
  metro: Line[];
  stations: Pt[];
  buildings: Bldg[];
  pois: Pt[];
  hero: { N: number[]; S: number[]; podium: number[]; parcel: number[] };
};

const KX = 111320 * Math.cos((22.54 * Math.PI) / 180);
const KY = 110574;

// lon/lat → local metres (same equirectangular projection as the prep script).
export const ll = (lon: number, lat: number): [number, number] => [(lon - ORIGIN[0]) * KX, (lat - ORIGIN[1]) * KY];

export const poi = (name: string): Pt => {
  const p = CITY.pois.find((q) => q.name === name) ?? CITY.stations.find((q) => q.name === name);
  if (!p) throw new Error(`poi ${name} missing`);
  return p;
};

export const district = (name: string): Poly => {
  const d = WORLD.sz.find((q) => q.name === name) ?? WORLD.prd.find((q) => q.name === name);
  if (!d) throw new Error(`area ${name} missing`);
  return d;
};
