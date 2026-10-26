import { continueRender, delayRender, staticFile } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

// Chinese fonts are local subsets (tools/fonts.sh) of Noto Sans SC and Noto Serif SC, variable weight, loaded before
// any frame renders (the WebGL floor labels draw them onto canvases too). Numbers use Inter.
const load = (family: string, file: string) => {
  if (typeof document === "undefined") return;
  const handle = delayRender(`font ${family}`);
  const face = new FontFace(family, `url('${staticFile(file)}') format('woff2')`, { weight: "100 900" });
  face
    .load()
    .then(() => {
      document.fonts.add(face);
      continueRender(handle);
    })
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
};
load("FR Sans", "fonts/NotoSansSC.woff2");
load("FR Serif", "fonts/NotoSerifSC.woff2");
const inter = loadInter("normal", { weights: ["300", "400", "600", "700", "800"], subsets: ["latin"] });

export const SANS = `"FR Sans", "PingFang SC", sans-serif`;
export const SERIF = `"FR Serif", "Songti SC", serif`;
export const NUM = `${inter.fontFamily}, "FR Sans", sans-serif`;

// Colours. The money is banknote red; gold marks the one thing to remember on a screen; ash is a pile that ran out.
export const K = {
  bg: "#0d0a08",
  paper: "#f1ecdf",
  ink: "#19231f",
  sub: "rgba(241,236,223,0.66)",
  faint: "rgba(241,236,223,0.38)",
  gold: "#ffd166",
  red: "#e0483c",
  brick: "#b3352b",
  ash: "#8a8178",
  green: "#59c98e",
  warm: "#ffcf8a",
};
