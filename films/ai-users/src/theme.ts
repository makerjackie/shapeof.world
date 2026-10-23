import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";

const inter = loadInter("normal", { weights: ["300", "500", "700", "900"], subsets: ["latin"] });
const noto = loadNoto("normal", { weights: ["500", "700", "900"], ignoreTooManyRequestsWarning: true });
const serif = loadSerif("normal", { weights: ["600", "700", "900"], ignoreTooManyRequestsWarning: true });
const mono = loadMono("normal", { weights: ["500"], subsets: ["latin"] });

export const FONT = `${inter.fontFamily}, ${noto.fontFamily}, "Microsoft YaHei", sans-serif`;
export const SANS = `${noto.fontFamily}, sans-serif`;
export const SERIF = `${serif.fontFamily}, serif`;
export const NUM = `${inter.fontFamily}, sans-serif`;
export const MONO = `${mono.fontFamily}, monospace`;

// Brand skeleton (films/brand/README.md 一): paper, ink, brand gold (keywords and the one finding only),
// semantic green/red for passed/failed, signal orange for readout emphasis. The world is a warm, light desk
// (films/DIRECTOR.md 五); the dark is kept for the one silence before the finding.
// Film theme colour: AI 紫, only on what the AI does.
export const K = {
  desk: "#e8ddc9",
  deskHi: "#f4ecdd",
  deskLo: "#d8cab2",
  paper: "#f1ecdf",
  paperHi: "#f8f4ec",
  paperLo: "#e3dbca",
  ink: "#19231f",
  inkSoft: "#4d5852",
  inkFaint: "rgba(25,35,31,0.40)",
  gold: "#ffd166",
  signal: "#d4521c",
  green: "#21885a",
  red: "#c8343a",
  ai: "#6b57e0",
  aiHi: "#a99cf6",
  aiWash: "rgba(107,87,224,0.14)",
  // illustration palette
  coat: "#fbfaf6",
  skin: "#efc4a0",
  skin2: "#c98e66",
  hair: "#2b2421",
  sage: "#8fa98b",
  slate: "#5f7d9c",
  sand: "#d9c29c",
  wood: "#b98a5c",
  cloth: "#2c4269",
  night: "#14171b",
};
