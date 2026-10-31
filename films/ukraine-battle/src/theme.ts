import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";

const inter = loadInter("normal", { weights: ["300", "500", "700", "900"], subsets: ["latin"] });
const noto = loadNoto("normal", { weights: ["400", "500", "700", "900"], ignoreTooManyRequestsWarning: true });
const serif = loadSerif("normal", { weights: ["600", "700", "900"], ignoreTooManyRequestsWarning: true });
const mono = loadMono("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });

export const FONT = `${inter.fontFamily}, ${noto.fontFamily}, "PingFang SC", sans-serif`;
export const HAN = `${noto.fontFamily}, "PingFang SC", sans-serif`;
export const SERIF = `${serif.fontFamily}, serif`;
export const NUM = `${inter.fontFamily}, sans-serif`;
export const MONO = `${mono.fontFamily}, ${noto.fontFamily}, monospace`;

// Night palette. The two sides get neutral colours (no flags, no "enemy red"): Ukraine-held = teal, Russia-held = amber.
export const K = {
  bg: "#05070a",
  fg: "#f2efe8",
  sub: "#b9b7b0",
  muted: "#85847f",
  line: "rgba(242,239,232,0.18)",
  ua: "#45d6c8",
  uaHi: "#a6fff4",
  ru: "#f2a33a",
  ruHi: "#ffd59a",
  hot: "#ffffff",
  warn: "#ff6a4d",
  gold: "#ffd166",
};
