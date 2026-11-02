// Fonts are local files (SIL OFL 1.1), so renders need no network: public/fonts/NotoSansSC-VF.ttf (same file as
// films/house/web/fonts) and public/fonts/NotoSerifSC.ttf (the brand serif). Not in Git; see README.
import { continueRender, delayRender, staticFile } from "remotion";

const faces = [
  new FontFace("MFSans", `url(${staticFile("fonts/NotoSansSC-VF.ttf")}) format("truetype")`, { weight: "100 900" }),
  new FontFace("MFSerif", `url(${staticFile("fonts/NotoSerifSC.ttf")}) format("truetype")`, { weight: "200 900" }),
];
const handle = delayRender("fonts", { timeoutInMilliseconds: 120000 });
Promise.all(faces.map((f) => f.load()))
  .then((loaded) => {
    loaded.forEach((f) => document.fonts.add(f));
    continueRender(handle);
  })
  .catch((e) => {
    console.error("font load failed", e);
    continueRender(handle);
  });

export const FONT = `MFSans, "PingFang SC", sans-serif`;
export const SERIF = `MFSerif, serif`;
export const NUM = `MFSans, sans-serif`;

// A town at night. Money is gold light; borrowed money is pale blue; spending more than you earn is red.
export const K = {
  bg: "#05070d",
  fg: "#f3eee4",
  sub: "#c6c0b4",
  muted: "#8b8a93",
  line: "rgba(243,238,228,0.2)",
  gold: "#ffbe4d",
  goldHi: "#ffe2a0",
  loan: "#8fc4ff",
  red: "#ff5a4a",
  want: "#ffbe4d",
};
