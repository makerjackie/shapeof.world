// Local, subsetted fonts (tools/fonts5.py builds public/fonts6/ from the film's own text), loaded before the first frame
// in every render tab. No network, no per-tab differences.
import { staticFile } from "remotion";

export const SERIF = `"PopSerif", serif`;
export const BRUSH = `"PopBrush", "PopSerif", serif`;
export const SANS = `"PopSans", sans-serif`;
const FACES: [string, string, string][] = [
  ["PopSerif", "fonts6/serif-500.woff2", "500"],
  ["PopSerif", "fonts6/serif-700.woff2", "700"],
  ["PopSerif", "fonts6/serif-900.woff2", "900"],
  ["PopSans", "fonts6/sans-500.woff2", "500"],
  ["PopSans", "fonts6/sans-900.woff2", "900"],
  ["PopBrush", "fonts6/brush.woff2", "400"],
];
let P: Promise<unknown> | null = null;
export const fontsReady = () =>
  (P ??= Promise.all(
    FACES.map(([fam, file, w]) => {
      const f = new FontFace(fam, `url(${staticFile(file)})`, { weight: w });
      document.fonts.add(f);
      return f.load();
    }),
  ));
