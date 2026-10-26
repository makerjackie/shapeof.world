// The film's one world: the North Pacific at night. Map units are kilometres east (x) and north (y) of 180°E, 35°N
// on an equidistant cylindrical projection with standard parallel 35°, so scale is true along 35°N where both
// coasts sit. The night picture (public/v10/night.jpg, NASA Black Marble 2016) covers 60°E → 100°W, 5°S → 75°N.
export const K_LON = 111.32 * Math.cos((35 * Math.PI) / 180);
export const K_LAT = 111.32;

export const geo = (lat: number, lon: number): [number, number] => [((lon < 0 ? lon + 360 : lon) - 180) * K_LON, (lat - 35) * K_LAT];

export const MAP = { lon0: 60, lon1: 260, lat0: -5, lat1: 75 };
export const MAP_X0 = (MAP.lon0 - 180) * K_LON;
export const MAP_X1 = (MAP.lon1 - 180) * K_LON;
export const MAP_Y0 = (MAP.lat0 - 35) * K_LAT;
export const MAP_Y1 = (MAP.lat1 - 35) * K_LAT;

export const CITY = {
  sf: geo(37.77, -122.42),
  beijing: geo(39.9, 116.4),
  hangzhou: geo(30.27, 120.15),
  shanghai: geo(31.23, 121.47),
  shenzhen: geo(22.54, 114.06),
};

export type ColId = "chatgpt" | "claude" | "kimi" | "glm" | "deepseek";

// Five flagships, each standing in its maker's city. Columns of one city stand side by side (positions are
// schematic: the real offices are a few kilometres apart).
export const COLS: { id: ColId; name: string; model: string; at: [number, number]; color: string; side: "left" | "right" }[] = [
  { id: "chatgpt", name: "ChatGPT", model: "GPT-6 Astra", at: [CITY.sf[0] - 220, CITY.sf[1]], color: "#8fe3cf", side: "left" },
  { id: "claude", name: "Claude", model: "Opus 5.5", at: [CITY.sf[0] + 220, CITY.sf[1]], color: "#ff9a5c", side: "right" },
  { id: "kimi", name: "Kimi", model: "K3.1 Pro", at: [CITY.beijing[0] - 220, CITY.beijing[1]], color: "#b29dff", side: "left" },
  { id: "glm", name: "智谱", model: "GLM-5.3", at: [CITY.beijing[0] + 220, CITY.beijing[1]], color: "#5cc8f2", side: "right" },
  { id: "deepseek", name: "DeepSeek", model: "V4.1 Flash", at: [CITY.hangzhou[0], CITY.hangzhou[1]], color: "#7290ff", side: "right" },
];

export const COL_W = 120; // footprint, km

// Output list price, $ per million tokens (official pages, 2026-10).
export const PRICE: Record<ColId, number> = { chatgpt: 50, claude: 20, kimi: 10, glm: 4.4, deepseek: 1.19 };
// Cost per Artificial Analysis Intelligence Index task at API prices, each at its strongest setting (2026-10).
export const TASK: Record<ColId, number> = { chatgpt: 3.26, claude: 5.98, kimi: 2.11, glm: 2.01, deepseek: 0.26 };
// The same task on a fully used subscription: API cost ÷ how many dollars of API usage the plan buys.
// Both $200 plans by the same SemiAnalysis method (every weekly limit used up): Claude Max → $11,726 (58.6×),
// ChatGPT Pro → $2,897 (14.5×, GPT-6 Astra). GLM Coding Plan 4–13× (upper end shown); DeepSeek has no plan;
// Kimi publishes no quota and nobody has measured it, so its column keeps the pay-per-use price.
export const PLAN: Record<ColId, number> = { chatgpt: 0.22, claude: 0.1, kimi: 2.11, glm: 0.15, deepseek: 0.26 };
