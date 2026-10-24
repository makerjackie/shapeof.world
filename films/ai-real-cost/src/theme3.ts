export { FONT, MONO } from "./theme";

export const K = {
  bg: "#06060A",
  fg: "#F5F2EB",
  muted: "#8C8A96",
  dim: "#4A4955",
  line: "rgba(255,255,255,0.10)",
  claude: "#EE8A5E",
  claudeHi: "#FFC09A",
  deepseek: "#4F7BFF",
  deepseekHi: "#9DB6FF",
  gpt: "#1FC9A2",
  gemini: "#8AA6FF",
  qwen: "#A385FF",
  glm: "#4CC6FF",
  kimi: "#D6D8E0",
  grok: "#9AA0AD",
  minimax: "#FF6FA8",
  cursor: "#C9C9D6",
  copilot: "#B48CFF",
  gold: "#FFCB47",
  green: "#34E0A1",
  red: "#FF5A65",
  purple: "#9B7BFF",
  // "your time"
  time: "#B98CFF",
  timeHi: "#D9C2FF",
};

export type Glyph = "claude" | "deepseek" | "letter";
export type Model = { name: string; color: string; glyph: Glyph; letter?: string };

export const M = {
  opus: { name: "Claude Opus 5.5", color: K.claude, glyph: "claude" },
  sonnet: { name: "Claude Sonnet 5.5", color: K.claude, glyph: "claude" },
  fable: { name: "Claude Fable 5.1", color: K.claude, glyph: "claude" },
  haiku: { name: "Claude Haiku 5.5", color: K.claude, glyph: "claude" },
  dsflash: { name: "DeepSeek V4.1 Flash", color: K.deepseek, glyph: "deepseek" },
  dspro: { name: "DeepSeek V4 Pro", color: K.deepseek, glyph: "deepseek" },
  sol: { name: "GPT-6.1 Sol", color: K.gpt, glyph: "letter", letter: "G" },
  astra: { name: "GPT-6 Astra", color: K.gpt, glyph: "letter", letter: "G" },
  luna: { name: "GPT-6 Luna", color: K.gpt, glyph: "letter", letter: "G" },
  argon: { name: "Gemini 4 Argon", color: K.gemini, glyph: "letter", letter: "Ge" },
  qwen: { name: "Qwen3.8 Max", color: K.qwen, glyph: "letter", letter: "Q" },
  glm: { name: "GLM-5.3", color: K.glm, glyph: "letter", letter: "Z" },
  kimi: { name: "Kimi K3", color: K.kimi, glyph: "letter", letter: "K" },
  grok: { name: "Grok 4.7", color: K.grok, glyph: "letter", letter: "X" },
  minimax: { name: "MiniMax M3.1 Flash", color: K.minimax, glyph: "letter", letter: "M" },
} satisfies Record<string, Model>;

export type ModelKey = keyof typeof M;
