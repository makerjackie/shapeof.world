// The film's one coordinate frame: metres east (x) and north (y) of 47.42 N, 35.86 E (between Robotyne and Mala
// Tokmachka), equirectangular with the cosine of 47.42°. Same frame as tools/prep_field.py and tools/prep_ukraine.py.
export const LAT0 = 47.42;
export const LON0 = 35.86;
export const KX = 111320 * Math.cos((LAT0 * Math.PI) / 180);
export const KY = 110574;
export const ll = (lon: number, lat: number): [number, number] => [(lon - LON0) * KX, (lat - LAT0) * KY];
export const toLL = (x: number, y: number): [number, number] => [LON0 + x / KX, LAT0 + y / KY];

// Battlefield DEM / imagery window (prep_field.py, warp.py): x −20..20 km, y −22..22 km.
export const FIELD = { x0: -20000, x1: 20000, y0: -22000, y1: 22000 };

const k = (x: number, y: number): [number, number] => [x * 1000, y * 1000];

// Villages and towns (OSM place nodes).
export const PLACE = {
  orikhiv: k(-5.608, 17.188),
  mala: k(2.772, 12.46),
  novodanylivka: k(-2.647, 11.021),
  robotyne: k(-2.556, 2.552),
  novoprokopivka: k(-2.116, 0.009),
  verbove: k(9.831, 0.882),
  kopani: k(-9.486, 4.944),
  tokmak: k(-11.357, -18.243),
  novopokrovka: k(9.625, 9.348),
};

// Country-scale cities (lon, lat).
export const CITIES: { n: string; p: [number, number]; big?: boolean }[] = [
  { n: "基辅", p: ll(30.52, 50.45), big: true },
  { n: "哈尔科夫", p: ll(36.23, 49.99) },
  { n: "顿涅茨克", p: ll(37.8, 48.0) },
  { n: "扎波罗热", p: ll(35.14, 47.84) },
  { n: "赫尔松", p: ll(32.62, 46.64) },
  { n: "敖德萨", p: ll(30.73, 46.48) },
  { n: "利沃夫", p: ll(24.03, 49.84) },
  { n: "马里乌波尔", p: ll(37.55, 47.1) },
];
export const COUNTRY_LABELS: { n: string; p: [number, number] }[] = [
  { n: "俄罗斯", p: ll(40.2, 51.6) },
  { n: "白俄罗斯", p: ll(27.6, 52.9) },
  { n: "波兰", p: ll(20.6, 51.4) },
  { n: "罗马尼亚", p: ll(24.6, 46.0) },
  { n: "黑海", p: ll(32.6, 43.6) },
];

// ---- Fronts in the field (our own generalised sketches, 示意; after ISW maps and the 2023 Sentinel-2 imagery) ----
const line = (pts: [number, number][]) => pts.map(([x, y]) => k(x, y));
// Early June 2023: south of Mala Tokmachka / Novodanylivka.
export const FRONT_JUN23 = line([[-21, 9.6], [-14, 10.1], [-9, 9.7], [-6, 9.2], [-3, 8.9], [0, 9.0], [2.5, 9.4], [5, 10.0], [7.5, 10.2], [10, 10.4], [13, 10.8], [16, 11.0], [21, 11.4]]);
// November 2023: the Robotyne salient, up to the anti-tank line west of Verbove.
export const FRONT_NOV23 = line([[-21, 9.6], [-14, 10.1], [-9, 9.7], [-6.6, 8.6], [-5.6, 6.2], [-4.6, 3.6], [-3.6, 1.6], [-2.4, 1.2], [-0.6, 1.5], [1.6, 1.9], [4.0, 2.5], [6.4, 2.9], [8.4, 2.6], [9.2, 4.2], [9.5, 7.0], [10.3, 9.8], [13, 10.8], [16, 11.0], [21, 11.4]]);
// 2026: Robotyne behind the Russian line; the fight at the southern edge of Mala Tokmachka.
export const FRONT_2026 = line([[-21, 10.4], [-14, 10.9], [-9, 10.6], [-5, 10.7], [-2, 10.9], [0.5, 11.6], [2.5, 11.9], [5, 11.7], [7.5, 11.6], [10, 11.9], [13, 12.2], [16, 12.6], [21, 13.2]]);

// ---- Russian defences (示意): traced from Sentinel-2 2023-06-05 where the ditches show, sketched where they don't ----
// Forward line: trenches in the tree belts some 2.5–3 km in front of Robotyne.
export const TRENCH_1 = line([[-9.5, 7.6], [-7.6, 7.3], [-6.0, 6.9], [-4.4, 6.5], [-2.8, 6.3], [-1.2, 6.2], [0.4, 6.35], [2.0, 6.5], [3.6, 6.7], [5.2, 7.0], [6.8, 7.3], [8.4, 7.6], [9.6, 8.0]]);
// Minefield belt in front of the forward line (north of it), later deepened from 120 m to 500 m.
export const MINE_BELT = line([[-9.5, 8.0], [-7.6, 7.75], [-6.0, 7.35], [-4.4, 6.95], [-2.8, 6.75], [-1.2, 6.65], [0.4, 6.8], [2.0, 6.95], [3.6, 7.15], [5.2, 7.45], [6.8, 7.75], [8.4, 8.05], [9.6, 8.45]]);
// Main line: anti-tank ditch + dragon's teeth + trench, traced south of Robotyne towards Verbove.
export const MAIN_LINE = line([[-12.0, -4.5], [-8.1, -4.4], [-8.0, -2.7], [-5.0, -3.0], [-2.0, -3.1], [-1.0, -2.9], [1.5, -1.7], [4.0, -1.2], [6.6, -1.5], [8.4, -0.8], [9.1, 0.6], [9.4, 2.4], [10.2, 4.2], [11.6, 5.6]]);
// Third line north of Tokmak (traced).
export const THIRD_LINE = line([[-10.6, -12.0], [-7.8, -11.8], [-5.0, -12.4], [-2.4, -12.6], [-0.4, -12.0], [0.6, -10.8], [1.8, -10.6], [4.0, -10.4]]);

// The 8 June 2023 lane: south from the front towards Robotyne (示意 position).
export const LANE = { x: 1000, y0: 9400, y1: 6500 };
