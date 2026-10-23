import { CAPTIONS } from "./captions";
import { BALL_AT, END_AT, FLIP_AT } from "./scenes/coda";
import { C_DONE, C_ROW_AT, D_DONE, D_ROW_AT, EXAM_START, F_ROW_AT, F_STUCK_AT } from "./scenes/exam";
import { HOOK_END, PRICE_STEPS } from "./scenes/hook";
import { COIN_AT, COINS, DROP_AT, DROP_LEN, PLAN_END, passTime } from "./scenes/plan";
import { BILL_AT, HOURS_AT, HUSH_AT, LAMP_ON, LOOP_AT, PH, PRICE_AT, ROUND_AT, ROUNDS_C, ROUNDS_D, ROW_AT, SAVE_AT, SHARE_AT, WALL_AT } from "./scenes/time";
import { A_END_HIT, barA, barB, BEAT_B, B, CHORD } from "./timing";

// One-shot sounds: [film seconds, file under public/lib, volume]. Material follows the object (paper is paper, coins
// are metal, the clock is a click); pitched effects come from public/lib/tuned (F major, tools/tune_sfx.py).
export type Ev = [number, string, number];
const T = (f: string) => `tuned/${f}`;

const ev: Ev[] = [];
const add = (s: number, f: string, v: number) => ev.push([s, f, v]);

// ── captions: card slide as the strip enters, a tap on the first character ──
for (const c of CAPTIONS) {
  add(c.at - 0.25, "sfx-foley-02.wav", 0.32);
  add(c.at, "sfx-ui-01.wav", 0.4);
}

// ── 1. hook ──
add(0.0, "sfx-impact-08.wav", 0.55);
add(0.02, "sfx-foley-01.wav", 0.5);
add(0.06, T("sfx-impact-06.wav"), 0.35);
PRICE_STEPS.slice(1, 4).forEach(([s], i) => {
  add(s - 0.1, "sfx-mechanical-13.wav", 0.8);
  add(s, T("sfx-impact-03.wav"), 0.22 + i * 0.06);
});
add(barA(1), "sfx-impact-08.wav", 1.0);
add(barA(1), T("sfx-impact-06.wav"), 0.55);
add(barA(1) + 0.02, T("sfx-impact-11.wav"), 0.3);
add(barA(1.25), "sfx-impact-08.wav", 0.6);
add(barA(1.25), "sfx-mechanical-01.wav", 0.5);
add(barA(2.5), "sfx-foley-02.wav", 0.3);
add(barA(3), T("sfx-game-01.wav"), 0.3);

// ── 2. title receipt ──
add(HOOK_END - 0.32, "sfx-transition-02.wav", 0.45);
add(HOOK_END - 0.2, "sfx-foley-08.wav", 0.7);
add(HOOK_END + 0.15, "sfx-foley-08.wav", 0.45);
add(HOOK_END, T("sfx-impact-06.wav"), 0.6);
add(HOOK_END, "sfx-impact-01.wav", 0.5);
add(barA(5), T("sfx-impact-05.wav"), 0.22);

// ── 3. subscription: card, then coins ──
add(barA(6) - 0.25, "sfx-transition-02.wav", 0.45);
add(barA(6), "sfx-foley-02.wav", 0.35);
add(barA(8), "sfx-mechanical-01.wav", 0.45);
add(barA(8) + 0.3, T("sfx-impact-03.wav"), 0.45);
for (let i = 0; i < COINS; i++) {
  add(COIN_AT(i), T("sfx-impact-03.wav"), 0.42 - 0.26 * (i / COINS));
  if ((i + 1) % 12 === 0) add(COIN_AT(i), T("sfx-impact-06.wav"), 0.25);
}
add(barA(10.5), "sfx-impact-08.wav", 0.9);
add(barA(10.5), T("sfx-impact-06.wav"), 0.5);
add(barA(10.5) + 0.12, T("sfx-game-01.wav"), 0.28);

// ── 4. price ruler ──
add(PLAN_END - 0.32, "sfx-transition-02.wav", 0.45);
add(DROP_AT, "sfx-transition-18.wav", 0.4);
[67, 27, 8].forEach((v) => {
  add(passTime(v), "sfx-mechanical-13.wav", 0.6);
  add(passTime(v), T("sfx-ui-10.wav"), 0.3);
});
add(DROP_AT + DROP_LEN, "sfx-impact-01.wav", 0.7);
add(DROP_AT + DROP_LEN, T("sfx-impact-05.wav"), 0.42);
add(DROP_AT + DROP_LEN + 0.1, T("sfx-game-01.wav"), 0.25);

// ── 5. exam receipts ──
add(EXAM_START - 0.32, "sfx-transition-02.wav", 0.45);
add(EXAM_START + 0.15, "sfx-mechanical-13.wav", 0.5);
add(EXAM_START + 0.25, "sfx-mechanical-13.wav", 0.4);
for (let i = 0; i < 4; i++) {
  add(C_ROW_AT(i), "sfx-foley-08.wav", 0.4);
  add(C_ROW_AT(i), "sfx-mechanical-13.wav", 0.35);
}
for (let i = 0; i < 33; i++) add(D_ROW_AT(i), "sfx-mechanical-13.wav", 0.34 - 0.14 * (i / 33));
for (let i = 0; i < 14; i++) add(D_ROW_AT(0) + i * 0.42, "sfx-foley-08.wav", 0.16);
add(C_DONE, T("sfx-impact-06.wav"), 0.45);
add(D_DONE, T("sfx-impact-06.wav"), 0.45);
add(D_DONE, "sfx-impact-01.wav", 0.45);
add(barA(18.5), "sfx-impact-08.wav", 0.75);
add(barA(18.5), "sfx-mechanical-01.wav", 0.4);
add(barA(20), "sfx-transition-02.wav", 0.3);
add(barA(20) + 0.6, T("sfx-impact-05.wav"), 0.3);

// ── 6. formula receipt, and the line that jams ──
add(barA(22) - 0.32, "sfx-transition-02.wav", 0.4);
F_ROW_AT.forEach((s, i) => {
  add(s, "sfx-foley-08.wav", 0.45);
  if (i > 0) add(s + 0.15, T("sfx-impact-06.wav"), 0.3);
});
add(F_STUCK_AT, "sfx-foley-08.wav", 0.45);
add(F_STUCK_AT + 0.3, "sfx-mechanical-01.wav", 0.5);
add(F_STUCK_AT + 1.0, "sfx-foley-08.wav", 0.3);
add(F_STUCK_AT + 1.2, T("sfx-notification-18.wav"), 0.35);
add(A_END_HIT, "sfx-mechanical-01.wav", 0.55);

// ── the clock: ticks on B's beat grid from the end of A (a J-cut that sets B's tempo before it starts) ──
const tickFrom = 56.4;
const firstTick = B.at + B.first - Math.floor((B.at + B.first - tickFrom) / BEAT_B) * BEAT_B;
for (let s = firstTick, k = 0; s < barB(4) - 0.05; s += BEAT_B, k++) {
  const quiet = s > 58.2 && s < barB(0) ? 1 : s > barB(3) - 0.05 ? 1 : 0.6;
  add(s, k % 2 ? T("sfx-ui-10.wav") : "sfx-mechanical-01.wav", (k % 2 ? 0.14 : 0.3) * quiet);
}
add(LAMP_ON, "sfx-mechanical-02.wav", 0.6);

// ── 7. desk and the ten programmers ──
add(barB(0.75), T("sfx-notification-02.wav"), 0.38);
add(ROW_AT - 0.35, "sfx-transition-02.wav", 0.35);
for (let i = 0; i < 10; i++) if (i !== 6) add(ROW_AT + 0.45 + i * 0.07, "sfx-foley-02.wav", 0.1);
add(ROW_AT + 0.9, T("sfx-game-01.wav"), 0.3);

// ── 8. one task, round by round ──
add(LOOP_AT - 0.35, "sfx-transition-02.wav", 0.4);
const lane = (rounds: { r0: number; ok: boolean }[], pan: number) => {
  for (const r of rounds) {
    add(r.r0, "sfx-foley-02.wav", 0.28 * pan);
    for (let k = 0; k < 3; k++) add(r.r0 + PH.toAI + k * 0.15, "sfx-mechanical-13.wav", 0.18 * pan);
    add(r.r0 + PH.work, "sfx-foley-02.wav", 0.22 * pan);
    for (let k = 0; k < 5; k++) add(r.r0 + PH.back + k * 0.16, "sfx-mechanical-01.wav", 0.2 * pan);
    if (r.ok) add(r.r0 + PH.verdict, T("sfx-impact-05.wav"), 0.42);
    else {
      add(r.r0 + PH.verdict, T("sfx-notification-18.wav"), 0.4);
      add(r.r0 + PH.verdict, "sfx-impact-01.wav", 0.35);
    }
  }
};
lane(ROUNDS_C, 1);
lane(ROUNDS_D, 0.9);

// ── 9. the two walls of 100 ──
add(WALL_AT - 0.35, "sfx-transition-02.wav", 0.4);
ROUND_AT.forEach((s, i) => {
  add(s, "sfx-foley-01.wav", 0.32 - i * 0.025);
  add(s + 0.05, T("sfx-impact-05.wav"), 0.24 - i * 0.02);
  add(s, "sfx-mechanical-13.wav", 0.4);
});
add(barB(10.5), "sfx-impact-08.wav", 0.6);
add(barB(10.5), T("sfx-impact-03.wav"), 0.35);

// ── 10. hours, the price of an hour, then the hush ──
add(HOURS_AT - 0.3, "sfx-transition-02.wav", 0.35);
for (let k = 0; k < 22; k++) add(HOURS_AT + 0.1 + k * 0.075, "sfx-mechanical-01.wav", 0.16);
add(HOURS_AT + 1.9, T("sfx-notification-18.wav"), 0.3);
add(PRICE_AT, "sfx-impact-08.wav", 0.5);
add(PRICE_AT + 0.05, T("sfx-game-01.wav"), 0.45);
add(PRICE_AT + 0.1, T("sfx-impact-03.wav"), 0.4);
for (let k = 0; k < 4; k++) add(HUSH_AT + k * BEAT_B, k % 2 ? T("sfx-ui-10.wav") : "sfx-mechanical-01.wav", k % 2 ? 0.2 : 0.4);

// ── 11. the bill: the most important sound after the silence ──
add(BILL_AT, "sfx-impact-08.wav", 1.0);
add(BILL_AT, T("sfx-impact-05.wav"), 0.7);
add(BILL_AT + 0.02, "sfx-foley-08.wav", 0.6);
add(BILL_AT + BEAT_B, "sfx-mechanical-13.wav", 0.5);
for (let k = 0; k < 7; k++) add(BILL_AT + 2 * BEAT_B + k * 0.37, "sfx-foley-08.wav", 0.32);
add(barB(18), T("sfx-impact-06.wav"), 0.55);
add(barB(18) + 0.12, "sfx-mechanical-13.wav", 0.45);
add(SHARE_AT, "sfx-impact-08.wav", 0.7);
add(SHARE_AT, "sfx-mechanical-01.wav", 0.4);
add(SHARE_AT + 0.2, "sfx-impact-08.wav", 0.55);
add(SAVE_AT, "sfx-impact-08.wav", 0.8);
add(SAVE_AT + 0.05, T("sfx-game-01.wav"), 0.42);
add(SAVE_AT + 0.1, T("sfx-impact-05.wav"), 0.38);

// ── 12–14. coda and end card ──
add(CHORD[0] - 0.1, "sfx-foley-08.wav", 0.35);
add(CHORD[0] + 0.6, T("sfx-impact-05.wav"), 0.45);
add(CHORD[1] - 0.3, "sfx-transition-02.wav", 0.3);
add(END_AT - 0.2, T("sfx-impact-06.wav"), 0.35);
add(FLIP_AT, "sfx-transition-02.wav", 0.35);
add(BALL_AT, "sfx-impact-08.wav", 0.55);
add(BALL_AT + 0.02, T("sfx-impact-05.wav"), 0.45);

export const EVENTS: Ev[] = ev.sort((a, b) => a[0] - b[0]);
