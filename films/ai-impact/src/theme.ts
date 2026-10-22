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

// Series palette (STYLE.md 一、2). This film's theme colour is AI 青, on the title rule, the chip lane and the cover
// keyword. Each of the four lanes of the main prop has its own colour; 品牌金 is kept for the one discovery (the
// first job) and the last line; green/red only mean good/cheap and bad/dear.
export const K = {
  bg: "#07090b",
  fg: "#f4f0e8",
  sub: "#b8b8b3",
  muted: "#8a8a85",
  dim: "#3c3e40",
  line: "rgba(244,240,232,0.12)",
  grid: "rgba(244,240,232,0.07)",
  gold: "#ffd166",
  paper: "#f1ecdf",
  ink: "#19231f",
  theme: "#4dd4ff",
  themeHi: "#a6ecff",
  money: "#ff9f43",
  chip: "#4dd4ff",
  power: "#a78bfa",
  work: "#f472b6",
  green: "#3ddc97",
  red: "#ff5a5f",
  panel: "#0d1116",
};

export const C = K;

export type LaneKey = "money" | "chip" | "power" | "work";

export const LANES: { key: LaneKey; name: string; series: string; color: string; icon: string }[] = [
  { key: "money", name: "钱", series: "英伟达市值", color: K.money, icon: "¥$" },
  { key: "chip", name: "芯片", series: "全球内存营收", color: K.chip, icon: "▦" },
  { key: "power", name: "电", series: "美国电网容量价", color: K.power, icon: "ϟ" },
  { key: "work", name: "工作", series: "美国失业率", color: K.work, icon: "◍" },
];

export const laneColor = (k: LaneKey) => LANES.find((l) => l.key === k)!.color;
