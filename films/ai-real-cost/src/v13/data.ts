// v13 concept tests: three looks born from the topic itself (a price board, a taxi meter, a shelf of price tags),
// each telling the same 13 seconds so they can be compared: the list price per million tokens, then the cost of
// one hard task, with Claude and DeepSeek as the pair to watch. Data as of 2026-10 (SCRIPT.md).
import { Easing } from "remotion";

export type Id = "claude" | "chatgpt" | "kimi" | "glm" | "deepseek";
export const M: { id: Id; name: string; flap: string; model: string; color: string }[] = [
  { id: "claude", name: "Claude", flap: "CLAUDE", model: "Opus 5.5", color: "#ff7a45" },
  { id: "chatgpt", name: "ChatGPT", flap: "CHATGPT", model: "GPT-6 Astra", color: "#3fd0b0" },
  { id: "kimi", name: "Kimi", flap: "KIMI", model: "K3.1 Pro", color: "#a78bff" },
  { id: "glm", name: "智谱", flap: "智谱", model: "GLM-5.3", color: "#43c6f0" },
  { id: "deepseek", name: "DeepSeek", flap: "DEEPSEEK", model: "V4.1 Flash", color: "#3d8bff" },
];
export const PRICE: Record<Id, number> = { claude: 20, chatgpt: 50, kimi: 10, glm: 4.4, deepseek: 1.19 };
export const TASK: Record<Id, number> = { claude: 5.98, chatgpt: 3.26, kimi: 2.11, glm: 2.01, deepseek: 0.26 };
export const byValue = (v: Record<Id, number>) => [...M].sort((a, b) => v[a.id] - v[b.id]);
export const money = (v: number) => (v >= 10 ? `$${v.toFixed(0)}` : `$${v.toFixed(2)}`);

export const SAMPLE_S = 13.5;

export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ramp = (x: number, a: number, z: number, e: (v: number) => number = EIO) => e(clamp01((x - a) / (z - a)));
export const hash = (a: number, b = 0, c = 0) => {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1440670441);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
