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
// other models of the same makers and their neighbours, at their makers' cities (schematic offsets). Heights are
// output list prices per million tokens (OpenRouter, 2026-10-26); they are background, never discussed.
const bg = (id: string, name: string, at: [number, number], price: number, color: string): ColDef & { price: number } => ({
  id: `bg-${id}`,
  name,
  model: "",
  at,
  color,
  side: "right",
  w: BG_W,
  bg: true,
  price,
});
const US = "#b9b2a6";
const CN = "#a9b2c8";
export const BG: (ColDef & { price: number })[] = [
  bg("fable", "Claude Fable 5.1", near(CITY.sf, 609, 435), 50, US),
  bg("sonnet", "Claude Sonnet 5.5", near(CITY.sf, 870, -116), 10, US),
  bg("haiku", "Claude Haiku 5.5", near(CITY.sf, 551, -478), 0.5, US),
  bg("sol", "GPT-6.1 Sol", near(CITY.sf, -682, 377), 10, US),
  bg("luna", "GPT-6 Luna", near(CITY.sf, -899, -87), 0.5, US),
  bg("gemini", "Gemini 4 Argon", near(CITY.mountainView, 203, -609), 10, US),
  bg("geminiflash", "Gemini 3.8 Flash", near(CITY.mountainView, 624, -899), 4.1, US),
  bg("muse", "Meta Muse Wonder", near(CITY.menloPark, -609, -551), 20, US),
  bg("musespark", "Meta Muse Spark", near(CITY.menloPark, -232, -928), 4.3, US),
  bg("grok", "Grok 4.7", near(CITY.sf, -377, 812), 6, US),
  bg("nova", "Amazon Nova Premier", geo(47.61, -122.33), 12.5, US),
  bg("doubao", "豆包 Seed 2.1", near(CITY.beijing, -754, 464), 2.5, CN),
  bg("doubaocode", "豆包 Seed Code", near(CITY.beijing, -1102, 116), 3.0, CN),
  bg("k27", "Kimi K2.7 Code", near(CITY.beijing, -435, 754), 3.35, CN),
  bg("glmflash", "智谱 GLM Flash", near(CITY.beijing, 667, 493), 0.5, CN),
  bg("mimo", "小米 MiMo", near(CITY.beijing, 87, 928), 0.87, CN),
  bg("longcat", "美团 LongCat", near(CITY.beijing, 928, 87), 1.2, CN),
  bg("qwen", "通义千问 3.8 Max", near(CITY.hangzhou, -522, -246), 6, CN),
  bg("qwenplus", "通义千问 3.7 Plus", near(CITY.hangzhou, -812, 174), 1.28, CN),
  bg("qwenflash", "通义千问 3.8 Flash", near(CITY.hangzhou, -290, -624), 0.47, CN),
  bg("v4pro", "DeepSeek V4 Pro", near(CITY.hangzhou, 362, -435), 1.98, CN),
  bg("minimax", "MiniMax M3", near(CITY.shanghai, 522, 261), 1.2, CN),
  bg("minimaxflash", "MiniMax M3.1 Flash", near(CITY.shanghai, 812, -174), 0.6, CN),
  bg("step", "阶跃 Step 5", near(CITY.shanghai, 478, -551), 2.7, CN),
  bg("hy4", "腾讯混元 Hy4", near(CITY.shenzhen, 377, 174), 2.5, CN),
  bg("hy3", "腾讯混元 Hy3", near(CITY.shenzhen, -290, 377), 0.53, CN),
];

// Two columns that appear once: the opening's $200-a-month subscriber in San Francisco, and GPT-4 in 2023.
export const HOOK_COL: ColDef = { id: "hook", name: "", model: "", at: near(CITY.sf, 0, -40), color: "#ffc857", side: "right", w: 140 };
export const GPT4_COL: ColDef = { id: "gpt4", name: "GPT-4", model: "", at: near(CITY.sf, -60, 120), color: "#e8e2d4", side: "right", w: 140 };

export const ALL_COLS: ColDef[] = [...COLS, ...BG, HOOK_COL, GPT4_COL];

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
