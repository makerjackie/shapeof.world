import { continueRender, delayRender, staticFile } from "remotion";

// Fonts are local subsets (tools/fonts.sh) of Noto Sans SC and Noto Serif SC, variable weight, loaded before any
// frame renders. The 3D world waits for them too: its banners draw lettering into canvas textures.
const faces: Promise<unknown>[] = [];
const load = (family: string, file: string) => {
  if (typeof document === "undefined") return;
  const handle = delayRender(`font ${family}`);
  const face = new FontFace(family, `url('${staticFile(file)}') format('woff2')`, { weight: "100 900" });
  faces.push(
    face
      .load()
      .then(() => {
        document.fonts.add(face);
        continueRender(handle);
      })
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      }),
  );
};
load("OPC Sans", "fonts/NotoSansSC.woff2");
load("OPC Serif", "fonts/NotoSerifSC.woff2");
export const fontsReady = () => Promise.all(faces);

export const FONT = `"OPC Sans", "PingFang SC", sans-serif`;
export const SERIF = `"OPC Serif", "Songti SC", serif`;

// Night blue, lamp amber; gold for the money that comes in; a cool white for screens and customers.
export const K = {
  bg: "#04070d",
  fg: "#f4f0e8",
  sub: "rgba(244,240,232,0.72)",
  lamp: "#ffb469",
  gold: "#ffcf5a",
  screen: "#cfe3ff",
  green: "#3ddc97",
  red: "#ff5a5f",
  grey: "#8d949c",
  seal: "#d8262c",
};
