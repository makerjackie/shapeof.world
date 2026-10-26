import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";

const inter = loadInter("normal", { weights: ["500", "700", "900"], subsets: ["latin"] });
const noto = loadNoto("normal", { weights: ["500", "700", "900"], ignoreTooManyRequestsWarning: true });
const serif = loadSerif("normal", { weights: ["600", "700", "900"], ignoreTooManyRequestsWarning: true });

export const FONT = `${inter.fontFamily}, ${noto.fontFamily}, "PingFang SC", sans-serif`;
export const SERIF = `${serif.fontFamily}, serif`;

// The film's colours. Window light is warm; the money is gold; the X-ray of the building's machinery is a cool
// cyan and its water a clear blue; votes use the usual green / red.
export const K = {
  bg: "#05070a",
  fg: "#f4f0e8",
  sub: "rgba(244,240,232,0.72)",
  lit: "#ffd9a0",
  gold: "#ffcf5a",
  cyan: "#7fe3ff",
  water: "#4fb4ff",
  green: "#3ddc97",
  red: "#ff5a5f",
  amber: "#ffb347",
  grey: "#8d949c",
};
