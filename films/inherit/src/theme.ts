import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";

const inter = loadInter("normal", { weights: ["500", "700", "900"], subsets: ["latin"] });
const noto = loadNoto("normal", { weights: ["500", "700", "900"], ignoreTooManyRequestsWarning: true });
const serif = loadSerif("normal", { weights: ["600", "700", "900"], ignoreTooManyRequestsWarning: true });

export const FONT = `${inter.fontFamily}, ${noto.fontFamily}, "PingFang SC", sans-serif`;
export const SERIF = `${serif.fontFamily}, serif`;
export const NUM = `${inter.fontFamily}, sans-serif`;
export const MONO = NUM;

// Old paper at night. Money is gold leaf; a family's standing is a warm inner light; what is lost turns to ash.
export const K = {
  bg: "#0b0907",
  deep: "#15110c",
  fg: "#f4ecdc",
  sub: "#c9bda6",
  muted: "#8d8273",
  dim: "#3b342c",
  line: "rgba(244,236,220,0.18)",
  gold: "#f0c062",
  goldHi: "#ffe3a3",
  goldLo: "#8a6424",
  warm: "#ffb36b",
  ash: "#5d564c",
  ashHi: "#8a8276",
  seal: "#b8392b",
  // kit.tsx compatibility
  want: "#f0c062",
};
