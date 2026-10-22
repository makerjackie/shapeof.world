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

// Series palette (STYLE.md 一、2). Theme colour for this film: 暖杏, only on the trunk (living), the things you love
// and the chapter tags. Branches (work, money, school) take cool colours. 品牌金 is kept for the one discovery and the
// last line. No red/green: nothing in this film is cheap or dear.
export const K = {
  bg: "#07090b",
  fg: "#f4f0e8",
  sub: "#b8b8b3",
  muted: "#8a8a85",
  dim: "#3c3e40",
  line: "rgba(244,240,232,0.12)",
  gold: "#ffd166",
  paper: "#f1ecdf",
  ink: "#19231f",
  theme: "#ffa776",
  themeHi: "#ffd0b0",
  steel: "#7f9bbf",
  steelHi: "#a9bfdc",
  steelLo: "#5d7aa0",
  sand: "#c9b48a",
  lilac: "#a99bd6",
  pink: "#d9a3c7",
  night: "#1c2230",
  green: "#3ddc97",
  red: "#ff5a5f",
};

// How a day is spent (2018 time-use survey), painted onto the life grid. The things you have to do are cool
// (blue to lilac); your own time is the film's warm theme colour.
export const USE = {
  sleep: "#4f5f92",
  meals: "#c9b48a",
  work: "#7f9bbf",
  travel: "#c3d3ee",
  chores: "#a99bd6",
  study: "#d9a3c7",
  free: "#ffa776",
};

// Soft colours the viewer might paint their future weeks with (the ending).
export const PASTEL = ["#b8a6ff", "#8fc1ff", "#ffd59e", "#ff9fb5", "#9ed8d0", "#ffa776"];

export const C = K;
