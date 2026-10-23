import { AT } from "./scenes";
import { BEAT_S, barS } from "./timing";

// One-shot sounds: [film seconds, file under public/lib, volume]. Material follows the object (paper is paper, a coin
// is metal, the clock is a click); pitched effects come from public/lib/tuned (tools/tune_sfx.py moves them onto F, A,
// C, the key of the track). Kept sparse: only the hits the eye is already waiting for. The end card has no sound.
export type Ev = [number, string, number];
const T = (f: string) => `tuned/${f}`;

const ev: Ev[] = [];
// `bar` is the scene's first film bar, `beat` is scene-local (as in the scene files).
const add = (bar: number, beat: number, f: string, v: number) => ev.push([barS(bar) + beat * BEAT_S, f, v]);
const ticks = (bar: number, from: number, to: number, level: number) => {
  for (let k = 0, b = from; b < to - 0.01; b += 1, k++) add(bar, b, k % 2 ? T("sfx-ui-10.wav") : "sfx-mechanical-01.wav", (k % 2 ? 0.5 : 1) * level);
};
const hit = (bar: number, beat: number, v = 1) => {
  add(bar, beat, "sfx-impact-08.wav", 0.85 * v);
  add(bar, beat, T("sfx-impact-06.wav"), 0.45 * v);
};

// ── Claim and the price board ──
hit(AT.claim, 0, 0.7);
add(AT.claim, 1.5, T("sfx-notification-02.wav"), 0.3);
for (let i = 0; i < 5; i++) add(AT.board, 0.2 + i * 0.35, "sfx-mechanical-13.wav", 0.22);
add(AT.board, 4, "sfx-impact-08.wav", 0.6);
add(AT.board, 4, T("sfx-impact-11.wav"), 0.3);
add(AT.board, 6.7, "sfx-transition-02.wav", 0.4);
add(AT.board, 8, "sfx-transition-18.wav", 0.45);
add(AT.board, 10, "sfx-foley-02.wav", 0.3);
add(AT.board, 12, "sfx-impact-08.wav", 0.8);
add(AT.board, 12, T("sfx-impact-05.wav"), 0.4);
add(AT.board, 12.1, T("sfx-game-01.wav"), 0.3);

// ── Title ──
add(AT.title, -0.3, "sfx-transition-02.wav", 0.45);
hit(AT.title, 0, 1.15);

// ── Tower ──
for (let i = 0; i < 20; i++) add(AT.tower, 1.2 + i * 0.27, "sfx-mechanical-13.wav", 0.2 - 0.006 * i);
hit(AT.tower, 7.6, 0.95);
add(AT.tower, 8.2, "sfx-ui-01.wav", 0.3);
add(AT.tower, 9.2, T("sfx-game-01.wav"), 0.35);

// ── Receipts ──
for (let i = 0; i < 4; i++) add(AT.receipts, 2.2 + i * 0.7, "sfx-foley-08.wav", 0.4);
for (let i = 0; i < 33; i++) add(AT.receipts, 2.2 + i * 0.22, "sfx-mechanical-13.wav", 0.26 - 0.12 * (i / 33));
add(AT.receipts, 5.2, T("sfx-impact-06.wav"), 0.4);
add(AT.receipts, 9.9, T("sfx-impact-06.wav"), 0.4);
add(AT.receipts, 11.6, "sfx-impact-08.wav", 0.8);
add(AT.receipts, 11.6, "sfx-impact-01.wav", 0.4);
add(AT.receipts, 12.8, "sfx-ui-01.wav", 0.3);

// ── Formula: tiles, the "？", the silence (beats 10–14 = film bar 17), "your time" on the breakdown ──
[1, 1.7, 2.4].forEach((b) => add(AT.formula, b, T("sfx-impact-06.wav"), 0.35));
add(AT.formula, 5.4, "sfx-foley-02.wav", 0.3);
add(AT.formula, 7.8, "sfx-transition-02.wav", 0.35);
add(AT.formula, 8.6, T("sfx-notification-18.wav"), 0.35);
add(AT.formula, 9.4, "sfx-ui-01.wav", 0.25);
ticks(AT.formula, 8.6, 10, 0.16);
ticks(AT.formula, 10, 14, 0.45);
add(AT.formula, 14, "sfx-impact-08.wav", 1.0);
add(AT.formula, 14, T("sfx-impact-05.wav"), 0.6);
add(AT.formula, 14.02, T("sfx-impact-11.wav"), 0.35);

// ── Devs ──
for (let i = 0; i < 10; i++) add(AT.devs, 0.6 + i * 0.1, "sfx-foley-02.wav", 0.12);
add(AT.devs, 3, T("sfx-ui-10.wav"), 0.3);
add(AT.devs, 3, T("sfx-impact-05.wav"), 0.4);
add(AT.devs, 5, "sfx-ui-01.wav", 0.3);

// ── Loop ──
add(AT.loop, 1, "sfx-transition-02.wav", 0.25);
add(AT.loop, 1.2, "sfx-transition-02.wav", 0.2);
for (let k = 0; k < 3; k++) add(AT.loop, 2 + k * 0.5, "sfx-mechanical-01.wav", 0.22);
add(AT.loop, 3.5, T("sfx-impact-05.wav"), 0.45);
add(AT.loop, 3.7, T("sfx-notification-18.wav"), 0.45);
add(AT.loop, 3.7, "sfx-impact-01.wav", 0.35);
add(AT.loop, 5, "sfx-transition-18.wav", 0.3);
for (let k = 0; k < 3; k++) add(AT.loop, 5.7 + k * 0.25, "sfx-mechanical-13.wav", 0.25);
add(AT.loop, 6.4, "sfx-transition-02.wav", 0.25);
for (let k = 0; k < 3; k++) add(AT.loop, 7.2 + k * 0.5, "sfx-mechanical-01.wav", 0.22);
add(AT.loop, 8.7, T("sfx-impact-05.wav"), 0.45);

// ── Grid ──
add(AT.grid, 1.2, "sfx-foley-01.wav", 0.3);
add(AT.grid, 1.2, "sfx-mechanical-13.wav", 0.3);
add(AT.grid, 1.6, T("sfx-impact-05.wav"), 0.28);
for (let k = 1; k <= 7; k++) {
  add(AT.grid, 5.2 + (k - 1) * 0.55, "sfx-foley-01.wav", 0.22 - 0.015 * k);
  add(AT.grid, 5.2 + (k - 1) * 0.55, "sfx-mechanical-13.wav", 0.22);
}
add(AT.grid, 9.2, "sfx-impact-08.wav", 0.6);
add(AT.grid, 9.2, T("sfx-impact-03.wav"), 0.35);
add(AT.grid, 11, "sfx-transition-02.wav", 0.3);
for (let k = 0; k < 8; k++) add(AT.grid, 11.1 + k * 0.17, "sfx-mechanical-01.wav", 0.14);
add(AT.grid, 13, "sfx-impact-08.wav", 0.6);

// ── Wage ──
for (let k = 0; k < 7; k++) add(AT.wage, 0.4 + k * 0.5, "sfx-mechanical-01.wav", 0.2);
add(AT.wage, 2.9, "sfx-impact-08.wav", 0.55);
add(AT.wage, 2.9, T("sfx-game-01.wav"), 0.5);
add(AT.wage, 2.95, T("sfx-impact-03.wav"), 0.45);

// ── Bill: tokens, the silence (beats 6–10 = film bar 33), the purple line on the peak ──
add(AT.bill, -0.25, "sfx-transition-02.wav", 0.35);
for (let k = 0; k < 3; k++) add(AT.bill, 0.6 + k * 0.3, "sfx-foley-08.wav", 0.35);
ticks(AT.bill, 6, 10, 0.45);
add(AT.bill, 6.3, T("sfx-notification-18.wav"), 0.3);
add(AT.bill, 10, "sfx-impact-08.wav", 1.0);
add(AT.bill, 10, T("sfx-impact-05.wav"), 0.7);
add(AT.bill, 10.02, T("sfx-impact-11.wav"), 0.4);
add(AT.bill, 10, "sfx-transition-02.wav", 0.4);
for (let k = 0; k < 6; k++) add(AT.bill, 12.6 + k * 0.18, "sfx-mechanical-13.wav", 0.24);
add(AT.bill, 15.5, "sfx-impact-08.wav", 0.6);
add(AT.bill, 15.5, "sfx-impact-01.wav", 0.3);
add(AT.bill, 15.9, "sfx-impact-08.wav", 0.6);
add(AT.bill, 15.9, "sfx-impact-01.wav", 0.3);
add(AT.bill, 18.5, "sfx-impact-08.wav", 0.85);
add(AT.bill, 18.55, T("sfx-game-01.wav"), 0.45);
add(AT.bill, 18.6, T("sfx-impact-05.wav"), 0.35);
add(AT.bill, 19.9, "sfx-ui-01.wav", 0.25);

// ── Today, Future, Collapse, the hourglass ──
hit(AT.today, 0.6, 0.9);
add(AT.future, 0, "sfx-transition-02.wav", 0.3);
add(AT.future, 2.4, "sfx-transition-02.wav", 0.3);
[3.2, 4.2, 5.2].forEach((b, i) => add(AT.future, b, T("sfx-impact-03.wav"), 0.38 - 0.06 * i));
add(AT.future, 8.4, "sfx-transition-02.wav", 0.3);
[9.2, 9.8, 10.4].forEach((b, i) => add(AT.future, b, T("sfx-impact-06.wav"), 0.3 + 0.12 * i));
add(AT.future, 14, "sfx-transition-02.wav", 0.3);
add(AT.future, 15.2, T("sfx-notification-02.wav"), 0.3);
[15.2, 16.6, 18].forEach((b) => {
  add(AT.future, b, "sfx-foley-02.wav", 0.35);
  add(AT.future, b + 0.05, "sfx-foley-01.wav", 0.22);
});
[2.8, 4.6].forEach((b) => add(AT.collapse, b, "sfx-transition-18.wav", 0.3));
hit(AT.collapse, 7, 0.95);
add(AT.collapse, 7.02, T("sfx-impact-11.wav"), 0.3);
add(AT.scarce, 6, "sfx-impact-08.wav", 0.55);
add(AT.scarce, 6, T("sfx-impact-05.wav"), 0.35);

export const EVENTS: Ev[] = ev.sort((a, b) => a[0] - b[0]);
