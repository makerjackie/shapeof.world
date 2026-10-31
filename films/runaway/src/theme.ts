import { continueRender, delayRender, staticFile } from "remotion";

// Fonts are local files (public/fonts, SIL OFL 1.1, not in Git; see README), loaded once per tab.
const load = (family: string, file: string, weight: string, format: string) => {
  if (typeof document === "undefined") return;
  const h = delayRender(`font ${family} ${weight}`);
  const f = new FontFace(family, `url('${staticFile(`fonts/${file}`)}') format('${format}')`, { weight });
  f.load()
    .then(() => {
      document.fonts.add(f);
      continueRender(h);
    })
    .catch((e) => {
      console.error(e);
      continueRender(h);
    });
};
load("RInter", "Inter-VF.ttf", "100 900", "truetype");
load("RNotoSans", "NotoSansSC-VF.ttf", "100 900", "truetype");
load("RNotoSerif", "NotoSerifSC-VF.ttf", "200 900", "truetype");
load("RMono", "jetbrains-mono-latin-500-normal.woff2", "500", "woff2");
load("RMono", "jetbrains-mono-latin-700-normal.woff2", "700", "woff2");

export const FONT = `RInter, RNotoSans, "PingFang SC", sans-serif`;
export const HAN = `RNotoSans, "PingFang SC", sans-serif`;
export const SERIF = `RNotoSerif, serif`;
export const NUM = `RInter, sans-serif`;
export const MONO = `RMono, RNotoSans, monospace`;

// Cold night palette. Green ✓ is the film's one symbol (what the user loves to see); red is what it costs;
// the AI's own thoughts are a calm grey-blue; gold only for the one discovery and the last line.
export const K = {
  bg: "#05070b",
  night: "#0a0f1c",
  deep: "#0e1528",
  glass: "rgba(18,24,38,0.82)",
  glassHi: "rgba(30,38,58,0.9)",
  fg: "#f4f0e8",
  sub: "#b9bcc6",
  muted: "#7d8292",
  dim: "#3a3f4a",
  line: "rgba(244,240,232,0.14)",
  gold: "#ffd166",
  want: "#ff4f9a",
  ok: "#3ee08f", // ✓ 已解决
  okHi: "#a8f5cb",
  okLo: "#14553a",
  red: "#ff4d5e",
  redHi: "#ffb0b8",
  redLo: "#5c1620",
  think: "#9fb3d9", // the AI's calm thoughts
  cyan: "#6fd6ff", // ours: the agent and its copies
  cyanLo: "#1d4a63",
  amber: "#ffb35c", // other people's agents
  road: "#1b2436",
};
