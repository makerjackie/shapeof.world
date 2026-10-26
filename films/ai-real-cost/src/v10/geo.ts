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
  mountainView: geo(37.39, -122.08),
  menloPark: geo(37.48, -122.15),
  beijing: geo(39.9, 116.4),
  hangzhou: geo(30.27, 120.15),
  shanghai: geo(31.23, 121.47),
  shenzhen: geo(22.54, 114.06),
};

const near = (c: [number, number], dx: number, dy: number): [number, number] => [c[0] + dx, c[1] + dy];

export type ColId = "chatgpt" | "claude" | "kimi" | "glm" | "deepseek";

export type ColDef = { id: string; name: string; model: string; at: [number, number]; color: string; side: "left" | "right"; w: number; bg?: boolean };

export const COL_W = 120; // footprint of the five protagonists, km
const BG_W = 70;

// Five flagships, each standing in its maker's city. Columns of one city stand side by side (positions are
// schematic: the real offices are a few kilometres apart).
export const COLS: (ColDef & { id: ColId })[] = [
  { id: "chatgpt", name: "ChatGPT", model: "GPT-6 Astra", at: near(CITY.sf, -220, 0), color: "#8fe3cf", side: "left", w: COL_W },
  { id: "claude", name: "Claude", model: "Opus 5.5", at: near(CITY.sf, 220, 0), color: "#ff9a5c", side: "right", w: COL_W },
  { id: "kimi", name: "Kimi", model: "K3.1 Pro", at: near(CITY.beijing, -220, 0), color: "#b29dff", side: "left", w: COL_W },
  { id: "glm", name: "智谱", model: "GLM-5.3", at: near(CITY.beijing, 220, 0), color: "#5cc8f2", side: "right", w: COL_W },
  { id: "deepseek", name: "DeepSeek", model: "V4.1 Flash", at: CITY.hangzhou, color: "#7290ff", side: "right", w: COL_W },
];

// The rest of the market, standing behind the protagonists like the city around the tower film's hero building:
// other models of the same makers and their neighbours, at their makers' cities (schematic offsets). Heights use
// Artificial Analysis cost per Intelligence Index task (2026-10), the same measure as the protagonists' second pass.
export const BG: (ColDef & { task: number })[] = [
  { id: "bg-fable", name: "Claude Fable 5.1", model: "", at: near(CITY.sf, 380, 260), color: "#c9a089", side: "right", w: BG_W, bg: true, task: 7.63 },
  { id: "bg-sonnet", name: "Claude Sonnet 5.5", model: "", at: near(CITY.sf, 520, -120), color: "#c9a089", side: "right", w: BG_W, bg: true, task: 5.46 },
  { id: "bg-sol", name: "GPT-6.1 Sol", model: "", at: near(CITY.sf, -420, 220), color: "#9cc7bd", side: "left", w: BG_W, bg: true, task: 0.72 },
  { id: "bg-gemini", name: "Gemini 4 Argon", model: "", at: near(CITY.mountainView, 120, -380), color: "#a4b3d6", side: "right", w: BG_W, bg: true, task: 1.99 },
  { id: "bg-geminiflash", name: "Gemini 3.8 Flash", model: "", at: near(CITY.mountainView, 380, -560), color: "#a4b3d6", side: "right", w: BG_W, bg: true, task: 1.24 },
  { id: "bg-muse", name: "Meta Muse Wonder", model: "", at: near(CITY.menloPark, -360, -330), color: "#b7b3c9", side: "left", w: BG_W, bg: true, task: 4.54 },
  { id: "bg-qwen", name: "通义千问 3.8 Max", model: "", at: near(CITY.hangzhou, -330, -160), color: "#b6a6d8", side: "left", w: BG_W, bg: true, task: 5.41 },
  { id: "bg-v4pro", name: "DeepSeek V4 Pro", model: "", at: near(CITY.hangzhou, 260, -260), color: "#93a2d6", side: "right", w: BG_W, bg: true, task: 0.67 },
  { id: "bg-mimo", name: "小米 MiMo", model: "", at: near(CITY.beijing, -480, 260), color: "#c7b49a", side: "left", w: BG_W, bg: true, task: 0.13 },
  { id: "bg-minimax", name: "MiniMax M3", model: "", at: near(CITY.shanghai, 330, 120), color: "#d6a3b8", side: "right", w: BG_W, bg: true, task: 0.51 },
  { id: "bg-minimaxflash", name: "MiniMax M3.1 Flash", model: "", at: near(CITY.shanghai, 520, -150), color: "#d6a3b8", side: "right", w: BG_W, bg: true, task: 0.22 },
];

export const ALL_COLS: ColDef[] = [...COLS, ...BG];

// The stage: mid-Pacific, where the five protagonists line up side by side whenever they are compared, so heights
// are read at one distance from the camera and the empty ocean carries the story.
export const STAGE: [number, number] = [0, 300];
export const STAGE_GAP = 640;
export const stageSlot = (i: number): [number, number] => [STAGE[0] + (i - 2) * STAGE_GAP, STAGE[1]];

// Output list price, $ per million tokens (official pages, 2026-10).
export const PRICE: Record<ColId, number> = { chatgpt: 50, claude: 20, kimi: 10, glm: 4.4, deepseek: 1.19 };
// Cost per Artificial Analysis Intelligence Index task at API prices, each at its strongest setting (2026-10).
export const TASK: Record<ColId, number> = { chatgpt: 3.26, claude: 5.98, kimi: 2.11, glm: 2.01, deepseek: 0.26 };
// The same task on a fully used subscription: API cost ÷ how many dollars of API usage the plan buys.
// Claude Max $200 → $11,726 (58.6×) and ChatGPT Pro $200 → $2,897 (14.5×, GPT-6 Astra), both SemiAnalysis,
// same method; Kimi's plans ≈ 2.8× (a blogger's measured quotas, 2026-10-24); GLM Coding Plan 4–13× (upper end);
// DeepSeek has no plan.
export const PLAN: Record<ColId, number> = { chatgpt: 0.22, claude: 0.1, kimi: 0.75, glm: 0.15, deepseek: 0.26 };
