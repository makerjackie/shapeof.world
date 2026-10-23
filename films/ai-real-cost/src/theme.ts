import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";

const inter = loadInter("normal", { weights: ["500", "700", "900"], subsets: ["latin"] });
const noto = loadNoto("normal", { weights: ["500", "700", "900"], ignoreTooManyRequestsWarning: true });
const serif = loadSerif("normal", { weights: ["600", "700", "900"], ignoreTooManyRequestsWarning: true });
const mono = loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] });

export const FONT = `${inter.fontFamily}, ${noto.fontFamily}, "Microsoft YaHei", sans-serif`;
export const SANS = `${noto.fontFamily}, ${inter.fontFamily}, sans-serif`;
export const SERIF = `${serif.fontFamily}, serif`;
export const MONO = `${mono.fontFamily}, ${noto.fontFamily}, monospace`;

// Brand skeleton (films/brand/README.md) plus this film's colours. The theme colour is 时间紫: "your time" on the
// receipts, the hourglass and the cover keyword. Claude orange and DeepSeek blue only mark the two models; green and
// red only mean cheap/good and dear/bad; brand gold only for the keyword highlighter and the one discovery.
export const K = {
  bg: "#07090b",
  table: "#0e1114",
  fg: "#f4f0e8",
  sub: "#b9b6ae",
  muted: "#85837d",
  dim: "#3b3d40",
  line: "rgba(244,240,232,0.12)",
  paper: "#f1ecdf",
  receipt: "#f6f2e7",
  ink: "#19231f",
  gold: "#ffd166",
  claude: "#ee8a5e",
  claudeHi: "#ffc09a",
  claudeDeep: "#a9512c",
  deepseek: "#4f7bff",
  deepseekHi: "#9db6ff",
  deepseekDeep: "#2443b8",
  time: "#b48cff",
  timeHi: "#d9c4ff",
  timeDeep: "#6b44c9",
  green: "#3ddc97",
  greenDeep: "#1f9d68",
  red: "#ff5a5f",
  redDeep: "#c23238",
};
