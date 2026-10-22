import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";

const inter = loadInter("normal", { weights: ["500", "700", "900"], subsets: ["latin"] });
const noto = loadNoto("normal", { weights: ["500", "700", "900"], ignoreTooManyRequestsWarning: true });
const serif = loadSerif("normal", { weights: ["500", "700", "900"], ignoreTooManyRequestsWarning: true });
const mono = loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] });

export const FONT = `${inter.fontFamily}, ${noto.fontFamily}, "Microsoft YaHei", sans-serif`;
export const SERIF = `${serif.fontFamily}, serif`;
export const MONO = `${mono.fontFamily}, monospace`;

// Series palette (STYLE.md 一、2). Theme colour for this film: AI 紫, only on what the AI does (the answer column,
// agents, tokens). The exam paper is 纸色 with 墨色 print. 品牌金 is kept for the one discovery and the last line;
// green/red only mean passed/good and rejected/bad (the grading marks).
export const K = {
  bg: "#07090b",
  fg: "#f4f0e8",
  sub: "#b8b8b3",
  muted: "#8a8a85",
  dim: "#3c3e40",
  line: "rgba(244,240,232,0.12)",
  gold: "#ffd166",
  paper: "#f1ecdf",
  paperHi: "#f8f4ec",
  paperLo: "#e2dbca",
  ink: "#19231f",
  inkSoft: "#4d5852",
  inkFaint: "rgba(25,35,31,0.42)",
  ai: "#9b87ff",
  aiHi: "#c9bdff",
  aiInk: "#6a55e8",
  theme: "#9b87ff",
  themeHi: "#c9bdff",
  green: "#3ddc97",
  greenInk: "#178a55",
  red: "#ff5a5f",
  redInk: "#cf3439",
  cloth: "#25385a",
};

export const C = K;
