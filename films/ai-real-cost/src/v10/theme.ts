// Type and colour of v10: the same family as the tower film (films/tower/src/theme.ts), so the series reads as
// one brand. Model columns carry their own colours (geo.ts); gold is kept for the one discovery and the last line.
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

export const K = {
  bg: "#05070b",
  fg: "#f4f0e8",
  sub: "#c4c2bc",
  muted: "#8a8a85",
  gold: "#ffd166",
  green: "#3ddc97",
  red: "#ff5a5f",
};
