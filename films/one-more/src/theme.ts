import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";

const inter = loadInter("normal", { weights: ["200", "300", "500", "700", "900"], subsets: ["latin"] });
const noto = loadNoto("normal", { weights: ["500", "700", "900"], ignoreTooManyRequestsWarning: true });
const serif = loadSerif("normal", { weights: ["600", "700", "900"], ignoreTooManyRequestsWarning: true });
const mono = loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] });

export const FONT = `${inter.fontFamily}, ${noto.fontFamily}, "PingFang SC", sans-serif`;
export const HAN = `${noto.fontFamily}, "PingFang SC", sans-serif`;
export const SERIF = `${serif.fontFamily}, serif`;
export const NUM = `${inter.fontFamily}, sans-serif`;
export const MONO = `${mono.fontFamily}, monospace`;

// Night palette. Two colours carry the film: 想要 (want) is a restless magenta, 喜欢 (like) a warm apricot.
// Game UI is cool cyan. 品牌金 only for the one discovery and the last line (DIRECTOR.md).
export const K = {
  bg: "#05070b",
  night: "#0a0f1c",
  deep: "#0e1528",
  fg: "#f4f0e8",
  sub: "#b8b8b3",
  muted: "#8a8a85",
  dim: "#3a3f4a",
  line: "rgba(244,240,232,0.16)",
  gold: "#ffd166",
  want: "#ff4f9a",
  wantHi: "#ffa3cd",
  wantLo: "#7a2350",
  like: "#ffb07a",
  likeHi: "#ffd8b8",
  likeLo: "#7a4a2c",
  cyan: "#6fd6ff",
  cyanHi: "#c8f0ff",
  cyanLo: "#24506a",
  know: "#dfe8ff",
  paper: "#f1ecdf",
  ink: "#19231f",
};
