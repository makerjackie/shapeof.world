// How long a line must stay on screen, shared by readtime.mjs and holds.mjs.
// v4 used 0.8 s + 0.22 s per character for big lines, about half the speed
// subtitle guides allow for Chinese (Netflix: 9 characters a second), and the
// film dragged. v5: big lines (≥ 56 px, the point of a shot) 0.6 s + 0.15 s
// per character; context lines (40–55 px) 0.5 s + 0.12 s; small notes and
// labels (< 40 px) only need to be seen. Never under 1.2 s. A number counts
// as one character per digit group.
export const units = (s) => s.replace(/\s+/g, '').replace(/[0-9.,%+\-−–≈]+/g, '#').length
export const need = (s, size) => {
  const u = units(s)
  return Math.max(1.2, size >= 56 ? 0.6 + 0.15 * u : size >= 40 ? 0.5 + 0.12 * u : 0)
}
// Chapter cards fly into the persistent corner mark; they are not lines.
export const CARD = /^(0[1-9]|钱从哪来|钱去哪了|银行|买完以后|以后呢)$/
