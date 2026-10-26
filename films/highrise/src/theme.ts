import { continueRender, delayRender, staticFile } from "remotion";

// Fonts are local subsets (tools/fonts.sh) of Noto Sans SC and Noto Serif SC, variable weight, loaded before any
// frame renders.
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
load("HR Sans", "fonts/NotoSansSC.woff2");
load("HR Serif", "fonts/NotoSerifSC.woff2");

export const FONT = `"HR Sans", "PingFang SC", sans-serif`;
export const SERIF = `"HR Serif", "Songti SC", serif`;

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
