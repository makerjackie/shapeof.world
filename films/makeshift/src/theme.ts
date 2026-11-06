import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";

const inter = loadInter("normal", { weights: ["300", "500", "700", "900"], subsets: ["latin"] });
const noto = loadNoto("normal", { weights: ["500", "700", "900"], ignoreTooManyRequestsWarning: true });
const serif = loadSerif("normal", { weights: ["600", "700", "900"], ignoreTooManyRequestsWarning: true });
const mono = loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] });

export const FONT = `${inter.fontFamily}, ${noto.fontFamily}, "PingFang SC", sans-serif`;
export const HAN = `${noto.fontFamily}, "PingFang SC", sans-serif`;
export const SERIF = `${serif.fontFamily}, serif`;
export const NUM = `${inter.fontFamily}, sans-serif`;
export const MONO = `${mono.fontFamily}, monospace`;

// The backstage at night: a dark room lit by one spreadsheet. The sheet is paper-white with the familiar green
// selection; errors are red; the patches (tape, checklists) are warm yellow. 品牌金 only for the one discovery and the
// last line (DIRECTOR.md).
export const K = {
  bg: "#07080a",
  room: "#0d0f12",
  fg: "#f4f0e8",
  sub: "#b8b8b3",
  muted: "#8a8a85",
  line: "rgba(244,240,232,0.16)",
  gold: "#ffd166",
  // the sheet
  paper: "#fbfbf7",
  grid: "#dfe1dc",
  head: "#eef0ec",
  headText: "#5d635e",
  ink: "#1d2420",
  green: "#1f8a52",
  greenHi: "#2fbf72",
  sel: "rgba(31,138,82,0.10)",
  // meaning
  err: "#ff4d4d",
  errLo: "#ffd9d6",
  tape: "#f2c94c",
  ok: "#3ddc84",
  front: "#6fb7ff",
};
