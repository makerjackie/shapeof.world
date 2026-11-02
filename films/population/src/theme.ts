import { loadFont as loadBarlow } from "@remotion/google-fonts/BarlowSemiCondensed";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const barlow = loadBarlow("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] });
const noto = loadNoto("normal", { weights: ["500", "700", "900"], ignoreTooManyRequestsWarning: true });
const inter = loadInter("normal", { weights: ["500", "700"], subsets: ["latin"] });

export const FONT_NUM = `${barlow.fontFamily}, ${noto.fontFamily}, sans-serif`;
export const FONT_CN = `${noto.fontFamily}, "PingFang SC", sans-serif`;
export const FONT_LAT = `${inter.fontFamily}, ${noto.fontFamily}, sans-serif`;

// Chinese market colours: red = up (more), green = down (fewer).
export const C = {
  bg: "#040507",
  fg: "#f3f4f7",
  sub: "#a9b0bf",
  muted: "#6c7383",
  up: "#ff3b57",
  upHi: "#ff7b8e",
  down: "#19e38a",
  downHi: "#7dffc0",
  gold: "#ffcf5c",
  blue: "#6cc4ff",
  panel: "rgba(14,16,22,0.72)",
};
