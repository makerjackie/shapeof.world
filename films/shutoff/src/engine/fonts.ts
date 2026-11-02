// Local fonts (SIL OFL 1.1), subset to the film's own characters by tools/fonts.py. Canvas textures and the HTML
// overlay both use these families, so nothing depends on system fonts.
import { staticFile } from "remotion";

export const SANS = "FSans";
export const SERIF = "FSerif";
export const MONO = "FMono, FSans";

const FACES: [string, string, string][] = [
  [SANS, "fonts/sans-300.woff2", "300"],
  [SANS, "fonts/sans-400.woff2", "400"],
  [SANS, "fonts/sans-500.woff2", "500"],
  [SANS, "fonts/sans-700.woff2", "700"],
  [SERIF, "fonts/serif-400.woff2", "400"],
  [SERIF, "fonts/serif-600.woff2", "600"],
  [SERIF, "fonts/serif-900.woff2", "900"],
  ["FMono", "fonts/mono-400.woff2", "400"],
  ["FMono", "fonts/mono-700.woff2", "700"],
];

let p: Promise<void> | null = null;
export const loadFonts = () => {
  if (!p) {
    p = Promise.all(
      FACES.map(async ([fam, file, weight]) => {
        const f = new FontFace(fam, `url(${staticFile(file)})`, { weight });
        await f.load();
        document.fonts.add(f);
      }),
    ).then(() => undefined);
  }
  return p;
};
