import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";

const inter = loadInter("normal", { weights: ["700", "900"], subsets: ["latin"] });
const noto = loadNoto("normal", { weights: ["500", "900"], ignoreTooManyRequestsWarning: true });
const mono = loadMono("normal", { weights: ["700"], subsets: ["latin"] });

export const FONT = `${inter.fontFamily}, ${noto.fontFamily}, "Microsoft YaHei", sans-serif`;
export const MONO = `${mono.fontFamily}, monospace`;

export const C = {
  bg: "#0A0A0F",
  fg: "#F4F1EA",
  muted: "#8A8794",
  faint: "#2A2A33",
  claude: "#E07B53",
  deepseek: "#5B7BFF",
  gold: "#FFC940",
  green: "#3DDC97",
  red: "#FF5A5F",
  other: "#7C8396",
};
