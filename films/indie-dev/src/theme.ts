import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";

const inter = loadInter("normal", { weights: ["500", "700", "900"], subsets: ["latin"] });
const noto = loadNoto("normal", { weights: ["500", "700", "900"], ignoreTooManyRequestsWarning: true });
const serif = loadSerif("normal", { weights: ["600", "700"], ignoreTooManyRequestsWarning: true });
const mono = loadMono("normal", { weights: ["700"], subsets: ["latin"] });

export const FONT = `${inter.fontFamily}, ${noto.fontFamily}, "Microsoft YaHei", sans-serif`;
export const SERIF = `${serif.fontFamily}, serif`;
export const MONO = `${mono.fontFamily}, monospace`;

// Series palette (STYLE.md 一、2). Theme colour for this film: 屏幕蓝, on the product tiles, the spotlight and
// the chapter tags. 品牌金 is kept for the one discovery and the last line; green/red only mean earned/up and
// lost/down.
export const K = {
  bg: "#07090b",
  fg: "#f4f0e8",
  sub: "#b8b8b3",
  muted: "#8a8a85",
  dim: "#3c3e40",
  line: "rgba(244,240,232,0.12)",
  gold: "#ffd166",
  paper: "#f1ecdf",
  ink: "#19231f",
  theme: "#6ea8ff",
  themeHi: "#a9ccff",
  night: "#1a2230",
  slate: "#2a2f38",
  sleep: "#2b313b",
  green: "#3ddc97",
  red: "#ff5a5f",
};

export const C = K;
