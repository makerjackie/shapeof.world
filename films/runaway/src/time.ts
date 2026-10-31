// The film runs on three-bodies (our own library, "urgent, cold", irregular meter, no steady grid), so key moments are
// placed on detected onsets of the track rather than on bars. tools/music.py lays the track out exactly like SEGS below.
//   A  cold open      track 83.90–95.50   the densest stretch, ending on the last hit (94.86) and its decay
//      silence 1.8 s, then a 1.0 s tape-rewind (track 86–95 reversed, pitched up)
//   B1 Friday, weekend track  0.00–31.40   sparse plucks, the build starts at 20.08
//   B2 weekend        track 53.69–95.50   (31.40 → 53.69 skipped: both cuts on onsets, chroma 0.97), the peak, the cut
//   C  Monday         track 95.50–122.00  the sparse high register after the cut
//   D1 zoom out       track 122.00–135.00 the re-entry
//   D2                track 142.85–147.50 (135.00 → 142.85 skipped: a quiet dip, chroma 0.89) the track's own ending
//      silence 2.2 s
//   E  stamps         track 53.69–77.00   the weekend's music again under the weekend's cards
//   F  why            track 96.30–122.00
//   G  landing, end   track  0.00–29.00   back to Friday's plucks, fading over the last 4 s
export const FPS = 30;

type Seg = { id: string; a: number; b: number; gapBefore?: number };
const RAW: Seg[] = [
  { id: "A", a: 83.9, b: 95.5 },
  { id: "B1", a: 0, b: 31.4, gapBefore: 2.8 },
  { id: "B2", a: 53.69, b: 95.5 },
  { id: "C", a: 95.5, b: 122.0 },
  { id: "D1", a: 122.0, b: 135.0 },
  { id: "D2", a: 142.85, b: 147.5 },
  { id: "E", a: 53.69, b: 77.0, gapBefore: 2.2 },
  { id: "F", a: 96.3, b: 122.0 },
  { id: "G", a: 0, b: 29.0 },
];
export const SEGS = (() => {
  let f = 0;
  return RAW.map((s) => {
    f += s.gapBefore ?? 0;
    const seg = { ...s, f };
    f += s.b - s.a;
    return seg;
  });
})();
const seg = (id: string) => SEGS.find((s) => s.id === id)!;
// Film seconds of track time `tt` inside segment `id`.
export const at = (id: string, tt: number) => seg(id).f + (tt - seg(id).a);
export const segStart = (id: string) => seg(id).f;
export const segEnd = (id: string) => seg(id).f + seg(id).b - seg(id).a;

export const REWIND = segEnd("A") + 1.8; // the tape rewind starts
export const FRIDAY = segStart("B1");
export const CUT = at("B2", 94.86); // the weekend's last hit; everything stops
export const MONDAY = segStart("C");
export const ZOOM = at("D1", 122.06); // the re-entry: ten million dots
export const MADEUP = segEnd("D2") - 1.0; // "上面这个周末，是编的。"
export const STAMPS = segStart("E");
export const WHY = segStart("F");
export const LAND = segStart("G");
export const FILM_S = segEnd("G") + 0.5;
export const FILM_FRAMES = Math.ceil(FILM_S * FPS);
export const fr = (s: number) => Math.round(s * FPS);
