import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";

const inter = loadInter("normal", { weights: ["500", "700", "900"], subsets: ["latin"] });
const noto = loadNoto("normal", { weights: ["500", "700", "900"], ignoreTooManyRequestsWarning: true });
const serif = loadSerif("normal", { weights: ["600", "700"], ignoreTooManyRequestsWarning: true });
const mono = loadMono("normal", { weights: ["500"], subsets: ["latin"] });

export const FONT = `${inter.fontFamily}, ${noto.fontFamily}, sans-serif`;
export const SERIF = `${serif.fontFamily}, serif`;
export const MONO = `${mono.fontFamily}, monospace`;

// Series palette (STYLE.md). The footage brings its own colour; the film only adds paper white and 品牌金.
export const K = {
  fg: "#f4f0e8",
  sub: "#b8b8b3",
  muted: "#8a8a85",
  gold: "#ffd166",
};
