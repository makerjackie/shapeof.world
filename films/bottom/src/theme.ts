import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";

const inter = loadInter("normal", { weights: ["300", "500", "700", "900"], subsets: ["latin"] });
const noto = loadNoto("normal", { weights: ["500", "700", "900"], ignoreTooManyRequestsWarning: true });
const serif = loadSerif("normal", { weights: ["600", "700", "900"], ignoreTooManyRequestsWarning: true });

export const FONT = `${inter.fontFamily}, ${noto.fontFamily}, "PingFang SC", sans-serif`;
export const SERIF = `${serif.fontFamily}, serif`;
export const NUM = `${inter.fontFamily}, sans-serif`;

// A city at night. Windows are warm (房租, what a home earns today); the line is ice blue (what owning it costs a year);
// 期待 is a pale violet glow. Falling prices are a cool slate-blue, rising ones warm amber (no red/green: the two read
// opposite ways in China and abroad). Gold only for the one discovery and the last line.
export const K = {
  bg: "#04060b",
  sky0: "#060a16",
  sky1: "#0d1730",
  sky2: "#1b2445",
  fg: "#f4f0e8",
  sub: "#b9bcc6",
  muted: "#7f8494",
  dim: "#2a3042",
  line: "rgba(244,240,232,0.16)",
  win: "#ffc77a",
  winHi: "#ffe3b3",
  winLo: "#6b4a26",
  tower: "#141b2e",
  towerHi: "#222c46",
  ice: "#7fd8ff",
  iceHi: "#d4f3ff",
  hope: "#b7a3ff",
  hopeHi: "#e2d9ff",
  down: "#7f9cc9",
  up: "#ffb347",
  gold: "#ffd166",
  card: "#f6f3ec",
  ink: "#1b1f2a",
  tag: "#ff6a3d",
};
