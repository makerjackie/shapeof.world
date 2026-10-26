import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";
import { loadFont as loadLongCang } from "@remotion/google-fonts/LongCang";
import { loadFont as loadMaShan } from "@remotion/google-fonts/MaShanZheng";

const inter = loadInter("normal", { weights: ["300", "500"], subsets: ["latin"] });
const noto = loadNoto("normal", { weights: ["500", "700"], ignoreTooManyRequestsWarning: true });
const serif = loadSerif("normal", { weights: ["600", "700"], ignoreTooManyRequestsWarning: true });
const longCang = loadLongCang("normal", { ignoreTooManyRequestsWarning: true });
const maShan = loadMaShan("normal", { ignoreTooManyRequestsWarning: true });

export const FONT = `${inter.fontFamily}, ${noto.fontFamily}, sans-serif`;
export const SANS = `${noto.fontFamily}, sans-serif`;
export const SERIF = `${serif.fontFamily}, serif`;
export const PEN = `${longCang.fontFamily}, ${serif.fontFamily}, serif`; // the teacher's red pen
export const BRUSH = `${maShan.fontFamily}, ${serif.fontFamily}, serif`; // a parent's handwriting

// Series palette. Theme for this film: the warm orb (the wish to stay up a little longer)
// against cold night water; the outside voices are red ink until they become your own (white UI type).
export const K = {
  bg: "#05070a",
  fg: "#f4f0e8",
  sub: "#b8b8b3",
  muted: "#8a8a85",
  gold: "#ffd166",
  ink: "#e5483f",
  inkSoft: "#d9714f",
  self: "#e9eef5",
  water: "#061019",
  waterDeep: "#02060a",
  orb: "#fff3d6",
  orbGlow: "#ffb45e",
};
